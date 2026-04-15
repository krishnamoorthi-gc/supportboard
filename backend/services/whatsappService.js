'use strict';
/**
 * WhatsApp Cloud API service
 * Handles sending messages via Meta's Graph API
 * and downloading inbound media attachments.
 */

const fs   = require('fs');
const path = require('path');
const db   = require('../db');

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';
const uploadsDir = path.join(__dirname, '..', 'uploads');

// ── helpers ───────────────────────────────────────────────────────────────────

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

/** Resolve the phone_number_id for a given inbox */
async function getPhoneNumberId(inboxId) {
  const ib = await getInboxConfig(inboxId);
  if (!ib) return null;
  // Settings UI stores it as cfg.phoneNumberId
  return ib.cfg.phoneNumberId || null;
}

/** Resolve the access token for a given inbox */
async function getAccessToken(inboxId) {
  const ib = await getInboxConfig(inboxId);
  if (!ib) return null;
  return ib.cfg.apiKey || ib.cfg.accessToken || null;
}

// ── send ──────────────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp message via Meta Cloud API.
 *
 * @param {object} opts
 * @param {string}   opts.inboxId       - Internal inbox id
 * @param {string}   opts.to            - Recipient phone number (E.164, no +)
 * @param {string}   [opts.text]        - Plain-text body
 * @param {Array}    [opts.attachments] - Normalised attachment objects (url, contentType, name)
 * @returns {object}  Meta API response (messages[0].id etc.)
 */
async function sendWhatsAppMessage({ inboxId, to, text, attachments = [] }) {
  const phoneNumberId = await getPhoneNumberId(inboxId);
  const accessToken   = await getAccessToken(inboxId);

  if (!phoneNumberId) throw new Error('WhatsApp phoneNumberId not configured for inbox ' + inboxId);
  if (!accessToken)   throw new Error('WhatsApp access token not configured for inbox ' + inboxId);

  const url = `${GRAPH_BASE}/${phoneNumberId}/messages`;
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };

  const results = [];

  // ── send media attachments first ──────────────────────────────────────────
  for (const att of attachments) {
    const attUrl = resolvePublicUrl(att.url);
    if (!attUrl) continue;

    const mediaType = resolveMediaType(att.contentType || att.name || '');
    let body;

    if (mediaType === 'image') {
      body = { messaging_product: 'whatsapp', to, type: 'image', image: { link: attUrl, caption: att.name || '' } };
    } else if (mediaType === 'video') {
      body = { messaging_product: 'whatsapp', to, type: 'video', video: { link: attUrl, caption: att.name || '' } };
    } else if (mediaType === 'audio') {
      body = { messaging_product: 'whatsapp', to, type: 'audio', audio: { link: attUrl } };
    } else {
      // document — WhatsApp supports PDF, DOCX, XLSX, etc.
      body = { messaging_product: 'whatsapp', to, type: 'document', document: { link: attUrl, filename: att.name || 'attachment' } };
    }

    const r = await graphPost(url, headers, body);
    results.push(r);
  }

  // ── send text (always, even if attachments were sent) ─────────────────────
  if (text && text.trim()) {
    const body = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text.trim(), preview_url: false },
    };
    const r = await graphPost(url, headers, body);
    results.push(r);
  }

  if (results.length === 0) throw new Error('Nothing to send (no text and no attachments)');
  return results[results.length - 1]; // return last result (text msg id)
}

// ── download inbound media ────────────────────────────────────────────────────

/**
 * Download a media object from Meta (given its media_id) and save to uploads/.
 * Returns { url, name, size, contentType } or null on failure.
 */
