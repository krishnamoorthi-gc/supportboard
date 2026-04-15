'use strict';
/**
 * WhatsApp Cloud API webhook routes
 *
 * GET  /api/whatsapp/webhook  — Meta verification challenge (public)
 * POST /api/whatsapp/webhook  — Incoming messages from Meta (public)
 *
 * All authenticated outbound actions are handled inside conversations.js.
 */

const router = require('express').Router();
const db     = require('../db');
const { uid }                   = require('../utils/helpers');
const { broadcastToAll }        = require('../ws');
const { downloadInboundMedia, getInboxConfig } = require('../services/whatsappService');

// ── helpers ───────────────────────────────────────────────────────────────────

function safeJson(v, fb) {
  try { return typeof v === 'string' ? JSON.parse(v) : v || fb; } catch { return fb; }
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ── GET /api/whatsapp/webhook  (Meta verification) ────────────────────────────
router.get('/webhook', async (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe') {
    return res.status(400).send('Bad request: mode must be subscribe');
  }

  // Check token against any configured WhatsApp inbox
  try {
    const inboxes = await db.prepare(
      "SELECT config FROM inboxes WHERE type='whatsapp' AND active=1"
    ).all();

    for (const ib of inboxes) {
      const cfg = safeJson(ib.config, {});
      if (cfg.verifyToken && cfg.verifyToken === token) {
        console.log('[whatsapp] Webhook verified ✓');
        return res.status(200).send(challenge);
      }
    }

    // Fallback: also accept token from env
    if (process.env.WA_VERIFY_TOKEN && process.env.WA_VERIFY_TOKEN === token) {
      console.log('[whatsapp] Webhook verified via env ✓');
      return res.status(200).send(challenge);
    }
  } catch (e) {
    console.error('[whatsapp] Verification DB error:', e.message);
  }

  console.warn('[whatsapp] Webhook verification failed — token mismatch');
  return res.status(403).send('Forbidden');
});

// ── POST /api/whatsapp/webhook  (incoming events from Meta) ──────────────────
router.post('/webhook', async (req, res) => {
  // Immediately acknowledge — Meta requires 200 within 5 s
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body?.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;
        const val = change.value;

        const meta = val.metadata || {};
        const phoneNumberId = meta.phone_number_id;

        // ── Process delivery/read/failed status updates from Meta ────────
        if (val.statuses?.length) {
          for (const status of val.statuses) {
            await processStatusUpdate(status);
          }
        }

        // ── Process incoming messages ────────────────────────────────────
        if (!val.messages?.length) continue;

        // Find our inbox by phone_number_id stored in config
        const inbox = await findInboxByPhoneNumberId(phoneNumberId);
        if (!inbox) {
          console.warn('[whatsapp] No inbox found for phone_number_id:', phoneNumberId);
          continue;
        }

        const cfg         = safeJson(inbox.config, {});
        const accessToken = cfg.apiKey || cfg.accessToken || '';

        for (const wMsg of val.messages) {
          await processIncomingMessage(wMsg, val.contacts || [], inbox, accessToken);
        }
      }
    }
  } catch (err) {
    console.error('[whatsapp] Webhook processing error:', err.message);
  }
});

// ── delivery status processor ─────────────────────────────────────────────────

/**
 * Process Meta delivery status webhooks.
 * Meta sends: sent → delivered → read, or failed with error details.
 * Updates campaign_send_log and campaign stats accordingly.
 *
 * Status payload shape:
 *   { id: "wamid.xxx", status: "delivered"|"read"|"failed"|"sent",
 *     timestamp: "...", recipient_id: "919...",
 *     errors?: [{ code: 131047, title: "..." }] }
 */
