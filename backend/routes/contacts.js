const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid, paginate } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  const { offset, limit } = paginate(req);
  const { q, tag } = req.query;
  let where = '1=1'; const params = [];
  if (q) { where += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)'; const lq=`%${q}%`; params.push(lq,lq,lq,lq); }
  if (tag) { where += ' AND tags LIKE ?'; params.push(`%"${tag}"%`); }
  const contacts = await db.prepare(`SELECT * FROM contacts WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM contacts WHERE ${where}`).get(...params);
  const total = totalRow ? totalRow.c : 0;
  for (const c of contacts) { try { c.tags = JSON.parse(c.tags||'[]'); } catch { c.tags=[]; } }
  res.json({ contacts, total });
});

router.get('/:id', auth, async (req, res) => {
  const c = await db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  try { c.tags = JSON.parse(c.tags||'[]'); } catch { c.tags=[]; }
  const convs = await db.prepare('SELECT * FROM conversations WHERE contact_id=? ORDER BY updated_at DESC LIMIT 10').all(req.params.id);
  res.json({ contact: c, conversations: convs });
});

router.post('/', auth, async (req, res) => {
  const { name, email, phone, company, avatar, color, tags=[], notes, location } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  await db.prepare('INSERT INTO contacts (id,name,email,phone,company,avatar,color,tags,notes,location) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    id, name, email||null, phone||null, company||null, avatar||null, color||'#4c82fb', JSON.stringify(tags), notes||null, location||null
  );
  const contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(id);
  res.status(201).json({ contact });
});

router.patch('/:id', auth, async (req, res) => {
  const c = await db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','email','phone','company','avatar','color','notes','location','timezone'];
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updates = { updated_at: now };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.tags !== undefined) updates.tags = JSON.stringify(req.body.tags);
  if (req.body.custom_fields !== undefined) updates.custom_fields = JSON.stringify(req.body.custom_fields);
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE contacts SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.id);
  res.json({ contact });
});

router.delete('/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM contacts WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/contacts/bulk
router.post('/bulk', auth, async (req, res) => {
  const { action, ids } = req.body;
  if (action === 'delete' && ids) { 
    for (const id of ids) await db.prepare('DELETE FROM contacts WHERE id=?').run(id); 
  }
  res.json({ success: true, affected: ids?.length || 0 });
});

module.exports = router;