async function downloadInboundMedia(mediaId, accessToken, mimeType) {
  try {
    // 1. Get temporary download URL
    const infoRes = await fetch(`${GRAPH_BASE}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!infoRes.ok) return null;
    const info = await infoRes.json();
    const downloadUrl = info.url;
    if (!downloadUrl) return null;

    // 2. Download the binary
    const dlRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!dlRes.ok) return null;

    const ext  = mimeTypeToExt(mimeType || info.mime_type || '');
    const name = `wa_${mediaId}${ext}`;
    const dest = path.join(uploadsDir, name);

    const buf = Buffer.from(await dlRes.arrayBuffer());
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(dest, buf);

    return {
      url:         `/uploads/${name}`,
      name,
      size:        buf.length,
      contentType: mimeType || info.mime_type || 'application/octet-stream',
      status:      'ready',
    };
  } catch (e) {
    console.error('[whatsapp] downloadInboundMedia error:', e.message);
    return null;
  }
}

// ── internals ─────────────────────────────────────────────────────────────────

async function graphPost(url, headers, body) {
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw new Error(`Meta Graph API ${res.status}: ${msg}`);
  }
  return data;
}

function resolvePublicUrl(relOrAbs) {
  if (!relOrAbs) return null;
  if (/^https?:\/\//i.test(relOrAbs)) return relOrAbs;
  // Convert relative /uploads/... path to absolute using PUBLIC_URL env
  const base = (process.env.PUBLIC_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    console.warn('[whatsapp] PUBLIC_URL not set — cannot build absolute URL for attachment');
    return null;
  }
  return `${base}${relOrAbs.startsWith('/') ? '' : '/'}${relOrAbs}`;
}

function resolveMediaType(contentTypeOrName) {
  const s = (contentTypeOrName || '').toLowerCase();
  if (s.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(s)) return 'image';
  if (s.startsWith('video/') || /\.(mp4|mov|avi|mkv)$/i.test(s))        return 'video';
  if (s.startsWith('audio/') || /\.(mp3|ogg|aac|m4a|opus)$/i.test(s))   return 'audio';
  return 'document';
}

function mimeTypeToExt(mime) {
  const map = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp',
    'video/mp4': '.mp4', 'audio/ogg': '.ogg', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  };
  return map[mime] || '';
}

// ── send template ─────────────────────────────────────────────────────────────

/**
 * Send an approved WhatsApp message template.
 *
 * @param {object} opts
 * @param {string}   opts.inboxId        - Internal inbox id
 * @param {string}   opts.to             - Recipient phone number (E.164, no +)
 * @param {string}   opts.templateName   - Approved Meta template name
 * @param {string}   opts.language       - Language code, e.g. 'en_US'
 * @param {Array}    [opts.bodyParams]   - Array of string values for {{1}}, {{2}} ... body variables
 * @param {Array}    [opts.headerParams] - Array of string values for {{1}} ... header text variables
 * @param {string}   [opts.headerType]   - Header type: NONE, TEXT, IMAGE, VIDEO, DOCUMENT
 * @param {string}   [opts.headerMediaUrl] - URL for IMAGE/VIDEO/DOCUMENT headers
 * @returns {object}  Meta API response
 */
async function sendWhatsAppTemplate({ inboxId, to, templateName, language = 'en_US', bodyParams = [], headerParams = [], headerType = 'NONE', headerMediaUrl = '' }) {
  const phoneNumberId = await getPhoneNumberId(inboxId);
  const accessToken   = await getAccessToken(inboxId);

  if (!phoneNumberId) throw new Error('WhatsApp phoneNumberId not configured for inbox ' + inboxId);
  if (!accessToken)   throw new Error('WhatsApp access token not configured for inbox ' + inboxId);

  const components = [];

  // Header component — handle TEXT vars and IMAGE/VIDEO/DOCUMENT media
  if (headerType === 'TEXT' && headerParams.length) {
    components.push({
      type: 'header',
      parameters: headerParams.map(v => ({ type: 'text', text: String(v) })),
    });
  } else if (headerType === 'IMAGE' && headerMediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'image', image: { link: headerMediaUrl } }],
    });
  } else if (headerType === 'VIDEO' && headerMediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'video', video: { link: headerMediaUrl } }],
    });
  } else if (headerType === 'DOCUMENT' && headerMediaUrl) {
    components.push({
      type: 'header',
      parameters: [{ type: 'document', document: { link: headerMediaUrl } }],
    });
  }

  if (bodyParams.length) {
    components.push({
      type: 'body',
      parameters: bodyParams.map(v => ({ type: 'text', text: String(v) })),
    });
  }

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      ...(components.length ? { components } : {}),
    },
  };

  const url     = `${GRAPH_BASE}/${phoneNumberId}/messages`;
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };

  return graphPost(url, headers, body);
}

module.exports = { sendWhatsAppMessage, sendWhatsAppTemplate, downloadInboundMedia, getInboxConfig, getAccessToken };
