'use strict';
/**
 * SMS Service
 * Supports Twilio API for sending SMS messages.
 * Falls back to logging if no credentials are configured.
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
 * Send an SMS message via Twilio API.
 *
 * @param {object} opts
 * @param {string}   opts.inboxId  - Internal inbox id
 * @param {string}   opts.to       - Recipient phone number (E.164)
 * @param {string}   opts.text     - SMS body
 * @returns {object} Twilio API response
 */
async function sendSms({ inboxId, to, text }) {
  const ib = await getInboxConfig(inboxId);
  if (!ib) throw new Error('SMS inbox not found: ' + inboxId);

  const cfg = ib.cfg;
  const accountSid = cfg.accountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken  = cfg.authToken  || process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = cfg.fromNumber || process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('SMS credentials not configured (accountSid, authToken, fromNumber required)');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams();
  body.append('To', to.startsWith('+') ? to : '+' + to);
  body.append('From', fromNumber);
  body.append('Body', text);

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

  return data;
}

module.exports = { sendSms, getInboxConfig };
