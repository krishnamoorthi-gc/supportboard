'use strict';
require('dotenv').config();

const nodemailer   = require('nodemailer');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

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
const uploadsDir = path.join(__dirname, '..', 'uploads');

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

function normalizeAttachmentList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function sanitizeFilename(value) {
  return String(value || 'attachment')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 180)
    || 'attachment';
}

function formatAttachmentForMail(attachment) {
  const url = String(attachment?.url || '').trim();
  if (!url) return null;

  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  if (!normalizedUrl.startsWith('/uploads/')) return null;

  const resolvedUploads = path.resolve(uploadsDir);
  const filePath = path.resolve(__dirname, '..', normalizedUrl.slice(1));
  if (!filePath.toLowerCase().startsWith(resolvedUploads.toLowerCase())) return null;
  if (!fs.existsSync(filePath)) return null;

  return {
    filename: String(attachment?.name || path.basename(filePath)).trim() || path.basename(filePath),
    path: filePath,
    contentType: attachment?.contentType || undefined,
    cid: attachment?.contentId || undefined,
  };
}

async function saveInboundAttachments(items = []) {
  const attachments = [];
  if (!Array.isArray(items) || items.length === 0) return attachments;

  await fs.promises.mkdir(uploadsDir, { recursive: true });

  for (const item of items) {
    const content = item?.content;
    if (!content || !Buffer.isBuffer(content) || content.length === 0) continue;
    if (item.contentDisposition === 'inline' && !item.filename && content.length < 4096) continue;

    const originalName = String(item.filename || item.name || `attachment-${attachments.length + 1}`).trim() || `attachment-${attachments.length + 1}`;
    const storedName = `${Date.now()}-${uuidv4()}-${sanitizeFilename(originalName)}`;
    const filePath = path.join(uploadsDir, storedName);

    await fs.promises.writeFile(filePath, content);

    attachments.push({
      id: uuidv4(),
      name: originalName,
      size: Number(item.size || content.length || 0),
      contentType: item.contentType || 'application/octet-stream',
      contentId: item.contentId || null,
      inline: item.contentDisposition === 'inline',
      url: `/uploads/${storedName}`,
    });
  }

  return attachments;
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmailAddress(value));
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

function toValidDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickNewestDate(...values) {
  const valid = values.map(toValidDate).filter(Boolean);
  if (!valid.length) return null;
  return valid.reduce((latest, current) => current.getTime() > latest.getTime() ? current : latest);
}

