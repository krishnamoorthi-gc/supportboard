const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { uid, paginate, parseJson, ok } = require('../utils/helpers');
const { broadcastToAll, sendToAgent } = require('../ws');

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

// helper: log an activity
async function logActivity(type, title, entityType, entityId, performerId, agentId, meta) {
  await db.prepare('INSERT INTO crm_activities (id,type,title,entity_type,entity_id,performer_id,metadata,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
    uid(), type, title, entityType, entityId, performerId, meta ? JSON.stringify(meta) : null, agentId, now()
  );
}

// helper: broadcast CRM update
function crmBroadcast(event, data) {
  try { broadcastToAll({ type: 'crm_update', event, ...data, timestamp: new Date().toISOString() }); } catch {}
}

// helper: notify agent
function notifyAgent(agentId, payload) {
  try { sendToAgent(agentId, { type: 'notification', ...payload }); } catch {}
}

// ═══════════════════════════════════════════════════════════════════════
// ── CRM DASHBOARD ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/dashboard', auth, async (req, res) => {
  try {
    const aid = req.agent.id;
    const [
      activeLeads, totalDeals, wonDeals, lostDeals, tasksDue, tasksDone,
      overdueActivities, meetingsToday, pipelineStages, recentActivities,
      teamPerf, leadsBySource, leadsByStatus
    ] = await Promise.all([
      db.prepare('SELECT COUNT(*) as c FROM leads WHERE agent_id=? AND status NOT IN (?,?)').get(aid, 'Converted', 'Lost'),
      db.prepare('SELECT COUNT(*) as c, COALESCE(SUM(value),0) as total_value FROM deals WHERE agent_id=?').get(aid),
      db.prepare('SELECT COUNT(*) as c, COALESCE(SUM(value),0) as revenue FROM deals WHERE agent_id=? AND stage=?').get(aid, 'Won'),
      db.prepare('SELECT COUNT(*) as c FROM deals WHERE agent_id=? AND stage=?').get(aid, 'Lost'),
      db.prepare('SELECT COUNT(*) as c FROM tasks WHERE agent_id=? AND status!=? AND due_date<=?').get(aid, 'done', now()),
      db.prepare('SELECT COUNT(*) as c FROM tasks WHERE agent_id=? AND status=?').get(aid, 'done'),
      db.prepare('SELECT COUNT(*) as c FROM tasks WHERE agent_id=? AND status!=? AND due_date<? AND due_date IS NOT NULL').get(aid, 'done', now()),
      db.prepare("SELECT COUNT(*) as c FROM meetings WHERE agent_id=? AND DATE(start_time)=CURDATE()").get(aid),
      db.prepare('SELECT stage, COUNT(*) as c, COALESCE(SUM(value),0) as total FROM deals WHERE agent_id=? GROUP BY stage ORDER BY FIELD(stage,?,?,?,?,?,?)').all(aid, 'Open', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'),
      db.prepare('SELECT * FROM crm_activities WHERE agent_id=? ORDER BY created_at DESC LIMIT 20').all(aid),
      db.prepare('SELECT a.id, a.name, COUNT(DISTINCT d.id) as deals, COALESCE(SUM(CASE WHEN d.stage=? THEN d.value ELSE 0 END),0) as won_revenue, COUNT(DISTINCT l.id) as leads FROM agents a LEFT JOIN deals d ON d.owner_id=a.id AND d.agent_id=? LEFT JOIN leads l ON l.owner_id=a.id AND l.agent_id=? WHERE a.id IN (SELECT DISTINCT owner_id FROM deals WHERE agent_id=? UNION SELECT DISTINCT owner_id FROM leads WHERE agent_id=?) GROUP BY a.id, a.name').all('Won', aid, aid, aid, aid),
      db.prepare('SELECT source, COUNT(*) as c FROM leads WHERE agent_id=? AND source IS NOT NULL GROUP BY source').all(aid),
      db.prepare('SELECT status, COUNT(*) as c FROM leads WHERE agent_id=? GROUP BY status').all(aid),
    ]);

    const openDeals = (totalDeals?.c || 0) - (wonDeals?.c || 0) - (lostDeals?.c || 0);
    const conversionRate = (activeLeads?.c || 0) > 0 ? Math.round(((wonDeals?.c || 0) / Math.max(1, activeLeads?.c || 1)) * 100) : 0;
    const winRate = (totalDeals?.c || 0) > 0 ? Math.round(((wonDeals?.c || 0) / Math.max(1, totalDeals?.c || 1)) * 100) : 0;

    for (const a of recentActivities) { a.metadata = parseJson(a.metadata, {}); }

    res.json({
      widgets: {
        active_leads: activeLeads?.c || 0,
        open_deals: openDeals,
        pipeline_value: totalDeals?.total_value || 0,
        won_revenue: wonDeals?.revenue || 0,
        tasks_due: tasksDue?.c || 0,
        meetings_today: meetingsToday?.c || 0,
        conversion_rate: conversionRate,
        win_rate: winRate,
        overdue_activities: overdueActivities?.c || 0,
        completed_activities: tasksDone?.c || 0,
      },
      pipeline: pipelineStages,
      recent_activities: recentActivities,
      team_performance: teamPerf,
      leads_by_source: leadsBySource,
      leads_by_status: leadsByStatus,
    });
  } catch (e) {
    console.error('CRM dashboard error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// ── LEADS ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/leads', auth, async (req, res) => {
  const { status, priority, owner, team, source, industry, q, sort, order } = req.query;
  let where = 'l.agent_id=?'; const params = [req.agent.id];
  if (status) { where += ' AND l.status=?'; params.push(status); }
  if (priority) { where += ' AND l.priority=?'; params.push(priority); }
  if (owner) { where += ' AND l.owner_id=?'; params.push(owner); }
  if (team) { where += ' AND l.team_id=?'; params.push(team); }
  if (source) { where += ' AND l.source=?'; params.push(source); }
  if (industry) { where += ' AND l.industry=?'; params.push(industry); }
  if (q) { where += ' AND (l.name LIKE ? OR l.email LIKE ? OR l.company LIKE ? OR l.phone LIKE ?)'; const lq = `%${q}%`; params.push(lq, lq, lq, lq); }
  const sortCol = { score: 'l.score', value: 'l.value', created: 'l.created_at', updated: 'l.updated_at', name: 'l.name', followup: 'l.next_followup_date' }[sort] || 'l.updated_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';
  const leads = await db.prepare(`
    SELECT l.*, a.name as owner_name, t.name as team_name FROM leads l
    LEFT JOIN agents a ON l.owner_id = a.id
    LEFT JOIN teams t ON l.team_id = t.id
    WHERE ${where} ORDER BY ${sortCol} ${sortDir}
  `).all(...params);
  for (const l of leads) { l.tags = parseJson(l.tags, []); l.custom_fields = parseJson(l.custom_fields, {}); }
  res.json({ leads });
});

router.get('/leads/:id', auth, async (req, res) => {
  const l = await db.prepare('SELECT l.*, a.name as owner_name FROM leads l LEFT JOIN agents a ON l.owner_id=a.id WHERE l.id=?').get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Not found' });
  l.tags = parseJson(l.tags, []); l.custom_fields = parseJson(l.custom_fields, {});
  const activities = await db.prepare('SELECT * FROM crm_activities WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC LIMIT 50').all('lead', l.id);
  for (const a of activities) a.metadata = parseJson(a.metadata, {});
  const tasks = await db.prepare('SELECT * FROM tasks WHERE related_type=? AND related_id=? ORDER BY due_date ASC').all('lead', l.id);
  const meetings = await db.prepare('SELECT * FROM meetings WHERE related_type=? AND related_id=? ORDER BY start_time DESC').all('lead', l.id);
  for (const m of meetings) m.attendees = parseJson(m.attendees, []);
  res.json({ lead: l, activities, tasks, meetings });
});

router.post('/leads', auth, async (req, res) => {
  const { name, email, phone, company, designation, source, campaign, industry, status = 'New', priority = 'medium', score = 50, value = 0, owner_id, team_id, tags = [], next_followup_date, remarks, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  const ts = now();
  await db.prepare('INSERT INTO leads (id,name,email,phone,company,designation,source,campaign,industry,status,priority,score,value,owner_id,team_id,tags,next_followup_date,remarks,notes,custom_fields,agent_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, name, email || null, phone || null, company || null, designation || null, source || null, campaign || null, industry || null, status, priority, score, value,
    owner_id || req.agent.id, team_id || null, JSON.stringify(tags), next_followup_date || null, remarks || null, notes || null, '{}', req.agent.id, ts, ts
  );
  const lead = await db.prepare('SELECT * FROM leads WHERE id=?').get(id);
  lead.tags = parseJson(lead.tags, []);
  await logActivity('lead_created', `Lead "${name}" created`, 'lead', id, req.agent.id, req.agent.id, { name, source, status });
  crmBroadcast('lead_created', { lead });
  if (owner_id && owner_id !== req.agent.id) {
    notifyAgent(owner_id, { title: 'New lead assigned', body: `Lead "${name}" has been assigned to you`, entity_type: 'lead', entity_id: id });
  }
  res.status(201).json({ lead });
});

router.patch('/leads/:id', auth, async (req, res) => {
  const l = await db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Not found' });
  const fields = ['name', 'email', 'phone', 'company', 'designation', 'source', 'campaign', 'industry', 'status', 'priority', 'score', 'value', 'owner_id', 'team_id', 'next_followup_date', 'remarks', 'notes'];
  const updates = { updated_at: now() };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.tags !== undefined) updates.tags = JSON.stringify(req.body.tags);
  if (req.body.custom_fields !== undefined) updates.custom_fields = JSON.stringify(req.body.custom_fields);
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE leads SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updated = await db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  updated.tags = parseJson(updated.tags, []);
  // Log stage change
  if (req.body.status && req.body.status !== l.status) {
    await logActivity('lead_stage_changed', `Lead "${l.name}" moved to ${req.body.status}`, 'lead', l.id, req.agent.id, req.agent.id, { from: l.status, to: req.body.status });
  }
  // Log owner change (transfer)
  if (req.body.owner_id && req.body.owner_id !== l.owner_id) {
    await logActivity('lead_transferred', `Lead "${l.name}" transferred`, 'lead', l.id, req.agent.id, req.agent.id, { from_owner: l.owner_id, to_owner: req.body.owner_id });
    notifyAgent(req.body.owner_id, { title: 'Lead transferred to you', body: `Lead "${l.name}" has been transferred to you`, entity_type: 'lead', entity_id: l.id });
  }
  crmBroadcast('lead_updated', { lead: updated });
  res.json({ lead: updated });
});

router.delete('/leads/:id', auth, async (req, res) => {
  const l = await db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Not found' });
  await db.prepare('DELETE FROM leads WHERE id=?').run(req.params.id);
  await logActivity('lead_deleted', `Lead "${l.name}" deleted`, 'lead', l.id, req.agent.id, req.agent.id);
  crmBroadcast('lead_deleted', { id: req.params.id });
  res.json({ success: true });
});

// ── Lead conversion: lead → contact + deal ──
router.post('/leads/:id/convert', auth, async (req, res) => {
  const l = await db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Lead not found' });
  if (l.status === 'Converted') return res.status(400).json({ error: 'Already converted' });

  const { create_contact = true, create_deal = true, deal_title, deal_value, deal_stage = 'Open', create_customer = false } = req.body;
  const ts = now();
  let contactId = null, dealId = null, customerId = null;

  // Create contact from lead
  if (create_contact) {
    contactId = uid();
    await db.prepare('INSERT INTO contacts (id,name,email,phone,company,color,tags,notes,agent_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
      contactId, l.name, l.email, l.phone, l.company, '#4c82fb', l.tags || '[]', l.notes, req.agent.id, ts, ts
    );
  }

  // Create deal from lead
  if (create_deal) {
    dealId = uid();
    const title = deal_title || `${l.name} - Deal`;
    const val = deal_value || l.value || 0;
    await db.prepare('INSERT INTO deals (id,title,value,weighted_value,stage,probability,contact_id,company_id,owner_id,team_id,lead_id,notes,agent_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
      dealId, title, val, val * 0.2, deal_stage, 20, contactId, null, l.owner_id || req.agent.id, l.team_id, l.id, l.notes, req.agent.id, ts, ts
    );
  }

  // Create customer record
  if (create_customer) {
    customerId = uid();
    await db.prepare('INSERT INTO crm_customers (id,name,email,phone,company,contact_id,deal_id,lead_id,owner_id,team_id,status,contract_value,notes,agent_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
      customerId, l.name, l.email, l.phone, l.company, contactId, dealId, l.id, l.owner_id || req.agent.id, l.team_id, 'active', l.value || 0, l.notes, req.agent.id, ts, ts
    );
  }

  // Update lead status
  await db.prepare('UPDATE leads SET status=?, converted_contact_id=?, converted_deal_id=?, updated_at=? WHERE id=?').run('Converted', contactId, dealId, ts, l.id);

  await logActivity('lead_converted', `Lead "${l.name}" converted`, 'lead', l.id, req.agent.id, req.agent.id, { contact_id: contactId, deal_id: dealId, customer_id: customerId });
  crmBroadcast('lead_converted', { lead_id: l.id, contact_id: contactId, deal_id: dealId, customer_id: customerId });

  res.json({ success: true, contact_id: contactId, deal_id: dealId, customer_id: customerId });
});

// ── Bulk lead operations ──
router.post('/leads/bulk', auth, async (req, res) => {
  const { action, ids, data } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'ids required' });
  const ts = now();
  if (action === 'delete') {
    for (const id of ids) await db.prepare('DELETE FROM leads WHERE id=? AND agent_id=?').run(id, req.agent.id);
  } else if (action === 'assign' && data?.owner_id) {
    for (const id of ids) await db.prepare('UPDATE leads SET owner_id=?, updated_at=? WHERE id=? AND agent_id=?').run(data.owner_id, ts, id, req.agent.id);
  } else if (action === 'status' && data?.status) {
    for (const id of ids) await db.prepare('UPDATE leads SET status=?, updated_at=? WHERE id=? AND agent_id=?').run(data.status, ts, id, req.agent.id);
  } else if (action === 'transfer' && data?.to_user_id) {
    for (const id of ids) {
      const lead = await db.prepare('SELECT * FROM leads WHERE id=?').get(id);
      if (lead) {
        await db.prepare('UPDATE leads SET owner_id=?, updated_at=? WHERE id=?').run(data.to_user_id, ts, id);
        await db.prepare('INSERT INTO crm_transfers (id,entity_type,entity_id,from_user_id,to_user_id,reason,notes,performed_by,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
          uid(), 'lead', id, lead.owner_id, data.to_user_id, data.reason || null, data.notes || null, req.agent.id, req.agent.id, ts
        );
        notifyAgent(data.to_user_id, { title: 'Lead transferred to you', body: `Lead "${lead.name}" has been transferred to you`, entity_type: 'lead', entity_id: id });
      }
    }
  }
  crmBroadcast('leads_bulk_updated', { action, ids });
  res.json({ success: true, affected: ids.length });
});

