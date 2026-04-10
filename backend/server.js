require('dotenv').config();

// ── Prevent unhandled rejections from crashing the server ──
process.on('unhandledRejection', (err) => {
  console.error('⚠️  Unhandled rejection (server kept alive):', err?.message || err);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught exception (server kept alive):', err?.message || err);
});

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// ── Init DB (creates schema + seeds) ──
const db = require('./db');
(async () => {
  try {
    await db.init();
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
})();

// ── Email workers loaded lazily after server starts (see server.listen callback) ──

const app = express();
const server = http.createServer(app);

// ── WebSocket ──
const { setupWebSocket } = require('./ws');
setupWebSocket(server);

// ── Middleware ──
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── File uploads ──
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_')),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

app.post('/api/upload', require('./middleware/auth'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname, size: req.file.size });
});

app.use('/uploads', express.static(uploadDir));

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
});

// ── Public bot API (no auth — uses embed_token) ──
const widgetCors = cors({ origin: '*' });

app.get('/api/bot-public/:token', widgetCors, async (req, res) => {
  try {
    const bot = await db.prepare('SELECT * FROM bots WHERE embed_token=?').get(req.params.token);
    if (!bot || !bot.id) return res.status(404).json({ error: 'Bot not found' });
    const p = (v, fb) => { try { return typeof v === 'string' ? JSON.parse(v) : v || fb; } catch { return fb; } };
    res.json({ bot: { ...bot, nodes: p(bot.nodes, []), setup: p(bot.setup, { greeting: 'Hi! How can I help?', fallback: 'Let me connect you to a human agent.' }), knowledge: p(bot.knowledge, []) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Gemini AI - KB-powered answer ──
app.post('/api/bot-public/:token/ask', widgetCors, async (req, res) => {
  try {
    const bot = await db.prepare('SELECT * FROM bots WHERE embed_token=?').get(req.params.token);
    if (!bot || !bot.id) return res.status(404).json({ error: 'Bot not found' });
    const p = (v, fb) => { try { return typeof v === 'string' ? JSON.parse(v) : v || fb; } catch { return fb; } };
    const kb = p(bot.knowledge, []);
    const { question, chat_id } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    // Build KB context from uploaded docs
    let kbContext = '';
    for (const item of kb) {
      kbContext += `\n--- ${item.title || 'Document'} ---\n${item.content || ''}\n`;
      // If it's a file, try to read it
      if (item.url && !item.content?.includes('Uploaded')) {
        try {
          const filePath = path.join(__dirname, item.url);
          if (fs.existsSync(filePath)) {
            const txt = fs.readFileSync(filePath, 'utf8');
            if (txt.length < 50000) kbContext += txt + '\n';
          }
        } catch {}
      }
    }

    const GEMINI_KEY = process.env.GOOGLE_API_KEY;
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    if (!GEMINI_KEY) return res.json({ answer: null, source: 'no_api_key' });

    const sysPrompt = `You are a helpful support bot for "${bot.name || 'this company'}". Answer the user's question ONLY based on the knowledge base documents provided below. If the answer is found in the documents, provide a clear, friendly, and concise answer. If the answer is NOT found in the documents, respond with exactly: __NO_ANSWER__

Knowledge Base:
${kbContext}`;

    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sysPrompt }] },
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
      })
    });
    const geminiData = await geminiRes.json();
    const answer = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || null;

    if (!answer || answer.includes('__NO_ANSWER__')) {
      return res.json({ answer: null, source: 'not_found' });
    }
    res.json({ answer, source: 'gemini' });
  } catch (e) { console.error('Gemini ask error:', e); res.status(500).json({ error: e.message }); }
});
app.options('/api/bot-public/:token/ask', widgetCors, (req, res) => res.sendStatus(204));

