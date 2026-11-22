import type { Frame } from '@/lib/types';

// ─────────────────────────────────────────────────────────────
// 카카오 이모티콘 스튜디오 제안 규격 패키저
//  · 규격(2026년 기준): 멈춘 이모티콘(PNG) 32종 · 360×360px · 개당 150KB(78×78 아이콘 16KB) · 투명 배경 권장
//  · 움직이는 이모티콘(APNG/GIF) 24종 · 360×360px · 개당 2MB
//  · 서버(이 파일)는 "팩 데이터"로 검증 가능한 항목을, 클라이언트는 실제 렌더 결과의
//    바이트 크기/픽셀 크기를 확인한다 (같은 규칙을 양쪽에서 사용).
// ─────────────────────────────────────────────────────────────

export const KAKAO_RULES = {
  count: 32,
  size: 360,
  maxBytes: 150 * 1024,
  iconBytes: 16 * 1024,
  format: 'png',
  recommendTransparent: true,
} as const;

export const KAKAO_ANIMATED_RULES = {
  count: 24,
  size: 360,
  maxBytes: 2 * 1024 * 1024,
  format: 'apng',
  recommendTransparent: true,
  maxFrames: 40,
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
  /** 카카오 제안 규격(멈춘 32종 · 움직이는 24종)을 모두 충족하는가 — 제출 판정 */
  ok: boolean;
  /** 규격 컷 수가 아니어도 내 대화방용 ZIP 을 만들 수 있는가 */
  exportable: boolean;
  checks: PackCheck[];
  summary: string;
}

/** 개수(멈춘 32종 · 움직이는 24종)만 빼고 내보내기를 막는 항목이 없는지 */
export function canExport(checks: PackCheck[]): boolean {
  return checks.filter((check) => check.blocking && check.id !== 'count').every((check) => check.pass);
}

interface ValidationInput {
  size: number;
  frames: Pick<Frame, 'line' | 'background' | 'readyAt' | 'label' | 'textLayers'>[];
  now?: number;
  animated?: boolean;
}

/** 팩 데이터만으로 검증 가능한 규격 항목 */
export function validatePackForKakao(input: ValidationInput): PackValidation {
  const now = input.now ?? Date.now();
  const frames = input.frames;
  const ready = frames.filter((f) => f.readyAt <= now).length;
  const transparent = frames.filter((f) => f.background === 'transparent').length;
  const longLines = frames.filter((f) => [...f.line].length > 16);
  const emptyLines = frames.filter((f) => f.line.trim().length === 0 && !(f.textLayers?.length));
  const duplicateLines = frames.length - new Set(frames.map((f) => f.line.trim())).size;
  const rules = input.animated ? KAKAO_ANIMATED_RULES : KAKAO_RULES;
  const countMatch = input.size === rules.count && frames.length === rules.count;

  const checks: PackCheck[] = [
    {
      id: 'count',
      label: `${rules.count}종 구성 (현재 ${frames.length}종)`,
      pass: countMatch,
      blocking: true,
      detail: countMatch
        ? `카카오 제안 규격과 동일한 ${rules.count}컷(${input.animated ? '움직이는 이모티콘' : '멈춘 이모티콘'})입니다.`
        : `${frames.length}컷 팩입니다. 카카오 스튜디오 제안은 멈춘 이모티콘 32컷 · 움직이는 이모티콘 24컷이므로, 그 컷 수로 만들면 그대로 제출할 수 있습니다.`,
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
      label: `${rules.size}×${rules.size}px ${input.animated ? 'APNG/GIF' : 'PNG'}`,
      pass: true,
      blocking: true,
      detail: `내보낼 때 ${rules.size}×${rules.size}px 로 렌더합니다.`,
    },
    {
      id: 'bytes',
      label: `개당 ${formatBytes(rules.maxBytes)} 이하 (자동 압축)`,
      pass: true,
      blocking: false,
      detail: '내보내기 직후 파일 크기를 검사하고, 넘으면 색 단계를 낮춰 150KB 이하로 자동 압축합니다.',
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
    exportable: canExport(checks),
    checks,
    summary: blockingFail.length
      ? `규격 미충족: ${blockingFail.map((c) => c.label).join(', ')}`
      : `${frames.length}종 · ${rules.size}×${rules.size}px · ${input.animated ? 'APNG/GIF' : 'PNG'} · 개당 ${formatBytes(rules.maxBytes)} 이하로 내보낼 수 있습니다.`,
  };
}

/** 클라이언트: 렌더된 파일의 실제 크기/픽셀 검사 */
export interface FileCheckInput {
  name: string;
  bytes: number;
  width: number;
  height: number;
}

export function validateKakaoFiles(
  files: FileCheckInput[],
  options: { maxBytes?: number; animated?: boolean } = {},
): PackValidation {
  const rules = options.animated ? KAKAO_ANIMATED_RULES : KAKAO_RULES;
  const maxBytes = options.maxBytes ?? rules.maxBytes;
  const countOk = files.length === rules.count;
  const pixelOk = files.every((f) => f.width === KAKAO_RULES.size && f.height === KAKAO_RULES.size);
  const byteOk = files.every((f) => f.bytes <= maxBytes);
  const heaviest = files.reduce((m, f) => Math.max(m, f.bytes), 0);
  const compressed = files.filter((f) => f.bytes <= maxBytes).length;

  const checks: PackCheck[] = [
    {
      id: 'count',
      label: `파일 ${rules.count}개 (실제 ${files.length}개)`,
      pass: countOk,
      blocking: true,
      detail: countOk
        ? `${rules.count}개 파일이 준비되었습니다(${options.animated ? '움직이는 이모티콘 규격' : '멈춘 이모티콘 규격'}).`
        : `${files.length}개 파일입니다. 카카오 제안 규격은 멈춘 이모티콘 32컷 · 움직이는 이모티콘 24컷이며, 개수가 다르면 제안 규격에는 그대로 못 맞지만 내 대화방용으로는 사용할 수 있습니다.`,
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
      label: `개당 ${formatBytes(maxBytes)} 이하`,
      pass: byteOk,
      blocking: true,
      detail: `가장 큰 파일 ${formatBytes(heaviest)} / 한도 ${formatBytes(maxBytes)} · ${compressed}/${files.length}개 충족`,
    },
  ];

  const failed = checks.filter((c) => c.blocking && !c.pass);
  return {
    ok: failed.length === 0,
    exportable: canExport(checks),
    checks,
    summary: failed.length
      ? failed.map((c) => c.label).join(' · ')
      : countOk
        ? `모든 파일이 카카오 제안 규격(${formatBytes(maxBytes)})을 통과했습니다.`
        : `${files.length}개 파일이 ${formatBytes(maxBytes)} · ${KAKAO_RULES.size}px 기준을 통과했습니다(멈춘 32컷 · 움직이는 24컷 구성 시 카카오 제안 규격).`,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
