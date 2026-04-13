'use strict';
/**
 * Facebook Messenger integration routes
 *
 * GET  /api/facebook/auth         — Start OAuth redirect to Facebook
 * GET  /api/facebook/callback     — OAuth callback from Facebook
 * GET  /api/facebook/pages        — List pages for connected user
 * POST /api/facebook/subscribe    — Subscribe page to webhooks
 * GET  /api/facebook/webhook      — Meta verification challenge (public)
 * POST /api/facebook/webhook      — Incoming messages from Meta (public)
 */

const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');
const { uid }            = require('../utils/helpers');
const { broadcastToAll } = require('../ws');

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

// ── helpers ──────────────────────────────────────────────────────────────────

function safeJson(v, fb) {
  try { return typeof v === 'string' ? JSON.parse(v) : v || fb; } catch { return fb; }
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ── GET /api/facebook/auth  — Start Facebook OAuth ──────────────────────────
router.get('/auth', auth, async (req, res) => {
  const { inboxId } = req.query;
  if (!inboxId) return res.status(400).json({ error: 'inboxId required' });

  // Load inbox config to get appId
  const inbox = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
  if (!inbox) return res.status(404).json({ error: 'Inbox not found' });

  const cfg = safeJson(inbox.config, {});
  const appId = cfg.appId;
  if (!appId) return res.status(400).json({ error: 'App ID not configured. Save App ID first, then connect.' });

  // Build callback URL
  const baseUrl = (process.env.PUBLIC_URL || process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
  const redirectUri = `${baseUrl}/api/facebook/callback`;

  // Store state to verify on callback (inboxId + agentId + random)
  const state = Buffer.from(JSON.stringify({
    inboxId,
    agentId: req.agent.id,
    nonce: uid()
  })).toString('base64url');

  const scopes = [
    'pages_show_list',
    'pages_messaging',
    'pages_read_engagement',
    'pages_manage_metadata',
    'pages_read_user_content'
  ].join(',');

  const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
    `client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&scope=${scopes}` +
    `&response_type=code`;

  res.json({ redirectUrl: fbAuthUrl });
});

// ── GET /api/facebook/callback  — OAuth callback from Facebook ──────────────
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  // Build the frontend redirect base
  const frontendUrl = (process.env.CORS_ORIGIN || 'http://localhost:5173').replace(/\/$/, '');

  if (error) {
    console.error('[facebook] OAuth error:', error, error_description);
    return res.redirect(`${frontendUrl}/#/settings?fb_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${frontendUrl}/#/settings?fb_error=${encodeURIComponent('Missing code or state')}`);
  }

  // Decode state
  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    return res.redirect(`${frontendUrl}/#/settings?fb_error=${encodeURIComponent('Invalid state')}`);
  }

  const { inboxId, agentId } = stateData;

  try {
    // Load inbox config to get appId and appSecret
    const inbox = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
    if (!inbox) throw new Error('Inbox not found');

    const cfg = safeJson(inbox.config, {});
    const appId = cfg.appId;
    const appSecret = cfg.appSecret;
    if (!appId || !appSecret) throw new Error('App ID or App Secret not configured');

    const baseUrl = (process.env.PUBLIC_URL || process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
    const redirectUri = `${baseUrl}/api/facebook/callback`;

    // 1. Exchange code for short-lived user token
    const tokenRes = await fetch(
      `${GRAPH_BASE}/oauth/access_token?` +
      `client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);

    const shortToken = tokenData.access_token;

    // 2. Exchange for long-lived token
    const longRes = await fetch(
      `${GRAPH_BASE}/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();
    if (longData.error) throw new Error(longData.error.message);

    const longToken = longData.access_token;

    // 3. Get user's pages
    const pagesRes = await fetch(`${GRAPH_BASE}/me/accounts?access_token=${longToken}&fields=id,name,access_token,category,picture`);
    const pagesData = await pagesRes.json();
    if (pagesData.error) throw new Error(pagesData.error.message);

    const pages = (pagesData.data || []).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      picture: p.picture?.data?.url || '',
      accessToken: p.access_token // This is a permanent page access token!
    }));

    if (pages.length === 0) throw new Error('No Facebook Pages found. Make sure you manage at least one page.');

    // If only 1 page → auto-connect it
    if (pages.length === 1) {
      const page = pages[0];
      const newCfg = {
        ...cfg,
        pageId: page.id,
        pageName: page.name,
        pageCategory: page.category,
        pagePicture: page.picture,
        accessToken: page.accessToken,
        connStatus: 'connected',
        connectedAt: now()
      };

      await db.prepare('UPDATE inboxes SET config=? WHERE id=?')
        .run(JSON.stringify(newCfg), inboxId);

      // Subscribe to webhooks automatically
      try {
        await subscribePageWebhook(page.id, page.accessToken);
      } catch (e) {
        console.warn('[facebook] Auto-subscribe failed:', e.message);
      }

      return res.redirect(`${frontendUrl}/#/settings?fb_success=1&fb_page=${encodeURIComponent(page.name)}`);
    }

    // Multiple pages → store temp token, redirect to page picker
    const tempKey = 'fb_pages_' + inboxId;
    // Store pages in a temporary way (using inbox config)
    const newCfg = { ...cfg, _pendingPages: pages, _userToken: longToken };
    await db.prepare('UPDATE inboxes SET config=? WHERE id=?')
      .run(JSON.stringify(newCfg), inboxId);

    return res.redirect(`${frontendUrl}/#/settings?fb_pick_page=1&fb_inbox=${inboxId}`);

  } catch (err) {
    console.error('[facebook] OAuth callback error:', err.message);
    return res.redirect(`${frontendUrl}/#/settings?fb_error=${encodeURIComponent(err.message)}`);
  }
});

