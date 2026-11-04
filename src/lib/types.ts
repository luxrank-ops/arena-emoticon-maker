// ─────────────────────────────────────────────────────────────
// EmotiMe · 공용 도메인 타입 (서버/클라이언트 공유)
// ─────────────────────────────────────────────────────────────

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
}

// ── 데이터 모델 ───────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  plan: Plan;
  credits: number;
  role: 'user' | 'admin';
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
  /** 마지막으로 생성한 이미지에 적용한 AI 악세사리 */
  accessoryIds?: string[];
  /** AI 생성 이미지 ID (`/api/images/<id>`) */
  imageId?: string;
}

export interface FrameView extends Frame {
  spec: StickerSpec;
  ready: boolean;
}

export interface Pack {
  subjectKind?: SubjectKind;
  mode?: CompositionMode;
  id: string;
  userId: string;
  sheetId: string;
  /** 팩 생성 시 확정한 시안 이미지 (같은 시트에서 다른 팩을 만들어도 변경되지 않음) */
  characterReferenceImageId?: string;
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
}

export interface GoodsOrder extends Order {
  frameId: string;
  frameThumb: string;
  shipping: { name: string; phone: string; address: string; memo?: string };
  goodsStatus: 'PENDING_PAYMENT' | 'AWAITING_FULFILLMENT' | 'PRODUCING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  productImageId?: string;
  trackingCompany?: string;
  trackingNumber?: string;
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
    | 'error';
  meta: Record<string, string | number | boolean>;
  createdAt: string;
}
