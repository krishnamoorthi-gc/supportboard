'use strict';
/**
 * SMS Service — Twilio API
 *
 * Supports:
 *  - Sending SMS messages via Twilio REST API
 *  - Config key bridging (Settings UI keys ↔ Twilio-style keys)
 *  - Status callback URL for delivery tracking
 *  - Phone number normalization to E.164
 */

const db = require('../db');

function safeJson(v, fb) {
  try { return typeof v === 'string' ? JSON.parse(v) : v || fb; }
  catch { return fb; }
}

/** Load inbox row + parse config JSON */
async function getInboxConfig(inboxId) {
  const row = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
  if (!row) return null;
  const cfg = safeJson(row.config, {});
  return { ...row, cfg };
}

/**
 * Resolve Twilio credentials from inbox config.
 * Bridges Settings UI keys (apiKey, accessToken, phoneNumber)
 * to Twilio-style keys (accountSid, authToken, fromNumber).
 */
function resolveCredentials(cfg) {
  return {
    accountSid: cfg.accountSid || cfg.apiKey    || process.env.TWILIO_ACCOUNT_SID || '',
    authToken:  cfg.authToken  || cfg.accessToken || process.env.TWILIO_AUTH_TOKEN  || '',
    fromNumber: cfg.fromNumber || cfg.phoneNumber || process.env.TWILIO_FROM_NUMBER || '',
  };
}

/**
 * Normalize a phone number to E.164 format (digits only, with leading +).
 */
function normalizePhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) digits = '+' + digits;
  return digits;
}

/**
 * Send an SMS message via Twilio API.
 *
 * @param {object} opts
 * @param {string}   opts.inboxId       - Internal inbox id
 * @param {string}   opts.to            - Recipient phone number (E.164)
 * @param {string}   opts.text          - SMS body
 * @param {string}  [opts.statusCallback] - URL Twilio will POST delivery status to
 * @returns {object} Twilio API response (includes sid, status, etc.)
 */
async function sendSms({ inboxId, to, text, statusCallback }) {
  const ib = await getInboxConfig(inboxId);
  if (!ib) throw new Error('SMS inbox not found: ' + inboxId);

  const { accountSid, authToken, fromNumber } = resolveCredentials(ib.cfg);

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('SMS credentials not configured (accountSid/apiKey, authToken/accessToken, fromNumber/phoneNumber required)');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams();
  body.append('To', normalizePhone(to));
  body.append('From', normalizePhone(fromNumber));
  body.append('Body', text);

  // Add status callback so Twilio sends delivery updates
  if (statusCallback) {
    body.append('StatusCallback', statusCallback);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.message || JSON.stringify(data);
    throw new Error(`Twilio API ${res.status}: ${msg}`);
  }

  return data; // { sid, status, to, from, body, ... }
}

/**
 * Find an SMS inbox by its Twilio "From" phone number.
 * Used when receiving inbound messages or status callbacks.
 */
async function findInboxByPhone(toPhone) {
  const normalized = normalizePhone(toPhone);
  const inboxes = await db.prepare(
    "SELECT * FROM inboxes WHERE type='sms' AND active=1"
  ).all();

  for (const ib of inboxes) {
    const cfg = safeJson(ib.config, {});
    const { fromNumber } = resolveCredentials(cfg);
    if (normalizePhone(fromNumber) === normalized) {
      return { ...ib, cfg };
    }
  }
  return null;
}

module.exports = { sendSms, getInboxConfig, findInboxByPhone, normalizePhone, resolveCredentials };
