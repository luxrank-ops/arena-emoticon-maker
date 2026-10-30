/**
 * BullMQ 워커 엔트리 포인트
 * 별도 프로세스로 실행: npx tsx worker.ts
 * 또는 PM2/Docker로 프로세스 관리
 */

import './src/lib/queue/imageQueue';

console.log('🚀 이미지 생성 워커 시작됨');
console.log('📋 큐: image-generation');
console.log('⚙️  동시 처리: 2개');

// 프로세스 종료 시그널 처리
process.on('SIGINT', async () => {
  console.log('\n⏹️  워커 종료 중...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  워커 종료 중...');
  process.exit(0);
});

// 워커가 살아있도록 유지
setInterval(() => {}, 1000);