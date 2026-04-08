require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

// ── Init DB (creates schema + seeds) ──
const db = require('./db');
(async () => {
  try {
    await db.init();
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
})();

const app = express();
const server = http.createServer(app);

// ── WebSocket ──
const { setupWebSocket } = require('./ws');
setupWebSocket(server);

// ── Middleware ──
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── File uploads ──
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_')),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

app.post('/api/upload', require('./middleware/auth'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: `/uploads/${req.file.filename}`, name: req.file.originalname, size: req.file.size });
});

app.use('/uploads', express.static(uploadDir));

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
});

// ── Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/kb', require('./routes/kb'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/ai', require('./routes/ai'));

// Live monitor - visitor sessions
app.use('/api/monitor', require('./middleware/auth'), (req, res) => {
  if (req.method === 'GET') {
    // Simulate real-time visitors
    const visitors = Array.from({ length: Math.floor(Math.random() * 12) + 3 }, (_, i) => ({
      id: `v${i + 1}`,
      page: ['/pricing', '/features', '/docs', '/', '/blog', '/contact'][Math.floor(Math.random() * 6)],
      country: ['India', 'United States', 'Germany', 'Brazil', 'Japan', 'UK', 'France', 'Canada'][Math.floor(Math.random() * 8)],
      city: ['Chennai', 'New York', 'Berlin', 'São Paulo', 'Tokyo'][Math.floor(Math.random() * 5)],
      source: ['Google', 'Direct', 'Twitter', 'LinkedIn', 'Referral'][Math.floor(Math.random() * 5)],
      device: Math.random() > 0.5 ? 'desktop' : 'mobile',
      duration: Math.floor(Math.random() * 600) + 30,
      intent: ['buyer', 'researcher', 'support_seeker', 'competitor'][Math.floor(Math.random() * 4)],
    }));
    return res.json({ visitors, total: visitors.length });
  }
  res.json({ success: true });
});

// Notifications
app.use('/api/notifications', require('./middleware/auth'), async (req, res) => {
  const auth = require('./middleware/auth');
  if (req.method === 'GET') {
    const notifs = await db.prepare('SELECT * FROM notifications WHERE agent_id=? ORDER BY created_at DESC LIMIT 20').all(req.agent.id);
    return res.json({ notifications: notifs });
  }
  if (req.method === 'PATCH') {
    await db.prepare('UPDATE notifications SET read=1 WHERE agent_id=?').run(req.agent.id);
    return res.json({ success: true });
  }
  res.json({ success: true });
});

// Integrations list
app.get('/api/integrations', require('./middleware/auth'), (req, res) => {
  const integrations = [
    { id: 'int1', name: 'Slack', category: 'Communication', connected: false, icon: '💬', description: 'Get notifications and create tickets from Slack' },
    { id: 'int2', name: 'Jira', category: 'Project Management', connected: false, icon: '📋', description: 'Sync tickets with Jira issues' },
    { id: 'int3', name: 'HubSpot', category: 'CRM', connected: false, icon: '🧲', description: 'Sync contacts and deals with HubSpot' },
    { id: 'int4', name: 'Salesforce', category: 'CRM', connected: false, icon: '☁️', description: 'Bidirectional sync with Salesforce' },
    { id: 'int5', name: 'Stripe', category: 'Payments', connected: true, icon: '💳', description: 'View customer billing info in conversations' },
    { id: 'int6', name: 'Shopify', category: 'E-commerce', connected: false, icon: '🛍️', description: 'Pull order details into support context' },
    { id: 'int7', name: 'Google Analytics', category: 'Analytics', connected: false, icon: '📊', description: 'Track support widget performance' },
    { id: 'int8', name: 'Zapier', category: 'Automation', connected: false, icon: '⚡', description: 'Connect SupportDesk to 5000+ apps' },
    { id: 'int9', name: 'GitHub', category: 'Developer', connected: true, icon: '🐙', description: 'Link issues to GitHub repos' },
    { id: 'int10', name: 'Intercom', category: 'Migration', connected: false, icon: '🚀', description: 'Import data from Intercom' },
    { id: 'int11', name: 'Zendesk', category: 'Migration', connected: false, icon: '🎯', description: 'Import data from Zendesk' },
    { id: 'int12', name: 'Twilio', category: 'Communication', connected: false, icon: '📞', description: 'SMS and voice via Twilio' },
  ];
  res.json({ integrations });
});

app.patch('/api/integrations/:id', require('./middleware/auth'), (req, res) => {
  res.json({ success: true, message: 'Integration config saved' });
});

// ── 404 fallback ──
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ──
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  SupportDesk Backend                    ║
║  → http://localhost:${PORT}               ║
║  → WebSocket: ws://localhost:${PORT}/ws   ║
║  → Health: http://localhost:${PORT}/health║
╚══════════════════════════════════════════╝
  `);
});
