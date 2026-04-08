const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');

router.get('/', auth, async (req, res) => {
  const { from, to } = req.query;
  let where = '1=1'; const params = [];
  if (from) { where += ' AND start_time >= ?'; params.push(from); }
  if (to) { where += ' AND start_time <= ?'; params.push(to); }
  const events = await db.prepare(`SELECT * FROM calendar_events WHERE ${where} ORDER BY start_time ASC`).all(...params);
  for (const e of events) { try { e.attendees = JSON.parse(e.attendees||'[]'); } catch { e.attendees=[]; } }
  res.json({ events });
});

router.post('/', auth, async (req, res) => {
  const { title, description, start_time, end_time, all_day=0, type='meeting', color, attendees=[], location, recurrence } = req.body;
  if (!title || !start_time) return res.status(400).json({ error: 'title and start_time required' });
  const id = uid();
  await db.prepare('INSERT INTO calendar_events (id,title,description,start_time,end_time,all_day,type,color,attendees,location,recurrence,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, title, description||null, start_time, end_time||null, all_day?1:0, type, color||null, JSON.stringify(attendees), location||null, recurrence||null, req.agent.id
  );
  const ev = await db.prepare('SELECT * FROM calendar_events WHERE id=?').get(id);
  if (ev) { try { ev.attendees = JSON.parse(ev.attendees||'[]'); } catch { ev.attendees=[]; } }
  res.status(201).json({ event: ev });
});

router.patch('/:id', auth, async (req, res) => {
  const e = await db.prepare('SELECT * FROM calendar_events WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const fields = ['title','description','start_time','end_time','all_day','type','color','location','recurrence'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.attendees !== undefined) updates.attendees = JSON.stringify(req.body.attendees);
  if (!Object.keys(updates).length) return res.json({ event: e });
  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE calendar_events SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updatedEvent = await db.prepare('SELECT * FROM calendar_events WHERE id=?').get(req.params.id);
  if (updatedEvent) { try { updatedEvent.attendees = JSON.parse(updatedEvent.attendees||'[]'); } catch { updatedEvent.attendees=[]; } }
  res.json({ event: updatedEvent });
});

router.delete('/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM calendar_events WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
