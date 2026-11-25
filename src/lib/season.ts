// ─────────────────────────────────────────────────────────────
// 시즌팩 공개 일정 판정 (Asia/Seoul 기준)
//  · 크리스마스·새해·설날 팩을 '바로 오픈'하지 않고 티저 → 카운트다운 → 오픈 순서로 연다.
//    상태 계산은 이 파일 하나만 한다(홈·허브·/season·/studio/photo 가 같은 판정을 쓴다).
//  · 시각 비교는 전부 epoch ms 로 한다. 일정 문자열은 +09:00 오프셋을 가진 ISO 라
//    서버가 UTC 로 돌아도 같은 순간을 가리킨다.
//  · D-day 는 '남은 밀리초'가 아니라 **KST 달력 날짜 차이**로 센다.
//    (11/25 밤 11시에 봐도 12/11 오픈은 D-16 — 시간이 지나도 숫자가 튀지 않는다)
//  · preview: `?preview=season` — 오픈 전 화면·소품·프롬프트를 검수하기 위한 읽기 전용 모드.
//    실제 판매·생성 잠금은 서버가 날짜로 판정하므로 preview 로 풀리지 않는다.
//  · `?at=2026-12-05` — 특정 날짜의 화면을 확인하는 검수용 시뮬레이션(저장·결제에 영향 없음).
// ─────────────────────────────────────────────────────────────

import { SEASON_ACCESSORIES, SEASON_PACKS, seasonPackById, type SeasonPack, type SeasonPackId } from '@/data/season-packs';
import { kstDateKey, kstParts } from '@/lib/time';

export type SeasonStage = 'upcoming' | 'teasing' | 'open' | 'closed';

export interface SeasonCountdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  done: boolean;
}

export interface SeasonPackView {
  pack: SeasonPack;
  stage: SeasonStage;
  /** 지금 세어야 할 시각 — upcoming 이면 티저 공개일, teasing 이면 오픈일 */
  targetAt: string;
  targetMs: number;
  /** 그 시각까지 남은 KST 달력 날짜 수 (오늘이면 0) */
  dday: number;
  countdown: SeasonCountdown;
  /** 소품·프롬프트를 쓸 수 있는 상태인가 (오픈 이후 또는 preview) */
  unlocked: boolean;
  /** 화면 배지 문구 */
  badge: string;
  badgeEn: string;
  /** 오픈일 표시 (예: '12월 11일') */
  openLabel: string;
  openLabelEn: string;
  teaseLabel: string;
  teaseLabelEn: string;
}

export const SEASON_PREVIEW_VALUE = 'season';

const MS_PER_DAY = 86_400_000;

export function seasonMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/** KST 달력 날짜 차이 (b - a, 일 단위) */
export function kstDayDiff(aMs: number, bMs: number): number {
  const a = kstDateKey(aMs);
  const b = kstDateKey(bMs);
  const toUtc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(b) - toUtc(a)) / MS_PER_DAY);
}

export function countdownTo(targetMs: number, nowMs: number): SeasonCountdown {
  const totalMs = Math.max(0, targetMs - nowMs);
  return {
    days: Math.floor(totalMs / MS_PER_DAY),
    hours: Math.floor((totalMs % MS_PER_DAY) / 3_600_000),
    minutes: Math.floor((totalMs % 3_600_000) / 60_000),
    seconds: Math.floor((totalMs % 60_000) / 1000),
    totalMs,
    done: totalMs === 0,
  };
}

export function seasonStageAt(pack: SeasonPack, nowMs: number): SeasonStage {
  const tease = seasonMs(pack.teaseAt);
  const open = seasonMs(pack.openAt);
  const close = seasonMs(pack.closeAt);
  if (nowMs < tease) return 'upcoming';
  if (nowMs < open) return 'teasing';
  if (nowMs < close) return 'open';
  return 'closed';
}

/** '12월 11일' — 바로 옆에 '12/11' 도 함께 쓰므로 짧게 만든다. */
export function seasonDateLabel(iso: string, locale: 'ko' | 'en' = 'ko'): string {
  const { month, day } = kstParts(iso);
  return locale === 'en' ? `${month}/${day}` : `${month}월 ${day}일`;
}

const BADGE: Record<SeasonStage, { ko: string; en: string }> = {
  upcoming: { ko: '티저 예고', en: 'Teaser soon' },
  teasing: { ko: '커밍순', en: 'Coming soon' },
  open: { ko: '오픈', en: 'Open now' },
  closed: { ko: '종료', en: 'Closed' },
};

/**
 * 한 팩의 지금 상태를 계산한다.
 *  · preview 면 일정과 무관하게 '오픈'으로 보고 잠금을 풀어 검수한다(읽기 전용).
 */
export function seasonViewAt(pack: SeasonPack, nowMs: number, preview = false): SeasonPackView {
  const teaseMs = seasonMs(pack.teaseAt);
  const openMs = seasonMs(pack.openAt);
  const natural = seasonStageAt(pack, nowMs);
  const stage: SeasonStage = preview ? 'open' : natural;
  const targetMs = preview ? openMs : stage === 'upcoming' ? teaseMs : stage === 'teasing' ? openMs : openMs;
  const dday = Math.max(0, kstDayDiff(nowMs, targetMs));
  return {
    pack,
    stage,
    targetAt: new Date(targetMs).toISOString(),
    targetMs,
    dday,
    countdown: countdownTo(targetMs, nowMs),
    unlocked: preview || natural === 'open',
    badge: BADGE[stage].ko,
    badgeEn: BADGE[stage].en,
    openLabel: seasonDateLabel(pack.openAt, 'ko'),
    openLabelEn: seasonDateLabel(pack.openAt, 'en'),
    teaseLabel: seasonDateLabel(pack.teaseAt, 'ko'),
    teaseLabelEn: seasonDateLabel(pack.teaseAt, 'en'),
  };
}

