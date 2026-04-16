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
    connectionLimit: 50,
    queueLimit: 20,
    idleTimeout: 60000,
    enableKeepAlive: true,
    charset: 'UTF8MB4_GENERAL_CI',
  });
  // Belt-and-suspenders: also SET NAMES on every new connection
  db.pool.on('connection', (conn) => {
    conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_general_ci", (err) => {
      if (err) console.error('SET NAMES utf8mb4 failed:', err.message);
    });
  });
  console.log('Using MySQL database:', database);

  try { await createSchema(); } catch (e) { console.error('createSchema error (non-fatal):', e.message); }
  await ensureSchemaColumns();
  await seed();
  await seedChatChannels();
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
  campaign_id VARCHAR(255),
  campaign_name VARCHAR(255),
  channel VARCHAR(50) DEFAULT 'live',
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

-- Contact Groups
CREATE TABLE IF NOT EXISTS contact_groups (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(50) DEFAULT '#6366f1',
  icon VARCHAR(20) DEFAULT 'group',
  contact_count INT DEFAULT 0,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_group_members (
  id VARCHAR(255) PRIMARY KEY,
  group_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255) NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Meta-approved message templates
CREATE TABLE IF NOT EXISTS whatsapp_meta_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  language VARCHAR(20) DEFAULT 'en_US',
  status VARCHAR(50) DEFAULT 'pending',
  header_type VARCHAR(20) DEFAULT 'NONE',
  header_text TEXT,
  header_media_url TEXT,
  body TEXT NOT NULL,
  footer TEXT,
  buttons TEXT,
  components TEXT,
  meta_template_id VARCHAR(255),
  inbox_id VARCHAR(255) NOT NULL,
  rejection_reason TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Campaign send log for real-time tracking
CREATE TABLE IF NOT EXISTS campaign_send_log (
  id VARCHAR(255) PRIMARY KEY,
  campaign_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(255),
  channel VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  sent_at DATETIME,
  delivered_at DATETIME,
  read_at DATETIME,
  clicked_at DATETIME,
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

-- Departments (User Management)
CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  agent_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
      // ── sms_message_id for Twilio SMS dedup/tracking ─────────────────
      if (!msgCols.has('sms_message_id')) {
        await run('ALTER TABLE messages ADD COLUMN sms_message_id VARCHAR(512) NULL');
        await run('ALTER TABLE messages ADD INDEX idx_sms_message_id (sms_message_id)');
        console.log('✅ Added sms_message_id to messages');
      }
      // ── html column for original email HTML body ─────────────────────
      if (!msgCols.has('html')) {
        await run('ALTER TABLE messages ADD COLUMN html MEDIUMTEXT CHARACTER SET utf8mb4 NULL');
        console.log('✅ Added html to messages');
      } else {
        // Upgrade TEXT → MEDIUMTEXT and ensure utf8mb4 charset
        const htmlCol = (await query("SHOW COLUMNS FROM messages LIKE 'html'"))[0];
        if (htmlCol && (htmlCol.Type === 'text' || !htmlCol.Collation?.startsWith('utf8mb4'))) {
          await run('ALTER TABLE messages MODIFY COLUMN html MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL');
          console.log('✅ Upgraded html column to MEDIUMTEXT utf8mb4');
        }
      }
      // ── Ensure text column is utf8mb4 ────────────────────────────────
      const textCol = (await query("SHOW COLUMNS FROM messages LIKE 'text'"))[0];
      if (textCol && textCol.Collation && !textCol.Collation.startsWith('utf8mb4')) {
        await run('ALTER TABLE messages MODIFY COLUMN text TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL');
        console.log('✅ Upgraded text column to utf8mb4');
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
      if (!cvCols.has('campaign_id')) {
        await run('ALTER TABLE conversations ADD COLUMN campaign_id VARCHAR(255)');
        console.log('✅ Added campaign_id to conversations');
      }
      if (!cvCols.has('campaign_name')) {
        await run('ALTER TABLE conversations ADD COLUMN campaign_name VARCHAR(255)');
        console.log('✅ Added campaign_name to conversations');
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
      if (!campCols.has('wa_template_id')) {
        await run('ALTER TABLE campaigns ADD COLUMN wa_template_id VARCHAR(255) DEFAULT NULL');
        console.log('✅ Added wa_template_id to campaigns');
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

    // ── crm_activities: missing columns ─────────────────────────────
    try {
      const actCols = new Set((await query('SHOW COLUMNS FROM crm_activities')).map(c => c.Field));
      const actAdds = [
        ['entity_type', "ALTER TABLE crm_activities ADD COLUMN entity_type VARCHAR(100)"],
        ['entity_id',   "ALTER TABLE crm_activities ADD COLUMN entity_id VARCHAR(255)"],
        ['performer_id',"ALTER TABLE crm_activities ADD COLUMN performer_id VARCHAR(255)"],
        ['metadata',    "ALTER TABLE crm_activities ADD COLUMN metadata TEXT"],
        ['agent_id',    "ALTER TABLE crm_activities ADD COLUMN agent_id VARCHAR(255)"],
      ];
      for (const [col, sql] of actAdds) {
        if (!actCols.has(col)) {
          await run(sql);
          console.log(`✅ Added ${col} to crm_activities`);
        }
      }
    } catch (e) { console.error('crm_activities columns:', e.message); }

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
      'campaign_templates', 'booking_pages', 'calendar_events', 'kb_categories', 'kb_articles',
      'forms', 'signatures', 'webhooks', 'api_keys', 'sla_policies', 'brands'
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

    // ── Ensure contact_groups & contact_group_members tables exist ────────
    try {
      const [tables] = await db.query("SHOW TABLES LIKE 'contact_groups'");
      if (tables.length === 0) {
        await run(`CREATE TABLE IF NOT EXISTS contact_groups (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          color VARCHAR(50) DEFAULT '#6366f1',
          icon VARCHAR(20) DEFAULT 'group',
          contact_count INT DEFAULT 0,
          agent_id VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Created contact_groups table');
      }
    } catch (e) { console.error('contact_groups table:', e.message); }

    try {
      const [tables] = await db.query("SHOW TABLES LIKE 'contact_group_members'");
      if (tables.length === 0) {
        await run(`CREATE TABLE IF NOT EXISTS contact_group_members (
          id VARCHAR(255) PRIMARY KEY,
          group_id VARCHAR(255) NOT NULL,
          contact_id VARCHAR(255) NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Created contact_group_members table');
      }
    } catch (e) { console.error('contact_group_members table:', e.message); }

    // ── Ensure campaign_send_log table exists ─────────────────────────────
    try {
      const [cslTables] = await db.query("SHOW TABLES LIKE 'campaign_send_log'");
      if (cslTables.length === 0) {
        await run(`CREATE TABLE IF NOT EXISTS campaign_send_log (
          id VARCHAR(255) PRIMARY KEY,
          campaign_id VARCHAR(255) NOT NULL,
          contact_id VARCHAR(255),
          contact_name VARCHAR(255),
          contact_email VARCHAR(255),
          contact_phone VARCHAR(255),
          channel VARCHAR(50),
          status VARCHAR(50) DEFAULT 'pending',
          error_message TEXT,
          sent_at DATETIME,
          delivered_at DATETIME,
          read_at DATETIME,
          clicked_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Created campaign_send_log table');
      }
    } catch (e) { console.error('campaign_send_log table:', e.message); }

    // ── campaign_send_log: add wa_message_id for delivery tracking ──────
    try {
      const cslCols = await query('SHOW COLUMNS FROM campaign_send_log');
      const cslColNames = new Set(cslCols.map(c => c.Field));
      if (!cslColNames.has('wa_message_id')) {
        await run('ALTER TABLE campaign_send_log ADD COLUMN wa_message_id VARCHAR(512) NULL');
        await run('ALTER TABLE campaign_send_log ADD INDEX idx_csl_wa_msg_id (wa_message_id)');
        console.log('✅ Added wa_message_id to campaign_send_log');
      }
      if (!cslColNames.has('sms_message_id')) {
        await run('ALTER TABLE campaign_send_log ADD COLUMN sms_message_id VARCHAR(512) NULL');
        await run('ALTER TABLE campaign_send_log ADD INDEX idx_csl_sms_msg_id (sms_message_id)');
        console.log('✅ Added sms_message_id to campaign_send_log');
      }
    } catch (e) { console.error('campaign_send_log wa_message_id/sms_message_id:', e.message); }

    // ── chat_messages: add seen_by + fix text charset ──────────────────
    try {
      const chatMsgCols = await query('SHOW COLUMNS FROM chat_messages');
      const chatMsgColNames = new Set(chatMsgCols.map(c => c.Field));

      if (!chatMsgColNames.has('seen_by')) {
        await run('ALTER TABLE chat_messages ADD COLUMN seen_by TEXT DEFAULT NULL');
        console.log('✅ Added seen_by to chat_messages');
      }
      if (!chatMsgColNames.has('delivered')) {
        await run('ALTER TABLE chat_messages ADD COLUMN delivered TINYINT DEFAULT 1');
        console.log('✅ Added delivered to chat_messages');
      }

      // Fix chat_messages.text to utf8mb4_general_ci so emojis store without collation conflicts
      const textCol = chatMsgCols.find(c => c.Field === 'text');
      if (textCol && textCol.Collation && textCol.Collation === 'utf8mb4_unicode_ci') {
        // Convert back to general_ci to match agents table and avoid collation conflicts
        await run('ALTER TABLE chat_messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
        console.log('✅ Fixed chat_messages collation to utf8mb4_general_ci');
      } else if (textCol && textCol.Collation && !textCol.Collation.startsWith('utf8mb4')) {
        await run('ALTER TABLE chat_messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
        console.log('✅ Converted chat_messages to utf8mb4_general_ci');
      }
    } catch (e) { console.error('chat_messages schema update:', e.message); }

    // ── whatsapp_meta_templates: ensure table exists ───────────────────
    try {
      const [wmtTables] = await db.query("SHOW TABLES LIKE 'whatsapp_meta_templates'");
      if (wmtTables.length === 0) {
        await run(`CREATE TABLE IF NOT EXISTS whatsapp_meta_templates (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(50) NOT NULL,
          language VARCHAR(20) DEFAULT 'en_US',
          status VARCHAR(50) DEFAULT 'pending',
          header_type VARCHAR(20) DEFAULT 'NONE',
          header_text TEXT,
          header_media_url TEXT,
          body TEXT NOT NULL,
          footer TEXT,
          buttons TEXT,
          components TEXT,
          meta_template_id VARCHAR(255),
          inbox_id VARCHAR(255) NOT NULL,
          rejection_reason TEXT,
          agent_id VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        console.log('✅ Created whatsapp_meta_templates table');
      }
    } catch (e) { console.error('whatsapp_meta_templates table:', e.message); }

    // ── chat_channels: add topic column ────────────────────────────────
    try {
      const chatChCols = await query('SHOW COLUMNS FROM chat_channels');
      const chatChColNames = new Set(chatChCols.map(c => c.Field));
      if (!chatChColNames.has('topic')) {
        await run('ALTER TABLE chat_channels ADD COLUMN topic TEXT DEFAULT NULL');
        console.log('✅ Added topic to chat_channels');
      }
    } catch (e) { console.error('chat_channels schema update:', e.message); }

    // ── visitor_sessions: add full real-tracking columns ────────────────
    try {
      const vsCols = new Set((await query('SHOW COLUMNS FROM visitor_sessions')).map(c => c.Field));
      const vsAdds = [
        ['ip',           "ALTER TABLE visitor_sessions ADD COLUMN ip VARCHAR(100)"],
        ['flag',         "ALTER TABLE visitor_sessions ADD COLUMN flag VARCHAR(20) DEFAULT '🌍'"],
        ['country_code', "ALTER TABLE visitor_sessions ADD COLUMN country_code VARCHAR(10)"],
        ['region',       "ALTER TABLE visitor_sessions ADD COLUMN region VARCHAR(255)"],
        ['lat',          "ALTER TABLE visitor_sessions ADD COLUMN lat DECIMAL(10,6)"],
        ['lng',          "ALTER TABLE visitor_sessions ADD COLUMN lng DECIMAL(10,6)"],
        ['referrer',     "ALTER TABLE visitor_sessions ADD COLUMN referrer VARCHAR(1000)"],
        ['browser',      "ALTER TABLE visitor_sessions ADD COLUMN browser VARCHAR(255)"],
        ['os',           "ALTER TABLE visitor_sessions ADD COLUMN os VARCHAR(255)"],
        ['screen_width', "ALTER TABLE visitor_sessions ADD COLUMN screen_width INT"],
        ['screen_height',"ALTER TABLE visitor_sessions ADD COLUMN screen_height INT"],
        ['language',     "ALTER TABLE visitor_sessions ADD COLUMN language VARCHAR(50)"],
        ['status',       "ALTER TABLE visitor_sessions ADD COLUMN status VARCHAR(50) DEFAULT 'browsing'"],
        ['visitor_name', "ALTER TABLE visitor_sessions ADD COLUMN visitor_name VARCHAR(255)"],
        ['visitor_email',"ALTER TABLE visitor_sessions ADD COLUMN visitor_email VARCHAR(255)"],
        ['pages_visited',"ALTER TABLE visitor_sessions ADD COLUMN pages_visited INT DEFAULT 1"],
        ['page_history', "ALTER TABLE visitor_sessions ADD COLUMN page_history TEXT"],
        // Use NULL default so old rows don't get current timestamp and appear as "live"
        ['last_seen',    "ALTER TABLE visitor_sessions ADD COLUMN last_seen DATETIME"],
        ['user_agent',   "ALTER TABLE visitor_sessions ADD COLUMN user_agent TEXT"],
      ];
      for (const [col, sql] of vsAdds) {
        if (!vsCols.has(col)) {
          await run(sql);
          console.log(`✅ Added ${col} to visitor_sessions`);
        }
      }
      // Always wipe rows that are not real tracker sessions:
      // - session_id NULL  = inserted by old simulation code, not the tracker
      // - ip NULL or empty = no real visitor data
      // - last_seen NULL   = pre-tracker row that never got a heartbeat
      await run("DELETE FROM visitor_sessions WHERE session_id IS NULL OR session_id = '' OR ip IS NULL OR ip = '' OR last_seen IS NULL");
      console.log('🧹 Removed non-real visitor sessions on startup');
    } catch (e) { console.error('visitor_sessions columns:', e.message); }

    // ── agents: department_id + permissions for User Management ────────
    try {
      const agCols = new Set((await query('SHOW COLUMNS FROM agents')).map(c => c.Field));
      if (!agCols.has('department_id')) {
        await run('ALTER TABLE agents ADD COLUMN department_id VARCHAR(255) DEFAULT NULL');
        console.log('✅ Added department_id to agents');
      }
      if (!agCols.has('permissions')) {
        await run('ALTER TABLE agents ADD COLUMN permissions TEXT DEFAULT NULL');
        console.log('✅ Added permissions to agents');
      }
    } catch (e) { console.error('agents department/permissions columns:', e.message); }

    // ── ai_agents: add agent_id column ─────────────────────────────────
    try {
      const aiAgCols = new Set((await query('SHOW COLUMNS FROM ai_agents')).map(c => c.Field));
      if (!aiAgCols.has('agent_id')) {
        await run('ALTER TABLE ai_agents ADD COLUMN agent_id VARCHAR(255)');
        console.log('✅ Added agent_id to ai_agents');
      }
    } catch (e) { console.error('ai_agents agent_id column:', e.message); }

    // ── Ensure automations has completed_count column ─────────────────────
    try {
      const autoCols = new Set((await query('SHOW COLUMNS FROM automations')).map(c => c.Field));
      if (!autoCols.has('completed_count')) {
        await run('ALTER TABLE automations ADD COLUMN completed_count INT DEFAULT 0');
        console.log('✅ Added completed_count to automations');
      }
    } catch (e) { console.error('automations completed_count column:', e.message); }

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

  // Clean up seed marketing data
  const seedCampIds = ['mk1','mk2','mk3','mk4','mk5','mk6','mk7','mk8','mk9','mk10','mk11','mk12'];
  const seedSegIds = ['sg1','sg2','sg3','sg4','sg5','sg6','sg7','sg8'];
  const seedTplIds = ['tl1','tl2','tl3','tl4','tl5','tl6','tl7','tl8','tl9','tl10','tl11','tl12','tl13','tl14','tl15'];
  const seedAutoIds = ['auto1','auto2','auto3','auto4','auto5','auto6'];

  for (const id of seedCampIds) { await run('DELETE FROM campaigns WHERE id=?', [id]); }
  for (const id of seedSegIds) { await run('DELETE FROM segments WHERE id=?', [id]); }
  for (const id of seedTplIds) { await run('DELETE FROM campaign_templates WHERE id=?', [id]); }
  for (const id of seedAutoIds) { await run('DELETE FROM automations WHERE id=?', [id]); }

  console.log('🧹 Cleaned up seed contacts, conversations & marketing data');
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

  // Default chat channels — visible to all agents from day one
  const allMembers = JSON.stringify(['a1','a2','a3','a4']);
  const channels = [
    ['ch_general',   'general',             'General company updates and announcements', 'public', allMembers, 'a1'],
    ['ch_support',   'support-escalations', 'Escalate tricky customer tickets here',    'public', allMembers, 'a1'],
    ['ch_eng',       'engineering-help',    'Ask the dev team for technical help',       'public', allMembers, 'a1'],
    ['ch_sales',     'sales-handoffs',      'Pass qualified leads to the sales team',    'public', allMembers, 'a1'],
    ['ch_random',    'random',              'Non-work banter and watercooler chat',      'public', allMembers, 'a1'],
    ['ch_feedback',  'product-feedback',    'Customer feedback and feature requests',    'public', allMembers, 'a1'],
    ['ch_ai',        'ai-experiments',      'Testing and sharing AI features',           'public', allMembers, 'a1'],
  ];
  for (const [id, name, description, type, members, created_by] of channels) {
    await run('INSERT INTO chat_channels (id,name,description,type,members,created_by) VALUES (?,?,?,?,?,?)',
      [id, name, description, type, members, created_by]);
  }

  console.log('✅ Database seeded successfully');
}

// ── Seed default chat channels for existing DBs with no channels ──
async function seedChatChannels() {
  try {
    const row = await query('SELECT COUNT(*) as c FROM chat_channels WHERE type != ?', ['dm'], true);
    if (row.c > 0) return; // channels already exist

    // Get all agent IDs from DB (don't hardcode — works for any install)
    const agentRows = await query('SELECT id FROM agents ORDER BY created_at ASC LIMIT 20', [], false);
    const agentIds = agentRows.map(a => a.id);
    if (agentIds.length === 0) return;

    const creatorId = agentIds[0];
    const allMembers = JSON.stringify(agentIds);

    const channels = [
      ['ch_general',  'general',             'General company updates and announcements', 'public'],
      ['ch_support',  'support-escalations', 'Escalate tricky customer tickets here',    'public'],
      ['ch_eng',      'engineering-help',    'Ask the dev team for technical help',       'public'],
      ['ch_sales',    'sales-handoffs',      'Pass qualified leads to the sales team',    'public'],
      ['ch_random',   'random',              'Non-work banter and watercooler chat',      'public'],
      ['ch_feedback', 'product-feedback',   'Customer feedback and feature requests',    'public'],
      ['ch_ai',       'ai-experiments',     'Testing and sharing AI features',           'public'],
    ];

    for (const [id, name, description, type] of channels) {
      await run(
        'INSERT IGNORE INTO chat_channels (id,name,description,type,members,created_by) VALUES (?,?,?,?,?,?)',
        [id, name, description, type, allMembers, creatorId]
      );
    }
    console.log('✅ Default chat channels created');
  } catch (e) {
    console.error('seedChatChannels (non-fatal):', e.message);
  }
}

// ── Seed marketing data for existing DBs ──
async function seedMarketing() {
  // No dummy data — campaigns, segments, templates, and automations start empty
  // Users create their own real data through the UI
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
