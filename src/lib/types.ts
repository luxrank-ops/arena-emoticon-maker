// ─────────────────────────────────────────────────────────────
// 이모티학 · 공용 도메인 타입 (서버/클라이언트 공유)
// ─────────────────────────────────────────────────────────────

import type { Locale } from '@/lib/i18n/locale';
import type { TextLayer } from '@/lib/studio/layers';
import type { CharacterDesignSheet } from '@/lib/ai/character-sheet';
import type { PackFormatId } from '@/lib/pack-formats';

export type Plan = 'FREE' | 'PLUS' | 'STUDIO';

export type Tone =
  | '2d-cute'
  | 'caricature'
  | 'photo-sticker'
  | 'doodle'
  | 'office-meme'
  | 'clay-3d'
  | 'pixel-art'
  | '3d-cartoon'
  | 'sketch'
  | 'mono'
  | 'watercolor';

export type Emotion =
  | 'joy'
  | 'laugh'
  | 'love'
  | 'sad'
  | 'angry'
  | 'sulk'
  | 'tired'
  | 'surprised'
  | 'smug'
  | 'cry'
  | 'king'
  | 'blank';

export type PropKey =
  | 'none'
  | 'coffee'
  | 'laptop'
  | 'phone'
  | 'tissue'
  | 'cake'
  | 'crown'
  | 'heart'
  | 'sweat';

export type BackgroundKey =
  | 'transparent'
  | 'cream'
  | 'mint'
  | 'sky'
  | 'pink'
  | 'lemon'
  | 'dark';

export interface Palette {
  skin: string;
  skinShade: string;
  hair: string;
  shirt: string;
  accent: string;
}

export type EyeShape = 'almond' | 'round' | 'narrow';
export type Jawline = 'square' | 'round' | 'pointed';

export interface FaceSignature {
  /** 머리 크기 배율 (캐리커처일수록 큼) */
  headScale: number;
  /** 얼굴 가로/세로 비율 */
  faceWidth: number;
  /** 눈 사이 간격 배율 */
  eyeSpacing: number;
  /** 눈 크기 배율 */
  eyeSize: number;
  /** 눈 모양 */
  eyeShape: EyeShape;
  /** 눈썹 두께 */
  browWeight: number;
  /** 입 폭 */
  mouthWidth: number;
  /** 입술 두께 배율 */
  lipThickness: number;
  /** 콧구멍 크기 배율 */
  noseSize: number;
  /** 헤어 스타일 0~4 */
  hairStyle: number;
  /** 볼 터치 강도 0~1 */
  cheek: number;
  /** 턱선 형태 */
  jawline: Jawline;
  /** 안경 여부 */
  glasses: boolean;
}

export interface StickerSpec {
  /** AI 생성 이미지 URL (있으면 절차적 SVG 대신 이 이미지를 그린다) */
  imageUrl?: string;
  seed: number;
  tone: Tone;
  palette: Palette;
  signature: FaceSignature;
  emotion: Emotion;
  /** 감정 강도 0~100 */
  intensity: number;
  prop: PropKey;
  background: BackgroundKey;
  line: string;
  linePosition: 'top' | 'bottom';
  /** 앱이 합성하는 한글 대사·이펙트 레이어 (AI 이미지 위에 얹는다) */
  textLayers?: TextLayer[];
}

// ── 데이터 모델 ───────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  plan: Plan;
  credits: number;
  role: 'user' | 'admin';
  /** TWA 환경 신호. 구매 증명이 아니며 크레딧 무차감과 일일 AI 공정 이용이 적용된다 */
  play?: boolean;
  createdAt: string;
  lastGrantAt: string;
}

export interface FaceProfile {
  id: string;
  userId: string;
  palette: Palette;
  signature: FaceSignature;
  metrics: {
    coverage: number;
    centering: number;
    brightness: number;
    sharpness: number;
    faceDetected: boolean;
  };
  /** 원본 사진은 저장하지 않음 (온디바이스 분석 결과만) */
  consent: { at: string; version: string; ip: string; overseas: boolean };
  createdAt: string;
  purgedAt: string;
  /** 얼굴 임베딩 벡터 (Identity Lock 용, FaceNet/ArcFace 512차원) */
  embedding?: number[];
  /** 임베딩 모델 버전 (추적 가능성) */
  embeddingModel?: string;
}

/** 생성 요청 시 사용자 얼굴 조건부 주입 정보 */
export interface FaceCondition {
  faceId: string;
  embedding: number[];
  signature: FaceSignature;
  palette: Palette;
}

