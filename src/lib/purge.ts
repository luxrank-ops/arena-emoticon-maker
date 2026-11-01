import { logEvent, withDB } from '@/lib/store';

// ─────────────────────────────────────────────────────────────
// 얼굴 파기 스케줄러 (파기 예약 시각 도달분 삭제)
//  · 정책: "얼굴 파생 정보는 생성 후 24시간 이내 파기" (docs/COMPLIANCE.md)
//  · 예약 시각(FaceProfile.purgedAt)만 기록하고 실제 삭제가 없으면 정책 위반이다.
//  · 파기해도 팩은 계속 렌더돼야 하므로, 팩 생성 시 Pack.identity 스냅샷을 고정해 둔다.
//  · 파기 로그(누가/언제/무엇을)는 UsageEvent(face_purged)로 남긴다.
// ─────────────────────────────────────────────────────────────

export interface PurgeResult {
  /** 실제로 삭제된 얼굴 프로필 수 */
  purged: number;
  /** 삭제된 얼굴 ID 목록 (로그 확인용) */
  faceIds: string[];
  /** 파기 예약 시각이 아직 남아있는 건수 */
  remaining: number;
  ranAt: string;
}

/** 파기 예약 시각이 지난 얼굴 프로필을 삭제한다. dryRun 이면 개수만 센다. */
export async function purgeExpiredFaces(
  now = Date.now(),
  opts: { dryRun?: boolean; force?: boolean } = {},
): Promise<PurgeResult & { dryRun: boolean }> {
  return withDB((db) => {
    const due = db.faces.filter(
      (f) => opts.force || new Date(f.purgedAt).getTime() <= now,
    );
    const ranAt = new Date(now).toISOString();

    if (opts.dryRun || due.length === 0) {
      if (!opts.dryRun) {
        // 파기할 대상이 없어도 호출 기록은 남긴다 (스케줄러 생존 확인)
        logEvent(db, 'system', 'face_purged', { purged: 0, reason: opts.force ? 'manual' : 'scheduled' });
      }
      return {
        purged: 0,
        faceIds: due.map((f) => f.id),
        remaining: db.faces.length - due.length,
        ranAt,
        dryRun: Boolean(opts.dryRun),
      };
    }

    const dueIds = new Set(due.map((f) => f.id));
    db.faces = db.faces.filter((f) => !dueIds.has(f.id));
    for (const f of due) {
      logEvent(db, f.userId, 'face_purged', {
        faceId: f.id,
        scheduledAt: f.purgedAt,
        // 파기 사유: 스케줄 도달 / 운영자 강제
        reason: opts.force ? 'manual' : 'scheduled',
      });
    }
    return {
      purged: due.length,
      faceIds: due.map((f) => f.id),
      remaining: db.faces.length,
      ranAt,
      dryRun: false,
    };
  });
}

// ── 기회적 스윕 (별도 크론이 없어도 정책이 지켜지도록) ─────────
const state = globalThis as unknown as { __emotimePurge?: { lastRun: number; running: boolean } };
state.__emotimePurge ??= { lastRun: 0, running: false };

const SWEEP_INTERVAL_MS = Number(process.env.FACE_PURGE_SWEEP_MS ?? 5 * 60_000);

/**
 * 요청 처리 중 가끔(기본 5분에 1회) 파기 스윕을 돌린다.
 * 크론(vercel.json)이 실패하거나 로컬/미니앱 환경처럼 크론이 없어도 파기가 누적되지 않게 하는 안전망.
 */
export async function maybePurgeFaces(now = Date.now()): Promise<PurgeResult | null> {
  const s = state.__emotimePurge!;
  if (s.running) return null;
  if (now - s.lastRun < SWEEP_INTERVAL_MS) return null;
  s.lastRun = now;
  s.running = true;
  try {
    return await purgeExpiredFaces(now);
  } catch {
    return null; // 스윕 실패가 사용자 요청을 죽이지 않게
  } finally {
    s.running = false;
  }
}

/** 운영 콘솔/스모크용 통계 */
export async function purgeStats(now = Date.now()) {
  return withDB((db) => {
    const due = db.faces.filter((f) => new Date(f.purgedAt).getTime() <= now).length;
    const purgedEvents = db.events.filter((e) => e.type === 'face_purged').length;
    return { stored: db.faces.length, due, purgedEvents };
  });
}
