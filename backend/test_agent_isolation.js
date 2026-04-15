#!/usr/bin/env node
/**
 * Agent ID Isolation Test Suite
 * Tests that every major resource is properly scoped to the creating agent.
 */

const BASE = 'http://localhost:4002/api';

let passed = 0;
let failed = 0;
let tokenA, tokenB, agentAId, agentBId;

// ─── helpers ───────────────────────────────────────────────────────────────
async function req(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  let json;
  try { json = await r.json(); } catch { json = {}; }
  return { status: r.status, body: json };
}

function ok(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ─── setup: register two fresh agents ──────────────────────────────────────
async function setup() {
  console.log('\n🔧 Setup: Registering two test agents...');
  const ts = Date.now();

  const rA = await req('POST', '/auth/register', {
    name: `AgentA_${ts}`, email: `agenta_${ts}@test.com`, password: 'Test1234!'
  });
  ok('Register Agent A', rA.status === 201 || rA.status === 200, JSON.stringify(rA.body).slice(0,100));
  tokenA = rA.body.token;
  agentAId = rA.body.agent?.id;

  const rB = await req('POST', '/auth/register', {
    name: `AgentB_${ts}`, email: `agentb_${ts}@test.com`, password: 'Test1234!'
  });
  ok('Register Agent B', rB.status === 201 || rB.status === 200, JSON.stringify(rB.body).slice(0,100));
  tokenB = rB.body.token;
  agentBId = rB.body.agent?.id;

  if (!tokenA || !tokenB) {
    console.log('  ⛔ Cannot continue without both tokens. Aborting.');
    process.exit(1);
  }
  console.log(`  Agent A: ${agentAId}`);
  console.log(`  Agent B: ${agentBId}`);
}

// ─── test: contacts ─────────────────────────────────────────────────────────
async function testContacts() {
  console.log('\n📇 Contacts isolation...');

  // A creates a contact
  const create = await req('POST', '/contacts', { name: 'ContactA', email: 'contacta@test.com' }, tokenA);
  ok('Agent A can create contact', create.status === 201);
  const contactId = create.body.contact?.id;
  if (!contactId) { ok('Got contact ID', false); return; }

  // A can read it
  const readA = await req('GET', `/contacts/${contactId}`, null, tokenA);
  ok('Agent A can read own contact', readA.status === 200);

  // B cannot read it
  const readB = await req('GET', `/contacts/${contactId}`, null, tokenB);
  ok('Agent B cannot read Agent A contact (404)', readB.status === 404);

  // B cannot update it
  const patchB = await req('PATCH', `/contacts/${contactId}`, { name: 'Hacked' }, tokenB);
  ok('Agent B cannot update Agent A contact (404)', patchB.status === 404);

  // B cannot delete it
  const delB = await req('DELETE', `/contacts/${contactId}`, null, tokenB);
  ok('Agent B cannot delete Agent A contact (404)', delB.status === 404);

  // Cleanup
  await req('DELETE', `/contacts/${contactId}`, null, tokenA);
}

// ─── test: conversations ────────────────────────────────────────────────────
async function testConversations() {
  console.log('\n💬 Conversations isolation...');

  // A needs a contact first
  const ct = await req('POST', '/contacts', { name: 'ConvContact', email: 'convct@test.com' }, tokenA);
  const contactId = ct.body.contact?.id;

  const create = await req('POST', '/conversations', {
    subject: 'TestConv', contact_id: contactId
  }, tokenA);
  ok('Agent A can create conversation', create.status === 201);
  const convId = create.body.conversation?.id;
  if (!convId) { ok('Got conversation ID', false); return; }

  // A can read it
  const readA = await req('GET', `/conversations/${convId}`, null, tokenA);
  ok('Agent A can read own conversation', readA.status === 200);

  // B cannot read it
  const readB = await req('GET', `/conversations/${convId}`, null, tokenB);
  ok('Agent B cannot read Agent A conversation (404)', readB.status === 404);

  // B cannot get messages
  const msgsB = await req('GET', `/conversations/${convId}/messages`, null, tokenB);
  ok('Agent B cannot get messages of Agent A conversation (404)', msgsB.status === 404);

  // B cannot patch it
  const patchB = await req('PATCH', `/conversations/${convId}`, { status: 'resolved' }, tokenB);
  ok('Agent B cannot update Agent A conversation (404)', patchB.status === 404);

  // B cannot delete it
  const delB = await req('DELETE', `/conversations/${convId}`, null, tokenB);
  ok('Agent B cannot delete Agent A conversation (404)', delB.status === 404);

  // Cleanup
  await req('DELETE', `/conversations/${convId}`, null, tokenA);
  await req('DELETE', `/contacts/${contactId}`, null, tokenA);
}

// ─── test: CRM leads ────────────────────────────────────────────────────────
async function testLeads() {
  console.log('\n🎯 CRM Leads isolation...');

  const create = await req('POST', '/crm/leads', { name: 'LeadA', email: 'leada@test.com' }, tokenA);
  ok('Agent A can create lead', create.status === 201);
  const leadId = create.body.lead?.id;
  if (!leadId) { ok('Got lead ID', false); return; }

  const readA = await req('GET', `/crm/leads/${leadId}`, null, tokenA);
  ok('Agent A can read own lead', readA.status === 200);

  const readB = await req('GET', `/crm/leads/${leadId}`, null, tokenB);
  ok('Agent B cannot read Agent A lead (404)', readB.status === 404);

  const patchB = await req('PATCH', `/crm/leads/${leadId}`, { status: 'Won' }, tokenB);
  ok('Agent B cannot update Agent A lead (404)', patchB.status === 404);

  const delB = await req('DELETE', `/crm/leads/${leadId}`, null, tokenB);
  ok('Agent B cannot delete Agent A lead (404)', delB.status === 404);

  // Cleanup
  await req('DELETE', `/crm/leads/${leadId}`, null, tokenA);
}

// ─── test: CRM deals ────────────────────────────────────────────────────────
async function testDeals() {
  console.log('\n💰 CRM Deals isolation...');

  const create = await req('POST', '/crm/deals', { title: 'DealA', value: 5000 }, tokenA);
  ok('Agent A can create deal', create.status === 201);
  const dealId = create.body.deal?.id;
  if (!dealId) { ok('Got deal ID', false); return; }

  const readA = await req('GET', `/crm/deals/${dealId}`, null, tokenA);
  ok('Agent A can read own deal', readA.status === 200);

  const readB = await req('GET', `/crm/deals/${dealId}`, null, tokenB);
  ok('Agent B cannot read Agent A deal (404)', readB.status === 404);

  const patchB = await req('PATCH', `/crm/deals/${dealId}`, { stage: 'Won' }, tokenB);
  ok('Agent B cannot update Agent A deal (404)', patchB.status === 404);

  const delB = await req('DELETE', `/crm/deals/${dealId}`, null, tokenB);
  ok('Agent B cannot delete Agent A deal (404)', delB.status === 404);

  // Cleanup
  await req('DELETE', `/crm/deals/${dealId}`, null, tokenA);
}

// ─── test: CRM tasks ─────────────────────────────────────────────────────────
async function testTasks() {
  console.log('\n✅ CRM Tasks isolation...');

  const create = await req('POST', '/crm/tasks', { title: 'TaskA', due_date: '2026-12-31' }, tokenA);
  ok('Agent A can create task', create.status === 201);
  const taskId = create.body.task?.id;
  if (!taskId) { ok('Got task ID', false); return; }

  const readB = await req('GET', `/crm/tasks/${taskId}`, null, tokenB);
  ok('Agent B cannot read Agent A task (404)', readB.status === 404);

  const patchB = await req('PATCH', `/crm/tasks/${taskId}`, { status: 'done' }, tokenB);
  ok('Agent B cannot update Agent A task (404)', patchB.status === 404);

  const delB = await req('DELETE', `/crm/tasks/${taskId}`, null, tokenB);
  ok('Agent B cannot delete Agent A task (404)', delB.status === 404);

  await req('DELETE', `/crm/tasks/${taskId}`, null, tokenA);
}

// ─── test: CRM meetings ──────────────────────────────────────────────────────
async function testMeetings() {
  console.log('\n📅 CRM Meetings isolation...');

  const create = await req('POST', '/crm/meetings', {
    title: 'MeetingA', start_time: '2026-12-31 10:00:00'
  }, tokenA);
  ok('Agent A can create meeting', create.status === 201);
  const meetingId = create.body.meeting?.id;
  if (!meetingId) { ok('Got meeting ID', false); return; }

  const readB = await req('GET', `/crm/meetings/${meetingId}`, null, tokenB);
  ok('Agent B cannot read Agent A meeting (404)', readB.status === 404);

  const patchB = await req('PATCH', `/crm/meetings/${meetingId}`, { status: 'cancelled' }, tokenB);
  ok('Agent B cannot update Agent A meeting (404)', patchB.status === 404);

  const delB = await req('DELETE', `/crm/meetings/${meetingId}`, null, tokenB);
  ok('Agent B cannot delete Agent A meeting (404)', delB.status === 404);

  await req('DELETE', `/crm/meetings/${meetingId}`, null, tokenA);
}

// ─── test: companies ─────────────────────────────────────────────────────────
async function testCompanies() {
  console.log('\n🏢 Companies isolation...');

  const create = await req('POST', '/companies', { name: 'CompanyA' }, tokenA);
  ok('Agent A can create company', create.status === 201);
  const companyId = create.body.company?.id;
  if (!companyId) { ok('Got company ID', false); return; }

  const readB = await req('GET', `/companies/${companyId}`, null, tokenB);
  ok('Agent B cannot read Agent A company (404)', readB.status === 404);

  const patchB = await req('PATCH', `/companies/${companyId}`, { name: 'Hacked' }, tokenB);
  ok('Agent B cannot update Agent A company (404)', patchB.status === 404);

  const delB = await req('DELETE', `/companies/${companyId}`, null, tokenB);
  ok('Agent B cannot delete Agent A company (404)', delB.status === 404);

  await req('DELETE', `/companies/${companyId}`, null, tokenA);
}

// ─── test: settings labels ───────────────────────────────────────────────────
async function testLabels() {
  console.log('\n🏷️  Settings Labels isolation...');

  const create = await req('POST', '/settings/labels', { title: 'LabelA', color: '#ff0000' }, tokenA);
  ok('Agent A can create label', create.status === 201);
  const labelId = create.body.label?.id;
  if (!labelId) { ok('Got label ID', false); return; }

  // Labels GET is user-scoped, so B's list won't have A's label
  const listB = await req('GET', '/settings/labels', null, tokenB);
  const hasLabel = (listB.body.labels || []).some(l => l.id === labelId);
  ok('Agent B list does not include Agent A label', !hasLabel);

  const patchB = await req('PATCH', `/settings/labels/${labelId}`, { title: 'hacked' }, tokenB);
  ok('Agent B cannot update Agent A label (404)', patchB.status === 404);

  const delB = await req('DELETE', `/settings/labels/${labelId}`, null, tokenB);
  ok('Agent B cannot delete Agent A label (404)', delB.status === 404);

  await req('DELETE', `/settings/labels/${labelId}`, null, tokenA);
}

// ─── test: settings inboxes ──────────────────────────────────────────────────
async function testInboxes() {
  console.log('\n📥 Settings Inboxes isolation...');

  const create = await req('POST', '/settings/inboxes', { name: 'InboxA', type: 'email' }, tokenA);
  ok('Agent A can create inbox', create.status === 201);
  const inboxId = create.body.inbox?.id;
  if (!inboxId) { ok('Got inbox ID', false); return; }

  const patchB = await req('PATCH', `/settings/inboxes/${inboxId}`, { name: 'Hacked' }, tokenB);
  ok('Agent B cannot update Agent A inbox (404)', patchB.status === 404);

  const delB = await req('DELETE', `/settings/inboxes/${inboxId}`, null, tokenB);
  ok('Agent B cannot delete Agent A inbox (404)', delB.status === 404);

  await req('DELETE', `/settings/inboxes/${inboxId}`, null, tokenA);
}

// ─── test: campaigns ─────────────────────────────────────────────────────────
async function testCampaigns() {
  console.log('\n📣 Campaigns isolation...');

  const create = await req('POST', '/marketing/campaigns', {
    name: 'CampaignA', type: 'sms', status: 'draft'
  }, tokenA);
  ok('Agent A can create campaign', create.status === 201);
  const campaignId = create.body.campaign?.id;
  if (!campaignId) { ok('Got campaign ID', false); return; }

  // B cannot view campaign log (agent_id check)
  const logB = await req('GET', `/marketing/campaigns/${campaignId}/log`, null, tokenB);
  ok('Agent B cannot view Agent A campaign log (404)', logB.status === 404);

  await req('DELETE', `/marketing/campaigns/${campaignId}`, null, tokenA);
}

// ─── test: forms ─────────────────────────────────────────────────────────────
async function testForms() {
  console.log('\n📝 Forms isolation...');

  const create = await req('POST', '/forms', { name: 'FormA', fields: [], status: 'draft' }, tokenA);
  ok('Agent A can create form', create.status === 201);
  const formId = create.body.form?.id;
  if (!formId) { ok('Got form ID', false); return; }

  const readB = await req('GET', `/forms/${formId}`, null, tokenB);
  ok('Agent B cannot read Agent A form (404)', readB.status === 404);

  const patchB = await req('PATCH', `/forms/${formId}`, { name: 'Hacked' }, tokenB);
  ok('Agent B cannot update Agent A form (404)', patchB.status === 404);

  const delB = await req('DELETE', `/forms/${formId}`, null, tokenB);
  ok('Agent B cannot delete Agent A form (404)', delB.status === 404);

  await req('DELETE', `/forms/${formId}`, null, tokenA);
}

// ─── test: calendar ──────────────────────────────────────────────────────────
async function testCalendar() {
  console.log('\n🗓️  Calendar isolation...');

  const create = await req('POST', '/calendar', {
    title: 'EventA', start_time: '2026-12-31 09:00:00'
  }, tokenA);
  ok('Agent A can create calendar event', create.status === 201);
  const eventId = create.body.event?.id;
  if (!eventId) { ok('Got event ID', false); return; }

  // A can see it in their list
  const listA = await req('GET', '/calendar', null, tokenA);
  const inListA = (listA.body.events || []).some(e => e.id === eventId);
  ok('Event appears in Agent A calendar list', inListA);

  // B cannot see it in their list
  const listB = await req('GET', '/calendar', null, tokenB);
  const inListB = (listB.body.events || []).some(e => e.id === eventId);
  ok('Event does NOT appear in Agent B calendar list', !inListB);

  const readB = await req('GET', `/calendar/${eventId}`, null, tokenB);
  ok('Agent B cannot read Agent A calendar event (404)', readB.status === 404);

  const patchB = await req('PATCH', `/calendar/${eventId}`, { title: 'Hacked' }, tokenB);
  ok('Agent B cannot update Agent A calendar event (404)', patchB.status === 404);

  const delB = await req('DELETE', `/calendar/${eventId}`, null, tokenB);
  ok('Agent B cannot delete Agent A calendar event (404)', delB.status === 404);

  await req('DELETE', `/calendar/${eventId}`, null, tokenA);
}

// ─── test: list endpoints return only own data ───────────────────────────────
async function testListIsolation() {
  console.log('\n📋 List endpoints return only own data...');

  // A creates 2 contacts, B creates 1
  const c1 = await req('POST', '/contacts', { name: 'AContact1' }, tokenA);
  const c2 = await req('POST', '/contacts', { name: 'AContact2' }, tokenA);
  const c3 = await req('POST', '/contacts', { name: 'BContact1' }, tokenB);

  const c1id = c1.body.contact?.id;
  const c2id = c2.body.contact?.id;
  const c3id = c3.body.contact?.id;

  const listA = await req('GET', '/contacts', null, tokenA);
  const listB = await req('GET', '/contacts', null, tokenB);

  const aIds = (listA.body.contacts || []).map(c => c.id);
  const bIds = (listB.body.contacts || []).map(c => c.id);

  ok('Agent A list has own contacts', aIds.includes(c1id) && aIds.includes(c2id));
  ok('Agent A list does NOT have Agent B contact', !aIds.includes(c3id));
  ok('Agent B list has own contact', bIds.includes(c3id));
  ok('Agent B list does NOT have Agent A contacts', !bIds.includes(c1id) && !bIds.includes(c2id));

  // Cleanup
  if (c1id) await req('DELETE', `/contacts/${c1id}`, null, tokenA);
  if (c2id) await req('DELETE', `/contacts/${c2id}`, null, tokenA);
  if (c3id) await req('DELETE', `/contacts/${c3id}`, null, tokenB);
}

// ─── test: dashboard/reports scoped ──────────────────────────────────────────
async function testDashboardScoping() {
  console.log('\n📊 Dashboard & Reports scoped to agent...');

  const dashA = await req('GET', '/dashboard/kpis', null, tokenA);
  ok('Agent A can access dashboard', dashA.status === 200);

  const dashB = await req('GET', '/dashboard/kpis', null, tokenB);
  ok('Agent B can access dashboard', dashB.status === 200);

  const reportA = await req('GET', '/reports/overview', null, tokenA);
  ok('Agent A can access reports', reportA.status === 200);
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   Agent ID Isolation Test Suite');
  console.log('═══════════════════════════════════════════════════');

  await setup();
  await testContacts();
  await testConversations();
  await testLeads();
  await testDeals();
  await testTasks();
  await testMeetings();
  await testCompanies();
  await testLabels();
  await testInboxes();
  await testCampaigns();
  await testForms();
  await testCalendar();
  await testListIsolation();
  await testDashboardScoping();

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`   Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════\n');

  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error('Test error:', e); process.exit(1); });
