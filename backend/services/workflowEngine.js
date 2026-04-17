'use strict';
/**
 * Workflow Engine — executes n8n-style node graphs in response to internal events.
 *
 * Trigger types: new_conversation, new_message, contact_created, conversation_resolved,
 *                csat_received, campaign_reply, schedule, manual
 *
 * Node types:   condition, delay, send_reply, send_email, send_sms, send_whatsapp,
 *               assign_agent, add_label, set_priority, resolve, snooze, ai_reply,
 *               create_contact, launch_campaign, log, webhook
 */

const db = require('../db');
const { uid } = require('../utils/helpers');

let wsRef = null;
const setWsRef = (ws) => { wsRef = ws; };

function safeJson(v, fb) {
  try { return typeof v === 'string' ? JSON.parse(v) : (v || fb); } catch { return fb; }
}
function nowTs() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }

/** Resolve a dotted path like "contact.email" against a context object */
function getPath(obj, path) {
  if (!path) return undefined;
  return String(path).split('.').reduce((a, k) => (a == null ? undefined : a[k]), obj);
}

/** Replace {{var}} placeholders inside a string from the execution context */
function interpolate(str, ctx) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p) => {
    const v = getPath(ctx, p);
    return v == null ? '' : String(v);
  });
}

/** Evaluate a single condition against ctx. Returns true/false. */
function evalCondition(cond, ctx) {
  if (!cond || !cond.attr) return true;
  const left = getPath(ctx, cond.attr);
  const right = interpolate(cond.val, ctx);
  const op = cond.op || 'equals';
  const L = left == null ? '' : String(left).toLowerCase();
  const R = right == null ? '' : String(right).toLowerCase();
  switch (op) {
    case 'equals':        return L === R;
    case 'not_equals':    return L !== R;
    case 'contains':      return L.includes(R);
    case 'not_contains':  return !L.includes(R);
    case 'is_present':    return L !== '' && L !== 'null' && L !== 'undefined';
    case 'is_empty':      return L === '' || L === 'null' || L === 'undefined';
    case 'greater_than':  return Number(left) > Number(right);
    case 'less_than':     return Number(left) < Number(right);
    case 'starts_with':   return L.startsWith(R);
    case 'ends_with':     return L.endsWith(R);
    default: return false;
  }
}

/** Evaluate a group of conditions (AND by default, OR if mode='or') */
function evalConditions(conds, ctx, mode = 'and') {
  if (!Array.isArray(conds) || !conds.length) return true;
  if (mode === 'or') return conds.some(c => evalCondition(c, ctx));
  return conds.every(c => evalCondition(c, ctx));
}

