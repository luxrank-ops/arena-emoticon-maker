import { isAdmin, isPlayUser, type Viewer } from '@/lib/admin-access';
import { uid, withDB } from '@/lib/store';
import { kstDateKey } from '@/lib/time';
import type { PlayUsage } from '@/lib/types';

export class PlayUsageError extends Error {
  code = 'PLAY_FAIR_USE_LIMIT';
  status = 429;
  constructor(public limit: number) {
    super(`오늘의 AI 생성 공정 이용 한도 ${limit}회를 모두 사용했습니다. 한국 시간 자정에 초기화됩니다.`);
    this.name = 'PlayUsageError';
  }
}

export function playDailyLimit() {
  const configured = Number(process.env.PLAY_DAILY_GENERATION_LIMIT ?? 96);
  return Number.isFinite(configured) ? Math.min(10_000, Math.max(1, Math.floor(configured))) : 96;
}

type PlayViewer = Viewer & { id: string };

export async function getPlayUsage(viewer: PlayViewer | null | undefined): Promise<PlayUsage | null> {
  if (!isPlayUser(viewer) || isAdmin(viewer)) return null;
  const userId = viewer!.id;
  const date = kstDateKey();
  return withDB((db) => db.playUsage.find((item) => item.userId === userId && item.date === date) ?? { id: '', userId, date, count: 0, updatedAt: new Date().toISOString() });
}

/** 실제 생성 직전에만 1회 소비한다. 실패한 공급자 호출도 원가 방어를 위해 시도로 계산한다. */
export async function consumePlayGeneration(viewer: PlayViewer | null | undefined, attempts = 1): Promise<PlayUsage | null> {
  if (!isPlayUser(viewer) || isAdmin(viewer)) return null;
  const userId = viewer!.id;
  const date = kstDateKey();
  const limit = playDailyLimit();
  return withDB((db) => {
    let usage = db.playUsage.find((item) => item.userId === userId && item.date === date);
    const requested = Number.isFinite(attempts) ? Math.max(1, Math.min(12, Math.floor(attempts))) : 1;
    if ((usage?.count ?? 0) + requested > limit) throw new PlayUsageError(limit);
    if (!usage) {
      usage = { id: uid('play'), userId, date, count: 0, updatedAt: new Date().toISOString() };
      db.playUsage.push(usage);
    }
    usage.count += requested;
    usage.updatedAt = new Date().toISOString();
    return usage;
  });
}
