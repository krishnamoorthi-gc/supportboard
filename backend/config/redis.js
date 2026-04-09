require('dotenv').config();
const Redis = require('ioredis');

// ── Single shared ioredis client ───────────────────────────────────────────
const redis = new Redis({
  host:     process.env.REDIS_HOST || '127.0.0.1',
  port:     parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db:       0,
  retryStrategy: (times) => Math.min(times * 500, 5000), // reconnect with back-off
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error',   (err) => console.error('❌ Redis error:', err.message));

module.exports = redis;
