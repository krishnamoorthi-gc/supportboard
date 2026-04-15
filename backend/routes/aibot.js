const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

const DEFAULT_SYS_PROMPT = "You are Aria, a friendly and professional customer support assistant. Your job is to help customers resolve their issues quickly. Always be empathetic, concise, and solution-focused. If you cannot resolve an issue, collect details and escalate to a human agent.";

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
function safeJson(val) {
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}
function parseJson(val, fb) {
  try { return typeof val === 'string' ? JSON.parse(val) : val || fb; }
  catch { return fb; }
}

// ── GET /config ──────────────────────────────────────────────────────────────
router.get('/config', auth, async (req, res) => {
  try {
    let cfg = await db.prepare('SELECT * FROM aibot_config WHERE agent_id = ?').get(req.agent.id);
    if (!cfg) {
      // Auto-create default config
      const id = uid();
      const ts = now();
      const defaultChannels = JSON.stringify({
        live: false, email: false, whatsapp: false, telegram: false,
        facebook: false, instagram: false, viber: false, apple: false,
        line: false, tiktok: false, x: false, sms: false, voice: false,
        video: false, api: false
      });
      await db.prepare(
        'INSERT INTO aibot_config (id, agent_id, sys_prompt, channels, created_at, updated_at) VALUES (?,?,?,?,?,?)'
      ).run(id, req.agent.id, DEFAULT_SYS_PROMPT, defaultChannels, ts, ts);
      cfg = await db.prepare('SELECT * FROM aibot_config WHERE agent_id = ?').get(req.agent.id);
    }
    cfg.channels = parseJson(cfg.channels, {});
    res.json({ config: cfg });
  } catch (err) {
    console.error('GET /aibot/config error:', err);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// ── PATCH /config ────────────────────────────────────────────────────────────
router.patch('/config', auth, async (req, res) => {
  try {
    const allowed = ['bot_name','bot_tone','bot_lang','handoff_after','working_hours','auto_resolve','auto_resolve_hours','sys_prompt','ai_auto_reply','channels'];
    const updates = { updated_at: now() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = key === 'channels' ? safeJson(req.body[key]) : req.body[key];
      }
    }
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE aibot_config SET ${sets} WHERE agent_id = ?`).run(...Object.values(updates), req.agent.id);
    const cfg = await db.prepare('SELECT * FROM aibot_config WHERE agent_id = ?').get(req.agent.id);
    cfg.channels = parseJson(cfg.channels, {});
    res.json({ config: cfg });
  } catch (err) {
    console.error('PATCH /aibot/config error:', err);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// ── FAQs ─────────────────────────────────────────────────────────────────────
router.get('/faqs', auth, async (req, res) => {
  try {
    const faqs = await db.prepare('SELECT * FROM aibot_faqs WHERE agent_id = ? ORDER BY created_at ASC').all(req.agent.id);
    res.json({ faqs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

router.post('/faqs', auth, async (req, res) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'question and answer required' });
    const id = uid();
    const ts = now();
    await db.prepare(
      'INSERT INTO aibot_faqs (id, agent_id, question, answer, created_at, updated_at) VALUES (?,?,?,?,?,?)'
    ).run(id, req.agent.id, question, answer, ts, ts);
    const faq = await db.prepare('SELECT * FROM aibot_faqs WHERE id = ? AND agent_id = ?').get(id, req.agent.id);
    res.status(201).json({ faq });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

router.patch('/faqs/:id', auth, async (req, res) => {
  try {
    const { question, answer } = req.body;
    const updates = { updated_at: now() };
    if (question !== undefined) updates.question = question;
    if (answer !== undefined) updates.answer = answer;
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE aibot_faqs SET ${sets} WHERE id = ? AND agent_id = ?`).run(...Object.values(updates), req.params.id, req.agent.id);
    const faq = await db.prepare('SELECT * FROM aibot_faqs WHERE id = ? AND agent_id = ?').get(req.params.id, req.agent.id);
    res.json({ faq });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

router.delete('/faqs/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM aibot_faqs WHERE id = ? AND agent_id = ?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

// ── Docs ─────────────────────────────────────────────────────────────────────
router.get('/docs', auth, async (req, res) => {
  try {
    const docs = await db.prepare('SELECT * FROM aibot_docs WHERE agent_id = ? ORDER BY created_at DESC').all(req.agent.id);
    res.json({ docs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch docs' });
  }
});

router.post('/docs', auth, async (req, res) => {
  try {
    const { name, size_label, file_path } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    const ts = now();
    await db.prepare(
      'INSERT INTO aibot_docs (id, agent_id, name, size_label, file_path, status, created_at) VALUES (?,?,?,?,?,?,?)'
    ).run(id, req.agent.id, name, size_label || '', file_path || '', 'trained', ts);
    const doc = await db.prepare('SELECT * FROM aibot_docs WHERE id = ? AND agent_id = ?').get(id, req.agent.id);
    res.status(201).json({ doc });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add doc' });
  }
});

router.delete('/docs/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM aibot_docs WHERE id = ? AND agent_id = ?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete doc' });
  }
});

// ── URLs ─────────────────────────────────────────────────────────────────────
router.get('/urls', auth, async (req, res) => {
  try {
    const urls = await db.prepare('SELECT * FROM aibot_urls WHERE agent_id = ? ORDER BY created_at DESC').all(req.agent.id);
    res.json({ urls });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

router.post('/urls', auth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });
    const id = uid();
    const ts = now();
    // Start as 'crawling', flip to 'trained' after 3s (simulated crawl)
    await db.prepare(
      'INSERT INTO aibot_urls (id, agent_id, url, status, created_at) VALUES (?,?,?,?,?)'
    ).run(id, req.agent.id, url, 'crawling', ts);
    // Async update status after delay
    setTimeout(async () => {
      try { await db.prepare("UPDATE aibot_urls SET status='trained' WHERE id=?").run(id); } catch {}
    }, 3000);
    const row = await db.prepare('SELECT * FROM aibot_urls WHERE id = ? AND agent_id = ?').get(id, req.agent.id);
    res.status(201).json({ url: row });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add URL' });
  }
});

router.delete('/urls/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM aibot_urls WHERE id = ? AND agent_id = ?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete URL' });
  }
});

