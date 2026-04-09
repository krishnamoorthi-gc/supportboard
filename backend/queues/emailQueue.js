'use strict';

const redis = require('../config/redis');

// ── Redis key names ────────────────────────────────────────────────────────
const KEYS = {
  SEND_QUEUE:    'email:send:queue',    // LIST  – pending outbound jobs
  SEND_FAILED:   'email:send:failed',   // LIST  – failed jobs (last 50)
  SEND_DONE:     'email:send:done',     // STRING counter – total sent
};

// ─────────────────────────────────────────────────────────────────────────────
//  Outbound SMTP queue  (LPUSH to add, BRPOP to consume)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Push an email send job onto the queue.
 * @param {{ inboxId, to, cc, bcc, subject, text, html, inReplyTo, conversationId, messageId }} job
 */
async function enqueueSend(job) {
  await redis.lpush(KEYS.SEND_QUEUE, JSON.stringify({ ...job, enqueuedAt: Date.now() }));
}

/**
 * Blocking pop – used by the send worker loop.
 * Waits up to `timeoutSecs` for a job, returns null on timeout.
 */
async function dequeueSend(redisClient, timeoutSecs = 5) {
  const result = await redisClient.brpop(KEYS.SEND_QUEUE, timeoutSecs);
  if (!result) return null;
  try { return JSON.parse(result[1]); } catch { return null; }
}

/** Persist a failed job for inspection (cap at 50 entries). */
async function recordFailure(job, errorMsg) {
  const entry = JSON.stringify({ ...job, error: errorMsg, failedAt: Date.now() });
  await redis.lpush(KEYS.SEND_FAILED, entry);
  await redis.ltrim(KEYS.SEND_FAILED, 0, 49);
}

/** Increment the sent counter. */
async function recordSuccess() {
  await redis.incr(KEYS.SEND_DONE);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Queue stats (used by GET /api/email/queue-stats)
// ─────────────────────────────────────────────────────────────────────────────
async function getQueueStats() {
  const [waiting, failed, done] = await Promise.all([
    redis.llen(KEYS.SEND_QUEUE),
    redis.llen(KEYS.SEND_FAILED),
    redis.get(KEYS.SEND_DONE),
  ]);
  return {
    emailSend: {
      waiting,
      failed,
      totalSent: parseInt(done || '0', 10),
    },
  };
}

module.exports = { enqueueSend, dequeueSend, recordFailure, recordSuccess, getQueueStats, KEYS };
