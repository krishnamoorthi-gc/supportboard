const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

// ── Gemini AI Helper ──

const GEMINI_KEY = () => process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function callGemini(prompt, maxTokens = 1024) {
  const apiKey = GEMINI_KEY();
  if (!apiKey) throw new Error('GOOGLE_API_KEY not configured');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
      })
    }
  );
  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function safeJson(val) {
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

function parseJson(val, fallback = null) {
  try { return typeof val === 'string' ? JSON.parse(val) : val; }
  catch { return fallback; }
}

// ═══════════════════════════════════════════════════════════════
// 1. SALES AGENTS CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/agents', auth, async (req, res) => {
  try {
    const agents = await db.prepare(
      'SELECT * FROM sales_agents WHERE agent_id = ? ORDER BY created_at DESC'
    ).all(req.agent.id);
    res.json({ agents });
  } catch (err) {
    console.error('GET /agents error:', err);
    res.status(500).json({ error: 'Failed to fetch sales agents' });
  }
});

router.post('/agents', auth, async (req, res) => {
  try {
    const {
      name, role = 'sales', emoji = '🤖', color = '#4c82fb',
      tone = 'professional', language = 'en',
      channels = '[]', system_prompt = '',
      handoff_threshold = 3, max_turns = 20, followup_days = 3
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    const ts = now();
    await db.prepare(`
      INSERT INTO sales_agents
        (id, agent_id, name, role, emoji, color, tone, language, channels, system_prompt,
         handoff_threshold, max_turns, followup_days, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      id, req.agent.id, name, role, emoji, color, tone, language,
      safeJson(channels), system_prompt,
      handoff_threshold, max_turns, followup_days, ts, ts
    );
    const agent = await db.prepare('SELECT * FROM sales_agents WHERE id = ?').get(id);
    res.status(201).json({ agent });
  } catch (err) {
    console.error('POST /agents error:', err);
    res.status(500).json({ error: 'Failed to create sales agent' });
  }
});

router.patch('/agents/:id', auth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM sales_agents WHERE id = ? AND agent_id = ?').get(req.params.id, req.agent.id);
    if (!existing) return res.status(404).json({ error: 'Sales agent not found' });
    const fields = [
      'name', 'role', 'emoji', 'color', 'tone', 'language',
      'channels', 'system_prompt', 'handoff_threshold', 'max_turns', 'followup_days'
    ];
    const updates = { updated_at: now() };
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates[f] = (f === 'channels') ? safeJson(req.body[f]) : req.body[f];
      }
    }
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE sales_agents SET ${sets} WHERE id = ? AND agent_id = ?`).run(...Object.values(updates), req.params.id, req.agent.id);
    const agent = await db.prepare('SELECT * FROM sales_agents WHERE id = ?').get(req.params.id);
    res.json({ agent });
  } catch (err) {
    console.error('PATCH /agents/:id error:', err);
    res.status(500).json({ error: 'Failed to update sales agent' });
  }
});

router.delete('/agents/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM sales_agents WHERE id = ? AND agent_id = ?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /agents/:id error:', err);
    res.status(500).json({ error: 'Failed to delete sales agent' });
  }
});

router.patch('/agents/:id/toggle', auth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM sales_agents WHERE id = ? AND agent_id = ?').get(req.params.id, req.agent.id);
    if (!existing) return res.status(404).json({ error: 'Sales agent not found' });
    const newActive = existing.active ? 0 : 1;
    await db.prepare('UPDATE sales_agents SET active = ?, updated_at = ? WHERE id = ? AND agent_id = ?').run(newActive, now(), req.params.id, req.agent.id);
    const agent = await db.prepare('SELECT * FROM sales_agents WHERE id = ?').get(req.params.id);
    res.json({ agent });
  } catch (err) {
    console.error('PATCH /agents/:id/toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle sales agent' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 2. PLAYBOOKS CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/playbooks', auth, async (req, res) => {
  try {
    const { agent_id } = req.query;
    let sql = 'SELECT * FROM sales_playbooks WHERE agent_id = ?';
    const params = [req.agent.id];
    if (agent_id) {
      sql = 'SELECT * FROM sales_playbooks WHERE agent_id = ? AND sales_agent_id = ?';
      params.push(agent_id);
    }
    sql += ' ORDER BY created_at DESC';
    const playbooks = await db.prepare(sql).all(...params);
    res.json({ playbooks });
  } catch (err) {
    console.error('GET /playbooks error:', err);
    res.status(500).json({ error: 'Failed to fetch playbooks' });
  }
});

