const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

// Pages
router.get('/pages', auth, (req, res) => {
  const pages = db.prepare('SELECT * FROM booking_pages ORDER BY name ASC').all();
  for (const p of pages) {
    p.booking_count = db.prepare('SELECT COUNT(*) as c FROM bookings WHERE page_id=?').get(p.id).c;
    try { p.form_fields = JSON.parse(p.form_fields||'[]'); } catch { p.form_fields=[]; }
  }
  res.json({ pages });
});

router.post('/pages', auth, (req, res) => {
  const { name, slug, description, duration=30, buffer=0, color='#4c82fb', form_fields=[], availability={} } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });
  const id = uid();
  db.prepare('INSERT INTO booking_pages (id,name,slug,description,duration,buffer,color,form_fields,availability) VALUES (?,?,?,?,?,?,?,?,?)').run(
    id, name, slug, description||null, duration, buffer, color, JSON.stringify(form_fields), JSON.stringify(availability)
  );
  res.status(201).json({ page: db.prepare('SELECT * FROM booking_pages WHERE id=?').get(id) });
});

router.patch('/pages/:id', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM booking_pages WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','slug','description','duration','buffer','color','active'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.form_fields !== undefined) updates.form_fields = JSON.stringify(req.body.form_fields);
  if (req.body.availability !== undefined) updates.availability = JSON.stringify(req.body.availability);
  if (!Object.keys(updates).length) return res.json({ page: p });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE booking_pages SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ page: db.prepare('SELECT * FROM booking_pages WHERE id=?').get(req.params.id) });
});

router.delete('/pages/:id', auth, (req, res) => {
  db.prepare('DELETE FROM bookings WHERE page_id=?').run(req.params.id);
  db.prepare('DELETE FROM booking_pages WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Bookings
router.get('/', auth, (req, res) => {
  const { page_id, status } = req.query;
  let where = '1=1'; const params = [];
  if (page_id) { where += ' AND b.page_id=?'; params.push(page_id); }
  if (status) { where += ' AND b.status=?'; params.push(status); }
  const bookings = db.prepare(`
    SELECT b.*, bp.name as page_name FROM bookings b
    LEFT JOIN booking_pages bp ON b.page_id = bp.id
    WHERE ${where} ORDER BY b.start_time DESC
  `).all(...params);
  res.json({ bookings });
});

router.post('/', auth, (req, res) => {
  const { page_id, contact_name, contact_email, contact_phone, start_time, end_time, notes, form_responses={} } = req.body;
  if (!contact_name || !start_time) return res.status(400).json({ error: 'contact_name and start_time required' });
  const id = uid();
  const noShowRisk = Math.floor(Math.random()*30);
  db.prepare('INSERT INTO bookings (id,page_id,contact_name,contact_email,contact_phone,start_time,end_time,notes,form_responses,no_show_risk) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    id, page_id||null, contact_name, contact_email||null, contact_phone||null, start_time, end_time||null, notes||null, JSON.stringify(form_responses), noShowRisk
  );
  res.status(201).json({ booking: db.prepare('SELECT * FROM bookings WHERE id=?').get(id) });
});

router.patch('/:id', auth, (req, res) => {
  const b = db.prepare('SELECT * FROM bookings WHERE id=?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  const fields = ['status','contact_name','contact_email','contact_phone','start_time','end_time','notes'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (!Object.keys(updates).length) return res.json({ booking: b });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE bookings SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ booking: db.prepare('SELECT * FROM bookings WHERE id=?').get(req.params.id) });
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM bookings WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
