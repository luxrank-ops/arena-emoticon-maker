import { createHash } from 'node:crypto';
import { getAccessToken, type ServiceAccount } from '@/lib/gcp-token';
import { logEvent, uid, withDB } from '@/lib/store';
import { PLAY_CREDITS_PER_PURCHASE, PLAY_PRODUCT_DEFAULTS, isPlayConsumable } from '@/lib/play-products';
import type { PlayPurchase } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 구글 플레이 인앱결제 — 서버 구매 검증·자격 원장 (서버 전용)
//
// 원칙
//  · 유료 자격은 **서버가 구글 Play Developer API 로 검증한 기록**으로만 부여한다.
//    TWA/ UA, x-emotihak-play 헤더 같은 환경 신호는 자격 근거가 아니다(위조 가능).
//  · 구매 토큰은 계정(userId)에 귀속해 저장한다 — 기기·브라우저가 아니라 사람에게 붙는다.
//  · acknowledge 를 서버에서 호출한다(3일 내 미확인 시 구글 자동 환불).
//  · 환불·취소는 상태를 REVOKED 로 바꿔 자격을 회수한다.
//  · 서비스 계정이 없으면 아무것도 승인하지 않고 503 으로 안내한다(fail-closed).
//
// 필요한 설정 (운영 Worker Secret)
//  · GOOGLE_PLAY_SERVICE_ACCOUNT_JSON : Play Console 에서 권한을 준 서비스 계정 JSON 전체
//  · PLAY_PACKAGE_NAME                 : 기본 com.emotihak.app
//  · PLAY_BILLING_ENABLED=1            : 화면에서 구매 버튼을 노출할 때만
//  · (테스트 전용) PLAY_API_BASE_URL / PLAY_TOKEN_URL
// ─────────────────────────────────────────────────────────────

export const ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
export const PLAY_API_BASE = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
export const DEFAULT_PLAY_PACKAGE = 'com.emotihak.app';

/** 구독으로 인정하는 상태 (유예 기간 포함). 그 밖의 상태는 자격이 없다. */
const ENTITLED_SUBSCRIPTION_STATES = new Set([
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
]);

export class PlayPurchaseError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'PlayPurchaseError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Cloudflare Worker 바인딩은 globalThis.CLOUDFLARE_ENV 로도 들어오고,
 * Secret/일반 환경변수는 process.env 로 들어온다. 두 경로를 같은 방식으로 읽는다.
 */
function envValue(name: string): string {
  const cf = (globalThis as unknown as { CLOUDFLARE_ENV?: Record<string, unknown> }).CLOUDFLARE_ENV;
  const fromCf = cf?.[name];
  if (typeof fromCf === 'string' && fromCf.trim()) return fromCf;
  const fromProcess = process.env[name];
  return typeof fromProcess === 'string' ? fromProcess : '';
}

export function playPackageName(): string {
  return (envValue('PLAY_PACKAGE_NAME') || DEFAULT_PLAY_PACKAGE).trim();
}

/** 서버 검증 허용 상품 목록 — 콘솔에 등록한 상품만 자격을 만들 수 있다. */
export function allowedPlayProductIds(): string[] {
  const raw = envValue('PLAY_PRODUCT_IDS');
  if (raw.trim()) return raw.split(',').map((item) => item.trim()).filter(Boolean);
  return [...PLAY_PRODUCT_DEFAULTS];
}

export function isAllowedPlayProduct(productId: string): boolean {
  return allowedPlayProductIds().includes(productId);
}

/** 화면에서 Play Billing UI 를 노출할지 (기본 꺼짐 — 상품 등록·검증 설정 후 켠다) */
export function playBillingEnabled(): boolean {
  return envValue('PLAY_BILLING_ENABLED') === '1';
}

/** 구매 검증용 서비스 계정. 없으면 null (fail-closed). */
export function playServiceAccount(): ServiceAccount | null {
  const raw = envValue('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
      }
    } catch {
      return null;
    }
    return null;
  }
  // Firebase 서비스 계정에 Play Console 권한을 따로 준 경우(운영 단순화용, 명시적으로 켤 때만)
  if (envValue('PLAY_VERIFY_WITH_FIREBASE_SA') === '1') {
    const email = envValue('FIREBASE_CLIENT_EMAIL');
    const key = envValue('FIREBASE_PRIVATE_KEY');
    if (email && key) return { clientEmail: email, privateKey: key };
  }
  return null;
}

export function playVerificationConfigured(): boolean {
  return playServiceAccount() !== null;
}

function apiBase(): string {
  return (envValue('PLAY_API_BASE_URL') || PLAY_API_BASE).replace(/\/$/, '');
}

