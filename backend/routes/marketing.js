const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid, parseJson } = require('../utils/helpers');
const { broadcastToAll } = require('../ws');

let emailSvc = null;
try { emailSvc = require('../services/emailService'); } catch {}

let whatsappSvc = null;
try { whatsappSvc = require('../services/whatsappService'); } catch {}

let smsSvc = null;
try { smsSvc = require('../services/smsService'); } catch {}

let facebookSvc = null;
try { facebookSvc = require('../services/facebookService'); } catch {}

let instagramSvc = null;
try { instagramSvc = require('../services/instagramService'); } catch {}

const nowIso = () => new Date().toISOString();

function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  const parsed = parseJson(value, []);
  return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function normalizeInboxConfig(raw) {
  if (emailSvc?.parseConfig) return emailSvc.parseConfig(raw);
  return parseJson(raw, {});
}

function marketingError(message, statusCode = 422, extras = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extras);
  return error;
}

function normalizeCampaignRow(row) {
  if (!row) return null;
  return {
    ...row,
    stats: parseJson(row.stats, {}),
    selected_contacts: toArray(row.selected_contacts),
    audience_mode: row.audience_mode || 'segments',
  };
}

function normalizeSegmentRow(row) {
  if (!row) return null;
  return {
    ...row,
    conditions: toArray(row.conditions),
    contacts_json: toArray(row.contacts_json),
    source: row.source || 'rules',
  };
}

function dedupeAudience(items = []) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const normalized = {
      ...item,
      email: normalizeEmail(item.email),
      phone: String(item.phone || '').trim(),
      name: String(item.name || '').trim(),
    };

    const key = normalized.id
      ? `id:${normalized.id}`
      : normalized.email
        ? `email:${normalized.email}`
        : normalized.phone
          ? `phone:${normalized.phone}`
          : '';

    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function getContactCustomFields(contact) {
  const parsed = parseJson(contact?.custom_fields, {});
  return parsed && typeof parsed === 'object' ? parsed : {};
}

function getContactTags(contact) {
  return toArray(contact?.tags).map(tag => String(tag).trim()).filter(Boolean);
}

function getContactAttr(contact, attr) {
  const custom = getContactCustomFields(contact);
  const tags = getContactTags(contact);

  switch (attr) {
    case 'status':
      return custom.status || contact.status || '';
    case 'plan':
      return custom.plan || contact.plan || '';
    case 'activity':
      return custom.activity || custom.last_activity || contact.updated_at || contact.created_at || '';
    case 'spend':
      return custom.spend ?? custom.total_spend ?? custom.totalSpend ?? contact.spend ?? 0;
    case 'channel':
      return custom.channel || contact.channel || tags;
    case 'tags':
      return tags;
    case 'location':
      return contact.location || custom.location || '';
    case 'language':
      return custom.language || contact.language || '';
    case 'email':
      return contact.email || '';
    case 'phone':
      return contact.phone || '';
    case 'company':
      return contact.company || custom.company || '';
    case 'timezone':
      return contact.timezone || custom.timezone || '';
    case 'name':
      return contact.name || '';
    default:
      return custom[attr] ?? contact[attr] ?? '';
  }
}

function toComparable(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;

  const raw = String(value).trim();
  if (!raw) return '';

  const cleanedNumber = raw.replace(/[₹$,]/g, '');
  if (/^-?\d+(\.\d+)?$/.test(cleanedNumber)) return Number(cleanedNumber);

  const timestamp = Date.parse(raw);
  if (!Number.isNaN(timestamp) && /[-/: ]/.test(raw)) return timestamp;

  return raw.toLowerCase();
}

function compareRuleValue(actual, op, expected) {
  if (Array.isArray(actual)) {
    const arr = actual.map(item => String(item || '').trim().toLowerCase()).filter(Boolean);
    const exp = String(expected || '').trim().toLowerCase();
    if (op === 'contains') return arr.some(item => item.includes(exp));
    if (op === 'not_equals') return !arr.some(item => item === exp);
    return arr.some(item => item === exp);
  }

  const expectedComparable = toComparable(expected);
  const actualComparable = toComparable(actual);

  if (op === 'contains') {
    return String(actual || '').toLowerCase().includes(String(expected || '').toLowerCase());
  }
  if (op === 'greater_than') {
    return actualComparable !== null && expectedComparable !== null && actualComparable > expectedComparable;
  }
  if (op === 'less_than') {
    return actualComparable !== null && expectedComparable !== null && actualComparable < expectedComparable;
  }
  if (op === 'not_equals') {
    return actualComparable !== expectedComparable;
  }

  return actualComparable === expectedComparable;
}

function matchesSegmentConditions(contact, conditions = []) {
  if (!conditions.length) return false;
  return conditions.every(rule => {
    if (!rule?.attr) return true;
    if (rule.val === undefined || rule.val === null || String(rule.val).trim() === '') return true;
    return compareRuleValue(getContactAttr(contact, rule.attr), rule.op || 'equals', rule.val);
  });
}

async function resolveSegmentAudience(segmentRow, agentId) {
  const segment = normalizeSegmentRow(segmentRow);
  if (!segment) return [];

  if (segment.source === 'manual' || segment.source === 'csv') {
    return dedupeAudience(segment.contacts_json);
  }

  if (!segment.conditions.length) return [];

  const contacts = await db.prepare('SELECT * FROM contacts WHERE agent_id=? ORDER BY created_at ASC').all(agentId);
  return dedupeAudience(contacts.filter(contact => matchesSegmentConditions(contact, segment.conditions)));
}

async function resolveGroupAudience(groupId, agentId) {
  if (!groupId) return [];
  const members = await db.prepare(
    'SELECT c.* FROM contacts c INNER JOIN contact_group_members m ON c.id=m.contact_id WHERE m.group_id=? AND c.agent_id=? ORDER BY c.created_at ASC'
  ).all(groupId, agentId);
  return dedupeAudience(members);
}

async function resolveCampaignAudience(campaignRow, agentId) {
  const campaign = normalizeCampaignRow(campaignRow);
  if (!campaign) return [];

  if (campaign.audience_mode === 'individual') {
    const ids = toArray(campaign.selected_contacts);
    if (!ids.length) return [];

    const placeholders = ids.map(() => '?').join(',');
    const contacts = await db.prepare(`SELECT * FROM contacts WHERE agent_id=? AND id IN (${placeholders}) ORDER BY created_at ASC`).all(agentId, ...ids);
    return dedupeAudience(contacts);
  }

  if (campaign.audience_mode === 'groups') {
    const groupIds = toArray(campaign.selected_contacts);
    if (!groupIds.length) return [];
    let all = [];
    for (const gid of groupIds) {
      const members = await resolveGroupAudience(gid, agentId);
      all = all.concat(members);
    }
    return dedupeAudience(all);
  }

  if (!campaign.segment_id) return [];

  const segment = await db.prepare('SELECT * FROM segments WHERE id=? AND agent_id=?').get(campaign.segment_id, agentId);
  return resolveSegmentAudience(segment, agentId);
}

