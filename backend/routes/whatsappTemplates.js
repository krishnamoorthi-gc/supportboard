'use strict';
/**
 * WhatsApp Meta Template Management
 * Handles creating, syncing, and deleting WhatsApp Business templates
 * that require Meta approval before use in campaigns.
 */

const router = require('express').Router();
const db     = require('../db');
const auth   = require('../middleware/auth');
const { uid } = require('../utils/helpers');

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

// ── helpers ───────────────────────────────────────────────────────────────────

function safeJson(v, fb) {
  try { return typeof v === 'string' ? JSON.parse(v) : (v || fb); }
  catch { return fb; }
}

/** Load WhatsApp inbox config */
async function getWaInbox(inboxId, agentId) {
  const row = await db.prepare(
    "SELECT * FROM inboxes WHERE id=? AND agent_id=? AND type='whatsapp'"
  ).get(inboxId, agentId);
  if (!row) return null;
  const cfg = safeJson(row.config, {});
  return { ...row, cfg };
}

/** Get the first configured WhatsApp inbox for this agent */
async function getFirstWaInbox(agentId) {
  const rows = await db.prepare(
    "SELECT * FROM inboxes WHERE agent_id=? AND type='whatsapp' AND active=1"
  ).all(agentId);
  for (const row of rows) {
    const cfg = safeJson(row.config, {});
    if (cfg.apiKey || cfg.accessToken) return { ...row, cfg };
  }
  return null;
}