// ── GET /api/facebook/pages  — List pending pages for selection ──────────────
router.get('/pages', auth, async (req, res) => {
  const { inboxId } = req.query;
  if (!inboxId) return res.status(400).json({ error: 'inboxId required' });

  const inbox = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
  if (!inbox) return res.status(404).json({ error: 'Inbox not found' });

  const cfg = safeJson(inbox.config, {});
  res.json({ pages: cfg._pendingPages || [] });
});

// ── POST /api/facebook/select-page  — User picks a page from list ───────────
router.post('/select-page', auth, async (req, res) => {
  const { inboxId, pageId } = req.body;
  if (!inboxId || !pageId) return res.status(400).json({ error: 'inboxId and pageId required' });

  const inbox = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
  if (!inbox) return res.status(404).json({ error: 'Inbox not found' });

  const cfg = safeJson(inbox.config, {});
  const pages = cfg._pendingPages || [];
  const page = pages.find(p => p.id === pageId);
  if (!page) return res.status(404).json({ error: 'Page not found in pending list' });

  // Save selected page config (clean up temp data)
  const newCfg = {
    ...cfg,
    pageId: page.id,
    pageName: page.name,
    pageCategory: page.category,
    pagePicture: page.picture,
    accessToken: page.accessToken,
    connStatus: 'connected',
    connectedAt: now()
  };
  delete newCfg._pendingPages;
  delete newCfg._userToken;

  await db.prepare('UPDATE inboxes SET config=? WHERE id=?')
    .run(JSON.stringify(newCfg), inboxId);

  // Subscribe to webhooks
  try {
    await subscribePageWebhook(page.id, page.accessToken);
  } catch (e) {
    console.warn('[facebook] Subscribe failed:', e.message);
  }

  res.json({ success: true, page: { id: page.id, name: page.name } });
});

