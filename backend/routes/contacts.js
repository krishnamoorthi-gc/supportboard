const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid, paginate } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  try {
    const { offset, limit } = paginate(req);
    const { q, tag } = req.query;
    // Show only contacts for this agent
    let where = 'agent_id=?'; const params = [req.agent.id];
    if (q) { where += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)'; const lq=`%${q}%`; params.push(lq,lq,lq,lq); }
    if (tag) { where += ' AND tags LIKE ?'; params.push(`%"${tag}"%`); }
    const contacts = await db.prepare(`SELECT * FROM contacts WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM contacts WHERE ${where}`).get(...params);
    const total = totalRow ? totalRow.c : 0;
    for (const c of contacts) { try { c.tags = JSON.parse(c.tags||'[]'); } catch { c.tags=[]; } try { c.custom_fields = JSON.parse(c.custom_fields||'{}'); } catch { c.custom_fields={}; } }
    console.log(`✅ GET /api/contacts - returning ${contacts.length} contacts`);
    res.json({ contacts, total });
  } catch (e) {
    console.error('❌ GET /api/contacts error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const c = await db.prepare('SELECT * FROM contacts WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  try { c.tags = JSON.parse(c.tags||'[]'); } catch { c.tags=[]; }
  try { c.custom_fields = JSON.parse(c.custom_fields||'{}'); } catch { c.custom_fields={}; }
  const convs = await db.prepare('SELECT * FROM conversations WHERE contact_id=? AND agent_id=? ORDER BY updated_at DESC LIMIT 10').all(req.params.id, req.agent.id);
  res.json({ contact: c, conversations: convs });
});

// GET /api/contacts/:id/timeline — real-time activity feed for a contact
router.get('/:id/timeline', auth, async (req, res) => {
  try {
    const contact = await db.prepare('SELECT * FROM contacts WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!contact) return res.status(404).json({ error: 'Not found' });

    const events = [];

    // 1. Contact created
    if (contact.created_at) {
      events.push({
        type: 'contact_created',
        icon: '🆕',
        text: 'Contact created',
        sub: contact.email || contact.phone || '',
        color: 'a',
        ts: contact.created_at,
      });
    }

    // 2. Conversations (created + resolved)
    const convs = await db.prepare(
      'SELECT id, subject, status, channel, created_at, resolved_at, csat_score FROM conversations WHERE contact_id=? AND agent_id=? ORDER BY created_at DESC LIMIT 50'
    ).all(req.params.id, req.agent.id);

    for (const cv of convs) {
      events.push({
        type: 'conversation_created',
        icon: '💬',
        text: 'Conversation started',
        sub: (cv.subject || 'No subject') + (cv.channel ? ' · ' + cv.channel : ''),
        color: 'a',
        ts: cv.created_at,
        conversation_id: cv.id,
      });

      if (cv.resolved_at) {
        events.push({
          type: 'conversation_resolved',
          icon: '✅',
          text: 'Conversation resolved',
          sub: cv.subject || '',
          color: 'g',
          ts: cv.resolved_at,
          conversation_id: cv.id,
        });
      }

      if (cv.csat_score) {
        events.push({
          type: 'csat_received',
          icon: '📋',
          text: `CSAT: ${cv.csat_score}★`,
          sub: cv.subject || 'Post-resolution feedback',
          color: 'g',
          ts: cv.resolved_at || cv.created_at,
        });
      }
    }

    // 3. Messages (last 50 across all conversations)
    if (convs.length > 0) {
      const convIds = convs.map(c => c.id);
      const placeholders = convIds.map(() => '?').join(',');
      const msgs = await db.prepare(
        `SELECT id, conversation_id, role, text, created_at FROM messages WHERE conversation_id IN (${placeholders}) ORDER BY created_at DESC LIMIT 50`
      ).all(...convIds);

      for (const m of msgs) {
        const isCustomer = m.role === 'customer' || m.role === 'user';
        const preview = (m.text || '').slice(0, 80);
        events.push({
          type: isCustomer ? 'message_received' : 'message_sent',
          icon: isCustomer ? '📨' : '📤',
          text: isCustomer ? 'Message received' : 'Message sent',
          sub: preview || '(attachment)',
          color: isCustomer ? 'a' : 'p',
          ts: m.created_at,
          conversation_id: m.conversation_id,
        });
      }
    }

    // 4. Sort events by timestamp (most recent first) + cap to 80
    events.sort((a, b) => {
      const ta = new Date(a.ts).getTime();
      const tb = new Date(b.ts).getTime();
      return tb - ta;
    });

    res.json({ events: events.slice(0, 80) });
  } catch (e) {
    console.error('❌ GET /api/contacts/:id/timeline error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  const { name, email, phone, company, avatar, color, tags=[], notes, location } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  await db.prepare('INSERT INTO contacts (id,name,email,phone,company,avatar,color,tags,notes,location,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
    id, name, email||null, phone||null, company||null, avatar||null, color||'#4c82fb', JSON.stringify(tags), notes||null, location||null, req.agent.id
  );
  const contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(id);
  res.status(201).json({ contact });
});

router.patch('/:id', auth, async (req, res) => {
  const c = await db.prepare('SELECT * FROM contacts WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','email','phone','company','avatar','color','notes','location','timezone'];
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updates = { updated_at: now };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.tags !== undefined) updates.tags = JSON.stringify(req.body.tags);
  if (req.body.custom_fields !== undefined) updates.custom_fields = JSON.stringify(req.body.custom_fields);
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE contacts SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  const contact = await db.prepare('SELECT * FROM contacts WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  res.json({ contact });
});

router.delete('/:id', auth, async (req, res) => {
  const c = await db.prepare('SELECT id FROM contacts WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  await db.prepare('DELETE FROM contacts WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
});

// POST /api/contacts/bulk
router.post('/bulk', auth, async (req, res) => {
  const { action, ids } = req.body;
  if (action === 'delete' && ids) {
    for (const id of ids) await db.prepare('DELETE FROM contacts WHERE id=? AND agent_id=?').run(id, req.agent.id);
  }
  res.json({ success: true, affected: ids?.length || 0 });
});

module.exports = router;
