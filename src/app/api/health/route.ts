import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getQueueStats } from '@/lib/queue/imageQueue';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 데이터베이스 연결 확인
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;
    
    // Redis/Queue 확인
    let queueStats: any = null;
    let redisStatus = 'unknown';
    try {
      queueStats = await getQueueStats();
      redisStatus = 'connected';
    } catch {
      redisStatus = 'disconnected';
    }
    
    // 시스템 메모리 확인
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
    };
    
    const uptime = process.uptime();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: 'healthy',
          latency: `${dbLatency}ms`,
        },
        redis: {
          status: redisStatus,
          queue: queueStats,
        },
        memory: {
          status: memoryUsageMB.heapUsed > 500 ? 'warning' : 'healthy',
          ...memoryUsageMB,
        },
      },
    };
    
    // 비정상 상태 확인
    const isHealthy = 
      health.checks.database.status === 'healthy' &&
      health.checks.redis.status === 'connected' &&
      health.checks.memory.status !== 'warning';
    
    if (!isHealthy) {
      health.status = 'degraded';
    }
    
    const statusCode = isHealthy ? 200 : 503;
    
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        database: { status: 'unhealthy' },
        redis: { status: 'unknown' },
        memory: { status: 'unknown' },
      },
    }, { status: 503 });
  }
}