async function computeSegmentContactCount({ agentId, source = 'rules', conditions = [], contacts = [] }) {
  const audience = await resolveSegmentAudience({
    source,
    conditions,
    contacts_json: contacts,
  }, agentId);
  return audience.length;
}

function mergeCampaignText(text, recipient) {
  const raw = String(text || '');
  if (!raw) return '';

  const customRaw = typeof recipient?.custom_fields === 'object' && recipient.custom_fields
    ? recipient.custom_fields
    : parseJson(recipient?.custom_fields, {});
  const custom = customRaw && typeof customRaw === 'object' ? customRaw : {};

  const fullName = String(recipient?.name || '').trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  const vars = {
    first_name: nameParts[0] || fullName || normalizeEmail(recipient?.email).split('@')[0] || '',
    last_name: nameParts.slice(1).join(' '),
    email: recipient?.email || '',
    company: recipient?.company || custom.company || '',
    amount: custom.amount || '',
    discount: custom.discount || '',
    code: custom.code || '',
    link: custom.link || '',
    date: custom.date || '',
    time: custom.time || '',
    product: custom.product || '',
    order_id: custom.order_id || custom.orderId || '',
    status: custom.status || '',
    hours: custom.hours || '',
    points: custom.points || '',
    unsubscribe: custom.unsubscribe || 'To unsubscribe, reply STOP',
  };

  return raw.replace(/\{\{(\w+)\}\}/g, (_match, key) => (
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  ));
}

/**
 * Extract positional variable values ({{1}}, {{2}}, ...) from a WA template body.
 * Maps numbered placeholders to contact fields in order:
 * {{1}} → first_name, {{2}} → last_name, {{3}} → email, {{4}} → company, etc.
 */
function extractTemplateVars(templateText, recipient) {
  const matches = templateText.match(/\{\{(\d+)\}\}/g) || [];
  if (!matches.length) return [];

  const fullName = String(recipient?.name || '').trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const customRaw = typeof recipient?.custom_fields === 'object' && recipient.custom_fields
    ? recipient.custom_fields
    : parseJson(recipient?.custom_fields, {});
  const custom = customRaw && typeof customRaw === 'object' ? customRaw : {};

  // Ordered list of values to fill {{1}}, {{2}}, {{3}}...
  const orderedValues = [
    nameParts[0] || fullName || normalizeEmail(recipient?.email).split('@')[0] || 'Customer',
    nameParts.slice(1).join(' ') || '',
    recipient?.email || '',
    recipient?.company || custom.company || '',
    custom.amount || '',
    custom.code || '',
    custom.link || '',
    custom.product || '',
    custom.order_id || custom.orderId || '',
    custom.date || '',
  ];

  const maxIndex = Math.max(...matches.map(m => parseInt(m.replace(/[{}]/g, ''), 10)));
  const result = [];
  for (let i = 1; i <= maxIndex; i++) {
    result.push(orderedValues[i - 1] || '');
  }
  return result;
}

async function getLaunchableEmailInbox(agentId) {
  const inboxes = await db.prepare(
    'SELECT * FROM inboxes WHERE agent_id=? AND type=? AND active=1 ORDER BY created_at ASC, name ASC'
  ).all(agentId, 'email');

  return inboxes.find(inbox => {
    const cfg = normalizeInboxConfig(inbox.config);
    return !!(cfg.smtpHost && cfg.emailUser);
  }) || null;
}

async function getLaunchableWhatsAppInbox(agentId) {
  const inboxes = await db.prepare(
    'SELECT * FROM inboxes WHERE agent_id=? AND type=? AND active=1 ORDER BY created_at ASC, name ASC'
  ).all(agentId, 'whatsapp');

  return inboxes.find(inbox => {
    const cfg = normalizeInboxConfig(inbox.config);
    return !!(cfg.phoneNumberId && (cfg.apiKey || cfg.accessToken));
  }) || null;
}

async function getLaunchableSmsInbox(agentId) {
  const inboxes = await db.prepare(
    'SELECT * FROM inboxes WHERE agent_id=? AND type=? AND active=1 ORDER BY created_at ASC, name ASC'
  ).all(agentId, 'sms');

  return inboxes.find(inbox => {
    const cfg = normalizeInboxConfig(inbox.config);
    const hasSid = !!(cfg.accountSid || cfg.apiKey);
    const hasToken = !!(cfg.authToken || cfg.accessToken);
    const hasFrom = !!(cfg.fromNumber || cfg.phoneNumber);
    return hasSid && hasToken && hasFrom;
  }) || null;
}

async function getLaunchableFacebookInbox(agentId) {
  const inboxes = await db.prepare(
    'SELECT * FROM inboxes WHERE agent_id=? AND type=? AND active=1 ORDER BY created_at ASC, name ASC'
  ).all(agentId, 'facebook');

  return inboxes.find(inbox => {
    const cfg = normalizeInboxConfig(inbox.config);
    return !!(cfg.pageId && (cfg.accessToken || cfg.pageAccessToken));
  }) || null;
}

async function getLaunchableInstagramInbox(agentId) {
  const inboxes = await db.prepare(
    'SELECT * FROM inboxes WHERE agent_id=? AND type=? AND active=1 ORDER BY created_at ASC, name ASC'
  ).all(agentId, 'instagram');

  return inboxes.find(inbox => {
    const cfg = normalizeInboxConfig(inbox.config);
    return !!(cfg.accessToken || cfg.pageAccessToken);
  }) || null;
}

function broadcastCampaignProgress(campaignId, data) {
  broadcastToAll({
    type: 'campaign_progress',
    campaign_id: campaignId,
    ...data,
  });
}

function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

async function loadCampaignForAgent(campaignId, agentId) {
  return normalizeCampaignRow(
    await db.prepare('SELECT * FROM campaigns WHERE id=? AND agent_id=?').get(campaignId, agentId)
  );
}

async function persistCampaignLaunch(campaignId, agentId, { status, sentAt, stats }) {
  await db.prepare('UPDATE campaigns SET status=?, sent_at=?, stats=? WHERE id=? AND agent_id=?').run(
    status,
    sentAt || null,
    JSON.stringify(stats || {}),
    campaignId,
    agentId
  );
  return loadCampaignForAgent(campaignId, agentId);
}

