'use strict';
const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { uid } = require('../utils/helpers');

/* ─── tiny helper: wrap every handler so unhandled throws don't crash ───── */
const wrap = fn => async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (e) { console.error('settings error:', e.message); res.status(500).json({ error: e.message }); }
};

// ── AGENTS ─────────────────────────────────────────────────────────────────
router.get('/agents', auth, wrap(async (req, res) => {
  const agents = await db.prepare('SELECT id,name,email,role,avatar,color,status,phone,bio,two_fa_enabled,created_at FROM agents').all();
  res.json({ agents });
}));

router.post('/agents', auth, wrap(async (req, res) => {
  const { name, email, role='agent', password='demo123', color='#4c82fb' } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });
  const existing = await db.prepare('SELECT id FROM agents WHERE email=?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already exists' });
  const id = uid();
  const av = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  await db.prepare('INSERT INTO agents (id,name,email,password_hash,role,avatar,color) VALUES (?,?,?,?,?,?,?)').run(
    id, name, email.toLowerCase(), bcrypt.hashSync(password, 10), role, av, color
  );
  res.status(201).json({ agent: await db.prepare('SELECT id,name,email,role,avatar,color,status FROM agents WHERE id=?').get(id) });
}));

router.patch('/agents/:id', auth, wrap(async (req, res) => {
  const a = await db.prepare('SELECT * FROM agents WHERE id=?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','role','color','phone','bio','status','avatar'];
  const updates = { updated_at: new Date().toISOString() };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.password) updates.password_hash = bcrypt.hashSync(req.body.password, 10);
  if (req.body.two_fa_enabled !== undefined) updates.two_fa_enabled = req.body.two_fa_enabled ? 1 : 0;
  if (req.body.notification_prefs !== undefined) updates.notification_prefs = JSON.stringify(req.body.notification_prefs);
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE agents SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ agent: await db.prepare('SELECT id,name,email,role,avatar,color,status,phone,bio FROM agents WHERE id=?').get(req.params.id) });
}));