// ═══════════════════════════════════════════════════════════════════════
// ── DEALS ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/deals', auth, async (req, res) => {
  const { stage, owner, team, q, sort, order } = req.query;
  let where = 'd.agent_id=?'; const params = [req.agent.id];
  if (stage) { where += ' AND d.stage=?'; params.push(stage); }
  if (owner) { where += ' AND d.owner_id=?'; params.push(owner); }
  if (team) { where += ' AND d.team_id=?'; params.push(team); }
  if (q) { where += ' AND (d.title LIKE ? OR d.product LIKE ?)'; const lq = `%${q}%`; params.push(lq, lq); }
  const sortCol = { value: 'd.value', probability: 'd.probability', created: 'd.created_at', close: 'd.expected_close', updated: 'd.updated_at', title: 'd.title' }[sort] || 'd.updated_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';
  const deals = await db.prepare(`
    SELECT d.*, c.name as contact_name, a.name as owner_name, co.name as company_name, t.name as team_name
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    LEFT JOIN agents a ON d.owner_id = a.id
    LEFT JOIN companies co ON d.company_id = co.id
    LEFT JOIN teams t ON d.team_id = t.id
    WHERE ${where} ORDER BY ${sortCol} ${sortDir}
  `).all(...params);
  for (const d of deals) d.custom_fields = parseJson(d.custom_fields, {});
  res.json({ deals });
});

