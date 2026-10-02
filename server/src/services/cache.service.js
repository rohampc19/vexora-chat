import Redis from 'ioredis';
import { env } from '../config/env.js';

let client = null;
let enabled = false;

export function connectCache() {
  if (client || !env.REDIS_URL) return null;
  client = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false, retryStrategy: () => null });
  client.on('ready', () => { enabled = true });
  client.on('end', () => { enabled = false });
  client.on('error', () => { enabled = false });
  client.connect().catch(() => { enabled = false });
  return client;
}

export async function getCache(key) {
  if (!enabled || !client) return null;
  try { const value = await client.get(key); return value ? JSON.parse(value) : null } catch { return null }
}

export async function setCache(key, value, ttl = 60) {
  if (!enabled || !client) return false;
  try { await client.set(key, JSON.stringify(value), 'EX', ttl); return true } catch { return false }
}

export async function deleteCache(key) {
  if (!enabled || !client) return false;
  try { await client.del(key); return true } catch { return false }
}

export const cacheStatus = () => enabled ? 'ready' : 'disabled';
