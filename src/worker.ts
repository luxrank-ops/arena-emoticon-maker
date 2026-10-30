/**
 * Worker Entry Point
 * 이 파일은 별도 프로세스로 실행되어 이미지 생성 작업을 처리합니다.
 * 
 * 실행 방법:
 * - 개발: npx tsx src/worker.ts
 * - 프로덕션: node dist/worker.js (빌드 후)
 */

import { imageGenerationWorker, getQueueStats } from '@/lib/queue/imageQueue';
import prisma from '@/lib/prisma';

// Graceful shutdown 처리
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n🛑 ${signal} 신호 수신 - 워커 종료 중...`);
  
  try {
    // 워커 종료 대기 (진행 중인 작업 완료까지)
    await imageGenerationWorker.close();
    console.log('✅ 이미지 생성 워커 종료 완료');
    
    // Prisma 연결 종료
    await prisma.$disconnect();
    console.log('✅ 데이터베이스 연결 종료 완료');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 종료 중 오류:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 미처리 예외 핸들링
process.on('uncaughtException', (error) => {
  console.error('💥 미처리 예외:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 미처리 Promise 거부:', reason);
});

// 워커 시작 로그
console.log('🚀 Arena Emoticon Maker Worker 시작');
console.log('📋 큐: image-generation');
console.log('⚙️  동시 처리: 2개');
console.log('🔄 재시도: 최대 3회 (지수 백오프)');

// 주기적 큐 통계 로깅 (5분마다)
setInterval(async () => {
  try {
    const stats = await getQueueStats();
    console.log(`📊 큐 통계: 대기 ${stats.waiting} | 처리중 ${stats.active} | 완료 ${stats.completed} | 실패 ${stats.failed}`);
  } catch (error) {
    console.error('큐 통계 조회 실패:', error);
  }
}, 5 * 60 * 1000);

// Credit rollover is disabled until an idempotent credit ledger exists.

// 워커 이벤트 로깅
imageGenerationWorker.on('completed', (job) => {
  console.log(`✅ 작업 완료: ${job.id} (${job.data.characterName} - ${job.data.emotion})`);
});

imageGenerationWorker.on('failed', (job, err) => {
  console.error(`❌ 작업 실패: ${job?.id}`, err?.message);
});

imageGenerationWorker.on('error', (err) => {
  console.error('⚠️ 워커 오류:', err);
});

console.log('✅ 워커 준비 완료 - 작업 대기 중...');