router.get('/deals/:id', auth, async (req, res) => {
  const d = await db.prepare(`
    SELECT d.*, c.name as contact_name, a.name as owner_name, co.name as company_name
    FROM deals d LEFT JOIN contacts c ON d.contact_id=c.id LEFT JOIN agents a ON d.owner_id=a.id LEFT JOIN companies co ON d.company_id=co.id
    WHERE d.id=?
  `).get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  d.custom_fields = parseJson(d.custom_fields, {});
  const activities = await db.prepare('SELECT * FROM crm_activities WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC LIMIT 50').all('deal', d.id);
  for (const a of activities) a.metadata = parseJson(a.metadata, {});
  const tasks = await db.prepare('SELECT * FROM tasks WHERE related_type=? AND related_id=? ORDER BY due_date ASC').all('deal', d.id);
  const meetings = await db.prepare('SELECT * FROM meetings WHERE related_type=? AND related_id=? ORDER BY start_time DESC').all('deal', d.id);
  for (const m of meetings) m.attendees = parseJson(m.attendees, []);
  res.json({ deal: d, activities, tasks, meetings });
});

router.post('/deals', auth, async (req, res) => {
  const { title, value = 0, currency = 'USD', stage = 'Open', probability = 20, contact_id, company_id, owner_id, team_id, lead_id, product, expected_close, proposal_date, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uid();
  const ts = now();
  const weighted = value * (probability / 100);
  await db.prepare('INSERT INTO deals (id,title,value,weighted_value,currency,stage,probability,contact_id,company_id,owner_id,team_id,lead_id,product,expected_close,proposal_date,notes,custom_fields,agent_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, title, value, weighted, currency, stage, probability, contact_id || null, company_id || null, owner_id || req.agent.id, team_id || null, lead_id || null, product || null, expected_close || null, proposal_date || null, notes || null, '{}', req.agent.id, ts, ts
  );
  const deal = await db.prepare('SELECT * FROM deals WHERE id=?').get(id);
  await logActivity('deal_created', `Deal "${title}" created`, 'deal', id, req.agent.id, req.agent.id, { title, value, stage });
  crmBroadcast('deal_created', { deal });
  if (owner_id && owner_id !== req.agent.id) {
    notifyAgent(owner_id, { title: 'New deal assigned', body: `Deal "${title}" worth ${currency} ${value} assigned to you`, entity_type: 'deal', entity_id: id });
  }
  res.status(201).json({ deal });
});

router.patch('/deals/:id', auth, async (req, res) => {
  const d = await db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  const fields = ['title', 'value', 'currency', 'stage', 'probability', 'contact_id', 'company_id', 'owner_id', 'team_id', 'lead_id', 'product', 'expected_close', 'proposal_date', 'win_reason', 'lost_reason', 'notes'];
  const updates = { updated_at: now() };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.custom_fields !== undefined) updates.custom_fields = JSON.stringify(req.body.custom_fields);
  // Auto-compute weighted value
  const val = updates.value !== undefined ? updates.value : d.value;
  const prob = updates.probability !== undefined ? updates.probability : d.probability;
  updates.weighted_value = val * (prob / 100);
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE deals SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updated = await db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  // Log stage change
  if (req.body.stage && req.body.stage !== d.stage) {
    await logActivity('deal_stage_changed', `Deal "${d.title}" moved to ${req.body.stage}`, 'deal', d.id, req.agent.id, req.agent.id, { from: d.stage, to: req.body.stage });
    // Handle Won → create customer
    if (req.body.stage === 'Won') {
      await logActivity('deal_won', `Deal "${d.title}" won!`, 'deal', d.id, req.agent.id, req.agent.id, { value: d.value, reason: req.body.win_reason });
    }
    if (req.body.stage === 'Lost') {
      await logActivity('deal_lost', `Deal "${d.title}" lost`, 'deal', d.id, req.agent.id, req.agent.id, { reason: req.body.lost_reason });
    }
  }
  // Log owner transfer
  if (req.body.owner_id && req.body.owner_id !== d.owner_id) {
    await logActivity('deal_transferred', `Deal "${d.title}" transferred`, 'deal', d.id, req.agent.id, req.agent.id, { from_owner: d.owner_id, to_owner: req.body.owner_id });
    notifyAgent(req.body.owner_id, { title: 'Deal transferred to you', body: `Deal "${d.title}" has been transferred to you`, entity_type: 'deal', entity_id: d.id });
  }
  crmBroadcast('deal_updated', { deal: updated });
  res.json({ deal: updated });
});

router.delete('/deals/:id', auth, async (req, res) => {
  const d = await db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  await db.prepare('DELETE FROM deals WHERE id=?').run(req.params.id);
  await logActivity('deal_deleted', `Deal "${d.title}" deleted`, 'deal', d.id, req.agent.id, req.agent.id);
  crmBroadcast('deal_deleted', { id: req.params.id });
  res.json({ success: true });
});

// ── Deal: convert won deal to customer ──
router.post('/deals/:id/convert-customer', auth, async (req, res) => {
  const d = await db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Deal not found' });
  const ts = now();
  const custId = uid();
  const contact = d.contact_id ? await db.prepare('SELECT * FROM contacts WHERE id=?').get(d.contact_id) : null;
  await db.prepare('INSERT INTO crm_customers (id,name,email,phone,company,company_id,contact_id,deal_id,lead_id,owner_id,team_id,status,type,contract_value,notes,agent_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    custId, contact?.name || d.title, contact?.email, contact?.phone, contact?.company, d.company_id, d.contact_id, d.id, d.lead_id, d.owner_id, d.team_id, 'active', 'customer', d.value, d.notes, req.agent.id, ts, ts
  );
  await logActivity('customer_created', `Customer created from deal "${d.title}"`, 'customer', custId, req.agent.id, req.agent.id, { deal_id: d.id });
  crmBroadcast('customer_created', { customer_id: custId, deal_id: d.id });
  // Notify support/account manager
  if (d.owner_id && d.owner_id !== req.agent.id) {
    notifyAgent(d.owner_id, { title: 'Customer handover', body: `Deal "${d.title}" converted to customer. Welcome notification scheduled.`, entity_type: 'customer', entity_id: custId });
  }
  res.json({ success: true, customer_id: custId });
});

// ── Bulk deal operations ──
router.post('/deals/bulk', auth, async (req, res) => {
  const { action, ids, data } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'ids required' });
  const ts = now();
  if (action === 'delete') {
    for (const id of ids) await db.prepare('DELETE FROM deals WHERE id=? AND agent_id=?').run(id, req.agent.id);
  } else if (action === 'assign' && data?.owner_id) {
    for (const id of ids) await db.prepare('UPDATE deals SET owner_id=?, updated_at=? WHERE id=? AND agent_id=?').run(data.owner_id, ts, id, req.agent.id);
  } else if (action === 'stage' && data?.stage) {
    for (const id of ids) await db.prepare('UPDATE deals SET stage=?, updated_at=? WHERE id=? AND agent_id=?').run(data.stage, ts, id, req.agent.id);
  } else if (action === 'transfer' && data?.to_user_id) {
    for (const id of ids) {
      const deal = await db.prepare('SELECT * FROM deals WHERE id=?').get(id);
      if (deal) {
        await db.prepare('UPDATE deals SET owner_id=?, updated_at=? WHERE id=?').run(data.to_user_id, ts, id);
        await db.prepare('INSERT INTO crm_transfers (id,entity_type,entity_id,from_user_id,to_user_id,reason,notes,performed_by,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
          uid(), 'deal', id, deal.owner_id, data.to_user_id, data.reason || null, data.notes || null, req.agent.id, req.agent.id, ts
        );
        notifyAgent(data.to_user_id, { title: 'Deal transferred to you', body: `Deal "${deal.title}" has been transferred to you`, entity_type: 'deal', entity_id: id });
      }
    }
  }
  crmBroadcast('deals_bulk_updated', { action, ids });
  res.json({ success: true, affected: ids.length });
});