async function playRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const sa = playServiceAccount();
  if (!sa) {
    throw new PlayPurchaseError(
      'PLAY_VERIFICATION_UNAVAILABLE',
      '구글 플레이 구매 검증이 아직 설정되지 않았습니다. 웹 결제를 이용해 주세요.',
      503,
    );
  }
  const token = await getAccessToken(sa, {
    scope: ANDROID_PUBLISHER_SCOPE,
    timeoutMs: 6000,
    ...(envValue('PLAY_TOKEN_URL') ? { tokenUrl: envValue('PLAY_TOKEN_URL') } : {}),
  });
  const url = `${apiBase()}/applications/${encodeURIComponent(playPackageName())}${path}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    return await fetch(url, {
      ...init,
      cache: 'no-store',
      signal: ctrl.signal,
      headers: {
        ...(init.headers ?? {}),
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export interface PlayVerificationInput {
  productId: string;
  purchaseToken: string;
  kind?: 'INAPP' | 'SUBS';
}

export interface GooglePurchaseResult {
  kind: 'INAPP' | 'SUBS';
  active: boolean;
  purchaseState: string;
  acknowledged: boolean;
  orderId?: string;
  expiresAt?: string | null;
  raw: Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** 구글 응답 → 자격 판단 (INAPP: purchaseState 0, SUBS: subscriptionState) */
export function interpretPurchase(kind: 'INAPP' | 'SUBS', payload: Record<string, unknown>): GooglePurchaseResult {
  if (kind === 'INAPP') {
    const state = String(payload.purchaseState ?? '');
    return {
      kind,
      active: state === '0',
      purchaseState: state || 'unknown',
      acknowledged: String(payload.acknowledgementState ?? '') === '1',
      orderId: text(payload.orderId) || undefined,
      expiresAt: null,
      raw: payload,
    };
  }
  const state = text(payload.subscriptionState) || 'unknown';
  const lineItems = Array.isArray(payload.lineItems) ? (payload.lineItems as Record<string, unknown>[]) : [];
  const expiry = lineItems.map((item) => text(item.expiryTime)).filter(Boolean).sort().pop();
  return {
    kind,
    active: ENTITLED_SUBSCRIPTION_STATES.has(state),
    purchaseState: state,
    acknowledged: text(payload.acknowledgementState) === '1',
    orderId: text(payload.latestOrderId) || undefined,
    expiresAt: expiry ?? null,
    raw: payload,
  };
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** 구매 토큰을 구글에 조회한다 (저장하지 않음). */
export async function fetchPlayPurchase(input: PlayVerificationInput): Promise<GooglePurchaseResult> {
  const kind = input.kind ?? 'INAPP';
  const productPath = encodeURIComponent(input.productId);
  const tokenPath = encodeURIComponent(input.purchaseToken);
  const res = kind === 'INAPP'
    ? await playRequest(`/purchases/products/${productPath}/tokens/${tokenPath}`)
    : await playRequest(`/purchases/subscriptionsv2/tokens/${tokenPath}`);
  if (res.status === 400 || res.status === 404 || res.status === 410) {
    throw new PlayPurchaseError('PLAY_PURCHASE_NOT_FOUND', '구글 플레이에서 이 구매를 확인할 수 없습니다.', 404);
  }
  if (!res.ok) {
    throw new PlayPurchaseError('PLAY_VERIFICATION_FAILED', '구글 플레이 구매 검증에 실패했습니다. 잠시 후 다시 시도해 주세요.', 502);
  }
  return interpretPurchase(kind, await readJson(res));
}

/** 구매 확인(acknowledge). 3일 내 미확인이면 구글이 자동 환불하므로 검증 직후 서버가 호출한다. */
export async function acknowledgePlayPurchase(input: PlayVerificationInput): Promise<boolean> {
  const kind = input.kind ?? 'INAPP';
  const productPath = encodeURIComponent(input.productId);
  const tokenPath = encodeURIComponent(input.purchaseToken);
  const path = kind === 'INAPP'
    ? `/purchases/products/${productPath}/tokens/${tokenPath}:acknowledge`
    : `/purchases/subscriptions/${productPath}/tokens/${tokenPath}:acknowledge`;
  const res = await playRequest(path, { method: 'POST', body: '{}' });
  return res.ok;
}

/**
 * 소비성 상품 소비(consume).
 *  · acknowledge 는 '구매 확인'일 뿐이라 같은 상품을 다시 살 수 없다. 소비성 상품은 `:consume` 이 필요하다.
 *  · 여기서는 상태 표시만 하고, 크레딧 지급은 verifyAndRecordPlayPurchase 의 원장 트랜잭션이 담당한다.
 *    (소비만 되고 지급이 안 되는 순서를 만들지 않는다 — 지급 성공 후에 소비한다)
 */
export async function consumePlayPurchase(input: PlayVerificationInput): Promise<boolean> {
  const productPath = encodeURIComponent(input.productId);
  const tokenPath = encodeURIComponent(input.purchaseToken);
  const res = await playRequest(`/purchases/products/${productPath}/tokens/${tokenPath}:consume`, { method: 'POST', body: '{}' });
  return res.ok;
}

export function playPurchaseId(productId: string, purchaseToken: string): string {
  const digest = createHash('sha256').update(`${playPackageName()}|${productId}|${purchaseToken}`).digest('hex');
  return `plp_${digest.slice(0, 24)}`;
}

/** 저장된 기록이 지금도 자격인지 (상태·만료) */
export function playPurchaseIsActive(record: PlayPurchase, now = Date.now()): boolean {
  if (record.status !== 'ACTIVE') return false;
  if (record.expiresAt && Date.parse(record.expiresAt) <= now) return false;
  return true;
}

/**
 * 구매 토큰을 검증하고 자격 원장에 기록한다.
 *  · active 가 아니면 기록은 REVOKED 로 남긴다(재검증·문의 대응).
 *  · 서비스 계정이 없으면 PlayPurchaseError(503) — 아무 자격도 만들지 않는다.
 */
export async function verifyAndRecordPlayPurchase(userId: string, input: PlayVerificationInput): Promise<PlayPurchase> {
  if (!userId) throw new PlayPurchaseError('LOGIN_REQUIRED', '구매 자격을 계정에 연결하려면 로그인이 필요합니다.', 401);
  const productId = input.productId.trim();
  const purchaseToken = input.purchaseToken.trim();
  if (!productId || !purchaseToken || productId.length > 200 || purchaseToken.length > 4096) {
    throw new PlayPurchaseError('INVALID_INPUT', '상품 ID와 구매 토큰을 확인해 주세요.', 422);
  }
  const result = await fetchPlayPurchase({ productId, purchaseToken, kind: input.kind });
  let acknowledged = result.acknowledged;
  if (result.active && !acknowledged) {
    acknowledged = await acknowledgePlayPurchase({ productId, purchaseToken, kind: result.kind });
  }
  const now = new Date().toISOString();
  const id = playPurchaseId(productId, purchaseToken);
  let granted = 0;
  const saved = await withDB((db) => {
    let record = db.playPurchases.find((item) => item.id === id);
    if (!record) {
      record = {
        id,
        userId,
        packageName: playPackageName(),
        productId,
        purchaseToken,
        kind: result.kind,
        status: 'ACTIVE',
        purchaseState: result.purchaseState,
        acknowledged,
        verifiedAt: now,
      };
      db.playPurchases.push(record);
    }
    // 다른 계정이 같은 토큰을 재사용하지 못하게 소유자를 검증된 계정으로 고정한다.
    record.userId = userId;
    record.packageName = playPackageName();
    record.kind = result.kind;
    record.purchaseState = result.purchaseState;
    record.acknowledged = acknowledged;
    record.verifiedAt = now;
    record.orderId = result.orderId;
    record.expiresAt = result.expiresAt ?? null;
    if (result.active) {
      record.status = 'ACTIVE';
      record.revokedAt = null;
      record.revokeReason = null;
    } else {
      record.status = 'REVOKED';
      record.revokedAt = now;
      record.revokeReason = `STATE_${result.purchaseState}`;
    }

    // 소비성 상품(크레딧)은 서버 검증이 끝난 뒤 **원장에 한 번만** 지급한다.
    //  · 지급 근거는 구매 기록 id(refType='play-purchase')라서 재검증·재시도에도 중복 지급되지 않는다.
    //  · 구매 토큰 없이 화면에서 자격을 만들 수 없으므로, 웹 크레딧처럼 보이지만 출처는 구글 결제다.
    if (record.status === 'ACTIVE' && isPlayConsumable(productId)) {
      const already = db.credits.some((entry) => entry.reason === 'PURCHASE' && entry.refType === 'play-purchase' && entry.refId === record!.id);
      const account = db.users.find((item) => item.id === userId);
      if (!already && account) {
        account.credits += PLAY_CREDITS_PER_PURCHASE;
        db.credits.push({
          id: uid('cr'),
          userId,
          delta: PLAY_CREDITS_PER_PURCHASE,
          reason: 'PURCHASE',
          memo: '구글 플레이 크레딧 구매',
          refType: 'play-purchase',
          refId: record.id,
          balanceAfter: account.credits,
          createdAt: now,
        });
        record.grantedCredits = PLAY_CREDITS_PER_PURCHASE;
        logEvent(db, userId, 'play_purchase_granted', { productId, credits: PLAY_CREDITS_PER_PURCHASE, orderId: result.orderId ?? '' });
        granted = PLAY_CREDITS_PER_PURCHASE;
      } else if (already) {
        record.grantedCredits = record.grantedCredits ?? PLAY_CREDITS_PER_PURCHASE;
      }
    }
    return { ...record };
  });
  // 지급(원장 커밋)이 끝난 뒤에만 구글에 소비를 알린다 — 순서를 뒤집으면 지급 유실이 생긴다.
  // 이미 소비한 구매는 다시 호출하지 않는다(재검증·복원 요청마다 불필요한 API 호출 방지).
  if (saved.status === 'ACTIVE' && isPlayConsumable(productId) && !saved.consumedAt) {
    let consumed = false;
    let consumeError: string | null = null;
    try {
      consumed = await consumePlayPurchase({ productId, purchaseToken, kind: result.kind });
      if (!consumed) consumeError = 'CONSUME_REJECTED';
    } catch (e) {
      consumeError = e instanceof PlayPurchaseError ? e.code : 'CONSUME_FAILED';
    }
    await withDB((db) => {
      const row = db.playPurchases.find((item) => item.id === saved.id);
      if (!row) return;
      row.consumedAt = consumed ? new Date().toISOString() : null;
      row.consumeError = consumeError;
    });
  }
  return { ...saved, ...(granted ? { grantedCredits: granted } : {}) };
}

/** 이미 읽은 DB 스냅샷에서 자격 판정 (세션 해석처럼 저장소 읽기를 한 번으로 줄일 때) */
export function activePlayEntitlementInDB(
  db: { playPurchases?: PlayPurchase[] },
  userId: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!userId) return false;
  const records = (db.playPurchases ?? []).filter((item) => item.userId === userId);
  return records.some((record) => playPurchaseIsActive(record, now));
}

/** 계정의 유효한 플레이 구매 자격이 있는지 (요청마다 호출 — 서버 단일 판단) */
export async function hasActivePlayEntitlement(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  return withDB((db) => activePlayEntitlementInDB(db, userId));
}

/** 계정의 자격 기록 목록 (표시·문의 대응용, 토큰은 노출하지 않는다) */
export async function listPlayEntitlements(userId: string): Promise<Omit<PlayPurchase, 'purchaseToken'>[]> {
  return withDB((db) => db.playPurchases
    .filter((item) => item.userId === userId)
    .map(({ purchaseToken: _token, ...rest }) => rest));
}

/** 환불·취소 회수. 구글 결제 원장이 원본이므로 우리 기록은 자격 상태만 바꾼다. */
export async function revokePlayPurchase(purchaseToken: string, reason: string): Promise<boolean> {
  return withDB((db) => {
    const record = db.playPurchases.find((item) => item.purchaseToken === purchaseToken);
    if (!record) return false;
    record.status = 'REVOKED';
    record.revokedAt = new Date().toISOString();
    record.revokeReason = reason;
    return true;
  });
}

/**
 * 구매 재검증(환불·만료 회수). 크론이 호출한다.
 *  · 구매 토큰을 다시 조회해 자격이 사라졌으면 REVOKED 로 바꾼다.
 *  · 서비스 계정이 없으면 아무것도 바꾸지 않고 skipped 로 알린다.
 */
export async function revalidatePlayEntitlements(limit = 25): Promise<{ configured: boolean; checked: number; revoked: number }> {
  if (!playVerificationConfigured()) return { configured: false, checked: 0, revoked: 0 };
  const targets = await withDB((db) => db.playPurchases
    .filter((item) => item.status === 'ACTIVE')
    .sort((a, b) => a.verifiedAt.localeCompare(b.verifiedAt))
    .slice(0, Math.max(1, Math.min(200, limit)))
    .map((item) => ({ productId: item.productId, purchaseToken: item.purchaseToken, kind: item.kind })));
  let revoked = 0;
  for (const target of targets) {
    try {
      const result = await fetchPlayPurchase(target);
      if (!result.active) {
        if (await revokePlayPurchase(target.purchaseToken, `REVALIDATE_${result.purchaseState}`)) revoked += 1;
        continue;
      }
      await withDB((db) => {
        const record = db.playPurchases.find((item) => item.purchaseToken === target.purchaseToken);
        if (!record) return;
        record.purchaseState = result.purchaseState;
        record.expiresAt = result.expiresAt ?? null;
        record.verifiedAt = new Date().toISOString();
      });
    } catch (e) {
      // 404/410 = 구글에서 사라진 구매 → 자격 회수. 그 외(네트워크)는 다음 주기에 재시도.
      if (e instanceof PlayPurchaseError && e.code === 'PLAY_PURCHASE_NOT_FOUND') {
        if (await revokePlayPurchase(target.purchaseToken, 'NOT_FOUND')) revoked += 1;
      }
    }
  }
  return { configured: true, checked: targets.length, revoked };
}

/** 새 기록 id (다른 모듈에서 참조할 때) */
export function newPlayPurchaseId(): string {
  return uid('plp');
}