export interface SheetVariant {
  key: string;
  seed: number;
  signature: FaceSignature;
  label: string;
  /** AI 생성 이미지 ID */
  imageId?: string;
}

export type CompositionMode = 'face' | 'full';
export type SubjectKind = 'person' | 'pet';

export interface CharacterSheet {
  subjectKind?: SubjectKind;
  mode?: CompositionMode;
  /** 선택한 표현 형태(팩 테마). 없으면 기존 감정 위주 구성 */
  format?: PackFormatId;
  /** 'layer' 면 AI 는 글자 없이 그리고 앱이 한글을 합성한다 */
  textMode?: 'baked' | 'layer';
  id: string;
  userId: string;
  faceId: string;
  tone: Tone;
  variants: SheetVariant[];
  chosenKey: string | null;
  createdAt: string;
}

export interface Frame {
  id: string;
  packId: string;
  index: number;
  emotion: Emotion;
  intensity: number;
  templateId: string;
  label: string;
  line: string;
  prop: PropKey;
  background: BackgroundKey;
  seed: number;
  readyAt: number;
  usageCount: number;
  /** 선택한 코믹 프리셋 (기존 컷에는 없을 수 있음) */
  comicExpressionId?: string;
  /** 선택한 표정·포즈 프리셋 150종의 id (표정·포즈·이펙트·대사가 생성 프롬프트에 반영된다) */
  presetId?: number;
  /** 마지막으로 생성한 이미지에 적용한 AI 악세사리 */
  accessoryIds?: string[];
  /** AI 생성 이미지 ID (`/api/images/<id>`) */
  imageId?: string;
  /** 앱이 합성하는 글자·이펙트 레이어 (PNG/GIF/APNG/ZIP 에 모두 반영) */
  textLayers?: TextLayer[];
  /** 2단 합체 콤보에서 위/아래 조각 */
  comboRole?: 'top' | 'bottom';
  /** 짝이 되는 컷의 id (콤보) */
  comboPairId?: string;
  /** 운영 검토 후 숨긴 콘텐츠 — 다시 생성하거나 이미지를 제공하지 않는다 */
  hiddenAt?: string;
}

export interface FrameView extends Frame {
  spec: StickerSpec;
  ready: boolean;
}

export interface Pack {
  /** Copy/preset language captured at creation; legacy packs default to Korean. */
  locale?: Locale;
  subjectKind?: SubjectKind;
  mode?: CompositionMode;
  id: string;
  userId: string;
  sheetId: string;
  /** 팩 생성 시 확정한 시안 이미지 (같은 시트에서 다른 팩을 만들어도 변경되지 않음) */
  characterReferenceImageId?: string;
  /** 표현 형태(팩 테마) — 없으면 기존 감정 위주 구성 */
  format?: PackFormatId;
  /** 'layer' 면 AI 는 글자 없이 그리고 앱이 한글 레이어를 합성한다 */
  textMode?: 'baked' | 'layer';
  /** 전 컷에 강제하는 고정 캐릭터 디자인 시트 */
  designSheet?: CharacterDesignSheet;
  tone: Tone;
  title: string;
  size: number;
  status: 'GENERATING' | 'READY' | 'FAILED';
  creditsSpent: number;
  createdAt: string;
  frames: Frame[];
  /** 'ai' 면 컷 이미지(imageId)가 있어야 완성. 없으면 레거시 SVG 재조합 팩 */
  renderer?: 'ai';
  /**
   * 비식별 렌더 스냅샷 (팔레트 + 얼굴 시그니처 + 화풍).
   * 얼굴 프로필은 24시간 뒤 파기되므로, 팩이 그 뒤에도 계속 렌더되려면
   * "이미 만들어진 팩을 다시 그리는 데 필요한 최소값"을 팩에 고정해 둔다.
   * (원본 사진·랜드마크는 포함하지 않는다)
   */
  identity?: IdentitySnapshot;
}

