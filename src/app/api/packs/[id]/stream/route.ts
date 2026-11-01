import { getCurrentUser } from '@/lib/session';
import { getPackView } from '@/lib/packs';

export const dynamic = 'force-dynamic';

/**
 * 생성 진행률 SSE — 컷이 준비될 때마다 frame.ready 이벤트를 흘려보낸다.
 *
 * 주의: 클라이언트가 끊긴 뒤에도 setInterval 이 남아 enqueue 를 시도하면
 * "Controller is already closed" 가 700ms 마다 무한히 발생한다(로그 폭주 + CPU 누수).
 * → abort 시그널/취소 콜백에서 반드시 타이머를 정리하고, enqueue 는 try/catch 로 감싼다.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const encoder = new TextEncoder();
  // start() 안의 타이머를 cancel() 에서도 정리할 수 있게 바깥으로 노출
  let cleanup: () => void = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let timer: ReturnType<typeof setInterval> | null = null;

      const stop = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      };
      cleanup = () => {
        closed = true;
        stop();
      };

      const close = () => {
        if (closed) return;
        closed = true;
        stop();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const send = (event: string, data: unknown) => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          return true;
        } catch {
          // 클라이언트가 이미 사라졌다 → 조용히 정리 (에러 로그 남기지 않음)
          close();
          return false;
        }
      };

      // 브라우저/프록시가 연결을 끊으면 즉시 타이머 정리
      req.signal?.addEventListener('abort', () => {
        closed = true;
        stop();
      });

      let lastReady = -1;
      const tick = async () => {
        if (closed) return;
        try {
          const view = await getPackView(user.id, params.id);
          if (view.ready !== lastReady) {
            lastReady = view.ready;
            if (!send('frame.ready', { ready: view.ready, total: view.total, status: view.pack.status })) return;
          }
          if (view.ready >= view.total) {
            send('job.done', { packId: params.id, total: view.total });
            close();
          }
        } catch (e) {
          send('job.failed', { message: (e as Error).message });
          close();
        }
      };

      // 마지막 이벤트 id 이후 재연결 시에도 동작하도록 첫 tick 은 즉시
      await tick();
      if (!closed) timer = setInterval(tick, 700);
    },
    cancel() {
      // 소비자가 스트림을 취소한 경우 — 타이머를 즉시 정리한다.
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
