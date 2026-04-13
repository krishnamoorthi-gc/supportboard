const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

// Lazy-load ws to avoid circular dependency issues
let _ws = null;
const getWs = () => {
  if (!_ws) try { _ws = require('../ws'); } catch {}
  return _ws;
};
const broadcast = (data) => { try { getWs()?.broadcastToAll(data); } catch {} };
const broadcastExcept = (data, excludeId) => { try { getWs()?.broadcastExcept(data, excludeId); } catch {} };

// ── Channels ──────────────────────────────────────────────────────────────

// GET /api/chat/channels
router.get('/channels', auth, async (req, res) => {
  try {
    const channels = await db.prepare('SELECT * FROM chat_channels WHERE type != ? ORDER BY name ASC').all('dm');
    for (const c of channels) {
      try { c.members = JSON.parse(c.members || '[]'); } catch { c.members = []; }
      try { c.pinned_messages = JSON.parse(c.pinned_messages || '[]'); } catch { c.pinned_messages = []; }
      c.unreadCount = 0;
      const last = await db.prepare('SELECT * FROM chat_messages WHERE channel_id=? ORDER BY created_at DESC LIMIT 1').get(c.id);
      c.lastMessage = last || null;
    }
    res.json({ channels });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/chat/channels/:id
router.get('/channels/:id', auth, async (req, res) => {
  try {
    const c = await db.prepare('SELECT * FROM chat_channels WHERE id=?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    try { c.members = JSON.parse(c.members || '[]'); } catch { c.members = []; }
    try { c.pinned_messages = JSON.parse(c.pinned_messages || '[]'); } catch { c.pinned_messages = []; }
    c.unreadCount = 0;
    res.json({ channel: c });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat/channels
router.post('/channels', auth, async (req, res) => {
  try {
    const { name, description, type = 'public', members = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    const allMembers = [...new Set([...members, req.agent.id])];
    await db.prepare('INSERT INTO chat_channels (id,name,description,type,members,created_by) VALUES (?,?,?,?,?,?)').run(
      id, name, description || null, type, JSON.stringify(allMembers), req.agent.id
    );
    const channel = await db.prepare('SELECT * FROM chat_channels WHERE id=?').get(id);
    try { channel.members = JSON.parse(channel.members || '[]'); } catch { channel.members = []; }
    // Broadcast new channel to all connected clients
    broadcast({ type: 'tc_channel_new', channel });
    res.status(201).json({ channel });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/chat/channels/:id
router.patch('/channels/:id', auth, async (req, res) => {
  try {
    const { name, description, members, topic } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (members !== undefined) updates.members = JSON.stringify(members);
    if (topic !== undefined) updates.topic = topic;
    if (!Object.keys(updates).length) return res.json({ success: true });
    const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
    await db.prepare(`UPDATE chat_channels SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
    const channel = await db.prepare('SELECT * FROM chat_channels WHERE id=?').get(req.params.id);
    broadcast({ type: 'tc_channel_update', channel });
    res.json({ channel });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/chat/channels/:id
router.delete('/channels/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM chat_messages WHERE channel_id=?').run(req.params.id);
    await db.prepare('DELETE FROM chat_polls WHERE channel_id=?').run(req.params.id);
    await db.prepare('DELETE FROM chat_channels WHERE id=?').run(req.params.id);
    broadcast({ type: 'tc_channel_delete', channelId: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Messages ──────────────────────────────────────────────────────────────

// GET /api/chat/channels/:id/messages
router.get('/channels/:id/messages', auth, async (req, res) => {
  try {
    const msgs = await db.prepare(`
      SELECT m.*, a.name as sender_name, a.avatar as sender_avatar, a.color as sender_color
      FROM chat_messages m
      LEFT JOIN agents a ON m.sender_id = a.id
      WHERE m.channel_id=? AND (m.thread_id IS NULL OR m.thread_id = '')
      ORDER BY m.created_at ASC
      LIMIT 100
    `).all(req.params.id);
    for (const m of msgs) {
      try { m.reactions = JSON.parse(m.reactions || '{}'); } catch { m.reactions = {}; }
      try { m.attachments = JSON.parse(m.attachments || '[]'); } catch { m.attachments = []; }
      try { m.seen_by = JSON.parse(m.seen_by || '[]'); } catch { m.seen_by = []; }
      // Load thread replies
      const threads = await db.prepare(`
        SELECT m.*, a.name as sender_name FROM chat_messages m
        LEFT JOIN agents a ON m.sender_id = a.id
        WHERE m.thread_id=? ORDER BY m.created_at ASC
      `).all(m.id);
      m.thread = threads.map(t => ({
        id: t.id, uid: t.sender_id, text: t.text,
        t: new Date(t.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
      }));
    }
    res.json({ messages: msgs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/chat/messages/:channelId  (compatibility alias)
router.get('/messages/:channelId', auth, async (req, res) => {
  try {
    const msgs = await db.prepare(`
      SELECT m.*, a.name as sender_name, a.avatar as sender_avatar, a.color as sender_color
      FROM chat_messages m
      LEFT JOIN agents a ON m.sender_id = a.id
      WHERE m.channel_id=? AND (m.thread_id IS NULL OR m.thread_id = '')
      ORDER BY m.created_at ASC LIMIT 100
    `).all(req.params.channelId);
    for (const m of msgs) {
      try { m.reactions = JSON.parse(m.reactions || '{}'); } catch { m.reactions = {}; }
      try { m.attachments = JSON.parse(m.attachments || '[]'); } catch { m.attachments = []; }
      const threads = await db.prepare(`
        SELECT m.*, a.name as sender_name FROM chat_messages m
        LEFT JOIN agents a ON m.sender_id = a.id
        WHERE m.thread_id=? ORDER BY m.created_at ASC
      `).all(m.id);
      m.thread = threads.map(t => ({
        id: t.id, uid: t.sender_id, text: t.text,
        t: new Date(t.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
      }));
    }
    res.json({ messages: msgs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat/channels/:id/messages
router.post('/channels/:id/messages', auth, async (req, res) => {
  try {
    const { text, attachments = [], thread_id, reply_to, file_name, file_size, file_type } = req.body;
    if (!text && attachments.length === 0 && !file_name) return res.status(400).json({ error: 'text required' });
    const id = uid();
    const attArr = file_name ? [{ name: file_name, size: file_size, type: file_type }] : attachments;
    await db.prepare('INSERT INTO chat_messages (id,channel_id,sender_id,text,attachments,thread_id,reply_to) VALUES (?,?,?,?,?,?,?)').run(
      id, req.params.id, req.agent.id, text || null, JSON.stringify(attArr), thread_id || null, reply_to || null
    );
    const msg = await db.prepare(`
      SELECT m.*, a.name as sender_name, a.avatar as sender_avatar, a.color as sender_color
      FROM chat_messages m LEFT JOIN agents a ON m.sender_id = a.id WHERE m.id=?
    `).get(id);
    try { msg.reactions = JSON.parse(msg.reactions || '{}'); } catch { msg.reactions = {}; }
    try { msg.attachments = JSON.parse(msg.attachments || '[]'); } catch { msg.attachments = []; }
    try { msg.seen_by = JSON.parse(msg.seen_by || '[]'); } catch { msg.seen_by = []; }
    msg.thread = [];
    // Broadcast to all clients EXCEPT the sender (sender already has it via optimistic UI)
    broadcastExcept({ type: 'tc_message', channelId: req.params.id, message: msg }, req.agent.id);
    res.status(201).json({ message: msg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat/messages  (compatibility alias — body has channel_id or dm_id)
router.post('/messages', auth, async (req, res) => {
  try {
    const { text, channel_id, dm_id, file_name, file_size, file_type } = req.body;
    const chId = channel_id || dm_id;
    if (!chId) return res.status(400).json({ error: 'channel_id or dm_id required' });
    const id = uid();
    const attArr = file_name ? [{ name: file_name, size: file_size, type: file_type }] : [];
    await db.prepare('INSERT INTO chat_messages (id,channel_id,sender_id,text,attachments) VALUES (?,?,?,?,?)').run(
      id, chId, req.agent.id, text || null, JSON.stringify(attArr)
    );
    const msg = await db.prepare(`
      SELECT m.*, a.name as sender_name FROM chat_messages m LEFT JOIN agents a ON m.sender_id = a.id WHERE m.id=?
    `).get(id);
    try { msg.reactions = JSON.parse(msg.reactions || '{}'); } catch { msg.reactions = {}; }
    try { msg.attachments = JSON.parse(msg.attachments || '[]'); } catch { msg.attachments = []; }
    msg.thread = [];
    broadcastExcept({ type: 'tc_message', channelId: chId, message: msg }, req.agent.id);
    res.status(201).json({ message: msg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/chat/messages/:id
router.patch('/messages/:id', auth, async (req, res) => {
  try {
    const { text, pinned } = req.body;
    const msg = await db.prepare('SELECT * FROM chat_messages WHERE id=?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    const updates = {};
    if (text !== undefined) updates.text = text;
    if (!Object.keys(updates).length) return res.json({ success: true });
    const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
    await db.prepare(`UPDATE chat_messages SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
    broadcast({ type: 'tc_msg_edit', messageId: req.params.id, channelId: msg.channel_id, text });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat/messages/:id/thread  (thread reply)
router.post('/messages/:id/thread', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const parent = await db.prepare('SELECT * FROM chat_messages WHERE id=?').get(req.params.id);
    if (!parent) return res.status(404).json({ error: 'Not found' });
    const id = uid();
    await db.prepare('INSERT INTO chat_messages (id,channel_id,sender_id,text,thread_id) VALUES (?,?,?,?,?)').run(
      id, parent.channel_id, req.agent.id, text, req.params.id
    );
    const msg = await db.prepare(`
      SELECT m.*, a.name as sender_name FROM chat_messages m LEFT JOIN agents a ON m.sender_id = a.id WHERE m.id=?
    `).get(id);
    broadcast({ type: 'tc_thread_reply', parentId: req.params.id, channelId: parent.channel_id, message: msg });
    res.status(201).json({ message: msg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat/messages/:id/react
router.post('/messages/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await db.prepare('SELECT * FROM chat_messages WHERE id=?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    let reactions = {};
    try { reactions = JSON.parse(msg.reactions || '{}'); } catch {}
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(req.agent.id);
    if (idx >= 0) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(req.agent.id);
    if (reactions[emoji].length === 0) delete reactions[emoji];
    await db.prepare('UPDATE chat_messages SET reactions=? WHERE id=?').run(JSON.stringify(reactions), req.params.id);
    broadcast({ type: 'tc_reaction', messageId: req.params.id, channelId: msg.channel_id, reactions, agentId: req.agent.id, emoji });
    res.json({ reactions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat/messages/:id/reactions  (alias)
router.post('/messages/:id/reactions', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await db.prepare('SELECT * FROM chat_messages WHERE id=?').get(req.params.id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    let reactions = {};
    try { reactions = JSON.parse(msg.reactions || '{}'); } catch {}
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(req.agent.id);
    if (idx >= 0) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(req.agent.id);
    if (reactions[emoji].length === 0) delete reactions[emoji];
    await db.prepare('UPDATE chat_messages SET reactions=? WHERE id=?').run(JSON.stringify(reactions), req.params.id);
    broadcast({ type: 'tc_reaction', messageId: req.params.id, channelId: msg.channel_id, reactions, agentId: req.agent.id, emoji });
    res.json({ reactions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/chat/messages/:id
router.delete('/messages/:id', auth, async (req, res) => {
  try {
    const msg = await db.prepare('SELECT * FROM chat_messages WHERE id=?').get(req.params.id);
    if (msg) broadcast({ type: 'tc_msg_delete', messageId: req.params.id, channelId: msg.channel_id });
    await db.prepare('DELETE FROM chat_messages WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Read receipts ─────────────────────────────────────────────────────────

// POST /api/chat/channels/:id/read  — mark all messages as seen by current agent
router.post('/channels/:id/read', auth, async (req, res) => {
  try {
    const agentId = req.agent.id;
    const channelId = req.params.id;

    // Get all unread messages (where seen_by doesn't contain agentId)
    const msgs = await db.prepare(
      "SELECT id, seen_by FROM chat_messages WHERE channel_id=? AND (sender_id != ? OR sender_id IS NULL)"
    ).all(channelId, agentId);

    const updated = [];
    for (const msg of msgs) {
      let seenBy = [];
      try { seenBy = JSON.parse(msg.seen_by || '[]'); } catch {}
      if (!seenBy.includes(agentId)) {
        seenBy.push(agentId);
        await db.prepare('UPDATE chat_messages SET seen_by=? WHERE id=?').run(JSON.stringify(seenBy), msg.id);
        updated.push({ id: msg.id, seen_by: seenBy });
      }
    }

    if (updated.length > 0) {
      broadcast({ type: 'tc_read', channelId, agentId, messageIds: updated.map(m => m.id), seenMap: updated.reduce((acc, m) => { acc[m.id] = m.seen_by; return acc; }, {}) });
    }

    res.json({ success: true, updated: updated.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/chat/channels/:id/read-status  — get seen_by for recent messages
router.get('/channels/:id/read-status', auth, async (req, res) => {
  try {
    const msgs = await db.prepare(
      'SELECT id, seen_by FROM chat_messages WHERE channel_id=? ORDER BY created_at DESC LIMIT 50'
    ).all(req.params.id);

    const status = {};
    for (const m of msgs) {
      try { status[m.id] = JSON.parse(m.seen_by || '[]'); } catch { status[m.id] = []; }
    }
    res.json({ status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Direct Messages ────────────────────────────────────────────────────────

// GET /api/chat/dms
router.get('/dms', auth, async (req, res) => {
  try {
    const dms = await db.prepare("SELECT * FROM chat_channels WHERE type='dm' AND members LIKE ?").all(`%${req.agent.id}%`);
    for (const d of dms) {
      try { d.members = JSON.parse(d.members || '[]'); } catch { d.members = []; }
    }
    res.json({ dms });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat/dms  (create or get existing DM)
router.post('/dms', auth, async (req, res) => {
  try {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId required' });
    // Check if DM already exists between these two agents
    const existingDms = await db.prepare("SELECT * FROM chat_channels WHERE type='dm'").all();
    let existing = null;
    for (const dm of existingDms) {
      let members = [];
      try { members = JSON.parse(dm.members || '[]'); } catch {}
      if (members.includes(req.agent.id) && members.includes(agentId)) { existing = dm; break; }
    }
    if (existing) {
      try { existing.members = JSON.parse(existing.members || '[]'); } catch { existing.members = []; }
      return res.json({ channel: existing });
    }
    const id = uid();
    const members = [req.agent.id, agentId];
    await db.prepare("INSERT INTO chat_channels (id,name,type,members,created_by) VALUES (?,?,?,?,?)").run(
      id, `dm_${req.agent.id}_${agentId}`, 'dm', JSON.stringify(members), req.agent.id
    );
    const channel = await db.prepare('SELECT * FROM chat_channels WHERE id=?').get(id);
    try { channel.members = JSON.parse(channel.members || '[]'); } catch { channel.members = []; }
    res.status(201).json({ channel });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Polls ─────────────────────────────────────────────────────────────────

// GET /api/chat/channels/:id/polls
router.get('/channels/:id/polls', auth, async (req, res) => {
  try {
    const polls = await db.prepare('SELECT * FROM chat_polls WHERE channel_id=? ORDER BY created_at ASC').all(req.params.id);
    for (const p of polls) {
      try { p.options = JSON.parse(p.options || '[]'); } catch { p.options = []; }
    }
    res.json({ polls });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat/channels/:id/polls
router.post('/channels/:id/polls', auth, async (req, res) => {
  try {
    const { question, options } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2) return res.status(400).json({ error: 'question and at least 2 options required' });
    const id = uid();
    const opts = options.map(o => ({ text: o, votes: [] }));
    await db.prepare('INSERT INTO chat_polls (id,channel_id,created_by,question,options) VALUES (?,?,?,?,?)').run(
      id, req.params.id, req.agent.id, question, JSON.stringify(opts)
    );
    const poll = await db.prepare('SELECT * FROM chat_polls WHERE id=?').get(id);
    poll.options = opts;
    broadcast({ type: 'tc_poll_new', channelId: req.params.id, poll });
    res.status(201).json({ poll });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat/polls/:id/vote
router.post('/polls/:id/vote', auth, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await db.prepare('SELECT * FROM chat_polls WHERE id=?').get(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Not found' });
    let options = [];
    try { options = JSON.parse(poll.options || '[]'); } catch {}
    if (optionIndex < 0 || optionIndex >= options.length) return res.status(400).json({ error: 'Invalid option' });
    // Remove agent from all options then add to selected (toggle)
    const alreadyVoted = options[optionIndex].votes.includes(req.agent.id);
    options = options.map(o => ({ ...o, votes: (o.votes || []).filter(v => v !== req.agent.id) }));
    if (!alreadyVoted) options[optionIndex].votes.push(req.agent.id);
    await db.prepare('UPDATE chat_polls SET options=? WHERE id=?').run(JSON.stringify(options), req.params.id);
    broadcast({ type: 'tc_poll_vote', pollId: req.params.id, channelId: poll.channel_id, options });
    res.json({ options });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
