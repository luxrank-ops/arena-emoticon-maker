// ─────────────────────────────────────────────────────────────
// 무료 미리보기(일반 방문자) — 원가 방어형 12컷 워터마크 맛보기
//  · 배경: 유료 등급 정비 기간에 GENERATION_ADMIN_ONLY=1 이라 일반 방문자는 AI 이모티콘을
//    한 장도 만들어 볼 수 없었다. 체험 없이 결제를 기대할 수 없으니 '맛보기'만 연다.
//  · 원가: 컷·시안 1장 = Gemini 이미지 1회 호출(약 $0.03~0.04, 실사 스티커는 상위 모델).
//    방문자 1명이 시안 1장 + 컷 2장을 만들면 원가가 실제로 나가므로, 단순 개방은 불가하다.
//  · 그래서 상한을 코드가 아니라 '저장소 카운터'로 강제한다(쿠키 삭제·새 탭으로 우회 불가):
//      사용자(게스트 세션·계정) 하루 상한 / IP(해시) 하루 상한 / 전체 하루·월 상한.
//    카운터는 DB 스냅샷(Cloudflare KV CAS)에 있으므로 여러 인스턴스에서도 함께 센다.
//  · 이 모듈은 서버 전용이다(노드 crypto·저장소 사용). UI 는 타입만 가져다 쓴다.
// ─────────────────────────────────────────────────────────────
import { createHash } from 'node:crypto';
import { trialFreeEnabled } from '@/lib/admin-access';
import { uid, withDB } from '@/lib/store';
import { kstDateKey } from '@/lib/time';
import { TRIAL_MESSAGES } from '@/lib/trial-policy';
import type { TrialUsage } from '@/lib/types';

export { TRIAL_CUT_EMOTIONS, TRIAL_MESSAGES, TRIAL_VARIANT_KEYS, trialToneAllowed } from '@/lib/trial-policy';

