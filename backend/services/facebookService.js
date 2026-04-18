'use strict';
/**
 * Facebook Messenger service helpers
 * Handles outbound Messenger sends and page webhook subscription checks.
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

function normalizeFacebookRecipientId(value) {
  return String(value || '').trim().replace(/^fb:/i, '');
}

async function debugFacebookToken({ inputToken, appId, appSecret }) {
  if (!inputToken || !appId || !appSecret) return null;
  const appAccessToken = `${appId}|${appSecret}`;
  const url = new URL(`${GRAPH_BASE}/debug_token`);
  url.searchParams.set('input_token', inputToken);
  url.searchParams.set('access_token', appAccessToken);

  const res = await fetch(url, { method: 'GET' });
  const data = await res.json();
  if (!res.ok || data?.error) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`Facebook token debug failed: ${msg}`);
  }
  return data.data || null;
}

async function ensurePageWebhookSubscription({ pageId, pageAccessToken }) {
  if (!pageId) throw new Error('Facebook pageId not configured');
  if (!pageAccessToken) throw new Error('Facebook page access token not configured');

  const url = new URL(`${GRAPH_BASE}/${pageId}/subscribed_apps`);
  url.searchParams.set('subscribed_fields', 'messages,messaging_postbacks,message_deliveries,message_reads');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pageAccessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  if (!res.ok || data?.error) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(msg);
  }
  return data;
}

async function ensureAppWebhookSubscription({ appId, appSecret, callbackUrl, verifyToken }) {
  if (!appId || !appSecret) return null;
  if (!callbackUrl || !verifyToken) return null;

  const appAccessToken = `${appId}|${appSecret}`;
  const url = new URL(`${GRAPH_BASE}/${appId}/subscriptions`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: appAccessToken,
      object: 'page',
      callback_url: callbackUrl,
      verify_token: verifyToken,
      fields: 'messages,messaging_postbacks,message_deliveries,message_reads',
    }),
  });
  const data = await res.json();
  if (!res.ok || data?.error) {
    console.warn('[facebook] App subscription update failed:', data?.error?.message || JSON.stringify(data));
    return null;
  }
  console.log('[facebook] App-level webhook subscription updated with all fields');
  return data;
}

async function fetchPageInfo({ pageId, pageAccessToken }) {
  if (!pageId || !pageAccessToken) return null;
  try {
    const url = `${GRAPH_BASE}/${pageId}?fields=name,category,picture&access_token=${pageAccessToken}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.error) return null;
    return {
      pageName: data.name || '',
      pageCategory: data.category || '',
      pagePicture: data.picture?.data?.url || '',
    };
  } catch {
    return null;
  }
}

async function sendFacebookMessage({ inboxId, to, text, attachments = [] }) {
  const inbox = await getInboxConfig(inboxId);
  if (!inbox) throw new Error(`Facebook inbox ${inboxId} not found`);

  const pageAccessToken = inbox.cfg.accessToken || '';
  const recipientId = normalizeFacebookRecipientId(to);
  if (!pageAccessToken) throw new Error(`Facebook page access token not configured for inbox ${inboxId}`);
  if (!recipientId) throw new Error('Facebook recipient ID missing');

  const url = `${GRAPH_BASE}/me/messages`;
  const headers = {
    'Authorization': `Bearer ${pageAccessToken}`,
    'Content-Type': 'application/json',
  };

  const results = [];

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

    // (#200) Standard Access — app has no Advanced Access on pages_messaging
    if (code === 200 && /pages_messaging|Advanced Access|role on app/i.test(msg)) {
      throw new Error(
        'Meta app is in Standard Access mode — Messenger replies can only be sent to people who have a role on your Facebook App ' +
        '(Admin / Developer / Tester). Either add this user as a Tester on your App, or submit your App for Advanced Access review. ' +
        '[Graph API 403 (#200)]'
      );
    }
    // 24-hour messaging window expired
    if (code === 551 || sub === 2534022) {
      throw new Error(
        'Cannot send — the 24-hour Messenger window has expired. The user must send a new message to re-open the window. [Graph API (#551)]'
      );
    }
    // Keep #100 marker in the string so conversations.js "No matching user" hint still works
    throw new Error(`Meta Graph API ${res.status}: ${msg}${code ? ' (#' + code + ')' : ''}`);
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
  debugFacebookToken,
  ensureAppWebhookSubscription,
  ensurePageWebhookSubscription,
  fetchPageInfo,
  getInboxConfig,
  normalizeFacebookRecipientId,
  sendFacebookMessage,
};
