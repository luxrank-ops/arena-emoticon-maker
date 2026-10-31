// ─────────────────────────────────────────────────────────────
// EmotiMe · 공용 도메인 타입 (서버/클라이언트 공유)
// ─────────────────────────────────────────────────────────────

export type Plan = 'FREE' | 'PLUS' | 'STUDIO';

export type Tone =
  | '2d-cute'
  | '3d-cartoon'
  | 'sketch'
  | 'mono'
  | 'watercolor'
  | 'caricature';

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

export interface FaceSignature {
  /** 머리 크기 배율 (캐리커처일수록 큼) */
  headScale: number;
  /** 얼굴 가로/세로 비율 */
  faceWidth: number;
  /** 눈 사이 간격 배율 */
  eyeSpacing: number;
  /** 눈 크기 배율 */
  eyeSize: number;
  /** 눈썹 두께 */
  browWeight: number;
  /** 입 폭 */
  mouthWidth: number;
  /** 헤어 스타일 0~4 */
  hairStyle: number;
  /** 볼 터치 강도 0~1 */
  cheek: number;
  /** 안경 여부 */
  glasses: boolean;
}

export interface StickerSpec {
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
}

export interface SheetVariant {
  key: string;
  seed: number;
  signature: FaceSignature;
  label: string;
}

export interface CharacterSheet {
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
}

export interface FrameView extends Frame {
  spec: StickerSpec;
  ready: boolean;
}

export interface Pack {
  id: string;
  userId: string;
  sheetId: string;
  tone: Tone;
  title: string;
  size: number;
  status: 'GENERATING' | 'READY' | 'FAILED';
  creditsSpent: number;
  createdAt: string;
  frames: Frame[];
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
}

export interface GoodsOrder extends Order {
  frameId: string;
  frameThumb: string;
  shipping: { name: string; phone: string; address: string; memo?: string };
  goodsStatus: 'PRODUCING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
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
    | 'face_purged'
    | 'export'
    | 'order_paid'
    | 'error';
  meta: Record<string, string | number | boolean>;
  createdAt: string;
}