function htmlToPlainText(value) {
  return String(value || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*\/div\s*>/gi, '\n')
    .replace(/<\s*\/li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function normalizeEmailText(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripQuotedEmailText(value) {
  const raw = normalizeEmailText(value);
  if (!raw) return '';

  let visible = raw;
  const threadMarkers = [
    /\n\s*On .+?(?:\n\s*)?wrote:\s*(?:\n|$)/is,
    /\n\s*-{2,}\s*Original Message\s*-{2,}\s*(?:\n|$)/i,
    /\n\s*Begin forwarded message:\s*(?:\n|$)/i,
    /\n\s*From:\s.+\n\s*(?:Sent:\s.+\n)?\s*(?:To:\s.+\n)?\s*(?:Cc:\s.+\n)?\s*Subject:\s.+(?:\n|$)/i,
  ];

  for (const marker of threadMarkers) {
    const match = marker.exec(visible);
    if (match) {
      visible = visible.slice(0, match.index).trim();
      break;
    }
  }

  const withoutQuotedLines = visible
    .split('\n')
    .filter(line => !line.trim().startsWith('>'))
    .join('\n');

  visible = normalizeEmailText(withoutQuotedLines);

  const signatureMarkers = [
    /\n--\s*\n[\s\S]*$/i,
    /\nSent from my [\s\S]*$/i,
    /\nGet Outlook for [\s\S]*$/i,
  ];

  for (const marker of signatureMarkers) {
    const match = marker.exec(visible);
    if (match && match.index > 0) {
      visible = visible.slice(0, match.index).trim();
      break;
    }
  }

  return normalizeEmailText(visible) || raw;
}

function getParsedBodyText(parsed) {
  const plain = normalizeEmailText(parsed?.text || '');
  if (plain) return plain;
  return normalizeEmailText(htmlToPlainText(parsed?.html || ''));
}

function isPlaceholderContactName(name, email) {
  const normalizedName = String(name || '').trim().toLowerCase();
  const normalizedEmail = normalizeEmailAddress(email);
  const localPart = normalizedEmail.split('@')[0] || '';
  return !normalizedName
    || normalizedName === normalizedEmail
    || normalizedName === localPart
    || normalizedName === 'email contact'
    || normalizedName === 'unknown';
}

async function findContactsByEmail(agentId, email) {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!normalizedEmail) return [];
  return prisma.contact.findMany({
    where: { email: normalizedEmail, agent_id: agentId },
    orderBy: { created_at: 'asc' },
    take: 10,
  });
}

async function createSenderContact({ agentId, fromAddr, fromName }) {
  const contact = await prisma.contact.create({
    data: {
      id:       uuidv4(),
      name:     String(fromName || fromAddr).trim() || fromAddr,
      email:    fromAddr,
      color:    randomColor(),
      agent_id: agentId,
    },
  });
  console.log(`[emailService] Created new contact: ${contact.name} <${fromAddr}>`);
  return contact;
}

async function hydrateConversationContact(conversation) {
  if (!conversation?.contact_id) return null;
  try {
    return await prisma.contact.findUnique({ where: { id: conversation.contact_id } });
  } catch {
    return null;
  }
}

async function findConversationByReferences(replyReferenceIds) {
  if (!replyReferenceIds.length) return null;

  const parentMsg = await prisma.message.findFirst({
    where: { email_message_id: { in: replyReferenceIds } },
    orderBy: { created_at: 'desc' },
  });

  if (!parentMsg) return null;
  return prisma.conversation.findUnique({ where: { id: parentMsg.conversation_id } });
}

async function findConversationByContactSync({ inboxId, contactIds, normalizedSubject }) {
  if (!contactIds.length) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentConversations = await prisma.conversation.findMany({
    where: {
      inbox_id: inboxId,
      contact_id: { in: contactIds },
      updated_at: { gte: thirtyDaysAgo },
    },
    orderBy: { updated_at: 'desc' },
    take: 10,
  });

  return recentConversations.find(cv => normalizeSubject(cv.subject) === normalizedSubject)
    || recentConversations.find(cv => cv.status === 'open' || cv.status === 'snoozed')
    || recentConversations[0]
    || null;
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

    // First try: fetch only UNSEEN messages (efficient – only new emails)
    let unseenUids = await client.search({ seen: false }, { uid: true });
    const maxMessages = Math.max(1, parseInt(process.env.EMAIL_POLL_MAX_MESSAGES || '50', 10));
    const maxSourceBytes = Math.max(262144, parseInt(process.env.EMAIL_POLL_MAX_SOURCE_BYTES || String(25 * 1024 * 1024), 10));

    // Fallback: if no UNSEEN found, check last 7 days for any recent messages
    // (handles cases where messages were already marked Seen externally)
    if (!unseenUids || unseenUids.length === 0) {
      const lookbackDays = Math.max(1, parseInt(process.env.EMAIL_POLL_LOOKBACK_DAYS || '7', 10));
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
      unseenUids = await client.search({ since }, { uid: true });
    }

    const fetchUids = [...new Set((Array.isArray(unseenUids) ? unseenUids : []).map(uid => Number(uid)).filter(Number.isFinite))]
      .sort((a, b) => b - a)
      .slice(0, maxMessages);

    if (!fetchUids.length) {
      return { processed: 0 };
    }

    for (const uid of fetchUids) {
      try {
        const msg = await client.fetchOne(String(uid), { source: { maxLength: maxSourceBytes }, uid: true, internalDate: true }, { uid: true });
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
  const headerDate = toValidDate(parsed.date);
  const internalDate = toValidDate(rawMsg.internalDate);
  const messageDate = pickNewestDate(headerDate, internalDate) || new Date();

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
  const inboundAttachments = await saveInboundAttachments(parsed.attachments || []);
  const rawBodyText = getParsedBodyText(parsed);
  const bodyText  = stripQuotedEmailText(rawBodyText) || rawBodyText || '';
  const rawHtml   = parsed?.html || null; // preserve original HTML for rendering
  const normalizedSubject = normalizeSubject(subject);
  const replyReferenceIds = extractReplyReferenceIds(parsed);
  const inboxSender = normalizeEmailAddress(parseConfig(inbox.config)?.emailUser || '');

  // Ignore our own mailbox address if it ever shows up in INBOX copies.
  if (fromAddr && inboxSender && fromAddr === inboxSender) {
    await client.messageFlagsAdd({ uid: rawMsg.uid }, ['\\Seen'], { uid: true });
    return false;
  }

  // Ignore no-reply / automated senders (notifications, not real conversations)
  const ignoredDomains = ['mail.anthropic.com', 'noreply.github.com', 'accounts.google.com'];
  const ignoredPrefixes = ['no-reply', 'noreply', 'do-not-reply', 'donotreply', 'mailer-daemon'];
  const fromDomain = fromAddr.split('@')[1] || '';
  const fromLocal = fromAddr.split('@')[0] || '';
  if (ignoredDomains.some(d => fromDomain === d) || ignoredPrefixes.some(p => fromLocal.startsWith(p))) {
    await client.messageFlagsAdd({ uid: rawMsg.uid }, ['\\Seen'], { uid: true });
    return false;
  }

  if (!isLikelyEmail(fromAddr)) {
    await client.messageFlagsAdd({ uid: rawMsg.uid }, ['\\Seen'], { uid: true });
    return false;
  }

  // ── Find / create contact ─────────────────────────────────────────────────
  let contact = null;
  let knownContacts = await findContactsByEmail(inbox.agent_id, fromAddr);
  contact = knownContacts[0] || null;
  if (contact && fromName && !isPlaceholderContactName(fromName, fromAddr) && isPlaceholderContactName(contact.name, fromAddr)) {
    contact = await prisma.contact.update({
      where: { id: contact.id },
      data: { name: String(fromName).trim() || contact.name },
    });
    knownContacts[0] = contact;
  }
  // Delay contact auto-create until after thread matching so replies do not
  // generate orphan contacts when the thread already belongs to an existing customer.

  // ── Find matching open conversation (thread matching) ─────────────────────
  // Strategy: match by inReplyTo header → message.email_message_id, then fall back
  // to same inbox+contact+open status within 7 days.
  let conversation = await findConversationByReferences(replyReferenceIds);

  if (conversation) {
    contact = await hydrateConversationContact(conversation);
    if (contact) knownContacts = [contact];
  }

  if (!conversation) {
    conversation = await findConversationByContactSync({
      inboxId: inbox.id,
      contactIds: knownContacts.map(item => item.id),
      normalizedSubject,
    });
  }

  if (!contact) {
    contact = await createSenderContact({ agentId: inbox.agent_id, fromAddr, fromName });
    knownContacts = [contact];
  }

  if (conversation?.contact_id && conversation.contact_id !== contact.id) {
    const threadedContact = knownContacts.find(item => item.id === conversation.contact_id)
      || await hydrateConversationContact(conversation);
    if (threadedContact) {
      contact = threadedContact;
    }
  }

  if (conversation && !conversation.contact_id) {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { contact_id: contact.id, updated_at: messageDate },
    });
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
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data:  { status: 'open', updated_at: messageDate },
    });
  }

  // ── Persist message ───────────────────────────────────────────────────────
  const newMsg = await prisma.message.create({
    data: {
      id:               uuidv4(),
      conversation_id:  conversation.id,
      role:             'customer',
      text:             bodyText || null,
      html:             rawHtml || null,
      attachments:      inboundAttachments.length ? JSON.stringify(inboundAttachments) : null,
      email_message_id: messageId,
      is_read:          0,
      created_at:       messageDate,
    },
  });

  // Bump conversation.updated_at
  await prisma.conversation.update({
    where: { id: conversation.id },
    data:  { updated_at: messageDate },
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
      updated_at:    messageDate.toISOString(),
    },
    message: {
      id:              newMsg.id,
      conversation_id: newMsg.conversation_id,
      role:            'customer',
      text:            newMsg.text,
      html:            newMsg.html || null,
      attachments:     inboundAttachments,
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
async function sendEmail({ inboxId, to, cc, bcc, subject, text, html, inReplyTo, attachments = [] }) {
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
    attachments: normalizeAttachmentList(attachments).map(formatAttachmentForMail).filter(Boolean),
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
  extractVisibleEmailText: stripQuotedEmailText,
};
