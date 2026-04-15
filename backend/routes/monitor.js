const router = require('express').Router();
const db = require('../db');
const { uid } = require('../utils/helpers');
const { broadcastToAll } = require('../ws');

// GET /api/monitor/visitors — list visitors active in the last 3 minutes
router.get('/visitors', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 3 * 60 * 1000)
      .toISOString().slice(0, 19).replace('T', ' ');
    const visitors = await db.prepare(
      'SELECT * FROM visitor_sessions WHERE last_seen >= ? AND session_id IS NOT NULL AND session_id != "" AND ip IS NOT NULL AND ip != "" ORDER BY last_seen DESC'
    ).all(cutoff);
    res.json({ visitors, total: visitors.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/monitor/visitors/:id/status — set chatStatus (browsing/invited/chatting)
router.patch('/visitors/:id/status', async (req, res) => {
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
router.delete('/visitors/:id', async (req, res) => {
  try {
    await db.prepare('DELETE FROM visitor_sessions WHERE id=?').run(req.params.id);
    broadcastToAll({ type: 'visitor_update', action: 'leave', visitorId: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/monitor/sessions — clear ALL active sessions (admin reset)
router.delete('/sessions', async (req, res) => {
  try {
    await db.run('DELETE FROM visitor_sessions');
    broadcastToAll({ type: 'visitor_update', action: 'clear' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/monitor/snippet — embed code for websites
router.get('/snippet', async (req, res) => {
  const backendUrl = process.env.PUBLIC_URL || process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4002}`;
  const snippet = `<!-- SupportDesk Live Visitor Tracking -->\n<script src="${backendUrl}/tracker.js" async></script>`;
  res.json({ snippet, backendUrl, trackerUrl: `${backendUrl}/tracker.js` });
});

module.exports = router;
