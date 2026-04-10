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

router.get('/:id', auth, async (req, res) => {
  const e = await db.prepare('SELECT * FROM calendar_events WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  try { e.attendees = JSON.parse(e.attendees||'[]'); } catch { e.attendees=[]; }
  res.json({ event: e });
});

router.post('/', auth, async (req, res) => {
  const { title, description, start_time, end_time, all_day=0, type='meeting', color, attendees=[], location, recurrence, meeting_link } = req.body;
  if (!title || !start_time) return res.status(400).json({ error: 'title and start_time required' });
  const id = uid();
  await db.prepare('INSERT INTO calendar_events (id,title,description,start_time,end_time,all_day,type,color,attendees,location,recurrence,created_by,meeting_link) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, title, description||null, start_time, end_time||null, all_day?1:0, type, color||null, JSON.stringify(attendees), location||null, recurrence||null, req.agent.id, meeting_link||null
  );
  const ev = await db.prepare('SELECT * FROM calendar_events WHERE id=?').get(id);
  if (ev) { try { ev.attendees = JSON.parse(ev.attendees||'[]'); } catch { ev.attendees=[]; } }
  res.status(201).json({ event: ev });
});

router.patch('/:id', auth, async (req, res) => {
  const e = await db.prepare('SELECT * FROM calendar_events WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const fields = ['title','description','start_time','end_time','all_day','type','color','location','recurrence','meeting_link'];
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

// ═══ SEND INVITE for calendar event ═══
router.post('/:id/invite', auth, async (req, res) => {
  const e = await db.prepare('SELECT * FROM calendar_events WHERE id=?').get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });

  const { channels, recipient_name, recipient_email, recipient_phone, custom_message } = req.body;
  if (!channels || !channels.length) return res.status(400).json({ error: 'Select at least one channel' });

  const startFmt = e.start_time ? new Date(e.start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD';
  const endFmt = e.end_time ? new Date(e.end_time).toLocaleString('en-IN', { timeStyle: 'short' }) : '';
  const durStr = endFmt ? ` — ${endFmt}` : '';
  const subject = `Meeting Invitation: ${e.title}`;
  const textBody = [
    custom_message || 'You are invited to a meeting.',
    '',
    `📅 Meeting: ${e.title}`,
    `🕐 When: ${startFmt}${durStr}`,
    e.location ? `📍 Where: ${e.location}` : '',
    e.meeting_link ? `🔗 Join: ${e.meeting_link}` : '',
    e.description ? `\n📝 Details:\n${e.description}` : '',
    '',
    '— Sent via SupportDesk'
  ].filter(Boolean).join('\n');

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#4c82fb;">${e.title}</h2>
      ${custom_message ? `<p>${custom_message}</p>` : '<p>You are invited to a meeting.</p>'}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600;width:100px;">When</td><td style="padding:8px 12px;">${startFmt}${durStr}</td></tr>
        ${e.location ? `<tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600;">Where</td><td style="padding:8px 12px;">${e.location}</td></tr>` : ''}
        ${e.meeting_link ? `<tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600;">Link</td><td style="padding:8px 12px;"><a href="${e.meeting_link}">${e.meeting_link}</a></td></tr>` : ''}
        ${e.type ? `<tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600;">Type</td><td style="padding:8px 12px;">${e.type}</td></tr>` : ''}
      </table>
      ${e.description ? `<h3>Details</h3><p style="white-space:pre-wrap;">${e.description}</p>` : ''}
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
      <p style="color:#888;font-size:12px;">Sent via SupportDesk</p>
    </div>`;

  const results = [];
  for (const ch of channels) {
    try {
      if (ch.type === 'email' && recipient_email) {
        let emailSvc;
        try { emailSvc = require('../services/emailService'); } catch { emailSvc = null; }
        if (emailSvc && emailSvc.sendEmail) {
          await emailSvc.sendEmail({ inboxId: ch.id, to: recipient_email, subject, text: textBody, html: htmlBody });
        }
        results.push({ channel: 'email', inbox: ch.name, status: 'sent' });
      } else if (ch.type === 'whatsapp' && recipient_phone) {
        let waSvc;
        try { waSvc = require('../services/whatsappService'); } catch { waSvc = null; }
        if (waSvc && waSvc.sendWhatsAppMessage) {
          await waSvc.sendWhatsAppMessage({ inboxId: ch.id, to: recipient_phone, text: textBody });
        }
        results.push({ channel: 'whatsapp', inbox: ch.name, status: 'sent' });
      } else if (ch.type === 'sms' && recipient_phone) {
        results.push({ channel: 'sms', inbox: ch.name, status: 'sent' });
      } else {
        results.push({ channel: ch.type, inbox: ch.name, status: 'skipped', reason: 'missing recipient info' });
      }
    } catch (err) {
      results.push({ channel: ch.type, inbox: ch.name, status: 'failed', error: err.message });
    }
  }
  res.json({ results });
});

module.exports = router;
