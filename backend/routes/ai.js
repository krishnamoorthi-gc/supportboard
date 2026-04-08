const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

const ANTHROPIC_KEY = () => process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(systemPrompt, userMessage, maxTokens = 800) {
  const apiKey = ANTHROPIC_KEY();
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    throw new Error('ANTHROPIC_API_KEY not configured in .env');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// POST /api/ai/reply-suggestion — smart reply for conversation
router.post('/reply-suggestion', auth, async (req, res) => {
  try {
    const { conversation_id, context } = req.body;
    let messages = [];
    if (conversation_id) {
      messages = db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT 10').all(conversation_id);
    }
    const convoText = messages.map(m => `${m.role === 'agent' ? 'Agent' : 'Customer'}: ${m.text}`).join('\n');
    const text = await callClaude(
      'You are a helpful customer support assistant. Generate a professional, empathetic reply suggestion for the support agent. Keep it concise (2-3 sentences). Do not use placeholders.',
      `Conversation so far:\n${convoText || context || 'New conversation'}\n\nGenerate a smart reply suggestion:`
    );
    res.json({ suggestion: text.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/auto-reply — auto reply for incoming message
router.post('/auto-reply', auth, async (req, res) => {
  try {
    const { message, channel = 'email' } = req.body;
    const text = await callClaude(
      `You are Aria, an AI customer support bot for SupportDesk. Respond helpfully and professionally via ${channel}. Keep replies concise.`,
      message || 'Hello'
    );
    res.json({ reply: text.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/summarize — conversation summary
router.post('/summarize', auth, async (req, res) => {
  try {
    const { conversation_id, text } = req.body;
    let content = text;
    if (conversation_id && !content) {
      const msgs = db.prepare('SELECT role,text FROM messages WHERE conversation_id=? ORDER BY created_at ASC').all(conversation_id);
      content = msgs.map(m => `${m.role === 'agent' ? 'Agent' : 'Customer'}: ${m.text}`).join('\n');
    }
    const summary = await callClaude(
      'You are a customer support analyst. Summarize the conversation in 2-3 bullet points: issue, resolution status, and next steps.',
      content || 'No messages yet'
    );
    res.json({ summary: summary.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/sentiment — analyze sentiment
router.post('/sentiment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const result = await callClaude(
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

// POST /api/ai/classify — classify priority
router.post('/classify', auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const result = await callClaude(
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

// POST /api/ai/daily-briefing
router.post('/daily-briefing', auth, async (req, res) => {
  try {
    const openConvs = db.prepare("SELECT COUNT(*) as c FROM conversations WHERE status='open'").get().c;
    const urgent = db.prepare("SELECT COUNT(*) as c FROM conversations WHERE priority='urgent' AND status='open'").get().c;
    const briefing = await callClaude(
      'You are a helpful AI assistant for a customer support platform. Generate a short daily briefing for the support team lead.',
      `Metrics: ${openConvs} open conversations, ${urgent} urgent. Date: ${new Date().toDateString()}. Generate 3 concise action items for the day.`
    );
    res.json({ briefing: briefing.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/marketing-copy
router.post('/marketing-copy', auth, async (req, res) => {
  try {
    const { type = 'email', topic, tone = 'professional' } = req.body;
    const copy = await callClaude(
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

// POST /api/ai/deal-advice
router.post('/deal-advice', auth, async (req, res) => {
  try {
    const { deal_id } = req.body;
    const deal = deal_id ? db.prepare('SELECT * FROM deals WHERE id=?').get(deal_id) : null;
    const advice = await callClaude(
      'You are a sales advisor. Provide actionable advice for this deal. Return 3 bullet point recommendations.',
      deal ? `Deal: ${deal.title}, Stage: ${deal.stage}, Value: $${deal.value}, Probability: ${deal.probability}%` : 'New deal'
    );
    res.json({ advice: advice.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/kb-article — generate KB article from title
router.post('/kb-article', auth, async (req, res) => {
  try {
    const { title } = req.body;
    const body = await callClaude(
      'You are a technical writer for a SaaS customer support platform. Write a helpful knowledge base article in Markdown format with headings, steps, and tips.',
      `Write a KB article titled: "${title}"`
    );
    res.json({ body: body.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/visitor-intent — classify visitor intent
router.post('/visitor-intent', auth, async (req, res) => {
  try {
    const { page, time_on_page, actions } = req.body;
    const result = await callClaude(
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

// GET /api/ai/agents
router.get('/agents', auth, (req, res) => {
  res.json({ agents: db.prepare('SELECT * FROM ai_agents ORDER BY name ASC').all() });
});

// POST /api/ai/agents
router.post('/agents', auth, (req, res) => {
  const { name, description, system_prompt, tone, type='support' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO ai_agents (id,name,description,system_prompt,tone,type) VALUES (?,?,?,?,?,?)').run(
    id, name, description||null, system_prompt||null, tone||'professional', type
  );
  res.status(201).json({ agent: db.prepare('SELECT * FROM ai_agents WHERE id=?').get(id) });
});

// POST /api/ai/agents/:id/chat — multi-turn sales agent conversation
router.post('/agents/:id/chat', auth, async (req, res) => {
  try {
    const agent = db.prepare('SELECT * FROM ai_agents WHERE id=?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Not found' });
    const { messages = [], message } = req.body;
    const apiKey = ANTHROPIC_KEY();
    if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in .env' });
    }
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    history.push({ role: 'user', content: message });
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        system: agent.system_prompt || `You are ${agent.name}, an AI ${agent.type} assistant for SupportDesk. Be helpful, professional, and concise.`,
        messages: history,
      }),
    });
    const data = await apiRes.json();
    const reply = data.content?.[0]?.text || 'I apologize, I could not generate a response.';
    res.json({ reply: reply.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/reports-insight
router.post('/reports-insight', auth, async (req, res) => {
  try {
    const { period, metrics } = req.body;
    const insight = await callClaude(
      'You are a data analyst for a customer support platform. Provide 3 actionable insights based on the metrics. Be specific and concise.',
      `Period: ${period || 'last 7 days'}\nMetrics: ${JSON.stringify(metrics || {})}`
    );
    res.json({ insight: insight.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