router.post('/playbooks', auth, async (req, res) => {
  try {
    const {
      agent_id: sales_agent_id, name, trigger = '', steps = '[]',
      product_tier = '', owner_name = '', active = 1
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    const ts = now();
    await db.prepare(`
      INSERT INTO sales_playbooks
        (id, agent_id, sales_agent_id, name, \`trigger\`, steps, product_tier, owner_name, active, conversion_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `).run(
      id, req.agent.id, sales_agent_id || null, name, trigger,
      safeJson(steps), product_tier, owner_name, active, ts
    );
    const playbook = await db.prepare('SELECT * FROM sales_playbooks WHERE id = ?').get(id);
    res.status(201).json({ playbook });
  } catch (err) {
    console.error('POST /playbooks error:', err);
    res.status(500).json({ error: 'Failed to create playbook' });
  }
});

router.patch('/playbooks/:id', auth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM sales_playbooks WHERE id = ? AND agent_id = ?').get(req.params.id, req.agent.id);
    if (!existing) return res.status(404).json({ error: 'Playbook not found' });
    const fields = ['name', 'trigger', 'steps', 'product_tier', 'owner_name', 'active', 'conversion_count'];
    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates[f === 'trigger' ? '`trigger`' : f] = (f === 'steps') ? safeJson(req.body[f]) : req.body[f];
      }
    }
    if (!Object.keys(updates).length) return res.json({ playbook: existing });
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE sales_playbooks SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    const playbook = await db.prepare('SELECT * FROM sales_playbooks WHERE id = ?').get(req.params.id);
    res.json({ playbook });
  } catch (err) {
    console.error('PATCH /playbooks/:id error:', err);
    res.status(500).json({ error: 'Failed to update playbook' });
  }
});

router.delete('/playbooks/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM sales_playbooks WHERE id = ? AND agent_id = ?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /playbooks/:id error:', err);
    res.status(500).json({ error: 'Failed to delete playbook' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 3. QUALIFICATION RULES CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/qualification', auth, async (req, res) => {
  try {
    const { agent_id } = req.query;
    let sql = 'SELECT * FROM sales_qualification_rules WHERE agent_id = ?';
    const params = [req.agent.id];
    if (agent_id) {
      sql = 'SELECT * FROM sales_qualification_rules WHERE agent_id = ? AND sales_agent_id = ?';
      params.push(agent_id);
    }
    sql += ' ORDER BY created_at DESC';
    const rules = await db.prepare(sql).all(...params);
    res.json({ rules });
  } catch (err) {
    console.error('GET /qualification error:', err);
    res.status(500).json({ error: 'Failed to fetch qualification rules' });
  }
});