/** 모든 팩의 지금 상태 (order 순서) */
export function seasonViews(now: Date | number | string = new Date(), preview = false): SeasonPackView[] {
  const nowMs = now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.parse(now);
  const safe = Number.isFinite(nowMs) ? nowMs : Date.now();
  return [...SEASON_PACKS]
    .sort((a, b) => a.order - b.order)
    .map((pack) => seasonViewAt(pack, safe, preview));
}

/** 홈·허브 티저에 노출할 팩 — 종료된 팩은 빼고, 오픈 중인 팩을 먼저 보여 준다. */
export function seasonTeaserViews(now: Date | number | string = new Date(), preview = false): SeasonPackView[] {
  const views = seasonViews(now, preview).filter((view) => view.stage !== 'closed');
  const weight: Record<SeasonStage, number> = { open: 0, teasing: 1, upcoming: 2, closed: 3 };
  return views.sort((a, b) => weight[a.stage] - weight[b.stage] || a.pack.order - b.pack.order);
}

export interface SeasonTimeContext {
  /** `?preview=season` 였는가 */
  preview: boolean;
  /** 판정에 쓴 시각 */
  now: Date;
  nowMs: number;
  /** `?at=` 로 과거/미래를 흉내 냈는가 */
  simulated: boolean;
  /** 시뮬레이션 값이 잘못됐을 때 안내용 */
  invalidAt: boolean;
}

/**
 * URL 검수 파라미터를 시각 문맥으로 바꾼다.
 *  · at=2026-12-05 → KST 2026-12-05 00:00
 *  · at=2026-12-05T13:00:00+09:00 → 그 순간
 *  · 잘못된 값은 무시하고 현재 시각으로 돌아간다(오타로 화면이 깨지지 않게).
 */
export function seasonTimeContext(
  params: { preview?: string | string[]; at?: string | string[] } = {},
  now: Date = new Date(),
): SeasonTimeContext {
  const previewValue = Array.isArray(params.preview) ? params.preview[0] : params.preview;
  const atValue = Array.isArray(params.at) ? params.at[0] : params.at;
  let at = now;
  let simulated = false;
  let invalidAt = false;

  if (atValue) {
    const text = atValue.trim();
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
    const parsed = dateOnly ? Date.parse(`${text}T00:00:00+09:00`) : Date.parse(text);
    if (Number.isFinite(parsed)) {
      at = new Date(parsed);
      simulated = true;
    } else {
      invalidAt = true;
    }
  }

  return {
    preview: previewValue === SEASON_PREVIEW_VALUE,
    now: at,
    nowMs: at.getTime(),
    simulated,
    invalidAt,
  };
}

/** 검수 링크에 지금 파라미터를 그대로 이어 붙인다 (페이지 이동 시 모드 유지) */
export function seasonQueryString(context: SeasonTimeContext): string {
  const params = new URLSearchParams();
  if (context.preview) params.set('preview', SEASON_PREVIEW_VALUE);
  if (context.simulated) {
    const { year, month, day } = kstParts(context.now);
    params.set('at', `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

/**
 * 지금 쓸 수 있는 시즌 AI 악세사리 (오픈한 팩만).
 *  · 서버(생성 API)가 이 목록으로 유효성을 검사한다 — preview 로는 열리지 않는다.
 */
export function availableSeasonAccessories(now: Date | number | string = new Date()) {
  const nowMs = now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.parse(now);
  const safe = Number.isFinite(nowMs) ? nowMs : Date.now();
  return SEASON_ACCESSORIES.filter((item) => {
    const pack = SEASON_PACKS.find((entry) => entry.accessories.some((accessory) => accessory.id === item.id));
    return !!pack && seasonStageAt(pack, safe) === 'open';
  });
}

export function seasonAccessoryIdsAt(now: Date | number | string = new Date()): string[] {
  return availableSeasonAccessories(now).map((item) => item.id);
}

export function isSeasonAccessoryAvailable(id: string, now: Date | number | string = new Date()): boolean {
  const pack = SEASON_PACKS.find((entry) => entry.accessories.some((accessory) => accessory.id === id));
  if (!pack) return false;
  const nowMs = now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.parse(now);
  return seasonStageAt(pack, Number.isFinite(nowMs) ? nowMs : Date.now()) === 'open';
}

/** 오픈한 시즌팩의 프롬프트 묶음 — AI 생성 화면이 참고하는 값 */
export function openSeasonPromptPacks(now: Date | number | string = new Date()) {
  const nowMs = now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.parse(now);
  const safe = Number.isFinite(nowMs) ? nowMs : Date.now();
  return SEASON_PACKS.filter((pack) => seasonStageAt(pack, safe) === 'open');
}

/** 팩 id 로 상태 한 개 — 라우트/컴포넌트 편의용 */
export function seasonViewById(
  id: string,
  now: Date | number | string = new Date(),
  preview = false,
): SeasonPackView | null {
  const pack = seasonPackById(id);
  if (!pack) return null;
  const nowMs = now instanceof Date ? now.getTime() : typeof now === 'number' ? now : Date.parse(now);
  return seasonViewAt(pack, Number.isFinite(nowMs) ? nowMs : Date.now(), preview);
}

export type { SeasonPackId };
