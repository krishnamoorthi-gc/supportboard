const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

// GET /api/chat/channels
router.get('/channels', auth, (req, res) => {
  const channels = db.prepare('SELECT * FROM chat_channels ORDER BY name ASC').all();
  for (const c of channels) {
    try { c.members = JSON.parse(c.members||'[]'); } catch { c.members=[]; }
    try { c.pinned_messages = JSON.parse(c.pinned_messages||'[]'); } catch { c.pinned_messages=[]; }
    c.unreadCount = 0; // placeholder
    const last = db.prepare('SELECT * FROM chat_messages WHERE channel_id=? ORDER BY created_at DESC LIMIT 1').get(c.id);
    c.lastMessage = last || null;
  }
  res.json({ channels });
});

// POST /api/chat/channels
router.post('/channels', auth, (req, res) => {
  const { name, description, type='public', members=[] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  const allMembers = [...new Set([...members, req.agent.id])];
  db.prepare('INSERT INTO chat_channels (id,name,description,type,members,created_by) VALUES (?,?,?,?,?,?)').run(
    id, name, description||null, type, JSON.stringify(allMembers), req.agent.id
  );
  res.status(201).json({ channel: db.prepare('SELECT * FROM chat_channels WHERE id=?').get(id) });
});

// PATCH /api/chat/channels/:id
router.patch('/channels/:id', auth, (req, res) => {
  const { name, description, members } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (members !== undefined) updates.members = JSON.stringify(members);
  if (!Object.keys(updates).length) return res.json({ success: true });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE chat_channels SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ channel: db.prepare('SELECT * FROM chat_channels WHERE id=?').get(req.params.id) });
});

// DELETE /api/chat/channels/:id
router.delete('/channels/:id', auth, (req, res) => {
  db.prepare('DELETE FROM chat_messages WHERE channel_id=?').run(req.params.id);
  db.prepare('DELETE FROM chat_channels WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/chat/channels/:id/messages
router.get('/channels/:id/messages', auth, (req, res) => {
  const msgs = db.prepare(`
    SELECT m.*, a.name as sender_name, a.avatar as sender_avatar, a.color as sender_color
    FROM chat_messages m
    LEFT JOIN agents a ON m.sender_id = a.id
    WHERE m.channel_id=?
    ORDER BY m.created_at ASC
    LIMIT 100
  `).all(req.params.id);
  for (const m of msgs) {
    try { m.reactions = JSON.parse(m.reactions||'{}'); } catch { m.reactions={}; }
    try { m.attachments = JSON.parse(m.attachments||'[]'); } catch { m.attachments=[]; }
  }
  res.json({ messages: msgs });
});

// POST /api/chat/channels/:id/messages
router.post('/channels/:id/messages', auth, (req, res) => {
  const { text, attachments=[], thread_id, reply_to } = req.body;
  if (!text && attachments.length === 0) return res.status(400).json({ error: 'text required' });
  const id = uid();
  db.prepare('INSERT INTO chat_messages (id,channel_id,sender_id,text,attachments,thread_id,reply_to) VALUES (?,?,?,?,?,?,?)').run(
    id, req.params.id, req.agent.id, text||null, JSON.stringify(attachments), thread_id||null, reply_to||null
  );
  const msg = db.prepare(`
    SELECT m.*, a.name as sender_name, a.avatar as sender_avatar, a.color as sender_color
    FROM chat_messages m LEFT JOIN agents a ON m.sender_id = a.id WHERE m.id=?
  `).get(id);
  res.status(201).json({ message: msg });
});

// POST /api/chat/messages/:id/react
router.post('/messages/:id/react', auth, (req, res) => {
  const { emoji } = req.body;
  const msg = db.prepare('SELECT * FROM chat_messages WHERE id=?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });
  let reactions = {};
  try { reactions = JSON.parse(msg.reactions||'{}'); } catch {}
  if (!reactions[emoji]) reactions[emoji] = [];
  const idx = reactions[emoji].indexOf(req.agent.id);
  if (idx >= 0) reactions[emoji].splice(idx, 1);
  else reactions[emoji].push(req.agent.id);
  if (reactions[emoji].length === 0) delete reactions[emoji];
  db.prepare('UPDATE chat_messages SET reactions=? WHERE id=?').run(JSON.stringify(reactions), req.params.id);
  res.json({ reactions });
});

// DELETE /api/chat/messages/:id
router.delete('/messages/:id', auth, (req, res) => {
  db.prepare('DELETE FROM chat_messages WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/chat/dms  (direct messages - channels of type 'dm')
router.get('/dms', auth, (req, res) => {
  const dms = db.prepare("SELECT * FROM chat_channels WHERE type='dm' AND members LIKE ?").all(`%${req.agent.id}%`);
  res.json({ dms });
});

module.exports = router;