async function processStatusUpdate(status) {
  const waMessageId = status.id;        // wamid.xxx
  const waStatus    = status.status;    // sent | delivered | read | failed
  const recipientId = status.recipient_id;
  const ts          = status.timestamp
    ? new Date(Number(status.timestamp) * 1000).toISOString().slice(0, 19).replace('T', ' ')
    : now();
  const errorMsg    = status.errors?.map(e => `${e.code}: ${e.title}`).join('; ') || null;

  console.log(`[whatsapp] 📨 Status: ${waStatus} for ${recipientId} (wamid: ${waMessageId})${errorMsg ? ' — Error: ' + errorMsg : ''}`);

  if (!waMessageId) return;

  try {
    // Look up the campaign send log entry by Meta message ID
    const logEntry = await db.prepare(
      'SELECT * FROM campaign_send_log WHERE wa_message_id=?'
    ).get(waMessageId);

    if (!logEntry) return; // Not a campaign message, skip

    if (waStatus === 'delivered') {
      await db.prepare(
        'UPDATE campaign_send_log SET status=?, delivered_at=? WHERE id=?'
      ).run('delivered', ts, logEntry.id);

      // Update campaign stats
      await updateCampaignStat(logEntry.campaign_id, 'delivered', 1);
      console.log(`[whatsapp] ✓ Campaign message delivered to ${recipientId}`);

    } else if (waStatus === 'read') {
      await db.prepare(
        'UPDATE campaign_send_log SET status=?, read_at=? WHERE id=?'
      ).run('read', ts, logEntry.id);

      // Increment read count; also ensure delivered is counted
      await updateCampaignStat(logEntry.campaign_id, 'read', 1);
      if (!logEntry.delivered_at) {
        await db.prepare(
          'UPDATE campaign_send_log SET delivered_at=? WHERE id=? AND delivered_at IS NULL'
        ).run(ts, logEntry.id);
        await updateCampaignStat(logEntry.campaign_id, 'delivered', 1);
      }
      console.log(`[whatsapp] ✓ Campaign message read by ${recipientId}`);

    } else if (waStatus === 'failed') {
      await db.prepare(
        'UPDATE campaign_send_log SET status=?, error_message=? WHERE id=?'
      ).run('failed', errorMsg, logEntry.id);

      // Move from sent → failed in campaign stats
      await updateCampaignStat(logEntry.campaign_id, 'sent', -1);
      await updateCampaignStat(logEntry.campaign_id, 'failed', 1);
      console.log(`[whatsapp] ✗ Campaign message failed for ${recipientId}: ${errorMsg}`);
    }

    // Broadcast status update to dashboard
    broadcastToAll({
      type: 'campaign_status_update',
      campaignId: logEntry.campaign_id,
      waMessageId,
      recipientPhone: recipientId,
      status: waStatus,
      error: errorMsg,
    });
  } catch (err) {
    console.error('[whatsapp] Status update processing error:', err.message);
  }
}

/** Increment/decrement a single stat field on the campaigns table */
async function updateCampaignStat(campaignId, field, delta) {
  try {
    const camp = await db.prepare('SELECT stats FROM campaigns WHERE id=?').get(campaignId);
    if (!camp) return;
    const stats = JSON.parse(camp.stats || '{}');
    stats[field] = (stats[field] || 0) + delta;
    if (stats[field] < 0) stats[field] = 0;
    await db.prepare('UPDATE campaigns SET stats=? WHERE id=?').run(JSON.stringify(stats), campaignId);
  } catch (e) {
    console.error('[whatsapp] updateCampaignStat error:', e.message);
  }
}

// ── core processor ────────────────────────────────────────────────────────────

