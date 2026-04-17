const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

// ── Gemini helper ─────────────────────────────────────────────────────────────
const GEMINI_KEY  = () => process.env.GOOGLE_API_KEY;
const GEMINI_MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function callGemini(systemPrompt, userMessage, maxTokens = 800) {
  const apiKey = GEMINI_KEY();
  if (!apiKey || apiKey === 'your_google_api_key_here') {
    throw new Error('GOOGLE_API_KEY not configured in .env');
  }
  const model = GEMINI_MODEL();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Multi-turn Gemini chat (for agents/:id/chat and /chat proxy)
async function callGeminiChat(systemPrompt, messages, maxTokens = 800) {
  const apiKey = GEMINI_KEY();
  if (!apiKey || apiKey === 'your_google_api_key_here') {
    throw new Error('GOOGLE_API_KEY not configured in .env');
  }
  const model = GEMINI_MODEL();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Convert Anthropic-style messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : (m.content?.[0]?.text || '') }],
  }));

  const body = {
    ...(systemPrompt ? { system_instruction: { parts: [{ text: systemPrompt }] } } : {}),
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Reply suggestion ──────────────────────────────────────────────────────────
router.post('/reply-suggestion', auth, async (req, res) => {
  try {
    const { conversation_id, context } = req.body;
    let messages = [];
    if (conversation_id) {
      messages = db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT 10').all(conversation_id);
    }
    const convoText = messages.map(m => `${m.role === 'agent' ? 'Agent' : 'Customer'}: ${m.text}`).join('\n');
    const text = await callGemini(
      'You are a helpful customer support assistant. Generate a professional, empathetic reply suggestion for the support agent. Keep it concise (2-3 sentences). Do not use placeholders.',
      `Conversation so far:\n${convoText || context || 'New conversation'}\n\nGenerate a smart reply suggestion:`
    );
    res.json({ suggestion: text.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Auto-reply ────────────────────────────────────────────────────────────────
router.post('/auto-reply', auth, async (req, res) => {
  try {
    const { message, channel = 'email' } = req.body;
    const text = await callGemini(
      `You are Aria, an AI customer support bot for SupportDesk. Respond helpfully and professionally via ${channel}. Keep replies concise.`,
      message || 'Hello'
    );
    res.json({ reply: text.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Conversation summary ──────────────────────────────────────────────────────
router.post('/summarize', auth, async (req, res) => {
  try {
    const { conversation_id, text } = req.body;
    let content = text;
    if (conversation_id && !content) {
      const msgs = db.prepare('SELECT role,text FROM messages WHERE conversation_id=? ORDER BY created_at ASC').all(conversation_id);
      content = msgs.map(m => `${m.role === 'agent' ? 'Agent' : 'Customer'}: ${m.text}`).join('\n');
    }
    const summary = await callGemini(
      'You are a customer support analyst. Summarize the conversation in 2-3 bullet points: issue, resolution status, and next steps.',
      content || 'No messages yet'
    );
    res.json({ summary: summary.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Sentiment ─────────────────────────────────────────────────────────────────
router.post('/sentiment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await callGemini(
      'Analyze the sentiment of this customer message. Respond with JSON only: {"sentiment":"positive"|"neutral"|"negative","score":0-100,"reason":"brief reason"}',
      text || ''
    );
    const clean = result.replace(/```json|```/g, '').trim();
    try { res.json(JSON.parse(clean)); }
    catch { res.json({ sentiment: 'neutral', score: 50, reason: 'Unable to analyze' }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Classify ──────────────────────────────────────────────────────────────────
router.post('/classify', auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const result = await callGemini(
      'Classify this support ticket. Respond with JSON only: {"priority":"urgent"|"high"|"normal"|"low","category":"billing"|"technical"|"feature"|"general","reason":"brief reason"}',
      `Subject: ${subject}\nMessage: ${message}`
    );
    const clean = result.replace(/```json|```/g, '').trim();
    try { res.json(JSON.parse(clean)); }
    catch { res.json({ priority: 'normal', category: 'general', reason: 'Unable to classify' }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Daily briefing ────────────────────────────────────────────────────────────
router.post('/daily-briefing', auth, async (req, res) => {
  try {
    const openConvs = db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status='open'").get().c;
    const urgent = db.prepare("SELECT COUNT(*) as c FROM conversations WHERE priority='urgent' AND status='open'").get().c;
    const briefing = await callGemini(
      'You are a helpful AI assistant for a customer support platform. Generate a short daily briefing for the support team lead.',
      `Metrics: ${openConvs} open conversations, ${urgent} urgent. Date: ${new Date().toDateString()}. Generate 3 concise action items for the day.`
    );
    res.json({ briefing: briefing.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Marketing copy ────────────────────────────────────────────────────────────
router.post('/marketing-copy', auth, async (req, res) => {
  try {
    const { type = 'email', topic, tone = 'professional' } = req.body;
    const copy = await callGemini(
      `You are a marketing copywriter. Write ${type} marketing copy that is ${tone} and compelling. Keep subject lines under 60 chars. Return JSON: {"subject":"...","body":"..."}`,
      `Topic: ${topic || 'product update'}`
    );
    const clean = copy.replace(/```json|```/g, '').trim();
    try { res.json(JSON.parse(clean)); }
    catch { res.json({ subject: 'Important Update', body: copy }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Deal advice ───────────────────────────────────────────────────────────────
router.post('/deal-advice', auth, async (req, res) => {
  try {
    const { deal_id } = req.body;
    const deal = deal_id ? db.prepare('SELECT * FROM deals WHERE id=?').get(deal_id) : null;
    const advice = await callGemini(
      'You are a sales advisor. Provide actionable advice for this deal. Return 3 bullet point recommendations.',
      deal ? `Deal: ${deal.title}, Stage: ${deal.stage}, Value: $${deal.value}, Probability: ${deal.probability}%` : 'New deal'
    );
    res.json({ advice: advice.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── KB article ────────────────────────────────────────────────────────────────
router.post('/kb-article', auth, async (req, res) => {
  try {
    const { title } = req.body;
    const body = await callGemini(
      'You are a technical writer for a SaaS customer support platform. Write a helpful knowledge base article in Markdown format with headings, steps, and tips.',
      `Write a KB article titled: "${title}"`
    );
    res.json({ body: body.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Visitor intent ────────────────────────────────────────────────────────────
router.post('/visitor-intent', auth, async (req, res) => {
  try {
    const { page, time_on_page, actions } = req.body;
    const result = await callGemini(
      'Classify visitor intent. Return JSON: {"intent":"buyer"|"researcher"|"competitor"|"support_seeker","confidence":0-100,"suggestion":"proactive message"}',
      `Page: ${page}, Time: ${time_on_page}s, Actions: ${JSON.stringify(actions || [])}`
    );
    const clean = result.replace(/```json|```/g, '').trim();
    try { res.json(JSON.parse(clean)); }
    catch { res.json({ intent: 'researcher', confidence: 60, suggestion: 'Can I help you find anything?' }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Reports insight ───────────────────────────────────────────────────────────
router.post('/reports-insight', auth, async (req, res) => {
  try {
    const { period, metrics } = req.body;
    const insight = await callGemini(
      'You are a data analyst for a customer support platform. Provide 3 actionable insights based on the metrics. Be specific and concise.',
      `Period: ${period || 'last 7 days'}\nMetrics: ${JSON.stringify(metrics || {})}`
    );
    res.json({ insight: insight.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AI Agents CRUD ────────────────────────────────────────────────────────────
router.get('/agents', auth, (req, res) => {
  res.json({ agents: db.prepare('SELECT * FROM ai_agents WHERE agent_id=? ORDER BY name ASC').all(req.agent.id) });
});

router.get('/agents/:id', auth, (req, res) => {
  const agent = db.prepare('SELECT * FROM ai_agents WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!agent) return res.status(404).json({ error: 'Not found' });
  res.json({ agent });
});

router.post('/agents', auth, (req, res) => {
  const { name, description, system_prompt, tone, type = 'support' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO ai_agents (id,name,description,system_prompt,tone,type,agent_id) VALUES (?,?,?,?,?,?,?)').run(
    id, name, description || null, system_prompt || null, tone || 'professional', type, req.agent.id
  );
  res.status(201).json({ agent: db.prepare('SELECT * FROM ai_agents WHERE id=?').get(id) });
});

router.patch('/agents/:id', auth, (req, res) => {
  const agent = db.prepare('SELECT * FROM ai_agents WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!agent) return res.status(404).json({ error: 'Not found' });
  const fields = ['name', 'description', 'system_prompt', 'tone', 'type'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (!Object.keys(updates).length) return res.json({ agent });
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  db.prepare(`UPDATE ai_agents SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ agent: db.prepare('SELECT * FROM ai_agents WHERE id=?').get(req.params.id) });
});

router.delete('/agents/:id', auth, (req, res) => {
  db.prepare('DELETE FROM ai_agents WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
});

// ── AI Agent multi-turn chat ──────────────────────────────────────────────────
router.post('/agents/:id/chat', auth, async (req, res) => {
  try {
    const agent = db.prepare('SELECT * FROM ai_agents WHERE id=?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Not found' });
    const { messages = [], message } = req.body;
    const history = [...messages, { role: 'user', content: message }];
    const reply = await callGeminiChat(
      agent.system_prompt || `You are ${agent.name}, an AI ${agent.type} assistant for SupportDesk. Be helpful, professional, and concise.`,
      history,
      600
    );
    res.json({ reply: reply.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Team Chat: summary ────────────────────────────────────────────────────────
router.post('/chat-summary', auth, async (req, res) => {
  try {
    const { channel_id, messages: clientMsgs } = req.body;
    let msgs = clientMsgs;
    if (!msgs && channel_id) {
      msgs = await db.prepare(`
        SELECT m.text, a.name as sender_name
        FROM chat_messages m LEFT JOIN agents a ON m.sender_id = a.id
        WHERE m.channel_id=? AND (m.thread_id IS NULL OR m.thread_id='')
        ORDER BY m.created_at DESC LIMIT 30
      `).all(channel_id);
      msgs = msgs.reverse();
    }
    if (!msgs || msgs.length === 0) return res.json({ summary: 'No messages to summarise yet.' });
    const ctx = msgs.map(m => `[${m.sender_name || 'Agent'}] ${m.text || ''}`).join('\n');
    const summary = await callGemini(
      'You are a team productivity assistant. Summarise this team chat conversation in 3–5 bullet points. Focus on decisions made, action items, and key updates. Keep each bullet under 15 words. No markdown headers.',
      ctx,
      400
    );
    res.json({ summary: summary.trim() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Team Chat: standup ────────────────────────────────────────────────────────
router.post('/chat-standup', auth, async (req, res) => {
  try {
    const { channel_id, messages: clientMsgs } = req.body;
    let msgs = clientMsgs;
    if (!msgs && channel_id) {
      msgs = await db.prepare(`
        SELECT m.text, a.name as sender_name
        FROM chat_messages m LEFT JOIN agents a ON m.sender_id = a.id
        WHERE m.channel_id=? AND (m.thread_id IS NULL OR m.thread_id='')
        ORDER BY m.created_at DESC LIMIT 40
      `).all(channel_id);
      msgs = msgs.reverse();
    }
    if (!msgs || msgs.length === 0) return res.json({ standup: 'No messages to generate a standup from.' });
    const ctx = msgs.map(m => `[${m.sender_name || 'Agent'}] ${m.text || ''}`).join('\n');
    const standup = await callGemini(
      'You are a scrum master assistant. Generate a concise standup report from this team chat. Format: DONE (2–3 bullets), DOING (2–3 bullets), BLOCKED (1–2 bullets or "None"). Keep bullets short. No markdown headers.',
      ctx,
      350
    );
    res.json({ standup: standup.trim() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Team Chat: reply suggestions ──────────────────────────────────────────────
router.post('/chat-reply-suggestions', auth, async (req, res) => {
  try {
    const { channel_id, messages: clientMsgs } = req.body;
    let msgs = clientMsgs;
    if (!msgs && channel_id) {
      msgs = await db.prepare(`
        SELECT m.text, a.name as sender_name
        FROM chat_messages m LEFT JOIN agents a ON m.sender_id = a.id
        WHERE m.channel_id=? AND (m.thread_id IS NULL OR m.thread_id='')
        ORDER BY m.created_at DESC LIMIT 5
      `).all(channel_id);
      msgs = msgs.reverse();
    }
    if (!msgs || msgs.length === 0) return res.json({ suggestions: ['Got it!', 'Thanks!', 'On it.'] });
    const ctx = msgs.map(m => `[${m.sender_name || 'Agent'}] ${m.text || ''}`).join('\n');
    const raw = await callGemini(
      'You are a team chat assistant. Based on the conversation, suggest exactly 3 short, natural reply options a team member might send. Return a JSON array of 3 strings only, no other text.',
      ctx,
      200
    );
    let suggestions = ['Got it!', 'Thanks for the update!', 'On it — will follow up.'];
    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      if (Array.isArray(parsed) && parsed.length >= 3) suggestions = parsed.slice(0, 3);
    } catch {}
    res.json({ suggestions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Generic Gemini proxy (replaces Anthropic /chat) ───────────────────────────
// Accepts same shape as Anthropic: { system, messages, max_tokens }
// so frontend code needs zero changes
router.post('/chat', auth, async (req, res) => {
  try {
    const { system, messages = [], max_tokens = 800 } = req.body;
    const text = await callGeminiChat(system || '', messages, max_tokens);
    // Return in Anthropic-compatible shape so frontend works unchanged
    res.json({ content: [{ type: 'text', text }] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.callGemini = callGemini;
module.exports.callGeminiChat = callGeminiChat;
