const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const clients = new Map(); // agentId -> Set<ws>

// Lazy-load db to update agent status
let _db = null;
const getDb = () => {
  if (!_db) try { _db = require('./db'); } catch {}
  return _db;
};
const updateAgentStatus = (agentId, status) => {
  try {
    const db = getDb();
    if (db && db.run) {
      db.run('UPDATE agents SET status=? WHERE id=?', [status, agentId]).catch(() => {});
    }
  } catch {}
};

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Auth from query param
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    let agentId = null;

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'supportdesk_secret');
        agentId = payload.id;
        if (!clients.has(agentId)) clients.set(agentId, new Set());
        clients.get(agentId).add(ws);
      } catch {}
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(ws, agentId, msg);
      } catch {}
    });

    ws.on('close', () => {
      if (agentId && clients.has(agentId)) {
        clients.get(agentId).delete(ws);
        if (clients.get(agentId).size === 0) {
          clients.delete(agentId);
          // Persist offline status to DB
          updateAgentStatus(agentId, 'offline');
          broadcast({ type: 'presence', agentId, status: 'offline' });
        }
      }
    });

    // Send welcome + current online agent list so new connections know who's live
    send(ws, {
      type: 'connected',
      agentId,
      timestamp: new Date().toISOString(),
      onlineAgents: [...clients.keys()],
    });

    // Announce presence + persist to DB
    if (agentId) {
      updateAgentStatus(agentId, 'online');
      broadcast({ type: 'presence', agentId, status: 'online' }, agentId);
    }
  });

  return wss;
}

function handleMessage(ws, senderId, msg) {
  switch (msg.type) {
    case 'ping':
      send(ws, { type: 'pong' });
      break;
    case 'typing':
      broadcast({ type: 'typing', from: senderId, conversationId: msg.conversationId, isTyping: msg.isTyping }, senderId);
      break;
    case 'chat_message':
      broadcast({ type: 'chat_message', from: senderId, channelId: msg.channelId, message: msg.message });
      break;
    case 'conversation_update':
      broadcast({ type: 'conversation_update', conversationId: msg.conversationId, updates: msg.updates });
      break;
    case 'notification':
      if (msg.targetAgentId) sendToAgent(msg.targetAgentId, { type: 'notification', ...msg.payload });
      break;
    // ── Team Chat real-time events ──
    case 'tc_typing':
      broadcast({ type: 'tc_typing', from: senderId, channelId: msg.channelId, isTyping: msg.isTyping }, senderId);
      break;
    case 'tc_call_offer':
      if (msg.targetId) sendToAgent(msg.targetId, { type: 'tc_call_offer', from: senderId, offer: msg.offer, callId: msg.callId, channelId: msg.channelId, callerName: msg.callerName });
      break;
    case 'tc_call_answer':
      if (msg.targetId) sendToAgent(msg.targetId, { type: 'tc_call_answer', from: senderId, answer: msg.answer, callId: msg.callId });
      break;
    case 'tc_call_ice':
      if (msg.targetId) sendToAgent(msg.targetId, { type: 'tc_call_ice', from: senderId, candidate: msg.candidate, callId: msg.callId });
      break;
    case 'tc_call_end':
      if (msg.targetId) sendToAgent(msg.targetId, { type: 'tc_call_end', from: senderId, callId: msg.callId });
      else broadcast({ type: 'tc_call_end', from: senderId, callId: msg.callId }, senderId);
      break;
    case 'tc_status':
      if (senderId && msg.status) {
        updateAgentStatus(senderId, msg.status);
        broadcast({ type: 'presence', agentId: senderId, status: msg.status }, senderId);
      }
      break;
    default:
      broadcast(msg, senderId);
  }
}

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendToAgent(agentId, data) {
  const agentClients = clients.get(agentId);
  if (agentClients) {
    for (const ws of agentClients) send(ws, data);
  }
}

function broadcast(data, excludeAgentId = null) {
  for (const [agentId, agentClients] of clients) {
    if (agentId === excludeAgentId) continue;
    for (const ws of agentClients) send(ws, data);
  }
}

// Public broadcast function for routes to use
function broadcastToAll(data) {
  broadcast(data);
}

// Broadcast to all except a specific agent (use in routes to exclude the sender)
function broadcastExcept(data, excludeAgentId) {
  broadcast(data, excludeAgentId);
}

module.exports = { setupWebSocket, broadcastToAll, broadcastExcept, sendToAgent };
