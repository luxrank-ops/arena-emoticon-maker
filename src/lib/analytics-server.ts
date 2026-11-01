import { PostHog } from 'posthog-node';

// ─────────────────────────────────────────────────────────────
// 서버 측 프로덕트 분석 (PostHog Node)
//  · POSTHOG_KEY(서버 전용) 또는 NEXT_PUBLIC_POSTHOG_KEY 가 없으면 no-op
//  · 결제·팩 생성 같은 "돈이 걸린" 이벤트만 서버에서 기록한다
//    (클라이언트 이벤트는 광고 차단기로 누락될 수 있음)
//  · 개인 식별정보(이메일·전화번호·사진)는 전송하지 않는다 — 내부 userId 만 사용
// ─────────────────────────────────────────────────────────────

const KEY = process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.POSTHOG_HOST ?? process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

type Props = Record<string, string | number | boolean | null | undefined>;

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!KEY) return null;
  if (!client) {
    client = new PostHog(KEY, { host: HOST, flushAt: 1, flushInterval: 0, requestTimeout: 3000 });
  }
  return client;
}

/** 서버 이벤트 기록. 실패해도 비즈니스 로직을 막지 않는다. */
export async function captureServer(event: string, distinctId: string, props: Props = {}) {
  const c = getClient();
  if (!c) return;
  const safe: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') safe[k] = v.slice(0, 60);
    else if (typeof v === 'number' || typeof v === 'boolean') safe[k] = v;
  }
  try {
    c.capture({ distinctId, event, properties: { ...safe, source: 'server' } });
    await c.flush();
  } catch {
    /* 분석 실패는 무시 */
  }
}
