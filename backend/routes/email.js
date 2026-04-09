'use strict';

const router = require('express').Router();
const auth   = require('../middleware/auth');
const { testConnection, pollInbox } = require('../services/emailService');
const { getQueueStats }             = require('../queues/emailQueue');
const {
  scheduleInboxPolling,
  unscheduleInboxPolling,
  getScheduledInboxes,
} = require('../workers/emailWorker');

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/email/test-connection
//  Body: { inboxId }
//  Runs a live IMAP + SMTP handshake and returns the result.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/test-connection', auth, async (req, res) => {
  try {
    const { inboxId } = req.body;
    if (!inboxId) return res.status(400).json({ error: 'inboxId is required' });

    const result = await testConnection(inboxId);
    const allOk  = result.imap && result.smtp;

    res.status(allOk ? 200 : 422).json({
      success: allOk,
      imap:    result.imap,
      smtp:    result.smtp,
      errors:  result.errors,
      message: allOk
        ? 'Connection successful! Both IMAP and SMTP are working.'
        : `Connection issues: ${result.errors.join('; ')}`,
    });
  } catch (err) {
    console.error('[POST /api/email/test-connection]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/email/poll-now
//  Body: { inboxId }
//  Immediately polls the inbox (runs synchronously, responds when done).
// ─────────────────────────────────────────────────────────────────────────────
router.post('/poll-now', auth, async (req, res) => {
  try {
    const { inboxId } = req.body;
    if (!inboxId) return res.status(400).json({ error: 'inboxId is required' });

    const result = await pollInbox(inboxId);
    res.json({ success: true, processed: result.processed });
  } catch (err) {
    console.error('[POST /api/email/poll-now]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/email/schedule-polling
//  Body: { inboxId, intervalSecs? }
//  Start (or restart) the cron job for an inbox.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/schedule-polling', auth, (req, res) => {
  try {
    const { inboxId, intervalSecs } = req.body;
    if (!inboxId) return res.status(400).json({ error: 'inboxId is required' });
    scheduleInboxPolling(inboxId, intervalSecs);
    res.json({ success: true, message: `Polling scheduled for inbox ${inboxId}` });
  } catch (err) {
    console.error('[POST /api/email/schedule-polling]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  DELETE /api/email/schedule-polling/:inboxId
//  Stop the cron job for an inbox.
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/schedule-polling/:inboxId', auth, (req, res) => {
  try {
    unscheduleInboxPolling(req.params.inboxId);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/email/schedule-polling]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/email/queue-stats
//  Returns Redis queue lengths + scheduled inbox list.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/queue-stats', auth, async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({
      ...stats,
      scheduledPolls: getScheduledInboxes(),
    });
  } catch (err) {
    console.error('[GET /api/email/queue-stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