// Track campaigns currently being sent to prevent double-launch
const sendingCampaigns = new Set();

async function launchCampaign(campaignRow, agentId) {
  const campaign = normalizeCampaignRow(campaignRow);
  if (!campaign) throw marketingError('Campaign not found', 404);

  // Prevent double-launch (but allow re-sending already-sent campaigns)
  if (sendingCampaigns.has(campaign.id)) {
    throw marketingError('Campaign is already being sent', 422, { campaign });
  }

  // If re-sending a previously sent campaign, clear old send logs and reset stats
  if (campaign.status === 'sent') {
    await db.prepare('DELETE FROM campaign_send_log WHERE campaign_id=?').run(campaign.id);
    await db.prepare('UPDATE campaigns SET stats=?, sent_at=NULL WHERE id=? AND agent_id=?').run(
      JSON.stringify({}), campaign.id, agentId
    );
  }

  sendingCampaigns.add(campaign.id);

  // Mark as sending in DB
  await db.prepare('UPDATE campaigns SET status=? WHERE id=? AND agent_id=?').run('sending', campaign.id, agentId);

  const audience = await resolveCampaignAudience(campaign, agentId);
  if (!audience.length) {
    sendingCampaigns.delete(campaign.id);
    throw marketingError('No recipients found for this campaign', 422, { campaign });
  }

  // Broadcast campaign start
  broadcastCampaignProgress(campaign.id, {
    status: 'sending',
    total: audience.length,
    sent: 0,
    failed: 0,
    channel: campaign.type,
    campaignName: campaign.name,
  });

  try {

  // ── EMAIL CAMPAIGN ─────────────────────────────────────────────
  if (campaign.type === 'email') {
    if (!emailSvc?.sendEmail) throw marketingError('Email service is unavailable', 503, { campaign });

    const inbox = await getLaunchableEmailInbox(agentId);
    if (!inbox) {
      throw marketingError('No active email inbox with SMTP configured', 422, { campaign });
    }

    const recipients = audience.filter(contact => isValidEmail(contact.email));
    if (!recipients.length) {
      throw marketingError('No recipients with valid email addresses found for this campaign', 422, { campaign });
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      try {
        const mergedSubject = mergeCampaignText(campaign.subject || campaign.name || 'Campaign', recipient).trim();
        const mergedBody = mergeCampaignText(campaign.body || '', recipient).trim();

        // Build HTML email body
        const isHtml = mergedBody.includes('<') && mergedBody.includes('>');
        const htmlBody = isHtml ? mergedBody : `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6">${mergedBody.replace(/\n/g, '<br>')}</div>`;

        await emailSvc.sendEmail({
          inboxId: inbox.id,
          to: recipient.email,
          subject: mergedSubject || campaign.name || 'Campaign',
          text: mergedBody.replace(/<[^>]+>/g, '') || ' ',
          html: htmlBody,
        });

        sent += 1;
        results.push({ email: recipient.email, name: recipient.name || null, status: 'sent' });

        // Log send
        await db.prepare('INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_email,channel,status,sent_at) VALUES (?,?,?,?,?,?,?,?)').run(
          uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.email, 'email', 'sent', nowIso()
        );
      } catch (err) {
        failed += 1;
        results.push({ email: recipient.email, name: recipient.name || null, status: 'failed', error: err.message });

        await db.prepare('INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_email,channel,status,error_message) VALUES (?,?,?,?,?,?,?,?)').run(
          uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.email, 'email', 'failed', err.message
        );
      }

      // Broadcast progress every message
      broadcastCampaignProgress(campaign.id, {
        status: 'sending',
        total: recipients.length,
        sent,
        failed,
        current: i + 1,
        currentContact: recipient.name || recipient.email,
        channel: 'email',
      });
    }

    const stats = { ...campaign.stats, sent, delivered: sent, opens: 0, clicks: 0, failed, unsub: Number(campaign.stats?.unsub || 0) };

    if (!sent) {
      const updated = await persistCampaignLaunch(campaign.id, agentId, { status: 'failed', sentAt: null, stats });
      broadcastCampaignProgress(campaign.id, { status: 'failed', total: recipients.length, sent: 0, failed, channel: 'email' });
      const firstError = results.find(result => result.error)?.error || 'Failed to send this campaign to any recipient';
      throw marketingError(firstError, 422, { campaign: updated, summary: { sent: 0, failed, totalRecipients: recipients.length, channel: 'email', inbox: inbox.name }, results });
    }

    const updated = await persistCampaignLaunch(campaign.id, agentId, { status: 'sent', sentAt: nowIso(), stats });
    broadcastCampaignProgress(campaign.id, { status: 'completed', total: recipients.length, sent, failed, channel: 'email' });
    return { campaign: updated, summary: { sent, failed, totalRecipients: recipients.length, channel: 'email', inbox: inbox.name }, results };
  }

  // ── WHATSAPP CAMPAIGN ──────────────────────────────────────────
  if (campaign.type === 'whatsapp') {
    const inbox = await getLaunchableWhatsAppInbox(agentId);
    if (!inbox && whatsappSvc?.sendWhatsAppMessage) {
      throw marketingError('No active WhatsApp inbox with API configured', 422, { campaign });
    }

    // Check if this campaign uses an approved Meta template
    let waTpl = null;
    if (campaignRow.wa_template_id) {
      waTpl = await db.prepare(
        'SELECT * FROM whatsapp_meta_templates WHERE id=? AND agent_id=?'
      ).get(campaignRow.wa_template_id, agentId);
      if (!waTpl) throw marketingError('Linked WA template not found', 404, { campaign });
      if (waTpl.status !== 'approved') {
        throw marketingError(`WA template "${waTpl.name}" is not approved (status: ${waTpl.status}). Only approved templates can be used.`, 422, { campaign });
      }
    }

    const recipients = audience.filter(contact => {
      const phone = normalizePhone(contact.phone);
      return phone.length >= 10;
    });
    if (!recipients.length) {
      throw marketingError('No recipients with valid phone numbers found for this campaign', 422, { campaign });
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const phone = normalizePhone(recipient.phone);

      try {
        let metaResponse = null;
        if (whatsappSvc && inbox) {
          if (waTpl) {
            // Send using approved Meta template
            const bodyVars = extractTemplateVars(waTpl.body || '', recipient);
            const headerVars = waTpl.header_type === 'TEXT' ? extractTemplateVars(waTpl.header_text || '', recipient) : [];

            // For IMAGE/VIDEO/DOCUMENT headers, Meta requires a valid public media URL
            const hdrType = waTpl.header_type || 'NONE';
            // Use campaign-level override, then template-level stored URL
            const mediaUrl = campaignRow.header_media_url || waTpl.header_media_url || '';
            if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(hdrType) && !mediaUrl) {
              throw new Error(
                `Template "${waTpl.name}" has a ${hdrType} header but no media URL is set. ` +
                `Edit the template in WA Templates and add a public media URL.`
              );
            }

            metaResponse = await whatsappSvc.sendWhatsAppTemplate({
              inboxId: inbox.id,
              to: phone,
              templateName: waTpl.name,
              language: waTpl.language || 'en_US',
              bodyParams: bodyVars,
              headerParams: headerVars,
              headerType: hdrType,
              headerMediaUrl: mediaUrl,
            });
          } else {
            // Send as plain text (only works within 24-hour window)
            const mergedBody = mergeCampaignText(campaign.body || '', recipient).trim();
            metaResponse = await whatsappSvc.sendWhatsAppMessage({
              inboxId: inbox.id,
              to: phone,
              text: mergedBody || campaign.name || 'Campaign message',
            });
          }
        }

        // Extract Meta message ID (wamid) for delivery tracking via webhooks
        const waMessageId = metaResponse?.messages?.[0]?.id || null;

        sent += 1;
        results.push({ phone: recipient.phone, name: recipient.name || null, status: 'sent', waMessageId });

        await db.prepare('INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_phone,channel,status,sent_at,wa_message_id) VALUES (?,?,?,?,?,?,?,?,?)').run(
          uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.phone, 'whatsapp', 'sent', nowIso(), waMessageId
        );
      } catch (err) {
        failed += 1;
        results.push({ phone: recipient.phone, name: recipient.name || null, status: 'failed', error: err.message });

        await db.prepare('INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_phone,channel,status,error_message) VALUES (?,?,?,?,?,?,?,?)').run(
          uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.phone, 'whatsapp', 'failed', err.message
        );
      }

      broadcastCampaignProgress(campaign.id, {
        status: 'sending',
        total: recipients.length,
        sent,
        failed,
        current: i + 1,
        currentContact: recipient.name || recipient.phone,
        channel: 'whatsapp',
      });
    }

    // delivered starts at 0 — real delivery is tracked via Meta status webhooks
    const stats = { ...campaign.stats, sent, delivered: 0, opens: 0, clicks: 0, failed, unsub: Number(campaign.stats?.unsub || 0) };
    const finalStatus = sent ? 'sent' : 'failed';
    const updated = await persistCampaignLaunch(campaign.id, agentId, { status: finalStatus, sentAt: sent ? nowIso() : null, stats });
    broadcastCampaignProgress(campaign.id, { status: sent ? 'completed' : 'failed', total: recipients.length, sent, failed, channel: 'whatsapp' });

    if (!sent) {
      const firstError = results.find(r => r.error)?.error || 'Failed to send WhatsApp campaign';
      throw marketingError(firstError, 422, { campaign: updated, summary: { sent: 0, failed, totalRecipients: recipients.length, channel: 'whatsapp' }, results });
    }

    return { campaign: updated, summary: { sent, failed, totalRecipients: recipients.length, channel: 'whatsapp', templateUsed: waTpl?.name || null, simulated: !inbox }, results };
  }

  // ── FACEBOOK CAMPAIGN ──────────────────────────────────────────
  if (campaign.type === 'facebook') {
    const inbox = await getLaunchableFacebookInbox(agentId);

    // Recipients: contacts tagged with 'facebook' or phone starting with 'fb:'
    const recipients = audience.filter(contact => {
      const phone = String(contact.phone || '').trim();
      const tags   = toArray(contact.tags).map(t => String(t).toLowerCase());
      return phone.startsWith('fb:') || tags.includes('facebook');
    });

    if (!recipients.length) {
      throw marketingError(
        'No recipients with Facebook IDs found. Contacts must have previously messaged your Facebook Page.',
        422, { campaign }
      );
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const fbId = String(recipient.phone || '').replace(/^fb:/i, '');
      const mergedBody = mergeCampaignText(campaign.body || '', recipient).trim();

      try {
        if (facebookSvc?.sendFacebookMessage && inbox) {
          await facebookSvc.sendFacebookMessage({
            inboxId: inbox.id,
            to:      fbId,
            text:    mergedBody || campaign.name || 'Campaign message',
          });
        }

        sent += 1;
        results.push({ fbId: recipient.phone, name: recipient.name || null, status: 'sent' });

        await db.prepare(
          'INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_phone,channel,status,sent_at) VALUES (?,?,?,?,?,?,?,?)'
        ).run(uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.phone, 'facebook', 'sent', nowIso());

      } catch (err) {
        failed += 1;
        results.push({ fbId: recipient.phone, name: recipient.name || null, status: 'failed', error: err.message });

        await db.prepare(
          'INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_phone,channel,status,error_message) VALUES (?,?,?,?,?,?,?,?)'
        ).run(uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.phone, 'facebook', 'failed', err.message);
      }

      broadcastCampaignProgress(campaign.id, {
        status:         'sending',
        total:          recipients.length,
        sent,
        failed,
        current:        i + 1,
        currentContact: recipient.name || recipient.phone,
        channel:        'facebook',
      });
    }

    const stats = { ...campaign.stats, sent, delivered: sent, opens: 0, clicks: 0, failed, unsub: Number(campaign.stats?.unsub || 0) };
    const finalStatus = sent ? 'sent' : 'failed';
    const updated = await persistCampaignLaunch(campaign.id, agentId, { status: finalStatus, sentAt: sent ? nowIso() : null, stats });
    broadcastCampaignProgress(campaign.id, { status: sent ? 'completed' : 'failed', total: recipients.length, sent, failed, channel: 'facebook' });

    if (!sent) {
      const firstError = results.find(r => r.error)?.error || 'Failed to send Facebook campaign';
      throw marketingError(firstError, 422, { campaign: updated, summary: { sent: 0, failed, totalRecipients: recipients.length, channel: 'facebook' }, results });
    }

    return { campaign: updated, summary: { sent, failed, totalRecipients: recipients.length, channel: 'facebook', simulated: !inbox }, results };
  }

  // ── INSTAGRAM CAMPAIGN ─────────────────────────────────────────
  if (campaign.type === 'instagram') {
    const inbox = await getLaunchableInstagramInbox(agentId);

    // Recipients: contacts tagged with 'instagram' or phone starting with 'ig:'
    const recipients = audience.filter(contact => {
      const phone = String(contact.phone || '').trim();
      const tags   = toArray(contact.tags).map(t => String(t).toLowerCase());
      return phone.startsWith('ig:') || tags.includes('instagram');
    });

    if (!recipients.length) {
      throw marketingError(
        'No recipients with Instagram IDs found. Contacts must have previously messaged your Instagram Business Account.',
        422, { campaign }
      );
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const igId = String(recipient.phone || '').replace(/^ig:/i, '');
      const mergedBody = mergeCampaignText(campaign.body || '', recipient).trim();

      try {
        if (instagramSvc?.sendInstagramMessage && inbox) {
          await instagramSvc.sendInstagramMessage({
            inboxId: inbox.id,
            to:      igId,
            text:    mergedBody || campaign.name || 'Campaign message',
          });
        }

        sent += 1;
        results.push({ igId: recipient.phone, name: recipient.name || null, status: 'sent' });

        await db.prepare(
          'INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_phone,channel,status,sent_at) VALUES (?,?,?,?,?,?,?,?)'
        ).run(uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.phone, 'instagram', 'sent', nowIso());

      } catch (err) {
        failed += 1;
        results.push({ igId: recipient.phone, name: recipient.name || null, status: 'failed', error: err.message });

        await db.prepare(
          'INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_phone,channel,status,error_message) VALUES (?,?,?,?,?,?,?,?)'
        ).run(uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.phone, 'instagram', 'failed', err.message);
      }

      broadcastCampaignProgress(campaign.id, {
        status:         'sending',
        total:          recipients.length,
        sent,
        failed,
        current:        i + 1,
        currentContact: recipient.name || recipient.phone,
        channel:        'instagram',
      });
    }

    const stats = { ...campaign.stats, sent, delivered: sent, opens: 0, clicks: 0, failed, unsub: Number(campaign.stats?.unsub || 0) };
    const finalStatus = sent ? 'sent' : 'failed';
    const updated = await persistCampaignLaunch(campaign.id, agentId, { status: finalStatus, sentAt: sent ? nowIso() : null, stats });
    broadcastCampaignProgress(campaign.id, { status: sent ? 'completed' : 'failed', total: recipients.length, sent, failed, channel: 'instagram' });

    if (!sent) {
      const firstError = results.find(r => r.error)?.error || 'Failed to send Instagram campaign';
      throw marketingError(firstError, 422, { campaign: updated, summary: { sent: 0, failed, totalRecipients: recipients.length, channel: 'instagram' }, results });
    }

    return { campaign: updated, summary: { sent, failed, totalRecipients: recipients.length, channel: 'instagram', simulated: !inbox }, results };
  }

  // ── SMS CAMPAIGN ───────────────────────────────────────────────
  if (campaign.type === 'sms') {
    const inbox = await getLaunchableSmsInbox(agentId);

    const recipients = audience.filter(contact => {
      const phone = normalizePhone(contact.phone);
      return phone.length >= 10;
    });
    if (!recipients.length) {
      throw marketingError('No recipients with valid phone numbers found for this campaign', 422, { campaign });
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const phone = normalizePhone(recipient.phone);
      const mergedBody = mergeCampaignText(campaign.body || '', recipient).trim();

      try {
        let twilioResult = null;
        if (smsSvc?.sendSms && inbox) {
          const statusCallback = process.env.PUBLIC_URL
            ? `${process.env.PUBLIC_URL}/api/sms/status`
            : undefined;
          twilioResult = await smsSvc.sendSms({
            inboxId: inbox.id,
            to: phone,
            text: mergedBody || campaign.name || 'Campaign message',
            statusCallback,
          });
        }
        // If no SMS service, still log as sent (simulated)

        sent += 1;
        results.push({ phone: recipient.phone, name: recipient.name || null, status: 'sent', sid: twilioResult?.sid || null });

        await db.prepare('INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_phone,channel,status,sent_at,sms_message_id) VALUES (?,?,?,?,?,?,?,?,?)').run(
          uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.phone, 'sms', 'sent', nowIso(), twilioResult?.sid || null
        );
      } catch (err) {
        failed += 1;
        results.push({ phone: recipient.phone, name: recipient.name || null, status: 'failed', error: err.message });

        await db.prepare('INSERT INTO campaign_send_log (id,campaign_id,contact_id,contact_name,contact_phone,channel,status,error_message) VALUES (?,?,?,?,?,?,?,?)').run(
          uid(), campaign.id, recipient.id || null, recipient.name || null, recipient.phone, 'sms', 'failed', err.message
        );
      }

      broadcastCampaignProgress(campaign.id, {
        status: 'sending',
        total: recipients.length,
        sent,
        failed,
        current: i + 1,
        currentContact: recipient.name || recipient.phone,
        channel: 'sms',
      });
    }

    const stats = { ...campaign.stats, sent, delivered: sent, opens: 0, clicks: 0, failed, unsub: Number(campaign.stats?.unsub || 0) };
    const finalStatus = sent ? 'sent' : 'failed';
    const updated = await persistCampaignLaunch(campaign.id, agentId, { status: finalStatus, sentAt: sent ? nowIso() : null, stats });
    broadcastCampaignProgress(campaign.id, { status: sent ? 'completed' : 'failed', total: recipients.length, sent, failed, channel: 'sms' });

    if (!sent) {
      const firstError = results.find(r => r.error)?.error || 'Failed to send SMS campaign';
      throw marketingError(firstError, 422, { campaign: updated, summary: { sent: 0, failed, totalRecipients: recipients.length, channel: 'sms' }, results });
    }

    return { campaign: updated, summary: { sent, failed, totalRecipients: recipients.length, channel: 'sms', simulated: !inbox }, results };
  }

  // ── PUSH / FALLBACK (simulated) ────────────────────────────────
  const sent = audience.length;
  const stats = { ...campaign.stats, sent, delivered: sent, opens: 0, clicks: 0, failed: 0, unsub: Number(campaign.stats?.unsub || 0) };

  const updated = await persistCampaignLaunch(campaign.id, agentId, { status: 'sent', sentAt: nowIso(), stats });
  broadcastCampaignProgress(campaign.id, { status: 'completed', total: audience.length, sent, failed: 0, channel: campaign.type });
  return { campaign: updated, summary: { sent, failed: 0, totalRecipients: audience.length, channel: campaign.type, simulated: true }, results: [] };

  } finally {
    sendingCampaigns.delete(campaign.id);
  }
}