// ── Test Chat (proxy via Gemini on backend) ───────────────────────────────────
router.post('/test-chat', auth, async (req, res) => {
  try {
    const { messages, botName, botTone, botLang, handoffAfter, sysPrompt, faqs: faqList } = req.body;
    const GEMINI_KEY = process.env.GOOGLE_API_KEY;
    if (!GEMINI_KEY) {
      return res.status(503).json({ error: 'AI not configured — GOOGLE_API_KEY missing' });
    }

    // Load FAQs from DB if not provided
    let faqContext = '';
    const dbFaqs = await db.prepare('SELECT * FROM aibot_faqs WHERE agent_id = ? ORDER BY created_at ASC').all(req.agent.id);
    const allFaqs = faqList?.length ? faqList : dbFaqs;
    if (allFaqs.length) {
      faqContext = '\n\nKnowledge Base FAQs:\n' + allFaqs.map(f => `Q: ${f.question || f.q}\nA: ${f.answer || f.a}`).join('\n\n');
    }

    // Build system instruction
    const systemText = (sysPrompt || DEFAULT_SYS_PROMPT) +
      `\n\nBot name: ${botName || 'Aria'}. Response tone: ${botTone || 'professional'}. Language: ${botLang || 'EN'}.` +
      `\nAfter ${handoffAfter || '3'} unanswered messages, offer to connect to a human agent.` +
      faqContext +
      '\n\nAnswer using the knowledge base first. Be concise. Do not use markdown.';

    // Format messages for Gemini
    const history = (messages || []).filter(m => m.from !== 'sys');
    const geminiContents = [];
    for (const m of history) {
      geminiContents.push({ role: m.from === 'user' ? 'user' : 'model', parts: [{ text: m.text }] });
    }

    // Merge consecutive same-role messages (Gemini requirement)
    const merged = [];
    for (const c of geminiContents) {
      if (merged.length && merged[merged.length - 1].role === c.role) {
        merged[merged.length - 1].parts[0].text += '\n' + c.parts[0].text;
      } else {
        merged.push({ ...c, parts: [{ ...c.parts[0] }] });
      }
    }
    if (!merged.length || merged[0].role !== 'user') merged.unshift({ role: 'user', parts: [{ text: 'Hello' }] });
    if (merged[merged.length - 1].role === 'model') merged.pop();

    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemText }] },
          contents: merged,
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 }
        })
      }
    );
    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Let me connect you with a human agent for further assistance.';
    res.json({ reply });
  } catch (err) {
    console.error('POST /aibot/test-chat error:', err);
    res.status(500).json({ error: 'AI chat failed' });
  }
});

module.exports = router;
