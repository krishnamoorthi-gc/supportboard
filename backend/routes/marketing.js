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

router.get('/campaigns/:id', auth, (req, res) => {
  const c = db.prepare('SELECT * FROM campaigns WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  try { c.stats = JSON.parse(c.stats||'{}'); } catch { c.stats={}; }
  res.json({ campaign: c });
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
  if (req.body.status === 'sent') {
    updates.sent_at = new Date().toISOString();
    let sentCount = 0;
    if (c.segment_id) {
      const seg = db.prepare('SELECT contact_count FROM segments WHERE id=?').get(c.segment_id);
      if (seg) sentCount = seg.contact_count || 0;
    }
    updates.stats = JSON.stringify({ sent: sentCount, opens: 0, clicks: 0 });
  }
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

router.patch('/segments/:id', auth, (req, res) => {
  const s = db.prepare('SELECT * FROM segments WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.conditions !== undefined) updates.conditions = JSON.stringify(req.body.conditions);
  if (req.body.contact_count !== undefined) updates.contact_count = req.body.contact_count;
  if (!Object.keys(updates).length) return res.json({ segment: s });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE segments SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ segment: db.prepare('SELECT * FROM segments WHERE id=?').get(req.params.id) });
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

router.get('/templates/:id', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM campaign_templates WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json({ template: t });
});

router.post('/templates', auth, (req, res) => {
  const { name, type='email', subject, body } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO campaign_templates (id,name,type,subject,body) VALUES (?,?,?,?,?)').run(id, name, type, subject||null, body||null);
  res.status(201).json({ template: db.prepare('SELECT * FROM campaign_templates WHERE id=?').get(id) });
});

router.patch('/templates/:id', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM campaign_templates WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','type','subject','body'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (!Object.keys(updates).length) return res.json({ template: t });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE campaign_templates SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ template: db.prepare('SELECT * FROM campaign_templates WHERE id=?').get(req.params.id) });
});

router.delete('/templates/:id', auth, (req, res) => {
  db.prepare('DELETE FROM campaign_templates WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
