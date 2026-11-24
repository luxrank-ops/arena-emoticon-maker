// ─────────────────────────────────────────────────────────────
// 교환권(코드) 결제 — PG 계약·수수료 0원으로 여는 유료 전환 경로
//
// 왜 필요한가
//  · 토스페이먼츠는 **사업자등록 + 전자계약 + 카드사 심사(최대 10~14영업일)** 가 끝나야 라이브 키가
//    나온다. 그 전까지 /pricing 의 유료 버튼은 전부 503(PAYMENT_UNAVAILABLE) 로 막혀 매출이 0 이다.
//  · 교환권은 그 기간에도 "받고 → 주는" 경로를 연다.
//      ① 오프라인·메신저 판매: 입금 확인 후 운영자가 코드를 발급.
//      ② 앱인토스·스토어 선물코드, 제휴·체험단 배포.
//      ③ 사업자등록 전 리워드(광고) 수익 → 코드로 크레딧 지급.
//  · PG 를 거치지 않으므로 수수료·정산 지연·카드사 심사가 없다.
//    단, 이것은 PG 대체 '결제'가 아니라 **상품 인도 수단**이다 — docs/FREE-PAYMENT-PLAYBOOK.md §3.
//
// 안전 원칙 (판정은 서버 한 곳에서만)
//  · 코드 원문은 저장하지 않는다(sha256 해시만). 운영 콘솔·로그·API 응답에도 원문이 남지 않는다.
//  · 추측 불가 코드(32자리 base32 = 160비트) + 사용자·IP 시도 제한(메모리 + 저장소) 이중 방어.
//  · 지급은 withPaymentDB 한 번의 CAS 트랜잭션 — 사용 처리·원장 적립·주문 기록·감사 로그가 함께 커밋된다.
//  · 무료로 열어 주는 것(팩 잠금 해제)은 pricing.ts 의 REDEEMABLE_* 화이트리스트 SKU 만 허용한다.
// ─────────────────────────────────────────────────────────────
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { REDEEMABLE_CREDIT_SKUS, REDEEMABLE_UNLOCK_SKUS, SKUS, redeemableSkus, unlockSkuForPack } from '@/lib/pricing';
import { logEvent, uid, withPaymentDB } from '@/lib/store';
import type { DB } from '@/lib/store';
import type { Order, Plan, RedeemBatch, RedeemCode } from '@/lib/types';

/** 코드 원문 형식: 32자리 base32 (160비트) */
export const REDEEM_CODE_LENGTH = 32;
export const REDEEM_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{32}$/;
/** base32 알파벳 — 0/O, 1/I 처럼 헷갈리는 글자를 뺀다 (전화·메신저로 불러줄 수 있어야 한다) */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** 입력 오탈자 보정: O→0, I/L→1 */
const CONFUSABLES: Record<string, string> = { O: '0', I: '1', L: '1' };
/** 한 사람이 1시간에 시도할 수 있는 코드 수 */
const USER_ATTEMPTS = 10;
/** IP 1곳이 1시간에 시도할 수 있는 코드 수 */
const IP_ATTEMPTS = 30;
/** 저장소 실패 기록 집계 창 */
const FAIL_WINDOW_MS = 60 * 60_000;
const MAX_FAIL_ENTRIES = 400;
const ATTEMPT_TTL_MS = 60 * 60_000;
/** 한 번에 발급할 수 있는 코드 수 상한 */
export const MAX_BATCH_SIZE = 200;
/** 발급 유효기간 기본·상한 (일) */
export const DEFAULT_VALID_DAYS = 365;
export const MAX_VALID_DAYS = 1095;
/** 실패 시도 기록용 가상 묶음 ID */
export const FAIL_BATCH = '__fail';