/** Get WABA ID — stored as cfg.wabaId or auto-fetched via phone number ID */
async function resolveWabaId(cfg) {
  if (cfg.wabaId) return cfg.wabaId;

  // Try to auto-resolve from phone number metadata
  const phoneId = cfg.phoneNumberId;
  const token   = cfg.apiKey || cfg.accessToken;
  if (!phoneId || !token) return null;

  try {
    const res  = await fetch(`${GRAPH_BASE}/${phoneId}?fields=whatsapp_business_account`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    return data?.whatsapp_business_account?.id || null;
  } catch {
    return null;
  }
}

/** Build the components array from template fields */
function buildComponents({ headerType, headerText, headerMediaUrl, body, footer, buttons }) {
  const components = [];

  // Only add header if it has actual content
  if (headerType && headerType !== 'NONE') {
    if (headerType === 'TEXT' && headerText && headerText.trim()) {
      const hdr = { type: 'HEADER', format: 'TEXT', text: headerText.trim() };
      // If header has variables like {{1}}, add example
      const hdrVars = headerText.match(/\{\{(\d+)\}\}/g) || [];
      if (hdrVars.length) {
        hdr.example = { header_text: hdrVars.map((_, i) => `Sample${i + 1}`) };
      }
      components.push(hdr);
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && headerMediaUrl && headerMediaUrl.trim()) {
      components.push({
        type: 'HEADER',
        format: headerType,
        example: { header_handle: [headerMediaUrl.trim()] },
      });
    }
    // Skip header entirely if TEXT but empty, or IMAGE/VIDEO/DOCUMENT but no URL
  }

  if (body) {
    const bodyComp = { type: 'BODY', text: body };
    // Extract {{1}}, {{2}} ... placeholders and provide realistic example values
    const vars = body.match(/\{\{(\d+)\}\}/g) || [];
    if (vars.length) {
      const examples = ['John', 'Doe', 'john@email.com', 'Acme Corp', '$100', 'SAVE20', 'https://example.com', 'Pro Plan', 'ORD-1234', 'Mar 31'];
      bodyComp.example = { body_text: [vars.map((_, i) => examples[i] || `Example${i + 1}`)] };
    }
    components.push(bodyComp);
  }

  if (footer && footer.trim()) {
    components.push({ type: 'FOOTER', text: footer.trim() });
  }

  const parsedButtons = safeJson(buttons, []);
  if (parsedButtons.length) {
    components.push({ type: 'BUTTONS', buttons: parsedButtons });
  }

  return components;
}

// ── GET /api/wa-templates — list all templates ────────────────────────────────

router.get('/', auth, async (req, res) => {
  try {
    const rows = await db.prepare(
      'SELECT * FROM whatsapp_meta_templates WHERE agent_id=? ORDER BY created_at DESC'
    ).all(req.agent.id);

    const templates = rows.map(r => ({
      ...r,
      buttons: safeJson(r.buttons, []),
      components: safeJson(r.components, []),
    }));

    res.json({ templates });
  } catch (e) {
    console.error('❌ GET /api/wa-templates:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/wa-templates — create & submit to Meta ─────────────────────────

router.post('/', auth, async (req, res) => {
  try {
    let {
      name,
      category    = 'MARKETING',
      language    = 'en_US',
      header_type = 'NONE',
      header_text = '',
      header_media_url = '',
      body,
      footer      = '',
      buttons     = [],
      inbox_id,
    } = req.body;

    if (!name)     return res.status(400).json({ error: 'name is required' });
    if (!body)     return res.status(400).json({ error: 'body is required' });
    if (!inbox_id) return res.status(400).json({ error: 'inbox_id is required' });

    // Auto-fix: if header type is TEXT but no text provided, treat as NONE
    if (header_type === 'TEXT' && !header_text?.trim()) header_type = 'NONE';
    // Auto-fix: if header type is IMAGE/VIDEO/DOCUMENT but no URL, treat as NONE
    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header_type) && !header_media_url?.trim()) header_type = 'NONE';

    // Validate template name — Meta requires lowercase alphanumeric + underscores only
    if (!/^[a-z0-9_]+$/.test(name)) {
      return res.status(400).json({
        error: 'Template name must be lowercase letters, numbers, and underscores only (e.g. order_confirm)',
      });
    }

    const inbox = await getWaInbox(inbox_id, req.agent.id);
    if (!inbox) return res.status(404).json({ error: 'WhatsApp inbox not found or not configured' });

    const token  = inbox.cfg.apiKey || inbox.cfg.accessToken;
    if (!token) return res.status(400).json({ error: 'WhatsApp access token not configured in inbox' });

    const wabaId = await resolveWabaId(inbox.cfg);
    if (!wabaId) {
      return res.status(400).json({
        error: 'WhatsApp Business Account ID (WABA ID) is required. Add it to your WhatsApp inbox settings.',
      });
    }

    const components = buildComponents({
      headerType: header_type,
      headerText: header_text,
      headerMediaUrl: header_media_url,
      body,
      footer,
      buttons,
    });

    // Submit to Meta
    let metaTemplateId = null;
    let metaStatus     = 'PENDING';
    let submitError    = null;

    try {
      const metaRes = await fetch(`${GRAPH_BASE}/${wabaId}/message_templates`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, language, category, components }),
      });
      const metaData = await metaRes.json();

      if (!metaRes.ok) {
        submitError = metaData?.error?.message || JSON.stringify(metaData);
        console.error('❌ Meta template submission failed:', submitError);
      } else {
        metaTemplateId = metaData?.id || null;
        metaStatus     = metaData?.status || 'PENDING';
      }
    } catch (e) {
      submitError = e.message;
      console.error('❌ Meta template API error:', e.message);
    }

    const id = uid();
    await db.prepare(`
      INSERT INTO whatsapp_meta_templates
        (id, name, category, language, status, header_type, header_text, header_media_url,
         body, footer, buttons, components, meta_template_id, inbox_id, rejection_reason, agent_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id,
      name,
      category,
      language,
      submitError ? 'submit_failed' : metaStatus.toLowerCase(),
      header_type,
      header_text || null,
      header_media_url || null,
      body,
      footer || null,
      JSON.stringify(buttons),
      JSON.stringify(components),
      metaTemplateId,
      inbox_id,
      submitError || null,
      req.agent.id
    );

    const template = await db.prepare(
      'SELECT * FROM whatsapp_meta_templates WHERE id=?'
    ).get(id);

    const statusCode = submitError ? 207 : 201; // 207 = partial success (saved locally, Meta failed)
    res.status(statusCode).json({
      template: { ...template, buttons: safeJson(template.buttons, []), components: safeJson(template.components, []) },
      submitted: !submitError,
      submitError,
    });
  } catch (e) {
    console.error('❌ POST /api/wa-templates:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/wa-templates/:id — update template fields (media URL etc.) ──────

router.patch('/:id', auth, async (req, res) => {
  try {
    const row = await db.prepare(
      'SELECT * FROM whatsapp_meta_templates WHERE id=? AND agent_id=?'
    ).get(req.params.id, req.agent.id);
    if (!row) return res.status(404).json({ error: 'Template not found' });

    const fields = ['header_media_url', 'header_text', 'footer'];
    const updates = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    if (!Object.keys(updates).length) {
      return res.json({
        template: { ...row, buttons: safeJson(row.buttons, []), components: safeJson(row.components, []) },
      });
    }

    const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
    await db.prepare(
      `UPDATE whatsapp_meta_templates SET ${sets}, updated_at=NOW() WHERE id=? AND agent_id=?`
    ).run(...Object.values(updates), req.params.id, req.agent.id);

    const updated = await db.prepare('SELECT * FROM whatsapp_meta_templates WHERE id=?').get(req.params.id);
    res.json({
      template: { ...updated, buttons: safeJson(updated.buttons, []), components: safeJson(updated.components, []) },
    });
  } catch (e) {
    console.error('❌ PATCH /api/wa-templates/:id:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/wa-templates/:id/sync — refresh single template status from Meta ─

router.get('/:id/sync', auth, async (req, res) => {
  try {
    const row = await db.prepare(
      'SELECT * FROM whatsapp_meta_templates WHERE id=? AND agent_id=?'
    ).get(req.params.id, req.agent.id);
    if (!row) return res.status(404).json({ error: 'Template not found' });

    const inbox = await getWaInbox(row.inbox_id, req.agent.id);
    if (!inbox) return res.status(404).json({ error: 'Associated inbox not found' });

    const token = inbox.cfg.apiKey || inbox.cfg.accessToken;
    if (!token) return res.status(400).json({ error: 'Access token not configured' });

    if (!row.meta_template_id) {
      return res.status(400).json({ error: 'No Meta template ID stored — template may not have been submitted yet' });
    }

    const metaRes  = await fetch(
      `${GRAPH_BASE}/${row.meta_template_id}?fields=name,status,category,language,components,rejected_reason`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      const msg = metaData?.error?.message || JSON.stringify(metaData);
      return res.status(502).json({ error: `Meta API error: ${msg}` });
    }

    const newStatus = (metaData.status || 'PENDING').toLowerCase();
    const rejection = metaData.rejected_reason || null;

    await db.prepare(
      'UPDATE whatsapp_meta_templates SET status=?, rejection_reason=?, updated_at=NOW() WHERE id=?'
    ).run(newStatus, rejection, row.id);

    const updated = await db.prepare('SELECT * FROM whatsapp_meta_templates WHERE id=?').get(row.id);
    res.json({
      template: { ...updated, buttons: safeJson(updated.buttons, []), components: safeJson(updated.components, []) },
      synced: true,
    });
  } catch (e) {
    console.error('❌ GET /api/wa-templates/:id/sync:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/wa-templates/sync-all — refresh all template statuses ───────────

router.post('/sync-all', auth, async (req, res) => {
  try {
    const inbox = await getFirstWaInbox(req.agent.id);
    if (!inbox) return res.status(400).json({ error: 'No active WhatsApp inbox found' });

    const token  = inbox.cfg.apiKey || inbox.cfg.accessToken;
    const wabaId = await resolveWabaId(inbox.cfg);
    if (!wabaId) return res.status(400).json({ error: 'WABA ID not configured' });

    // Fetch all templates from Meta
    const metaRes  = await fetch(
      `${GRAPH_BASE}/${wabaId}/message_templates?fields=name,status,category,language,rejected_reason&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      const msg = metaData?.error?.message || JSON.stringify(metaData);
      return res.status(502).json({ error: `Meta API error: ${msg}` });
    }

    const metaTemplates = metaData?.data || [];
    let updated = 0;

    for (const mt of metaTemplates) {
      const newStatus = (mt.status || 'PENDING').toLowerCase();
      const rejection = mt.rejected_reason || null;

      // Match by name (Meta template names are unique per WABA)
      const r = await db.prepare(
        'UPDATE whatsapp_meta_templates SET status=?, rejection_reason=?, meta_template_id=COALESCE(meta_template_id, ?), updated_at=NOW() WHERE name=? AND agent_id=?'
      ).run(newStatus, rejection, mt.id || null, mt.name, req.agent.id);

      if (r.affectedRows > 0) updated++;
    }

    const allTemplates = await db.prepare(
      'SELECT * FROM whatsapp_meta_templates WHERE agent_id=? ORDER BY created_at DESC'
    ).all(req.agent.id);

    res.json({
      synced: updated,
      total: allTemplates.length,
      templates: allTemplates.map(t => ({
        ...t,
        buttons: safeJson(t.buttons, []),
        components: safeJson(t.components, []),
      })),
    });
  } catch (e) {
    console.error('❌ POST /api/wa-templates/sync-all:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/wa-templates/:id — delete from DB (and optionally Meta) ───────

router.delete('/:id', auth, async (req, res) => {
  try {
    const row = await db.prepare(
      'SELECT * FROM whatsapp_meta_templates WHERE id=? AND agent_id=?'
    ).get(req.params.id, req.agent.id);
    if (!row) return res.status(404).json({ error: 'Template not found' });

    // Optionally delete from Meta if we have the WABA ID
    if (row.meta_template_id) {
      try {
        const inbox = await getWaInbox(row.inbox_id, req.agent.id);
        if (inbox) {
          const token  = inbox.cfg.apiKey || inbox.cfg.accessToken;
          const wabaId = await resolveWabaId(inbox.cfg);
          if (token && wabaId) {
            await fetch(
              `${GRAPH_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(row.name)}`,
              { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
            );
          }
        }
      } catch (e) {
        console.warn('[wa-templates] Failed to delete from Meta (non-fatal):', e.message);
      }
    }

    await db.prepare('DELETE FROM whatsapp_meta_templates WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
    res.json({ success: true });
  } catch (e) {
    console.error('❌ DELETE /api/wa-templates/:id:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