// Campaigns
router.get('/campaigns', auth, async (req, res) => {
  try {
    const campaigns = await db.prepare('SELECT * FROM campaigns WHERE agent_id=? ORDER BY created_at DESC').all(req.agent.id);
    res.json({ campaigns: campaigns.map(normalizeCampaignRow) });
  } catch (e) {
    console.error('❌ GET /api/marketing/campaigns error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/campaigns/:id', auth, async (req, res) => {
  try {
    const campaign = normalizeCampaignRow(await db.prepare('SELECT * FROM campaigns WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id));
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    res.json({ campaign });
  } catch (e) {
    console.error('❌ GET /api/marketing/campaigns/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/campaigns', auth, async (req, res) => {
  try {
    const {
      name,
      type = 'email',
      goal = 'promotion',
      status = 'draft',
      subject,
      body,
      segment_id,
      audience_mode = 'segments',
      selected_contacts = [],
      scheduled_at,
      ab_test = false,
      wa_template_id,
    } = req.body;

    const launchNow = !!req.body.launch_now || status === 'active' || status === 'sent';
    if (!name) return res.status(400).json({ error: 'name required' });

    const id = uid();
    await db.prepare(
      'INSERT INTO campaigns (id,name,type,goal,status,subject,body,segment_id,audience_mode,selected_contacts,scheduled_at,ab_test,stats,wa_template_id,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    ).run(
      id,
      name,
      type,
      goal,
      launchNow ? 'draft' : status,
      subject || null,
      body || null,
      segment_id || null,
      audience_mode || 'segments',
      JSON.stringify(toArray(selected_contacts)),
      scheduled_at || null,
      ab_test ? 1 : 0,
      '{}',
      wa_template_id || null,
      req.agent.id
    );

    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id=? AND agent_id=?').get(id, req.agent.id);
    if (launchNow) {
      // Pass header_media_url as runtime override (not stored in DB)
      if (req.body.header_media_url) campaign.header_media_url = req.body.header_media_url;
      const launched = await launchCampaign(campaign, req.agent.id);
      return res.status(201).json(launched);
    }

    res.status(201).json({ campaign: normalizeCampaignRow(campaign) });
  } catch (e) {
    console.error('❌ POST /api/marketing/campaigns error:', e.message);
    res.status(e.statusCode || 500).json({
      error: e.message,
      campaign: e.campaign || null,
      summary: e.summary || null,
      results: e.results || [],
    });
  }
});

router.patch('/campaigns/:id', auth, async (req, res) => {
  try {
    const current = await db.prepare('SELECT * FROM campaigns WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!current) return res.status(404).json({ error: 'Not found' });

    const launchNow = !!req.body.launch_now || req.body.status === 'sent';
    const fields = ['name', 'type', 'goal', 'subject', 'body', 'segment_id', 'scheduled_at', 'ab_test', 'audience_mode', 'wa_template_id'];
    const updates = {};

    for (const field of fields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (req.body.selected_contacts !== undefined) updates.selected_contacts = JSON.stringify(toArray(req.body.selected_contacts));
    if (req.body.status !== undefined && !launchNow) updates.status = req.body.status;

    if (Object.keys(updates).length) {
      const sets = Object.keys(updates).map(key => `${key}=?`).join(',');
      await db.prepare(`UPDATE campaigns SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
    }

    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (launchNow) {
      if (req.body.header_media_url) campaign.header_media_url = req.body.header_media_url;
      const launched = await launchCampaign(campaign, req.agent.id);
      return res.json(launched);
    }

    res.json({ campaign: normalizeCampaignRow(campaign) });
  } catch (e) {
    console.error('❌ PATCH /api/marketing/campaigns/:id error:', e.message);
    res.status(e.statusCode || 500).json({
      error: e.message,
      campaign: e.campaign || null,
      summary: e.summary || null,
      results: e.results || [],
    });
  }
});

router.post('/campaigns/:id/launch', auth, async (req, res) => {
  try {
    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    res.json(await launchCampaign(campaign, req.agent.id));
  } catch (e) {
    console.error('❌ POST /api/marketing/campaigns/:id/launch error:', e.message);
    res.status(e.statusCode || 500).json({
      error: e.message,
      campaign: e.campaign || null,
      summary: e.summary || null,
      results: e.results || [],
    });
  }
});

router.delete('/campaigns/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM campaigns WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/marketing/campaigns/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Segments
router.get('/segments', auth, async (req, res) => {
  try {
    const segments = await db.prepare('SELECT * FROM segments WHERE agent_id=? ORDER BY name ASC').all(req.agent.id);
    res.json({ segments: segments.map(normalizeSegmentRow) });
  } catch (e) {
    console.error('❌ GET /api/marketing/segments error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/segments', auth, async (req, res) => {
  try {
    const { name, conditions = [], description = '', source = 'rules', contacts = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const normalizedContacts = dedupeAudience(toArray(contacts));
    const normalizedConditions = toArray(conditions);
    const count = await computeSegmentContactCount({
      agentId: req.agent.id,
      source,
      conditions: normalizedConditions,
      contacts: normalizedContacts,
    });

    const id = uid();
    await db.prepare(
      'INSERT INTO segments (id,name,description,conditions,source,contacts_json,contact_count,agent_id) VALUES (?,?,?,?,?,?,?,?)'
    ).run(
      id,
      name,
      description,
      JSON.stringify(normalizedConditions),
      source,
      JSON.stringify(normalizedContacts),
      count,
      req.agent.id
    );

    const segment = await db.prepare('SELECT * FROM segments WHERE id=? AND agent_id=?').get(id, req.agent.id);
    res.status(201).json({ segment: normalizeSegmentRow(segment) });
  } catch (e) {
    console.error('❌ POST /api/marketing/segments error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/segments/:id', auth, async (req, res) => {
  try {
    const current = await db.prepare('SELECT * FROM segments WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!current) return res.status(404).json({ error: 'Not found' });

    const currentSegment = normalizeSegmentRow(current);
    const nextSource = req.body.source !== undefined ? req.body.source : currentSegment.source;
    const nextConditions = req.body.conditions !== undefined ? toArray(req.body.conditions) : currentSegment.conditions;
    const nextContacts = req.body.contacts !== undefined ? dedupeAudience(toArray(req.body.contacts)) : currentSegment.contacts_json;
    const nextCount = await computeSegmentContactCount({
      agentId: req.agent.id,
      source: nextSource,
      conditions: nextConditions,
      contacts: nextContacts,
    });

    const updates = {
      source: nextSource,
      conditions: JSON.stringify(nextConditions),
      contacts_json: JSON.stringify(nextContacts),
      contact_count: nextCount,
    };

    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;

    const sets = Object.keys(updates).map(key => `${key}=?`).join(',');
    await db.prepare(`UPDATE segments SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);

    const segment = await db.prepare('SELECT * FROM segments WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    res.json({ segment: normalizeSegmentRow(segment) });
  } catch (e) {
    console.error('❌ PATCH /api/marketing/segments/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/segments/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM segments WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/marketing/segments/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Segment reach — compute real contact count matching rules
router.post('/segments/reach', auth, async (req, res) => {
  try {
    const { source = 'rules', conditions = [], contacts = [] } = req.body;
    const count = await computeSegmentContactCount({
      agentId: req.agent.id,
      source,
      conditions: toArray(conditions),
      contacts: toArray(contacts),
    });
    res.json({ count });
  } catch (e) {
    console.error('❌ POST /api/marketing/segments/reach error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = await db.prepare('SELECT * FROM campaign_templates WHERE agent_id=? ORDER BY name ASC').all(req.agent.id);
    res.json({ templates });
  } catch (e) {
    console.error('❌ GET /api/marketing/templates error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/templates/:id', auth, async (req, res) => {
  try {
    const template = await db.prepare('SELECT * FROM campaign_templates WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!template) return res.status(404).json({ error: 'Not found' });
    res.json({ template });
  } catch (e) {
    console.error('❌ GET /api/marketing/templates/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/templates', auth, async (req, res) => {
  try {
    const { name, type = 'email', category = 'General', description = '', subject, body } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const id = uid();
    await db.prepare('INSERT INTO campaign_templates (id,name,type,category,description,subject,body,agent_id) VALUES (?,?,?,?,?,?,?,?)').run(
      id,
      name,
      type,
      category,
      description,
      subject || null,
      body || null,
      req.agent.id
    );

    const template = await db.prepare('SELECT * FROM campaign_templates WHERE id=? AND agent_id=?').get(id, req.agent.id);
    res.status(201).json({ template });
  } catch (e) {
    console.error('❌ POST /api/marketing/templates error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/templates/:id', auth, async (req, res) => {
  try {
    const template = await db.prepare('SELECT * FROM campaign_templates WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!template) return res.status(404).json({ error: 'Not found' });

    const fields = ['name', 'type', 'category', 'description', 'subject', 'body'];
    const updates = {};
    for (const field of fields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (!Object.keys(updates).length) return res.json({ template });

    const sets = Object.keys(updates).map(key => `${key}=?`).join(',');
    await db.prepare(`UPDATE campaign_templates SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);

    res.json({
      template: await db.prepare('SELECT * FROM campaign_templates WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id),
    });
  } catch (e) {
    console.error('❌ PATCH /api/marketing/templates/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/templates/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM campaign_templates WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/marketing/templates/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ═══ Contact Groups ═══
router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await db.prepare('SELECT * FROM contact_groups WHERE agent_id=? ORDER BY name ASC').all(req.agent.id);
    // Attach member counts
    for (const g of groups) {
      const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM contact_group_members WHERE group_id=?').get(g.id);
      g.contact_count = countRow?.cnt || 0;
    }
    res.json({ groups });
  } catch (e) {
    console.error('❌ GET /api/marketing/groups error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/groups/:id', auth, async (req, res) => {
  try {
    const group = await db.prepare('SELECT * FROM contact_groups WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!group) return res.status(404).json({ error: 'Not found' });

    const members = await db.prepare(
      'SELECT c.*, m.added_at FROM contacts c INNER JOIN contact_group_members m ON c.id=m.contact_id WHERE m.group_id=? ORDER BY m.added_at DESC'
    ).all(req.params.id);
    group.contact_count = members.length;
    group.members = members;
    res.json({ group });
  } catch (e) {
    console.error('❌ GET /api/marketing/groups/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description = '', color = '#6366f1', icon = '👥', contact_ids = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const id = uid();
    await db.prepare(
      'INSERT INTO contact_groups (id,name,description,color,icon,contact_count,agent_id) VALUES (?,?,?,?,?,?,?)'
    ).run(id, name, description, color, icon, 0, req.agent.id);

    // Add initial members
    const ids = toArray(contact_ids);
    for (const cid of ids) {
      await db.prepare('INSERT INTO contact_group_members (id,group_id,contact_id) VALUES (?,?,?)').run(uid(), id, cid);
    }

    // Update count
    await db.prepare('UPDATE contact_groups SET contact_count=? WHERE id=?').run(ids.length, id);

    const group = await db.prepare('SELECT * FROM contact_groups WHERE id=? AND agent_id=?').get(id, req.agent.id);
    group.contact_count = ids.length;
    res.status(201).json({ group });
  } catch (e) {
    console.error('❌ POST /api/marketing/groups error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.patch('/groups/:id', auth, async (req, res) => {
  try {
    const group = await db.prepare('SELECT * FROM contact_groups WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!group) return res.status(404).json({ error: 'Not found' });

    const fields = ['name', 'description', 'color', 'icon'];
    const updates = {};
    for (const field of fields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    updates.updated_at = nowIso();

    if (Object.keys(updates).length) {
      const sets = Object.keys(updates).map(key => `${key}=?`).join(',');
      await db.prepare(`UPDATE contact_groups SET ${sets} WHERE id=? AND agent_id=?`).run(...Object.values(updates), req.params.id, req.agent.id);
    }

    const updated = await db.prepare('SELECT * FROM contact_groups WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM contact_group_members WHERE group_id=?').get(req.params.id);
    updated.contact_count = countRow?.cnt || 0;
    res.json({ group: updated });
  } catch (e) {
    console.error('❌ PATCH /api/marketing/groups/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/groups/:id', auth, async (req, res) => {
  try {
    await db.prepare('DELETE FROM contact_group_members WHERE group_id=?').run(req.params.id);
    await db.prepare('DELETE FROM contact_groups WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/marketing/groups/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Add contacts to group
router.post('/groups/:id/members', auth, async (req, res) => {
  try {
    const group = await db.prepare('SELECT * FROM contact_groups WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const { contact_ids = [] } = req.body;
    const ids = toArray(contact_ids);
    let added = 0;

    for (const cid of ids) {
      const existing = await db.prepare('SELECT id FROM contact_group_members WHERE group_id=? AND contact_id=?').get(req.params.id, cid);
      if (!existing) {
        await db.prepare('INSERT INTO contact_group_members (id,group_id,contact_id) VALUES (?,?,?)').run(uid(), req.params.id, cid);
        added++;
      }
    }

    const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM contact_group_members WHERE group_id=?').get(req.params.id);
    await db.prepare('UPDATE contact_groups SET contact_count=?, updated_at=? WHERE id=?').run(countRow?.cnt || 0, nowIso(), req.params.id);

    res.json({ success: true, added, total: countRow?.cnt || 0 });
  } catch (e) {
    console.error('❌ POST /api/marketing/groups/:id/members error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Remove contacts from group
router.post('/groups/:id/members/remove', auth, async (req, res) => {
  try {
    const group = await db.prepare('SELECT * FROM contact_groups WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const { contact_ids = [] } = req.body;
    const ids = toArray(contact_ids);

    for (const cid of ids) {
      await db.prepare('DELETE FROM contact_group_members WHERE group_id=? AND contact_id=?').run(req.params.id, cid);
    }

    const countRow = await db.prepare('SELECT COUNT(*) as cnt FROM contact_group_members WHERE group_id=?').get(req.params.id);
    await db.prepare('UPDATE contact_groups SET contact_count=?, updated_at=? WHERE id=?').run(countRow?.cnt || 0, nowIso(), req.params.id);

    res.json({ success: true, removed: ids.length, total: countRow?.cnt || 0 });
  } catch (e) {
    console.error('❌ DELETE /api/marketing/groups/:id/members error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Campaign send log
router.get('/campaigns/:id/log', auth, async (req, res) => {
  try {
    const campaign = await db.prepare('SELECT id FROM campaigns WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!campaign) return res.status(404).json({ error: 'Not found' });
    const logs = await db.prepare('SELECT * FROM campaign_send_log WHERE campaign_id=? ORDER BY created_at DESC').all(req.params.id);
    res.json({ logs });
  } catch (e) {
    console.error('❌ GET /api/marketing/campaigns/:id/log error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Resend a single failed log entry ──
router.post('/campaigns/:id/resend-log/:logId', auth, async (req, res) => {
  try {
    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const log = await db.prepare('SELECT * FROM campaign_send_log WHERE id=? AND campaign_id=?').get(req.params.logId, req.params.id);
    if (!log) return res.status(404).json({ error: 'Log entry not found' });
    if (log.status !== 'failed') return res.status(400).json({ error: 'Only failed entries can be resent' });

    const recipient = {
      id:    log.contact_id,
      name:  log.contact_name,
      phone: log.contact_phone,
      email: log.contact_email,
    };
    const mergedBody = mergeCampaignText(campaign.body || '', recipient).trim();
    const channel = log.channel || campaign.type;

    try {
      if (channel === 'facebook') {
        const inbox = await getLaunchableFacebookInbox(req.agent.id);
        if (!inbox) throw new Error('No active Facebook inbox found');
        const fbId = String(recipient.phone || '').replace(/^fb:/i, '');
        await facebookSvc.sendFacebookMessage({ inboxId: inbox.id, to: fbId, text: mergedBody || campaign.name });

      } else if (channel === 'instagram') {
        const inbox = await getLaunchableInstagramInbox(req.agent.id);
        if (!inbox) throw new Error('No active Instagram inbox found');
        const igId = String(recipient.phone || '').replace(/^ig:/i, '');
        await instagramSvc.sendInstagramMessage({ inboxId: inbox.id, to: igId, text: mergedBody || campaign.name });

      } else if (channel === 'sms') {
        const inbox = await getLaunchableSmsInbox(req.agent.id);
        if (!inbox) throw new Error('No active SMS inbox found');
        await smsSvc.sendSms({ inboxId: inbox.id, to: recipient.phone, body: mergedBody });

      } else if (channel === 'whatsapp') {
        const inbox = await db.prepare("SELECT * FROM inboxes WHERE agent_id=? AND type='whatsapp' AND active=1 LIMIT 1").get(req.agent.id);
        if (!inbox) throw new Error('No active WhatsApp inbox found');
        await whatsappSvc.sendWhatsAppMessage({ inboxId: inbox.id, to: recipient.phone, body: mergedBody });

      } else if (channel === 'email') {
        await emailSvc.sendEmail({ to: recipient.email, subject: campaign.subject || campaign.name, html: mergedBody });

      } else {
        throw new Error(`Unsupported channel: ${channel}`);
      }

      await db.prepare(
        "UPDATE campaign_send_log SET status='sent', sent_at=?, error_message=NULL WHERE id=?"
      ).run(nowIso(), log.id);

      // Update campaign failed/sent counts
      await db.prepare(`
        UPDATE campaigns SET
          stats = JSON_SET(COALESCE(stats,'{}'),
            '$.failed', MAX(0, CAST(JSON_EXTRACT(COALESCE(stats,'{}'),'$.failed') AS INTEGER) - 1),
            '$.sent',   CAST(JSON_EXTRACT(COALESCE(stats,'{}'),'$.sent') AS INTEGER) + 1,
            '$.delivered', CAST(JSON_EXTRACT(COALESCE(stats,'{}'),'$.delivered') AS INTEGER) + 1
          )
        WHERE id=?
      `).run(campaign.id);

      res.json({ success: true, status: 'sent' });

    } catch (sendErr) {
      await db.prepare(
        "UPDATE campaign_send_log SET error_message=? WHERE id=?"
      ).run(sendErr.message, log.id);
      res.status(422).json({ error: sendErr.message });
    }
  } catch (e) {
    console.error('❌ POST resend-log error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Approved WA templates for campaign template selector
router.get('/wa-templates-approved', auth, async (req, res) => {
  try {
    const templates = await db.prepare(
      "SELECT id, name, category, language, body, header_text, footer FROM whatsapp_meta_templates WHERE agent_id=? AND status='approved' ORDER BY name ASC"
    ).all(req.agent.id);
    res.json({ templates });
  } catch (e) {
    console.error('❌ GET /api/marketing/wa-templates-approved error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Campaign responses — conversations started from campaign replies
router.get('/campaigns/:id/responses', auth, async (req, res) => {
  try {
    const convs = await db.prepare(`
      SELECT c.*, ct.name as contact_name, ct.email as contact_email,
             ct.phone as contact_phone, ct.avatar as contact_avatar, ct.color as contact_color,
             i.name as inbox_name, i.type as inbox_type
      FROM conversations c
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN inboxes i ON c.inbox_id = i.id
      WHERE c.campaign_id=? AND c.agent_id=?
      ORDER BY c.updated_at DESC
    `).all(req.params.id, req.agent.id);

    for (const cv of convs) {
      const last = await db.prepare('SELECT text, role, created_at FROM messages WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1').get(cv.id);
      cv.lastMessage = last || null;
      const unreadRow = await db.prepare("SELECT COUNT(*) as c FROM messages WHERE conversation_id=? AND is_read=0 AND role='customer'").get(cv.id);
      cv.unreadCount = unreadRow ? unreadRow.c : 0;
      try { cv.labels = JSON.parse(cv.labels || '[]'); } catch { cv.labels = []; }
    }

    res.json({ conversations: convs, total: convs.length });
  } catch (e) {
    console.error('❌ GET /api/marketing/campaigns/:id/responses error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.launchCampaign = launchCampaign;
module.exports.normalizeCampaignRow = normalizeCampaignRow;
