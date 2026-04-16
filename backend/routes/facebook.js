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
const { debugFacebookToken, ensurePageWebhookSubscription, ensureAppWebhookSubscription, fetchPageInfo } = require('../services/facebookService');

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
        connStatus: 'configured',
        connectedAt: now()
      };

      await db.prepare('UPDATE inboxes SET config=? WHERE id=?')
        .run(JSON.stringify(newCfg), inboxId);

      // Subscribe to webhooks automatically
      try {
        await ensurePageWebhookSubscription({ pageId: page.id, pageAccessToken: page.accessToken });
        await db.prepare('UPDATE inboxes SET config=? WHERE id=?').run(JSON.stringify({
          ...newCfg,
          connStatus: 'connected',
          webhookSubscribedAt: now(),
        }), inboxId);
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
    connStatus: 'configured',
    connectedAt: now()
  };
  delete newCfg._pendingPages;
  delete newCfg._userToken;

  await db.prepare('UPDATE inboxes SET config=? WHERE id=?')
    .run(JSON.stringify(newCfg), inboxId);

  // Subscribe to webhooks
  try {
    await ensurePageWebhookSubscription({ pageId: page.id, pageAccessToken: page.accessToken });
    await db.prepare('UPDATE inboxes SET config=? WHERE id=?').run(JSON.stringify({
      ...newCfg,
      connStatus: 'connected',
      webhookSubscribedAt: now(),
    }), inboxId);
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

// ── POST /api/facebook/test  — Validate token + fetch page info (no webhook) ──
router.post('/test', auth, async (req, res) => {
  const { inboxId, pageId, accessToken, appId, appSecret, userAccessToken } = req.body;

  // Use provided fields directly, or read from saved inbox config
  let cfg = { pageId, accessToken, appId, appSecret, userAccessToken };
  if (inboxId && (!pageId || !accessToken)) {
    const inbox = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
    if (inbox) {
      const saved = safeJson(inbox.config, {});
      cfg = { pageId: pageId || saved.pageId, accessToken: accessToken || saved.accessToken, appId: appId || saved.appId, appSecret: appSecret || saved.appSecret, userAccessToken: userAccessToken || saved.userAccessToken };
    }
  }

  if (!cfg.accessToken && !cfg.userAccessToken) return res.status(400).json({ error: 'Page Access Token or User Access Token is required' });

  try {
    // 0. If only user token provided, resolve page token from /me/accounts
    if (!cfg.accessToken && cfg.userAccessToken) {
      try {
        const acctUrl = `${GRAPH_BASE}/me/accounts?fields=id,name,access_token&access_token=${cfg.userAccessToken}`;
        const acctRes = await fetch(acctUrl);
        const acctData = await acctRes.json();
        const pages = acctData.data || [];
        if (pages.length > 0) {
          const page = cfg.pageId ? pages.find(p => p.id === cfg.pageId) || pages[0] : pages[0];
          cfg.accessToken = page.access_token;
          if (!cfg.pageId) cfg.pageId = page.id;
        }
      } catch {}
    }

    // 1. Validate token
    let tokenInfo = null;
    let tokenType = 'unknown';
    let scopes = [];
    if (cfg.appId && cfg.appSecret) {
      tokenInfo = await debugFacebookToken({ inputToken: cfg.accessToken, appId: cfg.appId, appSecret: cfg.appSecret });
      tokenType = tokenInfo?.type || 'unknown';
      scopes = tokenInfo?.scopes || [];
    }

    // 2. Fetch page info using the token
    let pageName = '', pageCategory = '', pagePicture = '', resolvedPageId = cfg.pageId || '';

    // Try user token first (/me/accounts returns page name, picture, category)
    // Prefer userAccessToken since page tokens often lack pages_read_engagement
    const tryToken = cfg.userAccessToken || cfg.accessToken;
    try {
      const accountsUrl = `${GRAPH_BASE}/me/accounts?fields=id,name,category,picture&access_token=${tryToken}`;
      const accountsRes = await fetch(accountsUrl);
      const accountsData = await accountsRes.json();
      const pages = accountsData.data || [];
      if (pages.length > 0) {
        const page = cfg.pageId ? pages.find(p => p.id === cfg.pageId) || pages[0] : pages[0];
        pageName = page.name || '';
        pageCategory = page.category || '';
        pagePicture = page.picture?.data?.url || '';
        if (!resolvedPageId) resolvedPageId = page.id || '';
      }
    } catch {}

    // Fallback: try /me directly
    if (!pageName) {
      try {
        const meUrl = `${GRAPH_BASE}/me?fields=id,name,category,picture&access_token=${cfg.accessToken}`;
        const meRes = await fetch(meUrl);
        const meData = await meRes.json();
        if (!meData.error) {
          pageName = meData.name || '';
          pageCategory = meData.category || '';
          pagePicture = meData.picture?.data?.url || '';
          if (!resolvedPageId) resolvedPageId = meData.id || '';
        }
      } catch {}
    }

    // Fallback: try pageId directly via fetchPageInfo
    if (!pageName && cfg.pageId) {
      try {
        const pageInfo = await fetchPageInfo({ pageId: cfg.pageId, pageAccessToken: cfg.accessToken });
        pageName = pageInfo?.pageName || '';
        pageCategory = pageInfo?.pageCategory || '';
        pagePicture = pageInfo?.pagePicture || '';
      } catch {}
    }

    // 3. Check required permissions
    const missingPermissions = scopes.length > 0
      ? ['pages_messaging'].filter(s => !scopes.includes(s))
      : [];

    // 4. If we have an inboxId, save the validated info to config
    if (inboxId && (pageName || cfg.accessToken)) {
      const inbox = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
      if (inbox) {
        const saved = safeJson(inbox.config, {});
        const newCfg = {
          ...saved,
          ...cfg,
          pageId: resolvedPageId || saved.pageId,
          pageName: pageName || saved.pageName,
          pageCategory: pageCategory || saved.pageCategory,
          pagePicture: pagePicture || saved.pagePicture,
          connStatus: missingPermissions.length === 0 ? 'connected' : 'configured',
          testedAt: now(),
        };
        await db.prepare('UPDATE inboxes SET config=? WHERE id=?').run(JSON.stringify(newCfg), inboxId);
      }
    }

    res.json({
      success: true,
      pageName,
      pageId: resolvedPageId,
      pageCategory,
      pagePicture,
      tokenType,
      tokenScopes: scopes,
      missingPermissions,
      isValid: tokenInfo ? tokenInfo.isValid : (pageName ? true : false),
    });
  } catch (err) {
    console.error('[facebook] Test endpoint error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── POST /api/facebook/subscribe  — Validate token + subscribe page ─────────
router.post('/subscribe', auth, async (req, res) => {
  const { inboxId } = req.body;
  if (!inboxId) return res.status(400).json({ error: 'inboxId required' });

  const inbox = await db.prepare('SELECT * FROM inboxes WHERE id=?').get(inboxId);
  if (!inbox) return res.status(404).json({ error: 'Inbox not found' });

  const cfg = safeJson(inbox.config, {});
  if (!cfg.pageId) return res.status(400).json({ error: 'Facebook Page ID not configured' });
  if (!cfg.accessToken) return res.status(400).json({ error: 'Facebook page access token not configured' });

  try {
    let tokenInfo = null;
    if (cfg.appId && cfg.appSecret) {
      tokenInfo = await debugFacebookToken({
        inputToken: cfg.accessToken,
        appId: cfg.appId,
        appSecret: cfg.appSecret,
      });
    }

    const scopes = tokenInfo?.scopes || [];
    const missingPermissions = tokenInfo
      ? ['pages_messaging', 'pages_manage_metadata'].filter(scope => !scopes.includes(scope))
      : [];
    if (missingPermissions.length) {
      return res.status(400).json({
        error: `Facebook token is missing required permissions: ${missingPermissions.join(', ')}`,
        missingPermissions,
        tokenScopes: scopes,
      });
    }

    // Subscribe page to webhooks (page-level)
    await ensurePageWebhookSubscription({ pageId: cfg.pageId, pageAccessToken: cfg.accessToken });

    // Also update app-level subscription with all fields
    const baseUrl = (process.env.PUBLIC_URL || process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');
    const callbackUrl = `${baseUrl}/api/facebook/webhook`;
    await ensureAppWebhookSubscription({
      appId: cfg.appId,
      appSecret: cfg.appSecret,
      callbackUrl,
      verifyToken: cfg.verifyToken,
    });

    // Fetch page name, category, picture from Graph API
    const pageInfo = await fetchPageInfo({ pageId: cfg.pageId, pageAccessToken: cfg.accessToken });

    const newCfg = {
      ...cfg,
      connStatus: 'connected',
      webhookSubscribedAt: now(),
      pageName: pageInfo?.pageName || cfg.pageName || '',
      pageCategory: pageInfo?.pageCategory || cfg.pageCategory || '',
      pagePicture: pageInfo?.pagePicture || cfg.pagePicture || '',
      connectedAt: now(),
    };
    await db.prepare('UPDATE inboxes SET config=? WHERE id=?').run(JSON.stringify(newCfg), inboxId);

    console.log(`[facebook] ✓ Page ${cfg.pageId} (${newCfg.pageName}) subscribed to webhooks`);
    res.json({
      success: true,
      pageId: cfg.pageId,
      pageName: newCfg.pageName,
      pagePicture: newCfg.pagePicture,
      pageCategory: newCfg.pageCategory,
      tokenScopes: scopes,
    });
  } catch (err) {
    console.error('[facebook] Subscribe endpoint error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ── helper: resolve FB credentials from DB inbox config ─────────────────────
async function getFbCredentials(agentId, inboxId) {
  let inbox;
  if (inboxId) {
    inbox = await db.prepare(
      "SELECT * FROM inboxes WHERE id=? AND type='facebook' AND active=1"
    ).get(inboxId);
  }
  if (!inbox) {
    inbox = await db.prepare(
      "SELECT * FROM inboxes WHERE type='facebook' AND active=1 AND (agent_id=? OR agent_id IS NULL) LIMIT 1"
    ).get(agentId);
  }
  if (!inbox) return { pageId: '', accessToken: '', userAccessToken: '', pageName: '', inboxId: null };
  const cfg = safeJson(inbox.config, {});
  return {
    pageId: cfg.pageId || '',
    accessToken: cfg.accessToken || '',
    userAccessToken: cfg.userAccessToken || '',
    pageName: cfg.pageName || '',
    inboxId: inbox.id,
  };
}

// ── GET /api/facebook/users  — Search FB friends + page conversations ───────
router.get('/users', auth, async (req, res) => {
  const { q, inboxId } = req.query;

  try {
    const fb = await getFbCredentials(req.agent.id, inboxId);
    if (!fb.accessToken && !fb.userAccessToken) {
      return res.status(400).json({ error: 'Facebook not configured. Go to Settings → Facebook inbox and enter your tokens.' });
    }

    const usersMap = new Map();

    // ── Source 1: Friends list (requires User Access Token with user_friends) ──
    if (fb.userAccessToken) {
      try {
        const friendsUrl = `${GRAPH_BASE}/me/friends?fields=id,name,picture&limit=100&access_token=${fb.userAccessToken}`;
        const friendsRes = await fetch(friendsUrl);
        const friendsData = await friendsRes.json();
        for (const f of friendsData.data || []) {
          usersMap.set(f.id, {
            fbId: f.id,
            name: f.name || f.id,
            picture: f.picture?.data?.url || '',
            source: 'friend',
            lastActive: '',
            messageCount: 0,
          });
        }
        console.log(`[facebook] Friends: ${friendsData.data?.length || 0} found`);
      } catch (e) {
        console.warn('[facebook] Friends fetch error:', e.message);
      }

      // Also try /me/accounts to get pages the user manages (for additional context)
      try {
        const pagesUrl = `${GRAPH_BASE}/me/accounts?fields=id,name,picture&access_token=${fb.userAccessToken}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();
        // Don't add pages as users, just log
        console.log(`[facebook] User manages ${pagesData.data?.length || 0} pages`);
      } catch {}
    }

    // ── Source 2: Page conversations (people who messaged via Messenger) ──
    if (fb.pageId && fb.accessToken) {
      try {
        const convsUrl = `${GRAPH_BASE}/${fb.pageId}/conversations?fields=participants,updated_time,message_count&limit=50&access_token=${fb.accessToken}`;
        const convsRes = await fetch(convsUrl);
        const convsData = await convsRes.json();
        for (const conv of convsData.data || []) {
          for (const p of conv.participants?.data || []) {
            if (p.id === fb.pageId) continue;
            if (!usersMap.has(p.id)) {
              usersMap.set(p.id, {
                fbId: p.id,
                name: p.name || p.id,
                picture: '',
                source: 'messenger',
                messageCount: conv.message_count || 0,
                lastActive: conv.updated_time || '',
              });
            }
          }
        }
      } catch (e) {
        console.warn('[facebook] Conversations fetch error:', e.message);
      }
    }

    // ── Source 3: Existing FB contacts from DB ──
    try {
      const dbContacts = await db.prepare(
        "SELECT id, name, phone FROM contacts WHERE phone LIKE 'fb:%' AND (agent_id=? OR agent_id IS NULL)"
      ).all(req.agent.id);
      for (const c of dbContacts) {
        const fbId = c.phone.replace(/^fb:/, '');
        if (!usersMap.has(fbId)) {
          usersMap.set(fbId, {
            fbId,
            name: c.name || fbId,
            picture: '',
            source: 'contact',
            messageCount: 0,
            lastActive: '',
          });
        }
      }
    } catch {}

    let users = Array.from(usersMap.values());

    // Check which are already contacts
    for (const u of users) {
      const existing = await db.prepare(
        'SELECT id, name, phone FROM contacts WHERE phone=? AND (agent_id=? OR agent_id IS NULL)'
      ).get('fb:' + u.fbId, req.agent.id);
      u.isContact = !!existing;
      u.contactId = existing?.id || null;
    }

    // Filter by search query
    if (q) {
      const lq = q.toLowerCase();
      users = users.filter(u => u.name.toLowerCase().includes(lq) || u.fbId.includes(lq));
    }

    // Sort: non-contacts first, then by last active, then by name
    users.sort((a, b) => {
      if (a.isContact !== b.isContact) return a.isContact ? 1 : -1;
      if (a.lastActive && b.lastActive) return new Date(b.lastActive) - new Date(a.lastActive);
      return a.name.localeCompare(b.name);
    });

    const sources = [];
    if (fb.userAccessToken) sources.push('friends');
    if (fb.pageId && fb.accessToken) sources.push('messenger');
    sources.push('contacts');

    res.json({ users, pageId: fb.pageId, pageName: fb.pageName, sources });
  } catch (err) {
    console.error('[facebook] Users search error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/facebook/users/sync  — Import all FB users as contacts ────────
router.post('/users/sync', auth, async (req, res) => {
  const { inboxId } = req.body;
  try {
    const fb = await getFbCredentials(req.agent.id, inboxId);
    if (!fb.accessToken && !fb.userAccessToken) {
      return res.status(400).json({ error: 'Facebook not configured. Go to Settings → Facebook inbox and enter your credentials.' });
    }

    const usersMap = new Map();

    // Friends (user token)
    if (fb.userAccessToken) {
      try {
        const friendsRes = await fetch(`${GRAPH_BASE}/me/friends?fields=id,name&limit=100&access_token=${fb.userAccessToken}`);
        const friendsData = await friendsRes.json();
        for (const f of friendsData.data || []) {
          usersMap.set(f.id, { fbId: f.id, name: f.name || f.id });
        }
      } catch {}
    }

    // Conversations (page token)
    if (fb.pageId && fb.accessToken) {
      try {
        const convsRes = await fetch(`${GRAPH_BASE}/${fb.pageId}/conversations?fields=participants&limit=100&access_token=${fb.accessToken}`);
        const convsData = await convsRes.json();
        for (const conv of convsData.data || []) {
          for (const p of conv.participants?.data || []) {
            if (p.id === fb.pageId) continue;
            if (!usersMap.has(p.id)) {
              usersMap.set(p.id, { fbId: p.id, name: p.name || p.id });
            }
          }
        }
      } catch {}
    }

    let added = 0, skipped = 0;
    for (const u of usersMap.values()) {
      const existing = await db.prepare(
        'SELECT id FROM contacts WHERE phone=? AND (agent_id=? OR agent_id IS NULL)'
      ).get('fb:' + u.fbId, req.agent.id);
      if (existing) { skipped++; continue; }

      const ctId = 'ct' + uid();
      await db.prepare(
        'INSERT INTO contacts (id,name,phone,color,tags,agent_id) VALUES (?,?,?,?,?,?)'
      ).run(ctId, u.name, 'fb:' + u.fbId, '#1877f2', '["facebook"]', req.agent.id);
      added++;
    }

    console.log(`[facebook] Sync: ${added} added, ${skipped} already existed`);
    res.json({ success: true, added, skipped, total: usersMap.size });
  } catch (err) {
    console.error('[facebook] Sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/facebook/users/add  — Add a Facebook user as contact ──────────
router.post('/users/add', auth, async (req, res) => {
  const { fbId, name, inboxId } = req.body;
  if (!fbId) return res.status(400).json({ error: 'fbId required' });

  try {
    // Check if already exists
    const existing = await db.prepare(
      'SELECT * FROM contacts WHERE phone=? AND (agent_id=? OR agent_id IS NULL)'
    ).get('fb:' + fbId, req.agent.id);
    if (existing) {
      try { existing.tags = JSON.parse(existing.tags || '[]'); } catch { existing.tags = []; }
      return res.json({ contact: existing, existing: true });
    }

    // Try to fetch profile from Facebook
    let profileName = name || fbId;
    const fb = await getFbCredentials(req.agent.id, inboxId);
    if (fb.accessToken) {
      try {
        const profileRes = await fetch(`${GRAPH_BASE}/${fbId}?fields=first_name,last_name,profile_pic&access_token=${fb.accessToken}`);
        const profile = await profileRes.json();
        if (profile.first_name) profileName = `${profile.first_name} ${profile.last_name || ''}`.trim();
      } catch {}
    }

    const ctId = 'ct' + uid();
    await db.prepare(
      'INSERT INTO contacts (id,name,phone,color,tags,agent_id) VALUES (?,?,?,?,?,?)'
    ).run(ctId, profileName, 'fb:' + fbId, '#1877f2', '["facebook"]', req.agent.id);

    const contact = await db.prepare('SELECT * FROM contacts WHERE id=?').get(ctId);
    try { contact.tags = JSON.parse(contact.tags || '[]'); } catch { contact.tags = []; }

    res.status(201).json({ contact, existing: false });
  } catch (err) {
    console.error('[facebook] Add user error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/facebook/debug  (temporary — check config) ──────────────────────
router.get('/debug', async (req, res) => {
  try {
    const allInboxes = await db.prepare("SELECT id, name, type, active, config FROM inboxes WHERE type='facebook'").all();
    const info = allInboxes.map(ib => {
      const cfg = safeJson(ib.config, {});
      return {
        id: ib.id, name: ib.name, type: ib.type, active: ib.active,
        hasPageId: !!cfg.pageId,
        hasAccessToken: !!cfg.accessToken,
        hasAppId: !!cfg.appId,
        hasAppSecret: !!cfg.appSecret,
        verifyToken: cfg.verifyToken || '(not set)',
        connStatus: cfg.connStatus || '(none)',
        pageName: cfg.pageName || '(none)',
      };
    });
    res.json({
      facebookInboxes: info,
      envFbToken: process.env.FB_VERIFY_TOKEN ? 'set(' + process.env.FB_VERIFY_TOKEN.slice(0, 6) + '...)' : '(not set)',
      envWaToken: process.env.WA_VERIFY_TOKEN ? 'set' : '(not set)',
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/facebook/webhook  (Meta verification) ───────────────────────────
router.get('/webhook', async (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[facebook] Webhook verify request:', { mode, token: token ? token.slice(0, 6) + '...' : '(none)', challenge: challenge ? 'yes' : 'no' });

  if (mode !== 'subscribe') {
    return res.status(400).send('Bad request: mode must be subscribe');
  }

  try {
    // Check all active facebook inboxes
    const inboxes = await db.prepare(
      "SELECT config FROM inboxes WHERE type='facebook' AND active=1"
    ).all();

    console.log('[facebook] Found', inboxes.length, 'active facebook inboxes');

    for (const ib of inboxes) {
      const cfg = safeJson(ib.config, {});
      console.log('[facebook] Inbox verifyToken:', cfg.verifyToken ? cfg.verifyToken.slice(0, 6) + '...' : '(none)');
      if (cfg.verifyToken && cfg.verifyToken === token) {
        console.log('[facebook] Webhook verified via inbox config ✓');
        return res.status(200).send(challenge);
      }
    }

    // Also check all active whatsapp inboxes (some users store FB config there)
    const waInboxes = await db.prepare(
      "SELECT config FROM inboxes WHERE active=1"
    ).all();
    for (const ib of waInboxes) {
      const cfg = safeJson(ib.config, {});
      if (cfg.verifyToken && cfg.verifyToken === token) {
        console.log('[facebook] Webhook verified via general inbox config ✓');
        return res.status(200).send(challenge);
      }
    }

    // Fallback: env variable
    if (process.env.FB_VERIFY_TOKEN && process.env.FB_VERIFY_TOKEN === token) {
      console.log('[facebook] Webhook verified via env ✓');
      return res.status(200).send(challenge);
    }

    // Fallback: WhatsApp verify token env
    if (process.env.WA_VERIFY_TOKEN && process.env.WA_VERIFY_TOKEN === token) {
      console.log('[facebook] Webhook verified via WA env ✓');
      return res.status(200).send(challenge);
    }
  } catch (e) {
    console.error('[facebook] Verification DB error:', e.message);
  }

  console.warn('[facebook] Webhook verification failed — token mismatch. Received:', token);
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
        if (event.message?.is_echo) {
          console.log('[facebook] Ignoring echo message:', event.message?.mid || '(unknown)');
          continue;
        }
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

  // ── check if this is a campaign reply ──────────────────────────────────
  let campaignId = null;
  let campaignName = null;
  try {
    const campLog = await db.prepare(`
      SELECT l.campaign_id, c.name as campaign_name
      FROM campaign_send_log l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      WHERE l.contact_id=?
        AND l.channel='facebook'
        AND l.status='sent'
        AND l.sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY l.sent_at DESC LIMIT 1
    `).get(contact.id);
    if (campLog) {
      campaignId   = campLog.campaign_id;
      campaignName = campLog.campaign_name;
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
    console.log('[facebook] Campaign lookup skipped:', e.message);
  }

  // Find or create conversation
  let conv = await db.prepare(
    "SELECT * FROM conversations WHERE contact_id=? AND inbox_id=? AND status='open' ORDER BY updated_at DESC LIMIT 1"
  ).get(contact.id, inbox.id);

  if (!conv) {
    const cvId = 'cv' + uid();
    const subject = campaignName
      ? `Campaign Reply: ${campaignName} — ${senderName}`
      : `Facebook: ${senderName}`;
    await db.prepare(`
      INSERT INTO conversations (id, contact_id, inbox_id, subject, status, channel, campaign_id, campaign_name, labels, agent_id, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(cvId, contact.id, inbox.id, subject, 'open', 'facebook',
           campaignId, campaignName, JSON.stringify(['facebook']), agentId, ts, ts);
    conv = await db.prepare('SELECT * FROM conversations WHERE id=?').get(cvId);

    const fullConv = await buildFullConv(cvId);
    broadcastToAll({
      type: 'new_conversation',
      conversation_id: cvId,
      subject,
      contact_name: senderName,
      campaign_id: campaignId,
      campaign_name: campaignName,
      conversation: fullConv,
    });
  } else if (campaignId && !conv.campaign_id) {
    await db.prepare('UPDATE conversations SET campaign_id=?, campaign_name=? WHERE id=?')
      .run(campaignId, campaignName, conv.id);
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
             i.name as inbox_name, i.type as inbox_type, i.color as inbox_color,
             c.campaign_id, c.campaign_name
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
