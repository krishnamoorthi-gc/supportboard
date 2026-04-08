const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { uid } = require('../utils/helpers');

// ── AGENTS ──
router.get('/agents', auth, (req, res) => {
  const agents = db.prepare('SELECT id,name,email,role,avatar,color,status,phone,bio,two_fa_enabled,created_at FROM agents').all();
  res.json({ agents });
});

router.post('/agents', auth, (req, res) => {
  const { name, email, role='agent', password='demo123', color='#4c82fb' } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  if (db.prepare('SELECT id FROM agents WHERE email=?').get(email.toLowerCase())) return res.status(409).json({ error: 'Email already exists' });
  const id = uid();
  const av = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  db.prepare('INSERT INTO agents (id,name,email,password_hash,role,avatar,color) VALUES (?,?,?,?,?,?,?)').run(
    id, name, email.toLowerCase(), bcrypt.hashSync(password, 10), role, av, color
  );
  res.status(201).json({ agent: db.prepare('SELECT id,name,email,role,avatar,color,status FROM agents WHERE id=?').get(id) });
});

router.patch('/agents/:id', auth, (req, res) => {
  const a = db.prepare('SELECT * FROM agents WHERE id=?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','role','color','phone','bio','status','avatar'];
  const updates = { updated_at: new Date().toISOString() };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.password) updates.password_hash = bcrypt.hashSync(req.body.password, 10);
  if (req.body.two_fa_enabled !== undefined) updates.two_fa_enabled = req.body.two_fa_enabled ? 1 : 0;
  if (req.body.notification_prefs !== undefined) updates.notification_prefs = JSON.stringify(req.body.notification_prefs);
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE agents SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ agent: db.prepare('SELECT id,name,email,role,avatar,color,status,phone,bio FROM agents WHERE id=?').get(req.params.id) });
});