// ═══════════════════════════════════════════════════════════════════════
// ── TASKS & ACTIVITIES ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/tasks', auth, async (req, res) => {
  const { status, assignee, type, priority, related_type, related_id, overdue, q } = req.query;
  let where = 't.agent_id=?'; const params = [req.agent.id];
  if (status) { where += ' AND t.status=?'; params.push(status); }
  if (assignee) { where += ' AND t.assignee_id=?'; params.push(assignee); }
  if (type) { where += ' AND t.type=?'; params.push(type); }
  if (priority) { where += ' AND t.priority=?'; params.push(priority); }
  if (related_type) { where += ' AND t.related_type=?'; params.push(related_type); }
  if (related_id) { where += ' AND t.related_id=?'; params.push(related_id); }
  if (overdue === 'true') { where += ' AND t.status!=? AND t.due_date<? AND t.due_date IS NOT NULL'; params.push('done', now()); }
  if (q) { where += ' AND (t.title LIKE ? OR t.description LIKE ?)'; const lq = `%${q}%`; params.push(lq, lq); }
  const tasks = await db.prepare(`
    SELECT t.*, a.name as assignee_name, ct.name as contact_name FROM tasks t
    LEFT JOIN agents a ON t.assignee_id = a.id
    LEFT JOIN contacts ct ON t.contact_id = ct.id
    WHERE ${where} ORDER BY CASE WHEN t.status='done' THEN 1 ELSE 0 END, t.due_date ASC
  `).all(...params);
  res.json({ tasks });
});

router.get('/tasks/:id', auth, async (req, res) => {
  const t = await db.prepare('SELECT t.*, a.name as assignee_name FROM tasks t LEFT JOIN agents a ON t.assignee_id=a.id WHERE t.id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const activities = await db.prepare('SELECT * FROM crm_activities WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC LIMIT 20').all('task', t.id);
  for (const a of activities) a.metadata = parseJson(a.metadata, {});
  res.json({ task: t, activities });
});

router.post('/tasks', auth, async (req, res) => {
  const { title, description, type = 'task', due_date, priority = 'medium', status = 'todo', assignee_id, contact_id, related_type, related_id, recurring } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const id = uid();
  const ts = now();
  await db.prepare('INSERT INTO tasks (id,title,description,type,due_date,priority,status,assignee_id,contact_id,related_type,related_id,recurring,created_at,updated_at,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, title, description || null, type, due_date || null, priority, status, assignee_id || req.agent.id, contact_id || null, related_type || null, related_id || null, recurring || null, ts, ts, req.agent.id
  );
  const task = await db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  await logActivity('task_created', `Task "${title}" created`, 'task', id, req.agent.id, req.agent.id, { type, priority, related_type, related_id });
  crmBroadcast('task_created', { task });
  if (assignee_id && assignee_id !== req.agent.id) {
    notifyAgent(assignee_id, { title: 'New task assigned', body: `Task "${title}" has been assigned to you`, entity_type: 'task', entity_id: id });
  }
  res.status(201).json({ task });
});

router.patch('/tasks/:id', auth, async (req, res) => {
  const t = await db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const fields = ['title', 'description', 'type', 'due_date', 'priority', 'status', 'assignee_id', 'contact_id', 'related_type', 'related_id', 'recurring'];
  const updates = { updated_at: now() };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE tasks SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updated = await db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (req.body.status && req.body.status !== t.status) {
    await logActivity('task_status_changed', `Task "${t.title}" → ${req.body.status}`, 'task', t.id, req.agent.id, req.agent.id, { from: t.status, to: req.body.status });
  }
  if (req.body.assignee_id && req.body.assignee_id !== t.assignee_id) {
    notifyAgent(req.body.assignee_id, { title: 'Task assigned to you', body: `Task "${t.title}" has been assigned to you`, entity_type: 'task', entity_id: t.id });
  }
  crmBroadcast('task_updated', { task: updated });
  res.json({ task: updated });
});

router.delete('/tasks/:id', auth, async (req, res) => {
  const t = await db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  await db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  await logActivity('task_deleted', `Task "${t.title}" deleted`, 'task', t.id, req.agent.id, req.agent.id);
  crmBroadcast('task_deleted', { id: req.params.id });
  res.json({ success: true });
});

// ── Bulk task operations ──
router.post('/tasks/bulk', auth, async (req, res) => {
  const { action, ids, data } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'ids required' });
  const ts = now();
  if (action === 'delete') {
    for (const id of ids) await db.prepare('DELETE FROM tasks WHERE id=? AND agent_id=?').run(id, req.agent.id);
  } else if (action === 'assign' && data?.assignee_id) {
    for (const id of ids) await db.prepare('UPDATE tasks SET assignee_id=?, updated_at=? WHERE id=? AND agent_id=?').run(data.assignee_id, ts, id, req.agent.id);
  } else if (action === 'status' && data?.status) {
    for (const id of ids) await db.prepare('UPDATE tasks SET status=?, updated_at=? WHERE id=? AND agent_id=?').run(data.status, ts, id, req.agent.id);
  }
  crmBroadcast('tasks_bulk_updated', { action, ids });
  res.json({ success: true, affected: ids.length });
});

// ═══════════════════════════════════════════════════════════════════════
// ── MEETINGS ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/meetings', auth, async (req, res) => {
  const { status, type, host, contact, q } = req.query;
  let where = 'm.agent_id=?'; const params = [req.agent.id];
  if (status) { where += ' AND m.status=?'; params.push(status); }
  if (type) { where += ' AND m.type=?'; params.push(type); }
  if (host) { where += ' AND m.host_id=?'; params.push(host); }
  if (contact) { where += ' AND m.contact_id=?'; params.push(contact); }
  if (q) { where += ' AND (m.title LIKE ? OR m.description LIKE ?)'; const lq = `%${q}%`; params.push(lq, lq); }
  const meetings = await db.prepare(`
    SELECT m.*, h.name as host_name, ct.name as contact_name, co.name as company_name FROM meetings m
    LEFT JOIN agents h ON m.host_id = h.id
    LEFT JOIN contacts ct ON m.contact_id = ct.id
    LEFT JOIN companies co ON m.company_id = co.id
    WHERE ${where} ORDER BY m.start_time DESC
  `).all(...params);
  for (const m of meetings) m.attendees = parseJson(m.attendees, []);
  res.json({ meetings });
});

