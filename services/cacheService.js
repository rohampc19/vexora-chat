// ============================================
// VEXORA CHAT - Redis Caching Service
// ============================================

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = () => {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    maxRetriesPerRequest: 3,
  });

  redisClient.on('connect', () => logger.info('✅ Redis connected'));
  redisClient.on('error', (err) => logger.error('❌ Redis error', { error: err.message }));

  return redisClient;
};

const DEFAULT_TTL = 3600;

const cacheGet = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error('Cache get error', { key, error: err.message });
    return null;
  }
};

const cacheSet = async (key, value, ttl = DEFAULT_TTL) => {
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttl);
    return true;
  } catch (err) {
    logger.error('Cache set error', { key, error: err.message });
    return false;
  }
};

const cacheDelete = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    logger.error('Cache delete error', { key, error: err.message });
    return false;
  }
};

const cacheDeletePattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    return true;
  } catch (err) {
    logger.error('Cache pattern delete error', { pattern, error: err.message });
    return false;
  }
};

const cacheMiddleware = (keyPrefix, ttl = DEFAULT_TTL) => {
  return async (req, res, next) => {
    if (!redisClient || redisClient.status !== 'ready') return next();

    const cacheKey = `${keyPrefix}:${req.originalUrl}`;
    const cachedData = await cacheGet(cacheKey);

    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) {
        cacheSet(cacheKey, data, ttl);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};

const incrementCounter = async (key, ttl = 900) => {
  const count = await redisClient.incr(key);
  if (count === 1) {
    await redisClient.expire(key, ttl);
  }
  return count;
};

const updateLeaderboard = async (gameId, userId, score) => {
  await redisClient.zadd(`leaderboard:${gameId}`, score, userId);
};

const getLeaderboard = async (gameId, limit = 10) => {
  const results = await redisClient.zrevrange(
    `leaderboard:${gameId}`, 0, limit - 1, 'WITHSCORES'
  );

  const leaderboard = [];
  for (let i = 0; i < results.length; i += 2) {
    leaderboard.push({ userId: results[i], score: parseInt(results[i + 1]) });
  }
  return leaderboard;
};

const setUserOnline = async (userId) => {
  await redisClient.setex(`online:${userId}`, 60, '1');
};

const isUserOnline = async (userId) => {
  const status = await redisClient.get(`online:${userId}`);
  return status !== null;
};

const getOnlineUsersCount = async () => {
  const keys = await redisClient.keys('online:*');
  return keys.length;
};

module.exports = {
  connectRedis,
  getClient: () => redisClient,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  cacheMiddleware,
  incrementCounter,
  updateLeaderboard,
  getLeaderboard,
  setUserOnline,
  isUserOnline,
  getOnlineUsersCount,
};
