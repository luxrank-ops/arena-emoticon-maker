// ─────────────────────────────────────────────────────────────
// 캐릭터 디자인 시트 (업그레이드 3)
//  · 1번 기준 컷만 참조하면 컷마다 옷·비율이 흔들린다.
//  · 그래서 팩을 만들 때 "고정 캐릭터 시트"(정면·비율·의상·색 팔레트)를 확정하고
//    모든 컷 프롬프트에 같은 잠금 블록을 넣는다. 사진·시안 참조와 함께 쓰인다.
// ─────────────────────────────────────────────────────────────

import type { CompositionMode, FaceSignature, Palette, SubjectKind, Tone } from '@/lib/types';

export interface CharacterDesignSheet {
  version: 1;
  id: string;
  tone: Tone;
  subjectKind: SubjectKind;
  mode: CompositionMode;
  palette: Palette;
  signature: FaceSignature;
  /** 컷마다 고정하는 서술 */
  outfit: string;
  hair: string;
  build: string;
  framing: string;
  paletteSwatches: string[];
  rules: string[];
}

export interface DesignSheetInput {
  tone: Tone;
  subjectKind?: SubjectKind;
  mode?: CompositionMode;
  palette: Palette;
  signature: FaceSignature;
}

function compactHash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).padStart(7, '0').slice(-7);
}

const HAIR_NAMES = ['short and neat', 'softly layered', 'shoulder length', 'cropped and tidy', 'wavy and loose'];

function hairDescription(signature: FaceSignature, tone: Tone): string {
  const base = HAIR_NAMES[Math.abs(Math.round(signature.hairStyle)) % HAIR_NAMES.length];
  return tone === 'pixel-art' || tone === '2d-cute'
    ? `${base}, simplified into clean bold shapes`
    : `${base}, the same length and silhouette as in the reference photo`;
}

function buildDescription(signature: FaceSignature, mode: CompositionMode): string {
  const head = signature.headScale > 1.08 ? 'a slightly larger head with cute proportions' : 'natural, realistic head-to-body proportions';
  return mode === 'full'
    ? `${head}, full body visible from head to feet, consistent standing height and limb length in every cut`
    : `${head}, chest-up framing with the head filling most of the frame`;
}

function outfitDescription(tone: Tone, palette: Palette): string {
  const shirt = palette.shirt.toLowerCase();
  switch (tone) {
    case 'photo-sticker':
      return `exactly the same clothing as the reference photo (primary color ${shirt}); do not redesign the outfit`;
    case '2d-cute':
      return `one simple top in flat color ${shirt}, no patterns, no logos, the same in every cut`;
    case 'clay-3d':
      return `the same plain shirt in ${shirt} sculpted in clay, no added costume pieces`;
    case 'pixel-art':
      return `a simple pixel-art top in ${shirt}, unchanged between cuts`;
    case 'office-meme':
      return `the same office outfit in ${shirt} with at most one small badge or lanyard`;
    default:
      return `the same everyday clothing as the reference photo, primary color ${shirt}, identical in every cut`;
  }
}

function petOverrides(sheet: CharacterDesignSheet): CharacterDesignSheet {
  return {
    ...sheet,
    outfit: 'no clothing or accessories unless they are visible in the reference photo; keep the coat markings identical',
    hair: 'the same fur pattern, ear shape and tail as in the reference photo',
    build: 'the same body size and breed proportions in every cut',
    rules: [
      'Keep the same animal: species, fur colors, markings, ear shape and muzzle.',
      'Do not turn the pet into a human or a different species.',
      'Do not invent markings that are not in the reference photo.',
      ...sheet.rules.filter((rule) => !rule.startsWith('Keep the same outfit')),
    ],
  };
}

export function buildCharacterSheet(input: DesignSheetInput): CharacterDesignSheet {
  const subjectKind = input.subjectKind ?? 'person';
  const mode = input.mode ?? 'face';
  const paletteSwatches = [input.palette.skin, input.palette.hair, input.palette.shirt, input.palette.accent]
    .filter((value) => /^#[0-9a-fA-F]{3,8}$/.test(value))
    .map((value) => value.toUpperCase());

  const sheet: CharacterDesignSheet = {
    version: 1,
    id: `ds_${compactHash(JSON.stringify([input.tone, subjectKind, mode, input.palette, input.signature]))}`,
    tone: input.tone,
    subjectKind,
    mode,
    palette: input.palette,
    signature: input.signature,
    outfit: outfitDescription(input.tone, input.palette),
    hair: hairDescription(input.signature, input.tone),
    build: buildDescription(input.signature, mode),
    framing: mode === 'full' ? 'full body, centered, whole figure visible' : 'chest-up, centered, eyes near the upper third',
    paletteSwatches,
    rules: [
      'The character design sheet is locked: every cut shows the same character with the same outfit, hair and proportions.',
      'Keep the same outfit and its colors in every cut; do not add costumes, hats or accessories that are not requested.',
      'Keep the same hairstyle, hair color and hairline.',
      'Use only the locked palette for the character; do not shift the hue between cuts.',
      `Keep the same framing and scale: ${mode === 'full' ? 'full body' : 'chest-up'}.`,
      'The face must remain the same recognizable person from the reference photo.',
    ],
  };
  return subjectKind === 'pet' ? petOverrides(sheet) : sheet;
}

/** 생성 프롬프트에 들어가는 잠금 블록 (모든 컷 공통) */
export function designSheetPrompt(sheet: CharacterDesignSheet): string {
  const who = sheet.subjectKind === 'pet' ? 'the pet' : 'the person';
  return [
    `LOCKED CHARACTER DESIGN SHEET — follow it exactly in every cut (id ${sheet.id}):`,
    `Outfit: ${sheet.outfit}.`,
    `Hair: ${sheet.hair}.`,
    `Build & proportions: ${sheet.build}.`,
    `Framing: ${sheet.framing}.`,
    sheet.paletteSwatches.length ? `Locked palette for ${who}: ${sheet.paletteSwatches.join(', ')}.` : '',
    `Rules: ${sheet.rules.join(' ')}`,
    'If any instruction conflicts with this sheet, the sheet wins; if it conflicts with the original photo, keep the real face of the photo and the sheet’s outfit and framing.',
  ]
    .filter(Boolean)
    .join(' ');
}

export interface DesignSheetRow {
  id: string;
  label: string;
  value: string;
}

/** UI에 보여줄 고정 항목 요약 */
export function designSheetChecklist(sheet: CharacterDesignSheet): DesignSheetRow[] {
  return [
    { id: 'id', label: '시트 ID', value: sheet.id },
    { id: 'outfit', label: '의상', value: sheet.outfit },
    { id: 'hair', label: '헤어', value: sheet.hair },
    { id: 'build', label: '비율', value: sheet.build },
    { id: 'framing', label: '구도', value: sheet.framing },
    { id: 'palette', label: '팔레트', value: sheet.paletteSwatches.join(' · ') || '사진에서 추출' },
  ];
}

/** 서버 저장값 검증 (구버전 팩에는 없을 수 있다) */
export function isCharacterDesignSheet(value: unknown): value is CharacterDesignSheet {
  if (!value || typeof value !== 'object') return false;
  const sheet = value as Partial<CharacterDesignSheet>;
  return (
    sheet.version === 1 &&
    typeof sheet.id === 'string' &&
    typeof sheet.tone === 'string' &&
    typeof sheet.outfit === 'string' &&
    Array.isArray(sheet.rules) &&
    !!sheet.palette &&
    !!sheet.signature
  );
}