router.delete('/agents/:id', auth, wrap(async (req, res) => {
  if (req.params.id === req.agent.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await db.prepare('DELETE FROM agents WHERE id=?').run(req.params.id);
  res.json({ success: true });
}));

// ── TEAMS ──────────────────────────────────────────────────────────────────
router.get('/teams', auth, wrap(async (req, res) => {
  const teams = await db.prepare('SELECT * FROM teams ORDER BY name ASC').all();
  for (const t of teams) {
    t.members = (await db.prepare('SELECT agent_id FROM team_members WHERE team_id=?').all(t.id)).map(r=>r.agent_id);
  }
  res.json({ teams });
}));

router.post('/teams', auth, wrap(async (req, res) => {
  const { name, description, members=[] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  await db.prepare('INSERT INTO teams (id,name,description,agent_id) VALUES (?,?,?,?)').run(id, name, description||null, req.agent.id);
  for (const m of members) {
    try { await db.prepare('INSERT INTO team_members (team_id,agent_id) VALUES (?,?)').run(id, m); } catch {}
  }
  const team = await db.prepare('SELECT * FROM teams WHERE id=?').get(id);
  team.members = members;
  res.status(201).json({ team });
}));

router.patch('/teams/:id', auth, wrap(async (req, res) => {
  const t = await db.prepare('SELECT * FROM teams WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (req.body.name) await db.prepare('UPDATE teams SET name=? WHERE id=? AND agent_id=?').run(req.body.name, req.params.id, req.agent.id);
  if (req.body.description !== undefined) await db.prepare('UPDATE teams SET description=? WHERE id=? AND agent_id=?').run(req.body.description, req.params.id, req.agent.id);
  if (req.body.members) {
    await db.prepare('DELETE FROM team_members WHERE team_id=?').run(req.params.id);
    for (const m of req.body.members) {
      try { await db.prepare('INSERT INTO team_members (team_id,agent_id) VALUES (?,?)').run(req.params.id, m); } catch {}
    }
  }
  const updated = await db.prepare('SELECT * FROM teams WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  updated.members = (await db.prepare('SELECT agent_id FROM team_members WHERE team_id=?').all(req.params.id)).map(r=>r.agent_id);
  res.json({ team: updated });
}));

router.delete('/teams/:id', auth, wrap(async (req, res) => {
  const t = await db.prepare('SELECT id FROM teams WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  await db.prepare('DELETE FROM team_members WHERE team_id=?').run(req.params.id);
  await db.prepare('DELETE FROM teams WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
}));

// ── LABELS ─────────────────────────────────────────────────────────────────
router.get('/labels', auth, wrap(async (req, res) => {
  res.json({ labels: await db.prepare('SELECT * FROM labels WHERE agent_id=? ORDER BY title ASC').all(req.agent.id) });
}));

router.post('/labels', auth, wrap(async (req, res) => {
  const { title, color='#4c82fb' } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uid();
  await db.prepare('INSERT INTO labels (id,title,color,agent_id) VALUES (?,?,?,?)').run(id, title.toLowerCase(), color, req.agent.id);
  res.status(201).json({ label: await db.prepare('SELECT * FROM labels WHERE id=?').get(id) });
}));

router.patch('/labels/:id', auth, wrap(async (req, res) => {
  const existing = await db.prepare('SELECT id FROM labels WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { title, color } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (color !== undefined) updates.color = color;
  if (!Object.keys(updates).length) return res.json({ success: true });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE labels SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ label: await db.prepare('SELECT * FROM labels WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id) });
}));

router.delete('/labels/:id', auth, wrap(async (req, res) => {
  const existing = await db.prepare('SELECT id FROM labels WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await db.prepare('DELETE FROM labels WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
}));

// ── CANNED RESPONSES ───────────────────────────────────────────────────────
router.get('/canned', auth, wrap(async (req, res) => {
  const { q } = req.query;
  let rows = await db.prepare('SELECT * FROM canned_responses WHERE agent_id=? ORDER BY code ASC').all(req.agent.id);
  if (q) rows = rows.filter(r => r.code.includes(q.toLowerCase()) || r.content.toLowerCase().includes(q.toLowerCase()));
  res.json({ canned: rows });
}));

router.post('/canned', auth, wrap(async (req, res) => {
  const { code, content } = req.body;
  if (!code || !content) return res.status(400).json({ error: 'code and content required' });
  const id = uid();
  await db.prepare('INSERT INTO canned_responses (id,code,content,agent_id) VALUES (?,?,?,?)').run(id, code.toLowerCase(), content, req.agent.id);
  res.status(201).json({ canned: await db.prepare('SELECT * FROM canned_responses WHERE id=?').get(id) });
}));

router.patch('/canned/:id', auth, wrap(async (req, res) => {
  const existing = await db.prepare('SELECT id FROM canned_responses WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { code, content } = req.body;
  const updates = {};
  if (code !== undefined) updates.code = code;
  if (content !== undefined) updates.content = content;
  if (!Object.keys(updates).length) return res.json({ success: true });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE canned_responses SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ canned: await db.prepare('SELECT * FROM canned_responses WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id) });
}));

router.delete('/canned/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM canned_responses WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
}));

// canned-responses alias
router.get('/canned-responses', auth, wrap(async (req, res) => {
  const { q } = req.query;
  let rows = await db.prepare('SELECT * FROM canned_responses WHERE agent_id=? ORDER BY code ASC').all(req.agent.id);
  if (q) rows = rows.filter(r => r.code.includes(q.toLowerCase()) || r.content.toLowerCase().includes(q.toLowerCase()));
  res.json({ canned: rows });
}));
router.post('/canned-responses', auth, wrap(async (req, res) => {
  const { code, content } = req.body;
  if (!code || !content) return res.status(400).json({ error: 'code and content required' });
  const id = uid();
  await db.prepare('INSERT INTO canned_responses (id,code,content,agent_id) VALUES (?,?,?,?)').run(id, code.toLowerCase(), content, req.agent.id);
  res.status(201).json({ canned: await db.prepare('SELECT * FROM canned_responses WHERE id=?').get(id) });
}));
router.patch('/canned-responses/:id', auth, wrap(async (req, res) => {
  const existing = await db.prepare('SELECT id FROM canned_responses WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { code, content } = req.body;
  const updates = {};
  if (code !== undefined) updates.code = code;
  if (content !== undefined) updates.content = content;
  if (!Object.keys(updates).length) return res.json({ success: true });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE canned_responses SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ canned: await db.prepare('SELECT * FROM canned_responses WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id) });
}));
router.delete('/canned-responses/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM canned_responses WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
}));

// ── INBOXES ────────────────────────────────────────────────────────────────
router.get('/inboxes', auth, wrap(async (req, res) => {
  res.json({ inboxes: await db.prepare('SELECT * FROM inboxes WHERE agent_id=? ORDER BY name ASC').all(req.agent.id) });
}));

router.post('/inboxes', auth, wrap(async (req, res) => {
  const { name, type, color, greeting, config={} } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type required' });
  const id = uid();
  await db.prepare('INSERT INTO inboxes (id,name,type,color,greeting,config,agent_id) VALUES (?,?,?,?,?,?,?)').run(
    id, name, type, color||'#4c82fb', greeting||'', JSON.stringify(config), req.agent.id
  );
  res.status(201).json({ inbox: await db.prepare('SELECT * FROM inboxes WHERE id=?').get(id) });
}));

router.patch('/inboxes/:id', auth, wrap(async (req, res) => {
  const i = await db.prepare('SELECT * FROM inboxes WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!i) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','type','color','greeting','active'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.config !== undefined) updates.config = JSON.stringify(req.body.config);
  if (!Object.keys(updates).length) return res.json({ inbox: i });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE inboxes SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ inbox: await db.prepare('SELECT * FROM inboxes WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id) });
}));

router.delete('/inboxes/:id', auth, wrap(async (req, res) => {
  const existing = await db.prepare('SELECT id FROM inboxes WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await db.prepare('DELETE FROM inboxes WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
}));

// ── CUSTOM FIELDS ──────────────────────────────────────────────────────────
router.get('/custom-fields', auth, wrap(async (req, res) => {
  const { entity } = req.query;
  let rows = await db.prepare('SELECT * FROM custom_fields WHERE agent_id=? ORDER BY entity,name ASC').all(req.agent.id);
  if (entity) rows = rows.filter(r => r.entity === entity);
  for (const r of rows) { try { r.options = JSON.parse(r.options||'[]'); } catch { r.options=[]; } }
  res.json({ fields: rows });
}));

router.post('/custom-fields', auth, wrap(async (req, res) => {
  const { name, type, entity, required=0, description, options=[], group_name } = req.body;
  if (!name || !type || !entity) return res.status(400).json({ error: 'name, type, entity required' });
  const id = uid();
  await db.prepare('INSERT INTO custom_fields (id,name,type,entity,required,description,options,group_name,agent_id) VALUES (?,?,?,?,?,?,?,?,?)').run(
    id, name, type, entity, required?1:0, description||null, JSON.stringify(options), group_name||null, req.agent.id
  );
  res.status(201).json({ field: await db.prepare('SELECT * FROM custom_fields WHERE id=?').get(id) });
}));

router.patch('/custom-fields/:id', auth, wrap(async (req, res) => {
  const f = await db.prepare('SELECT * FROM custom_fields WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!f) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','type','entity','required','description','group_name'];
  const updates = {};
  for (const k of fields) if (req.body[k] !== undefined) updates[k] = req.body[k];
  if (req.body.required !== undefined) updates.required = req.body.required ? 1 : 0;
  if (req.body.options !== undefined) updates.options = JSON.stringify(req.body.options);
  if (!Object.keys(updates).length) return res.json({ field: f });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE custom_fields SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ field: await db.prepare('SELECT * FROM custom_fields WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id) });
}));

router.delete('/custom-fields/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM custom_fields WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
}));

// ── AUTOMATIONS ────────────────────────────────────────────────────────────
router.get('/automations', auth, wrap(async (req, res) => {
  const rows = await db.prepare('SELECT * FROM automations WHERE agent_id=? ORDER BY created_at DESC').all(req.agent.id);
  for (const r of rows) {
    try { r.conditions = JSON.parse(r.conditions||'[]'); } catch { r.conditions=[]; }
    try { r.actions = JSON.parse(r.actions||'[]'); } catch { r.actions=[]; }
  }
  res.json({ automations: rows });
}));

router.post('/automations', auth, wrap(async (req, res) => {
  const { name, trigger_type, conditions=[], actions=[], active=1 } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  await db.prepare('INSERT INTO automations (id,name,trigger_type,conditions,actions,active,agent_id) VALUES (?,?,?,?,?,?,?)').run(
    id, name, trigger_type||null, JSON.stringify(conditions), JSON.stringify(actions), active?1:0, req.agent.id
  );
  res.status(201).json({ automation: await db.prepare('SELECT * FROM automations WHERE id=?').get(id) });
}));

router.patch('/automations/:id', auth, wrap(async (req, res) => {
  const a = await db.prepare('SELECT * FROM automations WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.active !== undefined) updates.active = req.body.active ? 1 : 0;
  if (req.body.trigger_type !== undefined) updates.trigger_type = req.body.trigger_type;
  if (req.body.conditions !== undefined) updates.conditions = JSON.stringify(req.body.conditions);
  if (req.body.actions !== undefined) updates.actions = JSON.stringify(req.body.actions);
  if (!Object.keys(updates).length) return res.json({ automation: a });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE automations SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ automation: await db.prepare('SELECT * FROM automations WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id) });
}));

router.delete('/automations/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM automations WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
}));

// ── WEBHOOKS ───────────────────────────────────────────────────────────────
router.get('/webhooks', auth, wrap(async (req, res) => {
  const rows = await db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all();
  for (const r of rows) { try { r.events = JSON.parse(r.events||'[]'); } catch { r.events=[]; } }
  res.json({ webhooks: rows });
}));

router.post('/webhooks', auth, wrap(async (req, res) => {
  const { url, events=[], secret } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  const id = uid();
  await db.prepare('INSERT INTO webhooks (id,url,events,secret) VALUES (?,?,?,?)').run(id, url, JSON.stringify(events), secret||null);
  res.status(201).json({ webhook: await db.prepare('SELECT * FROM webhooks WHERE id=?').get(id) });
}));

router.patch('/webhooks/:id', auth, wrap(async (req, res) => {
  const w = await db.prepare('SELECT * FROM webhooks WHERE id=?').get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Not found' });
  const updates = {};
  if (req.body.url !== undefined) updates.url = req.body.url;
  if (req.body.active !== undefined) updates.active = req.body.active ? 1 : 0;
  if (req.body.events !== undefined) updates.events = JSON.stringify(req.body.events);
  if (!Object.keys(updates).length) return res.json({ webhook: w });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE webhooks SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ webhook: await db.prepare('SELECT * FROM webhooks WHERE id=?').get(req.params.id) });
}));

router.delete('/webhooks/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM webhooks WHERE id=?').run(req.params.id);
  res.json({ success: true });
}));

// ── API KEYS ───────────────────────────────────────────────────────────────
router.get('/api-keys', auth, wrap(async (req, res) => {
  const keys = await db.prepare('SELECT id,name,key_preview,scopes,last_used,created_at FROM api_keys ORDER BY created_at DESC').all();
  for (const k of keys) { try { k.scopes = JSON.parse(k.scopes||'[]'); } catch { k.scopes=[]; } }
  res.json({ keys });
}));

router.post('/api-keys', auth, wrap(async (req, res) => {
  const { name, scopes=[] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  const rawKey = 'sd_live_' + require('crypto').randomBytes(24).toString('hex');
  const preview = rawKey.slice(0, 12) + '...' + rawKey.slice(-4);
  await db.prepare('INSERT INTO api_keys (id,name,key_hash,key_preview,scopes) VALUES (?,?,?,?,?)').run(
    id, name, bcrypt.hashSync(rawKey, 8), preview, JSON.stringify(scopes)
  );
  res.status(201).json({ key: { id, name, key: rawKey, preview, scopes } });
}));

router.patch('/api-keys/:id', auth, wrap(async (req, res) => {
  const k = await db.prepare('SELECT id,name,key_preview,scopes,last_used,created_at FROM api_keys WHERE id=?').get(req.params.id);
  if (!k) return res.status(404).json({ error: 'Not found' });
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.scopes !== undefined) updates.scopes = JSON.stringify(req.body.scopes);
  if (!Object.keys(updates).length) return res.json({ key: k });
  const sets = Object.keys(updates).map(col=>`${col}=?`).join(',');
  await db.prepare(`UPDATE api_keys SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updated = await db.prepare('SELECT id,name,key_preview,scopes,last_used,created_at FROM api_keys WHERE id=?').get(req.params.id);
  try { updated.scopes = JSON.parse(updated.scopes||'[]'); } catch { updated.scopes=[]; }
  res.json({ key: updated });
}));

router.delete('/api-keys/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM api_keys WHERE id=?').run(req.params.id);
  res.json({ success: true });
}));

// ── SLA POLICIES ───────────────────────────────────────────────────────────
router.get('/sla', auth, wrap(async (req, res) => {
  res.json({ policies: await db.prepare('SELECT * FROM sla_policies ORDER BY name ASC').all() });
}));

router.post('/sla', auth, wrap(async (req, res) => {
  const { name, first_response_minutes=60, resolution_minutes=480, conditions={} } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  await db.prepare('INSERT INTO sla_policies (id,name,first_response_minutes,resolution_minutes,conditions) VALUES (?,?,?,?,?)').run(
    id, name, first_response_minutes, resolution_minutes, JSON.stringify(conditions)
  );
  res.status(201).json({ policy: await db.prepare('SELECT * FROM sla_policies WHERE id=?').get(id) });
}));

router.patch('/sla/:id', auth, wrap(async (req, res) => {
  const p = await db.prepare('SELECT * FROM sla_policies WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.first_response_minutes !== undefined) updates.first_response_minutes = req.body.first_response_minutes;
  if (req.body.resolution_minutes !== undefined) updates.resolution_minutes = req.body.resolution_minutes;
  if (req.body.conditions !== undefined) updates.conditions = JSON.stringify(req.body.conditions);
  if (!Object.keys(updates).length) return res.json({ policy: p });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE sla_policies SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ policy: await db.prepare('SELECT * FROM sla_policies WHERE id=?').get(req.params.id) });
}));

router.delete('/sla/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM sla_policies WHERE id=?').run(req.params.id);
  res.json({ success: true });
}));

// ── BRANDS ─────────────────────────────────────────────────────────────────
router.get('/brands', auth, wrap(async (req, res) => {
  res.json({ brands: await db.prepare('SELECT * FROM brands ORDER BY name ASC').all() });
}));

router.post('/brands', auth, wrap(async (req, res) => {
  const { name, domain, color, logo, active=1 } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  await db.prepare('INSERT INTO brands (id,name,domain,color,logo,active) VALUES (?,?,?,?,?,?)').run(
    id, name, domain||null, color||'#4c82fb', logo||null, active?1:0
  );
  res.status(201).json({ brand: await db.prepare('SELECT * FROM brands WHERE id=?').get(id) });
}));

router.patch('/brands/:id', auth, wrap(async (req, res) => {
  const b = await db.prepare('SELECT * FROM brands WHERE id=?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','domain','color','logo','active'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (!Object.keys(updates).length) return res.json({ brand: b });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE brands SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  res.json({ brand: await db.prepare('SELECT * FROM brands WHERE id=?').get(req.params.id) });
}));

router.delete('/brands/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM brands WHERE id=?').run(req.params.id);
  res.json({ success: true });
}));

// ── SIGNATURES ─────────────────────────────────────────────────────────────
router.get('/signatures', auth, wrap(async (req, res) => {
  const rows = await db.prepare('SELECT * FROM signatures WHERE agent_id=? ORDER BY name ASC').all(req.agent.id);
  for (const r of rows) { try { r.socials = JSON.parse(r.socials||'{}'); } catch { r.socials={}; } }
  res.json({ signatures: rows });
}));

router.post('/signatures', auth, wrap(async (req, res) => {
  const { name, body, agent_id, socials={}, logo=0, is_default=0 } = req.body;
  if (!name || !body) return res.status(400).json({ error: 'name and body required' });
  const id = uid();
  await db.prepare('INSERT INTO signatures (id,agent_id,name,body,socials,logo,is_default) VALUES (?,?,?,?,?,?,?)').run(
    id, agent_id||req.agent.id, name, body, JSON.stringify(socials), logo?1:0, is_default?1:0
  );
  res.status(201).json({ signature: await db.prepare('SELECT * FROM signatures WHERE id=?').get(id) });
}));

router.patch('/signatures/:id', auth, wrap(async (req, res) => {
  const s = await db.prepare('SELECT * FROM signatures WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  const fields = ['name','body','logo','is_default','active'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.socials !== undefined) updates.socials = JSON.stringify(req.body.socials);
  if (!Object.keys(updates).length) return res.json({ signature: s });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE signatures SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
  res.json({ signature: await db.prepare('SELECT * FROM signatures WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id) });
}));

router.delete('/signatures/:id', auth, wrap(async (req, res) => {
  await db.prepare('DELETE FROM signatures WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  res.json({ success: true });
}));

// ── AUDIT LOG ──────────────────────────────────────────────────────────────
router.get('/audit-log', auth, wrap(async (req, res) => {
  const { limit=50 } = req.query;
  const logs = await db.prepare(`
    SELECT al.*, a.name as agent_name FROM audit_logs al
    LEFT JOIN agents a ON al.agent_id = a.id
    WHERE al.agent_id=?
    ORDER BY al.created_at DESC LIMIT ?
  `).all(req.agent.id, parseInt(limit));
  for (const l of logs) { try { l.details = JSON.parse(l.details||'{}'); } catch { l.details={}; } }
  res.json({ logs });
}));

// ── BOTS ──
function parseBot(b) {
  if (!b) return null;
  const p = (val, fb) => { try { return typeof val === 'string' ? JSON.parse(val) : val || fb; } catch { return fb; } };
  return {
    ...b,
    nodes:     p(b.nodes, []),
    knowledge: p(b.knowledge, []),
    setup:     p(b.setup, { greeting: 'Hi! How can I help?', tone: 'friendly', fallback: 'Let me connect you to a human agent.', collect_email: true, show_branding: true, human_handoff: true, typing_delay: true, read_receipts: true }),
    stats:     p(b.stats, { triggered: 0, completed: 0, handoff: 0, avgTime: '—' }),
  };
}

router.get('/bots', auth, async (req, res) => {
  try {
    const bots = await db.prepare('SELECT * FROM bots WHERE agent_id=? ORDER BY created_at DESC').all(req.agent.id);
    res.json({ bots: bots.map(parseBot) });
  } catch (e) {
    console.error('❌ GET /api/settings/bots error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/bots', auth, async (req, res) => {
  try {
    const { name, desc, status = 'draft', template, nodes = [], knowledge = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uid();
    const embed_token = uid().replace(/-/g, '');
    const defaultStats = JSON.stringify({ triggered: 0, completed: 0, handoff: 0, avgTime: '—' });
    await db.prepare(
      'INSERT INTO bots (id,name,description,status,template,nodes,knowledge,setup,embed_token,stats,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).run(id, name, desc || null, status, template || null, JSON.stringify(nodes), JSON.stringify(knowledge), JSON.stringify({ greeting: 'Hi! How can I help?', tone: 'friendly', fallback: 'Let me connect you to a human agent.', collect_email: true, show_branding: true, human_handoff: true, typing_delay: true, read_receipts: true, ...(req.body.setup || {}) }), embed_token, defaultStats, req.agent.id);
    const bot = await db.prepare('SELECT * FROM bots WHERE id=?').get(id);
    res.status(201).json({ bot: parseBot(bot) });
  } catch (e) {
    console.error('❌ POST /api/settings/bots error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/bots/:id', auth, async (req, res) => {
  try {
    const bot = await db.prepare('SELECT * FROM bots WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!bot) return res.status(404).json({ error: 'Not found' });
    const allowed = ['name', 'description', 'status', 'template'];
    const updates = {};
    for (const f of allowed) if (req.body[f] !== undefined) updates[f] = req.body[f];
    if (req.body.nodes !== undefined) updates.nodes = JSON.stringify(req.body.nodes);
    if (req.body.knowledge !== undefined) updates.knowledge = JSON.stringify(req.body.knowledge);
    if (req.body.setup     !== undefined) updates.setup     = JSON.stringify(req.body.setup);
    if (req.body.stats     !== undefined) updates.stats     = JSON.stringify(req.body.stats);
    updates.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (Object.keys(updates).length <= 1) return res.json({ bot: parseBot(bot) }); // only updated_at
    const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
    await db.prepare(`UPDATE bots SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
    const updated = await db.prepare('SELECT * FROM bots WHERE id=?').get(req.params.id);
    res.json({ bot: parseBot(updated) });
  } catch (e) {
    console.error('❌ PATCH /api/settings/bots error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/bots/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM bots WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/settings/bots error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