router.get('/meetings/:id', auth, async (req, res) => {
  const m = await db.prepare('SELECT m.*, h.name as host_name, ct.name as contact_name FROM meetings m LEFT JOIN agents h ON m.host_id=h.id LEFT JOIN contacts ct ON m.contact_id=ct.id WHERE m.id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  m.attendees = parseJson(m.attendees, []);
  const activities = await db.prepare('SELECT * FROM crm_activities WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC LIMIT 20').all('meeting', m.id);
  for (const a of activities) a.metadata = parseJson(a.metadata, {});
  res.json({ meeting: m, activities });
});

router.post('/meetings', auth, async (req, res) => {
  const { title, type = 'meeting', description, start_time, end_time, location, meeting_link, host_id, attendees = [], agenda, status = 'scheduled', contact_id, company_id, related_type, related_id } = req.body;
  if (!title || !start_time) return res.status(400).json({ error: 'title and start_time required' });
  const id = uid();
  await db.prepare('INSERT INTO meetings (id,title,type,description,start_time,end_time,location,meeting_link,host_id,attendees,agenda,status,contact_id,company_id,related_type,related_id,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, title, type, description || null, start_time, end_time || null, location || null, meeting_link || null, host_id || req.agent.id, JSON.stringify(attendees), agenda || null, status, contact_id || null, company_id || null, related_type || null, related_id || null, req.agent.id
  );
  const m = await db.prepare('SELECT * FROM meetings WHERE id=?').get(id);
  if (m) m.attendees = parseJson(m.attendees, []);
  await logActivity('meeting_created', `Meeting "${title}" scheduled`, 'meeting', id, req.agent.id, req.agent.id, { type, start_time, contact_id });
  crmBroadcast('meeting_created', { meeting: m });
  // Notify attendees
  for (const att of attendees) {
    if (att && att !== req.agent.id) {
      notifyAgent(att, { title: 'Meeting invitation', body: `You're invited to "${title}" on ${start_time}`, entity_type: 'meeting', entity_id: id });
    }
  }
  res.status(201).json({ meeting: m });
});

router.patch('/meetings/:id', auth, async (req, res) => {
  const m = await db.prepare('SELECT * FROM meetings WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  const fields = ['title', 'type', 'description', 'start_time', 'end_time', 'location', 'meeting_link', 'host_id', 'agenda', 'outcome', 'status', 'contact_id', 'company_id', 'related_type', 'related_id'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.attendees !== undefined) updates.attendees = JSON.stringify(req.body.attendees);
  if (!Object.keys(updates).length) { m.attendees = parseJson(m.attendees, []); return res.json({ meeting: m }); }
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE meetings SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updated = await db.prepare('SELECT * FROM meetings WHERE id=?').get(req.params.id);
  if (updated) updated.attendees = parseJson(updated.attendees, []);
  if (req.body.outcome) {
    await logActivity('meeting_completed', `Meeting "${m.title}" completed`, 'meeting', m.id, req.agent.id, req.agent.id, { outcome: req.body.outcome });
  }
  crmBroadcast('meeting_updated', { meeting: updated });
  res.json({ meeting: updated });
});

router.delete('/meetings/:id', auth, async (req, res) => {
  const m = await db.prepare('SELECT * FROM meetings WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  await db.prepare('DELETE FROM meetings WHERE id=?').run(req.params.id);
  await logActivity('meeting_deleted', `Meeting "${m.title}" deleted`, 'meeting', m.id, req.agent.id, req.agent.id);
  crmBroadcast('meeting_deleted', { id: req.params.id });
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════
// ── CUSTOMERS ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/customers', auth, async (req, res) => {
  const { status, owner, type, q } = req.query;
  let where = 'cu.agent_id=?'; const params = [req.agent.id];
  if (status) { where += ' AND cu.status=?'; params.push(status); }
  if (owner) { where += ' AND cu.owner_id=?'; params.push(owner); }
  if (type) { where += ' AND cu.type=?'; params.push(type); }
  if (q) { where += ' AND (cu.name LIKE ? OR cu.email LIKE ? OR cu.company LIKE ?)'; const lq = `%${q}%`; params.push(lq, lq, lq); }
  const customers = await db.prepare(`
    SELECT cu.*, a.name as owner_name, t.name as team_name FROM crm_customers cu
    LEFT JOIN agents a ON cu.owner_id = a.id
    LEFT JOIN teams t ON cu.team_id = t.id
    WHERE ${where} ORDER BY cu.updated_at DESC
  `).all(...params);
  for (const c of customers) { c.tags = parseJson(c.tags, []); c.custom_fields = parseJson(c.custom_fields, {}); }
  res.json({ customers });
});

router.get('/customers/:id', auth, async (req, res) => {
  const cu = await db.prepare('SELECT cu.*, a.name as owner_name FROM crm_customers cu LEFT JOIN agents a ON cu.owner_id=a.id WHERE cu.id=?').get(req.params.id);
  if (!cu) return res.status(404).json({ error: 'Not found' });
  cu.tags = parseJson(cu.tags, []); cu.custom_fields = parseJson(cu.custom_fields, {});
  const deals = cu.deal_id ? [await db.prepare('SELECT * FROM deals WHERE id=?').get(cu.deal_id)] : await db.prepare('SELECT * FROM deals WHERE contact_id=? ORDER BY updated_at DESC').all(cu.contact_id);
  const tasks = await db.prepare('SELECT * FROM tasks WHERE related_type=? AND related_id=? ORDER BY due_date ASC').all('customer', cu.id);
  const activities = await db.prepare('SELECT * FROM crm_activities WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC LIMIT 50').all('customer', cu.id);
  for (const a of activities) a.metadata = parseJson(a.metadata, {});
  res.json({ customer: cu, deals: deals.filter(Boolean), tasks, activities });
});

router.post('/customers', auth, async (req, res) => {
  const { name, email, phone, company, company_id, contact_id, deal_id, lead_id, owner_id, team_id, status = 'active', type = 'customer', renewal_date, contract_value = 0, notes, tags = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uid();
  const ts = now();
  await db.prepare('INSERT INTO crm_customers (id,name,email,phone,company,company_id,contact_id,deal_id,lead_id,owner_id,team_id,status,type,renewal_date,contract_value,notes,tags,custom_fields,agent_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, name, email || null, phone || null, company || null, company_id || null, contact_id || null, deal_id || null, lead_id || null, owner_id || req.agent.id, team_id || null, status, type, renewal_date || null, contract_value, notes || null, JSON.stringify(tags), '{}', req.agent.id, ts, ts
  );
  const customer = await db.prepare('SELECT * FROM crm_customers WHERE id=?').get(id);
  customer.tags = parseJson(customer.tags, []);
  await logActivity('customer_created', `Customer "${name}" created`, 'customer', id, req.agent.id, req.agent.id);
  crmBroadcast('customer_created', { customer });
  res.status(201).json({ customer });
});

router.patch('/customers/:id', auth, async (req, res) => {
  const cu = await db.prepare('SELECT * FROM crm_customers WHERE id=?').get(req.params.id);
  if (!cu) return res.status(404).json({ error: 'Not found' });
  const fields = ['name', 'email', 'phone', 'company', 'company_id', 'contact_id', 'owner_id', 'team_id', 'status', 'type', 'renewal_date', 'contract_value', 'notes'];
  const updates = { updated_at: now() };
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (req.body.tags !== undefined) updates.tags = JSON.stringify(req.body.tags);
  if (req.body.custom_fields !== undefined) updates.custom_fields = JSON.stringify(req.body.custom_fields);
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE crm_customers SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updated = await db.prepare('SELECT * FROM crm_customers WHERE id=?').get(req.params.id);
  updated.tags = parseJson(updated.tags, []);
  if (req.body.owner_id && req.body.owner_id !== cu.owner_id) {
    await db.prepare('INSERT INTO crm_transfers (id,entity_type,entity_id,from_user_id,to_user_id,reason,performed_by,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
      uid(), 'customer', cu.id, cu.owner_id, req.body.owner_id, req.body.transfer_reason || 'Customer handover', req.agent.id, req.agent.id, now()
    );
    notifyAgent(req.body.owner_id, { title: 'Customer transferred to you', body: `Customer "${cu.name}" has been transferred to you`, entity_type: 'customer', entity_id: cu.id });
  }
  crmBroadcast('customer_updated', { customer: updated });
  res.json({ customer: updated });
});

router.delete('/customers/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM crm_customers WHERE id=?').run(req.params.id);
  crmBroadcast('customer_deleted', { id: req.params.id });
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════
// ── ACTIVITIES ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/activities', auth, async (req, res) => {
  const { entity_type, entity_id, type, limit = 50 } = req.query;
  let where = 'a.agent_id=?'; const params = [req.agent.id];
  if (entity_type) { where += ' AND a.entity_type=?'; params.push(entity_type); }
  if (entity_id) { where += ' AND a.entity_id=?'; params.push(entity_id); }
  if (type) { where += ' AND a.type=?'; params.push(type); }
  const lim = Math.min(200, Math.max(1, parseInt(limit) || 50));
  const activities = await db.prepare(`
    SELECT a.*, ag.name as performer_name FROM crm_activities a
    LEFT JOIN agents ag ON a.performer_id = ag.id
    WHERE ${where} ORDER BY a.created_at DESC LIMIT ?
  `).all(...params, lim);
  for (const a of activities) a.metadata = parseJson(a.metadata, {});
  res.json({ activities });
});

router.post('/activities', auth, async (req, res) => {
  const { type, title, description, entity_type, entity_id, metadata } = req.body;
  if (!type || !title) return res.status(400).json({ error: 'type and title required' });
  const id = uid();
  await db.prepare('INSERT INTO crm_activities (id,type,title,description,entity_type,entity_id,performer_id,metadata,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(
    id, type, title, description || null, entity_type || null, entity_id || null, req.agent.id, metadata ? JSON.stringify(metadata) : null, req.agent.id, now()
  );
  const activity = await db.prepare('SELECT * FROM crm_activities WHERE id=?').get(id);
  activity.metadata = parseJson(activity.metadata, {});
  crmBroadcast('activity_created', { activity });
  res.status(201).json({ activity });
});

// ═══════════════════════════════════════════════════════════════════════
// ── REMINDERS ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/reminders', auth, async (req, res) => {
  const { status, entity_type, assignee } = req.query;
  let where = 'r.agent_id=?'; const params = [req.agent.id];
  if (status) { where += ' AND r.status=?'; params.push(status); }
  if (entity_type) { where += ' AND r.entity_type=?'; params.push(entity_type); }
  if (assignee) { where += ' AND r.assignee_id=?'; params.push(assignee); }
  const reminders = await db.prepare(`
    SELECT r.*, a.name as assignee_name FROM crm_reminders r
    LEFT JOIN agents a ON r.assignee_id = a.id
    WHERE ${where} ORDER BY r.remind_at ASC
  `).all(...params);
  res.json({ reminders });
});

