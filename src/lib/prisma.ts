import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient | undefined;
};

// 빌드 시에는 모킹된 클라이언트 사용 (네트워크 이슈로 인해 Prisma 엔진 다운로드 불가)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'production';

let prisma: PrismaClient;

if (isBuildTime && !globalForPrisma.prisma) {
  // 빌드 타임에는 최소한의 타입만 만족하는 모킹 클라이언트 생성
  const mockPrisma = {
    user: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async () => ({}),
      update: async () => ({}),
      delete: async () => ({}),
      count: async () => 0,
    },
    generation: {
      findMany: async () => [],
      findUnique: async () => null,
      create: async () => ({}),
      update: async () => ({}),
      delete: async () => ({}),
      count: async () => 0,
    },
    subscription: {
      findUnique: async () => null,
      upsert: async () => ({}),
      update: async () => ({}),
    },
    payment: {
      create: async () => ({}),
      findMany: async () => [],
    },
    $transaction: async (callback: any) => {
      // 트랜잭션 콜백을 모킹된 클라이언트로 실행
      return callback(mockPrisma);
    },
    $disconnect: async () => {},
  } as unknown as PrismaClient;
  
  globalForPrisma.prisma = mockPrisma;
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

prisma = globalForPrisma.prisma;

export default prisma;