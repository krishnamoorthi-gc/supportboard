const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

// Campaigns
router.get('/campaigns', auth, (req, res) => {
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  for (const c of campaigns) { try { c.stats = JSON.parse(c.stats||'{}'); } catch { c.stats={}; } }
  res.json({ campaigns });
});

router.post('/campaigns', auth, (req, res) => {
  const { name, type='email', subject, body, segment_id, scheduled_at } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO campaigns (id,name,type,subject,body,segment_id,scheduled_at,stats) VALUES (?,?,?,?,?,?,?,?)').run(
    id, name, type, subject||null, body||null, segment_id||null, scheduled_at||null, '{}'
  );
  res.status(201).json({ campaign: db.prepare('SELECT * FROM campaigns WHERE id=?').get(id) });
});

router.patch('/campaigns/:id', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM campaigns WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','type','status','subject','body','segment_id','scheduled_at'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.status === 'sent') { updates.sent_at = new Date().toISOString(); updates.stats = JSON.stringify({ sent: Math.floor(Math.random()*500)+100, opens: Math.floor(Math.random()*200), clicks: Math.floor(Math.random()*80) }); }
  if (!Object.keys(updates).length) return res.json({ campaign: c });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE campaigns SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ campaign: db.prepare('SELECT * FROM campaigns WHERE id=?').get(req.params.id) });
});

router.delete('/campaigns/:id', auth, (req, res) => {
  db.prepare('DELETE FROM campaigns WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Segments
router.get('/segments', auth, (req, res) => {
  const segments = db.prepare('SELECT * FROM segments ORDER BY name ASC').all();
  res.json({ segments });
});

router.post('/segments', auth, (req, res) => {
  const { name, conditions=[] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  const count = db.prepare('SELECT COUNT(*) as c FROM contacts').get().c;
  db.prepare('INSERT INTO segments (id,name,conditions,contact_count) VALUES (?,?,?,?)').run(id, name, JSON.stringify(conditions), count);
  res.status(201).json({ segment: db.prepare('SELECT * FROM segments WHERE id=?').get(id) });
});

router.delete('/segments/:id', auth, (req, res) => {
  db.prepare('DELETE FROM segments WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Templates
router.get('/templates', auth, (req, res) => {
  const templates = db.prepare('SELECT * FROM campaign_templates ORDER BY name ASC').all();
  res.json({ templates });
});

router.post('/templates', auth, (req, res) => {
  const { name, type='email', subject, body } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO campaign_templates (id,name,type,subject,body) VALUES (?,?,?,?,?)').run(id, name, type, subject||null, body||null);
  res.status(201).json({ template: db.prepare('SELECT * FROM campaign_templates WHERE id=?').get(id) });
});

module.exports = router;
