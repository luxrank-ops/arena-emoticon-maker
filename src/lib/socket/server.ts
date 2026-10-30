// 서버 사이드 Socket.io (Node.js 환경에서만 작동)
// Next.js API Routes에서는 사용 불가, 별도 서버 필요
// 여기서는 인터페이스만 정의하고 실제 구현은 별도 프로세스로

export interface GenerationUpdateEvent {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  revisedPrompt?: string;
  error?: string;
}

// 서버리스 환경에서는 Pusher, Ably, 또는 Vercel의 실시간 기능 사용 권장
// 여기서는 클라이언트 폴링 방식으로 대체

let socketServer: any = null;

export function initializeSocketServer() {
  if (typeof window !== 'undefined') return; // 클라이언트에서는 실행 안 함

  // 프로덕션에서는 별도 WebSocket 서버 운영 권장
  // 예: Socket.io + Redis adapter, 또는 Pusher/Ably
  console.log('[Socket] 서버리스 환경에서는 폴링 방식 사용');
}

export async function emitGenerationUpdate(
  generationId: string,
  update: GenerationUpdateEvent
): Promise<void> {
  // 서버리스에서는 직접 emit 불가
  // 실제로는 Redis pub/sub을 통해 별도 소켓 서버로 전달
  // 또는 데이터베이스 폴링으로 대체
  console.log(`[Generation Update] ${generationId}:`, update);
}

// 클라이언트에서 사용할 폴링 훅용 헬퍼
export function createGenerationPoller(generationId: string, interval = 2000) {
  let stopped = false;

  const poll = async (onUpdate: (update: GenerationUpdateEvent) => void) => {
    while (!stopped) {
      try {
        const response = await fetch(`/api/generations/${generationId}/status`);
        if (response.ok) {
          const data = await response.json();
          onUpdate(data);
          if (data.status === 'COMPLETED' || data.status === 'FAILED') {
            stopped = true;
            break;
          }
        }
      } catch (error) {
        console.error('폴링 오류:', error);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  };

  return {
    start: (onUpdate: (update: GenerationUpdateEvent) => void) => poll(onUpdate),
    stop: () => { stopped = true; },
  };
}