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
  const pageId = inbox.cfg.pageId || inbox.cfg.igAccountId || 'me';
  const recipientId = normalizeInstagramRecipientId(to);

  if (!pageAccessToken) throw new Error(`Instagram page access token not configured for inbox ${inboxId}`);
  if (!recipientId) throw new Error('Instagram recipient ID missing');

  // Use the specific page ID so the message is sent from the correct linked account
  const url = `${GRAPH_BASE}/${pageId}/messages`;
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
    const msg = data?.error?.message || JSON.stringify(data);
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