router.delete('/agents/:id', auth, (req, res) => {
  if (req.params.id === req.agent.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  db.prepare('DELETE FROM agents WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── TEAMS ──
router.get('/teams', auth, (req, res) => {
  const teams = db.prepare('SELECT * FROM teams').all();
  for (const t of teams) {
    t.members = db.prepare('SELECT agent_id FROM team_members WHERE team_id=?').all(t.id).map(r=>r.agent_id);
  }
  res.json({ teams });
});

router.post('/teams', auth, (req, res) => {
  const { name, description, members=[] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO teams (id,name,description) VALUES (?,?,?)').run(id, name, description||null);
  const insertMember = db.prepare('INSERT INTO team_members VALUES (?,?)');
  for (const m of members) insertMember.run(id, m);
  res.status(201).json({ team: { ...db.prepare('SELECT * FROM teams WHERE id=?').get(id), members } });
});

router.patch('/teams/:id', auth, (req, res) => {
  const t = db.prepare('SELECT * FROM teams WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (req.body.name) db.prepare('UPDATE teams SET name=? WHERE id=?').run(req.body.name, req.params.id);
  if (req.body.description !== undefined) db.prepare('UPDATE teams SET description=? WHERE id=?').run(req.body.description, req.params.id);
  if (req.body.members) {
    db.prepare('DELETE FROM team_members WHERE team_id=?').run(req.params.id);
    for (const m of req.body.members) db.prepare('INSERT INTO team_members VALUES (?,?)').run(req.params.id, m);
  }
  res.json({ team: db.prepare('SELECT * FROM teams WHERE id=?').get(req.params.id) });
});

router.delete('/teams/:id', auth, (req, res) => {
  db.prepare('DELETE FROM team_members WHERE team_id=?').run(req.params.id);
  db.prepare('DELETE FROM teams WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── LABELS ──
router.get('/labels', auth, (req, res) => {
  res.json({ labels: db.prepare('SELECT * FROM labels ORDER BY title ASC').all() });
});

router.post('/labels', auth, (req, res) => {
  const { title, color='#4c82fb' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uid();
  db.prepare('INSERT INTO labels (id,title,color) VALUES (?,?,?)').run(id, title.toLowerCase(), color);
  res.status(201).json({ label: db.prepare('SELECT * FROM labels WHERE id=?').get(id) });
});

router.patch('/labels/:id', auth, (req, res) => {
  const { title, color } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (color !== undefined) updates.color = color;
  if (!Object.keys(updates).length) return res.json({ success: true });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE labels SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ label: db.prepare('SELECT * FROM labels WHERE id=?').get(req.params.id) });
});

router.delete('/labels/:id', auth, (req, res) => {
  db.prepare('DELETE FROM labels WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── CANNED RESPONSES ──
router.get('/canned', auth, (req, res) => {
  const { q } = req.query;
  let rows = db.prepare('SELECT * FROM canned_responses ORDER BY code ASC').all();
  if (q) rows = rows.filter(r => r.code.includes(q.toLowerCase()) || r.content.toLowerCase().includes(q.toLowerCase()));
  res.json({ canned: rows });
});

router.post('/canned', auth, (req, res) => {
  const { code, content } = req.body;
  if (!code || !content) return res.status(400).json({ error: 'code and content required' });
  const id = uid();
  db.prepare('INSERT INTO canned_responses (id,code,content) VALUES (?,?,?)').run(id, code.toLowerCase(), content);
  res.status(201).json({ canned: db.prepare('SELECT * FROM canned_responses WHERE id=?').get(id) });
});

router.patch('/canned/:id', auth, (req, res) => {
  const { code, content } = req.body;
  const updates = {};
  if (code !== undefined) updates.code = code;
  if (content !== undefined) updates.content = content;
  if (!Object.keys(updates).length) return res.json({ success: true });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE canned_responses SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ canned: db.prepare('SELECT * FROM canned_responses WHERE id=?').get(req.params.id) });
});

router.delete('/canned/:id', auth, (req, res) => {
  db.prepare('DELETE FROM canned_responses WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── INBOXES ──
router.get('/inboxes', auth, (req, res) => {
  res.json({ inboxes: db.prepare('SELECT * FROM inboxes ORDER BY name ASC').all() });
});

router.post('/inboxes', auth, (req, res) => {
  const { name, type, color, greeting, config={} } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const id = uid();
  db.prepare('INSERT INTO inboxes (id,name,type,color,greeting,config) VALUES (?,?,?,?,?,?)').run(id, name, type, color||'#4c82fb', greeting||'', JSON.stringify(config));
  res.status(201).json({ inbox: db.prepare('SELECT * FROM inboxes WHERE id=?').get(id) });
});

router.patch('/inboxes/:id', auth, (req, res) => {
  const i = db.prepare('SELECT * FROM inboxes WHERE id=?').get(req.params.id);
  if (!i) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','type','color','greeting','active'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.config !== undefined) updates.config = JSON.stringify(req.body.config);
  if (!Object.keys(updates).length) return res.json({ inbox: i });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE inboxes SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ inbox: db.prepare('SELECT * FROM inboxes WHERE id=?').get(req.params.id) });
});

router.delete('/inboxes/:id', auth, (req, res) => {
  db.prepare('DELETE FROM inboxes WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── CUSTOM FIELDS ──
router.get('/custom-fields', auth, (req, res) => {
  const { entity } = req.query;
  let rows = db.prepare('SELECT * FROM custom_fields ORDER BY entity,name ASC').all();
  if (entity) rows = rows.filter(r => r.entity === entity);
  for (const r of rows) { try { r.options = JSON.parse(r.options||'[]'); } catch { r.options=[]; } }
  res.json({ fields: rows });
});

router.post('/custom-fields', auth, (req, res) => {
  const { name, type, entity, required=0, description, options=[], group_name } = req.body;
  if (!name || !type || !entity) return res.status(400).json({ error: 'name, type, entity required' });
  const id = uid();
  db.prepare('INSERT INTO custom_fields (id,name,type,entity,required,description,options,group_name) VALUES (?,?,?,?,?,?,?,?)').run(
    id, name, type, entity, required?1:0, description||null, JSON.stringify(options), group_name||null
  );
  res.status(201).json({ field: db.prepare('SELECT * FROM custom_fields WHERE id=?').get(id) });
});

router.delete('/custom-fields/:id', auth, (req, res) => {
  db.prepare('DELETE FROM custom_fields WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── AUTOMATIONS ──
router.get('/automations', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM automations ORDER BY created_at DESC').all();
  for (const r of rows) {
    try { r.conditions = JSON.parse(r.conditions||'[]'); } catch { r.conditions=[]; }
    try { r.actions = JSON.parse(r.actions||'[]'); } catch { r.actions=[]; }
  }
  res.json({ automations: rows });
});

router.post('/automations', auth, (req, res) => {
  const { name, trigger_type, conditions=[], actions=[], active=1 } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO automations (id,name,trigger_type,conditions,actions,active) VALUES (?,?,?,?,?,?)').run(
    id, name, trigger_type||null, JSON.stringify(conditions), JSON.stringify(actions), active?1:0
  );
  res.status(201).json({ automation: db.prepare('SELECT * FROM automations WHERE id=?').get(id) });
});

router.patch('/automations/:id', auth, (req, res) => {
  const a = db.prepare('SELECT * FROM automations WHERE id=?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.active !== undefined) updates.active = req.body.active ? 1 : 0;
  if (req.body.trigger_type !== undefined) updates.trigger_type = req.body.trigger_type;
  if (req.body.conditions !== undefined) updates.conditions = JSON.stringify(req.body.conditions);
  if (req.body.actions !== undefined) updates.actions = JSON.stringify(req.body.actions);
  if (!Object.keys(updates).length) return res.json({ automation: a });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE automations SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ automation: db.prepare('SELECT * FROM automations WHERE id=?').get(req.params.id) });
});

router.delete('/automations/:id', auth, (req, res) => {
  db.prepare('DELETE FROM automations WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── WEBHOOKS ──
router.get('/webhooks', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all();
  for (const r of rows) { try { r.events = JSON.parse(r.events||'[]'); } catch { r.events=[]; } }
  res.json({ webhooks: rows });
});

router.post('/webhooks', auth, (req, res) => {
  const { url, events=[], secret } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  const id = uid();
  db.prepare('INSERT INTO webhooks (id,url,events,secret) VALUES (?,?,?,?)').run(id, url, JSON.stringify(events), secret||null);
  res.status(201).json({ webhook: db.prepare('SELECT * FROM webhooks WHERE id=?').get(id) });
});

router.patch('/webhooks/:id', auth, (req, res) => {
  const w = db.prepare('SELECT * FROM webhooks WHERE id=?').get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Not found' });
  const updates = {};
  if (req.body.url !== undefined) updates.url = req.body.url;
  if (req.body.active !== undefined) updates.active = req.body.active ? 1 : 0;
  if (req.body.events !== undefined) updates.events = JSON.stringify(req.body.events);
  if (!Object.keys(updates).length) return res.json({ webhook: w });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE webhooks SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ webhook: db.prepare('SELECT * FROM webhooks WHERE id=?').get(req.params.id) });
});

router.delete('/webhooks/:id', auth, (req, res) => {
  db.prepare('DELETE FROM webhooks WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── API KEYS ──
router.get('/api-keys', auth, (req, res) => {
  const keys = db.prepare('SELECT id,name,key_preview,scopes,last_used,created_at FROM api_keys ORDER BY created_at DESC').all();
  for (const k of keys) { try { k.scopes = JSON.parse(k.scopes||'[]'); } catch { k.scopes=[]; } }
  res.json({ keys });
});

router.post('/api-keys', auth, (req, res) => {
  const { name, scopes=[] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  const rawKey = 'sd_live_' + require('crypto').randomBytes(24).toString('hex');
  const preview = rawKey.slice(0, 12) + '...' + rawKey.slice(-4);
  db.prepare('INSERT INTO api_keys (id,name,key_hash,key_preview,scopes) VALUES (?,?,?,?,?)').run(
    id, name, bcrypt.hashSync(rawKey, 8), preview, JSON.stringify(scopes)
  );
  res.status(201).json({ key: { id, name, key: rawKey, preview, scopes } });
});

router.delete('/api-keys/:id', auth, (req, res) => {
  db.prepare('DELETE FROM api_keys WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── SLA POLICIES ──
router.get('/sla', auth, (req, res) => {
  res.json({ policies: db.prepare('SELECT * FROM sla_policies ORDER BY name ASC').all() });
});

router.post('/sla', auth, (req, res) => {
  const { name, first_response_minutes=60, resolution_minutes=480, conditions={} } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO sla_policies (id,name,first_response_minutes,resolution_minutes,conditions) VALUES (?,?,?,?,?)').run(
    id, name, first_response_minutes, resolution_minutes, JSON.stringify(conditions)
  );
  res.status(201).json({ policy: db.prepare('SELECT * FROM sla_policies WHERE id=?').get(id) });
});

router.delete('/sla/:id', auth, (req, res) => {
  db.prepare('DELETE FROM sla_policies WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── BRANDS ──
router.get('/brands', auth, (req, res) => {
  res.json({ brands: db.prepare('SELECT * FROM brands ORDER BY name ASC').all() });
});

router.post('/brands', auth, (req, res) => {
  const { name, domain, color, logo, active=1 } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  db.prepare('INSERT INTO brands (id,name,domain,color,logo,active) VALUES (?,?,?,?,?,?)').run(id, name, domain||null, color||'#4c82fb', logo||null, active?1:0);
  res.status(201).json({ brand: db.prepare('SELECT * FROM brands WHERE id=?').get(id) });
});

router.patch('/brands/:id', auth, (req, res) => {
  const b = db.prepare('SELECT * FROM brands WHERE id=?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','domain','color','logo','active'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (!Object.keys(updates).length) return res.json({ brand: b });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE brands SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ brand: db.prepare('SELECT * FROM brands WHERE id=?').get(req.params.id) });
});

router.delete('/brands/:id', auth, (req, res) => {
  db.prepare('DELETE FROM brands WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── SIGNATURES ──
router.get('/signatures', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM signatures ORDER BY name ASC').all();
  for (const r of rows) { try { r.socials = JSON.parse(r.socials||'{}'); } catch { r.socials={}; } }
  res.json({ signatures: rows });
});

router.post('/signatures', auth, (req, res) => {
  const { name, body, agent_id, socials={}, logo=0, is_default=0 } = req.body;
  if (!name || !body) return res.status(400).json({ error: 'name and body required' });
  const id = uid();
  db.prepare('INSERT INTO signatures (id,agent_id,name,body,socials,logo,is_default) VALUES (?,?,?,?,?,?,?)').run(
    id, agent_id||req.agent.id, name, body, JSON.stringify(socials), logo?1:0, is_default?1:0
  );
  res.status(201).json({ signature: db.prepare('SELECT * FROM signatures WHERE id=?').get(id) });
});

router.patch('/signatures/:id', auth, (req, res) => {
  const s = db.prepare('SELECT * FROM signatures WHERE id=?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','body','logo','is_default','active'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.socials !== undefined) updates.socials = JSON.stringify(req.body.socials);
  if (!Object.keys(updates).length) return res.json({ signature: s });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  db.prepare(`UPDATE signatures SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ signature: db.prepare('SELECT * FROM signatures WHERE id=?').get(req.params.id) });
});

router.delete('/signatures/:id', auth, (req, res) => {
  db.prepare('DELETE FROM signatures WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── AUDIT LOG ──
router.get('/audit-log', auth, (req, res) => {
  const { limit = 50 } = req.query;
  const logs = db.prepare(`
    SELECT al.*, a.name as agent_name FROM audit_logs al
    LEFT JOIN agents a ON al.agent_id = a.id
    ORDER BY al.created_at DESC LIMIT ?
  `).all(parseInt(limit));
  for (const l of logs) { try { l.details = JSON.parse(l.details||'{}'); } catch { l.details={}; } }
  res.json({ logs });
});

module.exports = router;