// ── Action executors ────────────────────────────────────────────────────────
const ACTIONS = {
  async log(node, ctx, runLog) {
    const text = interpolate(node.config?.text || '', ctx);
    runLog.push({ node: node.id, action: 'log', message: text, ts: nowTs() });
    console.log(`[workflow] LOG: ${text}`);
    return { ok: true };
  },

  async delay(node, ctx, runLog) {
    const ms = Math.max(0, parseInt(node.config?.ms || 0, 10));
    if (ms > 0) await new Promise(r => setTimeout(r, ms));
    runLog.push({ node: node.id, action: 'delay', ms, ts: nowTs() });
    return { ok: true };
  },

  async condition(node, ctx, runLog) {
    const result = evalConditions(node.config?.conditions || [], ctx, node.config?.mode || 'and');
    runLog.push({ node: node.id, action: 'condition', result, ts: nowTs() });
    return { ok: true, branch: result ? 'true' : 'false' };
  },

  async send_reply(node, ctx, runLog) {
    const cvId = ctx.conversation?.id || ctx.conversation_id;
    if (!cvId) { runLog.push({ node: node.id, action: 'send_reply', skipped: 'no conversation in context', ts: nowTs() }); return { ok: false }; }
    const text = interpolate(node.config?.text || '', ctx);
    const msgId = uid();
    await db.prepare('INSERT INTO messages (id, conversation_id, role, text, created_at) VALUES (?,?,?,?,?)').run(
      msgId, cvId, 'agent', text, nowTs()
    );
    await db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(nowTs(), cvId);
    if (wsRef) wsRef.broadcastToAll({ type: 'new_message', conversationId: cvId, message: { id: msgId, conversation_id: cvId, role: 'agent', text, created_at: nowTs() } });
    runLog.push({ node: node.id, action: 'send_reply', conversation_id: cvId, text, ts: nowTs() });
    return { ok: true };
  },

  async assign_agent(node, ctx, runLog) {
    const cvId = ctx.conversation?.id || ctx.conversation_id;
    const aId = interpolate(node.config?.agent_id || '', ctx);
    if (!cvId || !aId) { runLog.push({ node: node.id, action: 'assign_agent', skipped: 'missing conv or agent', ts: nowTs() }); return { ok: false }; }
    await db.prepare('UPDATE conversations SET assignee_id=?, updated_at=? WHERE id=?').run(aId, nowTs(), cvId);
    if (wsRef) wsRef.broadcastToAll({ type: 'conversation_update', conversationId: cvId, changes: { assignee_id: aId } });
    runLog.push({ node: node.id, action: 'assign_agent', conversation_id: cvId, agent_id: aId, ts: nowTs() });
    return { ok: true };
  },

  async add_label(node, ctx, runLog) {
    const cvId = ctx.conversation?.id || ctx.conversation_id;
    const label = interpolate(node.config?.label || '', ctx);
    if (!cvId || !label) return { ok: false };
    const row = await db.prepare('SELECT labels FROM conversations WHERE id=?').get(cvId);
    const current = safeJson(row?.labels, []);
    if (!current.includes(label)) current.push(label);
    await db.prepare('UPDATE conversations SET labels=?, updated_at=? WHERE id=?').run(JSON.stringify(current), nowTs(), cvId);
    if (wsRef) wsRef.broadcastToAll({ type: 'conversation_update', conversationId: cvId, changes: { labels: current } });
    runLog.push({ node: node.id, action: 'add_label', conversation_id: cvId, label, ts: nowTs() });
    return { ok: true };
  },

  async set_priority(node, ctx, runLog) {
    const cvId = ctx.conversation?.id || ctx.conversation_id;
    const priority = interpolate(node.config?.priority || 'normal', ctx);
    if (!cvId) return { ok: false };
    await db.prepare('UPDATE conversations SET priority=?, updated_at=? WHERE id=?').run(priority, nowTs(), cvId);
    if (wsRef) wsRef.broadcastToAll({ type: 'conversation_update', conversationId: cvId, changes: { priority } });
    runLog.push({ node: node.id, action: 'set_priority', conversation_id: cvId, priority, ts: nowTs() });
    return { ok: true };
  },

  async resolve(node, ctx, runLog) {
    const cvId = ctx.conversation?.id || ctx.conversation_id;
    if (!cvId) return { ok: false };
    await db.prepare('UPDATE conversations SET status=?, resolved_at=?, updated_at=? WHERE id=?').run('resolved', nowTs(), nowTs(), cvId);
    if (wsRef) wsRef.broadcastToAll({ type: 'conversation_update', conversationId: cvId, changes: { status: 'resolved' } });
    runLog.push({ node: node.id, action: 'resolve', conversation_id: cvId, ts: nowTs() });
    return { ok: true };
  },

  async snooze(node, ctx, runLog) {
    const cvId = ctx.conversation?.id || ctx.conversation_id;
    const hours = parseInt(node.config?.hours || 24, 10);
    if (!cvId) return { ok: false };
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await db.prepare('UPDATE conversations SET status=?, snoozed_until=?, updated_at=? WHERE id=?').run('snoozed', until, nowTs(), cvId);
    if (wsRef) wsRef.broadcastToAll({ type: 'conversation_update', conversationId: cvId, changes: { status: 'snoozed', snoozed_until: until } });
    runLog.push({ node: node.id, action: 'snooze', conversation_id: cvId, until, ts: nowTs() });
    return { ok: true };
  },

  async send_email(node, ctx, runLog) {
    try {
      const { sendEmail } = require('./emailService');
      const to = interpolate(node.config?.to || ctx.contact?.email || '', ctx);
      const subject = interpolate(node.config?.subject || '', ctx);
      const text = interpolate(node.config?.body || '', ctx);
      const inboxId = node.config?.inbox_id;
      if (!to) { runLog.push({ node: node.id, action: 'send_email', skipped: 'no recipient', ts: nowTs() }); return { ok: false }; }
      await sendEmail({ inboxId, to, subject, text, html: text });
      runLog.push({ node: node.id, action: 'send_email', to, subject, ts: nowTs() });
      return { ok: true };
    } catch (e) {
      runLog.push({ node: node.id, action: 'send_email', error: e.message, ts: nowTs() });
      return { ok: false, error: e.message };
    }
  },

  async send_sms(node, ctx, runLog) {
    try {
      const { sendSms } = require('./smsService');
      const to = interpolate(node.config?.to || ctx.contact?.phone || '', ctx);
      const text = interpolate(node.config?.text || '', ctx);
      const inboxId = node.config?.inbox_id;
      if (!to || !inboxId) { runLog.push({ node: node.id, action: 'send_sms', skipped: 'missing to or inbox', ts: nowTs() }); return { ok: false }; }
      const r = await sendSms({ inboxId, to, text });
      runLog.push({ node: node.id, action: 'send_sms', to, sid: r?.sid, ts: nowTs() });
      return { ok: true };
    } catch (e) {
      runLog.push({ node: node.id, action: 'send_sms', error: e.message, ts: nowTs() });
      return { ok: false, error: e.message };
    }
  },

  async send_whatsapp(node, ctx, runLog) {
    try {
      const { sendWhatsAppMessage } = require('./whatsappService');
      const to = interpolate(node.config?.to || ctx.contact?.phone || '', ctx);
      const text = interpolate(node.config?.text || '', ctx);
      const inboxId = node.config?.inbox_id;
      if (!to || !inboxId) { runLog.push({ node: node.id, action: 'send_whatsapp', skipped: 'missing to or inbox', ts: nowTs() }); return { ok: false }; }
      await sendWhatsAppMessage({ inboxId, to, text });
      runLog.push({ node: node.id, action: 'send_whatsapp', to, ts: nowTs() });
      return { ok: true };
    } catch (e) {
      runLog.push({ node: node.id, action: 'send_whatsapp', error: e.message, ts: nowTs() });
      return { ok: false, error: e.message };
    }
  },

  async ai_reply(node, ctx, runLog) {
    try {
      const { callGemini } = require('../routes/ai');
      const cvId = ctx.conversation?.id || ctx.conversation_id;
      const prompt = interpolate(node.config?.prompt || 'Reply helpfully to the customer', ctx);
      const lastMsg = ctx.message?.text || '';
      const reply = await callGemini('You are a helpful customer support agent. Keep replies under 3 sentences.', `${prompt}\n\nCustomer said: ${lastMsg}`, 200);
      if (cvId && reply) {
        const msgId = uid();
        await db.prepare('INSERT INTO messages (id, conversation_id, role, text, created_at) VALUES (?,?,?,?,?)').run(
          msgId, cvId, 'agent', reply, nowTs()
        );
        if (wsRef) wsRef.broadcastToAll({ type: 'new_message', conversationId: cvId, message: { id: msgId, conversation_id: cvId, role: 'agent', text: reply, created_at: nowTs() } });
      }
      runLog.push({ node: node.id, action: 'ai_reply', conversation_id: cvId, reply: (reply || '').slice(0, 120), ts: nowTs() });
      return { ok: true, output: { ai_reply: reply } };
    } catch (e) {
      runLog.push({ node: node.id, action: 'ai_reply', error: e.message, ts: nowTs() });
      return { ok: false, error: e.message };
    }
  },

  async launch_campaign(node, ctx, runLog) {
    try {
      const campaignId = node.config?.campaign_id;
      if (!campaignId) { runLog.push({ node: node.id, action: 'launch_campaign', skipped: 'no campaign_id', ts: nowTs() }); return { ok: false }; }
      await db.prepare("UPDATE campaigns SET status='queued', updated_at=? WHERE id=?").run(nowTs(), campaignId);
      runLog.push({ node: node.id, action: 'launch_campaign', campaign_id: campaignId, ts: nowTs() });
      return { ok: true };
    } catch (e) {
      runLog.push({ node: node.id, action: 'launch_campaign', error: e.message, ts: nowTs() });
      return { ok: false, error: e.message };
    }
  },

  async webhook(node, ctx, runLog) {
    try {
      const url = interpolate(node.config?.url || '', ctx);
      if (!url) return { ok: false };
      const payload = { event: ctx.triggerType, data: ctx };
      const res = await fetch(url, {
        method: node.config?.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      runLog.push({ node: node.id, action: 'webhook', url, status: res.status, ts: nowTs() });
      return { ok: res.ok };
    } catch (e) {
      runLog.push({ node: node.id, action: 'webhook', error: e.message, ts: nowTs() });
      return { ok: false, error: e.message };
    }
  },
};

// ── Graph execution ────────────────────────────────────────────────────────

/** Run a single workflow's node graph against a trigger context */
async function runWorkflow(workflow, triggerCtx) {
  const runId = uid();
  const nodes = safeJson(workflow.nodes, []);
  const edges = safeJson(workflow.edges, []);
  const runLog = [];
  const ctx = { ...triggerCtx };
  let status = 'success';
  let errMsg = null;

  // Insert run row (started)
  await db.prepare(
    'INSERT INTO workflow_runs (id, workflow_id, status, trigger_data, started_at, agent_id) VALUES (?,?,?,?,?,?)'
  ).run(runId, workflow.id, 'running', JSON.stringify(triggerCtx), nowTs(), workflow.agent_id || null);

  if (wsRef) wsRef.broadcastToAll({ type: 'workflow_run_started', workflow_id: workflow.id, run_id: runId });

  try {
    // Find start node (type=trigger)
    const start = nodes.find(n => n.type === 'trigger');
    if (!start) throw new Error('no trigger node in workflow');

    // Walk graph following edges; for conditions we branch on 'true'/'false' labels
    const visited = new Set();
    const queue = [start.id];
    while (queue.length) {
      const curId = queue.shift();
      if (visited.has(curId)) continue;
      visited.add(curId);
      const node = nodes.find(n => n.id === curId);
      if (!node) continue;

      let result = { ok: true };
      if (node.type !== 'trigger') {
        const fn = ACTIONS[node.type];
        if (!fn) {
          runLog.push({ node: node.id, action: node.type, error: 'unknown node type', ts: nowTs() });
        } else {
          try {
            result = await fn(node, ctx, runLog);
            if (result?.output) Object.assign(ctx, result.output);
          } catch (e) {
            runLog.push({ node: node.id, action: node.type, error: e.message, ts: nowTs() });
            result = { ok: false, error: e.message };
          }
        }
      }

      // Determine next node(s). For condition nodes follow branch-labeled edges.
      const outgoing = edges.filter(e => e.source === curId);
      for (const e of outgoing) {
        if (node.type === 'condition' && result.branch && e.label && e.label !== result.branch) continue;
        queue.push(e.target);
      }
    }
  } catch (e) {
    status = 'error';
    errMsg = e.message;
    runLog.push({ error: e.message, ts: nowTs() });
  }

  await db.prepare(
    'UPDATE workflow_runs SET status=?, execution_log=?, error_message=?, completed_at=? WHERE id=?'
  ).run(status, JSON.stringify(runLog), errMsg, nowTs(), runId);

  // Update workflow stats
  try {
    const stats = safeJson(workflow.stats, { runs: 0, errors: 0, last_run: null });
    stats.runs = (stats.runs || 0) + 1;
    if (status === 'error') stats.errors = (stats.errors || 0) + 1;
    stats.last_run = nowTs();
    await db.prepare('UPDATE workflows SET stats=? WHERE id=?').run(JSON.stringify(stats), workflow.id);
  } catch {}

  if (wsRef) wsRef.broadcastToAll({
    type: 'workflow_run_completed',
    workflow_id: workflow.id, run_id: runId, status, error: errMsg, log_count: runLog.length,
  });

  return { runId, status, log: runLog };
}

// ── Public entry points ────────────────────────────────────────────────────

/**
 * Called whenever a trigger fires inside the app.
 * Looks up all active workflows matching triggerType and runs each in parallel.
 */
async function dispatchTrigger(triggerType, context = {}) {
  try {
    const rows = await db.prepare(
      "SELECT * FROM workflows WHERE active=1 AND trigger_type=?"
    ).all(triggerType);
    if (!rows || !rows.length) return;

    const ctx = { triggerType, ...context };

    // Evaluate trigger-level filters (from trigger_config.conditions) before running
    await Promise.all(rows.map(async (wf) => {
      try {
        const tcfg = safeJson(wf.trigger_config, {});
        if (tcfg.conditions && !evalConditions(tcfg.conditions, ctx, tcfg.mode || 'and')) return;
        await runWorkflow(wf, ctx);
      } catch (e) {
        console.error(`[workflow] ${wf.id} failed:`, e.message);
      }
    }));
  } catch (e) {
    console.error('[workflow] dispatchTrigger error:', e.message);
  }
}

/** Manual run (test button in UI) */
async function runWorkflowById(workflowId, ctx = {}) {
  const wf = await db.prepare('SELECT * FROM workflows WHERE id=?').get(workflowId);
  if (!wf) throw new Error('workflow not found');
  return runWorkflow(wf, { triggerType: 'manual', ...ctx });
}

module.exports = {
  setWsRef,
  dispatchTrigger,
  runWorkflowById,
  evalConditions,
  interpolate,
  ACTIONS,
};