async function processIncomingMessage(wMsg, waContacts, inbox, accessToken) {
  const fromPhone = wMsg.from;           // e.g. "919876543210"
  const waId      = wMsg.id;            // wamid.XXX — use as dedup key
  const msgType   = wMsg.type || 'text';
  const ts        = wMsg.timestamp
    ? new Date(Number(wMsg.timestamp) * 1000).toISOString().slice(0, 19).replace('T', ' ')
    : now();

  // ── dedup: skip if already processed ──────────────────────────────────────
  const existing = await db.prepare(
    'SELECT id FROM messages WHERE whatsapp_message_id=?'
  ).get(waId).catch(() => null);
  if (existing) return;

  // ── contact ───────────────────────────────────────────────────────────────
  const waContact = waContacts.find(c => c.wa_id === fromPhone);
  const senderName = waContact?.profile?.name || fromPhone;

  let contact = await db.prepare(
    'SELECT * FROM contacts WHERE phone=?'
  ).get('+' + fromPhone);

  if (!contact) {
    // Also try without leading +
    contact = await db.prepare('SELECT * FROM contacts WHERE phone=?').get(fromPhone);
  }

  if (!contact) {
    const ctId = 'ct' + uid();
    await db.prepare(
      'INSERT INTO contacts (id,name,phone,color,tags,agent_id) VALUES (?,?,?,?,?,?)'
    ).run(ctId, senderName, '+' + fromPhone, '#25d366', '["whatsapp"]', inbox.agent_id || null);
    contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(ctId);
  } else if (contact.name === contact.phone || contact.name === '+' + fromPhone) {
    // Update name if it was previously just the phone number
    if (senderName && senderName !== fromPhone) {
      await db.prepare('UPDATE contacts SET name=? WHERE id=?').run(senderName, contact.id);
      contact.name = senderName;
    }
  }

  // ── check if this is a campaign reply ──────────────────────────────────
  let campaignId = null;
  let campaignName = null;
  try {
    // Look for a recent campaign send to this phone (within 30 days)
    const campLog = await db.prepare(`
      SELECT l.campaign_id, c.name as campaign_name
      FROM campaign_send_log l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      WHERE (l.contact_phone=? OR l.contact_phone=?)
        AND l.channel='whatsapp'
        AND l.status='sent'
        AND l.sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY l.sent_at DESC LIMIT 1
    `).get('+' + fromPhone, fromPhone);
    if (campLog) {
      campaignId = campLog.campaign_id;
      campaignName = campLog.campaign_name;

      // Update campaign stats: increment reply count
      try {
        const camp = await db.prepare('SELECT stats FROM campaigns WHERE id=?').get(campaignId);
        if (camp) {
          const stats = JSON.parse(camp.stats || '{}');
          stats.replies = (stats.replies || 0) + 1;
          await db.prepare('UPDATE campaigns SET stats=? WHERE id=?').run(JSON.stringify(stats), campaignId);
        }
      } catch {}
    }
  } catch (e) {
    console.log('[whatsapp] Campaign lookup skipped:', e.message);
  }

  // ── conversation ──────────────────────────────────────────────────────────
  // Find open conversation for this contact + inbox within 30 days
  let conv = await db.prepare(`
    SELECT * FROM conversations
    WHERE contact_id=? AND inbox_id=? AND status='open'
    ORDER BY updated_at DESC LIMIT 1
  `).get(contact.id, inbox.id);

  if (!conv) {
    const cvId = 'cv' + uid();
    const subject = campaignName
      ? `Campaign Reply: ${campaignName} — ${senderName}`
      : `WhatsApp: ${senderName}`;
    await db.prepare(`
      INSERT INTO conversations
        (id, contact_id, inbox_id, subject, status, channel, campaign_id, campaign_name, assignee_id, agent_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(cvId, contact.id, inbox.id, subject, 'open', 'whatsapp',
           campaignId, campaignName,
           null, inbox.agent_id || null, ts, ts);
    conv = await db.prepare('SELECT * FROM conversations WHERE id=?').get(cvId);

    // Broadcast new conversation
    const fullConv = await buildFullConv(cvId);
    broadcastToAll({
      type: 'new_conversation',
      conversation_id: cvId,
      subject,
      contact_name: contact.name,
      contact_phone: '+' + fromPhone,
      campaign_id: campaignId,
      campaign_name: campaignName,
      conversation: fullConv,
    });
  } else if (campaignId && !conv.campaign_id) {
    // Tag existing conversation with campaign if not already tagged
    await db.prepare('UPDATE conversations SET campaign_id=?, campaign_name=? WHERE id=?')
      .run(campaignId, campaignName, conv.id);
  }

  // ── parse message body ────────────────────────────────────────────────────
  let text        = '';
  let attachments = [];

  if (msgType === 'text') {
    text = wMsg.text?.body || '';
  } else if (msgType === 'image' || msgType === 'video' || msgType === 'audio' ||
             msgType === 'document' || msgType === 'sticker') {
    const media = wMsg[msgType] || {};
    const mime  = media.mime_type || '';
    const att   = await downloadInboundMedia(media.id, accessToken, mime);
    if (att) {
      att.name    = media.filename || att.name;
      att.caption = media.caption  || wMsg.caption || '';
      attachments.push(att);
    }
    text = media.caption || '';
  } else if (msgType === 'location') {
    const loc = wMsg.location || {};
    text = `📍 Location: ${loc.name || ''} ${loc.address || ''} (${loc.latitude}, ${loc.longitude})`.trim();
  } else if (msgType === 'contacts') {
    const c0 = (wMsg.contacts || [])[0];
    const nm = c0?.name?.formatted_name || 'Contact';
    const ph = c0?.phones?.[0]?.phone || '';
    text = `📱 Shared contact: ${nm}${ph ? ' · ' + ph : ''}`;
  } else if (msgType === 'reaction') {
    // Reactions update an existing message — skip creating a new one
    return;
  } else {
    text = `[${msgType} message]`;
  }

  // ── save message ──────────────────────────────────────────────────────────
  const msgId = uid();
  await db.prepare(`
    INSERT INTO messages
      (id, conversation_id, role, text, attachments, whatsapp_message_id, is_read, created_at)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    msgId,
    conv.id,
    'customer',
    text,
    JSON.stringify(attachments),
    waId,
    0,
    ts
  );

  await db.prepare(
    'UPDATE conversations SET updated_at=?, unread_count=COALESCE(unread_count,0)+1 WHERE id=?'
  ).run(ts, conv.id);

  // ── broadcast to dashboard ────────────────────────────────────────────────
  const savedMsg = await db.prepare('SELECT * FROM messages WHERE id=?').get(msgId);
  try { savedMsg.attachments = JSON.parse(savedMsg.attachments || '[]'); } catch { savedMsg.attachments = []; }

  const fullConv = await buildFullConv(conv.id);

  broadcastToAll({
    type: 'new_message',
    conversationId: conv.id,
    message: savedMsg,
    conversation: fullConv,
  });

  console.log(`[whatsapp] ✓ Received ${msgType} from ${fromPhone} → conv ${conv.id}`);
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function findInboxByPhoneNumberId(phoneNumberId) {
  if (!phoneNumberId) return null;
  const rows = await db.prepare(
    "SELECT * FROM inboxes WHERE type='whatsapp' AND active=1"
  ).all();
  for (const row of rows) {
    const cfg = safeJson(row.config, {});
    if (cfg.phoneNumberId === phoneNumberId) return row;
  }
  return null;
}

async function buildFullConv(convId) {
  try {
    const cv = await db.prepare(`
      SELECT c.*, ct.name as contact_name, ct.email as contact_email,
             ct.phone as contact_phone, ct.avatar as contact_avatar, ct.color as contact_color,
             i.name as inbox_name, i.type as inbox_type, i.color as inbox_color,
             c.campaign_id, c.campaign_name
      FROM conversations c
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN inboxes i ON c.inbox_id = i.id
      WHERE c.id=?
    `).get(convId);
    if (cv) {
      try { cv.labels = JSON.parse(cv.labels || '[]'); } catch { cv.labels = []; }
    }
    return cv;
  } catch { return null; }
}

module.exports = router;
