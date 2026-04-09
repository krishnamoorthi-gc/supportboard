const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid, paginate } = require('../utils/helpers');

const wrap = fn => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (e) { console.error('companies error:', e.message); res.status(500).json({ error: e.message }); }
};

router.get('/', auth, wrap(async (req, res) => {
  const { offset, limit } = paginate(req);
  const { q } = req.query;
  let where = 'agent_id=?'; const params = [req.agent.id];
  if (q) { where += ' AND (name LIKE ? OR domain LIKE ? OR industry LIKE ?)'; const lq=`%${q}%`; params.push(lq,lq,lq); }
  const companies = await db.prepare(`SELECT * FROM companies WHERE ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const totalRow = await db.prepare(`SELECT COUNT(*) as c FROM companies WHERE ${where}`).get(...params);
  const total = totalRow ? totalRow.c : 0;
  res.json({ companies, total });
}));

router.get('/:id', auth, wrap(async (req, res) => {
  const c = await db.prepare('SELECT * FROM companies WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const contacts = await db.prepare('SELECT * FROM contacts WHERE company=?').all(c.name);
  res.json({ company: c, contacts });
}));

router.post('/', auth, wrap(async (req, res) => {
  const { name, domain, industry, size, revenue, website, phone, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  await db.prepare('INSERT INTO companies (id,name,domain,industry,size,revenue,website,phone,address,notes,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
    id, name, domain||null, industry||null, size||null, revenue||null, website||null, phone||null, address||null, notes||null, req.agent.id
  );
  const company = await db.prepare('SELECT * FROM companies WHERE id=?').get(id);
  res.status(201).json({ company });
}));

router.patch('/:id', auth, wrap(async (req, res) => {
  const c = await db.prepare('SELECT * FROM companies WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','domain','industry','size','revenue','website','phone','address','notes'];
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updates = { updated_at: now };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE companies SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updatedCompany = await db.prepare('SELECT * FROM companies WHERE id=?').get(req.params.id);
  res.json({ company: updatedCompany });
}));

router.delete('/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM companies WHERE id=?').run(req.params.id);
  res.json({ success: true });
}));

module.exports = router;
