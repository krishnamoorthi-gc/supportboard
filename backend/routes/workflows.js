'use strict';
/**
 * Workflow CRUD + manual execution routes.
 *
 *  GET    /api/workflows              list
 *  POST   /api/workflows              create
 *  GET    /api/workflows/:id          detail
 *  PATCH  /api/workflows/:id          update (name, active, nodes, edges, trigger)
 *  DELETE /api/workflows/:id          delete
 *  POST   /api/workflows/:id/test     execute once with supplied context
 *  GET    /api/workflows/:id/runs     last 50 execution rows
 *  GET    /api/workflows/:id/runs/:rid  full execution log
 *
 *  GET    /api/workflows/_catalog     static catalog (triggers, node types, operators)
 */

const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid } = require('../utils/helpers');
const engine = require('../services/workflowEngine');

function safeJson(v, fb) {
  try { return typeof v === 'string' ? JSON.parse(v) : (v || fb); } catch { return fb; }
}

function hydrate(row) {
  if (!row) return null;
  row.nodes = safeJson(row.nodes, []);
  row.edges = safeJson(row.edges, []);
  row.trigger_config = safeJson(row.trigger_config, {});
  row.stats = safeJson(row.stats, { runs: 0, errors: 0, last_run: null });
  row.active = !!row.active;
  return row;
}

// ── Catalog: static list of what's available in the builder ────────────────
router.get('/_catalog', auth, async (req, res) => {
  res.json({
    triggers: [
      { id: 'new_conversation',      label: 'New conversation',      icon: '💬' },
      { id: 'new_message',           label: 'Message received',      icon: '📨' },
      { id: 'conversation_resolved', label: 'Conversation resolved', icon: '✅' },
      { id: 'contact_created',       label: 'Contact created',       icon: '👤' },
      { id: 'csat_received',         label: 'CSAT received',         icon: '⭐' },
      { id: 'campaign_reply',        label: 'Campaign reply',        icon: '📢' },
      { id: 'manual',                label: 'Manual / Webhook',      icon: '⚡' },
    ],
    nodeTypes: [
      { id: 'condition',       label: 'If / Else',         icon: '🔀', category: 'logic' },
      { id: 'delay',           label: 'Delay',             icon: '⏱',  category: 'logic' },
      { id: 'send_reply',      label: 'Send Reply',        icon: '💬', category: 'message' },
      { id: 'send_email',      label: 'Send Email',        icon: '📧', category: 'message' },
      { id: 'send_sms',        label: 'Send SMS',          icon: '📱', category: 'message' },
      { id: 'send_whatsapp',   label: 'Send WhatsApp',     icon: '🟢', category: 'message' },
      { id: 'ai_reply',        label: 'AI Reply',          icon: '✨', category: 'ai' },
      { id: 'assign_agent',    label: 'Assign Agent',      icon: '👤', category: 'action' },
      { id: 'add_label',       label: 'Add Label',         icon: '🏷', category: 'action' },
      { id: 'set_priority',    label: 'Set Priority',      icon: '🚩', category: 'action' },
      { id: 'resolve',         label: 'Resolve',           icon: '✅', category: 'action' },
      { id: 'snooze',          label: 'Snooze',            icon: '💤', category: 'action' },
      { id: 'launch_campaign', label: 'Launch Campaign',   icon: '📢', category: 'action' },
      { id: 'webhook',         label: 'HTTP Webhook',      icon: '🌐', category: 'action' },
      { id: 'log',             label: 'Log Message',       icon: '📝', category: 'util' },
    ],
    operators: [
      { id: 'equals',       label: 'equals' },
      { id: 'not_equals',   label: 'not equals' },
      { id: 'contains',     label: 'contains' },
      { id: 'not_contains', label: 'not contains' },
      { id: 'is_present',   label: 'is present' },
      { id: 'is_empty',     label: 'is empty' },
      { id: 'starts_with',  label: 'starts with' },
      { id: 'ends_with',    label: 'ends with' },
      { id: 'greater_than', label: 'greater than' },
      { id: 'less_than',    label: 'less than' },
    ],
    contextVars: [
      'contact.name', 'contact.email', 'contact.phone', 'contact.company',
      'conversation.id', 'conversation.subject', 'conversation.channel', 'conversation.priority',
      'message.text', 'message.role',
      'campaign.id', 'campaign.name',
    ],
  });
});

