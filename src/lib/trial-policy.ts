// ─────────────────────────────────────────────────────────────
// 무료 체험 정책 문구·스타일 규칙 (서버·클라이언트 공용)
//  · 이 파일은 노드 모듈을 쓰지 않는다 — 화면(클라이언트)에서도 안전하게 가져다 쓴다.
//  · 상한 값(하루 몇 장 등)은 환경변수를 읽는 free-trial.ts(서버 전용)에 둔다.
//  · 2026-11-23 개편: '시안 1장 + 컷 2장' → '시안 1장 + 12컷 전체 워터마크 미리보기'.
// ─────────────────────────────────────────────────────────────
import type { Tone } from '@/lib/types';

/** 미리보기 팩 크기 — 첫 팩은 12컷 전체를 보여 준다. */
export const PREVIEW_PACK_SIZE = 12;
/** 무료 미리보기 이미지에 반복해서 얹는 반투명 워터마크 문구 */
export const PREVIEW_WATERMARK = '이모티학으로 내 얼굴 짤 만들기';

/** 화면·API 공용 안내 문구 */
export const TRIAL_MESSAGES = {
  banner: '무료 미리보기 — 시안 1장을 고르면 12컷 전체를 워터마크로 먼저 보여 드려요. 마음에 들면 ₩5,900에 잠금 해제!',
  packBlocked: '무료 미리보기는 12컷 한 팩까지예요. 잠금 해제하면 고화질·투명 PNG와 ZIP 내보내기가 열립니다.',
  toneBlocked: '실사 스티커 스타일은 미리보기에서 제공하지 않아요. 다른 스타일로 먼저 확인해 보세요.',
  limitUser: '오늘의 무료 미리보기를 모두 사용했어요. 내일 다시 만들거나 단건 완성권으로 잠금 해제할 수 있어요.',
  limitIp: '이 연결에서 오늘의 무료 미리보기 한도를 모두 사용했어요. 내일 다시 시도해 주세요.',
  limitDaily: '오늘의 무료 미리보기 준비량이 모두 소진됐어요. 내일 다시 열려요.',
  limitMonthly: '이번 달 무료 미리보기 준비량이 모두 소진됐어요.',
  limitPrep: '사진 확인을 너무 여러 번 요청했어요. 잠시 후 다시 시도해 주세요.',
  lockedExport: '이 팩은 미리보기 상태예요. 단건 완성권으로 잠금을 해제하면 고화질·투명 PNG와 ZIP을 받을 수 있어요.',
} as const;

/** 무료 체험에서 막는 스타일 — 상위 모델(장당 원가가 약 4배)로 그리는 실사 스티커는 제외한다. */
const TRIAL_BLOCKED_TONES: Tone[] = ['photo-sticker'];

export function trialToneAllowed(tone: string): boolean {
  return !TRIAL_BLOCKED_TONES.includes(tone as Tone);
}

/** 체험에서 만드는 시안 종류 — 1장만 */
export const TRIAL_VARIANT_KEYS = ['A'] as const;

/** 미리보기 팩은 12컷 전체를 만든다 (감정 로테이션) */
export const TRIAL_CUT_EMOTIONS = [
  'joy', 'laugh', 'love', 'sulk', 'tired', 'surprised',
  'angry', 'sad', 'smug', 'blank', 'cry', 'king',
] as const;
