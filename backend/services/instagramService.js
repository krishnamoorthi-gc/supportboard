'use strict';
/**
 * Instagram Messaging service helpers
 * Instagram Business messaging uses the same Meta Graph API as Facebook Messenger
 * but with instagram_manage_messages permission on the connected Facebook Page.
 *
 * Outbound: POST /v19.0/me/messages  (same as Facebook Messenger)
 * Inbound:  webhook object='instagram'
 *
 * Contacts are stored with phone = 'ig:<instagram_scoped_user_id>'
 */

const db = require('../db');

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

function safeJson(v, fb) {
  try { return typeof v === 'string' ? JSON.parse(v) : v || fb; }
  catch { return fb; }
}

async function getInboxConfig(inboxId) {
  const row = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
  if (!row) return null;
  return { ...row, cfg: safeJson(row.config, {}) };
}

function normalizeInstagramRecipientId(value) {
  return String(value || '').trim().replace(/^ig:/i, '');
}

/**
 * Send an Instagram DM via the Facebook Graph API.
 * The page access token must have instagram_manage_messages permission.
 */
async function sendInstagramMessage({ inboxId, to, text, attachments = [] }) {
  const inbox = await getInboxConfig(inboxId);
  if (!inbox) throw new Error(`Instagram inbox ${inboxId} not found`);

  const pageAccessToken = inbox.cfg.accessToken || inbox.cfg.pageAccessToken || '';
  const recipientId = normalizeInstagramRecipientId(to);

  if (!pageAccessToken) throw new Error(`Instagram page access token not configured for inbox ${inboxId}`);
  if (!recipientId) throw new Error('Instagram recipient ID missing');

  // /me/messages with a Page Access Token routes to the correct linked page automatically
  const url = `${GRAPH_BASE}/me/messages`;
  const headers = {
    'Authorization': `Bearer ${pageAccessToken}`,
    'Content-Type': 'application/json',
  };

  const results = [];

  // Send attachments first
  for (const att of attachments) {
    const attUrl = resolvePublicUrl(att.url);
    if (!attUrl) continue;

    const attachmentType = resolveAttachmentType(att.contentType || att.name || '');
    const body = {
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: {
        attachment: {
          type: attachmentType,
          payload: { url: attUrl, is_reusable: false },
        },
      },
    };

    const r = await graphPost(url, headers, body);
    results.push(r);
  }

  // Send text message
  if (text && text.trim()) {
    const body = {
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text: text.trim() },
    };
    const r = await graphPost(url, headers, body);
    results.push(r);
  }

  if (results.length === 0) throw new Error('Nothing to send (no text and no attachments)');
  return results[results.length - 1];
}

async function graphPost(url, headers, body) {
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok || data?.error) {
    const err  = data?.error || {};
    const code = err.code;
    const sub  = err.error_subcode;
    const msg  = err.message || JSON.stringify(data);

    // (#200) app is in Standard Access — can only message users with a role on the app
    if (code === 200 && /instagram_manage_messages/i.test(msg) && /Advanced Access|role on app/i.test(msg)) {
      throw new Error(
        'Meta app is in Standard Access mode — Instagram DMs can only be sent to people who have a role on your Facebook App ' +
        '(Admin / Developer / Tester). Either add this Instagram user as a Tester on your App (developers.facebook.com → Roles), ' +
        'or submit your App for Advanced Access review to message any user. [Graph API 403 (#200)]'
      );
    }
    // (#551) or subcode 2534022 — outside 24-hour messaging window (check BEFORE generic #10)
    if (code === 551 || sub === 2534022) {
      throw new Error(
        'Cannot send — the 24-hour Instagram messaging window has expired. The user must send a new DM to re-open the window. [Graph API (#551)]'
      );
    }
    // (#10) app does not have permission — permission missing on token
    if (code === 10) {
      throw new Error(
        `Meta token is missing a required permission: ${msg} — re-generate the Page Access Token with instagram_manage_messages and pages_messaging. [Graph API ${res.status} (#10)]`
      );
    }
    // (#100) no matching user — the user has never DM'd the business
    if (code === 100) {
      throw new Error(
        'Meta cannot deliver this message — the Instagram user has not messaged your business account yet, so there is no open 24-hour ' +
        'messaging window. They must send a DM first. [Graph API 400 (#100)]'
      );
    }

    throw new Error(`Meta Graph API ${res.status}: ${msg}`);
  }
  return data;
}

function resolvePublicUrl(relOrAbs) {
  if (!relOrAbs) return null;
  if (/^https?:\/\//i.test(relOrAbs)) return relOrAbs;
  const base = (process.env.PUBLIC_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}${relOrAbs.startsWith('/') ? '' : '/'}${relOrAbs}`;
}

function resolveAttachmentType(contentTypeOrName) {
  const s = String(contentTypeOrName || '').toLowerCase();
  if (s.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(s)) return 'image';
  if (s.startsWith('video/') || /\.(mp4|mov|avi|mkv)$/i.test(s)) return 'video';
  if (s.startsWith('audio/') || /\.(mp3|ogg|aac|m4a|opus)$/i.test(s)) return 'audio';
  return 'file';
}

module.exports = {
  getInboxConfig,
  normalizeInstagramRecipientId,
  sendInstagramMessage,
};
