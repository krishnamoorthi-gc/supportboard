'use strict';
require('dotenv').config();

const nodemailer   = require('nodemailer');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

// Lazy-import broadcastToAll so we don't create a circular dep at module load
let _broadcast;
function broadcast(data) {
  if (!_broadcast) {
    try { _broadcast = require('../ws').broadcastToAll; } catch { _broadcast = () => {}; }
  }
  _broadcast(data);
}

const prisma = new PrismaClient();
const activePolls = new Set();

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Safely parse inbox.config JSON string → object */
function parseConfig(raw) {
  if (!raw) return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
}

/** Random pastel hex colour for auto-created contacts */
function randomColor() {
  const colours = ['#4c82fb','#1fd07a','#9b6dff','#f5a623','#e74c3c','#3498db','#2ecc71','#e67e22'];
  return colours[Math.floor(Math.random() * colours.length)];
}

function normalizeEmailAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSubject(value) {
  return String(value || '')
    .replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractReplyReferenceIds(parsed) {
  const refs = [];
  const inReplyTo = parsed?.inReplyTo;
  const references = parsed?.references;

  if (Array.isArray(references)) refs.push(...references);
  else if (typeof references === 'string') refs.push(...references.split(/\s+/));

  if (Array.isArray(inReplyTo)) refs.push(...inReplyTo);
  else if (inReplyTo) refs.push(inReplyTo);

  return [...new Set(refs.map(ref => String(ref || '').trim()).filter(Boolean))];
}

/** Build a nodemailer transport from inbox config */
function buildTransport(cfg) {
  const port = parseInt(cfg.smtpPort || 465, 10);
  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port,
    secure: port === 465,
    auth: { user: cfg.emailUser, pass: cfg.emailPass },
    tls: { rejectUnauthorized: false },
  });
}