router.post('/reminders', auth, async (req, res) => {
  const { title, description, remind_at, channel = 'in_app', entity_type, entity_id, assignee_id, recurring } = req.body;
  if (!title || !remind_at) return res.status(400).json({ error: 'title and remind_at required' });
  const id = uid();
  await db.prepare('INSERT INTO crm_reminders (id,title,description,remind_at,channel,entity_type,entity_id,assignee_id,recurring,status,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, title, description || null, remind_at, channel, entity_type || null, entity_id || null, assignee_id || req.agent.id, recurring || null, 'pending', req.agent.id, now()
  );
  const reminder = await db.prepare('SELECT * FROM crm_reminders WHERE id=?').get(id);
  res.status(201).json({ reminder });
});

router.patch('/reminders/:id', auth, async (req, res) => {
  const r = await db.prepare('SELECT * FROM crm_reminders WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const fields = ['title', 'description', 'remind_at', 'channel', 'entity_type', 'entity_id', 'assignee_id', 'recurring', 'status'];
  const updates = {};
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  if (!Object.keys(updates).length) return res.json({ reminder: r });
  const sets = Object.keys(updates).map(k => `${k}=?`).join(',');
  await db.prepare(`UPDATE crm_reminders SET ${sets} WHERE id=?`).run(...Object.values(updates), req.params.id);
  const updated = await db.prepare('SELECT * FROM crm_reminders WHERE id=?').get(req.params.id);
  res.json({ reminder: updated });
});

router.delete('/reminders/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM crm_reminders WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════
// ── TRANSFERS ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/transfers', auth, async (req, res) => {
  const { entity_type, entity_id } = req.query;
  let where = 'tr.agent_id=?'; const params = [req.agent.id];
  if (entity_type) { where += ' AND tr.entity_type=?'; params.push(entity_type); }
  if (entity_id) { where += ' AND tr.entity_id=?'; params.push(entity_id); }
  const transfers = await db.prepare(`
    SELECT tr.*, f.name as from_user_name, t.name as to_user_name, p.name as performed_by_name
    FROM crm_transfers tr
    LEFT JOIN agents f ON tr.from_user_id = f.id
    LEFT JOIN agents t ON tr.to_user_id = t.id
    LEFT JOIN agents p ON tr.performed_by = p.id
    WHERE ${where} ORDER BY tr.created_at DESC
  `).all(...params);
  res.json({ transfers });
});

router.post('/transfers', auth, async (req, res) => {
  const { entity_type, entity_id, to_user_id, to_team_id, reason, notes } = req.body;
  if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type and entity_id required' });
  if (!to_user_id && !to_team_id) return res.status(400).json({ error: 'to_user_id or to_team_id required' });

  const ts = now();
  const id = uid();
  let fromUserId = null, fromTeamId = null, entityName = '';

  // Lookup and update the entity
  if (entity_type === 'lead') {
    const e = await db.prepare('SELECT * FROM leads WHERE id=?').get(entity_id);
    if (!e) return res.status(404).json({ error: 'Lead not found' });
    fromUserId = e.owner_id; fromTeamId = e.team_id; entityName = e.name;
    const upd = {};
    if (to_user_id) upd.owner_id = to_user_id;
    if (to_team_id) upd.team_id = to_team_id;
    upd.updated_at = ts;
    const sets = Object.keys(upd).map(k => `${k}=?`).join(',');
    await db.prepare(`UPDATE leads SET ${sets} WHERE id=?`).run(...Object.values(upd), entity_id);
  } else if (entity_type === 'deal') {
    const e = await db.prepare('SELECT * FROM deals WHERE id=?').get(entity_id);
    if (!e) return res.status(404).json({ error: 'Deal not found' });
    fromUserId = e.owner_id; fromTeamId = e.team_id; entityName = e.title;
    const upd = {};
    if (to_user_id) upd.owner_id = to_user_id;
    if (to_team_id) upd.team_id = to_team_id;
    upd.updated_at = ts;
    const sets = Object.keys(upd).map(k => `${k}=?`).join(',');
    await db.prepare(`UPDATE deals SET ${sets} WHERE id=?`).run(...Object.values(upd), entity_id);
  } else if (entity_type === 'customer') {
    const e = await db.prepare('SELECT * FROM crm_customers WHERE id=?').get(entity_id);
    if (!e) return res.status(404).json({ error: 'Customer not found' });
    fromUserId = e.owner_id; fromTeamId = e.team_id; entityName = e.name;
    const upd = {};
    if (to_user_id) upd.owner_id = to_user_id;
    if (to_team_id) upd.team_id = to_team_id;
    upd.updated_at = ts;
    const sets = Object.keys(upd).map(k => `${k}=?`).join(',');
    await db.prepare(`UPDATE crm_customers SET ${sets} WHERE id=?`).run(...Object.values(upd), entity_id);
  } else if (entity_type === 'task') {
    const e = await db.prepare('SELECT * FROM tasks WHERE id=?').get(entity_id);
    if (!e) return res.status(404).json({ error: 'Task not found' });
    fromUserId = e.assignee_id; entityName = e.title;
    if (to_user_id) await db.prepare('UPDATE tasks SET assignee_id=?, updated_at=? WHERE id=?').run(to_user_id, ts, entity_id);
  }

  // Log the transfer
  await db.prepare('INSERT INTO crm_transfers (id,entity_type,entity_id,from_user_id,to_user_id,from_team_id,to_team_id,reason,notes,performed_by,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
    id, entity_type, entity_id, fromUserId, to_user_id || null, fromTeamId, to_team_id || null, reason || null, notes || null, req.agent.id, req.agent.id, ts
  );

  await logActivity('transfer', `${entity_type} "${entityName}" transferred`, entity_type, entity_id, req.agent.id, req.agent.id, { from_user: fromUserId, to_user: to_user_id, to_team: to_team_id, reason });

  // Notify both old and new owners
  if (fromUserId && fromUserId !== req.agent.id) {
    notifyAgent(fromUserId, { title: `${entity_type} transferred away`, body: `${entity_type} "${entityName}" has been transferred from you`, entity_type, entity_id });
  }
  if (to_user_id && to_user_id !== req.agent.id) {
    notifyAgent(to_user_id, { title: `${entity_type} transferred to you`, body: `${entity_type} "${entityName}" has been transferred to you`, entity_type, entity_id });
  }

  crmBroadcast('transfer_completed', { entity_type, entity_id, from_user_id: fromUserId, to_user_id, to_team_id });
  res.json({ success: true, transfer_id: id });
});

// ═══════════════════════════════════════════════════════════════════════
// ── SEARCH (global CRM search) ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/search', auth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ results: [] });
  const lq = `%${q}%`;
  const aid = req.agent.id;
  const [leads, deals, tasks, customers, contacts] = await Promise.all([
    db.prepare('SELECT id, name, email, status, "lead" as result_type FROM leads WHERE agent_id=? AND (name LIKE ? OR email LIKE ? OR company LIKE ?) LIMIT 10').all(aid, lq, lq, lq),
    db.prepare('SELECT id, title as name, stage as status, "deal" as result_type FROM deals WHERE agent_id=? AND (title LIKE ? OR product LIKE ?) LIMIT 10').all(aid, lq, lq),
    db.prepare('SELECT id, title as name, status, "task" as result_type FROM tasks WHERE agent_id=? AND (title LIKE ? OR description LIKE ?) LIMIT 10').all(aid, lq, lq),
    db.prepare('SELECT id, name, email, status, "customer" as result_type FROM crm_customers WHERE agent_id=? AND (name LIKE ? OR email LIKE ? OR company LIKE ?) LIMIT 10').all(aid, lq, lq, lq),
    db.prepare('SELECT id, name, email, "contact" as result_type FROM contacts WHERE agent_id=? AND (name LIKE ? OR email LIKE ? OR company LIKE ?) LIMIT 10').all(aid, lq, lq, lq),
  ]);
  res.json({ results: [...leads, ...deals, ...tasks, ...customers, ...contacts] });
});

// ═══════════════════════════════════════════════════════════════════════
// ── EXPORT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════

