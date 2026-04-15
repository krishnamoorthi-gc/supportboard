const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

// Pages
router.get('/pages', auth, (req, res) => {
  const pages = db.prepare('SELECT * FROM booking_pages WHERE agent_id=? ORDER BY name ASC').all(req.agent.id);
  for (const p of pages) {
    p.booking_count = db.prepare('SELECT COUNT(*) as c FROM bookings WHERE page_id=?').get(p.id).c;
    try { p.form_fields = JSON.parse(p.form_fields||'[]'); } catch { p.form_fields=[]; }
    try { p.availability = JSON.parse(p.availability||'[]'); } catch { p.availability=[]; }
  }
  res.json({ pages });
});

router.post('/pages', auth, (req, res) => {
  const { name, slug, description, duration=30, buffer=0, color='#4c82fb', form_fields=[], availability={}, location='Zoom', max_per_day=4, min_notice_hours=24 } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });
  const id = uid();
  db.prepare('INSERT INTO booking_pages (id,name,slug,description,duration,buffer,color,form_fields,availability,location,max_per_day,min_notice_hours,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, name, slug, description||null, duration, buffer, color, JSON.stringify(form_fields), JSON.stringify(availability), location, max_per_day, min_notice_hours, req.agent.id
  );
  const page = db.prepare('SELECT * FROM booking_pages WHERE id=? AND agent_id=?').get(id, req.agent.id);
  try { page.form_fields = JSON.parse(page.form_fields||'[]'); } catch { page.form_fields=[]; }
  try { page.availability = JSON.parse(page.availability||'[]'); } catch { page.availability=[]; }
  res.status(201).json({ page });
});

router.patch('/pages/:id', auth, (req, res) => {
  const p = db.prepare('SELECT * FROM booking_pages WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','slug','description','duration','buffer','color','active','location','max_per_day','min_notice_hours'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.form_fields !== undefined) updates.form_fields = JSON.stringify(req.body.form_fields);
  if (req.body.availability !== undefined) updates.availability = JSON.stringify(req.body.availability);
  if (!Object.keys(updates).length) return res.json({ page: p });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE booking_pages SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  const page = db.prepare('SELECT * FROM booking_pages WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  try { page.form_fields = JSON.parse(page.form_fields||'[]'); } catch { page.form_fields=[]; }
  try { page.availability = JSON.parse(page.availability||'[]'); } catch { page.availability=[]; }
  res.json({ page });
});

router.delete('/pages/:id', auth, (req, res) => {
  const p = db.prepare('SELECT id FROM booking_pages WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM bookings WHERE page_id=?').run(req.params.id);
  db.prepare('DELETE FROM booking_pages WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
});

// Bookings
router.get('/', auth, (req, res) => {
  const { page_id, status } = req.query;
  let where = 'bp.agent_id=?'; const params = [req.agent.id];
  if (page_id) { where += ' AND b.page_id=?'; params.push(page_id); }
  if (status) { where += ' AND b.status=?'; params.push(status); }
  const bookings = db.prepare(`
    SELECT b.*, bp.name as page_name FROM bookings b
    LEFT JOIN booking_pages bp ON b.page_id = bp.id
    WHERE ${where} ORDER BY b.start_time DESC
  `).all(...params);
  for (const b of bookings) {
    try { b.form_responses = JSON.parse(b.form_responses||'{}'); } catch { b.form_responses={}; }
  }
  res.json({ bookings });
});

router.get('/:id', auth, (req, res) => {
  const b = db.prepare(`
    SELECT b.*, bp.name as page_name FROM bookings b
    LEFT JOIN booking_pages bp ON b.page_id = bp.id
    WHERE b.id=? AND bp.agent_id=?
  `).get(req.params.id, req.agent.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  res.json({ booking: b });
});

router.post('/', auth, (req, res) => {
  const { page_id, contact_name, contact_email, contact_phone, start_time, end_time, notes, form_responses={} } = req.body;
  if (!contact_name || !start_time) return res.status(400).json({ error: 'contact_name and start_time required' });
  if (page_id) {
    const page = db.prepare('SELECT id FROM booking_pages WHERE id=? AND agent_id=?').get(page_id, req.agent.id);
    if (!page) return res.status(404).json({ error: 'Booking page not found' });
  }
  const id = uid();
  const noShowRisk = 0;
  db.prepare('INSERT INTO bookings (id,page_id,contact_name,contact_email,contact_phone,start_time,end_time,notes,form_responses,no_show_risk) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    id, page_id||null, contact_name, contact_email||null, contact_phone||null, start_time, end_time||null, notes||null, JSON.stringify(form_responses), noShowRisk
  );
  const booking = db.prepare(`
    SELECT b.*, bp.name as page_name FROM bookings b
    LEFT JOIN booking_pages bp ON b.page_id = bp.id
    WHERE b.id=?
  `).get(id);
  res.status(201).json({ booking });
});

router.patch('/:id', auth, (req, res) => {
  const b = db.prepare(`
    SELECT b.* FROM bookings b
    LEFT JOIN booking_pages bp ON b.page_id = bp.id
    WHERE b.id=? AND bp.agent_id=?
  `).get(req.params.id, req.agent.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  const fields = ['status','contact_name','contact_email','contact_phone','start_time','end_time','notes'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (!Object.keys(updates).length) return res.json({ booking: b });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE bookings SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updated = db.prepare(`
    SELECT b.*, bp.name as page_name FROM bookings b
    LEFT JOIN booking_pages bp ON b.page_id = bp.id
    WHERE b.id=?
  `).get(req.params.id);
  res.json({ booking: updated });
});

router.delete('/:id', auth, (req, res) => {
  const b = db.prepare(`
    SELECT b.id FROM bookings b
    LEFT JOIN booking_pages bp ON b.page_id = bp.id
    WHERE b.id=? AND bp.agent_id=?
  `).get(req.params.id, req.agent.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM bookings WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