// ── Bot chat session management ──
app.post('/api/bot-public/:token/chat-session', widgetCors, async (req, res) => {
  try {
    const bot = await db.prepare('SELECT * FROM bots WHERE embed_token=?').get(req.params.token);
    if (!bot || !bot.id) return res.status(404).json({ error: 'Bot not found' });
    const { uid } = require('./utils/helpers');
    const { visitor_name, visitor_email, contact_id } = req.body;
    const id = 'bc' + uid();
    await db.prepare('INSERT INTO bot_chats (id,bot_id,bot_name,contact_id,visitor_name,visitor_email,messages,agent_id) VALUES (?,?,?,?,?,?,?,?)').run(
      id, bot.id, bot.name, contact_id || null, visitor_name || 'Visitor', visitor_email || null, '[]', bot.agent_id
    );
    res.json({ chat_id: id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/bot-public/:token/chat-session/:chatId', widgetCors, async (req, res) => {
  try {
    const { messages, status } = req.body;
    const updates = [];
    const params = [];
    if (messages !== undefined) { updates.push('messages=?'); params.push(JSON.stringify(messages)); }
    if (status) { updates.push('status=?'); params.push(status); }
    if (updates.length === 0) return res.json({ success: true });
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    updates.push('updated_at=?'); params.push(now);
    params.push(req.params.chatId);
    await db.prepare('UPDATE bot_chats SET ' + updates.join(',') + ' WHERE id=?').run(...params);

    // Sync new visitor messages to linked inbox conversation
    if (messages) {
      try {
        const chat = await db.prepare('SELECT conversation_id, visitor_name FROM bot_chats WHERE id=?').get(req.params.chatId);
        if (chat && chat.conversation_id) {
          const newMsgs = messages.filter(m => m.f === 'user');
          // Get count of existing customer messages in inbox
          const existing = await db.prepare('SELECT COUNT(*) as c FROM messages WHERE conversation_id=? AND role=?').get(chat.conversation_id, 'customer');
          const existingCount = existing ? existing.c : 0;
          // Only add messages that are new (beyond what we already have)
          const toAdd = newMsgs.slice(existingCount);
          const { uid } = require('./utils/helpers');
          const { broadcastToAll } = require('./ws');
          for (const m of toAdd) {
            const msgId = uid();
            const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
            await db.prepare('INSERT INTO messages (id,conversation_id,role,text,is_read,created_at) VALUES (?,?,?,?,?,?)').run(
              msgId, chat.conversation_id, 'customer', m.t, 0, createdAt
            );
            // Broadcast to dashboard so inbox updates in real-time
            broadcastToAll({
              type: 'new_message',
              conversationId: chat.conversation_id,
              message: {
                id: msgId,
                conversation_id: chat.conversation_id,
                role: 'customer',
                text: m.t,
                is_read: 0,
                created_at: createdAt,
                agent_id: null,
              }
            });
          }
          if (toAdd.length > 0) {
            await db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(now, chat.conversation_id);
          }
        }
      } catch {}
    }

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.options('/api/bot-public/:token/chat-session', widgetCors, (req, res) => res.sendStatus(204));
app.options('/api/bot-public/:token/chat-session/:chatId', widgetCors, (req, res) => res.sendStatus(204));

// ── Bot chat history (authenticated) ──
app.get('/api/settings/bot-chats', require('./middleware/auth'), async (req, res) => {
  try {
    const { bot_id } = req.query;
    let where = 'agent_id=?';
    const params = [req.agent.id];
    if (bot_id) { where += ' AND bot_id=?'; params.push(bot_id); }
    const chats = await db.prepare('SELECT * FROM bot_chats WHERE ' + where + ' ORDER BY updated_at DESC LIMIT 100').all(...params);
    for (const c of chats) { try { c.messages = JSON.parse(c.messages || '[]'); } catch { c.messages = []; } }
    res.json({ chats });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Admin reply to a bot chat (authenticated) ──
app.post('/api/settings/bot-chats/:chatId/reply', require('./middleware/auth'), async (req, res) => {
  try {
    const chat = await db.prepare('SELECT * FROM bot_chats WHERE id=?').get(req.params.chatId);
    if (!chat || !chat.id) return res.status(404).json({ error: 'Chat not found' });
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const msgs = (() => { try { return JSON.parse(chat.messages || '[]'); } catch { return []; } })();
    msgs.push({ f: 'agent', t: message, agent_name: req.agent.name, ts: Date.now() });
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.prepare('UPDATE bot_chats SET messages=?, status=?, updated_at=? WHERE id=?').run(
      JSON.stringify(msgs), 'agent_connected', now, chat.id
    );
    // Also sync to inbox conversation if linked
    if (chat.conversation_id) {
      const { uid } = require('./utils/helpers');
      await db.prepare('INSERT INTO messages (id,conversation_id,role,text,agent_id) VALUES (?,?,?,?,?)').run(
        uid(), chat.conversation_id, 'agent', message, req.agent.id
      );
      await db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(now, chat.conversation_id);
    }
    res.json({ success: true, messages: msgs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Public: visitor polls for new messages (agent replies) ──
app.get('/api/bot-public/:token/chat-session/:chatId/poll', widgetCors, async (req, res) => {
  try {
    const chat = await db.prepare('SELECT messages, status FROM bot_chats WHERE id=?').get(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Not found' });
    const msgs = (() => { try { return JSON.parse(chat.messages || '[]'); } catch { return []; } })();
    res.json({ messages: msgs, status: chat.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Get single bot chat (authenticated) ──
app.get('/api/settings/bot-chats/:chatId', require('./middleware/auth'), async (req, res) => {
  try {
    const chat = await db.prepare('SELECT * FROM bot_chats WHERE id=?').get(req.params.chatId);
    if (!chat || !chat.id) return res.status(404).json({ error: 'Not found' });
    try { chat.messages = JSON.parse(chat.messages || '[]'); } catch { chat.messages = []; }
    res.json({ chat });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Bot handoff → create real inbox conversation ──
app.post('/api/bot-public/:token/handoff', widgetCors, async (req, res) => {
  try {
    const bot = await db.prepare('SELECT * FROM bots WHERE embed_token=?').get(req.params.token);
    if (!bot || !bot.id) return res.status(404).json({ error: 'Bot not found' });
    const { chat_id } = req.body;
    if (!chat_id) return res.status(400).json({ error: 'chat_id required' });
    const chat = await db.prepare('SELECT * FROM bot_chats WHERE id=?').get(chat_id);
    if (!chat || !chat.id) return res.status(404).json({ error: 'Chat not found' });

    // Idempotency: if already handed off, return existing conversation
    if (chat.conversation_id) {
      return res.json({ conversation_id: chat.conversation_id, success: true });
    }

    const { uid } = require('./utils/helpers');
    const botMsgs = (() => { try { return JSON.parse(chat.messages || '[]'); } catch { return []; } })();

    // Create or find contact
    let contactId = chat.contact_id;
    if (!contactId && chat.visitor_email) {
      const existing = await db.prepare('SELECT id FROM contacts WHERE email=?').get(chat.visitor_email);
      if (existing && existing.id) contactId = existing.id;
    }
    if (!contactId) {
      contactId = 'ct' + uid();
      await db.prepare('INSERT INTO contacts (id,name,email,phone,color,tags,agent_id) VALUES (?,?,?,?,?,?,?)').run(
        contactId, chat.visitor_name || 'Visitor', chat.visitor_email || null, null, '#4c82fb', '["bot-visitor"]', bot.agent_id
      );
    }

    // Create conversation
    const convId = uid();
    const subject = 'Bot handoff: ' + (chat.visitor_name || 'Visitor') + ' from ' + (bot.name || 'Bot');
    await db.prepare('INSERT INTO conversations (id,subject,status,priority,contact_id,labels,color,agent_id) VALUES (?,?,?,?,?,?,?,?)').run(
      convId, subject, 'open', 'high', contactId, '["bot-handoff"]', '#ef4444', bot.agent_id
    );

    // Link bot_chat → conversation immediately (before message migration so link is never lost)
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.prepare('UPDATE bot_chats SET status=?, conversation_id=?, updated_at=? WHERE id=?').run(
      'handed_off', convId, now, chat_id
    );

    // Migrate bot messages → real messages (wrapped so failures don't break the link)
    try {
      for (const m of botMsgs) {
        const msgId = uid();
        let role = 'customer';
        if (m.f === 'bot' || m.f === 'ai' || m.f === 'kb') role = 'system';
        if (m.f === 'sys' || m.f === 'ask') role = 'system';
        if (m.f === 'agent') role = 'agent';
        if (m.f === 'user') role = 'customer';
        const text = (m.t != null) ? String(m.t) : '';
        await db.prepare('INSERT INTO messages (id,conversation_id,role,text,agent_id,is_read) VALUES (?,?,?,?,?,?)').run(
          msgId, convId, role, text, m.f === 'agent' ? bot.agent_id : null, 1
        );
      }
      // Add system message about handoff
      const sysId = uid();
      await db.prepare('INSERT INTO messages (id,conversation_id,role,text,is_read) VALUES (?,?,?,?,?)').run(
        sysId, convId, 'system', '🤖 This conversation was handed off from bot "' + (bot.name || 'Bot') + '". The visitor requested to speak with a live agent.', 1
      );
    } catch (migErr) { console.error('Handoff message migration error (non-fatal):', migErr); }

    // Broadcast to agents via WebSocket
    try {
      const { broadcastToAll } = require('./ws');
      broadcastToAll({
        type: 'conversation_update',
        conversationId: convId,
        updates: { status: 'open', priority: 'high', bot_handoff: true, visitor_name: chat.visitor_name }
      });
      broadcastToAll({
        type: 'notification',
        payload: { title: '🤖 Bot Handoff', body: (chat.visitor_name || 'Visitor') + ' needs a live agent', conversationId: convId }
      });
    } catch {}

    res.json({ conversation_id: convId, success: true });
  } catch (e) { console.error('Handoff error:', e); res.status(500).json({ error: e.message }); }
});
app.options('/api/bot-public/:token/handoff', widgetCors, (req, res) => res.sendStatus(204));

// ── Pre-chat form submission (public, creates/updates contact) ──
app.post('/api/bot-public/:token/pre-chat', widgetCors, async (req, res) => {
  try {
    const bot = await db.prepare('SELECT * FROM bots WHERE embed_token=?').get(req.params.token);
    if (!bot || !bot.id) return res.status(404).json({ error: 'Bot not found' });
    const { fields = {}, ip, geo } = req.body;
    const name = fields.name || 'Visitor';
    const email = fields.email || null;
    const phone = fields.phone || null;
    const company = fields.company || null;
    const location = geo ? `${geo.city||''}, ${geo.region||''}, ${geo.country||''}`.replace(/^[, ]+|[, ]+$/g, '') : (fields.location || null);
    // Check for existing contact by email
    let contact = null;
    if (email) contact = await db.prepare('SELECT * FROM contacts WHERE email=?').get(email);
    const { uid } = require('./utils/helpers');
    // Build custom_fields from non-mapped form fields
    const MAPPED = ['name','email','phone','company','location','notes'];
    const custom = {};
    for (const [k,v] of Object.entries(fields)) { if (!MAPPED.includes(k) && v) custom[k] = v; }
    if (ip) custom.ip_address = ip;
    if (geo) custom.geo = geo;
    custom.source = 'bot:' + (bot.name || bot.id);
    custom.bot_token = req.params.token;
    if (contact && contact.id) {
      // Update existing
      const now = new Date().toISOString().slice(0,19).replace('T',' ');
      const oldCf = (() => { try { return JSON.parse(contact.custom_fields||'{}'); } catch { return {}; } })();
      const merged = { ...oldCf, ...custom };
      await db.prepare('UPDATE contacts SET name=?,phone=?,company=?,location=?,custom_fields=?,updated_at=? WHERE id=?').run(
        name, phone || contact.phone, company || contact.company, location || contact.location, JSON.stringify(merged), now, contact.id
      );
      contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(contact.id);
    } else {
      // Create new
      const id = 'ct' + uid();
      const color = '#4c82fb';
      const tags = JSON.stringify(['bot-visitor']);
      await db.prepare('INSERT INTO contacts (id,name,email,phone,company,color,tags,location,custom_fields,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
        id, name, email, phone, company, color, tags, location, JSON.stringify(custom), bot.agent_id
      );
      contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(id);
    }
    res.json({ contact_id: contact?.id, success: true });
  } catch (e) { console.error('Pre-chat form error:', e); res.status(500).json({ error: e.message }); }
});
app.options('/api/bot-public/:token/pre-chat', widgetCors, (req, res) => res.sendStatus(204));

// ── Widget script ──
app.get('/widget/bot.js', widgetCors, (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';
  res.send(`(function(){
  'use strict';
  var scripts=document.querySelectorAll('script[data-bot-id]');
  var el=scripts[scripts.length-1];
  if(!el)return;
  var TOKEN=el.getAttribute('data-bot-id');
  if(!TOKEN)return;
  var ORIGIN='${BACKEND}';
  var botCfg=null,open=false,step=0,msgs=[],lastBtn='',wChatId=null,wAgentMode=false;
  fetch(ORIGIN+'/api/bot-public/'+TOKEN).then(function(r){return r.json();}).then(function(d){
    if(d.bot)botCfg=d.bot;
  }).catch(function(){}).finally(function(){injectStyle();makeBtn();});
  function injectStyle(){
    var s=document.createElement('style');
    s.textContent='#_sd_btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#4c82fb,#7c3aed);border:none;cursor:pointer;z-index:999999;box-shadow:0 4px 20px #4c82fb66;display:flex;align-items:center;justify-content:center;font-size:22px;transition:transform .2s,box-shadow .2s}#_sd_btn:hover{transform:scale(1.1)}#_sd_panel{position:fixed;bottom:90px;right:24px;width:360px;height:520px;max-height:calc(100vh - 110px);background:#fff;border:1px solid #e5e5e5;border-radius:16px;box-shadow:0 16px 60px rgba(0,0,0,.2);display:flex;flex-direction:column;z-index:999998;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;animation:_sdUp .25s ease}@keyframes _sdUp{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:none}}#_sd_head{background:linear-gradient(135deg,#4c82fb,#7c3aed);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}#_sd_msgs{flex:1;overflow-y:auto;padding:14px;background:#f9f9fb}#_sd_inp_area{padding:10px 12px;border-top:1px solid #eee;display:flex;gap:7px;background:#fff;flex-shrink:0}#_sd_inp{flex:1;border:1px solid #ddd;border-radius:8px;padding:8px 11px;font-size:13px;outline:none;font-family:inherit;color:#111}#_sd_inp:focus{border-color:#4c82fb}#_sd_send{width:36px;height:36px;border-radius:8px;background:#4c82fb;border:none;color:#fff;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0}._sd_msg{margin-bottom:10px}._sd_bot{display:flex;justify-content:flex-start}._sd_user{display:flex;justify-content:flex-end}._sd_sys{text-align:center;font-size:11px;color:#999;padding:3px 0}._sd_bub_b{background:#fff;color:#111;border:1px solid #e5e5e5;padding:9px 13px;border-radius:14px 14px 14px 3px;font-size:13px;line-height:1.5;max-width:80%;box-shadow:0 1px 4px rgba(0,0,0,.07)}._sd_bub_u{background:#4c82fb;color:#fff;padding:9px 13px;border-radius:14px 14px 3px 14px;font-size:13px;line-height:1.5;max-width:80%}._sd_ai_lbl{font-size:9px;color:#7c3aed;font-weight:700;letter-spacing:.5px;margin-bottom:3px}._sd_btns{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}._sd_chip{padding:5px 11px;border-radius:20px;font-size:12px;border:1.5px solid #4c82fb44;background:transparent;color:#4c82fb;cursor:pointer;font-family:inherit}._sd_chip:hover{background:#4c82fb11}._sd_chip_agent{border-color:#ef444466;color:#ef4444}._sd_chip_agent:hover{background:#ef444411}._sd_kb_lbl{font-size:9px;color:#059669;font-weight:700;letter-spacing:.5px;margin-bottom:3px}#_sd_pcf{position:absolute;inset:0;background:#fff;z-index:10;display:flex;flex-direction:column;border-radius:16px;overflow:hidden}._sd_pcf_head{background:linear-gradient(135deg,#4c82fb,#7c3aed);color:#fff;padding:16px;text-align:center}._sd_pcf_head h3{margin:0 0 3px;font-size:14px;font-weight:700}._sd_pcf_head p{margin:0;font-size:11px;opacity:.85}._sd_pcf_body{flex:1;overflow-y:auto;padding:16px}._sd_pcf_fld{margin-bottom:12px}._sd_pcf_lbl{display:block;font-size:11px;font-weight:600;color:#333;margin-bottom:4px}._sd_pcf_lbl .req{color:#ef4444}._sd_pcf_inp{width:100%;border:1px solid #ddd;border-radius:7px;padding:8px 10px;font-size:12px;outline:none;font-family:inherit;color:#111;box-sizing:border-box}._sd_pcf_inp:focus{border-color:#4c82fb}._sd_pcf_btn{width:100%;padding:10px;border-radius:8px;background:linear-gradient(135deg,#4c82fb,#7c3aed);color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:4px}._sd_pcf_btn:disabled{opacity:.5;cursor:default}';
    document.head.appendChild(s);
  }
  function makeBtn(){
    var b=document.createElement('button');b.id='_sd_btn';b.innerHTML='💬';b.title='Chat with us';
    b.onclick=togglePanel;document.body.appendChild(b);
  }
  function togglePanel(){
    open=!open;
    var b=document.getElementById('_sd_btn');if(b)b.innerHTML=open?'✕':'💬';
    if(open)openPanel();else{var p=document.getElementById('_sd_panel');if(p)p.remove();}
  }
  function getGeo(){return fetch('https://ipapi.co/json/').then(function(r){return r.json();}).catch(function(){return null;});}
  function showWidgetForm(panel){
    var s=botCfg.setup||{};
    var fields=s.pre_chat_fields||[{id:'pf1',name:'name',label:'Full Name',type:'text',required:true,map_to:'name'},{id:'pf2',name:'email',label:'Email',type:'email',required:true,map_to:'email'},{id:'pf3',name:'phone',label:'Phone',type:'tel',required:false,map_to:'phone'}];
    var overlay=document.createElement('div');overlay.id='_sd_pcf';
    var html='<div class="_sd_pcf_head"><h3>'+esc(s.pre_chat_title||'Before we start…')+'</h3><p>'+esc(s.pre_chat_desc||'Please share some details so we can help you better.')+'</p></div>';
    html+='<div class="_sd_pcf_body"><form id="_sd_pcf_form">';
    fields.forEach(function(f){
      html+='<div class="_sd_pcf_fld"><label class="_sd_pcf_lbl">'+esc(f.label)+(f.required?'<span class="req"> *</span>':'')+'</label>';
      if(f.type==='textarea'){html+='<textarea class="_sd_pcf_inp" name="'+esc(f.map_to||f.name||f.id)+'" '+(f.required?'required':'')+' placeholder="'+esc(f.label)+'" style="resize:vertical;min-height:50px"></textarea>';}
      else{html+='<input class="_sd_pcf_inp" type="'+esc(f.type||'text')+'" name="'+esc(f.map_to||f.name||f.id)+'" '+(f.required?'required':'')+' placeholder="'+esc(f.label)+'"/>';}
      html+='</div>';
    });
    html+='<button type="submit" class="_sd_pcf_btn">Start Chat →</button></form></div>';
    overlay.innerHTML=html;
    panel.style.position='relative';
    panel.appendChild(overlay);
    document.getElementById('_sd_pcf_form').onsubmit=function(e){
      e.preventDefault();
      var btn=overlay.querySelector('._sd_pcf_btn');btn.disabled=true;btn.textContent='Starting…';
      var data={};
      fields.forEach(function(f){var el=overlay.querySelector('[name="'+(f.map_to||f.name||f.id)+'"]');if(el)data[f.map_to||f.name||f.id]=el.value.trim();});
      var doGeo=(s.pre_chat_geo!==false);
      var geoP=doGeo?getGeo():Promise.resolve(null);
      geoP.then(function(geo){
        var body={fields:data};
        if(geo){body.ip=geo.ip||'';body.geo={city:geo.city,region:geo.region,country:geo.country_name,lat:geo.latitude,lon:geo.longitude,tz:geo.timezone};}
        return fetch(ORIGIN+'/api/bot-public/'+TOKEN+'/pre-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      }).then(function(r){return r.json();}).then(function(){
        overlay.remove();startChat();
      }).catch(function(){overlay.remove();startChat();});
    };
  }
  function startChat(){
    step=0;msgs=[];lastBtn='';flowDone=false;
    fetch(ORIGIN+'/api/bot-public/'+TOKEN+'/chat-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}).then(function(r){return r.json();}).then(function(sr){if(sr.chat_id)wChatId=sr.chat_id;}).catch(function(){});
    document.getElementById('_sd_send').onclick=function(){doSend();};
    document.getElementById('_sd_inp').onkeydown=function(e){if(e.key==='Enter')doSend();};
    if(botCfg)setTimeout(function(){flow(0,'','');},300);
    else addMsg({f:'sys',t:'Bot unavailable'});
  }
  function openPanel(){
    var name=(botCfg&&botCfg.name)||'Support Bot';
    var p=document.createElement('div');p.id='_sd_panel';
    p.innerHTML='<div id="_sd_head"><div style="width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🤖</div><div style="flex:1"><div style="font-size:13px;font-weight:700">'+esc(name)+'</div><div style="font-size:10px;opacity:.8">● Online</div></div><button onclick="document.getElementById(\'_sd_btn\').click()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;padding:0;opacity:.7">✕</button></div><div id="_sd_msgs"></div><div id="_sd_inp_area"><input id="_sd_inp" placeholder="Type a message…"/><button id="_sd_send">→</button></div>';
    document.body.appendChild(p);
    if(botCfg&&botCfg.setup&&botCfg.setup.pre_chat_enabled){
      showWidgetForm(p);
    } else {
      startChat();
    }
  }
  function addMsg(m){
    msgs.push(m);
    var c=document.getElementById('_sd_msgs');if(!c)return;
    var d=document.createElement('div');d.className='_sd_msg';
    if(m.f==='sys'){d.className='_sd_msg _sd_sys';d.textContent=m.t;}
    else if(m.f==='user'){d.className='_sd_msg _sd_user';d.innerHTML='<div class="_sd_bub_u">'+esc(m.t)+'</div>';}
    else{
      var inner='';
      if(m.f==='ai')inner+='<div class="_sd_ai_lbl">✦ AI Response</div>';
      if(m.f==='kb')inner+='<div class="_sd_kb_lbl">📚 Knowledge Base</div>';
      if(m.f==='ask')inner+='<div class="_sd_ai_lbl">📝 Collecting input</div>';
      inner+=esc(m.t).replace(/\\n/g,'<br>');
      if(m.b&&m.b.length){inner+='<div class="_sd_btns">';m.b.forEach(function(x){var isAgent=(x==='Connect to Live Agent');inner+='<button class="_sd_chip'+(isAgent?' _sd_chip_agent':'')+'" data-v="'+(isAgent?'__agent':esc(x))+'" onclick="window.__sdChip(this)">'+esc(x)+'</button>';});inner+='</div>';}
      d.className='_sd_msg _sd_bot';d.innerHTML='<div class="_sd_bub_b">'+inner+'</div>';
    }
    c.appendChild(d);c.scrollTop=c.scrollHeight;
  }
  window.__sdChip=function(el){
    var v=el.getAttribute('data-v');
    if(v==='__agent'){connectAgent();return;}
    if(v==='__retry'){addMsg({f:'bot',t:'Sure! What else would you like to know?'});return;}
    if(v==='Yes, thanks!'){addMsg({f:'user',t:'Yes, thanks!'});addMsg({f:'bot',t:'Great! Let me know if you need anything else.'});return;}
    if(v==='No, connect me to an agent'){connectAgent();return;}
    doSend(v,true);
  };
  function searchKB(query){
    var kb=(botCfg&&botCfg.knowledge)||[];if(!kb.length)return null;
    var q=query.toLowerCase();
    var words=q.split(/\\s+/).filter(function(w){return w.length>2;});
    if(!words.length)return null;
    var best=null,bestScore=0;
    kb.forEach(function(k){
      var txt=((k.title||'')+' '+(k.content||'')).toLowerCase();
      var score=0;words.forEach(function(w){if(txt.includes(w))score++;});
      if(score>bestScore){bestScore=score;best=k;}
    });
    return bestScore>0?best:null;
  }
  var flowDone=false;
  function showAgentOption(){
    addMsg({f:'bot',t:"I don\\'t have specific information on that. Would you like to connect with a live agent?",b:['Connect to Live Agent','Ask Something Else']});
  }
  function connectAgent(){
    wAgentMode=true;
    addMsg({f:'user',t:'Connect to Live Agent'});
    addMsg({f:'sys',t:'Connecting you to a live agent…'});
    addMsg({f:'bot',t:'A support agent will join shortly. Please wait.'});
    wSaveSession();
    // Trigger handoff → create inbox conversation (PATCH first, then handoff sequentially)
    if(wChatId){
      var _hChatId=wChatId;
      fetch(ORIGIN+'/api/bot-public/'+TOKEN+'/chat-session/'+_hChatId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'waiting_agent',messages:msgs.map(function(m){return{f:m.f,t:m.t};})})})
        .catch(function(){})
        .then(function(){
          fetch(ORIGIN+'/api/bot-public/'+TOKEN+'/handoff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:_hChatId})}).catch(function(){});
        });
    }
    // Poll for agent replies
    var wLastCount=msgs.length;
    setInterval(function(){
      if(!wChatId)return;
      fetch(ORIGIN+'/api/bot-public/'+TOKEN+'/chat-session/'+wChatId+'/poll')
        .then(function(r){return r.json();})
        .then(function(d){
          if(!d.messages)return;
          for(var i=wLastCount;i<d.messages.length;i++){
            var m=d.messages[i];
            if(m.f==='agent'){
              addMsg({f:'bot',t:'👤 '+(m.agent_name||'Agent')+': '+m.t});
              var inp3=document.getElementById('_sd_inp');var snd3=document.getElementById('_sd_send');
              if(inp3)inp3.disabled=false;if(snd3)snd3.disabled=false;
            }
          }
          wLastCount=d.messages.length;
        }).catch(function(){});
    },3000);
    // Keep input enabled for visitor to reply
    var inp2=document.getElementById('_sd_inp');var snd2=document.getElementById('_sd_send');
    if(inp2)inp2.disabled=false;if(snd2)snd2.disabled=false;
  }
  function wSaveSession(){
    if(!wChatId)return;
    var saveMsgs=msgs.map(function(m){return{f:m.f,t:m.t};});
    fetch(ORIGIN+'/api/bot-public/'+TOKEN+'/chat-session/'+wChatId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:saveMsgs})}).catch(function(){});
  }
  function doSend(txt,isChip){
    var inp=document.getElementById('_sd_inp');
    var msg=txt||(inp?inp.value.trim():'');if(!msg)return;
    if(inp&&!txt)inp.value='';
    // Agent mode — visitor replies go directly to session
    if(wAgentMode&&!isChip){addMsg({f:'user',t:msg});wSaveSession();return;}
    var cur=botCfg&&botCfg.nodes&&botCfg.nodes[step];
    var onBtns=cur&&cur.type==='buttons';
    if(!isChip&&(onBtns||flowDone)){
      addMsg({f:'user',t:msg});
      fetch(ORIGIN+'/api/bot-public/'+TOKEN+'/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:msg,chat_id:wChatId})})
        .then(function(r){return r.json();})
        .then(function(d){
          if(d.answer){
            addMsg({f:'ai',t:d.answer});
            addMsg({f:'bot',t:'Does that answer your question?',b:['Yes, thanks!','No, connect me to an agent']});
          } else {
            var hit=searchKB(msg);
            if(hit){
              var answer=(hit.title?hit.title+'\\n\\n':'')+hit.content;
              addMsg({f:'kb',t:answer});
              addMsg({f:'bot',t:'Does that answer your question?',b:['Yes, thanks!','No, connect me to an agent']});
            } else {
              showAgentOption();
            }
          }
          wSaveSession();
        }).catch(function(){showAgentOption();wSaveSession();});
      return;
    }
    if(onBtns)lastBtn=msg;
    addMsg({f:'user',t:msg});
    var ni=step+1;setTimeout(function(){flow(ni,msg,lastBtn);wSaveSession();},400);
  }
  function evalCond(cond,lastIn,lBtn){
    if(!cond)return true;
    var c=cond.toLowerCase().trim();
    var bm=c.match(/button\\s*==\\s*(.+)/);if(bm)return lBtn.toLowerCase().trim()===bm[1].toLowerCase().trim();
    var tm=c.match(/(?:text|input)\\s+(?:contains|==)\\s*(.+)/);if(tm)return lastIn.toLowerCase().includes(tm[1].toLowerCase().trim());
    return true;
  }
  function flow(from,lastIn,lBtn){
    var nodes=(botCfg&&botCfg.nodes)||[];lastIn=lastIn||'';lBtn=lBtn||lastBtn;
    for(var i=from;i<nodes.length;i++){
      var n=nodes[i];
      if(n.type==='trigger'||n.type==='delay')continue;
      if(n.type==='condition'){
        var met=evalCond((n.config&&n.config.condition)||'',lastIn,lBtn);
        addMsg({f:'sys',t:'🔀 '+(n.label||'')+' → '+(met?(n.config&&n.config.yes_label||'Yes'):(n.config&&n.config.no_label||'No'))});
        step=i;
        if(!met){var skip=i+2;setTimeout(function(){flow(skip,lastIn,lBtn);},300);return;}
        continue;
      }
      if(n.type==='message'){addMsg({f:'bot',t:(n.config&&n.config.text)||n.label});step=i;continue;}
      if(n.type==='ai'){addMsg({f:'ai',t:(n.config&&n.config.prompt)||n.label});step=i;continue;}
      if(n.type==='assign'){addMsg({f:'bot',t:'👤 '+n.label+((n.config&&n.config.team)?' → '+n.config.team:'')});step=i;continue;}
      if(n.type==='tag'){addMsg({f:'sys',t:'🏷 Tag: '+((n.config&&n.config.tag)||n.label)});step=i;continue;}
      if(n.type==='close'){addMsg({f:'bot',t:(n.config&&n.config.message)||n.label});addMsg({f:'sys',t:'✅ Chat closed'});step=i;var inp2=document.getElementById('_sd_inp');var snd2=document.getElementById('_sd_send');if(inp2)inp2.disabled=true;if(snd2)snd2.disabled=true;return;}
      if(n.type==='buttons'){addMsg({f:'bot',t:(n.config&&n.config.text)||n.label,b:(n.config&&n.config.buttons)||[]});step=i;return;}
      if(n.type==='collect'){addMsg({f:'ask',t:'Please enter your '+((n.config&&n.config.field)||'response')});step=i;return;}
      addMsg({f:'bot',t:n.label});step=i;
    }
    flowDone=true;
    addMsg({f:'sys',t:'Anything else I can help with?'});
    var inp3=document.getElementById('_sd_inp');var snd3=document.getElementById('_sd_send');
    if(inp3)inp3.disabled=false;if(snd3)snd3.disabled=false;
  }
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
})();`);
});

// ── Standalone form page ──
app.get('/form/:id', async (req, res) => {
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:4002';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Form</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:16px}
#form-box{width:480px;background:#fff;border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.35);padding:28px 32px}
.field{margin-bottom:16px}
.field label{display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:5px}
.field label .req{color:#e11;margin-left:2px}
.field input,.field textarea,.field select{width:100%;padding:10px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:13px;color:#333;background:#f9f9fb;outline:none;transition:border .2s;font-family:inherit}
.field input:focus,.field textarea:focus,.field select:focus{border-color:var(--accent,#4c82fb)}
.field textarea{resize:vertical;min-height:80px}
.radio-group{display:flex;flex-direction:column;gap:8px}
.radio-group label{display:flex;align-items:center;gap:8px;font-size:13px;color:#333;cursor:pointer;font-weight:400}
.heading{font-size:20px;font-weight:800;color:#111;margin-bottom:4px}
.subtitle{font-size:12px;color:#777}
.file-drop{padding:20px;border:2px dashed #ddd;border-radius:10px;text-align:center;font-size:12px;color:#999;cursor:pointer}
.submit-btn{width:100%;padding:13px;border-radius:10px;color:#fff;font-size:14px;font-weight:700;border:none;cursor:pointer;margin-top:8px;transition:opacity .2s}
.submit-btn:hover{opacity:.9}
.submit-btn:disabled{opacity:.5;cursor:wait}
.success{text-align:center;padding:40px 20px}
.success h2{font-size:20px;margin-bottom:8px;color:#111}
.success p{font-size:13px;color:#666}
.error{color:#e11;font-size:11px;margin-top:4px}
</style></head><body>
<div id="form-box"><div style="text-align:center;color:#999;padding:40px">Loading form…</div></div>
<script>
const FORM_ID="${req.params.id}";
const API="${BACKEND}/api/forms/public";
async function loadForm(){
  try{
    const r=await fetch(API+"/"+FORM_ID);
    if(!r.ok)throw new Error("Form not found");
    const d=await r.json();renderForm(d);
  }catch(e){document.getElementById("form-box").innerHTML='<div style="text-align:center;padding:40px;color:#e11">'+e.message+'</div>';}
}
function renderForm({name,fields,settings}){
  const accent=settings.accentColor||"#4c82fb";
  document.documentElement.style.setProperty("--accent",accent);
  let html="";
  fields.forEach(f=>{
    if(f.type==="heading"){html+='<div class="field"><div class="heading">'+esc(f.label)+'</div>'+(f.placeholder?'<div class="subtitle">'+esc(f.placeholder)+'</div>':'')+'</div>';return;}
    if(f.type==="paragraph"){html+='<div class="field" style="font-size:13px;color:#555;line-height:1.5">'+esc(f.label)+'</div>';return;}
    const req=f.required?'<span class="req">*</span>':"";
    html+='<div class="field"><label>'+esc(f.label)+req+'</label>';
    if(f.type==="textarea")html+='<textarea name="'+f.id+'" placeholder="'+esc(f.placeholder||"")+'"'+(f.required?" required":"")+'></textarea>';
    else if(f.type==="select"){html+='<select name="'+f.id+'"'+(f.required?" required":"")+'><option value="">'+esc(f.placeholder||"Select…")+'</option>';(f.options||[]).forEach(o=>{html+='<option value="'+esc(o)+'">'+esc(o)+'</option>';});html+='</select>';}
    else if(f.type==="radio"){html+='<div class="radio-group">';(f.options||[]).forEach(o=>{html+='<label><input type="radio" name="'+f.id+'" value="'+esc(o)+'"'+(f.required?" required":"")+'>'+esc(o)+'</label>';});html+='</div>';}
    else if(f.type==="checkbox")html+='<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" name="'+f.id+'"'+(f.required?" required":"")+'>'+esc(f.label)+'</label>';
    else if(f.type==="file")html+='<div class="file-drop">📎 Click to upload<input type="file" name="'+f.id+'" style="display:none"'+(f.required?" required":"")+'></div>';
    else{const t=f.type==="email"?"email":f.type==="phone"?"tel":f.type==="number"?"number":f.type==="url"?"url":f.type==="date"?"date":"text";html+='<input type="'+t+'" name="'+f.id+'" placeholder="'+esc(f.placeholder||"")+'"'+(f.required?" required":"")+'>';}
    html+='</div>';
  });
  html+='<button type="submit" class="submit-btn" style="background:'+accent+'">'+esc(settings.submitText||"Submit")+'</button>';
  const box=document.getElementById("form-box");
  box.innerHTML='<form id="sd-form">'+html+'</form>';
  box.querySelector(".file-drop")?.addEventListener("click",function(){this.querySelector("input").click();});
  document.getElementById("sd-form").addEventListener("submit",async function(e){
    e.preventDefault();const btn=this.querySelector(".submit-btn");btn.disabled=true;btn.textContent="Sending…";
    const fd=new FormData(this);const data={};for(const[k,v]of fd.entries())data[k]=v;
    try{
      const r=await fetch(API+"/"+FORM_ID+"/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data})});
      const j=await r.json();
      if(!r.ok)throw new Error(j.error||"Failed");
      box.innerHTML='<div class="success"><h2>✓</h2><p>'+esc(j.message||settings.successMsg||"Thank you!")+'</p></div>';
      if(settings.redirectUrl)setTimeout(()=>window.location.href=settings.redirectUrl,2000);
    }catch(err){btn.disabled=false;btn.textContent=settings.submitText||"Submit";let el=this.querySelector(".error");if(!el){el=document.createElement("div");el.className="error";this.appendChild(el);}el.textContent=err.message;}
  });
}
function esc(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML;}
loadForm();
</script></body></html>`);
});

// ── Standalone bot chat page ──
app.get('/chat', widgetCors, (req, res) => {
  const token = req.query.bot || '';
  const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chat</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:16px}
#chat-box{width:420px;height:90vh;max-height:680px;background:#fff;border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden}
#chat-header{background:linear-gradient(135deg,#4c82fb,#7c3aed);color:#fff;padding:16px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0}
#bot-avatar{width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
#bot-title{font-size:15px;font-weight:700}
#bot-sub{font-size:11px;opacity:.8;margin-top:2px}
#chat-msgs{flex:1;overflow-y:auto;padding:16px;background:#f9f9fb;display:flex;flex-direction:column;gap:10px}
.msg-sys{text-align:center;font-size:11px;color:#aaa;padding:2px 0}
.msg-row-bot{display:flex;justify-content:flex-start}
.msg-row-user{display:flex;justify-content:flex-end}
.bub{padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.6;max-width:82%}
.bub-bot{background:#fff;color:#111;border:1px solid #e8e8e8;border-radius:16px 16px 16px 4px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.bub-user{background:#4c82fb;color:#fff;border-radius:16px 16px 4px 16px}
.tag-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;opacity:.8}
.tag-ai{color:#7c3aed}.tag-kb{color:#059669}.tag-ask{color:#d97706}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.chip{padding:7px 15px;border-radius:20px;font-size:13px;border:1.5px solid #4c82fb66;background:transparent;color:#4c82fb;cursor:pointer;font-family:inherit;transition:all .15s;font-weight:500}
.chip:hover{background:#4c82fb;color:#fff}
.chip-agent{border-color:#ef444466;color:#ef4444}.chip-agent:hover{background:#ef4444;color:#fff}
#chat-footer{padding:12px 14px;border-top:1px solid #eee;display:flex;gap:8px;background:#fff;flex-shrink:0}
#chat-input{flex:1;border:1.5px solid #e0e0e0;border-radius:10px;padding:9px 13px;font-size:14px;outline:none;font-family:inherit;color:#111;transition:border-color .15s}
#chat-input:focus{border-color:#4c82fb}
#chat-input:disabled{background:#f5f5f5;color:#aaa;cursor:not-allowed}
#chat-send{width:40px;height:40px;border-radius:10px;background:#4c82fb;border:none;color:#fff;cursor:pointer;font-size:16px;flex-shrink:0}
#chat-send:disabled{background:#ccc;cursor:default}
#pre-chat-overlay{position:absolute;inset:0;background:#fff;z-index:10;display:flex;flex-direction:column;border-radius:20px;overflow:hidden}
#pcf-head{background:linear-gradient(135deg,#4c82fb,#7c3aed);color:#fff;padding:20px;text-align:center}
#pcf-head h3{margin:0 0 4px;font-size:16px;font-weight:700}
#pcf-head p{margin:0;font-size:12px;opacity:.85}
#pcf-body{flex:1;overflow-y:auto;padding:20px}
.pcf-field{margin-bottom:14px}
.pcf-label{display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:5px}
.pcf-label .req{color:#ef4444;margin-left:2px}
.pcf-input{width:100%;border:1.5px solid #e0e0e0;border-radius:8px;padding:9px 12px;font-size:13px;outline:none;font-family:inherit;color:#111;box-sizing:border-box;transition:border-color .15s}
.pcf-input:focus{border-color:#4c82fb}
.pcf-textarea{resize:vertical;min-height:60px}
.pcf-err{color:#ef4444;font-size:11px;margin-top:3px;display:none}
#pcf-submit{width:100%;padding:11px;border-radius:10px;background:linear-gradient(135deg,#4c82fb,#7c3aed);color:#fff;border:none;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:4px;transition:opacity .15s}
#pcf-submit:hover{opacity:.9}
#pcf-submit:disabled{opacity:.5;cursor:default}
.typing{display:flex;gap:4px;padding:10px 14px;background:#fff;border:1px solid #e8e8e8;border-radius:16px 16px 16px 4px;width:52px}
.dot{width:7px;height:7px;border-radius:50%;background:#bbb;animation:bounce .9s infinite}
.dot:nth-child(2){animation-delay:.15s}.dot:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-7px)}}
@media(max-width:480px){body{padding:0;align-items:flex-end}#chat-box{width:100%;height:100vh;border-radius:0;max-height:none}}
</style>
</head>
<body>
<div id="chat-box" style="position:relative">
  <div id="pre-chat-overlay" style="display:none"></div>
  <div id="chat-header">
    <div id="bot-avatar">🤖</div>
    <div>
      <div id="bot-title">Support Bot</div>
      <div id="bot-sub">● Online</div>
    </div>
  </div>
  <div id="chat-msgs"><div class="msg-sys">Connecting…</div></div>
  <div id="chat-footer">
    <input id="chat-input" placeholder="Type a message…" disabled/>
    <button id="chat-send" disabled>→</button>
  </div>
</div>
<script>
(function(){
var BACKEND='${BACKEND}',TOKEN='${token}';
var botCfg=null,step=0,lastBtn='',flowDone=false,chatId=null,allMsgs=[],agentMode=false;
var msgsEl=document.getElementById('chat-msgs');
var inputEl=document.getElementById('chat-input');
var sendEl=document.getElementById('chat-send');

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── Chip click handler (avoids onclick quoting bugs) ──
window._sdChip=function(el){
  var v=el.getAttribute('data-v');
  if(v==='__agent'){connectAgent();return;}
  if(v==='__retry'){addMsg({f:'bot',t:'Sure! What else would you like to know?'});return;}
  doSend(v,true);
};

function chips(items){
  var html='<div class="chips">';
  items.forEach(function(x){
    var isAgent=(x==='Connect to Live Agent');
    html+='<button class="chip'+(isAgent?' chip-agent':'')+'" data-v="'+(isAgent?'__agent':esc(x))+'" onclick="_sdChip(this)">'+esc(x)+'</button>';
  });
  return html+'</div>';
}

function addMsg(m){
  allMsgs.push({f:m.f,t:m.t});
  var row=document.createElement('div');
  if(m.f==='sys'){row.className='msg-sys';row.textContent=m.t;}
  else if(m.f==='user'){row.className='msg-row-user';row.innerHTML='<div class="bub bub-user">'+esc(m.t)+'</div>';}
  else{
    var inner='';
    if(m.f==='ai')inner='<div class="tag-lbl tag-ai">✦ AI Response</div>';
    if(m.f==='kb')inner='<div class="tag-lbl tag-kb">📚 Knowledge Base</div>';
    if(m.f==='ask')inner='<div class="tag-lbl tag-ask">📝 Collecting input</div>';
    inner+=esc(m.t).replace(/\\n/g,'<br>');
    if(m.b&&m.b.length)inner+=chips(m.b);
    row.className='msg-row-bot';row.innerHTML='<div class="bub bub-bot">'+inner+'</div>';
  }
  msgsEl.appendChild(row);msgsEl.scrollTop=msgsEl.scrollHeight;
}

function showTyping(){
  if(document.getElementById('_typing'))return;
  var el=document.createElement('div');el.className='msg-row-bot';el.id='_typing';
  el.innerHTML='<div class="typing"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>';
  msgsEl.appendChild(el);msgsEl.scrollTop=msgsEl.scrollHeight;
}
function hideTyping(){var el=document.getElementById('_typing');if(el)el.remove();}

// ── Knowledge base search ──
function searchKB(query){
  var kb=(botCfg&&botCfg.knowledge)||[];if(!kb.length)return null;
  var q=query.toLowerCase();
  var words=q.split(/\\s+/).filter(function(w){return w.length>2;});
  if(!words.length)return null;
  var best=null,bestScore=0;
  kb.forEach(function(k){
    var txt=((k.title||'')+' '+(k.content||'')).toLowerCase();
    var score=0;
    words.forEach(function(w){if(txt.includes(w))score++;});
    if(score>bestScore){bestScore=score;best=k;}
  });
  return bestScore>0?best:null;
}

function showAgentOption(){
  addMsg({f:'bot',t:"I don\\'t have specific information on that. Would you like to connect with a live agent?",
    b:['Connect to Live Agent','Ask Something Else']});
}

function connectAgent(){
  agentMode=true;
  addMsg({f:'user',t:'Connect to Live Agent'});
  addMsg({f:'sys',t:'Connecting you to a live agent…'});
  addMsg({f:'bot',t:'A support agent will join shortly. Please wait — your conversation history has been saved.'});
  saveSession();
  // Trigger handoff → create inbox conversation (PATCH first, then handoff sequentially)
  if(chatId){
    var _hChatId2=chatId;
    fetch(BACKEND+'/api/bot-public/'+TOKEN+'/chat-session/'+_hChatId2,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'waiting_agent',messages:allMsgs.map(function(m){return{f:m.f,t:m.t};})})})
      .catch(function(){})
      .then(function(){
        fetch(BACKEND+'/api/bot-public/'+TOKEN+'/handoff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:_hChatId2})}).catch(function(){});
      });
  }
  // Start polling for agent messages
  var lastCount=allMsgs.length;
  var agentPoll=setInterval(function(){
    if(!chatId)return;
    fetch(BACKEND+'/api/bot-public/'+TOKEN+'/chat-session/'+chatId+'/poll')
      .then(function(r){return r.json();})
      .then(function(d){
        if(!d.messages)return;
        // Show new messages from agent
        for(var i=lastCount;i<d.messages.length;i++){
          var m=d.messages[i];
          if(m.f==='agent'){
            addMsg({f:'bot',t:'👤 '+(m.agent_name||'Agent')+': '+m.t});
            inputEl.disabled=false;sendEl.disabled=false;
          }
        }
        lastCount=d.messages.length;
      }).catch(function(){});
  },3000);
  // Enable input for visitor to reply to agent
  inputEl.disabled=false;sendEl.disabled=false;
}

function evalCond(cond,lastIn,lBtn){
  if(!cond)return true;
  var c=cond.toLowerCase().trim();
  var bm=c.match(/button\\s*==\\s*(.+)/);if(bm)return lBtn.toLowerCase().trim()===bm[1].toLowerCase().trim();
  var tm=c.match(/(?:text|input)\\s+(?:contains|==)\\s*(.+)/);if(tm)return lastIn.toLowerCase().includes(tm[1].toLowerCase().trim());
  return true;
}

function flow(from,lastIn,lBtn){
  hideTyping();
  var nodes=(botCfg&&botCfg.nodes)||[];lastIn=lastIn||'';lBtn=lBtn||lastBtn;
  for(var i=from;i<nodes.length;i++){
    var n=nodes[i];
    if(n.type==='trigger'||n.type==='delay')continue;
    if(n.type==='condition'){
      var met=evalCond((n.config&&n.config.condition)||'',lastIn,lBtn);
      addMsg({f:'sys',t:'🔀 '+(n.label||'')+' → '+(met?(n.config&&n.config.yes_label||'Yes'):(n.config&&n.config.no_label||'No'))});
      step=i;
      if(!met){var sk=i+2;showTyping();setTimeout(function(){flow(sk,lastIn,lBtn);},600);return;}
      continue;
    }
    if(n.type==='message'){addMsg({f:'bot',t:(n.config&&n.config.text)||n.label});step=i;continue;}
    if(n.type==='ai'){addMsg({f:'ai',t:(n.config&&n.config.prompt)||n.label});step=i;continue;}
    if(n.type==='assign'){addMsg({f:'bot',t:'👤 Routing: '+n.label+((n.config&&n.config.team)?' → '+n.config.team:'')});step=i;continue;}
    if(n.type==='tag'){addMsg({f:'sys',t:'🏷 Tag: '+((n.config&&n.config.tag)||n.label)});step=i;continue;}
    if(n.type==='close'){addMsg({f:'bot',t:(n.config&&n.config.message)||n.label});step=i;flowDone=true;inputEl.disabled=true;sendEl.disabled=true;return;}
    if(n.type==='buttons'){addMsg({f:'bot',t:(n.config&&n.config.text)||n.label,b:(n.config&&n.config.buttons)||[]});step=i;return;}
    if(n.type==='collect'){addMsg({f:'ask',t:'Please enter your '+((n.config&&n.config.field)||'response')});step=i;return;}
    addMsg({f:'bot',t:n.label});step=i;
  }
  // Flow ended — keep input open for KB queries
  flowDone=true;
  addMsg({f:'sys',t:'Anything else I can help with?'});
}

function doSend(txt,isChip){
  var msg=txt||(inputEl?inputEl.value.trim():'');if(!msg)return;
  if(inputEl&&!txt)inputEl.value='';

  // Agent mode — visitor replies go directly to session
  if(agentMode&&!isChip){
    addMsg({f:'user',t:msg});
    saveSession();
    return;
  }

  var cur=botCfg&&botCfg.nodes&&botCfg.nodes[step];
  var onBtns=cur&&cur.type==='buttons';

  // Free-text when on a buttons node OR after flow done → ask Gemini AI
  if(!isChip&&(onBtns||flowDone)){
    addMsg({f:'user',t:msg});
    showTyping();
    fetch(BACKEND+'/api/bot-public/'+TOKEN+'/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:msg,chat_id:chatId})})
      .then(function(r){return r.json();})
      .then(function(d){
        hideTyping();
        if(d.answer){
          addMsg({f:'ai',t:d.answer});
          addMsg({f:'bot',t:'Does that answer your question?',b:['Yes, thanks!','No, connect me to an agent']});
        } else {
          // Fallback to local KB search
          var hit=searchKB(msg);
          if(hit){
            var answer=(hit.title?hit.title+'\\n\\n':'')+hit.content;
            addMsg({f:'kb',t:answer});
            addMsg({f:'bot',t:'Does that answer your question?',b:['Yes, thanks!','No, connect me to an agent']});
          } else {
            showAgentOption();
          }
        }
        saveSession();
      }).catch(function(){
        hideTyping();showAgentOption();saveSession();
      });
    return;
  }

  if(onBtns)lastBtn=msg;
  addMsg({f:'user',t:msg});
  var ni=step+1;showTyping();setTimeout(function(){flow(ni,msg,lastBtn);saveSession();},600);
}

function saveSession(){
  if(!chatId)return;
  var saveMsgs=allMsgs.map(function(m){return{f:m.f,t:m.t};});
  fetch(BACKEND+'/api/bot-public/'+TOKEN+'/chat-session/'+chatId,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:saveMsgs})}).catch(function(){});
}

// Handle "Yes thanks" / "No connect agent" responses
var origChip=window._sdChip;
window._sdChip=function(el){
  var v=el.getAttribute('data-v');
  if(v==='Yes, thanks!'){addMsg({f:'user',t:'Yes, thanks!'});addMsg({f:'bot',t:'Great! Let me know if you need anything else.'});return;}
  if(v==='No, connect me to an agent'){connectAgent();return;}
  origChip(el);
};

sendEl.onclick=function(){doSend();};
inputEl.onkeydown=function(e){if(e.key==='Enter'&&!inputEl.disabled)doSend();};

// ── Pre-chat form ──
function getGeo(){
  return fetch('https://ipapi.co/json/').then(function(r){return r.json();}).catch(function(){return null;});
}
function showPreChatForm(){
  var s=botCfg.setup||{};
  var fields=s.pre_chat_fields||[
    {id:'pf1',name:'name',label:'Full Name',type:'text',required:true,map_to:'name'},
    {id:'pf2',name:'email',label:'Email',type:'email',required:true,map_to:'email'},
    {id:'pf3',name:'phone',label:'Phone',type:'tel',required:false,map_to:'phone'}
  ];
  var overlay=document.getElementById('pre-chat-overlay');
  var html='<div id="pcf-head"><h3>'+esc(s.pre_chat_title||'Before we start…')+'</h3><p>'+esc(s.pre_chat_desc||'Please share some details so we can help you better.')+'</p></div>';
  html+='<div id="pcf-body"><form id="pcf-form">';
  fields.forEach(function(f){
    html+='<div class="pcf-field"><label class="pcf-label">'+esc(f.label)+(f.required?'<span class="req">*</span>':'')+'</label>';
    if(f.type==='textarea'){
      html+='<textarea class="pcf-input pcf-textarea" name="'+esc(f.map_to||f.name||f.id)+'" '+(f.required?'required':'')+' placeholder="'+esc(f.label)+'"></textarea>';
    } else if(f.type==='select'){
      html+='<select class="pcf-input" name="'+esc(f.map_to||f.name||f.id)+'" '+(f.required?'required':'')+'><option value="">Select…</option>';
      (f.options||[]).forEach(function(o){html+='<option value="'+esc(o)+'">'+esc(o)+'</option>';});
      html+='</select>';
    } else {
      html+='<input class="pcf-input" type="'+esc(f.type||'text')+'" name="'+esc(f.map_to||f.name||f.id)+'" '+(f.required?'required':'')+' placeholder="'+esc(f.label)+'"/>';
    }
    html+='<div class="pcf-err" id="err-'+esc(f.id)+'"></div></div>';
  });
  html+='<button type="submit" id="pcf-submit">Start Chat →</button></form></div>';
  overlay.innerHTML=html;
  overlay.style.display='flex';

  document.getElementById('pcf-form').onsubmit=function(e){
    e.preventDefault();
    var btn=document.getElementById('pcf-submit');
    btn.disabled=true;btn.textContent='Starting…';
    var data={};
    fields.forEach(function(f){
      var el=document.querySelector('[name="'+CSS.escape(f.map_to||f.name||f.id)+'"]');
      if(el)data[f.map_to||f.name||f.id]=el.value.trim();
    });
    // Get IP + geo if enabled
    var doGeo=(botCfg.setup&&botCfg.setup.pre_chat_geo!==false);
    var geoP=doGeo?getGeo():Promise.resolve(null);
    geoP.then(function(geo){
      var body={fields:data};
      if(geo){body.ip=geo.ip||'';body.geo={city:geo.city,region:geo.region,country:geo.country_name,lat:geo.latitude,lon:geo.longitude,tz:geo.timezone};}
      return fetch(BACKEND+'/api/bot-public/'+TOKEN+'/pre-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    }).then(function(r){return r.json();}).then(function(pcr){
      // Create chat session with visitor info
      return fetch(BACKEND+'/api/bot-public/'+TOKEN+'/chat-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor_name:data.name||'Visitor',visitor_email:data.email||'',contact_id:pcr.contact_id||''})});
    }).then(function(r){return r.json();}).then(function(sr){
      if(sr.chat_id)chatId=sr.chat_id;
      overlay.style.display='none';
      inputEl.disabled=false;sendEl.disabled=false;
      showTyping();setTimeout(function(){flow(0,'','');},500);
    }).catch(function(){
      overlay.style.display='none';
      inputEl.disabled=false;sendEl.disabled=false;
      showTyping();setTimeout(function(){flow(0,'','');},500);
    });
  };
}

// Load bot
fetch(BACKEND+'/api/bot-public/'+TOKEN)
  .then(function(r){return r.json();})
  .then(function(d){
    msgsEl.innerHTML='';
    if(!d.bot){addMsg({f:'sys',t:'Bot not found or inactive.'});return;}
    botCfg=d.bot;
    document.getElementById('bot-title').textContent=d.bot.name||'Support Bot';
    // Create chat session
    fetch(BACKEND+'/api/bot-public/'+TOKEN+'/chat-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})})
      .then(function(r){return r.json();}).then(function(sr){if(sr.chat_id)chatId=sr.chat_id;}).catch(function(){});
    // Show pre-chat form if enabled
    if(d.bot.setup&&d.bot.setup.pre_chat_enabled){
      showPreChatForm();
    } else {
      inputEl.disabled=false;sendEl.disabled=false;
      showTyping();setTimeout(function(){flow(0,'','');},500);
    }
  })
  .catch(function(){
    msgsEl.innerHTML='';
    addMsg({f:'sys',t:'Could not connect. Please try again later.'});
  });
})();
</script>
</body>
</html>`);
});

// ── Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/kb', require('./routes/kb'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/sales-agent', require('./routes/sales-agent'));
app.use('/api/forms', require('./routes/forms'));
app.use('/api/aibot', require('./routes/aibot'));
app.use('/api/email', require('./routes/email'));

// Live monitor - visitor sessions
app.use('/api/monitor', require('./middleware/auth'), (req, res) => {
  if (req.method === 'GET') {
    // Simulate real-time visitors
    const visitors = Array.from({ length: Math.floor(Math.random() * 12) + 3 }, (_, i) => ({
      id: `v${i + 1}`,
      page: ['/pricing', '/features', '/docs', '/', '/blog', '/contact'][Math.floor(Math.random() * 6)],
      country: ['India', 'United States', 'Germany', 'Brazil', 'Japan', 'UK', 'France', 'Canada'][Math.floor(Math.random() * 8)],
      city: ['Chennai', 'New York', 'Berlin', 'São Paulo', 'Tokyo'][Math.floor(Math.random() * 5)],
      source: ['Google', 'Direct', 'Twitter', 'LinkedIn', 'Referral'][Math.floor(Math.random() * 5)],
      device: Math.random() > 0.5 ? 'desktop' : 'mobile',
      duration: Math.floor(Math.random() * 600) + 30,
      intent: ['buyer', 'researcher', 'support_seeker', 'competitor'][Math.floor(Math.random() * 4)],
    }));
    return res.json({ visitors, total: visitors.length });
  }
  res.json({ success: true });
});

// Notifications
app.use('/api/notifications', require('./middleware/auth'), async (req, res) => {
  const auth = require('./middleware/auth');
  if (req.method === 'GET') {
    const notifs = await db.prepare('SELECT * FROM notifications WHERE agent_id=? ORDER BY created_at DESC LIMIT 20').all(req.agent.id);
    return res.json({ notifications: notifs });
  }
  if (req.method === 'PATCH') {
    await db.prepare('UPDATE notifications SET read=1 WHERE agent_id=?').run(req.agent.id);
    return res.json({ success: true });
  }
  res.json({ success: true });
});

// Integrations list
app.get('/api/integrations', require('./middleware/auth'), (req, res) => {
  const integrations = [
    { id: 'int1', name: 'Slack', category: 'Communication', connected: false, icon: '💬', description: 'Get notifications and create tickets from Slack' },
    { id: 'int2', name: 'Jira', category: 'Project Management', connected: false, icon: '📋', description: 'Sync tickets with Jira issues' },
    { id: 'int3', name: 'HubSpot', category: 'CRM', connected: false, icon: '🧲', description: 'Sync contacts and deals with HubSpot' },
    { id: 'int4', name: 'Salesforce', category: 'CRM', connected: false, icon: '☁️', description: 'Bidirectional sync with Salesforce' },
    { id: 'int5', name: 'Stripe', category: 'Payments', connected: true, icon: '💳', description: 'View customer billing info in conversations' },
    { id: 'int6', name: 'Shopify', category: 'E-commerce', connected: false, icon: '🛍️', description: 'Pull order details into support context' },
    { id: 'int7', name: 'Google Analytics', category: 'Analytics', connected: false, icon: '📊', description: 'Track support widget performance' },
    { id: 'int8', name: 'Zapier', category: 'Automation', connected: false, icon: '⚡', description: 'Connect SupportDesk to 5000+ apps' },
    { id: 'int9', name: 'GitHub', category: 'Developer', connected: true, icon: '🐙', description: 'Link issues to GitHub repos' },
    { id: 'int10', name: 'Intercom', category: 'Migration', connected: false, icon: '🚀', description: 'Import data from Intercom' },
    { id: 'int11', name: 'Zendesk', category: 'Migration', connected: false, icon: '🎯', description: 'Import data from Zendesk' },
    { id: 'int12', name: 'Twilio', category: 'Communication', connected: false, icon: '📞', description: 'SMS and voice via Twilio' },
  ];
  res.json({ integrations });
});

app.patch('/api/integrations/:id', require('./middleware/auth'), (req, res) => {
  res.json({ success: true, message: 'Integration config saved' });
});

// ── 404 fallback ──
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ──
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════╗
║  SupportDesk Backend                    ║
║  → http://localhost:${PORT}               ║
║  → WebSocket: ws://localhost:${PORT}/ws   ║
║  → Health: http://localhost:${PORT}/health║
╚══════════════════════════════════════════╝
  `);

  // ── Start email system (send worker + IMAP polling) after DB is ready ────
  setTimeout(async () => {
    try {
      const { startEmailSystem } = require('./workers/emailWorker');
      await startEmailSystem();
    } catch (err) {
      console.warn('⚠️  Email system failed to start (is Redis running?):', err.message);
    }
  }, 3000); // 3 s delay lets DB init + seed complete first
});
