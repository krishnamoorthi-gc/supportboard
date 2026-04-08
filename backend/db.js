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

  // Now connect with DB
  db = await mysql.createConnection({
    host,
    user,
    password,
    database,
    multipleStatements: true
  });
  console.log('Using MySQL database:', database);

  await createSchema();
  await seed();
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Labels
CREATE TABLE IF NOT EXISTS labels (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  color VARCHAR(50) DEFAULT '#4c82fb',
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
  code VARCHAR(100) UNIQUE NOT NULL,
  content TEXT NOT NULL,
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CRM - Deals
CREATE TABLE IF NOT EXISTS deals (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  value DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  stage VARCHAR(100) DEFAULT 'Prospecting',
  probability INT DEFAULT 20,
  contact_id VARCHAR(255),
  company_id VARCHAR(255),
  owner_id VARCHAR(255),
  expected_close DATE,
  notes TEXT,
  custom_fields TEXT,
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
  source VARCHAR(100),
  status VARCHAR(50) DEFAULT 'New',
  score INT DEFAULT 50,
  value DECIMAL(15,2) DEFAULT 0,
  owner_id VARCHAR(255),
  notes TEXT,
  custom_fields TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- CRM - Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATETIME,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'todo',
  assignee_id VARCHAR(255),
  related_type VARCHAR(50),
  related_id VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- CRM - Meetings
CREATE TABLE IF NOT EXISTS meetings (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time DATETIME,
  end_time DATETIME,
  location VARCHAR(255),
  meeting_link VARCHAR(255),
  attendees TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  related_type VARCHAR(50),
  related_id VARCHAR(255),
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

-- Marketing
CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft',
  subject VARCHAR(255),
  body TEXT,
  segment_id VARCHAR(255),
  scheduled_at DATETIME,
  sent_at DATETIME,
  stats TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS segments (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  conditions TEXT,
  contact_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  subject VARCHAR(255),
  body TEXT,
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
`;

  await db.query(schema.replace(/TEXT DEFAULT \(datetime\('now'\)\)/g, "DATETIME DEFAULT CURRENT_TIMESTAMP")
                       .replace(/TEXT DEFAULT '\[\]'/g, "TEXT")
                       .replace(/TEXT DEFAULT '{}'/g, "TEXT")
                       .replace(/INTEGER DEFAULT 0/g, "TINYINT DEFAULT 0")
                       .replace(/INTEGER DEFAULT 1/g, "TINYINT DEFAULT 1"));
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
    ['ib1', 'Website Chat', 'live', '#1fd07a', 'Hi! How can we help?', 1],
    ['ib2', 'Support Email', 'email', '#4c82fb', '', 1],
    ['ib3', 'WhatsApp Business', 'whatsapp', '#25d366', 'Hello!', 1],
    ['ib4', 'Telegram Bot', 'telegram', '#0088cc', '', 0],
    ['ib5', 'Facebook Page', 'facebook', '#1877f2', 'Hi! Thanks for reaching out.', 1],
    ['ib6', 'Instagram DMs', 'instagram', '#e1306c', 'Hi! We got your DM.', 1],
    ['ib11', 'X (Twitter) DMs', 'x', '#e7e9ea', 'Hi there! How can we help?', 1],
    ['ib12', 'SMS Support', 'sms', '#f5a623', '', 1],
    ['ib15', 'REST API', 'api', '#22d4e8', '', 1],
  ];
  for (const i of inboxes) {
    await run('INSERT INTO inboxes (id,name,type,color,greeting,active) VALUES (?,?,?,?,?,?)', i);
  }

  // Contacts
  const contacts = [
    ['ct1', 'Alice Johnson', 'alice@techcorp.com', '+1 555 0101', 'TechCorp', '#4c82fb', '["vip","enterprise"]'],
    ['ct2', 'Bob Martinez', 'bob@startup.io', '+1 555 0102', 'StartupIO', '#1fd07a', '["trial"]'],
    ['ct3', 'Carol Chen', 'carol@enterprise.com', '+1 555 0103', 'Enterprise Co', '#9b6dff', '["enterprise","vip"]'],
    ['ct4', 'David Kim', 'david@freelance.dev', '+1 555 0104', 'Freelance', '#f5a623', '[]'],
    ['ct5', 'Emma Wilson', 'emma@agency.com', '+1 555 0105', 'Creative Agency', '#f04f5a', '["agency"]'],
    ['ct6', 'Frank Brown', 'retail@retail.com', '+1 555 0106', 'RetailCo', '#22d4e8', '[]'],
  ];
  for (const c of contacts) {
    await run('INSERT INTO contacts (id,name,email,phone,company,color,tags) VALUES (?,?,?,?,?,?,?)', c);
  }

  // Conversations
  const convos = [
    ['cv1', 'API rate limit exceeded', 'open', 'urgent', 'ct1', 'ib2', 'a1', '["api","urgent"]', '#f04f5a'],
    ['cv2', 'Billing question for enterprise plan', 'open', 'high', 'ct2', 'ib1', 'a2', '["billing"]', '#f5a623'],
    ['cv3', 'WhatsApp integration not working', 'open', 'high', 'ct3', 'ib3', 'a3', '["bug"]', '#4c82fb'],
  ];
  for (const c of convos) {
    await run('INSERT INTO conversations (id,subject,status,priority,contact_id,inbox_id,assignee_id,labels,color) VALUES (?,?,?,?,?,?,?,?,?)', c);
  }

  console.log('✅ Database seeded successfully');
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
