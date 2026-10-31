import type { Frame } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 카카오 이모티콘 스튜디오 제안 규격 패키저
//  · 규격: 24종 · 360×360px · PNG · 개당 2MB 이하 · 투명 배경 권장
//  · 서버(이 파일)는 "팩 데이터"로 검증 가능한 항목을, 클라이언트는 실제 렌더 결과의
//    바이트 크기/픽셀 크기를 확인한다 (같은 규칙을 양쪽에서 사용).
// ─────────────────────────────────────────────────────────────

export const KAKAO_RULES = {
  count: 24,
  size: 360,
  maxBytes: 2 * 1024 * 1024,
  format: 'png',
  recommendTransparent: true,
} as const;

export interface PackCheck {
  id: string;
  label: string;
  pass: boolean;
  /** 통과하지 못하면 내보내기를 막을지 여부 */
  blocking: boolean;
  detail: string;
}

export interface PackValidation {
  ok: boolean;
  checks: PackCheck[];
  summary: string;
}

interface ValidationInput {
  size: number;
  frames: Pick<Frame, 'line' | 'background' | 'readyAt' | 'label'>[];
  now?: number;
}

/** 팩 데이터만으로 검증 가능한 규격 항목 */
export function validatePackForKakao(input: ValidationInput): PackValidation {
  const now = input.now ?? Date.now();
  const frames = input.frames;
  const ready = frames.filter((f) => f.readyAt <= now).length;
  const transparent = frames.filter((f) => f.background === 'transparent').length;
  const longLines = frames.filter((f) => [...f.line].length > 16);
  const emptyLines = frames.filter((f) => f.line.trim().length === 0);
  const duplicateLines = frames.length - new Set(frames.map((f) => f.line.trim())).size;

  const checks: PackCheck[] = [
    {
      id: 'count',
      label: `24종 구성 (현재 ${frames.length}종)`,
      pass: input.size === KAKAO_RULES.count && frames.length === KAKAO_RULES.count,
      blocking: true,
      detail:
        input.size === KAKAO_RULES.count
          ? '카카오 제안 규격과 동일한 24컷입니다.'
          : `${input.size}컷 팩입니다. 제안 규격은 24종이므로 24컷 팩으로 다시 만들어 주세요.`,
    },
    {
      id: 'ready',
      label: `모든 컷 생성 완료 (${ready}/${frames.length})`,
      pass: ready === frames.length && frames.length > 0,
      blocking: true,
      detail: ready === frames.length ? '모든 컷이 준비되었습니다.' : '생성이 끝난 뒤에 내보낼 수 있습니다.',
    },
    {
      id: 'pixel',
      label: `${KAKAO_RULES.size}×${KAKAO_RULES.size}px PNG`,
      pass: true,
      blocking: true,
      detail: `내보낼 때 ${KAKAO_RULES.size}×${KAKAO_RULES.size}px PNG 로 렌더합니다.`,
    },
    {
      id: 'bytes',
      label: '개당 2MB 이하',
      pass: true,
      blocking: false,
      detail: '내보내기 직후 파일 크기를 검사해 결과에 표시합니다(초과 시 자동 재시도 안내).',
    },
    {
      id: 'transparent',
      label: '투명 배경',
      pass: transparent === frames.length,
      blocking: false,
      detail:
        transparent === frames.length
          ? '모든 컷이 투명 배경입니다.'
          : `${frames.length - transparent}컷이 색 배경입니다. 제안 규격은 투명 배경을 권장하며, 패키징 시 투명으로 다시 그립니다.`,
    },
    {
      id: 'lines',
      label: '대사 길이/중복',
      pass: longLines.length === 0 && emptyLines.length === 0 && duplicateLines === 0,
      blocking: false,
      detail:
        longLines.length === 0 && emptyLines.length === 0 && duplicateLines === 0
          ? '모든 컷에 짧은 대사가 있고 중복이 없습니다.'
          : [
              longLines.length ? `${longLines.length}컷 대사가 16자 초과(작게 보일 수 있음)` : '',
              emptyLines.length ? `${emptyLines.length}컷 대사 없음` : '',
              duplicateLines > 0 ? `대사 중복 ${duplicateLines}건` : '',
            ]
              .filter(Boolean)
              .join(' · '),
    },
  ];

  const blockingFail = checks.filter((c) => c.blocking && !c.pass);
  return {
    ok: blockingFail.length === 0,
    checks,
    summary: blockingFail.length
      ? `규격 미충족: ${blockingFail.map((c) => c.label).join(', ')}`
      : `${KAKAO_RULES.count}종 · ${KAKAO_RULES.size}×${KAKAO_RULES.size}px · PNG · 개당 2MB 이하 규격으로 내보낼 수 있습니다.`,
  };
}

/** 클라이언트: 렌더된 파일의 실제 크기/픽셀 검사 */
export interface FileCheckInput {
  name: string;
  bytes: number;
  width: number;
  height: number;
}

export function validateKakaoFiles(files: FileCheckInput[]): PackValidation {
  const countOk = files.length === KAKAO_RULES.count;
  const pixelOk = files.every((f) => f.width === KAKAO_RULES.size && f.height === KAKAO_RULES.size);
  const byteOk = files.every((f) => f.bytes <= KAKAO_RULES.maxBytes);
  const heaviest = files.reduce((m, f) => Math.max(m, f.bytes), 0);

  const checks: PackCheck[] = [
    {
      id: 'count',
      label: `파일 ${KAKAO_RULES.count}개 (실제 ${files.length}개)`,
      pass: countOk,
      blocking: true,
      detail: countOk ? '24개 파일이 준비되었습니다.' : '24개 파일이 아닙니다.',
    },
    {
      id: 'pixel',
      label: `${KAKAO_RULES.size}×${KAKAO_RULES.size}px`,
      pass: pixelOk,
      blocking: true,
      detail: pixelOk ? '모든 파일이 규격 픽셀입니다.' : '규격 픽셀이 아닌 파일이 있습니다.',
    },
    {
      id: 'bytes',
      label: '개당 2MB 이하',
      pass: byteOk,
      blocking: true,
      detail: `가장 큰 파일 ${formatBytes(heaviest)} / 한도 ${formatBytes(KAKAO_RULES.maxBytes)}`,
    },
  ];

  const failed = checks.filter((c) => !c.pass);
  return {
    ok: failed.length === 0,
    checks,
    summary: failed.length ? failed.map((c) => c.label).join(' · ') : '모든 파일이 카카오 제안 규격을 통과했습니다.',
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