/** Build an ImapFlow client from inbox config */
function buildImapClient(cfg) {
  return new ImapFlow({
    host: cfg.imapHost,
    port: parseInt(cfg.imapPort || 993, 10),
    secure: true,
    auth: { user: cfg.emailUser, pass: cfg.emailPass },
    logger: false,
    connectionTimeout: parseInt(cfg.imapConnectionTimeout || process.env.EMAIL_IMAP_CONNECTION_TIMEOUT_MS || '30000', 10),
    socketTimeout: parseInt(cfg.imapSocketTimeout || process.env.EMAIL_IMAP_SOCKET_TIMEOUT_MS || '60000', 10),
    tls: { rejectUnauthorized: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  testConnection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test both IMAP and SMTP for a given inboxId.
 * Returns { imap: bool, smtp: bool, errors: string[] }
 */
async function testConnection(inboxId) {
  const inbox = await prisma.inbox.findUnique({ where: { id: inboxId } });
  if (!inbox) throw new Error('Inbox not found');

  const cfg = parseConfig(inbox.config);
  const result = { imap: false, smtp: false, errors: [] };

  // ── IMAP test ──
  if (!cfg.imapHost || !cfg.emailUser) {
    result.errors.push('IMAP: host or username missing');
  } else {
    const client = buildImapClient(cfg);
    try {
      await client.connect();
      await client.logout();
      result.imap = true;
    } catch (err) {
      result.errors.push(`IMAP: ${err.message}`);
    }
  }

  // ── SMTP test ──
  if (!cfg.smtpHost || !cfg.emailUser) {
    result.errors.push('SMTP: host or username missing');
  } else {
    try {
      const transport = buildTransport(cfg);
      await transport.verify();
      result.smtp = true;
    } catch (err) {
      result.errors.push(`SMTP: ${err.message}`);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  pollInbox  (called by node-cron scheduler)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Connect via IMAP, fetch all UNSEEN messages, persist them as
 * customer messages in the DB and broadcast over WebSocket.
 *
 * Returns { processed: number }
 */
async function pollInbox(inboxId) {
  if (activePolls.has(inboxId)) {
    return { processed: 0, skipped: true };
  }

  activePolls.add(inboxId);

  const inbox = await prisma.inbox.findUnique({ where: { id: inboxId } });
  if (!inbox || inbox.type !== 'email' || inbox.active !== 1) {
    activePolls.delete(inboxId);
    return { processed: 0 };
  }

  const cfg = parseConfig(inbox.config);
  if (!cfg.imapHost || !cfg.emailUser) {
    activePolls.delete(inboxId);
    return { processed: 0 };
  }

  let processed = 0;
  const client = buildImapClient(cfg);
  let lock;

  try {
    await client.connect();
    lock = await client.getMailboxLock('INBOX');

    const lookbackDays = Math.max(1, parseInt(process.env.EMAIL_POLL_LOOKBACK_DAYS || '14', 10));
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const recentUids = await client.search({ since }, { uid: true });
    const maxMessages = Math.max(1, parseInt(process.env.EMAIL_POLL_MAX_MESSAGES || '10', 10));
    const maxSourceBytes = Math.max(32768, parseInt(process.env.EMAIL_POLL_MAX_SOURCE_BYTES || '65536', 10));
    const fetchUids = [...new Set((Array.isArray(recentUids) ? recentUids : []).map(uid => Number(uid)).filter(Number.isFinite))]
      .sort((a, b) => b - a)
      .slice(0, maxMessages);

    if (!fetchUids.length) {
      return { processed: 0 };
    }

    for (const uid of fetchUids) {
      try {
        const msg = await client.fetchOne(String(uid), { source: { maxLength: maxSourceBytes }, uid: true }, { uid: true });
        if (!msg) continue;
        const imported = await processIncomingEmail({ inbox, cfg, rawMsg: msg, client });
        if (imported) processed++;
      } catch (err) {
        console.error(`[emailService] Error processing message uid=${uid}:`, err.message);
      }
    }
  } finally {
    try { lock?.release(); } catch {}
    try { await client.logout(); } catch {}
    activePolls.delete(inboxId);
  }

  console.log(`[emailService] Polled inbox ${inboxId}: ${processed} new message(s)`);
  return { processed };
}

/** Parse one raw IMAP message and store it as a conversation+message */
async function processIncomingEmail({ inbox, rawMsg, client }) {
  const parsed    = await simpleParser(rawMsg.source);
  const messageId = parsed.messageId || `generated-${uuidv4()}`;

  // ── Dedup: skip if already imported ──────────────────────────────────────
  const exists = await prisma.message.findFirst({ where: { email_message_id: messageId } });
  if (exists) {
    // Mark as seen anyway so we don't re-visit
    await client.messageFlagsAdd({ uid: rawMsg.uid }, ['\\Seen'], { uid: true });
    return false;
  }

  const fromAddr  = normalizeEmailAddress(parsed.from?.value?.[0]?.address || 'unknown@unknown.com');
  const fromName  = parsed.from?.value?.[0]?.name     || fromAddr;
  const subject   = parsed.subject                    || '(No Subject)';
  const bodyText  = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]+>/g, '') : '') || '';
  const normalizedSubject = normalizeSubject(subject);
  const replyReferenceIds = extractReplyReferenceIds(parsed);
  const inboxSender = normalizeEmailAddress(parseConfig(inbox.config)?.emailUser || '');

  // Ignore our own mailbox address if it ever shows up in INBOX copies.
  if (fromAddr && inboxSender && fromAddr === inboxSender) {
    await client.messageFlagsAdd({ uid: rawMsg.uid }, ['\\Seen'], { uid: true });
    return false;
  }

  // ── Find / create contact ─────────────────────────────────────────────────
  let contact = await prisma.contact.findFirst({
    where: { email: fromAddr, agent_id: inbox.agent_id },
  });
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        id:       uuidv4(),
        name:     fromName,
        email:    fromAddr,
        color:    randomColor(),
        agent_id: inbox.agent_id,
      },
    });
    console.log(`[emailService] Created new contact: ${fromName} <${fromAddr}>`);
  }

  // ── Find matching open conversation (thread matching) ─────────────────────
  // Strategy: match by inReplyTo header → message.email_message_id, then fall back
  // to same inbox+contact+open status within 7 days.
  let conversation = null;

  if (replyReferenceIds.length) {
    const parentMsg = await prisma.message.findFirst({
      where: { email_message_id: { in: replyReferenceIds } },
      orderBy: { created_at: 'desc' },
    });
    if (parentMsg) {
      conversation = await prisma.conversation.findUnique({ where: { id: parentMsg.conversation_id } });
    }
  }

  if (!conversation) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentConversations = await prisma.conversation.findMany({
      where: {
        inbox_id:   inbox.id,
        contact_id: contact.id,
        updated_at: { gte: thirtyDaysAgo },
      },
      orderBy: { updated_at: 'desc' },
      take: 10,
    });

    conversation =
      recentConversations.find(cv => normalizeSubject(cv.subject) === normalizedSubject) ||
      recentConversations.find(cv => cv.status === 'open') ||
      recentConversations[0] ||
      null;
  }

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        id:         uuidv4(),
        subject,
        status:     'open',
        priority:   'normal',
        contact_id: contact.id,
        inbox_id:   inbox.id,
        agent_id:   inbox.agent_id,
        labels:     '[]',
      },
    });
    console.log(`[emailService] Created new conversation: "${subject}" (${conversation.id})`);
  } else if (conversation.status !== 'open') {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data:  { status: 'open', updated_at: new Date() },
    });
  }

  // ── Persist message ───────────────────────────────────────────────────────
  const newMsg = await prisma.message.create({
    data: {
      id:               uuidv4(),
      conversation_id:  conversation.id,
      role:             'customer',
      text:             bodyText,
      email_message_id: messageId,
      is_read:          0,
    },
  });

  // Bump conversation.updated_at
  await prisma.conversation.update({
    where: { id: conversation.id },
    data:  { updated_at: new Date() },
  });

  // ── Mark as Seen on IMAP ─────────────────────────────────────────────────
  await client.messageFlagsAdd({ uid: rawMsg.uid }, ['\\Seen'], { uid: true });

  // ── Broadcast over WebSocket so the UI updates instantly ─────────────────
  broadcast({
    type: 'new_email_message',
    conversation: {
      id:            conversation.id,
      subject:       conversation.subject,
      status:        conversation.status,
      inbox_id:      inbox.id,
      inbox_name:    inbox.name,
      contact_id:    contact.id,
      contact_name:  contact.name,
      contact_email: contact.email,
      contact_color: contact.color,
      updated_at:    new Date().toISOString(),
    },
    message: {
      id:              newMsg.id,
      conversation_id: newMsg.conversation_id,
      role:            'customer',
      text:            newMsg.text,
      is_read:         0,
      created_at:      newMsg.created_at,
    },
  });

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  sendEmail  (called by Redis BRPOP send worker)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send an outbound email via SMTP.
 *
 * @param {object} opts
 * @param {string} opts.inboxId        - DB inbox id
 * @param {string} opts.to             - recipient address
 * @param {string} [opts.cc]
 * @param {string} [opts.bcc]
 * @param {string} opts.subject
 * @param {string} opts.text           - plain-text body
 * @param {string} [opts.html]         - optional HTML body
 * @param {string} [opts.inReplyTo]    - RFC2822 Message-Id of email being replied to
 * @param {string} [opts.conversationId]
 * @param {string} [opts.messageId]    - our DB message id (for logging)
 *
 * @returns {{ smtpMessageId, accepted, rejected }}
 */