export interface PackShareLink {
  /** SHA-256 only; the raw bearer token is returned once and never persisted. */
  tokenHash: string;
  packId: string;
  frameId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface IdentitySnapshot {
  palette: Palette;
  signature: FaceSignature;
  tone: Tone;
}

export interface CreditEntry {
  id: string;
  userId: string;
  delta: number;
  reason:
    | 'SIGNUP_BONUS'
    | 'SUBSCRIPTION_GRANT'
    | 'GENERATION'
    | 'REFUND'
    | 'PURCHASE'
    | 'ADMIN_GIFT';
  refType?: string;
  refId?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface QuotePurchase {
  id: string;
  userId: string;
  packId: string;
  creditsSpent: number;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  kind: 'subscription' | 'credits' | 'goods';
  sku: string;
  title: string;
  amount: number;
  credits: number;
  plan: Plan | null;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  provider: string;
  createdAt: string;
  paidAt?: string;
  consentAt?: string;
  paymentKey?: string;
  /** 회원 정보와 생성물은 삭제하고 법정 결제 기록만 남긴 시각 */
  accountDeletedAt?: string;
}

export interface GoodsOrder extends Order {
  frameId: string;
  frameThumb: string;
  /** 계정 삭제 시 제거. 법정 보존이 필요한 주문은 배송·연락처 없이 금액 기록만 남긴다. */
  shipping?: { name: string; phone: string; address: string; memo?: string };
  goodsStatus: 'PENDING_PAYMENT' | 'AWAITING_FULFILLMENT' | 'PRODUCING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  productImageId?: string;
  trackingCompany?: string;
  trackingNumber?: string;
}

export type ContentReportReason = 'SEXUAL' | 'HATE_HARASSMENT' | 'VIOLENCE' | 'MINOR_SAFETY' | 'PRIVACY' | 'DECEPTIVE' | 'OTHER';
export interface ContentReport {
  id: string;
  userId: string;
  packId: string;
  frameId: string;
  reason: ContentReportReason;
  details?: string;
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED' | 'ACTIONED';
  createdAt: string;
  reviewedAt?: string;
  resolutionNote?: string;
}

export interface ImageDeletionJob {
  id: string;
  userId: string;
  imageIds: string[];
  reason: 'ACCOUNT_DELETION' | 'MODERATION';
  createdAt: string;
}

/** 유료 앱의 일일 AI 원가 상한. 크레딧 무차감과는 별개의 공정 이용 기준이다. */
export interface PlayUsage {
  id: string;
  userId: string;
  date: string;
  count: number;
  updatedAt: string;
}

/**
 * 무료 체험(일반 방문자) 이미지 생성 사용량.
 *  · 일반 방문자에게 1~2컷 맛보기를 열면 컷 1장마다 실제 원가가 나간다.
 *  · 그래서 사용자·IP·전체·월 상한을 저장소(Cloudflare KV 스냅샷)에 남겨 강제한다.
 *  · bucket 문자열이 창(일/월)까지 포함한다 — 예: `img:user:guest_ab12:2026-11-18`.
 */
export interface TrialUsage {
  id: string;
  /** `img:<scope>:<subject>:<period>` 또는 `cut:user:<id>:<period>` */
  bucket: string;
  count: number;
  updatedAt: string;
}

/**
 * 구글 플레이 인앱결제 구매 기록 (서버 검증 결과만 저장).
 *  · 자격은 계정(userId)에 귀속한다 — 기기·UA 신호가 아니다.
 *  · status 가 ACTIVE 이고 만료되지 않은 기록만 유료 자격으로 인정한다.
 *  · 환불·취소는 status 를 REVOKED 로 바꿔 자격을 회수한다 (기록 자체는 법정 보존).
 */
export interface PlayPurchase {
  id: string;
  userId: string;
  packageName: string;
  productId: string;
  /** 서버 검증·재검증에 쓰는 구매 토큰. 화면·로그에 노출하지 않는다. */
  purchaseToken: string;
  kind: 'INAPP' | 'SUBS';
  status: 'ACTIVE' | 'REVOKED';
  /** Play 응답의 purchaseState(0 구매완료 / 1 취소 / 2 보류) 또는 구독 상태 문자열 */
  purchaseState: string;
  orderId?: string;
  acknowledged: boolean;
  /** 구독인 경우 만료 시각(ISO). 단품은 null */
  expiresAt?: string | null;
  verifiedAt: string;
  revokedAt?: string | null;
  revokeReason?: string | null;
}

export interface BriefItem {
  frameId: string;
  templateId: string;
  label: string;
  reason: string;
}

export interface DailyBrief {
  id: string;
  userId: string;
  date: string;
  headline: string;
  items: BriefItem[];
  createdAt: string;
  openedAt: string | null;
}

export interface UsageEvent {
  id: string;
  userId: string;
  type:
    | 'pack_created'
    | 'frame_composed'
    | 'reply_used'
    | 'brief_opened'
    | 'face_analyzed'
    | 'face_embed'
    | 'face_purged'
    | 'generate'
    | 'export'
    | 'order_paid'
    | 'quote_pack_purchased'
    | 'content_reported'
    | 'content_moderated'
    | 'account_deleted'
    | 'error';
  meta: Record<string, string | number | boolean>;
  createdAt: string;
}