router.post('/qualification', auth, async (req, res) => {
  try {
    const {
      agent_id: sales_agent_id, field, operator = 'equals',
      value = '', points = 10, active = 1
    } = req.body;
    if (!field) return res.status(400).json({ error: 'field required' });
    const id = uid();
    const ts = now();
    await db.prepare(`
      INSERT INTO sales_qualification_rules
        (id, agent_id, sales_agent_id, field, operator, value, points, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.agent.id, sales_agent_id || null, field, operator, value, points, active, ts);
    const rule = await db.prepare('SELECT * FROM sales_qualification_rules WHERE id = ?').get(id);
    res.status(201).json({ rule });
  } catch (err) {
    console.error('POST /qualification error:', err);
    res.status(500).json({ error: 'Failed to create qualification rule' });
  }
});

router.patch('/qualification/:id', auth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM sales_qualification_rules WHERE id = ? AND agent_id = ?').get(req.params.id, req.agent.id);
    if (!existing) return res.status(404).json({ error: 'Qualification rule not found' });
    const fields = ['field', 'operator', 'value', 'points', 'active'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (!Object.keys(updates).length) return res.json({ rule: existing });
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE sales_qualification_rules SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    const rule = await db.prepare('SELECT * FROM sales_qualification_rules WHERE id = ?').get(req.params.id);
    res.json({ rule });
  } catch (err) {
    console.error('PATCH /qualification/:id error:', err);
    res.status(500).json({ error: 'Failed to update qualification rule' });
  }
});

router.delete('/qualification/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM sales_qualification_rules WHERE id = ? AND agent_id = ?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /qualification/:id error:', err);
    res.status(500).json({ error: 'Failed to delete qualification rule' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 4. OBJECTION HANDLERS CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/objections', auth, async (req, res) => {
  try {
    const { agent_id } = req.query;
    let sql = 'SELECT * FROM sales_objections WHERE agent_id = ?';
    const params = [req.agent.id];
    if (agent_id) {
      sql = 'SELECT * FROM sales_objections WHERE agent_id = ? AND sales_agent_id = ?';
      params.push(agent_id);
    }
    sql += ' ORDER BY created_at DESC';
    const objections = await db.prepare(sql).all(...params);
    res.json({ objections });
  } catch (err) {
    console.error('GET /objections error:', err);
    res.status(500).json({ error: 'Failed to fetch objection handlers' });
  }
});

router.post('/objections', auth, async (req, res) => {
  try {
    const {
      agent_id: sales_agent_id, trigger_phrase, response = '',
      category = 'general', active = 1
    } = req.body;
    if (!trigger_phrase) return res.status(400).json({ error: 'trigger_phrase required' });
    const id = uid();
    const ts = now();
    await db.prepare(`
      INSERT INTO sales_objections
        (id, agent_id, sales_agent_id, trigger_phrase, response, category, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.agent.id, sales_agent_id || null, trigger_phrase, response, category, active, ts);
    const objection = await db.prepare('SELECT * FROM sales_objections WHERE id = ?').get(id);
    res.status(201).json({ objection });
  } catch (err) {
    console.error('POST /objections error:', err);
    res.status(500).json({ error: 'Failed to create objection handler' });
  }
});

router.patch('/objections/:id', auth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM sales_objections WHERE id = ? AND agent_id = ?').get(req.params.id, req.agent.id);
    if (!existing) return res.status(404).json({ error: 'Objection handler not found' });
    const fields = ['trigger_phrase', 'response', 'category', 'active'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (!Object.keys(updates).length) return res.json({ objection: existing });
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE sales_objections SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    const objection = await db.prepare('SELECT * FROM sales_objections WHERE id = ?').get(req.params.id);
    res.json({ objection });
  } catch (err) {
    console.error('PATCH /objections/:id error:', err);
    res.status(500).json({ error: 'Failed to update objection handler' });
  }
});

