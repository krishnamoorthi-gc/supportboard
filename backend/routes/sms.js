'use strict';
/**
 * SMS (Twilio) webhook routes
 *
 * POST /api/sms/webhook   — Inbound SMS from Twilio (public, no auth)
 * POST /api/sms/status    — Delivery status callbacks from Twilio (public)
 *
 * Outbound sending is handled in conversations.js via smsService.sendSms().
 */

const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');
const { uid }              = require('../utils/helpers');
const { broadcastToAll, sendToAgent } = require('../ws');
const { findInboxByPhone, normalizePhone, sendSms, getInboxConfig, resolveCredentials } = require('../services/smsService');

// ── helpers ──────────────────────────────────────────────────────────────────

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function safeJson(v, fb) {
  try { return typeof v === 'string' ? JSON.parse(v) : v || fb; } catch { return fb; }
}

// ── POST /api/sms/test-connection  (verify Twilio credentials) ───────────────
router.post('/test-connection', auth, async (req, res) => {
  try {
    const { inboxId } = req.body;
    if (!inboxId) return res.status(400).json({ success: false, error: 'inboxId required' });

    const ib = await getInboxConfig(inboxId);
    if (!ib) return res.status(404).json({ success: false, error: 'Inbox not found' });

    const { accountSid, authToken, fromNumber } = resolveCredentials(ib.cfg);
    if (!accountSid || !authToken) {
      return res.json({ success: false, error: 'Account SID and Auth Token are required' });
    }

    // Verify credentials by calling Twilio's Account API
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    });
    const data = await resp.json();

    if (!resp.ok) {
      return res.json({ success: false, error: data?.message || `Twilio API ${resp.status}` });
    }

    res.json({
      success: true,
      account: data.friendly_name || data.sid,
      status: data.status,
      fromNumber: fromNumber || 'Not configured',
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── POST /api/sms/send-test  (send a real test SMS) ─────────────────────────
router.post('/send-test', auth, async (req, res) => {
  try {
    const { inboxId, to, text } = req.body;
    if (!inboxId || !to) return res.status(400).json({ success: false, error: 'inboxId and to are required' });

    const result = await sendSms({
      inboxId,
      to,
      text: text || 'Test SMS from SupportDesk',
    });

    res.json({
      success: true,
      sid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from,
    });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// ── POST /api/sms/webhook  (Twilio inbound SMS) ─────────────────────────────
//
// Twilio sends form-encoded POST with fields:
//   MessageSid, From, To, Body, NumMedia, MediaUrl0, MediaContentType0, etc.
//
router.post('/webhook', async (req, res) => {
  // Immediately acknowledge — Twilio expects 200 quickly
  res.status(200).type('text/xml').send('<Response></Response>');

  try {
    const {
      MessageSid,
      From: fromPhone,
      To: toPhone,
      Body: body,
      NumMedia,
    } = req.body;

    if (!fromPhone || !toPhone) return;

    console.log(`[sms] 📩 Inbound SMS from ${fromPhone} to ${toPhone}: "${(body || '').slice(0, 50)}..."`);

    // Find our SMS inbox by the "To" phone number
    const inbox = await findInboxByPhone(toPhone);
    if (!inbox) {
      console.warn('[sms] No inbox found for phone:', toPhone);
      return;
    }

    // ── dedup: skip if already processed ──
    if (MessageSid) {
      const existing = await db.prepare(
        'SELECT id FROM messages WHERE sms_message_id=?'
      ).get(MessageSid).catch(() => null);
      if (existing) return;
    }

    // ── media attachments ──
    const attachments = [];
    const mediaCount = parseInt(NumMedia || '0', 10);
    for (let i = 0; i < mediaCount; i++) {
      const mediaUrl = req.body[`MediaUrl${i}`];
      const mediaType = req.body[`MediaContentType${i}`];
      if (mediaUrl) {
        attachments.push({
          url: mediaUrl,
          type: mediaType || 'application/octet-stream',
          name: `media_${i}`,
        });
      }
    }

    // ── contact lookup/creation ──
    const normalizedFrom = normalizePhone(fromPhone);
    let contact = await db.prepare(
      'SELECT * FROM contacts WHERE phone=?'
    ).get(normalizedFrom);

    if (!contact) {
      // Also try without +
      contact = await db.prepare('SELECT * FROM contacts WHERE phone=?').get(
        normalizedFrom.replace(/^\+/, '')
      );
    }

    if (!contact) {
      const ctId = 'ct' + uid();
      await db.prepare(
        'INSERT INTO contacts (id,name,phone,color,tags,agent_id) VALUES (?,?,?,?,?,?)'
      ).run(ctId, normalizedFrom, normalizedFrom, '#f5a623', '["sms"]', inbox.agent_id || null);
      contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(ctId);
    }

    // ── check if this is a campaign reply ──
    let campaignId = null;
    let campaignName = null;
    try {
      const campLog = await db.prepare(`
        SELECT l.campaign_id, c.name as campaign_name
        FROM campaign_send_log l
        LEFT JOIN campaigns c ON l.campaign_id = c.id
        WHERE (l.contact_phone=? OR l.contact_phone=?)
          AND l.channel='sms'
          AND l.status IN ('sent','delivered')
          AND l.sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY l.sent_at DESC LIMIT 1
      `).get(normalizedFrom, normalizedFrom.replace(/^\+/, ''));

      if (campLog) {
        campaignId = campLog.campaign_id;
        campaignName = campLog.campaign_name;

        // Update campaign stats: increment reply count
        try {
          const camp = await db.prepare('SELECT stats FROM campaigns WHERE id=?').get(campaignId);
          if (camp) {
            const stats = safeJson(camp.stats, {});
            stats.replies = (stats.replies || 0) + 1;
            await db.prepare('UPDATE campaigns SET stats=? WHERE id=?').run(JSON.stringify(stats), campaignId);
          }
        } catch {}

        // Broadcast reply event for real-time campaign dashboard
        broadcastToAll({
          type: 'campaign_sms_reply',
          campaignId,
          contactPhone: normalizedFrom,
          contactName: contact?.name || normalizedFrom,
          body: body || '',
        });
      }
    } catch (e) {
      console.log('[sms] Campaign lookup skipped:', e.message);
    }

    // ── conversation: find open or create new ──
    let conv = await db.prepare(`
      SELECT * FROM conversations
      WHERE contact_id=? AND inbox_id=? AND status='open'
      ORDER BY updated_at DESC LIMIT 1
    `).get(contact.id, inbox.id);

    if (!conv) {
      const cvId = 'cv' + uid();
      const subject = campaignName
        ? `Campaign Reply: ${campaignName} — ${contact.name || normalizedFrom}`
        : `SMS: ${contact.name || normalizedFrom}`;

      await db.prepare(`
        INSERT INTO conversations
          (id, contact_id, inbox_id, subject, status, channel, campaign_id, campaign_name, assignee_id, agent_id, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        cvId, contact.id, inbox.id, subject, 'open', 'sms',
        campaignId, campaignName,
        null, inbox.agent_id || null, now(), now()
      );
      conv = await db.prepare('SELECT * FROM conversations WHERE id=?').get(cvId);

      // Broadcast new conversation
      const fullConv = await db.prepare(`
        SELECT c.*, ct.name as contact_name, ct.email as contact_email,
               ct.phone as contact_phone, ct.avatar as contact_avatar, ct.color as contact_color,
               i.name as inbox_name, i.type as inbox_type, i.color as inbox_color
        FROM conversations c
        LEFT JOIN contacts ct ON c.contact_id = ct.id
        LEFT JOIN inboxes i ON c.inbox_id = i.id
        WHERE c.id=?
      `).get(cvId);
      try { if (fullConv) fullConv.labels = JSON.parse(fullConv.labels || '[]'); } catch { if (fullConv) fullConv.labels = []; }

      const _smsNewConv = {
        type: 'new_conversation',
        conversation_id: cvId,
        subject: fullConv?.subject,
        contact_name: fullConv?.contact_name,
        contact_phone: fullConv?.contact_phone,
        inbox_id: fullConv?.inbox_id,
        inbox_name: fullConv?.inbox_name,
        inbox_type: 'sms',
        conversation: fullConv,
      };
      if (inbox.agent_id) sendToAgent(inbox.agent_id, _smsNewConv);
      else broadcastToAll(_smsNewConv);
    } else {
      // Update conversation timestamp
      await db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(now(), conv.id);
    }

    // ── insert message ──
    const msgId = uid();
    await db.prepare(
      'INSERT INTO messages (id, conversation_id, role, text, attachments, sms_message_id, created_at) VALUES (?,?,?,?,?,?,?)'
    ).run(
      msgId,
      conv.id,
      'customer',
      body || '',
      attachments.length ? JSON.stringify(attachments) : null,
      MessageSid || null,
      now()
    );

    const savedMsg = await db.prepare('SELECT * FROM messages WHERE id=?').get(msgId);

    // ── broadcast real-time to all agents ──
    const fullConv = await db.prepare(`
      SELECT c.*, ct.name as contact_name, ct.email as contact_email,
             ct.phone as contact_phone, ct.avatar as contact_avatar, ct.color as contact_color,
             i.name as inbox_name, i.type as inbox_type, i.color as inbox_color
      FROM conversations c
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN inboxes i ON c.inbox_id = i.id
      WHERE c.id=?
    `).get(conv.id);
    try { if (fullConv) fullConv.labels = JSON.parse(fullConv.labels || '[]'); } catch { if (fullConv) fullConv.labels = []; }

    const _smsNewMsg = {
      type: 'new_message',
      conversationId: conv.id,
      message: { ...savedMsg, attachments },
      conversation: fullConv,
    };
    if (inbox.agent_id) sendToAgent(inbox.agent_id, _smsNewMsg);
    else broadcastToAll(_smsNewMsg);

    console.log(`[sms] ✓ Inbound SMS saved — conv=${conv.id}, msg=${msgId}, campaign=${campaignId || 'none'}`);

  } catch (err) {
    console.error('[sms] Webhook processing error:', err.message);
  }
});

// ── POST /api/sms/status  (Twilio delivery status callback) ─────────────────
//
// Twilio sends form-encoded POST with fields:
//   MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage, etc.
//
// MessageStatus values: queued → sent → delivered → undelivered → failed
//
router.post('/status', async (req, res) => {
  res.status(200).send('OK');

  try {
    const {
      MessageSid,
      MessageStatus: twilioStatus,
      To: recipientPhone,
      ErrorCode: errorCode,
      ErrorMessage: errorMessage,
    } = req.body;

    if (!MessageSid || !twilioStatus) return;

    console.log(`[sms] 📨 Status: ${twilioStatus} for ${recipientPhone} (sid: ${MessageSid})${errorCode ? ' — Error: ' + errorCode + ' ' + errorMessage : ''}`);

    // ── Update campaign_send_log if this was a campaign message ──
    try {
      const logEntry = await db.prepare(
        'SELECT * FROM campaign_send_log WHERE sms_message_id=?'
      ).get(MessageSid);

      if (logEntry) {
        const ts = now();
        const errMsg = errorCode ? `${errorCode}: ${errorMessage || 'Unknown error'}` : null;

        if (twilioStatus === 'delivered') {
          await db.prepare(
            'UPDATE campaign_send_log SET status=?, delivered_at=? WHERE id=?'
          ).run('delivered', ts, logEntry.id);
          await updateCampaignStat(logEntry.campaign_id, 'delivered', 1);
          console.log(`[sms] ✓ Campaign SMS delivered to ${recipientPhone}`);

        } else if (twilioStatus === 'undelivered' || twilioStatus === 'failed') {
          await db.prepare(
            'UPDATE campaign_send_log SET status=?, error_message=? WHERE id=?'
          ).run('failed', errMsg, logEntry.id);
          await updateCampaignStat(logEntry.campaign_id, 'sent', -1);
          await updateCampaignStat(logEntry.campaign_id, 'failed', 1);
          console.log(`[sms] ✗ Campaign SMS failed for ${recipientPhone}: ${errMsg}`);
        }

        // Broadcast status update for real-time dashboard
        broadcastToAll({
          type: 'campaign_status_update',
          campaignId: logEntry.campaign_id,
          smsMessageId: MessageSid,
          recipientPhone,
          status: twilioStatus,
          error: errMsg,
          channel: 'sms',
        });
      }
    } catch (e) {
      console.error('[sms] Campaign status update error:', e.message);
    }

    // ── Update message delivery status for inbox messages ──
    try {
      const msg = await db.prepare(
        'SELECT * FROM messages WHERE sms_message_id=?'
      ).get(MessageSid);

      if (msg) {
        // Broadcast delivery status to agents viewing this conversation
        broadcastToAll({
          type: 'sms_delivery_status',
          conversationId: msg.conversation_id,
          messageId: msg.id,
          smsMessageId: MessageSid,
          status: twilioStatus,
          error: errorCode ? `${errorCode}: ${errorMessage}` : null,
        });
      }
    } catch (e) {
      console.error('[sms] Message status update error:', e.message);
    }

  } catch (err) {
    console.error('[sms] Status callback error:', err.message);
  }
});

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
    console.error('[sms] updateCampaignStat error:', e.message);
  }
}

module.exports = router;
