const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

// Campaigns
router.get('/campaigns', auth, async (req, res) => {
  try {
    const campaigns = await db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
    for (const c of campaigns) { try { c.stats = JSON.parse(c.stats||'{}'); } catch { c.stats={}; } }
    res.json({ campaigns });
  } catch (e) {
    console.error('❌ GET /api/marketing/campaigns error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/campaigns/:id', auth, async (req, res) => {
  try {
    const c = await db.prepare('SELECT * FROM campaigns WHERE id=?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    try { c.stats = JSON.parse(c.stats||'{}'); } catch { c.stats={}; }
    res.json({ campaign: c });
  } catch (e) {
    console.error('❌ GET /api/marketing/campaigns/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/campaigns', auth, async (req, res) => {
  try {
    const { name, type='email', subject, body, segment_id, scheduled_at } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    await db.prepare('INSERT INTO campaigns (id,name,type,subject,body,segment_id,scheduled_at,stats) VALUES (?,?,?,?,?,?,?,?)').run(
      id, name, type, subject||null, body||null, segment_id||null, scheduled_at||null, '{}'
    );
    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id=?').get(id);
    res.status(201).json({ campaign });
  } catch (e) {
    console.error('❌ POST /api/marketing/campaigns error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/campaigns/:id', auth, async (req, res) => {
  try {
    const c = await db.prepare('SELECT * FROM campaigns WHERE id=?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const fields = ['name','type','status','subject','body','segment_id','scheduled_at'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (req.body.status === 'sent') {
      updates.sent_at = new Date().toISOString();
      let sentCount = 0;
      if (c.segment_id) {
        const seg = await db.prepare('SELECT contact_count FROM segments WHERE id=?').get(c.segment_id);
        if (seg) sentCount = seg.contact_count || 0;
      }
      updates.stats = JSON.stringify({ sent: sentCount, opens: 0, clicks: 0 });
    }
    if (!Object.keys(updates).length) return res.json({ campaign: c });
    const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
    await db.prepare(`UPDATE campaigns SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id=?').get(req.params.id);
    res.json({ campaign });
  } catch (e) {
    console.error('❌ PATCH /api/marketing/campaigns/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/campaigns/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM campaigns WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/marketing/campaigns/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Segments
router.get('/segments', auth, async (req, res) => {
  try {
    const segments = await db.prepare('SELECT * FROM segments ORDER BY name ASC').all();
    res.json({ segments });
  } catch (e) {
    console.error('❌ GET /api/marketing/segments error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/segments', auth, async (req, res) => {
  try {
    const { name, conditions=[] } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    const countResult = await db.prepare('SELECT COUNT(*) as c FROM contacts').get();
    const count = countResult?.c || 0;
    await db.prepare('INSERT INTO segments (id,name,conditions,contact_count) VALUES (?,?,?,?)').run(id, name, JSON.stringify(conditions), count);
    const segment = await db.prepare('SELECT * FROM segments WHERE id=?').get(id);
    res.status(201).json({ segment });
  } catch (e) {
    console.error('❌ POST /api/marketing/segments error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/segments/:id', auth, async (req, res) => {
  try {
    const s = await db.prepare('SELECT * FROM segments WHERE id=?').get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.conditions !== undefined) updates.conditions = JSON.stringify(req.body.conditions);
    if (req.body.contact_count !== undefined) updates.contact_count = req.body.contact_count;
    if (!Object.keys(updates).length) return res.json({ segment: s });
    const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
    await db.prepare(`UPDATE segments SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
    const segment = await db.prepare('SELECT * FROM segments WHERE id=?').get(req.params.id);
    res.json({ segment });
  } catch (e) {
    console.error('❌ PATCH /api/marketing/segments/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/segments/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM segments WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/marketing/segments/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = await db.prepare('SELECT * FROM campaign_templates ORDER BY name ASC').all();
    res.json({ templates });
  } catch (e) {
    console.error('❌ GET /api/marketing/templates error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/templates/:id', auth, async (req, res) => {
  try {
    const t = await db.prepare('SELECT * FROM campaign_templates WHERE id=?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    res.json({ template: t });
  } catch (e) {
    console.error('❌ GET /api/marketing/templates/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/templates', auth, async (req, res) => {
  try {
    const { name, type='email', subject, body } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    await db.prepare('INSERT INTO campaign_templates (id,name,type,subject,body) VALUES (?,?,?,?,?)').run(id, name, type, subject||null, body||null);
    const template = await db.prepare('SELECT * FROM campaign_templates WHERE id=?').get(id);
    res.status(201).json({ template });
  } catch (e) {
    console.error('❌ POST /api/marketing/templates error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/templates/:id', auth, async (req, res) => {
  try {
    const t = await db.prepare('SELECT * FROM campaign_templates WHERE id=?').get(req.params.id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    const fields = ['name','type','subject','body'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (!Object.keys(updates).length) return res.json({ template: t });
    const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
    await db.prepare(`UPDATE campaign_templates SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
    const template = await db.prepare('SELECT * FROM campaign_templates WHERE id=?').get(req.params.id);
    res.json({ template });
  } catch (e) {
    console.error('❌ PATCH /api/marketing/templates/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/templates/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM campaign_templates WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/marketing/templates/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