async function sendEmail({ inboxId, to, cc, bcc, subject, text, html, inReplyTo }) {
  const inbox = await prisma.inbox.findUnique({ where: { id: inboxId } });
  if (!inbox) throw new Error(`Inbox not found: ${inboxId}`);

  const cfg = parseConfig(inbox.config);
  if (!cfg.smtpHost || !cfg.emailUser) throw new Error('SMTP not configured for this inbox');

  const transport = buildTransport(cfg);

  const mailOpts = {
    from:       `"${inbox.name}" <${cfg.emailUser}>`,
    to,
    cc:         cc  || undefined,
    bcc:        bcc || undefined,
    subject,
    text,
    html:       html || text.replace(/\n/g, '<br>'),
    inReplyTo:  inReplyTo || undefined,
    references: inReplyTo || undefined,
  };

  const info = await transport.sendMail(mailOpts);
  if (!info?.accepted?.length || info?.rejected?.length) {
    const rejected = Array.isArray(info?.rejected) ? info.rejected.join(', ') : 'unknown recipient';
    throw new Error(`SMTP rejected recipient(s): ${rejected}`);
  }
  console.log(`[emailService] Sent email → ${to} | msgId: ${info.messageId}`);
  return { smtpMessageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Utility: get all active email inboxes (used by startup scheduler)
// ─────────────────────────────────────────────────────────────────────────────
async function getActiveEmailInboxes() {
  return prisma.inbox.findMany({ where: { type: 'email', active: 1 } });
}

module.exports = {
  testConnection,
  pollInbox,
  sendEmail,
  getActiveEmailInboxes,
  parseConfig,
};
