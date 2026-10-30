import { logEvent, withDB } from '@/lib/store';

// ─────────────────────────────────────────────────────────────
// 구조화 로그 + 에러 수집 (Step 3: 관측의 최소 단위)
//  · Sentry 연동 전에도 관리자 콘솔에 실패 지점이 남도록 store 에 이벤트 기록
//  · 민감정보(대사·사진·토큰)는 절대 로그에 남기지 않는다
// ─────────────────────────────────────────────────────────────

type Level = 'info' | 'warn' | 'error';

const SENSITIVE = /(cookie|authorization|token|photo|image|palette|address|phone)/i;

export function log(level: Level, scope: string, message: string, meta: Record<string, unknown> = {}) {
  const safe: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE.test(k)) continue;
    if (typeof v === 'string') safe[k] = v.slice(0, 80);
    else if (typeof v === 'number' || typeof v === 'boolean') safe[k] = v;
  }
  const line = JSON.stringify({ ts: new Date().toISOString(), level, scope, message, ...safe });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export async function captureError(scope: string, error: unknown, userId?: string, meta: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  log('error', scope, message, meta);
  try {
    await withDB((db) =>
      logEvent(db, userId ?? 'anonymous', 'error', { scope, message: message.slice(0, 160), ...(meta as Record<string, string | number | boolean>) }),
    );
  } catch {
    /* 로깅 실패가 요청을 죽이지 않게 */
  }
}
