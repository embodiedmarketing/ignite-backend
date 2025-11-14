import { pool } from "../config/db";

// Temporary cache for health stats (will be moved to a proper cache service)
const responseCache = new Map<string, { response: any; timestamp: number }>();

export async function getDatabaseHealth() {
  try {
    const poolStats = {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
      maxConnections: 25,
      utilizationPercent: Math.round((pool.totalCount / 25) * 100)
    };

    // Test database connectivity
    const start = Date.now();
    const client = await pool.connect();
    const connectionTime = Date.now() - start;
    client.release();

    return {
      status: "healthy",
      connectionPool: poolStats,
      connectionTestTime: connectionTime,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export function getCacheStats() {
  const now = Date.now();
  const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes
  
  let totalEntries = 0;
  let validEntries = 0;
  
  responseCache.forEach((entry) => {
    totalEntries++;
    if (now - entry.timestamp < CACHE_DURATION) {
      validEntries++;
    }
  });

  const hitRate = totalEntries > 0 ? Math.round((validEntries / totalEntries) * 100) : 0;

  return {
    totalCacheEntries: totalEntries,
    validCacheEntries: validEntries,
    cacheHitRate: hitRate,
    cacheDuration: "60 minutes",
    timestamp: new Date().toISOString()
  };
}

export function getSystemHealth() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  return {
    status: "running",
    uptime: Math.round(uptime),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      rss: Math.round(memoryUsage.rss / 1024 / 1024) // MB
    },
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString()
  };
}

