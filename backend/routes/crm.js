const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid, paginate } = require('../utils/helpers');

// ── DEALS ──
router.get('/deals', auth, async (req, res) => {
  const { stage, owner, q } = req.query;
  let where = '1=1'; const params = [];
  if (stage) { where += ' AND stage=?'; params.push(stage); }
  if (owner) { where += ' AND owner_id=?'; params.push(owner); }
  if (q) { where += ' AND title LIKE ?'; params.push(`%${q}%`); }
  const deals = await db.prepare(`
    SELECT d.*, c.name as contact_name, a.name as owner_name
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    LEFT JOIN agents a ON d.owner_id = a.id
    WHERE ${where} ORDER BY d.updated_at DESC
  `).all(...params);
  res.json({ deals });
});

router.get('/deals/:id', auth, async (req, res) => {
  const d = await db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json({ deal: d });
});

router.post('/deals', auth, async (req, res) => {
  const { title, value=0, currency='USD', stage='Prospecting', probability=20, contact_id, company_id, owner_id, expected_close, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uid();
  await db.prepare('INSERT INTO deals (id,title,value,currency,stage,probability,contact_id,company_id,owner_id,expected_close,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
    id, title, value, currency, stage, probability, contact_id||null, company_id||null, owner_id||req.agent.id, expected_close||null, notes||null
  );
  const deal = await db.prepare('SELECT * FROM deals WHERE id=?').get(id);
  res.status(201).json({ deal });
});

router.patch('/deals/:id', auth, async (req, res) => {
  const d = await db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  const fields = ['title', 'value', 'currency', 'stage', 'probability', 'contact_id', 'company_id', 'owner_id', 'expected_close', 'notes'];
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updates = { updated_at: now };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE deals SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updatedDeal = await db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  res.json({ deal: updatedDeal });
});

router.delete('/deals/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM deals WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── LEADS ──
router.get('/leads', auth, async (req, res) => {
  const { status, owner, q } = req.query;
  let where = '1=1'; const params = [];
  if (status) { where += ' AND status=?'; params.push(status); }
  if (owner) { where += ' AND owner_id=?'; params.push(owner); }
  if (q) { where += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)'; const lq=`%${q}%`; params.push(lq,lq,lq); }
  const leads = await db.prepare(`
    SELECT l.*, a.name as owner_name FROM leads l
    LEFT JOIN agents a ON l.owner_id = a.id
    WHERE ${where} ORDER BY l.updated_at DESC
  `).all(...params);
  res.json({ leads });
});

router.post('/leads', auth, async (req, res) => {
  const { name, email, phone, company, source, status='New', score=50, value=0, owner_id, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  await db.prepare('INSERT INTO leads (id,name,email,phone,company,source,status,score,value,owner_id,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
    id, name, email||null, phone||null, company||null, source||null, status, score, value, owner_id||req.agent.id, notes||null
  );
  const lead = await db.prepare('SELECT * FROM leads WHERE id=?').get(id);
  res.status(201).json({ lead });
});

router.patch('/leads/:id', auth, async (req, res) => {
  const l = await db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Not found' });
  const fields = ['name', 'email', 'phone', 'company', 'source', 'status', 'score', 'value', 'owner_id', 'notes'];
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updates = { updated_at: now };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE leads SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updatedLead = await db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  res.json({ lead: updatedLead });
});

router.delete('/leads/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM leads WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── TASKS ──
router.get('/tasks', auth, async (req, res) => {
  const { status, assignee, related_type, related_id } = req.query;
  let where = '1=1'; const params = [];
  if (status) { where += ' AND t.status=?'; params.push(status); }
  if (assignee) { where += ' AND t.assignee_id=?'; params.push(assignee); }
  if (related_type) { where += ' AND t.related_type=?'; params.push(related_type); }
  if (related_id) { where += ' AND t.related_id=?'; params.push(related_id); }
  const tasks = await db.prepare(`
    SELECT t.*, a.name as assignee_name FROM tasks t
    LEFT JOIN agents a ON t.assignee_id = a.id
    WHERE ${where} ORDER BY t.due_date ASC
  `).all(...params);
  res.json({ tasks });
});

router.post('/tasks', auth, async (req, res) => {
  const { title, description, due_date, priority='medium', status='todo', assignee_id, related_type, related_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uid();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.prepare('INSERT INTO tasks (id,title,description,due_date,priority,status,assignee_id,related_type,related_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
    id, title, description||null, due_date||null, priority, status, assignee_id||req.agent.id, related_type||null, related_id||null, now, now
  );
  const task = await db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  res.status(201).json({ task });
});

router.patch('/tasks/:id', auth, async (req, res) => {
  const t = await db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const fields = ['title', 'description', 'due_date', 'priority', 'status', 'assignee_id'];
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const updates = { updated_at: now };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE tasks SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updatedTask = await db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  res.json({ task: updatedTask });
});

router.delete('/tasks/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── MEETINGS ──
router.get('/meetings', auth, async (req, res) => {
  const meetings = await db.prepare('SELECT * FROM meetings ORDER BY start_time DESC').all();
  for (const m of meetings) { try { m.attendees = JSON.parse(m.attendees||'[]'); } catch { m.attendees=[]; } }
  res.json({ meetings });
});

router.post('/meetings', auth, async (req, res) => {
  const { title, description, start_time, end_time, location, meeting_link, attendees=[], status='scheduled', related_type, related_id } = req.body;
  if (!title || !start_time) return res.status(400).json({ error: 'title and start_time required' });
  const id = uid();
  await db.prepare('INSERT INTO meetings (id,title,description,start_time,end_time,location,meeting_link,attendees,status,related_type,related_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
    id, title, description||null, start_time, end_time||null, location||null, meeting_link||null, JSON.stringify(attendees), status, related_type||null, related_id||null
  );
  const m = await db.prepare('SELECT * FROM meetings WHERE id=?').get(id);
  if (m) { try { m.attendees = JSON.parse(m.attendees||'[]'); } catch { m.attendees=[]; } }
  res.status(201).json({ meeting: m });
});

router.patch('/meetings/:id', auth, async (req, res) => {
  const m = await db.prepare('SELECT * FROM meetings WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  const fields = ['title', 'description', 'start_time', 'end_time', 'location', 'meeting_link', 'status'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.attendees !== undefined) updates.attendees = JSON.stringify(req.body.attendees);
  if (!Object.keys(updates).length) return res.json({ meeting: m });
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE meetings SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updatedMeeting = await db.prepare('SELECT * FROM meetings WHERE id=?').get(req.params.id);
  if (updatedMeeting) { try { updatedMeeting.attendees = JSON.parse(updatedMeeting.attendees||'[]'); } catch { updatedMeeting.attendees=[]; } }
  res.json({ meeting: updatedMeeting });
});

router.delete('/meetings/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM meetings WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