export type RedeemErrorCode =
  | 'INVALID_CODE'
  | 'CODE_NOT_FOUND'
  | 'CODE_DISABLED'
  | 'CODE_REVOKED'
  | 'CODE_USED'
  | 'CODE_EXPIRED'
  | 'CODE_NOT_YET_VALID'
  | 'TARGET_REQUIRED'
  | 'TARGET_INVALID'
  | 'TARGET_ALREADY_OPEN'
  | 'INVALID_SKU'
  | 'INVALID_QUANTITY'
  | 'TOO_MANY_ATTEMPTS'
  | 'ACCOUNT_REQUIRED'
  | 'NOT_AUTHORIZED';

export class RedeemError extends Error {
  constructor(
    public code: RedeemErrorCode,
    message: string,
    public status = 409,
    /** 429 안내용 */
    public retryAfterSec?: number,
  ) {
    super(message);
    this.name = 'RedeemError';
  }
}

// ─────────────────────────────────────────────────────────────
// 코드 생성·정규화
// ─────────────────────────────────────────────────────────────

/** 사람이 읽기 좋은 형태(XXXX-XXXX-…) — 저장·비교에는 normalizeRedeemCode 를 쓴다 */
export function formatRedeemCode(raw: string): string {
  const clean = String(raw ?? '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join('-') ?? clean;
}

/** 사용자가 붙여넣거나 불러준 코드를 정규화한다. 형식이 맞지 않으면 null. */
export function normalizeRedeemCode(input: string): string | null {
  const cleaned = String(input ?? '')
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .replace(/[OIL]/g, (ch) => CONFUSABLES[ch] ?? ch);
  if (cleaned.length !== REDEEM_CODE_LENGTH) return null;
  if (!REDEEM_CODE_PATTERN.test(cleaned)) return null;
  return cleaned;
}

export function hashRedeemCode(normalized: string): string {
  return createHash('sha256').update(`emotihak:redeem:v1:${normalized}`).digest('hex');
}

/** 새 코드 원문을 만든다 (암호학적 난수). 혼동 글자(O·I·L)는 나오지 않는다. */
export function generateRedeemCode(): string {
  const bytes = randomBytes(REDEEM_CODE_LENGTH);
  let out = '';
  for (let i = 0; i < REDEEM_CODE_LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** 해시 문자열을 타이밍 안전하게 비교한다 */
function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length || !/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// SKU 화이트리스트
// ─────────────────────────────────────────────────────────────

export function redeemSkuAllowed(sku: string): boolean {
  return redeemableSkus().includes(sku);
}

export function redeemSkuKind(sku: string): 'unlock' | 'credits' | 'subscription' {
  if (SKUS[sku]?.kind) return SKUS[sku].kind as 'unlock' | 'credits' | 'subscription';
  return 'credits';
}

/** 화면·문서에서 "무료로 열 수 있는 상품" 목록을 같은 출처로 보여 준다. */
export function redeemCatalog() {
  const skus = redeemableSkus();
  return skus.map((sku) => ({
    sku,
    title: SKUS[sku]?.title ?? sku,
    price: SKUS[sku]?.price ?? 0,
    kind: redeemSkuKind(sku),
    credits: SKUS[sku]?.credits ?? 0,
    desc: SKUS[sku]?.desc ?? '',
  }));
}

export const REDEEM_UNLOCK_SKUS: readonly string[] = REDEEMABLE_UNLOCK_SKUS;
export const REDEEM_CREDIT_SKUS: readonly string[] = REDEEMABLE_CREDIT_SKUS;

// ─────────────────────────────────────────────────────────────
// 상태 판정 (읽기 전용 — 화면·API 공용)
// ─────────────────────────────────────────────────────────────

export type RedeemState = 'active' | 'used' | 'revoked' | 'disabled' | 'expired' | 'scheduled';

export interface RedeemCodeView {
  state: RedeemState;
  sku: string;
  label: string;
  remaining: number;
  quantity: number;
  expiresAt?: string;
  startsAt?: string;
  usedAt?: string;
  usedByMe: boolean;
  batchId: string;
}

type StateInput = Pick<RedeemCode, 'disabled' | 'revokedAt' | 'quantity' | 'usedCount' | 'expiresAt' | 'startsAt'>;

export function redeemStateOf(code: StateInput, now = Date.now()): RedeemState {
  if (code.revokedAt) return 'revoked';
  if (code.disabled) return 'disabled';
  if (code.startsAt && Date.parse(code.startsAt) > now) return 'scheduled';
  if (code.expiresAt && Date.parse(code.expiresAt) <= now) return 'expired';
  if (code.usedCount >= code.quantity) return 'used';
  return 'active';
}

export function redeemRemaining(code: Pick<RedeemCode, 'quantity' | 'usedCount'>): number {
  return Math.max(0, code.quantity - code.usedCount);
}

const STATE_MESSAGE: Record<Exclude<RedeemState, 'active'>, string> = {
  used: '이미 사용된 코드예요.',
  revoked: '사용이 중지된 코드예요. 구입처에 문의해 주세요.',
  disabled: '아직 활성화되지 않은 코드예요. 구입처에 문의해 주세요.',
  expired: '유효기간이 지난 코드예요. 구입처에 문의해 주세요.',
  scheduled: '아직 사용할 수 없는 코드예요. 시작일 이후에 다시 시도해 주세요.',
};

const STATE_ERROR: Record<Exclude<RedeemState, 'active'>, RedeemErrorCode> = {
  used: 'CODE_USED',
  revoked: 'CODE_REVOKED',
  disabled: 'CODE_DISABLED',
  expired: 'CODE_EXPIRED',
  scheduled: 'CODE_NOT_YET_VALID',
};

// ─────────────────────────────────────────────────────────────
// 시도 제한 — 메모리(즉시) + 저장소(재시작·다중 인스턴스 방어)
// ─────────────────────────────────────────────────────────────

interface AttemptBucket {
  hits: number[];
}
const mem = globalThis as unknown as { __emotihakRedeemAttempts?: Map<string, AttemptBucket> };
mem.__emotihakRedeemAttempts ??= new Map<string, AttemptBucket>();
const attemptBuckets = mem.__emotihakRedeemAttempts;

function rateCheck(key: string, limit: number, now: number): { ok: boolean; retryAfterSec: number } {
  let bucket = attemptBuckets.get(key);
  if (!bucket) {
    if (attemptBuckets.size > 5_000) {
      const oldest = attemptBuckets.keys().next().value;
      if (oldest) attemptBuckets.delete(oldest);
    }
    bucket = { hits: [] };
    attemptBuckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter((t) => t > now - ATTEMPT_TTL_MS);
  if (bucket.hits.length >= limit) {
    const retry = Math.max(1, Math.ceil((bucket.hits[0] + ATTEMPT_TTL_MS - now) / 1000));
    return { ok: false, retryAfterSec: retry };
  }
  bucket.hits.push(now);
  return { ok: true, retryAfterSec: 0 };
}

/** 테스트/개발용 초기화 */
export function resetRedeemAttempts() {
  attemptBuckets.clear();
}

export function redeemIpHash(ip: string | null | undefined): string {
  return createHash('sha256').update(`emotihak:redeem-ip:${ip ?? 'unknown'}`).digest('hex').slice(0, 24);
}

/** 실패 기록도 코드 테이블에 함께 둔다 — KV 샤드 스키마를 늘리지 않으려는 선택. */
function failRows(db: DB): RedeemCode[] {
  const since = new Date(Date.now() - FAIL_WINDOW_MS).toISOString();
  return db.redeemCodes.filter((row) => row.batchId === FAIL_BATCH && row.createdAt >= since);
}

/**
 * 실패 시도를 저장소에 남긴다.
 *  · 지급 트랜잭션은 실패하면 통째로 롤백되므로, 실패 기록은 **별도 트랜잭션**으로 커밋한다.
 *  · 여기서 던지지 않는다 — 기록 실패가 사용자 응답을 바꾸면 안 된다(메모리 제한이 1차 방어).
 */
async function recordFailureCommitted(userId: string, ipHash: string): Promise<void> {
  try {
    await withPaymentDB((db) => recordFailure(db, userId, ipHash));
  } catch {
    /* 저장소 경합·장애: 다음 시도에서 재기록. 응답은 그대로 */
  }
}

function recordFailure(db: DB, userId: string, ipHash: string) {
  const now = new Date().toISOString();
  db.redeemCodes.push({
    codeHash: `fail_${uid('f')}`,
    batchId: FAIL_BATCH,
    sku: '__fail',
    label: '__fail',
    quantity: 1,
    usedCount: 0,
    issuedAt: now,
    issuedBy: userId,
    ipHash,
    createdAt: now,
  });
  const rows = failRows(db);
  if (rows.length > MAX_FAIL_ENTRIES) {
    const drop = new Set(rows.slice(0, rows.length - MAX_FAIL_ENTRIES).map((row) => row.codeHash));
    db.redeemCodes = db.redeemCodes.filter((row) => !drop.has(row.codeHash));
  }
}

// ─────────────────────────────────────────────────────────────
// 발급 (운영자 전용)
// ─────────────────────────────────────────────────────────────

export interface IssueBatchInput {
  sku: string;
  quantity: number;
  count: number;
  label: string;
  note?: string;
  validDays?: number;
  startsAt?: string;
  /** 특정 사용자에게 귀속 발급 (CS 재발급·보상). 없으면 누구나 사용 가능 */
  issuedTo?: string;
  /** 코드 앞자리 고정 (제휴 캠페인 표기용 — 나머지는 난수) */
  prefix?: string;
}

export interface IssueBatchResult {
  batch: RedeemBatch;
  /** 원문 코드 — 이 응답에서 한 번만 노출된다. 저장소에는 해시만 남는다. */
  codes: string[];
}

/**
 * 발급 직후 원문을 돌려주기 위한 임시 보관소 (프로세스 메모리).
 *  · 서버 재시작 시 사라진다 → 원문 복구는 불가, 필요하면 재발급.
 *  · 저장소·감사 로그에는 해시만 남는다.
 */
const issuedCache = new Map<string, string[]>();

export function issuedPlainCodes(batchId: string): string[] {
  return issuedCache.get(batchId) ?? [];
}

export async function issueRedeemBatch(issuerId: string, input: IssueBatchInput): Promise<IssueBatchResult> {
  const sku = String(input.sku ?? '').trim();
  if (!redeemSkuAllowed(sku)) throw new RedeemError('INVALID_SKU', '교환권으로 지급할 수 없는 상품입니다.', 422);
  const count = Math.floor(Number(input.count));
  if (!Number.isFinite(count) || count < 1 || count > MAX_BATCH_SIZE) {
    throw new RedeemError('INVALID_QUANTITY', `한 번에 1~${MAX_BATCH_SIZE}개까지 발급할 수 있습니다.`, 422);
  }
  const quantity = Math.floor(Number(input.quantity ?? 1));
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new RedeemError('INVALID_QUANTITY', '코드 1개당 지급 횟수는 1 이상이어야 합니다.', 422);
  }
  const label = String(input.label ?? '').trim().slice(0, 80) || '교환권';
  const validDays = Math.min(MAX_VALID_DAYS, Math.max(1, Math.floor(Number(input.validDays ?? DEFAULT_VALID_DAYS))));
  const startsAt = input.startsAt && !Number.isNaN(Date.parse(input.startsAt)) ? new Date(input.startsAt).toISOString() : undefined;
  const expiresAt = new Date(Date.now() + validDays * 86_400_000).toISOString();
  const prefix = (input.prefix ?? '')
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase()
    .replace(/[OIL]/g, (ch) => CONFUSABLES[ch] ?? ch)
    .slice(0, 8);

  // 원문은 여기서만 만든다 → 해시만 트랜잭션으로 넘긴다.
  const plain = new Set<string>();
  while (plain.size < count) {
    let code = generateRedeemCode();
    if (prefix) code = `${prefix}${code.slice(prefix.length)}`;
    if (REDEEM_CODE_PATTERN.test(code)) plain.add(code);
  }
  const list = [...plain];

  const created = await withPaymentDB((db) => {
    const now = new Date().toISOString();
    const existing = new Set(db.redeemCodes.map((row) => row.codeHash));
    const batch: RedeemBatch = {
      id: uid('rbt'),
      sku,
      label,
      quantity,
      count: 0,
      issuedAt: now,
      issuedBy: issuerId,
      expiresAt,
      ...(input.note ? { note: String(input.note).slice(0, 200) } : {}),
      createdAt: now,
    };
    const rows: RedeemCode[] = [];
    const accepted: string[] = [];
    for (const code of list) {
      const codeHash = hashRedeemCode(code);
      if (existing.has(codeHash)) continue; // 160비트 난수 충돌 — 실질적으로 불가능하지만 방어
      existing.add(codeHash);
      accepted.push(code);
      rows.push({
        codeHash,
        batchId: batch.id,
        sku,
        label,
        ...(input.note ? { note: String(input.note).slice(0, 200) } : {}),
        quantity,
        usedCount: 0,
        issuedAt: now,
        issuedBy: issuerId,
        ...(input.issuedTo ? { issuedTo: input.issuedTo } : {}),
        expiresAt,
        ...(startsAt ? { startsAt } : {}),
        createdAt: now,
      });
    }
    batch.count = rows.length;
    db.redeemBatches.push(batch);
    db.redeemCodes.push(...rows);
    logEvent(db, issuerId, 'redeem_issued', { batchId: batch.id, sku, count: rows.length, quantity });
    return { batch, codes: accepted };
  });

  issuedCache.set(created.batch.id, created.codes);
  return created;
}

// ─────────────────────────────────────────────────────────────
// 교환 (사용자)
// ─────────────────────────────────────────────────────────────

export interface RedeemResult {
  orderId: string;
  kind: Order['kind'];
  sku: string;
  label: string;
  credits: number;
  balance: number;
  packId?: string;
  remaining: number;
}

export interface RedeemInput {
  userId: string;
  rawCode: string;
  /** 잠금 해제 대상 팩 — unlock SKU 일 때 필수 */
  packId?: string;
  ip?: string | null;
  now?: number;
}

/**
 * 교환권 1회 사용. 검증 → 지급 → 주문 기록 → 감사 로그를 한 번의 CAS 트랜잭션으로 커밋한다.
 *  · 실패하면 아무 것도 바뀌지 않는다 (사용 횟수도 늘지 않는다).
 *  · 같은 코드로 동시에 두 번 요청해도 남은 횟수 안에서만 지급된다 (직렬화).
 */
export async function redeemCode(input: RedeemInput): Promise<RedeemResult> {
  const now = input.now ?? Date.now();
  const ipHash = redeemIpHash(input.ip);

  const memUser = rateCheck(`u:${input.userId}`, USER_ATTEMPTS, now);
  if (!memUser.ok) throw new RedeemError('TOO_MANY_ATTEMPTS', '시도 횟수가 너무 많아요. 잠시 후 다시 시도해 주세요.', 429, memUser.retryAfterSec);
  const memIp = rateCheck(`i:${ipHash}`, IP_ATTEMPTS, now);
  if (!memIp.ok) throw new RedeemError('TOO_MANY_ATTEMPTS', '시도 횟수가 너무 많아요. 잠시 후 다시 시도해 주세요.', 429, memIp.retryAfterSec);

  const normalized = normalizeRedeemCode(input.rawCode);
  if (!normalized) throw new RedeemError('INVALID_CODE', '코드를 다시 확인해 주세요. 32자리 코드예요.', 422);
  const codeHash = hashRedeemCode(normalized);

  try {
    return await redeemInTransaction(input, codeHash, ipHash, now);
  } catch (error) {
    // 추측 시도(없는 코드·귀속 불일치)만 저장소에 집계한다. 실제 코드의 상태 오류는 집계하지 않는다.
    if (error instanceof RedeemError && (error.code === 'CODE_NOT_FOUND' || error.code === 'NOT_AUTHORIZED')) {
      await recordFailureCommitted(input.userId, ipHash);
    }
    throw error;
  }
}

/** 지급 트랜잭션 본체 — 실패하면 아무 것도 반영되지 않는다(사용 횟수 포함). */
function redeemInTransaction(input: RedeemInput, codeHash: string, ipHash: string, now: number): Promise<RedeemResult> {
  return withPaymentDB((db) => {
    const failures = failRows(db);
    if (failures.filter((row) => row.issuedBy === input.userId).length >= USER_ATTEMPTS * 3
      || failures.filter((row) => row.ipHash === ipHash).length >= IP_ATTEMPTS * 3) {
      throw new RedeemError('TOO_MANY_ATTEMPTS', '시도 횟수가 너무 많아요. 1시간 뒤에 다시 시도해 주세요.', 429, 3600);
    }

    const code = db.redeemCodes.find((row) => row.batchId !== FAIL_BATCH && sameHash(row.codeHash, codeHash));
    if (!code) {
      // 존재 여부를 흘리지 않도록 '없음'과 '귀속 불일치'를 같은 문구로 응답한다.
      throw new RedeemError('CODE_NOT_FOUND', '사용할 수 없는 코드예요. 코드를 다시 확인해 주세요.', 404);
    }
    if (code.issuedTo && code.issuedTo !== input.userId) {
      throw new RedeemError('NOT_AUTHORIZED', '사용할 수 없는 코드예요. 코드를 다시 확인해 주세요.', 404);
    }
    const state = redeemStateOf(code, now);
    if (state !== 'active') {
      throw new RedeemError(STATE_ERROR[state], STATE_MESSAGE[state], state === 'used' ? 409 : 410);
    }

    const user = db.users.find((item) => item.id === input.userId);
    if (!user) throw new RedeemError('ACCOUNT_REQUIRED', '로그인 후 사용할 수 있어요.', 401);

    const skuDef = SKUS[code.sku];
    if (!skuDef) throw new RedeemError('INVALID_SKU', '알 수 없는 상품 코드예요. 구입처에 문의해 주세요.', 422);
    const kind = redeemSkuKind(code.sku);
    const nowIso = new Date(now).toISOString();
    const orderId = `ord_${uid('rdm')}`;

    let credits = 0;
    let packId: string | undefined;

    if (kind === 'unlock') {
      if (!input.packId) throw new RedeemError('TARGET_REQUIRED', '잠금을 해제할 팩을 골라 주세요.', 422);
      const pack = db.packs.find((item) => item.id === input.packId && item.userId === input.userId);
      if (!pack) throw new RedeemError('TARGET_INVALID', '내 팩에서만 잠금을 해제할 수 있어요.', 404);
      if (pack.unlockedAt) throw new RedeemError('TARGET_ALREADY_OPEN', '이미 잠금이 풀린 팩이에요. 다른 팩을 골라 주세요.', 409);
      if (unlockSkuForPack(pack.format, pack.subjectKind) !== code.sku) {
        throw new RedeemError('TARGET_INVALID', '이 코드는 다른 구성의 완성권이에요. 교환할 팩을 다시 골라 주세요.', 422);
      }
      pack.unlockedAt = nowIso;
      pack.unlockSku = code.sku;
      packId = pack.id;
      logEvent(db, input.userId, 'pack_unlocked', { packId: pack.id, sku: code.sku, via: 'redeem', batchId: code.batchId });
    } else if (kind === 'subscription') {
      user.plan = (skuDef.plan ?? 'STUDIO') as Plan;
      const days = skuDef.days ?? 30;
      user.planExpiresAt = new Date(now + days * 86_400_000).toISOString();
      credits = skuDef.credits;
      if (credits > 0) {
        user.credits += credits;
        db.credits.push({
          id: uid('cr'),
          userId: input.userId,
          delta: credits,
          reason: 'SUBSCRIPTION_GRANT',
          memo: `${code.label} 교환권`,
          refType: 'order',
          refId: orderId,
          balanceAfter: user.credits,
          createdAt: nowIso,
        });
      }
    } else {
      credits = skuDef.credits;
      user.credits += credits;
      db.credits.push({
        id: uid('cr'),
        userId: input.userId,
        delta: credits,
        reason: 'PURCHASE',
        memo: `${code.label} 교환권`,
        refType: 'order',
        refId: orderId,
        balanceAfter: user.credits,
        createdAt: nowIso,
      });
    }

    const order: Order = {
      id: orderId,
      userId: input.userId,
      kind,
      sku: code.sku,
      title: `${code.label} (교환권)`,
      // 교환권은 PG 승인 금액이 없다 — 0원 주문으로 남기고 provider 로 지급 경로를 구분한다.
      amount: 0,
      credits,
      plan: skuDef.plan,
      status: 'PAID',
      provider: 'redeem',
      createdAt: nowIso,
      paidAt: nowIso,
      consentAt: nowIso,
      ...(packId ? { packId } : {}),
    };
    db.orders.push(order);

    code.usedCount += 1;
    if (code.usedCount >= code.quantity && !code.usedAt) code.usedAt = nowIso;
    code.redemption = {
      userId: input.userId,
      at: nowIso,
      ipHash,
      orderId,
      ...(packId ? { packId } : {}),
    };

    logEvent(db, input.userId, 'redeem_used', {
      batchId: code.batchId,
      sku: code.sku,
      credits,
      orderId,
      remaining: redeemRemaining(code),
    });

    return {
      orderId,
      kind,
      sku: code.sku,
      label: code.label,
      credits,
      balance: user.credits,
      ...(packId ? { packId } : {}),
      remaining: redeemRemaining(code),
    } satisfies RedeemResult;
  });
}

/** 내 교환권 사용 이력 */
export async function redeemHistoryFor(userId: string): Promise<{ label: string; sku: string; at: string; orderId: string; batchId: string }[]> {
  return withPaymentDB((db) =>
    db.redeemCodes
      .filter((code) => code.batchId !== FAIL_BATCH && code.redemption?.userId === userId)
      .map((code) => ({
        label: code.label,
        sku: code.sku,
        at: code.redemption!.at,
        orderId: code.redemption!.orderId,
        batchId: code.batchId,
      }))
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 20),
  );
}

/** 사용 전 상태 확인 (오탈자·만료 점검). 코드 상세는 원문 없이 상태만 보여 준다. */
export async function redeemStatusFor(userId: string, rawCode: string): Promise<RedeemCodeView> {
  const normalized = normalizeRedeemCode(rawCode);
  if (!normalized) throw new RedeemError('INVALID_CODE', '코드를 다시 확인해 주세요. 32자리 코드예요.', 422);
  const codeHash = hashRedeemCode(normalized);
  return withPaymentDB((db) => {
    const code = db.redeemCodes.find((row) => row.batchId !== FAIL_BATCH && sameHash(row.codeHash, codeHash));
    if (!code) throw new RedeemError('CODE_NOT_FOUND', '사용할 수 없는 코드예요. 코드를 다시 확인해 주세요.', 404);
    const mine = code.redemption?.userId === userId;
    if (code.issuedTo && code.issuedTo !== userId && !mine) {
      throw new RedeemError('NOT_AUTHORIZED', '사용할 수 없는 코드예요.', 404);
    }
    const state = redeemStateOf(code);
    return {
      state,
      sku: code.sku,
      label: code.label,
      remaining: redeemRemaining(code),
      quantity: code.quantity,
      ...(code.expiresAt ? { expiresAt: code.expiresAt } : {}),
      ...(code.startsAt ? { startsAt: code.startsAt } : {}),
      ...(code.usedAt ? { usedAt: code.usedAt } : {}),
      usedByMe: mine,
      batchId: code.batchId,
    } satisfies RedeemCodeView;
  });
}

// ─────────────────────────────────────────────────────────────
// 운영자: 조회 · 폐기 · 대사
// ─────────────────────────────────────────────────────────────

export interface RedeemAdminRow {
  batchId: string;
  label: string;
  sku: string;
  quantity: number;
  count: number;
  issuedAt: string;
  expiresAt: string;
  used: number;
  remaining: number;
  revoked: number;
  issuedBy: string;
  note?: string;
}

/** 운영 콘솔 목록 — 코드 원문·해시는 절대 내려주지 않는다. */
export async function redeemAdminRows(): Promise<RedeemAdminRow[]> {
  return withPaymentDB((db) =>
    db.redeemBatches
      .map((batch) => {
        const rows = db.redeemCodes.filter((code) => code.batchId === batch.id);
        const used = rows.filter((code) => code.usedCount >= code.quantity).length;
        return {
          batchId: batch.id,
          label: batch.label,
          sku: batch.sku,
          quantity: batch.quantity,
          count: rows.length,
          issuedAt: batch.issuedAt,
          expiresAt: batch.expiresAt,
          used,
          remaining: rows.length - used,
          revoked: rows.filter((code) => code.revokedAt).length,
          issuedBy: batch.issuedBy,
          ...(batch.note ? { note: batch.note } : {}),
        } satisfies RedeemAdminRow;
      })
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
      .slice(0, 50),
  );
}

/** 묶음의 남은 코드를 모두 폐기한다 (환불·사고 대응). 이미 사용된 코드는 그대로 둔다. */
export async function revokeRedeemBatch(adminId: string, batchId: string, reason: string): Promise<{ revoked: number }> {
  return withPaymentDB((db) => {
    const batch = db.redeemBatches.find((row) => row.id === batchId);
    if (!batch) throw new RedeemError('CODE_NOT_FOUND', '발급 묶음을 찾을 수 없습니다.', 404);
    const nowIso = new Date().toISOString();
    let revoked = 0;
    for (const code of db.redeemCodes) {
      if (code.batchId !== batchId) continue;
      if (code.revokedAt || code.usedCount >= code.quantity) continue;
      code.revokedAt = nowIso;
      code.revokedBy = adminId;
      code.revokeReason = String(reason ?? '').slice(0, 200);
      revoked += 1;
    }
    logEvent(db, adminId, 'redeem_revoked', { batchId, revoked, reason: String(reason ?? '').slice(0, 120) });
    return { revoked };
  });
}

/**
 * 운영 대사: 발급·사용·폐기·만료 잔량과 지급된 크레딧 합계.
 *  · 교환권은 현금 영수증이 없으므로 판매 대금은 운영자가 입금 기록과 대조한다.
 *  · 여기서는 지급(부채) 관점의 수량만 정확히 센다.
 */
export async function redeemReconciliation(): Promise<{
  batches: number;
  issued: number;
  used: number;
  active: number;
  expired: number;
  revoked: number;
  creditsGranted: number;
  unlocksGranted: number;
  expiringSoon: number;
}> {
  return withPaymentDB((db) => {
    const now = Date.now();
    const soon = now + 30 * 86_400_000;
    const rows = db.redeemCodes.filter((code) => code.batchId !== FAIL_BATCH);
    const redeemOrderIds = new Set(db.orders.filter((order) => order.provider === 'redeem').map((order) => order.id));
    const creditsGranted = db.credits
      .filter((entry) => entry.delta > 0 && entry.refType === 'order' && redeemOrderIds.has(entry.refId ?? ''))
      .reduce((sum, entry) => sum + entry.delta, 0);
    return {
      batches: db.redeemBatches.length,
      issued: rows.length,
      used: rows.filter((code) => code.usedCount >= code.quantity).length,
      active: rows.filter((code) => redeemStateOf(code, now) === 'active').length,
      expired: rows.filter((code) => redeemStateOf(code, now) === 'expired').length,
      revoked: rows.filter((code) => redeemStateOf(code, now) === 'revoked').length,
      creditsGranted,
      unlocksGranted: db.orders.filter((order) => order.provider === 'redeem' && order.kind === 'unlock' && order.status === 'PAID').length,
      expiringSoon: rows.filter((code) => redeemStateOf(code, now) === 'active' && code.expiresAt && Date.parse(code.expiresAt) <= soon).length,
    };
  });
}
