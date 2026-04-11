const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const DB_TYPE = process.env.DB_TYPE || 'sqlite';

let db;

async function init() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const database = process.env.DB_NAME || 'supportboard';

  // First connect without DB to create it
  const connection = await mysql.createConnection({ host, user, password });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await connection.end();

  // Now connect with DB — use pool for auto-reconnection on stale/dead connections
  db = mysql.createPool({
    host,
    user,
    password,
    database,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 10,
    idleTimeout: 60000,
  });
  console.log('Using MySQL database:', database);

  await createSchema();
  await ensureSchemaColumns();
  await seed();
  await seedMarketing();
  await cleanupSeedData();
}

async function createSchema() {
  const schema = `
-- Auth
CREATE TABLE IF NOT EXISTS agents (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'agent',
  avatar VARCHAR(255),
  color VARCHAR(50) DEFAULT '#4c82fb',
  status VARCHAR(50) DEFAULT 'online',
  phone VARCHAR(50),
  bio TEXT,
  two_fa_enabled TINYINT DEFAULT 0,
  two_fa_secret VARCHAR(255),
  notification_prefs TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id VARCHAR(255),
  agent_id VARCHAR(255),
  PRIMARY KEY (team_id, agent_id)
);

-- Inboxes / Channels
CREATE TABLE IF NOT EXISTS inboxes (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  color VARCHAR(50),
  greeting TEXT,
  active TINYINT DEFAULT 1,
  config TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Labels
CREATE TABLE IF NOT EXISTS labels (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT '#4c82fb',
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  avatar VARCHAR(255),
  color VARCHAR(50),
  tags TEXT,
  location VARCHAR(255),
  timezone VARCHAR(100),
  notes TEXT,
  custom_fields TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  industry VARCHAR(255),
  size VARCHAR(50),
  revenue VARCHAR(100),
  website VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  custom_fields TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(255) PRIMARY KEY,
  subject VARCHAR(255),
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(50) DEFAULT 'normal',
  contact_id VARCHAR(255),
  inbox_id VARCHAR(255),
  assignee_id VARCHAR(255),
  team_id VARCHAR(255),
  color VARCHAR(50),
  labels TEXT,
  snoozed_until DATETIME,
  csat_score INT,
  csat_comment TEXT,
  first_reply_at DATETIME,
  resolved_at DATETIME,
  custom_fields TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  text TEXT,
  attachments TEXT,
  agent_id VARCHAR(255),
  is_read TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Canned Responses
CREATE TABLE IF NOT EXISTS canned_responses (
  id VARCHAR(255) PRIMARY KEY,
  code VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Automations
CREATE TABLE IF NOT EXISTS automations (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(100),
  conditions TEXT,
  actions TEXT,
  active TINYINT DEFAULT 1,
  run_count INT DEFAULT 0,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CRM - Deals
CREATE TABLE IF NOT EXISTS deals (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  value DECIMAL(15,2) DEFAULT 0,
  weighted_value DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  stage VARCHAR(100) DEFAULT 'Open',
  probability INT DEFAULT 20,
  contact_id VARCHAR(255),
  company_id VARCHAR(255),
  owner_id VARCHAR(255),
  team_id VARCHAR(255),
  lead_id VARCHAR(255),
  product VARCHAR(255),
  expected_close DATE,
  proposal_date DATE,
  win_reason TEXT,
  lost_reason TEXT,
  notes TEXT,
  custom_fields TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- CRM - Leads
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  designation VARCHAR(255),
  source VARCHAR(100),
  campaign VARCHAR(255),
  industry VARCHAR(255),
  status VARCHAR(50) DEFAULT 'New',
  priority VARCHAR(50) DEFAULT 'medium',
  score INT DEFAULT 50,
  value DECIMAL(15,2) DEFAULT 0,
  owner_id VARCHAR(255),
  team_id VARCHAR(255),
  tags TEXT,
  next_followup_date DATETIME,
  remarks TEXT,
  notes TEXT,
  custom_fields TEXT,
  converted_contact_id VARCHAR(255),
  converted_deal_id VARCHAR(255),
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- CRM - Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'task',
  due_date DATETIME,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'todo',
  assignee_id VARCHAR(255),
  contact_id VARCHAR(255),
  related_type VARCHAR(50),
  related_id VARCHAR(255),
  recurring VARCHAR(50),
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- CRM - Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'meeting',
  description TEXT,
  start_time DATETIME,
  end_time DATETIME,
  location VARCHAR(255),
  meeting_link VARCHAR(255),
  host_id VARCHAR(255),
  attendees TEXT,
  agenda TEXT,
  outcome TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  contact_id VARCHAR(255),
  company_id VARCHAR(255),
  related_type VARCHAR(50),
  related_id VARCHAR(255),
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CRM - Customers (converted leads/deals)
CREATE TABLE IF NOT EXISTS crm_customers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  company_id VARCHAR(255),
  contact_id VARCHAR(255),
  deal_id VARCHAR(255),
  lead_id VARCHAR(255),
  owner_id VARCHAR(255),
  team_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  type VARCHAR(50) DEFAULT 'customer',
  renewal_date DATE,
  contract_value DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  tags TEXT,
  custom_fields TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- CRM - Activities (activity log)
CREATE TABLE IF NOT EXISTS crm_activities (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  performer_id VARCHAR(255),
  metadata TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CRM - Reminders
CREATE TABLE IF NOT EXISTS crm_reminders (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  remind_at DATETIME NOT NULL,
  channel VARCHAR(50) DEFAULT 'in_app',
  entity_type VARCHAR(50),
  entity_id VARCHAR(255),
  assignee_id VARCHAR(255),
  recurring VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CRM - Transfers (ownership transfer log)
CREATE TABLE IF NOT EXISTS crm_transfers (
  id VARCHAR(255) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  from_user_id VARCHAR(255),
  to_user_id VARCHAR(255),
  from_team_id VARCHAR(255),
  to_team_id VARCHAR(255),
  reason TEXT,
  notes TEXT,
  performed_by VARCHAR(255),
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CRM - Meeting Invitations (sent via inbox channels)
CREATE TABLE IF NOT EXISTS meeting_invitations (
  id VARCHAR(255) PRIMARY KEY,
  meeting_id VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  inbox_id VARCHAR(255),
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  subject VARCHAR(500),
  body TEXT,
  status VARCHAR(50) DEFAULT 'sent',
  sent_at DATETIME,
  delivered_at DATETIME,
  response VARCHAR(50),
  response_at DATETIME,
  error TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Team Chat
CREATE TABLE IF NOT EXISTS chat_channels (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'public',
  members TEXT,
  created_by VARCHAR(255),
  pinned_messages TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(255) PRIMARY KEY,
  channel_id VARCHAR(255),
  sender_id VARCHAR(255) NOT NULL,
  text TEXT,
  attachments TEXT,
  reactions TEXT,
  thread_id VARCHAR(255),
  reply_to VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_polls (
  id VARCHAR(255) PRIMARY KEY,
  channel_id VARCHAR(255) NOT NULL,
  created_by VARCHAR(255),
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  closed TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Marketing
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  goal VARCHAR(50) DEFAULT 'promotion',
  status VARCHAR(50) DEFAULT 'draft',
  subject VARCHAR(255),
  body TEXT,
  segment_id VARCHAR(255),
  audience_mode VARCHAR(50) DEFAULT 'segments',
  selected_contacts LONGTEXT,
  scheduled_at DATETIME,
  sent_at DATETIME,
  stats TEXT,
  ab_test TINYINT DEFAULT 0,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS segments (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions TEXT,
  source VARCHAR(50) DEFAULT 'rules',
  contacts_json LONGTEXT,
  contact_count INT DEFAULT 0,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  category VARCHAR(100) DEFAULT 'General',
  description TEXT,
  subject VARCHAR(255),
  body TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Calendar
CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time DATETIME,
  end_time DATETIME,
  all_day TINYINT DEFAULT 0,
  type VARCHAR(50) DEFAULT 'meeting',
  color VARCHAR(50),
  attendees TEXT,
  location VARCHAR(255),
  recurrence VARCHAR(100),
  created_by VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bookings
CREATE TABLE IF NOT EXISTS booking_pages (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  duration INT DEFAULT 30,
  buffer INT DEFAULT 0,
  color VARCHAR(50) DEFAULT '#4c82fb',
  active TINYINT DEFAULT 1,
  form_fields TEXT,
  availability TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(255) PRIMARY KEY,
  page_id VARCHAR(255),
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  start_time DATETIME,
  end_time DATETIME,
  status VARCHAR(50) DEFAULT 'confirmed',
  notes TEXT,
  form_responses TEXT,
  no_show_risk INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base
CREATE TABLE IF NOT EXISTS kb_categories (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  order_idx INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kb_articles (
  id VARCHAR(255) PRIMARY KEY,
  category_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  author_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'draft',
  helpful_yes INT DEFAULT 0,
  helpful_no INT DEFAULT 0,
  views INT DEFAULT 0,
  seo_title VARCHAR(255),
  seo_desc TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE IF NOT EXISTS report_snapshots (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50),
  period VARCHAR(50),
  data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  category VARCHAR(100),
  connected TINYINT DEFAULT 0,
  config TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255),
  key_preview VARCHAR(255),
  scopes TEXT,
  last_used DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhooks (
  id VARCHAR(255) PRIMARY KEY,
  url VARCHAR(255) NOT NULL,
  events TEXT,
  active TINYINT DEFAULT 1,
  secret VARCHAR(255),
  last_triggered DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS custom_fields (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  required TINYINT DEFAULT 0,
  description TEXT,
  options TEXT,
  group_name VARCHAR(100),
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sla_policies (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  first_response_minutes INT DEFAULT 60,
  resolution_minutes INT DEFAULT 480,
  conditions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS brands (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  color VARCHAR(50),
  logo VARCHAR(255),
  active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signatures (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  body TEXT,
  socials TEXT,
  logo TINYINT DEFAULT 0,
  is_default TINYINT DEFAULT 0,
  active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255),
  action VARCHAR(255),
  entity_type VARCHAR(255),
  entity_id VARCHAR(255),
  details TEXT,
  ip VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI
CREATE TABLE IF NOT EXISTS ai_agents (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  system_prompt TEXT,
  tone VARCHAR(50) DEFAULT 'professional',
  active TINYINT DEFAULT 1,
  type VARCHAR(50) DEFAULT 'support',
  playbooks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255),
  messages TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Live Monitor
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id VARCHAR(255) PRIMARY KEY,
  session_id VARCHAR(255),
  page VARCHAR(255),
  country VARCHAR(255),
  city VARCHAR(255),
  source VARCHAR(255),
  device VARCHAR(255),
  intent VARCHAR(255),
  duration INT DEFAULT 0,
  active TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255),
  type VARCHAR(50),
  title VARCHAR(255),
  body TEXT,
  is_read TINYINT DEFAULT 0,
  link VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contact tags
CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id VARCHAR(255),
  tag VARCHAR(100),
  PRIMARY KEY (contact_id, tag)
);

-- Bot Builder
CREATE TABLE IF NOT EXISTS bots (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  template VARCHAR(100),
  nodes TEXT,
  knowledge TEXT,
  setup TEXT,
  embed_token VARCHAR(255),
  stats TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bot Chat Sessions
CREATE TABLE IF NOT EXISTS bot_chats (
  id VARCHAR(255) PRIMARY KEY,
  bot_id VARCHAR(255),
  bot_name VARCHAR(255),
  contact_id VARCHAR(255),
  conversation_id VARCHAR(255),
  visitor_name VARCHAR(255) DEFAULT 'Visitor',
  visitor_email VARCHAR(255),
  messages TEXT,
  status VARCHAR(50) DEFAULT 'active',
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Forms
CREATE TABLE IF NOT EXISTS forms (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  fields TEXT,
  settings TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id VARCHAR(255) PRIMARY KEY,
  form_id VARCHAR(255) NOT NULL,
  data TEXT,
  ip VARCHAR(100),
  user_agent VARCHAR(500),
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sales Agents
CREATE TABLE IF NOT EXISTS sales_agents (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  emoji VARCHAR(50) DEFAULT NULL,
  color VARCHAR(50) DEFAULT '#4c82fb',
  tone VARCHAR(50) DEFAULT 'consultative',
  language VARCHAR(20) DEFAULT 'en',
  channels TEXT,
  system_prompt TEXT,
  handoff_threshold INT DEFAULT 70,
  max_turns INT DEFAULT 10,
  followup_days INT DEFAULT 3,
  active TINYINT DEFAULT 1,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_playbooks (
  id VARCHAR(255) PRIMARY KEY,
  sales_agent_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  \`trigger\` VARCHAR(255),
  steps TEXT,
  product_tier VARCHAR(100),
  owner_name VARCHAR(255),
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  avg_deal_size DECIMAL(15,2) DEFAULT 0,
  conversion_count INT DEFAULT 0,
  active TINYINT DEFAULT 1,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_qualification_rules (
  id VARCHAR(255) PRIMARY KEY,
  sales_agent_id VARCHAR(255),
  field VARCHAR(100) NOT NULL,
  operator VARCHAR(50) DEFAULT 'equals',
  value VARCHAR(255),
  points INT DEFAULT 10,
  active TINYINT DEFAULT 1,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_objections (
  id VARCHAR(255) PRIMARY KEY,
  sales_agent_id VARCHAR(255),
  trigger_phrase VARCHAR(255),
  response TEXT,
  category VARCHAR(100) DEFAULT 'general',
  usage_count INT DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  active TINYINT DEFAULT 1,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_products (
  id VARCHAR(255) PRIMARY KEY,
  sales_agent_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  price VARCHAR(100),
  features TEXT,
  segment VARCHAR(255),
  qualifier_rule TEXT,
  active TINYINT DEFAULT 1,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_lead_activities (
  id VARCHAR(255) PRIMARY KEY,
  sales_agent_id VARCHAR(255),
  lead_id VARCHAR(255),
  type VARCHAR(100),
  details TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI Bot Settings
CREATE TABLE IF NOT EXISTS aibot_config (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255) UNIQUE NOT NULL,
  bot_name VARCHAR(255) DEFAULT 'Aria',
  bot_tone VARCHAR(50) DEFAULT 'professional',
  bot_lang VARCHAR(20) DEFAULT 'EN',
  handoff_after VARCHAR(20) DEFAULT '3',
  working_hours TINYINT DEFAULT 1,
  auto_resolve TINYINT DEFAULT 0,
  auto_resolve_hours VARCHAR(20) DEFAULT '24',
  sys_prompt TEXT,
  ai_auto_reply TINYINT DEFAULT 0,
  channels TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aibot_faqs (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aibot_docs (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  name VARCHAR(500) NOT NULL,
  size_label VARCHAR(50),
  file_path VARCHAR(500),
  status VARCHAR(50) DEFAULT 'trained',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aibot_urls (
  id VARCHAR(255) PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'trained',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

  await db.query(schema.replace(/TEXT DEFAULT \(datetime\('now'\)\)/g, "DATETIME DEFAULT CURRENT_TIMESTAMP")
                       .replace(/TEXT DEFAULT '\[\]'/g, "TEXT")
                       .replace(/TEXT DEFAULT '{}'/g, "TEXT")
                       .replace(/INTEGER DEFAULT 0/g, "TINYINT DEFAULT 0")
                       .replace(/INTEGER DEFAULT 1/g, "TINYINT DEFAULT 1"));
}

async function ensureSchemaColumns() {
  try {
    const inboxColumns = await query('SHOW COLUMNS FROM inboxes');
    const columnNames = new Set(inboxColumns.map(col => col.Field));
    const additions = [
      { name: 'name', sql: "ALTER TABLE inboxes ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT 'Inbox'" },
      { name: 'type', sql: "ALTER TABLE inboxes ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'live'" },
      { name: 'color', sql: "ALTER TABLE inboxes ADD COLUMN color VARCHAR(50) DEFAULT '#4c82fb'" },
      { name: 'greeting', sql: 'ALTER TABLE inboxes ADD COLUMN greeting TEXT' },
      { name: 'active', sql: 'ALTER TABLE inboxes ADD COLUMN active TINYINT DEFAULT 1' },
      { name: 'config', sql: 'ALTER TABLE inboxes ADD COLUMN config TEXT' },
      { name: 'agent_id', sql: 'ALTER TABLE inboxes ADD COLUMN agent_id VARCHAR(255)' },
      { name: 'created_at', sql: 'ALTER TABLE inboxes ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP' },
    ];

    for (const addition of additions) {
      if (!columnNames.has(addition.name)) {
        await run(addition.sql);
      }
    }

    await run("UPDATE inboxes SET type='live' WHERE type IS NULL OR type=''");
    await run("UPDATE inboxes SET name=CONCAT('Inbox ', id) WHERE name IS NULL OR name=''");
    await run("UPDATE inboxes SET color='#4c82fb' WHERE color IS NULL OR color=''");

    await run('UPDATE inboxes SET active=1 WHERE active IS NULL');
    await run("UPDATE inboxes SET greeting='' WHERE greeting IS NULL");
    await run("UPDATE inboxes SET config='{}' WHERE config IS NULL OR config=''");
    const firstAgent = await query('SELECT id FROM agents ORDER BY created_at ASC LIMIT 1', [], true);
    if (firstAgent?.id) {
      await run('UPDATE inboxes SET agent_id=? WHERE agent_id IS NULL', [firstAgent.id]);
    }

    // ── messages: email_message_id for IMAP dedup ────────────────────────
    try {
      const msgCols = new Set((await query('SHOW COLUMNS FROM messages')).map(c => c.Field));
      if (!msgCols.has('email_message_id')) {
        await run('ALTER TABLE messages ADD COLUMN email_message_id VARCHAR(512) NULL');
        await run('ALTER TABLE messages ADD INDEX idx_email_message_id (email_message_id)');
        console.log('✅ Added email_message_id to messages');
      }
      // ── whatsapp_message_id for WA dedup ──────────────────────────────
      if (!msgCols.has('whatsapp_message_id')) {
        await run('ALTER TABLE messages ADD COLUMN whatsapp_message_id VARCHAR(512) NULL');
        await run('ALTER TABLE messages ADD INDEX idx_wa_message_id (whatsapp_message_id)');
        console.log('✅ Added whatsapp_message_id to messages');
      }
      // ── html column for original email HTML body ─────────────────────
      if (!msgCols.has('html')) {
        await run('ALTER TABLE messages ADD COLUMN html TEXT NULL');
        console.log('✅ Added html to messages');
      }
    } catch (e) { console.error('email/wa_message_id/html column:', e.message); }

    // ── conversations: channel column (for non-email channels) ───────────
    try {
      const cvCols = new Set((await query('SHOW COLUMNS FROM conversations')).map(c => c.Field));
      if (!cvCols.has('channel')) {
        await run("ALTER TABLE conversations ADD COLUMN channel VARCHAR(50) DEFAULT 'live'");
        console.log('✅ Added channel to conversations');
      }
      if (!cvCols.has('unread_count')) {
        await run('ALTER TABLE conversations ADD COLUMN unread_count INT DEFAULT 0');
        console.log('✅ Added unread_count to conversations');
      }
    } catch (e) { console.error('conversations column:', e.message); }

    // ── segments: description column ─────────────────────────────────────
    try {
      const segCols = new Set((await query('SHOW COLUMNS FROM segments')).map(c => c.Field));
      if (!segCols.has('description')) {
        await run('ALTER TABLE segments ADD COLUMN description TEXT');
        console.log('✅ Added description to segments');
      }
      if (!segCols.has('source')) {
        await run("ALTER TABLE segments ADD COLUMN source VARCHAR(50) DEFAULT 'rules'");
        console.log('✅ Added source to segments');
      }
      if (!segCols.has('contacts_json')) {
        await run('ALTER TABLE segments ADD COLUMN contacts_json LONGTEXT');
        console.log('✅ Added contacts_json to segments');
      }
    } catch (e) { console.error('segments description column:', e.message); }

    // ── campaigns: goal + ab_test + audience columns ──────────────────────
    try {
      const campCols = new Set((await query('SHOW COLUMNS FROM campaigns')).map(c => c.Field));
      if (!campCols.has('goal')) {
        await run("ALTER TABLE campaigns ADD COLUMN goal VARCHAR(50) DEFAULT 'promotion'");
        console.log('✅ Added goal to campaigns');
      }
      if (!campCols.has('ab_test')) {
        await run('ALTER TABLE campaigns ADD COLUMN ab_test TINYINT DEFAULT 0');
        console.log('✅ Added ab_test to campaigns');
      }
      if (!campCols.has('audience_mode')) {
        await run("ALTER TABLE campaigns ADD COLUMN audience_mode VARCHAR(50) DEFAULT 'segments'");
        console.log('✅ Added audience_mode to campaigns');
      }
      if (!campCols.has('selected_contacts')) {
        await run('ALTER TABLE campaigns ADD COLUMN selected_contacts LONGTEXT');
        console.log('✅ Added selected_contacts to campaigns');
      }
    } catch (e) { console.error('campaigns columns:', e.message); }

    // ── campaign_templates: category + description columns ───────────────
    try {
      const tplCols = new Set((await query('SHOW COLUMNS FROM campaign_templates')).map(c => c.Field));
      if (!tplCols.has('category')) {
        await run("ALTER TABLE campaign_templates ADD COLUMN category VARCHAR(100) DEFAULT 'General'");
        console.log('✅ Added category to campaign_templates');
      }
      if (!tplCols.has('description')) {
        await run('ALTER TABLE campaign_templates ADD COLUMN description TEXT');
        console.log('✅ Added description to campaign_templates');
      }
    } catch (e) { console.error('campaign_templates columns:', e.message); }
    // ── CRM leads: add new columns ────────────────────────────────────
    try {
      const leadCols = new Set((await query('SHOW COLUMNS FROM leads')).map(c => c.Field));
      const leadAdds = [
        ['designation', "ALTER TABLE leads ADD COLUMN designation VARCHAR(255)"],
        ['campaign', "ALTER TABLE leads ADD COLUMN campaign VARCHAR(255)"],
        ['industry', "ALTER TABLE leads ADD COLUMN industry VARCHAR(255)"],
        ['priority', "ALTER TABLE leads ADD COLUMN priority VARCHAR(50) DEFAULT 'medium'"],
        ['team_id', "ALTER TABLE leads ADD COLUMN team_id VARCHAR(255)"],
        ['tags', "ALTER TABLE leads ADD COLUMN tags TEXT"],
        ['next_followup_date', "ALTER TABLE leads ADD COLUMN next_followup_date DATETIME"],
        ['remarks', "ALTER TABLE leads ADD COLUMN remarks TEXT"],
        ['converted_contact_id', "ALTER TABLE leads ADD COLUMN converted_contact_id VARCHAR(255)"],
        ['converted_deal_id', "ALTER TABLE leads ADD COLUMN converted_deal_id VARCHAR(255)"],
      ];
      for (const [col, sql] of leadAdds) { if (!leadCols.has(col)) await run(sql); }
    } catch (e) { console.error('leads columns:', e.message); }

    // ── CRM deals: add new columns ──────────────────────────────────
    try {
      const dealCols = new Set((await query('SHOW COLUMNS FROM deals')).map(c => c.Field));
      const dealAdds = [
        ['weighted_value', "ALTER TABLE deals ADD COLUMN weighted_value DECIMAL(15,2) DEFAULT 0"],
        ['team_id', "ALTER TABLE deals ADD COLUMN team_id VARCHAR(255)"],
        ['lead_id', "ALTER TABLE deals ADD COLUMN lead_id VARCHAR(255)"],
        ['product', "ALTER TABLE deals ADD COLUMN product VARCHAR(255)"],
        ['proposal_date', "ALTER TABLE deals ADD COLUMN proposal_date DATE"],
        ['win_reason', "ALTER TABLE deals ADD COLUMN win_reason TEXT"],
        ['lost_reason', "ALTER TABLE deals ADD COLUMN lost_reason TEXT"],
      ];
      for (const [col, sql] of dealAdds) { if (!dealCols.has(col)) await run(sql); }
    } catch (e) { console.error('deals columns:', e.message); }

    // ── CRM tasks: add new columns ──────────────────────────────────
    try {
      const taskCols = new Set((await query('SHOW COLUMNS FROM tasks')).map(c => c.Field));
      const taskAdds = [
        ['type', "ALTER TABLE tasks ADD COLUMN type VARCHAR(50) DEFAULT 'task'"],
        ['contact_id', "ALTER TABLE tasks ADD COLUMN contact_id VARCHAR(255)"],
        ['recurring', "ALTER TABLE tasks ADD COLUMN recurring VARCHAR(50)"],
      ];
      for (const [col, sql] of taskAdds) { if (!taskCols.has(col)) await run(sql); }
    } catch (e) { console.error('tasks columns:', e.message); }

    // ── CRM meetings: add new columns ───────────────────────────────
    try {
      const mtCols = new Set((await query('SHOW COLUMNS FROM meetings')).map(c => c.Field));
      const mtAdds = [
        ['type', "ALTER TABLE meetings ADD COLUMN type VARCHAR(50) DEFAULT 'meeting'"],
        ['host_id', "ALTER TABLE meetings ADD COLUMN host_id VARCHAR(255)"],
        ['agenda', "ALTER TABLE meetings ADD COLUMN agenda TEXT"],
        ['outcome', "ALTER TABLE meetings ADD COLUMN outcome TEXT"],
        ['contact_id', "ALTER TABLE meetings ADD COLUMN contact_id VARCHAR(255)"],
        ['company_id', "ALTER TABLE meetings ADD COLUMN company_id VARCHAR(255)"],
      ];
      for (const [col, sql] of mtAdds) { if (!mtCols.has(col)) await run(sql); }
    } catch (e) { console.error('meetings columns:', e.message); }

    // ── calendar_events: meeting_link column ────────────────────────
    try {
      const calCols = new Set((await query('SHOW COLUMNS FROM calendar_events')).map(c => c.Field));
      if (!calCols.has('meeting_link')) {
        await run('ALTER TABLE calendar_events ADD COLUMN meeting_link VARCHAR(512)');
        console.log('✅ Added meeting_link to calendar_events');
      }
    } catch (e) { console.error('calendar_events columns:', e.message); }

    // ── booking_pages: location, max_per_day, min_notice_hours ──────
    try {
      const bpCols = new Set((await query('SHOW COLUMNS FROM booking_pages')).map(c => c.Field));
      const bpAdds = [
        ['location', "ALTER TABLE booking_pages ADD COLUMN location VARCHAR(255) DEFAULT 'Zoom'"],
        ['max_per_day', "ALTER TABLE booking_pages ADD COLUMN max_per_day INT DEFAULT 4"],
        ['min_notice_hours', "ALTER TABLE booking_pages ADD COLUMN min_notice_hours INT DEFAULT 24"],
      ];
      for (const [col, sql] of bpAdds) { if (!bpCols.has(col)) await run(sql); }
    } catch (e) { console.error('booking_pages columns:', e.message); }

    // ── Add missing agent_id to all tables that need it ─────────────────
    const agentIdTables = [
      'contacts', 'conversations', 'canned_responses',
      'automations', 'labels', 'teams',
      'custom_fields', 'companies', 'deals', 'leads', 'campaigns', 'segments',
      'campaign_templates'
    ];
    for (const tbl of agentIdTables) {
      try {
        const cols = new Set((await query(`SHOW COLUMNS FROM ${tbl}`)).map(c => c.Field));
        if (!cols.has('agent_id')) {
          await run(`ALTER TABLE ${tbl} ADD COLUMN agent_id VARCHAR(255)`);
          console.log(`✅ Added agent_id to ${tbl}`);
        }
      } catch (e) { console.error(`agent_id on ${tbl}:`, e.message); }
    }

  } catch (e) {
    console.error('Failed to ensure schema columns:', e.message);
  }
}

async function cleanupSeedData() {
  const seedContactIds = ['ct1','ct2','ct3','ct4','ct5','ct6'];
  const seedConvoIds = ['cv1','cv2','cv3'];
  for (const id of seedConvoIds) {
    await run('DELETE FROM messages WHERE conversation_id=?', [id]);
    await run('DELETE FROM conversations WHERE id=?', [id]);
  }
  for (const id of seedContactIds) {
    await run('DELETE FROM contacts WHERE id=?', [id]);
  }
  console.log('🧹 Cleaned up seed contacts & conversations');
}

async function seed() {
  const row = await query('SELECT COUNT(*) as c FROM agents', [], true);
  if (row.c > 0) return;

  console.log('Seeding database...');
  const pw = bcrypt.hashSync('demo123', 10);

  // Helper to insert
  const insertAgent = async (a) => await run('INSERT INTO agents (id,name,email,password_hash,role,avatar,color,status) VALUES (?,?,?,?,?,?,?,?)', [a.id, a.name, a.email, a.password_hash, a.role, a.avatar, a.color, a.status]);
  
  await insertAgent({ id: 'a1', name: 'Priya Sharma', email: 'priya@supportdesk.app', password_hash: pw, role: 'owner', avatar: 'PS', color: '#4c82fb', status: 'online' });
  await insertAgent({ id: 'a2', name: 'Dev Kumar', email: 'dev@supportdesk.app', password_hash: pw, role: 'agent', avatar: 'DK', color: '#1fd07a', status: 'online' });
  await insertAgent({ id: 'a3', name: 'Meena Rao', email: 'meena@supportdesk.app', password_hash: pw, role: 'agent', avatar: 'MR', color: '#9b6dff', status: 'busy' });
  await insertAgent({ id: 'a4', name: 'Aryan Shah', email: 'aryan@supportdesk.app', password_hash: pw, role: 'admin', avatar: 'AS', color: '#f5a623', status: 'offline' });

  // Inboxes
  const inboxes = [
    ['ib1', 'Website Chat', 'live', '#1fd07a', 'Hi! How can we help?', 1, 'a1'],
    ['ib2', 'Support Email', 'email', '#4c82fb', '', 1, 'a1'],
    ['ib3', 'WhatsApp Business', 'whatsapp', '#25d366', 'Hello!', 1, 'a1'],
    ['ib4', 'Telegram Bot', 'telegram', '#0088cc', '', 0, 'a1'],
    ['ib5', 'Facebook Page', 'facebook', '#1877f2', 'Hi! Thanks for reaching out.', 1, 'a1'],
    ['ib6', 'Instagram DMs', 'instagram', '#e1306c', 'Hi! We got your DM.', 1, 'a1'],
    ['ib11', 'X (Twitter) DMs', 'x', '#e7e9ea', 'Hi there! How can we help?', 1, 'a1'],
    ['ib12', 'SMS Support', 'sms', '#f5a623', '', 1, 'a1'],
    ['ib15', 'REST API', 'api', '#22d4e8', '', 1, 'a1'],
  ];
  for (const i of inboxes) {
    await run('INSERT INTO inboxes (id,name,type,color,greeting,active,agent_id) VALUES (?,?,?,?,?,?,?)', i);
  }

  console.log('✅ Database seeded successfully');
}

// ── Seed marketing data for existing DBs ──
async function seedMarketing() {
  try {
    const agent = await query('SELECT id FROM agents ORDER BY created_at ASC LIMIT 1', [], true);
    if (!agent) return;
    const aid = agent.id;

    // Seed segments if empty
    const segCount = await query('SELECT COUNT(*) as c FROM segments', [], true);
    if (segCount.c === 0) {
      const segs = [
        ['sg1', 'All Contacts', 'Every contact in your database', '[]', 5200, aid],
        ['sg2', 'Active Customers', 'Purchased in last 30 days', '[{"attr":"activity","op":"less_than","val":"30d"}]', 3100, aid],
        ['sg3', 'Inactive (30d+)', 'No activity for 30+ days', '[{"attr":"activity","op":"greater_than","val":"30d"}]', 1400, aid],
        ['sg4', 'High Value (VIP)', 'Lifetime value > $500', '[{"attr":"spend","op":"greater_than","val":"500"}]', 420, aid],
        ['sg5', 'New Signups (7d)', 'Registered in the last week', '[{"attr":"activity","op":"less_than","val":"7d"}]', 180, aid],
        ['sg6', 'Cart Abandoners', 'Items in cart, no purchase', '[{"attr":"status","op":"equals","val":"cart_abandoned"}]', 640, aid],
        ['sg7', 'Newsletter Subs', 'Opted in to email marketing', '[{"attr":"tags","op":"contains","val":"newsletter"}]', 8900, aid],
        ['sg8', 'Champions', 'Top 5% by engagement + spend', '[{"attr":"spend","op":"greater_than","val":"1000"}]', 150, aid],
      ];
      for (const s of segs) {
        await run('INSERT INTO segments (id,name,description,conditions,contact_count,agent_id) VALUES (?,?,?,?,?,?)', s);
      }
      console.log('✅ Marketing segments seeded');
    }

    // Seed campaigns if empty
    const campCount = await query('SELECT COUNT(*) as c FROM campaigns', [], true);
    if (campCount.c === 0) {
      const campaigns = [
        ['mk1', 'Diwali Sale Blast', 'whatsapp', 'promotion', 'sent', null, null, 'sg1', null, null, '{"sent":4820,"delivered":4680,"opens":3210,"clicks":890,"failed":140}', 0, aid],
        ['mk2', 'March Newsletter', 'email', 'engagement', 'active', 'What\'s new in March?', null, 'sg7', null, null, '{"sent":12400,"delivered":11800,"opens":4720,"clicks":1650,"failed":600}', 1, aid],
        ['mk3', 'Flash Sale Alert', 'sms', 'promotion', 'sent', null, null, 'sg2', null, null, '{"sent":2100,"delivered":2040,"opens":1530,"clicks":410,"failed":60}', 0, aid],
        ['mk4', 'Abandoned Cart Reminder', 'whatsapp', 'retention', 'active', null, null, 'sg6', null, null, '{"sent":890,"delivered":870,"opens":620,"clicks":340,"failed":20}', 0, aid],
        ['mk5', 'Product Launch', 'email', 'promotion', 'scheduled', 'Introducing our newest product', null, 'sg1', null, null, '{}', 1, aid],
        ['mk6', 'Appointment Reminder', 'sms', 'engagement', 'draft', null, null, null, null, null, '{}', 0, aid],
        ['mk7', 'Feedback Request', 'whatsapp', 'engagement', 'paused', null, null, 'sg2', null, null, '{"sent":1600,"delivered":1560,"opens":980,"clicks":220,"failed":40}', 0, aid],
        ['mk8', 'Welcome Series #1', 'email', 'retention', 'active', 'Welcome aboard!', null, 'sg5', null, null, '{"sent":890,"delivered":860,"opens":510,"clicks":180,"failed":30}', 0, aid],
        ['mk9', 'Re-engagement Push', 'whatsapp', 'retention', 'sent', null, null, 'sg3', null, null, '{"sent":2400,"delivered":2320,"opens":1680,"clicks":520,"failed":80}', 1, aid],
        ['mk10', 'Feature Announcement', 'email', 'engagement', 'sent', 'Big update inside', null, 'sg7', null, null, '{"sent":8600,"delivered":8200,"opens":3280,"clicks":980,"failed":400}', 0, aid],
        ['mk11', 'Flash Deal Push', 'push', 'promotion', 'sent', null, null, 'sg2', null, null, '{"sent":6200,"delivered":5900,"opens":2360,"clicks":820,"failed":300}', 0, aid],
        ['mk12', 'Abandoned Cart Nudge', 'push', 'retention', 'active', null, null, 'sg6', null, null, '{"sent":1800,"delivered":1720,"opens":1030,"clicks":480,"failed":80}', 0, aid],
      ];
      for (const c of campaigns) {
        await run('INSERT INTO campaigns (id,name,type,goal,status,subject,body,segment_id,scheduled_at,sent_at,stats,ab_test,agent_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', c);
      }
      console.log('✅ Marketing campaigns seeded');
    }

    // Seed templates if empty
    const tplCount = await query('SELECT COUNT(*) as c FROM campaign_templates', [], true);
    if (tplCount.c === 0) {
      const tpls = [
        ['tl1', 'Welcome Series #1', 'email', 'Onboarding', 'First-touch welcome with getting started CTA', 'Welcome to {{company}}, {{first_name}}!', 'Welcome to {{company}}, {{first_name}}! We are thrilled to have you. Get started: {{link}}', aid],
        ['tl2', 'Seasonal Sale', 'email', 'Promotion', 'Limited-time discount announcement', '{{discount}}% OFF — Limited Time!', '{{first_name}}, our biggest sale of the season is here! {{discount}}% off everything. Shop: {{link}}', aid],
        ['tl3', 'Win-Back', 'email', 'Retention', 'Re-engage inactive users with offer', 'We miss you, {{first_name}}!', 'We miss you, {{first_name}}! Come back and get {{discount}}% off your next order: {{link}}', aid],
        ['tl4', 'Payment Reminder', 'email', 'Billing', 'Upcoming payment due notification', 'Payment due on {{date}}', 'Hi {{first_name}}, your payment of {{amount}} is due on {{date}}. Pay now: {{link}}', aid],
        ['tl5', 'Newsletter', 'email', 'Engagement', 'Monthly digest with highlights', 'What is new this month at {{company}}', 'Hi {{first_name}}, here is what happened this month at {{company}}. Read more: {{link}}', aid],
        ['tl6', 'Flash Sale', 'whatsapp', 'Promotion', 'Urgency-driven time-limited offer', null, 'FLASH SALE! {{discount}}% off for {{hours}} hours only. Shop now: {{link}}\n\nReply STOP to unsubscribe', aid],
        ['tl7', 'Cart Recovery', 'whatsapp', 'Retention', 'Abandoned cart reminder with link', null, 'Hey {{first_name}}! You left {{product}} in your cart. Complete your order: {{link}}\n\nReply STOP to unsubscribe', aid],
        ['tl8', 'Feedback Request', 'whatsapp', 'Engagement', 'Post-purchase review request', null, 'Hi {{first_name}}, how was {{product}}? Share feedback: {{link}}\n\nReply STOP to unsubscribe', aid],
        ['tl9', 'Welcome Message', 'whatsapp', 'Onboarding', 'First WhatsApp touchpoint', null, 'Welcome to {{company}}, {{first_name}}! We are here to help 24/7. Get started: {{link}}\n\nReply STOP to unsubscribe', aid],
        ['tl10', 'Promo Code', 'sms', 'Promotion', 'Exclusive discount code delivery', null, '{{first_name}}, your exclusive code: {{code}}. {{discount}}% OFF. Valid {{date}}. {{link}}', aid],
        ['tl11', 'Appointment Reminder', 'sms', 'Transactional', 'Booking/appointment confirmation', null, 'Reminder: {{first_name}}, appt on {{date}} at {{time}}. Reply C to confirm.', aid],
        ['tl12', 'Payment Due SMS', 'sms', 'Billing', 'Payment deadline alert', null, 'Hi {{first_name}}, {{amount}} due on {{date}}. Pay: {{link}} Reply STOP to opt out', aid],
        ['tl13', 'Deal Alert', 'push', 'Promotion', 'Time-sensitive push offer', null, '{{discount}}% OFF everything! Ends in {{hours}} hrs. Tap to shop.', aid],
        ['tl14', 'Come Back', 'push', 'Retention', 'Re-engagement push for dormant users', null, 'We miss you, {{first_name}}! {{discount}}% off to welcome you back.', aid],
        ['tl15', 'New Feature', 'push', 'Engagement', 'Product update notification', null, 'New: {{product}} just launched! Be the first to try it.', aid],
      ];
      for (const t of tpls) {
        await run('INSERT INTO campaign_templates (id,name,type,category,description,subject,body,agent_id) VALUES (?,?,?,?,?,?,?,?)', t);
      }
      console.log('✅ Marketing templates seeded');
    }

    // Seed automations if empty
    const autoCount = await query('SELECT COUNT(*) as c FROM automations', [], true);
    if (autoCount.c === 0) {
      const autos = [
        ['auto1', 'Welcome Series', 'Contact Created', '[]', '["Send welcome email","Wait 2 days","Send tips email","Wait 3 days","Send offer email"]', 1, 1240, aid],
        ['auto2', 'Cart Recovery', 'Cart Abandoned', '[]', '["Wait 1 hour","Send WhatsApp reminder","Wait 24 hours","Send discount email"]', 1, 640, aid],
        ['auto3', 'Post-Purchase Review', 'Order Delivered', '[]', '["Wait 3 days","Send feedback WhatsApp","Wait 5 days","Send NPS email"]', 1, 2100, aid],
        ['auto4', 'Re-engagement', 'Inactive 30 days', '[]', '["Send miss-you email","Wait 7 days","Send SMS offer","Wait 14 days","Mark as churned"]', 0, 450, aid],
        ['auto5', 'Birthday Offer', 'Birthday Match', '[]', '["Send birthday WhatsApp","Apply 20% coupon"]', 1, 320, aid],
        ['auto6', 'Payment Reminder', 'Payment Due', '[]', '["Send SMS 3 days before","Send email 1 day before","Send SMS on due date"]', 1, 890, aid],
      ];
      for (const a of autos) {
        await run('INSERT INTO automations (id,name,trigger_type,conditions,actions,active,run_count,agent_id) VALUES (?,?,?,?,?,?,?,?)', a);
      }
      console.log('✅ Marketing automations seeded');
    }
  } catch (e) {
    console.error('Marketing seed error:', e.message);
  }
}

// ── Generic API ──

async function query(sql, params = [], single = false) {
  // Basic translation for common functions
  let mysqlSql = sql
    .replace(/date\('now'\)/gi, 'CURDATE()')
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/strftime\('%Y-%m-%d', updated_at\)/gi, 'DATE(updated_at)')
    .replace(/COALESCE\(SUM\(value\),0\)/gi, 'IFNULL(SUM(value),0)');

  const [rows] = await db.execute(mysqlSql, params);
  return single ? (rows[0] || null) : rows;
}

async function run(sql, params = []) {
  let mysqlSql = sql
    .replace(/date\('now'\)/gi, 'CURDATE()')
    .replace(/datetime\('now'\)/gi, 'NOW()');
  const [result] = await db.execute(mysqlSql, params);
  return result;
}

// This wrapper allows the transition, though callers should use await query/run
const dbWrapper = {
  init,
  query,
  run,
  // Helper for things already using db.prepare(...).get()
  prepare: (sql) => ({
    get: (...params) => query(sql, params, true),
    all: (...params) => query(sql, params, false),
    run: (...params) => run(sql, params)
  })
};

module.exports = dbWrapper;
