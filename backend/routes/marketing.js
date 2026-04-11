const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid, parseJson } = require('../utils/helpers');

let emailSvc = null;
try { emailSvc = require('../services/emailService'); } catch {}

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
    unsubscribe: custom.unsubscribe || '',
  };

  return raw.replace(/\{\{(\w+)\}\}/g, (_match, key) => (
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  ));
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

async function launchCampaign(campaignRow, agentId) {
  const campaign = normalizeCampaignRow(campaignRow);
  if (!campaign) throw marketingError('Campaign not found', 404);

  const audience = await resolveCampaignAudience(campaign, agentId);
  if (!audience.length) {
    throw marketingError('No recipients found for this campaign', 422, { campaign });
  }

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

    for (const recipient of recipients) {
      try {
        const mergedSubject = mergeCampaignText(campaign.subject || campaign.name || 'Campaign', recipient).trim();
        const mergedBody = mergeCampaignText(campaign.body || '', recipient).trim();

        await emailSvc.sendEmail({
          inboxId: inbox.id,
          to: recipient.email,
          subject: mergedSubject || campaign.name || 'Campaign',
          text: mergedBody || ' ',
        });

        sent += 1;
        results.push({ email: recipient.email, name: recipient.name || null, status: 'sent' });
      } catch (err) {
        failed += 1;
        results.push({ email: recipient.email, name: recipient.name || null, status: 'failed', error: err.message });
      }
    }

    const stats = {
      ...campaign.stats,
      sent,
      delivered: sent,
      opens: 0,
      clicks: 0,
      failed,
      unsub: Number(campaign.stats?.unsub || 0),
    };

    if (!sent) {
      const updated = await persistCampaignLaunch(campaign.id, agentId, {
        status: 'failed',
        sentAt: null,
        stats,
      });
      const firstError = results.find(result => result.error)?.error || 'Failed to send this campaign to any recipient';
      throw marketingError(firstError, 422, {
        campaign: updated,
        summary: {
          sent: 0,
          failed,
          totalRecipients: recipients.length,
          channel: 'email',
          inbox: inbox.name,
        },
        results,
      });
    }

    const updated = await persistCampaignLaunch(campaign.id, agentId, {
      status: 'sent',
      sentAt: nowIso(),
      stats,
    });
    return {
      campaign: updated,
      summary: {
        sent,
        failed,
        totalRecipients: recipients.length,
        channel: 'email',
        inbox: inbox.name,
      },
      results,
    };
  }

  const sent = audience.length;
  const stats = {
    ...campaign.stats,
    sent,
    delivered: sent,
    opens: 0,
    clicks: 0,
    failed: 0,
    unsub: Number(campaign.stats?.unsub || 0),
  };

  const updated = await persistCampaignLaunch(campaign.id, agentId, {
    status: 'sent',
    sentAt: nowIso(),
    stats,
  });
  return {
    campaign: updated,
    summary: {
      sent,
      failed: 0,
      totalRecipients: audience.length,
      channel: campaign.type,
      simulated: true,
    },
    results: [],
  };
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
    } = req.body;

    const launchNow = !!req.body.launch_now || status === 'active' || status === 'sent';
    if (!name) return res.status(400).json({ error: 'name required' });

    const id = uid();
    await db.prepare(
      'INSERT INTO campaigns (id,name,type,goal,status,subject,body,segment_id,audience_mode,selected_contacts,scheduled_at,ab_test,stats,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
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
      req.agent.id
    );

    const campaign = await db.prepare('SELECT * FROM campaigns WHERE id=? AND agent_id=?').get(id, req.agent.id);
    if (launchNow) {
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
    const fields = ['name', 'type', 'goal', 'subject', 'body', 'segment_id', 'scheduled_at', 'ab_test', 'audience_mode'];
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

module.exports = router;
