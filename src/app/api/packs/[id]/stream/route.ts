import { getCurrentUser } from '@/lib/session';
import { getPackView } from '@/lib/packs';

export const dynamic = 'force-dynamic';

/** 생성 진행률 SSE — 컷이 준비될 때마다 frame.ready 이벤트를 흘려보낸다 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      let lastReady = -1;
      const tick = async () => {
        try {
          const view = await getPackView(user.id, params.id);
          if (view.ready !== lastReady) {
            lastReady = view.ready;
            send('frame.ready', { ready: view.ready, total: view.total, status: view.pack.status });
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

      const timer = setInterval(tick, 700);
      await tick();
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
