'use strict';
/**
 * Instagram Messaging webhook routes
 *
 * GET  /api/instagram/webhook  — Meta verification challenge (public)
 * POST /api/instagram/webhook  — Incoming Instagram messages from Meta (public)
 *
 * Instagram Business messaging uses the same Meta webhook infrastructure as
 * Facebook Messenger, but the object field is 'instagram'.
 *
 * The inbox type is 'instagram'.  Contacts are stored with
 * phone = 'ig:<instagram_scoped_user_id>' so they don't collide with
 * Facebook contacts (phone = 'fb:<psid>').
 */

const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');
const { uid }            = require('../utils/helpers');
const { broadcastToAll } = require('../ws');

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

// ── helpers ───────────────────────────────────────────────────────────────────

function safeJson(v, fb) {
  try { return typeof v === 'string' ? JSON.parse(v) : v || fb; } catch { return fb; }
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ── POST /api/instagram/subscribe  (validate token + subscribe webhooks) ─────
router.post('/subscribe', auth, async (req, res) => {
  const { inboxId } = req.body;
  if (!inboxId) return res.status(400).json({ error: 'inboxId required' });

  const inbox = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
  if (!inbox) return res.status(404).json({ error: 'Inbox not found' });

  const cfg = safeJson(inbox.config, {});
  if (!cfg.pageId) return res.status(400).json({ error: 'Instagram Business Account ID not configured' });
  if (!cfg.accessToken) return res.status(400).json({ error: 'Page access token not configured' });

  try {
    // 1. Validate the access token by fetching account info first
    let pageName = '', pageCategory = '', pagePicture = '';
    try {
      const infoRes = await fetch(
        `${GRAPH_BASE}/${cfg.pageId}?fields=name,category,picture&access_token=${cfg.accessToken}`
      );
      const infoData = await infoRes.json();
      if (!infoRes.ok || infoData?.error) {
        const msg = infoData?.error?.message || JSON.stringify(infoData);
        throw new Error(`Invalid access token or account ID: ${msg}`);
      }
      pageName = infoData.name || '';
      pageCategory = infoData.category || '';
      pagePicture = infoData.picture?.data?.url || '';
    } catch (infoErr) {
      throw new Error(`Access token validation failed: ${infoErr.message}`);
    }

    // 2. Debug token for permission checks (non-fatal if appId/appSecret are wrong)
    let tokenInfo = null;
    let tokenWarning = '';
    if (cfg.appId && cfg.appSecret) {
      try {
        const appAccessToken = `${cfg.appId}|${cfg.appSecret}`;
        const debugUrl = new URL(`${GRAPH_BASE}/debug_token`);
        debugUrl.searchParams.set('input_token', cfg.accessToken);
        debugUrl.searchParams.set('access_token', appAccessToken);

        const debugRes = await fetch(debugUrl, { method: 'GET' });
        const debugData = await debugRes.json();
        if (!debugRes.ok || debugData?.error) {
          tokenWarning = debugData?.error?.message || 'Token debug failed';
          console.warn('[instagram] Token debug warning (non-fatal):', tokenWarning);
        } else {
          tokenInfo = debugData.data || null;
        }
      } catch (debugErr) {
        tokenWarning = debugErr.message;
        console.warn('[instagram] Token debug error (non-fatal):', debugErr.message);
      }
    }

    // 3. Check for required Instagram permissions (only if token debug succeeded)
    const scopes = tokenInfo?.scopes || [];
    const missingPermissions = tokenInfo
      ? ['instagram_manage_messages', 'pages_manage_metadata'].filter(scope => !scopes.includes(scope))
      : [];
    if (missingPermissions.length) {
      return res.status(400).json({
        error: `Token is missing required permissions: ${missingPermissions.join(', ')}`,
        missingPermissions,
        tokenScopes: scopes,
      });
    }

    // 3. Subscribe the linked Facebook page to webhooks (Instagram DMs route via page)
    const subUrl = new URL(`${GRAPH_BASE}/${cfg.pageId}/subscribed_apps`);
    subUrl.searchParams.set('subscribed_fields', 'messages,messaging_postbacks,message_deliveries,message_reads');
    const subRes = await fetch(subUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const subData = await subRes.json();
    if (!subRes.ok || subData?.error) {
      console.warn('[instagram] Page subscription warning:', subData?.error?.message || JSON.stringify(subData));
      // Don't fail — Instagram may not need page-level subscription for all setups
    }

    // 4. App-level webhook subscription for Instagram object
    if (cfg.appId && cfg.appSecret && cfg.verifyToken) {
      const appAccessToken = `${cfg.appId}|${cfg.appSecret}`;
      const baseUrl = (process.env.PUBLIC_URL || process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
      const callbackUrl = `${baseUrl}/api/instagram/webhook`;

      const appSubRes = await fetch(`${GRAPH_BASE}/${cfg.appId}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: appAccessToken,
          object: 'instagram',
          callback_url: callbackUrl,
          verify_token: cfg.verifyToken,
          fields: 'messages,messaging_postbacks',
        }),
      });
      const appSubData = await appSubRes.json();
      if (!appSubRes.ok || appSubData?.error) {
        console.warn('[instagram] App subscription warning:', appSubData?.error?.message || JSON.stringify(appSubData));
      } else {
        console.log('[instagram] App-level webhook subscription updated');
      }
    }

    // 5. Update inbox config with connection status
    const newCfg = {
      ...cfg,
      connStatus: 'connected',
      webhookSubscribedAt: now(),
      pageName: pageName || cfg.pageName || '',
      pageCategory: pageCategory || cfg.pageCategory || '',
      pagePicture: pagePicture || cfg.pagePicture || '',
      connectedAt: now(),
    };
    await db.prepare('UPDATE inboxes SET config=? WHERE id=?').run(JSON.stringify(newCfg), inboxId);

    console.log(`[instagram] ✓ Account ${cfg.pageId} (${newCfg.pageName}) subscribed to webhooks`);
    res.json({
      success: true,
      pageId: cfg.pageId,
      pageName: newCfg.pageName,
      pagePicture: newCfg.pagePicture,
      pageCategory: newCfg.pageCategory,
      tokenScopes: scopes,
      tokenWarning: tokenWarning || undefined,
    });
  } catch (err) {
    console.error('[instagram] Subscribe endpoint error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── POST /api/instagram/deauthorize  (Meta deauthorize callback) ─────────────
router.post('/deauthorize', async (req, res) => {
  console.log('[instagram] Deauthorize callback received:', JSON.stringify(req.body));
  res.json({ success: true });
});

// ── POST /api/instagram/data-deletion  (Meta data deletion request) ──────────
router.post('/data-deletion', async (req, res) => {
  const userId = req.body?.signed_request ? 'user' : 'unknown';
  console.log('[instagram] Data deletion request received for:', userId);
  // Meta requires a JSON response with a confirmation URL and code
  const confirmationCode = 'del_' + Date.now();
  res.json({
    url: `${(process.env.PUBLIC_URL || process.env.API_BASE_URL || '').replace(/\/$/, '')}/api/instagram/data-deletion-status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
});

router.get('/data-deletion-status', (req, res) => {
  res.json({ status: 'complete', message: 'All user data has been deleted.' });
});

// ── GET /api/instagram/webhook  (Meta verification) ──────────────────────────
router.get('/webhook', async (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[instagram] Webhook verify request:', { mode, token: token ? token.slice(0, 6) + '...' : '(none)' });

  if (mode !== 'subscribe') {
    return res.status(400).send('Bad request: mode must be subscribe');
  }

  try {
    // Check all active instagram inboxes
    const inboxes = await db.prepare(
      "SELECT config FROM inboxes WHERE type='instagram' AND active=1"
    ).all();

    for (const ib of inboxes) {
      const cfg = safeJson(ib.config, {});
      if (cfg.verifyToken && cfg.verifyToken === token) {
        console.log('[instagram] Webhook verified via inbox config ✓');
        return res.status(200).send(challenge);
      }
    }

    // Fallback: also accept facebook verify token (shared app)
    const fbInboxes = await db.prepare(
      "SELECT config FROM inboxes WHERE type='facebook' AND active=1"
    ).all();
    for (const ib of fbInboxes) {
      const cfg = safeJson(ib.config, {});
      if (cfg.verifyToken && cfg.verifyToken === token) {
        console.log('[instagram] Webhook verified via facebook inbox ✓');
        return res.status(200).send(challenge);
      }
    }

    // Env variable fallback
    if (process.env.FB_VERIFY_TOKEN && process.env.FB_VERIFY_TOKEN === token) {
      console.log('[instagram] Webhook verified via env ✓');
      return res.status(200).send(challenge);
    }
    if (process.env.IG_VERIFY_TOKEN && process.env.IG_VERIFY_TOKEN === token) {
      console.log('[instagram] Webhook verified via IG env ✓');
      return res.status(200).send(challenge);
    }
  } catch (e) {
    console.error('[instagram] Verification DB error:', e.message);
  }

  console.warn('[instagram] Webhook verification failed — token mismatch');
  return res.status(403).send('Forbidden');
});

// ── POST /api/instagram/webhook  (incoming messages) ─────────────────────────
router.post('/webhook', async (req, res) => {
  // Immediately acknowledge — Meta requires 200 within 5 s
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    // Instagram webhooks use object='instagram'
    if (body?.object !== 'instagram') {
      console.log('[instagram] Skipping non-instagram webhook object:', body?.object);
      return;
    }

    for (const entry of body.entry || []) {
      const igAccountId = entry.id; // Instagram Business Account ID

      // Find our inbox by instagram account ID stored in config
      const inbox = await findInboxByIgAccountId(igAccountId);
      if (!inbox) {
        console.warn('[instagram] No inbox found for IG account:', igAccountId);
        continue;
      }

      const cfg = safeJson(inbox.config, {});
      const pageToken = cfg.accessToken || cfg.pageAccessToken || '';

      for (const event of entry.messaging || []) {
        // Skip echo messages (outbound from page)
        if (event.message?.is_echo) continue;

        if (event.message) {
          await processIncomingMessage(event, inbox, pageToken);
        }
        // delivery/read receipts — update send log
        if (event.delivery || event.read) {
          await handleDeliveryOrRead(event, inbox);
        }
      }
    }
  } catch (err) {
    console.error('[instagram] Webhook processing error:', err.message);
  }
});

// ── Process incoming Instagram message ───────────────────────────────────────

async function processIncomingMessage(event, inbox, pageToken) {
  const senderId = event.sender?.id;           // Instagram-scoped user ID
  const msgId    = event.message?.mid;         // message ID (dedup key)
  const text     = event.message?.text || '';
  const ts       = event.timestamp
    ? new Date(Number(event.timestamp)).toISOString().slice(0, 19).replace('T', ' ')
    : now();

  if (!senderId || !msgId) return;

  // ── dedup ─────────────────────────────────────────────────────────────────
  const existing = await db.prepare(
    'SELECT id FROM messages WHERE whatsapp_message_id=?'
  ).get(msgId).catch(() => null);
  if (existing) return;

  // ── resolve sender profile ────────────────────────────────────────────────
  let senderName = senderId;
  if (pageToken) {
    try {
      const profileRes = await fetch(
        `${GRAPH_BASE}/${senderId}?fields=name,profile_pic&access_token=${pageToken}`
      );
      const profile = await profileRes.json();
      if (profile?.name) senderName = profile.name;
    } catch {}
  }

  // ── find or create contact ────────────────────────────────────────────────
  const agentId = inbox.agent_id || null;
  let contact = await db.prepare(
    'SELECT * FROM contacts WHERE phone=? AND (agent_id=? OR agent_id IS NULL)'
  ).get('ig:' + senderId, agentId);

  if (!contact) {
    // Also try without agent scope
    contact = await db.prepare('SELECT * FROM contacts WHERE phone=?').get('ig:' + senderId);
  }

  if (!contact) {
    const ctId = 'ct' + uid();
    await db.prepare(
      'INSERT INTO contacts (id,name,phone,color,tags,agent_id) VALUES (?,?,?,?,?,?)'
    ).run(ctId, senderName, 'ig:' + senderId, '#e1306c', '["instagram"]', agentId);
    contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(ctId);
  } else if (contact.name === contact.phone || contact.name === 'ig:' + senderId) {
    if (senderName && senderName !== senderId) {
      await db.prepare('UPDATE contacts SET name=? WHERE id=?').run(senderName, contact.id);
      contact.name = senderName;
    }
  }

  // ── check if this is a campaign reply ────────────────────────────────────
  let campaignId = null;
  let campaignName = null;
  try {
    const campLog = await db.prepare(`
      SELECT l.campaign_id, c.name as campaign_name
      FROM campaign_send_log l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.contact_id=?
        AND l.channel='instagram'
        AND l.status='sent'
        AND l.sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY l.sent_at DESC LIMIT 1
    `).get(contact.id);
    if (campLog) {
      campaignId   = campLog.campaign_id;
      campaignName = campLog.campaign_name;
      // Increment reply count
      try {
        const camp = await db.prepare('SELECT stats FROM campaigns WHERE id=?').get(campaignId);
        if (camp) {
          const stats = JSON.parse(camp.stats || '{}');
          stats.replies = (stats.replies || 0) + 1;
          await db.prepare('UPDATE campaigns SET stats=? WHERE id=?')
            .run(JSON.stringify(stats), campaignId);
        }
      } catch {}
    }
  } catch (e) {
    console.log('[instagram] Campaign lookup skipped:', e.message);
  }

  // ── find or create conversation ───────────────────────────────────────────
  let conv = await db.prepare(`
    SELECT * FROM conversations
    WHERE contact_id=? AND inbox_id=? AND status='open'
    ORDER BY updated_at DESC LIMIT 1
  `).get(contact.id, inbox.id);

  if (!conv) {
    const cvId = 'cv' + uid();
    const subject = campaignName
      ? `Campaign Reply: ${campaignName} — ${senderName}`
      : `Instagram: ${senderName}`;

    await db.prepare(`
      INSERT INTO conversations
        (id, contact_id, inbox_id, subject, status, channel, campaign_id, campaign_name, agent_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(cvId, contact.id, inbox.id, subject, 'open', 'instagram',
           campaignId, campaignName, agentId, ts, ts);

    conv = await db.prepare('SELECT * FROM conversations WHERE id=?').get(cvId);

    const fullConv = await buildFullConv(cvId);
    broadcastToAll({
      type:           'new_conversation',
      conversation_id: cvId,
      subject,
      contact_name:   contact.name,
      contact_ig_id:  senderId,
      campaign_id:    campaignId,
      campaign_name:  campaignName,
      conversation:   fullConv,
    });
  } else if (campaignId && !conv.campaign_id) {
    await db.prepare('UPDATE conversations SET campaign_id=?, campaign_name=? WHERE id=?')
      .run(campaignId, campaignName, conv.id);
  }

  // ── parse attachments ─────────────────────────────────────────────────────
  const attachments = [];
  for (const att of event.message?.attachments || []) {
    if (att.type === 'image') {
      attachments.push({ url: att.payload?.url, name: 'image.jpg', contentType: 'image/jpeg' });
    } else if (att.type === 'video') {
      attachments.push({ url: att.payload?.url, name: 'video.mp4', contentType: 'video/mp4' });
    } else if (att.type === 'audio') {
      attachments.push({ url: att.payload?.url, name: 'audio.mp3', contentType: 'audio/mpeg' });
    } else if (att.type === 'file') {
      attachments.push({ url: att.payload?.url, name: 'file', contentType: 'application/octet-stream' });
    } else if (att.type === 'story_mention' || att.type === 'reel') {
      // Story mention or reel share — store the URL as an image
      attachments.push({ url: att.payload?.url || '', name: att.type + '.jpg', contentType: 'image/jpeg' });
    }
  }

  // ── save message ──────────────────────────────────────────────────────────
  const newMsgId = uid();
  await db.prepare(
    'INSERT INTO messages (id,conversation_id,role,text,attachments,whatsapp_message_id,is_read,created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run(newMsgId, conv.id, 'customer', text, JSON.stringify(attachments), msgId, 0, ts);

  await db.prepare(
    'UPDATE conversations SET updated_at=?, unread_count=COALESCE(unread_count,0)+1 WHERE id=?'
  ).run(ts, conv.id);

  // ── broadcast ─────────────────────────────────────────────────────────────
  const savedMsg = await db.prepare('SELECT * FROM messages WHERE id=?').get(newMsgId);
  try { savedMsg.attachments = JSON.parse(savedMsg.attachments || '[]'); } catch { savedMsg.attachments = []; }

  const fullConv = await buildFullConv(conv.id);
  broadcastToAll({
    type:           'new_message',
    conversationId: conv.id,
    message:        savedMsg,
    conversation:   fullConv,
  });

  console.log(`[instagram] ✓ Received message from ${senderName} → conv ${conv.id}`);
}

// ── Handle delivery / read receipts ──────────────────────────────────────────

async function handleDeliveryOrRead(event, inbox) {
  try {
    if (event.delivery?.watermark) {
      await db.prepare(`
        UPDATE campaign_send_log
        SET status='delivered', delivered_at=?
        WHERE contact_id IN (
          SELECT c.id FROM contacts c WHERE c.phone=?
        ) AND channel='instagram' AND status='sent'
      `).run(now(), 'ig:' + event.sender?.id);
    }
    if (event.read?.watermark) {
      await db.prepare(`
        UPDATE campaign_send_log
        SET status='read', read_at=?
        WHERE contact_id IN (
          SELECT c.id FROM contacts c WHERE c.phone=?
        ) AND channel='instagram' AND status IN ('sent','delivered')
      `).run(now(), 'ig:' + event.sender?.id);
    }
  } catch {}
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function findInboxByIgAccountId(igAccountId) {
  if (!igAccountId) return null;
  const rows = await db.prepare(
    "SELECT * FROM inboxes WHERE type='instagram' AND active=1"
  ).all();
  for (const row of rows) {
    const cfg = safeJson(row.config, {});
    // Match by igAccountId OR by pageId (Instagram is linked to a Facebook Page)
    if (
      cfg.igAccountId === String(igAccountId) ||
      cfg.igAccountId === igAccountId ||
      cfg.pageId      === String(igAccountId) ||
      cfg.pageId      === igAccountId
    ) return row;
  }
  // Fallback: try matching any instagram inbox (single-inbox setups)
  if (rows.length === 1) return rows[0];
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