export interface TrialLimits {
  /** 사용자 1명이 하루에 쓸 수 있는 AI 이미지 수 (시안 1 + 미리보기 12컷 + 재시도 여유) */
  imagesPerUserDay: number;
  /** IP 1곳이 하루에 쓸 수 있는 AI 이미지 수 */
  imagesPerIpDay: number;
  /** 전체 방문자 하루 AI 이미지 수 — 원가 상한의 핵심 */
  imagesPerDay: number;
  /** 전체 방문자 한 달 AI 이미지 수 — 월 예산 방어 */
  imagesPerMonth: number;
  /** 사용자 1명이 하루에 만들 수 있는 '미리보기 컷' 수 (시안 제외, 한 팩 = 12컷) */
  cutsPerUserDay: number;
  /** 사용자 1명이 하루에 만들 수 있는 '미리보기 팩' 수 (12컷 전체) */
  previewPacksPerUserDay: number;
  /** IP 1곳이 하루에 만들 수 있는 미리보기 팩 수 */
  previewPacksPerIpDay: number;
  /** 사용자 1명 하루 사진 특징 재확인(AI 비전) 횟수 */
  prepsPerUserDay: number;
  /** IP 1곳 하루 사진 특징 재확인 횟수 */
  prepsPerIpDay: number;
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = String((globalThis as { CLOUDFLARE_ENV?: Record<string, string> }).CLOUDFLARE_ENV?.[name] ?? process.env[name] ?? '').trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/**
 * 무료 체험 상한 (기본값).
 *  · 미리보기는 저비용 Flash 모델(장당 약 $0.02)로 그린다 — 12컷 팩 1개 ≈ $0.24.
 *  · 하루 전체 45장 ≈ $0.9(≈1,300원), 한 달 900장 ≈ $18(≈2.6만원).
 *  · 월 5만원 예산 알림 안에서 안전하도록 하루·월 상한을 함께 둔다.
 */
export function trialLimits(): TrialLimits {
  return {
    imagesPerUserDay: envInt('TRIAL_IMAGES_PER_USER_DAY', 18, 1, 40),
    imagesPerIpDay: envInt('TRIAL_IMAGES_PER_IP_DAY', 24, 1, 60),
    imagesPerDay: envInt('TRIAL_IMAGES_PER_DAY', 45, 1, 240),
    imagesPerMonth: envInt('TRIAL_IMAGES_PER_MONTH', 900, 1, 6000),
    cutsPerUserDay: envInt('TRIAL_CUTS_PER_USER_DAY', 12, 1, 24),
    previewPacksPerUserDay: envInt('TRIAL_PREVIEW_PACKS_PER_USER_DAY', 1, 1, 2),
    previewPacksPerIpDay: envInt('TRIAL_PREVIEW_PACKS_PER_IP_DAY', 2, 1, 4),
    prepsPerUserDay: envInt('TRIAL_PREPS_PER_USER_DAY', 4, 1, 20),
    prepsPerIpDay: envInt('TRIAL_PREPS_PER_IP_DAY', 8, 1, 40),
  };
}

export type TrialLimitScope = 'user' | 'ip' | 'daily' | 'monthly' | 'prep' | 'pack';

export class TrialLimitError extends Error {
  code = 'TRIAL_LIMIT';
  status = 429;
  constructor(public scope: TrialLimitScope) {
    super(scope === 'user' ? TRIAL_MESSAGES.limitUser
      : scope === 'ip' ? TRIAL_MESSAGES.limitIp
        : scope === 'prep' ? TRIAL_MESSAGES.limitPrep
          : scope === 'pack' ? TRIAL_MESSAGES.packBlocked
            : scope === 'daily' ? TRIAL_MESSAGES.limitDaily
              : TRIAL_MESSAGES.limitMonthly);
    this.name = 'TrialLimitError';
  }
}

export interface TrialStatus {
  enabled: boolean;
  limits: TrialLimits;
  /** 오늘 만든 체험 컷 수 / 남은 수 */
  cutsUsedToday: number;
  cutsLeftToday: number;
  /** 오늘 남은 AI 이미지 수(시안 포함, 사용자·IP·전체 중 가장 빡빡한 기준) */
  imagesLeftToday: number;
  /** 이번 달 남은 전체 이미지 수 */
  imagesLeftThisMonth: number;
  /** 오늘 남은 미리보기 팩 수 (12컷 전체) */
  previewPacksLeftToday: number;
}

interface TrialSubject {
  userId: string;
  /** IP 원문은 저장하지 않는다 — 해시 앞 16자만 카운터 키로 쓴다 */
  ipHash: string;
}

const dayKey = () => kstDateKey();
const monthOf = (day: string) => day.slice(0, 7);

function bucketCount(rows: TrialUsage[], bucket: string): number {
  return rows.find((row) => row.bucket === bucket)?.count ?? 0;
}

/**
 * 요청자의 IP 해시. Cloudflare 는 `cf-connecting-ip`, 프록시 뒤에서는 `x-forwarded-for` 첫 값.
 *  · 원문 IP 는 남기지 않는다(개인정보 최소 수집). 같은 IP 판정에만 쓴다.
 */
export function trialIpHashFrom(get: (name: string) => string | null | undefined): string {
  const raw = get('cf-connecting-ip')
    ?? get('x-real-ip')
    ?? get('x-forwarded-for')?.split(',')[0]
    ?? 'unknown';
  return createHash('sha256').update(`trial:${raw.trim()}`).digest('hex').slice(0, 16);
}

export function trialIpHash(req: Request): string {
  return trialIpHashFrom((name) => req.headers.get(name));
}

function statusFrom(rows: TrialUsage[], subject: TrialSubject, limits: TrialLimits): TrialStatus {
  const day = dayKey();
  const month = monthOf(day);
  const cutsUsedToday = bucketCount(rows, `cut:user:${subject.userId}:${day}`);
  const userImagesLeft = limits.imagesPerUserDay - bucketCount(rows, `img:user:${subject.userId}:${day}`);
  const ipImagesLeft = limits.imagesPerIpDay - bucketCount(rows, `img:ip:${subject.ipHash}:${day}`);
  const dailyLeft = limits.imagesPerDay - bucketCount(rows, `img:all:${day}`);
  return {
    enabled: trialFreeEnabled(),
    limits,
    cutsUsedToday,
    cutsLeftToday: Math.max(0, Math.min(limits.cutsPerUserDay - cutsUsedToday, userImagesLeft, ipImagesLeft, dailyLeft)),
    imagesLeftToday: Math.max(0, Math.min(userImagesLeft, ipImagesLeft, dailyLeft)),
    imagesLeftThisMonth: Math.max(0, limits.imagesPerMonth - bucketCount(rows, `img:all:${month}`)),
    previewPacksLeftToday: Math.max(0, Math.min(
      limits.previewPacksPerUserDay - bucketCount(rows, `pack:user:${subject.userId}:${day}`),
      limits.previewPacksPerIpDay - bucketCount(rows, `pack:ip:${subject.ipHash}:${day}`),
      Math.floor((limits.imagesPerDay - bucketCount(rows, `img:all:${day}`)) / 12),
    )),
  };
}

/** 전체(모든 방문자) 사용량 — 운영 점검·상한 조정·테스트용 */
export async function trialGlobalUsage(): Promise<{ day: number; month: number }> {
  const day = dayKey();
  return withDB((db) => {
    const rows = Array.isArray(db.trialUsage) ? db.trialUsage : [];
    return { day: bucketCount(rows, `img:all:${day}`), month: bucketCount(rows, `img:all:${monthOf(day)}`) };
  });
}

/** 읽기 전용 상태 (화면 표시·테스트용). 카운터를 만들지 않는다. */
export async function trialStatusFor(subject: TrialSubject): Promise<TrialStatus> {
  const limits = trialLimits();
  return withDB((db) => {
    const rows = Array.isArray(db.trialUsage) ? db.trialUsage : [];
    return statusFrom(rows, subject, limits);
  });
}

/**
 * 실제 AI 호출 직전에만 1회 소비한다 (실패한 호출도 원가 방어를 위해 시도로 센다).
 *  · kind='image': 시안·체험 컷 공통 이미지 카운터(사용자·IP·전체·월)
 *  · kind='cut'  : 체험 컷 카운터(사용자 하루 2컷)를 함께 센다
 *  · 상한을 넘으면 아무것도 쓰지 않고 TrialLimitError 를 던진다 (업무 오류는 폴백 없이 전파).
 */
export async function consumeTrialImage(
  subject: TrialSubject,
  kind: 'image' | 'cut' = 'image',
): Promise<TrialStatus> {
  const limits = trialLimits();
  const day = dayKey();
  const month = monthOf(day);
  const allCounters: Counter[] = [
    { bucket: `cut:user:${subject.userId}:${day}`, limit: limits.cutsPerUserDay, scope: 'user' },
    { bucket: `img:user:${subject.userId}:${day}`, limit: limits.imagesPerUserDay, scope: 'user' },
    { bucket: `img:ip:${subject.ipHash}:${day}`, limit: limits.imagesPerIpDay, scope: 'ip' },
    { bucket: `img:all:${day}`, limit: limits.imagesPerDay, scope: 'daily' },
    { bucket: `img:all:${month}`, limit: limits.imagesPerMonth, scope: 'monthly' },
  ];
  // 시안(image)은 '체험 컷' 카운터를 쓰지 않는다 — 컷 2장 제한은 체험 컷에만 적용된다.
  const counters = kind === 'cut' ? allCounters : allCounters.filter((counter) => !counter.bucket.startsWith('cut:'));

  return withDB((db) => {
    applyCounters(db, counters, day, month);
    return statusFrom(db.trialUsage, subject, limits);
  });
}

/**
 * 무료 12컷 미리보기 팩 1개를 연다.
 *  · 사용자·IP 하루 상한을 함께 세고, 이미지 상한이 12컷을 감당할 수 있는지도 확인한다.
 *  · 실제 컷 이미지는 이어지는 /api/render 가 'cut' 카운터로 한 장씩 소비한다.
 */
export async function consumeTrialPreviewPack(subject: TrialSubject): Promise<TrialStatus> {
  const limits = trialLimits();
  const day = dayKey();
  const month = monthOf(day);
  const counters: Counter[] = [
    { bucket: `pack:user:${subject.userId}:${day}`, limit: limits.previewPacksPerUserDay, scope: 'pack' },
    { bucket: `pack:ip:${subject.ipHash}:${day}`, limit: limits.previewPacksPerIpDay, scope: 'ip' },
  ];
  return withDB((db) => {
    const rows = Array.isArray(db.trialUsage) ? db.trialUsage : [];
    const imagesLeft = Math.min(
      limits.imagesPerUserDay - bucketCount(rows, `img:user:${subject.userId}:${day}`),
      limits.imagesPerIpDay - bucketCount(rows, `img:ip:${subject.ipHash}:${day}`),
      limits.imagesPerDay - bucketCount(rows, `img:all:${day}`),
      limits.imagesPerMonth - bucketCount(rows, `img:all:${month}`),
    );
    if (imagesLeft < 12) throw new TrialLimitError('daily');
    applyCounters(db, counters, day, month);
    return statusFrom(db.trialUsage, subject, limits);
  });
}

/** 읽기 전용 — 오늘 미리보기 팩을 만들 수 있는지 (화면 버튼 상태) */
export async function trialPreviewPackAllowed(subject: TrialSubject): Promise<boolean> {
  const status = await trialStatusFor(subject);
  return status.enabled && status.previewPacksLeftToday > 0 && status.imagesLeftToday >= 12;
}

/**
 * 사진 특징 재확인(AI 비전 1회)은 이미지 1장보다 싸지만, 반복 호출로 원가를 만들 수 있다.
 *  · 체험 사용자에게만 사용자·IP 하루 상한을 둔다 (일반 사용자는 기존 속도 제한만).
 */
export async function consumeTrialPrep(subject: TrialSubject): Promise<void> {
  const limits = trialLimits();
  const day = dayKey();
  const month = monthOf(day);
  const counters: Counter[] = [
    { bucket: `prep:user:${subject.userId}:${day}`, limit: limits.prepsPerUserDay, scope: 'prep' },
    { bucket: `prep:ip:${subject.ipHash}:${day}`, limit: limits.prepsPerIpDay, scope: 'prep' },
  ];
  await withDB((db) => { applyCounters(db, counters, day, month); });
}

interface Counter {
  bucket: string;
  limit: number;
  scope: TrialLimitScope;
}

/** 상한을 먼저 모두 확인한 뒤에만 증가시킨다 (하나라도 넘으면 아무것도 쓰지 않는다). */
function applyCounters(db: { trialUsage: TrialUsage[] }, counters: Counter[], day: string, month: string): void {
  const keep = (bucket: string) => bucket.endsWith(day) || bucket.endsWith(month);
  // 창이 지난 카운터는 버린다 (저장소가 무한히 커지지 않게)
  db.trialUsage = (Array.isArray(db.trialUsage) ? db.trialUsage : []).filter((row) => keep(row.bucket));
  for (const counter of counters) {
    if (bucketCount(db.trialUsage, counter.bucket) + 1 > counter.limit) throw new TrialLimitError(counter.scope);
  }
  for (const counter of counters) {
    const row = db.trialUsage.find((item) => item.bucket === counter.bucket);
    if (row) {
      row.count += 1;
      row.updatedAt = new Date().toISOString();
    } else {
      db.trialUsage.push({ id: uid('trial'), bucket: counter.bucket, count: 1, updatedAt: new Date().toISOString() });
    }
  }
}