// ── List ────────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const rows = await db.prepare(
      'SELECT * FROM workflows WHERE agent_id=? ORDER BY created_at DESC'
    ).all(req.agent.id);
    res.json({ workflows: rows.map(hydrate) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Create ──────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { name, description = '', trigger_type, trigger_config = {}, nodes = [], edges = [], active = 1 } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    if (!trigger_type) return res.status(400).json({ error: 'trigger_type required' });

    const id = 'wf_' + uid();
    await db.prepare(
      'INSERT INTO workflows (id, name, description, trigger_type, trigger_config, nodes, edges, active, stats, agent_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).run(
      id, name, description || '', trigger_type,
      JSON.stringify(trigger_config), JSON.stringify(nodes), JSON.stringify(edges),
      active ? 1 : 0, JSON.stringify({ runs: 0, errors: 0, last_run: null }), req.agent.id
    );
    const row = await db.prepare('SELECT * FROM workflows WHERE id=?').get(id);
    res.status(201).json({ workflow: hydrate(row) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Detail ──────────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  const row = await db.prepare('SELECT * FROM workflows WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json({ workflow: hydrate(row) });
});

// ── Update ──────────────────────────────────────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM workflows WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!row) return res.status(404).json({ error: 'not found' });

    const up = {};
    const b = req.body;
    if (b.name !== undefined) up.name = b.name;
    if (b.description !== undefined) up.description = b.description;
    if (b.trigger_type !== undefined) up.trigger_type = b.trigger_type;
    if (b.trigger_config !== undefined) up.trigger_config = JSON.stringify(b.trigger_config);
    if (b.nodes !== undefined) up.nodes = JSON.stringify(b.nodes);
    if (b.edges !== undefined) up.edges = JSON.stringify(b.edges);
    if (b.active !== undefined) up.active = b.active ? 1 : 0;
    if (!Object.keys(up).length) return res.json({ workflow: hydrate(row) });

    const sets = Object.keys(up).map(k => `${k}=?`).join(',');
    await db.prepare(`UPDATE workflows SET ${sets} WHERE id=? AND agent_id=?`).run(
      ...Object.values(up), req.params.id, req.agent.id
    );
    const updated = await db.prepare('SELECT * FROM workflows WHERE id=?').get(req.params.id);
    res.json({ workflow: hydrate(updated) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Delete ──────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM workflows WHERE id=? AND agent_id=?').run(req.params.id, req.agent.id);
  await db.prepare('DELETE FROM workflow_runs WHERE workflow_id=?').run(req.params.id).catch(() => {});
  res.json({ success: true });
});

// ── Test execute (manual) ──────────────────────────────────────────────────
router.post('/:id/test', auth, async (req, res) => {
  try {
    const wf = await db.prepare('SELECT * FROM workflows WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
    if (!wf) return res.status(404).json({ error: 'not found' });
    const ctx = req.body?.context || {};
    const r = await engine.runWorkflowById(req.params.id, ctx);
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Runs list ───────────────────────────────────────────────────────────────
router.get('/:id/runs', auth, async (req, res) => {
  const wf = await db.prepare('SELECT id FROM workflows WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!wf) return res.status(404).json({ error: 'not found' });
  const rows = await db.prepare(
    'SELECT id, status, started_at, completed_at, error_message FROM workflow_runs WHERE workflow_id=? ORDER BY started_at DESC LIMIT 50'
  ).all(req.params.id);
  res.json({ runs: rows });
});

// ── Single run detail (with full log) ──────────────────────────────────────
router.get('/:id/runs/:rid', auth, async (req, res) => {
  const wf = await db.prepare('SELECT id FROM workflows WHERE id=? AND agent_id=?').get(req.params.id, req.agent.id);
  if (!wf) return res.status(404).json({ error: 'not found' });
  const run = await db.prepare('SELECT * FROM workflow_runs WHERE id=? AND workflow_id=?').get(req.params.rid, req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  run.trigger_data = safeJson(run.trigger_data, {});
  run.execution_log = safeJson(run.execution_log, []);
  res.json({ run });
});

module.exports = router;
