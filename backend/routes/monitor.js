const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');
const { broadcastToAll } = require('../ws');

// GET /api/monitor/visitors — list all visitors
router.get('/visitors', auth, async (req, res) => {
  try {
    const visitors = await db.prepare(
      `SELECT *, (last_seen >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)) AS is_active
       FROM visitor_sessions
       WHERE session_id IS NOT NULL AND session_id != '' AND ip IS NOT NULL AND ip != ''
       ORDER BY last_seen DESC`
    ).all();
    res.json({ visitors, total: visitors.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/monitor/visitors/:id/status — set chatStatus (browsing/invited/chatting)
router.patch('/visitors/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['browsing', 'invited', 'chatting'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });
    await db.prepare('UPDATE visitor_sessions SET status=? WHERE id=?').run(status, req.params.id);
    const v = await db.prepare('SELECT * FROM visitor_sessions WHERE id=?').get(req.params.id);
    if (v) broadcastToAll({ type: 'visitor_update', action: 'status', visitor: v });
    res.json({ success: true, visitor: v });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/monitor/visitors/:id — remove a session
router.delete('/visitors/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM visitor_sessions WHERE id=?').run(req.params.id);
    broadcastToAll({ type: 'visitor_update', action: 'leave', visitorId: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/monitor/sessions — clear ALL active sessions (admin reset)
router.delete('/sessions', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM visitor_sessions').run();
    broadcastToAll({ type: 'visitor_update', action: 'clear' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/monitor/snippet — embed code for websites (public, no auth needed)
router.get('/snippet', async (req, res) => {
  const backendUrl = process.env.PUBLIC_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4002}`;
  const snippet = `<!-- SupportDesk Live Visitor Tracking -->\n<script src="${backendUrl}/tracker.js" async></script>`;
  res.json({ snippet, backendUrl, trackerUrl: `${backendUrl}/tracker.js` });
});

// ── Monitor Sites CRUD ──────────────────────────────────────────────────

// GET /api/monitor/sites — list all tracked sites
router.get('/sites', auth, async (req, res) => {
  try {
    const sites = await db.prepare('SELECT * FROM monitor_sites ORDER BY created_at DESC').all();
    res.json({ sites });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/monitor/sites — add a new site
router.post('/sites', auth, async (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });
    const id = 'site_' + uid();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.prepare(
      'INSERT INTO monitor_sites (id, name, url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name.trim(), url.trim(), 'active', now, now);
    const site = await db.prepare('SELECT * FROM monitor_sites WHERE id=?').get(id);
    res.json({ success: true, site });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/monitor/sites/:id — update a site
router.patch('/sites/:id', auth, async (req, res) => {
  try {
    const { name, url, status } = req.body;
    const updates = [];
    const params = [];
    if (name !== undefined) { updates.push('name=?'); params.push(name.trim()); }
    if (url !== undefined) { updates.push('url=?'); params.push(url.trim()); }
    if (status !== undefined) { updates.push('status=?'); params.push(status); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    updates.push('updated_at=?');
    params.push(new Date().toISOString().slice(0, 19).replace('T', ' '));
    params.push(req.params.id);
    await db.prepare(`UPDATE monitor_sites SET ${updates.join(', ')} WHERE id=?`).run(...params);
    const site = await db.prepare('SELECT * FROM monitor_sites WHERE id=?').get(req.params.id);
    res.json({ success: true, site });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/monitor/sites/:id — remove a site
router.delete('/sites/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM monitor_sites WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