// ── POST /api/facebook/disconnect  — Disconnect Facebook page ────────────────
router.post('/disconnect', auth, async (req, res) => {
  const { inboxId } = req.body;
  if (!inboxId) return res.status(400).json({ error: 'inboxId required' });

  const inbox = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
  if (!inbox) return res.status(404).json({ error: 'Inbox not found' });

  const cfg = safeJson(inbox.config, {});

  // Unsubscribe webhooks
  try {
    if (cfg.pageId && cfg.accessToken) {
      await fetch(`${GRAPH_BASE}/${cfg.pageId}/subscribed_apps`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: cfg.accessToken })
      });
    }
  } catch (e) { console.warn('[facebook] Unsubscribe error:', e.message); }

  // Clear connection fields but keep appId/appSecret/verifyToken
  const newCfg = {
    appId: cfg.appId || '',
    appSecret: cfg.appSecret || '',
    verifyToken: cfg.verifyToken || '',
    pageId: '',
    accessToken: '',
    connStatus: '',
    pageName: '',
    pageCategory: '',
    pagePicture: ''
  };

  await db.prepare('UPDATE inboxes SET config=? WHERE id=?')
    .run(JSON.stringify(newCfg), inboxId);

  res.json({ success: true });
});

// ── Helper: Subscribe page to app webhooks ───────────────────────────────────
async function subscribePageWebhook(pageId, pageAccessToken) {
  const subRes = await fetch(`${GRAPH_BASE}/${pageId}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: pageAccessToken,
      subscribed_fields: 'messages,messaging_postbacks,message_deliveries,message_reads'
    })
  });
  const data = await subRes.json();
  if (data.error) throw new Error(data.error.message);
  console.log(`[facebook] ✓ Page ${pageId} subscribed to webhooks`);
  return data;
}

// ── GET /api/facebook/webhook  (Meta verification) ───────────────────────────
router.get('/webhook', async (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe') {
    return res.status(400).send('Bad request');
  }

  try {
    const inboxes = await db.prepare(
      "SELECT config FROM inboxes WHERE type='facebook' AND active=1"
    ).all();

    for (const ib of inboxes) {
      const cfg = safeJson(ib.config, {});
      if (cfg.verifyToken && cfg.verifyToken === token) {
        console.log('[facebook] Webhook verified ✓');
        return res.status(200).send(challenge);
      }
    }

    if (process.env.FB_VERIFY_TOKEN && process.env.FB_VERIFY_TOKEN === token) {
      return res.status(200).send(challenge);
    }
  } catch (e) {
    console.error('[facebook] Verification error:', e.message);
  }

  return res.status(403).send('Forbidden');
});

// ── POST /api/facebook/webhook  (incoming messages) ──────────────────────────
router.post('/webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;
    if (body?.object !== 'page') return;

    for (const entry of body.entry || []) {
      const pageId = entry.id;

      const inbox = await findInboxByPageId(pageId);
      if (!inbox) {
        console.warn('[facebook] No inbox for page:', pageId);
        continue;
      }

      const cfg = safeJson(inbox.config, {});
      const pageToken = cfg.accessToken || '';

      for (const event of entry.messaging || []) {
        if (event.message) {
          await processIncomingMessage(event, inbox, pageToken);
        }
      }
    }
  } catch (err) {
    console.error('[facebook] Webhook error:', err.message);
  }
});

// ── Process incoming FB message ──────────────────────────────────────────────
async function processIncomingMessage(event, inbox, pageToken) {
  const senderId  = event.sender?.id;
  const msgId     = event.message?.mid;
  const text      = event.message?.text || '';
  const ts        = event.timestamp
    ? new Date(Number(event.timestamp)).toISOString().slice(0, 19).replace('T', ' ')
    : now();

  if (!senderId || !msgId) return;

  // Dedup
  const existing = await db.prepare('SELECT id FROM messages WHERE whatsapp_message_id=?').get(msgId).catch(() => null);
  if (existing) return;

  // Get sender profile
  let senderName = senderId;
  try {
    const profileRes = await fetch(`${GRAPH_BASE}/${senderId}?fields=first_name,last_name,profile_pic&access_token=${pageToken}`);
    const profile = await profileRes.json();
    if (profile.first_name) senderName = `${profile.first_name} ${profile.last_name || ''}`.trim();
  } catch {}

  // Find or create contact
  const agentId = inbox.agent_id || null;
  let contact = await db.prepare(
    'SELECT * FROM contacts WHERE phone=? AND (agent_id=? OR agent_id IS NULL)'
  ).get('fb:' + senderId, agentId);

  if (!contact) {
    const ctId = 'ct' + uid();
    await db.prepare(
      'INSERT INTO contacts (id,name,phone,color,tags,agent_id) VALUES (?,?,?,?,?,?)'
    ).run(ctId, senderName, 'fb:' + senderId, '#1877f2', '["facebook"]', agentId);
    contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(ctId);
  }

  // Find or create conversation
  let conv = await db.prepare(
    "SELECT * FROM conversations WHERE contact_id=? AND inbox_id=? AND status='open' ORDER BY updated_at DESC LIMIT 1"
  ).get(contact.id, inbox.id);

  if (!conv) {
    const cvId = 'cv' + uid();
    await db.prepare(`
      INSERT INTO conversations (id, contact_id, inbox_id, subject, status, channel, labels, agent_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(cvId, contact.id, inbox.id, `Facebook: ${senderName}`, 'open', 'facebook',
           JSON.stringify(['facebook']), agentId, ts, ts);
    conv = await db.prepare('SELECT * FROM conversations WHERE id=?').get(cvId);

    const fullConv = await buildFullConv(cvId);
    broadcastToAll({ type: 'new_conversation', conversation_id: cvId, subject: `Facebook: ${senderName}`, contact_name: senderName, conversation: fullConv });
  }

  // Parse attachments
  let attachments = [];
  for (const att of event.message?.attachments || []) {
    if (att.type === 'image') attachments.push({ url: att.payload?.url, name: 'image.jpg', contentType: 'image/jpeg' });
    else if (att.type === 'video') attachments.push({ url: att.payload?.url, name: 'video.mp4', contentType: 'video/mp4' });
    else if (att.type === 'audio') attachments.push({ url: att.payload?.url, name: 'audio.mp3', contentType: 'audio/mpeg' });
    else if (att.type === 'file') attachments.push({ url: att.payload?.url, name: 'file', contentType: 'application/octet-stream' });
  }

  // Save message
  const newMsgId = uid();
  await db.prepare(
    'INSERT INTO messages (id,conversation_id,role,text,attachments,whatsapp_message_id,is_read,created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run(newMsgId, conv.id, 'customer', text, JSON.stringify(attachments), msgId, 0, ts);

  await db.prepare('UPDATE conversations SET updated_at=?, unread_count=COALESCE(unread_count,0)+1 WHERE id=?').run(ts, conv.id);

  const savedMsg = await db.prepare('SELECT * FROM messages WHERE id=?').get(newMsgId);
  try { savedMsg.attachments = JSON.parse(savedMsg.attachments || '[]'); } catch { savedMsg.attachments = []; }

  const fullConv = await buildFullConv(conv.id);
  broadcastToAll({ type: 'new_message', conversationId: conv.id, message: savedMsg, conversation: fullConv });

  console.log(`[facebook] ✓ Received message from ${senderName} → conv ${conv.id}`);
}

// ── DB helpers ───────────────────────────────────────────────────────────────

async function findInboxByPageId(pageId) {
  if (!pageId) return null;
  const rows = await db.prepare("SELECT * FROM inboxes WHERE type='facebook' AND active=1").all();
  for (const row of rows) {
    const cfg = safeJson(row.config, {});
    if (cfg.pageId === pageId || cfg.pageId === String(pageId)) return row;
  }
  return null;
}

async function buildFullConv(convId) {
  try {
    const cv = await db.prepare(`
      SELECT c.*, ct.name as contact_name, ct.email as contact_email,
             ct.phone as contact_phone, ct.avatar as contact_avatar, ct.color as contact_color,
             i.name as inbox_name, i.type as inbox_type, i.color as inbox_color
      FROM conversations c
      LEFT JOIN contacts ct ON c.contact_id = ct.id
      LEFT JOIN inboxes i ON c.inbox_id = i.id
      WHERE c.id=?
    `).get(convId);
    if (cv) { try { cv.labels = JSON.parse(cv.labels || '[]'); } catch { cv.labels = []; } }
    return cv;
  } catch { return null; }
}

module.exports = router;
