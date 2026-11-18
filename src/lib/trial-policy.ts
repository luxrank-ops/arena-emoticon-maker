// ─────────────────────────────────────────────────────────────
// 무료 체험 정책 문구·스타일 규칙 (서버·클라이언트 공용)
//  · 이 파일은 노드 모듈을 쓰지 않는다 — 화면(클라이언트)에서도 안전하게 가져다 쓴다.
//  · 상한 값(하루 몇 장 등)은 환경변수를 읽는 free-trial.ts(서버 전용)에 둔다.
// ─────────────────────────────────────────────────────────────
import type { Tone } from '@/lib/types';

/** 화면·API 공용 안내 문구 */
export const TRIAL_MESSAGES = {
  banner: '무료 체험 중이에요 — 시안 1장과 컷 2장까지 무료로 만들어 볼 수 있어요. 정식 출시를 준비하고 있어요.',
  packBlocked: '무료 체험에서는 2컷 시안까지 만들 수 있어요. 팩은 정식 출시 후 만들 수 있습니다.',
  toneBlocked: '실사 스티커 스타일은 체험에서 제공하지 않아요. 다른 스타일로 맛보기를 해 보세요.',
  limitUser: '오늘의 무료 체험 컷을 모두 사용했어요. 내일 다시 체험할 수 있어요.',
  limitIp: '이 연결에서 오늘의 무료 체험 한도를 모두 사용했어요. 내일 다시 시도해 주세요.',
  limitDaily: '오늘의 무료 체험 준비량이 모두 소진됐어요. 내일 다시 열려요.',
  limitMonthly: '이번 달 무료 체험 준비량이 모두 소진됐어요.',
  limitPrep: '사진 확인을 너무 여러 번 요청했어요. 잠시 후 다시 시도해 주세요.',
} as const;

/** 무료 체험에서 막는 스타일 — 상위 모델(장당 원가가 약 4배)로 그리는 실사 스티커는 제외한다. */
const TRIAL_BLOCKED_TONES: Tone[] = ['photo-sticker'];

export function trialToneAllowed(tone: string): boolean {
  return !TRIAL_BLOCKED_TONES.includes(tone as Tone);
}

/** 체험에서 만드는 시안 종류 — 1장만 */
export const TRIAL_VARIANT_KEYS = ['A'] as const;

/** 체험 컷으로 제공하는 감정 (2컷) */
export const TRIAL_CUT_EMOTIONS = ['joy', 'laugh'] as const;