router.get('/export/:entity', auth, async (req, res) => {
  const { entity } = req.params;
  const aid = req.agent.id;
  let rows = [];
  if (entity === 'leads') {
    rows = await db.prepare('SELECT name,email,phone,company,source,campaign,industry,status,priority,score,value,next_followup_date,created_at FROM leads WHERE agent_id=? ORDER BY created_at DESC').all(aid);
  } else if (entity === 'deals') {
    rows = await db.prepare('SELECT title,value,weighted_value,currency,stage,probability,product,expected_close,proposal_date,created_at FROM deals WHERE agent_id=? ORDER BY created_at DESC').all(aid);
  } else if (entity === 'tasks') {
    rows = await db.prepare('SELECT title,type,description,due_date,priority,status,recurring,created_at FROM tasks WHERE agent_id=? ORDER BY created_at DESC').all(aid);
  } else if (entity === 'customers') {
    rows = await db.prepare('SELECT name,email,phone,company,status,type,renewal_date,contract_value,created_at FROM crm_customers WHERE agent_id=? ORDER BY created_at DESC').all(aid);
  } else if (entity === 'meetings') {
    rows = await db.prepare('SELECT title,type,start_time,end_time,location,status,outcome,created_at FROM meetings WHERE agent_id=? ORDER BY created_at DESC').all(aid);
  } else {
    return res.status(400).json({ error: 'Invalid entity' });
  }
  if (!rows.length) return res.json({ csv: '', rows: [] });
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${(r[h] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${entity}_export.csv`);
  res.send(csv);
});

// ═══════════════════════════════════════════════════════════════════════
// ── SCHEDULE MODULE — inbox-channel-based meeting invitations ────────
// ═══════════════════════════════════════════════════════════════════════

// GET active inboxes (channels the agent can use to send invitations)
router.get('/schedule/channels', auth, async (req, res) => {
  let emailSvc = null;
  try { emailSvc = require('../services/emailService'); } catch {}
  const inboxes = await db.prepare('SELECT id, name, type, color, active, config FROM inboxes WHERE agent_id=? AND active=1 ORDER BY type, name').all(req.agent.id);
  const channels = inboxes.map(ib => {
    const cfg = ib.type === 'email' && emailSvc?.parseConfig ? emailSvc.parseConfig(ib.config) : parseJson(ib.config, {});
    const ready = ib.type === 'email' ? !!(cfg.smtpHost && cfg.emailUser)
      : ib.type === 'whatsapp' ? !!(cfg.phoneNumberId && (cfg.apiKey || cfg.accessToken))
      : ib.type === 'sms' ? !!(cfg.apiKey || cfg.sid)
      : ['live', 'api'].includes(ib.type);
    return { id: ib.id, name: ib.name, type: ib.type, color: ib.color, ready };
  });
  res.json({ channels });
});

// POST send meeting invitation via selected channels
router.post('/meetings/:id/invite', auth, async (req, res) => {
  const m = await db.prepare('SELECT * FROM meetings WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Meeting not found' });

  const { channels, recipient_name, recipient_email, recipient_phone, custom_message } = req.body;
  if (!channels || !channels.length) return res.status(400).json({ error: 'Select at least one channel' });

  m.attendees = parseJson(m.attendees, []);
  const ts = now();
  const results = [];

  // Build invitation message
  const startFmt = m.start_time ? new Date(m.start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD';
  const endFmt = m.end_time ? new Date(m.end_time).toLocaleString('en-IN', { timeStyle: 'short' }) : '';
  const durStr = endFmt ? ` — ${endFmt}` : '';
  const subject = `Meeting Invitation: ${m.title}`;
  const textBody = [
    custom_message || `You are invited to a meeting.`,
    '',
    `📅 Meeting: ${m.title}`,
    `🕐 When: ${startFmt}${durStr}`,
    m.location ? `📍 Where: ${m.location}` : '',
    m.meeting_link ? `🔗 Link: ${m.meeting_link}` : '',
    m.agenda ? `\n📝 Agenda:\n${m.agenda}` : '',
    '',
    `— Sent via SupportDesk CRM`
  ].filter(Boolean).join('\n');

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#4c82fb;">${m.title}</h2>
      ${custom_message ? `<p>${custom_message}</p>` : '<p>You are invited to a meeting.</p>'}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600;width:100px;">When</td><td style="padding:8px 12px;">${startFmt}${durStr}</td></tr>
        ${m.location ? `<tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600;">Where</td><td style="padding:8px 12px;">${m.location}</td></tr>` : ''}
        ${m.meeting_link ? `<tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600;">Link</td><td style="padding:8px 12px;"><a href="${m.meeting_link}">${m.meeting_link}</a></td></tr>` : ''}
        ${m.type ? `<tr><td style="padding:8px 12px;background:#f5f7fa;font-weight:600;">Type</td><td style="padding:8px 12px;">${m.type}</td></tr>` : ''}
      </table>
      ${m.agenda ? `<h3>Agenda</h3><p style="white-space:pre-wrap;">${m.agenda}</p>` : ''}
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
      <p style="color:#888;font-size:12px;">Sent via SupportDesk CRM</p>
    </div>`;

  for (const ch of channels) {
    const invId = uid();
    try {
      if (ch.type === 'email' && recipient_email) {
        // Send via email service
        let emailSvc;
        try { emailSvc = require('../services/emailService'); } catch { emailSvc = null; }
        if (emailSvc && emailSvc.sendEmail) {
          await emailSvc.sendEmail({ inboxId: ch.id, to: recipient_email, subject, text: textBody, html: htmlBody });
        }
        await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,recipient_email,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
          invId, m.id, 'email', ch.id, recipient_name || null, recipient_email, subject, textBody, 'sent', ts, req.agent.id, ts
        );
        results.push({ channel: 'email', inbox: ch.name, status: 'sent', id: invId });

      } else if (ch.type === 'whatsapp' && recipient_phone) {
        // Send via WhatsApp service
        let waSvc;
        try { waSvc = require('../services/whatsappService'); } catch { waSvc = null; }
        if (waSvc && waSvc.sendWhatsAppMessage) {
          await waSvc.sendWhatsAppMessage({ inboxId: ch.id, to: recipient_phone, text: textBody });
        }
        await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,recipient_phone,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
          invId, m.id, 'whatsapp', ch.id, recipient_name || null, recipient_phone, subject, textBody, 'sent', ts, req.agent.id, ts
        );
        results.push({ channel: 'whatsapp', inbox: ch.name, status: 'sent', id: invId });

      } else if (ch.type === 'sms' && recipient_phone) {
        // SMS — log invitation (actual SMS sending depends on provider config)
        await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,recipient_phone,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
          invId, m.id, 'sms', ch.id, recipient_name || null, recipient_phone, subject, textBody, 'sent', ts, req.agent.id, ts
        );
        results.push({ channel: 'sms', inbox: ch.name, status: 'sent', id: invId });

      } else if (ch.type === 'live' || ch.type === 'api') {
        // In-app notification — broadcast
        await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
          invId, m.id, ch.type, ch.id, recipient_name || null, subject, textBody, 'sent', ts, req.agent.id, ts
        );
        crmBroadcast('meeting_invitation_sent', { meeting_id: m.id, channel: ch.type, recipient: recipient_name });
        results.push({ channel: ch.type, inbox: ch.name, status: 'sent', id: invId });

      } else {
        // Unsupported or missing recipient info
        await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,subject,body,status,error,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
          invId, m.id, ch.type, ch.id, recipient_name || null, subject, textBody, 'failed', 'Missing recipient info for ' + ch.type, req.agent.id, ts
        );
        results.push({ channel: ch.type, inbox: ch.name, status: 'failed', error: 'Missing recipient info' });
      }
    } catch (e) {
      await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,subject,body,status,error,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
        invId, m.id, ch.type, ch.id, recipient_name || null, subject, textBody, 'failed', e.message, req.agent.id, ts
      );
      results.push({ channel: ch.type, inbox: ch.name, status: 'failed', error: e.message });
    }
  }

  await logActivity('meeting_invitation_sent', `Invitation for "${m.title}" sent via ${results.filter(r => r.status === 'sent').map(r => r.channel).join(', ')}`, 'meeting', m.id, req.agent.id, req.agent.id, { channels: results });
  crmBroadcast('meeting_invited', { meeting_id: m.id, results });
  res.json({ success: true, results });
});

// POST send meeting reminder via channels
router.post('/meetings/:id/remind', auth, async (req, res) => {
  const m = await db.prepare('SELECT * FROM meetings WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Meeting not found' });
  if (m.status !== 'scheduled') return res.status(400).json({ error: 'Meeting is not scheduled' });

  const { channels, recipient_email, recipient_phone, recipient_name } = req.body;
  if (!channels || !channels.length) return res.status(400).json({ error: 'Select at least one channel' });

  const ts = now();
  const startFmt = m.start_time ? new Date(m.start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD';
  const subject = `Reminder: ${m.title}`;
  const textBody = [
    `⏰ This is a reminder for your upcoming meeting.`,
    '',
    `📅 Meeting: ${m.title}`,
    `🕐 When: ${startFmt}`,
    m.location ? `📍 Where: ${m.location}` : '',
    m.meeting_link ? `🔗 Link: ${m.meeting_link}` : '',
    '',
    `— Sent via SupportDesk CRM`
  ].filter(Boolean).join('\n');

  const results = [];
  for (const ch of channels) {
    const invId = uid();
    try {
      if (ch.type === 'email' && recipient_email) {
        let emailSvc;
        try { emailSvc = require('../services/emailService'); } catch { emailSvc = null; }
        if (emailSvc && emailSvc.sendEmail) {
          await emailSvc.sendEmail({ inboxId: ch.id, to: recipient_email, subject, text: textBody });
        }
        await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,recipient_email,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
          invId, m.id, 'email', ch.id, recipient_name || null, recipient_email, subject, textBody, 'sent', ts, req.agent.id, ts
        );
        results.push({ channel: 'email', status: 'sent', id: invId });
      } else if (ch.type === 'whatsapp' && recipient_phone) {
        let waSvc;
        try { waSvc = require('../services/whatsappService'); } catch { waSvc = null; }
        if (waSvc && waSvc.sendWhatsAppMessage) {
          await waSvc.sendWhatsAppMessage({ inboxId: ch.id, to: recipient_phone, text: textBody });
        }
        await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,recipient_phone,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
          invId, m.id, 'whatsapp', ch.id, recipient_name || null, recipient_phone, subject, textBody, 'sent', ts, req.agent.id, ts
        );
        results.push({ channel: 'whatsapp', status: 'sent', id: invId });
      } else if (ch.type === 'sms' && recipient_phone) {
        await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,recipient_phone,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
          invId, m.id, 'sms', ch.id, recipient_name || null, recipient_phone, subject, textBody, 'sent', ts, req.agent.id, ts
        );
        results.push({ channel: 'sms', status: 'sent', id: invId });
      } else {
        results.push({ channel: ch.type, status: 'skipped', error: 'Missing recipient info' });
      }
    } catch (e) {
      results.push({ channel: ch.type, status: 'failed', error: e.message });
    }
  }

  await logActivity('meeting_reminder_sent', `Reminder for "${m.title}" sent`, 'meeting', m.id, req.agent.id, req.agent.id, { channels: results });
  crmBroadcast('meeting_reminded', { meeting_id: m.id, results });
  res.json({ success: true, results });
});

// GET invitations for a meeting
router.get('/meetings/:id/invitations', auth, async (req, res) => {
  const invitations = await db.prepare('SELECT * FROM meeting_invitations WHERE meeting_id=? ORDER BY created_at DESC').all(req.params.id);
  res.json({ invitations });
});

// POST full schedule flow — create meeting + send invitations in one call
router.post('/schedule', auth, async (req, res) => {
  const { title, type = 'meeting', description, start_time, end_time, location, meeting_link, host_id, attendees = [], agenda, contact_id, company_id, related_type, related_id, invite_channels = [], recipient_name, recipient_email, recipient_phone, custom_message } = req.body;
  if (!title || !start_time) return res.status(400).json({ error: 'title and start_time required' });

  // 1. Create the meeting
  const meetingId = uid();
  const ts = now();
  await db.prepare('INSERT INTO meetings (id,title,type,description,start_time,end_time,location,meeting_link,host_id,attendees,agenda,status,contact_id,company_id,related_type,related_id,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    meetingId, title, type, description || null, start_time, end_time || null, location || null, meeting_link || null, host_id || req.agent.id, JSON.stringify(attendees), agenda || null, 'scheduled', contact_id || null, company_id || null, related_type || null, related_id || null, req.agent.id
  );
  const meeting = await db.prepare('SELECT * FROM meetings WHERE id=?').get(meetingId);
  if (meeting) meeting.attendees = parseJson(meeting.attendees, []);

  await logActivity('meeting_created', `Meeting "${title}" scheduled`, 'meeting', meetingId, req.agent.id, req.agent.id, { type, start_time });
  crmBroadcast('meeting_created', { meeting });

  // Notify attendees
  for (const att of attendees) {
    if (att && att !== req.agent.id) {
      notifyAgent(att, { title: 'Meeting invitation', body: `You're invited to "${title}" on ${start_time}`, entity_type: 'meeting', entity_id: meetingId });
    }
  }

  // 2. Send invitations if channels selected
  let inviteResults = [];
  if (invite_channels.length > 0 && (recipient_email || recipient_phone)) {
    try {
      // Simulate internal call to invite endpoint
      const startFmt = start_time ? new Date(start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD';
      const endFmt = end_time ? new Date(end_time).toLocaleString('en-IN', { timeStyle: 'short' }) : '';
      const durStr = endFmt ? ` — ${endFmt}` : '';
      const subject = `Meeting Invitation: ${title}`;
      const textBody = [
        custom_message || `You are invited to a meeting.`,
        '', `📅 Meeting: ${title}`, `🕐 When: ${startFmt}${durStr}`,
        location ? `📍 Where: ${location}` : '',
        meeting_link ? `🔗 Link: ${meeting_link}` : '',
        agenda ? `\n📝 Agenda:\n${agenda}` : '',
        '', `— Sent via SupportDesk CRM`
      ].filter(Boolean).join('\n');

      for (const ch of invite_channels) {
        const invId = uid();
        try {
          if (ch.type === 'email' && recipient_email) {
            let emailSvc;
            try { emailSvc = require('../services/emailService'); } catch { emailSvc = null; }
            if (emailSvc && emailSvc.sendEmail) await emailSvc.sendEmail({ inboxId: ch.id, to: recipient_email, subject, text: textBody });
            await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,recipient_email,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(invId, meetingId, 'email', ch.id, recipient_name || null, recipient_email, subject, textBody, 'sent', ts, req.agent.id, ts);
            inviteResults.push({ channel: 'email', status: 'sent' });
          } else if (ch.type === 'whatsapp' && recipient_phone) {
            let waSvc;
            try { waSvc = require('../services/whatsappService'); } catch { waSvc = null; }
            if (waSvc && waSvc.sendWhatsAppMessage) await waSvc.sendWhatsAppMessage({ inboxId: ch.id, to: recipient_phone, text: textBody });
            await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,recipient_phone,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(invId, meetingId, 'whatsapp', ch.id, recipient_name || null, recipient_phone, subject, textBody, 'sent', ts, req.agent.id, ts);
            inviteResults.push({ channel: 'whatsapp', status: 'sent' });
          } else if (ch.type === 'sms' && recipient_phone) {
            await db.prepare('INSERT INTO meeting_invitations (id,meeting_id,channel,inbox_id,recipient_name,recipient_phone,subject,body,status,sent_at,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(invId, meetingId, 'sms', ch.id, recipient_name || null, recipient_phone, subject, textBody, 'sent', ts, req.agent.id, ts);
            inviteResults.push({ channel: 'sms', status: 'sent' });
          } else {
            inviteResults.push({ channel: ch.type, status: 'skipped' });
          }
        } catch (e) { inviteResults.push({ channel: ch.type, status: 'failed', error: e.message }); }
      }
    } catch (e) { console.error('Schedule invite error:', e.message); }
  }

  // 3. Auto-create reminder if meeting is in the future
  if (start_time) {
    const mtDate = new Date(start_time);
    const reminderDate = new Date(mtDate.getTime() - 30 * 60000); // 30 min before
    if (reminderDate > new Date()) {
      await db.prepare('INSERT INTO crm_reminders (id,title,description,remind_at,channel,entity_type,entity_id,assignee_id,status,agent_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(
        uid(), `Reminder: ${title}`, `Your meeting "${title}" starts in 30 minutes`, reminderDate.toISOString().slice(0, 19).replace('T', ' '), 'in_app', 'meeting', meetingId, host_id || req.agent.id, 'pending', req.agent.id, ts
      );
    }
  }

  res.status(201).json({ meeting, invite_results: inviteResults });
});

module.exports = router;