router.delete('/objections/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM sales_objections WHERE id = ? AND agent_id = ?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /objections/:id error:', err);
    res.status(500).json({ error: 'Failed to delete objection handler' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 5. PRODUCTS CRUD
// ═══════════════════════════════════════════════════════════════

router.get('/products', auth, async (req, res) => {
  try {
    const { agent_id } = req.query;
    let sql = 'SELECT * FROM sales_products WHERE agent_id = ?';
    const params = [req.agent.id];
    if (agent_id) {
      sql = 'SELECT * FROM sales_products WHERE agent_id = ? AND sales_agent_id = ?';
      params.push(agent_id);
    }
    sql += ' ORDER BY created_at DESC';
    const products = await db.prepare(sql).all(...params);
    res.json({ products });
  } catch (err) {
    console.error('GET /products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/products', auth, async (req, res) => {
  try {
    const {
      agent_id: sales_agent_id, name, price = 0, features = '[]',
      segment = '', qualifier_rule = '', active = 1
    } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    const ts = now();
    await db.prepare(`
      INSERT INTO sales_products
        (id, agent_id, sales_agent_id, name, price, features, segment, qualifier_rule, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, req.agent.id, sales_agent_id || null, name, price,
      safeJson(features), segment, qualifier_rule, active, ts
    );
    const product = await db.prepare('SELECT * FROM sales_products WHERE id = ?').get(id);
    res.status(201).json({ product });
  } catch (err) {
    console.error('POST /products error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.patch('/products/:id', auth, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM sales_products WHERE id = ? AND agent_id = ?').get(req.params.id, req.agent.id);
    if (!existing) return res.status(404).json({ error: 'Product not found' });
    const fields = ['name', 'price', 'features', 'segment', 'qualifier_rule', 'active'];
    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates[f] = (f === 'features') ? safeJson(req.body[f]) : req.body[f];
      }
    }
    if (!Object.keys(updates).length) return res.json({ product: existing });
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE sales_products SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    const product = await db.prepare('SELECT * FROM sales_products WHERE id = ?').get(req.params.id);
    res.json({ product });
  } catch (err) {
    console.error('PATCH /products/:id error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/products/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM sales_products WHERE id = ? AND agent_id = ?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /products/:id error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 6. LEAD ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════

router.get('/leads/activity', auth, async (req, res) => {
  try {
    const { agent_id, limit = 50 } = req.query;
    let sql = 'SELECT * FROM sales_lead_activities WHERE agent_id = ?';
    const params = [req.agent.id];
    if (agent_id) {
      sql = 'SELECT * FROM sales_lead_activities WHERE agent_id = ? AND sales_agent_id = ?';
      params.push(agent_id);
    }
    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const activities = await db.prepare(sql).all(...params);
    res.json({ activities });
  } catch (err) {
    console.error('GET /leads/activity error:', err);
    res.status(500).json({ error: 'Failed to fetch lead activities' });
  }
});

router.post('/leads/activity', auth, async (req, res) => {
  try {
    const { agent_id: sales_agent_id, lead_id, type, details = '' } = req.body;
    if (!lead_id || !type) return res.status(400).json({ error: 'lead_id and type required' });
    const id = uid();
    const ts = now();
    await db.prepare(`
      INSERT INTO sales_lead_activities
        (id, agent_id, sales_agent_id, lead_id, type, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.agent.id, sales_agent_id || null, lead_id, type, details, ts);
    const activity = await db.prepare('SELECT * FROM sales_lead_activities WHERE id = ?').get(id);
    res.status(201).json({ activity });
  } catch (err) {
    console.error('POST /leads/activity error:', err);
    res.status(500).json({ error: 'Failed to log lead activity' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 7. AI-POWERED ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// ── Score a Lead ──
router.post('/ai/score-lead', auth, async (req, res) => {
  try {
    const {
      agent_id: sales_agent_id, lead_id,
      name, email, company, source, budget, team_size,
      timeline, decision_maker, current_tool, industry
    } = req.body;

    // Load qualification rules for this sales agent
    let rules = [];
    if (sales_agent_id) {
      rules = await db.prepare(
        'SELECT * FROM sales_qualification_rules WHERE sales_agent_id = ? AND active = 1'
      ).all(sales_agent_id);
    }

    const prompt = `You are a lead scoring AI for a sales team. Analyze the following lead and provide a score.

Lead Information:
- Name: ${name || 'Unknown'}
- Email: ${email || 'Unknown'}
- Company: ${company || 'Unknown'}
- Source: ${source || 'Unknown'}
- Budget: ${budget || 'Unknown'}
- Team Size: ${team_size || 'Unknown'}
- Timeline: ${timeline || 'Unknown'}
- Decision Maker: ${decision_maker || 'Unknown'}
- Current Tool: ${current_tool || 'Unknown'}
- Industry: ${industry || 'Unknown'}

Qualification Rules to consider:
${rules.map(r => `- ${r.field} ${r.operator} "${r.value}" (${r.points} points)`).join('\n') || 'No specific rules configured.'}

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "score": <number 0-100>,
  "label": "<Hot|Warm|Cold|SQL|MQL>",
  "reasons": ["<reason1>", "<reason2>", "<reason3>"],
  "recommended_action": "<action description>"
}`;

    const raw = await callGemini(prompt);
    let result;
    try {
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { score: 50, label: 'Warm', reasons: ['AI parsing error'], recommended_action: 'Manual review recommended' };
    }

    // Update lead score in the leads table if lead_id provided
    if (lead_id) {
      await db.prepare('UPDATE leads SET score = ?, updated_at = ? WHERE id = ?').run(result.score, now(), lead_id);
    }

    res.json(result);
  } catch (err) {
    console.error('POST /ai/score-lead error:', err);
    res.status(500).json({ error: 'Failed to score lead' });
  }
});

// ── Detect Intent ──
router.post('/ai/detect-intent', auth, async (req, res) => {
  try {
    const { message, agent_id: sales_agent_id } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const prompt = `You are a sales intent detection AI. Classify the intent of the following customer message.

Customer Message: "${message}"

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "intent": "<pricing|demo|support|general|complaint|feature_request>",
  "confidence": <number 0-1>,
  "suggested_response": "<brief suggested response>",
  "should_handoff": <true|false>
}`;

    const raw = await callGemini(prompt, 512);
    let result;
    try {
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { intent: 'general', confidence: 0.5, suggested_response: '', should_handoff: false };
    }

    res.json(result);
  } catch (err) {
    console.error('POST /ai/detect-intent error:', err);
    res.status(500).json({ error: 'Failed to detect intent' });
  }
});

// ── Qualify Lead ──
router.post('/ai/qualify-lead', auth, async (req, res) => {
  try {
    const { lead_id, agent_id: sales_agent_id, answers = {} } = req.body;
    if (!lead_id) return res.status(400).json({ error: 'lead_id required' });

    // Load qualification rules
    let rules = [];
    if (sales_agent_id) {
      rules = await db.prepare(
        'SELECT * FROM sales_qualification_rules WHERE sales_agent_id = ? AND active = 1'
      ).all(sales_agent_id);
    }

    // Calculate score based on rules
    let totalScore = 0;
    const matchedRules = [];
    const autoActions = [];

    for (const rule of rules) {
      const answerValue = answers[rule.field];
      if (answerValue === undefined) continue;

      let matched = false;
      const av = String(answerValue).toLowerCase();
      const rv = String(rule.value).toLowerCase();

      switch (rule.operator) {
        case 'equals':
          matched = av === rv;
          break;
        case 'contains':
          matched = av.includes(rv);
          break;
        case 'greater_than':
          matched = parseFloat(answerValue) > parseFloat(rule.value);
          break;
        case 'less_than':
          matched = parseFloat(answerValue) < parseFloat(rule.value);
          break;
        case 'not_equals':
          matched = av !== rv;
          break;
        case 'exists':
          matched = answerValue !== null && answerValue !== '';
          break;
        default:
          matched = av === rv;
      }

      if (matched) {
        totalScore += rule.points;
        matchedRules.push({ field: rule.field, operator: rule.operator, value: rule.value, points: rule.points });
      }
    }

    // Determine label
    let label = 'Cold';
    if (totalScore >= 80) { label = 'SQL'; autoActions.push('Assign to senior sales rep'); }
    else if (totalScore >= 60) { label = 'Hot'; autoActions.push('Schedule demo call'); }
    else if (totalScore >= 40) { label = 'MQL'; autoActions.push('Add to nurture campaign'); }
    else if (totalScore >= 20) { label = 'Warm'; autoActions.push('Send follow-up email'); }
    else { autoActions.push('Add to general mailing list'); }

    // Update lead score
    await db.prepare('UPDATE leads SET score = ?, updated_at = ? WHERE id = ?').run(totalScore, now(), lead_id);

    res.json({ score: totalScore, label, matched_rules: matchedRules, auto_actions: autoActions });
  } catch (err) {
    console.error('POST /ai/qualify-lead error:', err);
    res.status(500).json({ error: 'Failed to qualify lead' });
  }
});

// ── AI Chat (Multi-turn Sales Conversation) ──
router.post('/ai/chat', auth, async (req, res) => {
  try {
    const { agent_id: sales_agent_id, messages = [], message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    if (!sales_agent_id) return res.status(400).json({ error: 'agent_id required' });

    // Load sales agent config
    const salesAgent = await db.prepare('SELECT * FROM sales_agents WHERE id = ?').get(sales_agent_id);
    if (!salesAgent) return res.status(404).json({ error: 'Sales agent not found' });

    // Load related data
    const playbooks = await db.prepare(
      'SELECT * FROM sales_playbooks WHERE sales_agent_id = ? AND active = 1'
    ).all(sales_agent_id);

    const products = await db.prepare(
      'SELECT * FROM sales_products WHERE sales_agent_id = ? AND active = 1'
    ).all(sales_agent_id);

    const objections = await db.prepare(
      'SELECT * FROM sales_objections WHERE sales_agent_id = ? AND active = 1'
    ).all(sales_agent_id);

    // Build system prompt
    const systemPrompt = `${salesAgent.system_prompt || 'You are a professional AI sales assistant.'}

Your persona:
- Name: ${salesAgent.name}
- Role: ${salesAgent.role}
- Tone: ${salesAgent.tone}
- Language: ${salesAgent.language}

Available Products:
${products.map(p => `- ${p.name}: $${p.price} - Features: ${p.features} (Segment: ${p.segment})`).join('\n') || 'No products configured.'}

Active Playbooks:
${playbooks.map(p => `- ${p.name}: Trigger="${p.trigger}", Steps: ${p.steps}`).join('\n') || 'No playbooks configured.'}

Objection Handling:
${objections.map(o => `- If customer says "${o.trigger_phrase}", respond with: "${o.response}" (Category: ${o.category})`).join('\n') || 'No objection handlers configured.'}

Rules:
- Stay in character as ${salesAgent.name}.
- Maximum conversation turns: ${salesAgent.max_turns}.
- If the conversation seems to need human intervention or exceeds ${salesAgent.handoff_threshold} unresolved concerns, suggest a handoff.
- Always be helpful, professional, and aim to move the conversation toward a positive outcome.`;

    // Build conversation history
    const conversationHistory = messages.map(m =>
      `${m.role === 'user' ? 'Customer' : 'Sales Agent'}: ${m.content}`
    ).join('\n');

    const fullPrompt = `${systemPrompt}

Conversation so far:
${conversationHistory}

Customer: ${message}

Respond as the sales agent. Be concise and helpful.`;

    // Call Gemini for the reply
    const reply = await callGemini(fullPrompt, 1024);

    // Also detect intent on the user's message
    let intent = null;
    try {
      const intentPrompt = `Classify this customer message intent. Message: "${message}"
Respond ONLY with valid JSON: {"intent":"<pricing|demo|support|general|complaint|feature_request>","confidence":<0-1>}`;
      const intentRaw = await callGemini(intentPrompt, 256);
      const intentCleaned = intentRaw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      intent = JSON.parse(intentCleaned);
    } catch {
      intent = { intent: 'general', confidence: 0.5 };
    }

    // Build suggested actions based on intent
    const suggestedActions = [];
    if (intent.intent === 'pricing') suggestedActions.push('Send pricing sheet', 'Offer discount');
    if (intent.intent === 'demo') suggestedActions.push('Schedule demo', 'Send demo link');
    if (intent.intent === 'complaint') suggestedActions.push('Escalate to manager', 'Create support ticket');
    if (intent.intent === 'feature_request') suggestedActions.push('Log feature request', 'Share roadmap');
    if (intent.should_handoff) suggestedActions.push('Hand off to human agent');

    res.json({
      reply: reply.trim(),
      intent,
      suggested_actions: suggestedActions
    });
  } catch (err) {
    console.error('POST /ai/chat error:', err);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

// ── Generate Proposal ──
router.post('/ai/generate-proposal', auth, async (req, res) => {
  try {
    const { lead_id, agent_id: sales_agent_id, product_id, custom_notes = '' } = req.body;
    if (!lead_id || !product_id) return res.status(400).json({ error: 'lead_id and product_id required' });

    // Load lead data
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').get(lead_id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    // Load product data
    const product = await db.prepare('SELECT * FROM sales_products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Load sales agent if provided
    let salesAgent = null;
    if (sales_agent_id) {
      salesAgent = await db.prepare('SELECT * FROM sales_agents WHERE id = ?').get(sales_agent_id);
    }

    const prompt = `Generate a professional sales proposal in HTML format.

Lead Information:
- Name: ${lead.name || 'Valued Customer'}
- Company: ${lead.company || 'Their Company'}
- Email: ${lead.email || ''}
- Source: ${lead.source || ''}

Product:
- Name: ${product.name}
- Price: $${product.price}
- Features: ${product.features || '[]'}
- Segment: ${product.segment || 'General'}

${salesAgent ? `Sales Agent: ${salesAgent.name} (${salesAgent.role})` : ''}
${custom_notes ? `Additional Notes: ${custom_notes}` : ''}

Generate a professional, well-formatted HTML proposal that includes:
1. A header with the proposal title
2. An executive summary
3. Product details and features breakdown
4. Pricing section
5. Why this solution is right for the customer
6. Next steps / Call to action

Use inline CSS for styling. Make it look professional with a clean design.
Also provide a brief 2-3 sentence summary of the proposal.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "proposal_html": "<full HTML content>",
  "summary": "<brief summary>"
}`;

    const raw = await callGemini(prompt, 4096);
    let result;
    try {
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, treat the whole response as the proposal
      result = {
        proposal_html: `<div style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;">${raw}</div>`,
        summary: 'AI-generated sales proposal for ' + (lead.name || 'customer')
      };
    }

    res.json(result);
  } catch (err) {
    console.error('POST /ai/generate-proposal error:', err);
    res.status(500).json({ error: 'Failed to generate proposal' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 8. DASHBOARD ANALYTICS
// ═══════════════════════════════════════════════════════════════

router.get('/dashboard', auth, async (req, res) => {
  try {
    const { agent_id: sales_agent_id } = req.query;
    const agentId = req.agent.id;

    // Total leads
    const totalLeadsRow = await db.prepare(
      'SELECT COUNT(*) as count FROM leads WHERE agent_id = ?'
    ).get(agentId);
    const totalLeads = totalLeadsRow?.count || 0;

    // Leads by status
    const leadsByStatus = await db.prepare(
      'SELECT status, COUNT(*) as count FROM leads WHERE agent_id = ? GROUP BY status'
    ).all(agentId);

    // Leads by score tier
    const leadsByScore = await db.prepare(`
      SELECT
        CASE
          WHEN score >= 80 THEN 'Hot'
          WHEN score >= 60 THEN 'Warm'
          WHEN score >= 40 THEN 'MQL'
          WHEN score >= 20 THEN 'Cold'
          ELSE 'Unscored'
        END as tier,
        COUNT(*) as count
      FROM leads WHERE agent_id = ?
      GROUP BY tier
    `).all(agentId);

    // Pipeline value from deals
    const pipelineRow = await db.prepare(
      'SELECT IFNULL(SUM(value), 0) as total FROM deals WHERE agent_id = ?'
    ).get(agentId);
    const pipelineValue = pipelineRow?.total || 0;

    // Conversion rate (leads with status 'Won' or 'Converted' / total leads)
    const convertedRow = await db.prepare(
      "SELECT COUNT(*) as count FROM leads WHERE agent_id = ? AND (status = 'Won' OR status = 'Converted')"
    ).get(agentId);
    const conversionRate = totalLeads > 0 ? Math.round(((convertedRow?.count || 0) / totalLeads) * 100) : 0;

    // Recent activities
    let activitiesSql = 'SELECT * FROM sales_lead_activities WHERE agent_id = ?';
    const actParams = [agentId];
    if (sales_agent_id) {
      activitiesSql += ' AND sales_agent_id = ?';
      actParams.push(sales_agent_id);
    }
    activitiesSql += ' ORDER BY created_at DESC LIMIT 20';
    const recentActivities = await db.prepare(activitiesSql).all(...actParams);

    // Top performing playbooks
    let playbooksSql = 'SELECT * FROM sales_playbooks WHERE agent_id = ?';
    const pbParams = [agentId];
    if (sales_agent_id) {
      playbooksSql += ' AND sales_agent_id = ?';
      pbParams.push(sales_agent_id);
    }
    playbooksSql += ' ORDER BY conversion_count DESC LIMIT 5';
    const topPlaybooks = await db.prepare(playbooksSql).all(...pbParams);

    res.json({
      total_leads: totalLeads,
      leads_by_status: leadsByStatus,
      leads_by_score: leadsByScore,
      pipeline_value: pipelineValue,
      conversion_rate: conversionRate,
      recent_activities: recentActivities,
      top_playbooks: topPlaybooks
    });
  } catch (err) {
    console.error('GET /dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
