const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid, paginate } = require('../utils/helpers');
const { sendEmail, extractVisibleEmailText } = require('../services/emailService');
const { sendFacebookMessage, normalizeFacebookRecipientId } = require('../services/facebookService');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { sendInstagramMessage, normalizeInstagramRecipientId } = require('../services/instagramService');
const { sendSms: sendSmsMessage, normalizePhone: normalizeSmsPhone } = require('../services/smsService');
const { broadcastToAll } = require('../ws');

function parseAttachments(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function buildMessagePreview(message) {
  const attachments = parseAttachments(message?.attachments);
  const baseText = message?.role === 'customer' && message?.email_message_id
    ? extractVisibleEmailText(message?.text || '') || message?.text || ''
    : message?.text || '';

  if (baseText) return baseText;
  if (attachments.length === 1) return `Attachment: ${attachments[0].name || 'file'}`;
  if (attachments.length > 1) return `${attachments.length} attachments`;
  return '';
}

async function findOrCreateContactByEmail({ email, name, agentId, preferredId }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  let contact = await db.prepare('SELECT * FROM contacts WHERE agent_id=? AND email=? LIMIT 1').get(agentId, normalizedEmail);
  if (contact) return contact;

  const id = preferredId || uid();
  const displayName = String(name || normalizedEmail.split('@')[0] || 'Email Contact').trim() || 'Email Contact';

  await db.prepare('INSERT INTO contacts (id,name,email,color,agent_id) VALUES (?,?,?,?,?)').run(
    id,
    displayName,
    normalizedEmail,
    '#4c82fb',
    agentId
  );

  return db.prepare('SELECT * FROM contacts WHERE id=?').get(id);
}

// GET /api/conversations
router.get('/', auth, async (req, res) => {
  const { offset, limit } = paginate(req);
  const { status, priority, assignee, inbox, label, q, campaign_id, campaign_replies } = req.query;

  let where = 'c.agent_id=?';
  const params = [req.agent.id];
  if (status) { where += ' AND c.status=?'; params.push(status); }
  if (priority) { where += ' AND c.priority=?'; params.push(priority); }
  if (assignee) { where += ' AND c.assignee_id=?'; params.push(assignee); }
  if (inbox) { where += ' AND c.inbox_id=?'; params.push(inbox); }
  if (campaign_id) { where += ' AND c.campaign_id=?'; params.push(campaign_id); }
  if (campaign_replies === 'true') { where += ' AND c.campaign_id IS NOT NULL'; }
  if (q) { where += ' AND (c.subject LIKE ? OR ct.name LIKE ? OR ct.email LIKE ?)'; const lq=`%${q}%`; params.push(lq,lq,lq); }

  const convs = await db.prepare(`
    SELECT c.*, ct.name as contact_name, ct.email as contact_email,
           ct.avatar as contact_avatar, ct.color as contact_color,
           i.name as inbox_name, i.type as inbox_type,
           a.name as assignee_name, a.avatar as assignee_avatar
    FROM conversations c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    LEFT JOIN inboxes i ON c.inbox_id = i.id
    LEFT JOIN agents a ON c.assignee_id = a.id
    WHERE ${where}
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const totalRow = await db.prepare(`
    SELECT COUNT(*) as c FROM conversations c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    WHERE ${where}
  `).get(...params);
  const total = totalRow ? totalRow.c : 0;

  for (const cv of convs) {
    const last = await db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1').get(cv.id);
    cv.lastMessage = last
      ? {
          ...last,
          attachments: parseAttachments(last.attachments),
          text: buildMessagePreview(last),
        }
      : null;
    const unreadRow = await db.prepare("SELECT COUNT(*) as c FROM messages WHERE conversation_id=? AND is_read=0 AND role='customer'").get(cv.id);
    cv.unreadCount = unreadRow ? unreadRow.c : 0;
    try { cv.labels = JSON.parse(cv.labels || '[]'); } catch { cv.labels = []; }
  }

  res.json({ conversations: convs, total, page: Math.floor(offset/limit)+1 });
});

// GET /api/conversations/:id
router.get('/:id', auth, async (req, res) => {
  const cv = await db.prepare(`
    SELECT c.*, ct.name as contact_name, ct.email as contact_email,
           ct.phone as contact_phone, ct.avatar as contact_avatar, ct.color as contact_color,
           i.name as inbox_name, i.type as inbox_type, i.color as inbox_color,
           a.name as assignee_name, a.avatar as assignee_avatar, a.color as assignee_color
    FROM conversations c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    LEFT JOIN inboxes i ON c.inbox_id = i.id
    LEFT JOIN agents a ON c.assignee_id = a.id
    WHERE c.id=?
  `).get(req.params.id);
  if (!cv) return res.status(404).json({ error: 'Not found' });
  try { cv.labels = JSON.parse(cv.labels || '[]'); } catch { cv.labels = []; }
  res.json({ conversation: cv });
});

// POST /api/conversations
router.post('/', auth, async (req, res) => {
  const { subject, contact_id, inbox_id, assignee_id, priority='normal', labels=[] } = req.body;
  if (!subject || !contact_id) return res.status(400).json({ error: 'subject and contact_id required' });
  const id = uid();
  await db.prepare(`INSERT INTO conversations (id,subject,contact_id,inbox_id,assignee_id,priority,labels,agent_id) VALUES (?,?,?,?,?,?,?,?)`).run(
    id, subject, contact_id, inbox_id||null, assignee_id||null, priority, JSON.stringify(labels), req.agent.id
  );
  // Fetch full conversation with joins so the UI has everything it needs
  const cv = await db.prepare(`
    SELECT c.*, ct.name as contact_name, ct.email as contact_email,
           ct.avatar as contact_avatar, ct.color as contact_color,
           i.name as inbox_name, i.type as inbox_type, i.color as inbox_color
    FROM conversations c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    LEFT JOIN inboxes i ON c.inbox_id = i.id
    WHERE c.id=?
  `).get(id);
  try { cv.labels = JSON.parse(cv.labels || '[]'); } catch { cv.labels = []; }

  // Broadcast to all agents so it appears instantly in their inbox
  try {
    broadcastToAll({
      type: 'new_conversation',
      conversation_id: cv.id,
      subject: cv.subject,
      contact_name: cv.contact_name,
      contact_email: cv.contact_email,
      contact_color: cv.contact_color,
      inbox_id: cv.inbox_id,
      inbox_name: cv.inbox_name,
      inbox_type: cv.inbox_type,
      conversation: cv,
    });
  } catch (_) {}

  res.status(201).json({ conversation: cv });
});

// PATCH /api/conversations/:id
router.patch('/:id', auth, async (req, res) => {
  const { status, priority, assignee_id, team_id, labels, subject, snoozed_until, csat_score, csat_comment } = req.body;
  const cv = await db.prepare('SELECT * FROM conversations WHERE id=?').get(req.params.id);
  if (!cv) return res.status(404).json({ error: 'Not found' });

  const updates = {};
  if (status !== undefined) { updates.status = status; if (status === 'resolved') updates.resolved_at = new Date().toISOString().slice(0, 19).replace('T', ' '); }
  if (priority !== undefined) updates.priority = priority;
  if (assignee_id !== undefined) updates.assignee_id = assignee_id;
  if (team_id !== undefined) updates.team_id = team_id;
  if (labels !== undefined) updates.labels = JSON.stringify(labels);
  if (subject !== undefined) updates.subject = subject;
  if (snoozed_until !== undefined) updates.snoozed_until = snoozed_until;
  if (csat_score !== undefined) updates.csat_score = csat_score;
  if (csat_comment !== undefined) updates.csat_comment = csat_comment;
  updates.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const sets = Object.keys(updates).map(k=>`${k}=?`).join(',');
  await db.prepare(`UPDATE conversations SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);

  const updated = await db.prepare(`
    SELECT c.*, ct.name as contact_name, ct.email as contact_email, ct.avatar as contact_avatar, ct.color as contact_color,
           ib.name as inbox_name, ib.type as inbox_type,
           a.name as assignee_name, a.avatar as assignee_avatar, a.color as assignee_color
    FROM conversations c
    LEFT JOIN contacts ct ON c.contact_id=ct.id
    LEFT JOIN inboxes ib ON c.inbox_id=ib.id
    LEFT JOIN agents a ON c.assignee_id=a.id
    WHERE c.id=?
  `).get(req.params.id);
  try { updated.labels = JSON.parse(updated.labels || '[]'); } catch { updated.labels = []; }

  // Broadcast to all agents for real-time sync
  broadcastToAll({
    type: 'conversation_update',
    conversationId: req.params.id,
    updates: {
      assignee_id: updates.assignee_id,
      team_id: updates.team_id,
      status: updates.status,
      priority: updates.priority
    },
    conversation: updated,
    agent_name: req.agent.name
  });

  res.json({ conversation: updated });
});

// DELETE /api/conversations/:id
router.delete('/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM messages WHERE conversation_id=?').run(req.params.id);
  await db.prepare('DELETE FROM conversations WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', auth, async (req, res) => {
  await db.prepare("UPDATE messages SET is_read=1 WHERE conversation_id=? AND role='customer'").run(req.params.id);
  const msgs = await db.prepare(`
    SELECT m.*, a.name as agent_name, a.avatar as agent_avatar, a.color as agent_color
    FROM messages m
    LEFT JOIN agents a ON m.agent_id = a.id
    WHERE m.conversation_id=?
    ORDER BY m.created_at ASC
  `).all(req.params.id);
  res.json({
    messages: msgs.map(msg => {
      const attachments = parseAttachments(msg.attachments);
      const text = msg.role === 'customer' && msg.email_message_id
        ? extractVisibleEmailText(msg.text || '') || msg.text || ''
        : msg.text;
      return { ...msg, attachments, text };
    }),
  });
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', auth, async (req, res) => {
  const { text, role='agent', attachments=[], cc, bcc, emailSubject, inReplyTo, toEmail, contactId, contactName } = req.body;
  const normalizedAttachments = parseAttachments(attachments);
  if (!text && normalizedAttachments.length === 0) return res.status(400).json({ error: 'text required' });

  const conv = await db.prepare(`
    SELECT c.*, ct.email AS contact_email, ct.name AS contact_name,
           ct.phone AS contact_phone,
           i.type AS inbox_type, i.id AS inbox_id_val
    FROM conversations c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    LEFT JOIN inboxes i ON c.inbox_id = i.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  let smtpResult    = null;
  let resolvedRecipient = null;
  let waResult      = null;
  let fbResult      = null;

  if (role === 'agent' && conv.inbox_type === 'email') {
    resolvedRecipient = String(toEmail || conv.contact_email || '').split(',')[0].trim().toLowerCase();
    if (!resolvedRecipient) {
      return res.status(400).json({ error: 'Customer email missing for this conversation' });
    }

    const repairedContact = await findOrCreateContactByEmail({
      email: resolvedRecipient,
      name: contactName || conv.contact_name,
      agentId: req.agent.id,
      preferredId: contactId || conv.contact_id || undefined,
    });

    if (repairedContact && conv.contact_id !== repairedContact.id) {
      await db.prepare('UPDATE conversations SET contact_id=?, updated_at=? WHERE id=?').run(
        repairedContact.id,
        new Date().toISOString().slice(0, 19).replace('T', ' '),
        req.params.id
      );
    }

    let replyHeader = inReplyTo || null;
    if (!replyHeader) {
      const lastEmailMsg = await db.prepare(`
        SELECT email_message_id
        FROM messages
        WHERE conversation_id=? AND email_message_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
      `).get(req.params.id);
      replyHeader = lastEmailMsg?.email_message_id || null;
    }

    // Append agent's default signature (if any)
    let emailBody = text || '';
    const sig = await db.prepare(
      'SELECT * FROM signatures WHERE agent_id=? AND is_default=1 AND active=1 LIMIT 1'
    ).get(req.agent.id);
    if (sig && sig.body) {
      let sigText = sig.body
        .replace(/\{\{name\}\}/g, req.agent.name || '')
        .replace(/\{\{title\}\}/g, req.agent.role || '')
        .replace(/\{\{email\}\}/g, req.agent.email || '')
        .replace(/\{\{phone\}\}/g, req.agent.phone || '')
        .replace(/\{\{company\}\}/g, '')
        .replace(/\{\{website\}\}/g, '');
      // Strip markdown for plain text
      sigText = sigText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/_(.*?)_/g, '$1');
      emailBody = emailBody + '\n\n--\n' + sigText;
    }

    try {
      smtpResult = await sendEmail({
        inboxId: conv.inbox_id_val,
        to: resolvedRecipient,
        cc: cc || null,
        bcc: bcc || null,
        subject: emailSubject || conv.subject || '(No Subject)',
        text: emailBody,
        inReplyTo: replyHeader,
        attachments: normalizedAttachments,
      });
    } catch (mailErr) {
      console.error('[conversations] SMTP send failed:', mailErr.message);
      return res.status(502).json({ error: `Email delivery failed: ${mailErr.message}` });
    }
  }

  // ── WhatsApp send ────────────────────────────────────────────────────────
  if (role === 'agent' && conv.inbox_type === 'whatsapp') {
    const { toPhone } = req.body;
    const recipientPhone = (toPhone || conv.contact_phone || '').replace(/^\+/, '');
    if (!recipientPhone) {
      return res.status(400).json({ error: 'Customer phone number missing for this WhatsApp conversation' });
    }
    try {
      waResult = await sendWhatsAppMessage({
        inboxId:     conv.inbox_id_val,
        to:          recipientPhone,
        text:        text || '',
        attachments: normalizedAttachments,
      });
    } catch (waErr) {
      console.error('[conversations] WhatsApp send failed:', waErr.message);
      return res.status(502).json({ error: `WhatsApp delivery failed: ${waErr.message}` });
    }
  }

  // ── Facebook Messenger send ──────────────────────────────────────────────
  if (role === 'agent' && conv.inbox_type === 'facebook') {
    const { toFacebookId } = req.body;
    const recipientId = normalizeFacebookRecipientId(toFacebookId || conv.contact_phone || '');
    if (!recipientId) {
      return res.status(400).json({ error: 'Facebook recipient ID missing for this conversation' });
    }
    try {
      fbResult = await sendFacebookMessage({
        inboxId:     conv.inbox_id_val,
        to:          recipientId,
        text:        text || '',
        attachments: normalizedAttachments,
      });
    } catch (fbErr) {
      console.error('[conversations] Facebook send failed:', fbErr.message);
      const isNoUser = fbErr.message.includes('No matching user') || fbErr.message.includes('#100');
      const hint = isNoUser
        ? 'This contact has not messaged your Page yet. Facebook only allows replies to users who message your page first.'
        : fbErr.message;
      return res.status(502).json({ error: `Facebook not sent: ${hint}` });
    }
  }

  // ── Instagram send ──────────────────────────────────────────────────────
  let igResult = null;
  if (role === 'agent' && conv.inbox_type === 'instagram') {
    const { toInstagramId } = req.body;
    const recipientId = normalizeInstagramRecipientId(toInstagramId || conv.contact_phone || '');
    if (!recipientId) {
      return res.status(400).json({ error: 'Instagram recipient ID missing for this conversation' });
    }
    try {
      igResult = await sendInstagramMessage({
        inboxId:     conv.inbox_id_val,
        to:          recipientId,
        text:        text || '',
        attachments: normalizedAttachments,
      });
    } catch (igErr) {
      console.error('[conversations] Instagram send failed:', igErr.message);
      return res.status(502).json({ error: `Instagram delivery failed: ${igErr.message}` });
    }
  }

  // ── SMS send ─────────────────────────────────────────────────────────────
  let smsResult = null;
  if (role === 'agent' && conv.inbox_type === 'sms') {
    const { toPhone } = req.body;
    const recipientPhone = normalizeSmsPhone(toPhone || conv.contact_phone || '');
    if (!recipientPhone || recipientPhone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Valid phone number missing for this SMS conversation' });
    }
    try {
      const statusCallback = process.env.PUBLIC_URL
        ? `${process.env.PUBLIC_URL}/api/sms/status`
        : undefined;
      smsResult = await sendSmsMessage({
        inboxId:        conv.inbox_id_val,
        to:             recipientPhone,
        text:           text || '',
        statusCallback,
      });
    } catch (smsErr) {
      console.error('[conversations] SMS send failed:', smsErr.message);
      return res.status(502).json({ error: `SMS delivery failed: ${smsErr.message}` });
    }
  }

  const id = uid();
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await db.prepare('INSERT INTO messages (id,conversation_id,role,text,agent_id,attachments,email_message_id,whatsapp_message_id,sms_message_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    id,
    req.params.id,
    role,
    text,
    role === 'agent' ? req.agent.id : null,
    JSON.stringify(normalizedAttachments),
    smtpResult?.smtpMessageId || null,
    waResult?.messages?.[0]?.id || fbResult?.message_id || igResult?.message_id || null,
    smsResult?.sid || null,
    createdAt
  );

  if (role === 'agent') {
    const cv = await db.prepare('SELECT first_reply_at FROM conversations WHERE id=?').get(req.params.id);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (!cv.first_reply_at) {
      await db.prepare('UPDATE conversations SET first_reply_at=?,updated_at=? WHERE id=?').run(now, now, req.params.id);
    } else {
      await db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(now, req.params.id);
    }
    // Sync to linked bot_chat so visitor gets the reply via polling
    try {
      const botChat = await db.prepare('SELECT id, messages FROM bot_chats WHERE conversation_id=?').get(req.params.id);
      if (botChat && botChat.id) {
        const botMsgs = (() => { try { return JSON.parse(botChat.messages || '[]'); } catch { return []; } })();
        botMsgs.push({ f: 'agent', t: text, agent_name: req.agent.name, ts: Date.now() });
        await db.prepare('UPDATE bot_chats SET messages=?, status=?, updated_at=? WHERE id=?').run(
          JSON.stringify(botMsgs), 'agent_connected', now, botChat.id
        );
      }
    } catch {}
  }

  const msg = await db.prepare('SELECT * FROM messages WHERE id=?').get(id);
  msg.attachments = parseAttachments(msg.attachments);

  // Fetch conversation with full joins for the broadcast payload
  const fullConv = await db.prepare(`
    SELECT c.*, ct.name as contact_name, ct.email as contact_email,
           ct.avatar as contact_avatar, ct.color as contact_color,
           i.name as inbox_name, i.type as inbox_type, i.color as inbox_color
    FROM conversations c
    LEFT JOIN contacts ct ON c.contact_id = ct.id
    LEFT JOIN inboxes i ON c.inbox_id = i.id
    WHERE c.id=?
  `).get(req.params.id);
  try { if (fullConv) fullConv.labels = JSON.parse(fullConv.labels || '[]'); } catch { if (fullConv) fullConv.labels = []; }

  try {
    broadcastToAll({
      type: 'new_message',
      conversationId: req.params.id,
      message: msg,
      // Include full conversation so frontend can add it to the list if it's new
      conversation: fullConv || null,
    });
  } catch (_) {}

  res.status(201).json({
    message: msg,
    email: smtpResult ? {
      delivered: true,
      to: resolvedRecipient,
      messageId: smtpResult.smtpMessageId,
      accepted: smtpResult.accepted,
      rejected: smtpResult.rejected,
    } : null,
    whatsapp: waResult ? {
      delivered: true,
      messageId: waResult?.messages?.[0]?.id,
    } : null,
    facebook: fbResult ? {
      delivered: true,
      messageId: fbResult?.message_id,
      recipientId: fbResult?.recipient_id,
    } : null,
    instagram: igResult ? {
      delivered: true,
      messageId: igResult?.message_id,
      recipientId: igResult?.recipient_id,
    } : null,
    sms: smsResult ? {
      delivered: true,
      messageSid: smsResult?.sid,
      status: smsResult?.status,
    } : null,
  });
});

// POST /api/conversations/:id/merge
router.post('/:id/merge', auth, async (req, res) => {
  const { target_id } = req.body;
  if (!target_id) return res.status(400).json({ error: 'target_id required' });
  await db.prepare('UPDATE messages SET conversation_id=? WHERE conversation_id=?').run(target_id, req.params.id);
  await db.prepare('DELETE FROM conversations WHERE id=?').run(req.params.id);
  res.json({ success: true, merged_into: target_id });
});

module.exports = router;
