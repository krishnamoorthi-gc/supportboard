'use strict';
require('dotenv').config();

const cron   = require('node-cron');
const Redis  = require('ioredis');
const { dequeueSend, recordFailure, recordSuccess } = require('../queues/emailQueue');
const { pollInbox, sendEmail, getActiveEmailInboxes } = require('../services/emailService');

// ─────────────────────────────────────────────────────────────────────────────
//  SMTP Send Worker  –  BRPOP loop on email:send:queue
//  Uses a dedicated ioredis connection so BRPOP doesn't block shared client.
// ─────────────────────────────────────────────────────────────────────────────

let sendWorkerRunning = false;

async function startSendWorker() {
  if (sendWorkerRunning) return;
  sendWorkerRunning = true;

  // Dedicated blocking Redis connection
  const blockingClient = new Redis({
    host:     process.env.REDIS_HOST || '127.0.0.1',
    port:     parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });

  blockingClient.on('error', (err) => {
    console.error('[email-send worker] Redis error:', err.message);
  });

  console.log('📮 Email send worker started (BRPOP loop)');

  while (sendWorkerRunning) {
    try {
      const job = await dequeueSend(blockingClient, 5); // 5 s timeout
      if (!job) continue;

      const { to, subject } = job;
      console.log(`[email-send] Processing: "${subject}" → ${to}`);

      // ── Retry up to 3 times with 3 s delay ──────────────────────────────
      let lastErr;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await sendEmail(job);
          await recordSuccess();
          console.log(`[email-send] ✅ Sent to ${to} | msgId: ${result.smtpMessageId}`);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          console.warn(`[email-send] Attempt ${attempt}/3 failed: ${err.message}`);
          if (attempt < 3) await sleep(3000);
        }
      }

      if (lastErr) {
        console.error(`[email-send] ❌ All retries failed for ${to}: ${lastErr.message}`);
        await recordFailure(job, lastErr.message);
      }

    } catch (err) {
      // Ignore "Connection is closed" during shutdown
      if (!err.message.includes('closed') && !err.message.includes('destroy')) {
        console.error('[email-send worker] Unexpected error:', err.message);
      }
      await sleep(1000);
    }
  }
}

function stopSendWorker() {
  sendWorkerRunning = false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  IMAP Poll Scheduler  –  node-cron task per email inbox
// ─────────────────────────────────────────────────────────────────────────────

const pollTasks = new Map(); // inboxId → cron.ScheduledTask

/**
 * Schedule (or re-schedule) IMAP polling for one inbox.
 * @param {string} inboxId
 * @param {number} [intervalSecs=30]  poll interval in seconds (10–59 range uses cron seconds field)
 */
function scheduleInboxPolling(inboxId, intervalSecs) {
  const secs = intervalSecs || Math.floor(
    parseInt(process.env.EMAIL_POLL_INTERVAL_MS || '15000', 10) / 1000
  );

  // Stop existing task if any
  if (pollTasks.has(inboxId)) {
    pollTasks.get(inboxId).stop();
    pollTasks.delete(inboxId);
  }

  // Build cron expression:
  //   ≤59 s  → use 6-field cron  "*/N * * * * *"  (seconds field)
  //   ≥60 s  → use 5-field cron  "*/N * * * *"    (minutes field, rounded)
  let cronExpr;
  if (secs < 60) {
    cronExpr = `*/${secs} * * * * *`;          // every N seconds
  } else {
    const mins = Math.max(1, Math.round(secs / 60));
    cronExpr = `*/${mins} * * * *`;            // every N minutes
  }

  const task = cron.schedule(cronExpr, async () => {
    try {
      const result = await pollInbox(inboxId);
      if (result.processed > 0) {
        console.log(`[email-poll] Inbox ${inboxId}: ${result.processed} new message(s)`);
      }
    } catch (err) {
      console.error(`[email-poll] Inbox ${inboxId} error: ${err.message}`);
    }
  });

  pollTasks.set(inboxId, task);
  console.log(`📅 IMAP polling scheduled for inbox ${inboxId} every ${secs}s (cron: "${cronExpr}")`);
}

function unscheduleInboxPolling(inboxId) {
  const task = pollTasks.get(inboxId);
  if (task) {
    task.stop();
    pollTasks.delete(inboxId);
    console.log(`🗑️  Removed IMAP polling for inbox ${inboxId}`);
  }
}

function getScheduledInboxes() {
  return Array.from(pollTasks.keys());
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bootstrap – called from server.js after DB is ready
// ─────────────────────────────────────────────────────────────────────────────

async function startEmailSystem() {
  // 1. Start the SMTP send worker (non-blocking – runs in background)
  startSendWorker().catch((err) => console.error('[email-send worker] Fatal crash:', err.message));

  // 2. Schedule IMAP polling for every active email inbox
  try {
    const inboxes = await getActiveEmailInboxes();
    if (inboxes.length === 0) {
      console.log('📭 No active email inboxes – IMAP polling not started');
      return;
    }
    for (const inbox of inboxes) {
      scheduleInboxPolling(inbox.id);
    }
    console.log(`📬 IMAP polling active for ${inboxes.length} inbox(es)`);
  } catch (err) {
    console.warn('⚠️  Could not start IMAP polling:', err.message);
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = {
  startEmailSystem,
  scheduleInboxPolling,
  unscheduleInboxPolling,
  getScheduledInboxes,
  stopSendWorker,
};
