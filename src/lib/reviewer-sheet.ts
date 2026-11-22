// ─────────────────────────────────────────────────────────────
// 카카오·라인 작가 등단 심사 도우미 (Creator Pro)
//  · 32종 규격 ZIP 안에 함께 들어가는 심사 시트를 규칙 기반으로 만든다.
//  · 캐릭터 컨셉 설명 · 이모티콘 제목 후보 5개 · 해시태그 10개 · 제출 체크리스트.
//  · 외부 AI 호출 없이 팩 데이터(테마·화풍·컷 대사)만으로 결정적으로 생성한다 (테스트 가능).
// ─────────────────────────────────────────────────────────────
import type { Locale } from '@/lib/i18n/locale';
import { packFormatById } from '@/lib/pack-formats';

export interface ReviewSheetInput {
  title: string;
  tone: string;
  format?: string | null;
  subjectKind?: 'person' | 'pet';
  frames: { label: string; line: string }[];
}

export interface ReviewSheet {
  concept: string;
  conceptEn: string;
  titles: string[];
  hashtags: string[];
  checklist: string[];
  cutCount: number;
  generatedAt: string;
}

const TONE_LABEL: Record<string, string> = {
  '2d-cute': '2D 캐릭터',
  caricature: '실사 카리커처',
  'photo-sticker': '실사 스티커',
  doodle: '손그림 크레용 낙서',
  'office-meme': '직장인 밈',
  'clay-3d': '클레이 3D',
  'pixel-art': '픽셀 아트',
  '3d-cartoon': '3D 카툰',
  sketch: '연필 스케치',
  mono: '흑백 라인',
  watercolor: '수채화',
};

const TONE_LABEL_EN: Record<string, string> = {
  '2d-cute': '2D character',
  caricature: 'realistic portrait',
  'photo-sticker': 'photo sticker',
  doodle: 'crayon doodle',
  'office-meme': 'office meme',
  'clay-3d': 'clay 3D',
  'pixel-art': 'pixel art',
  '3d-cartoon': '3D cartoon',
  sketch: 'pencil sketch',
  mono: 'mono line art',
  watercolor: 'watercolor',
};

const THEME_KEYWORD: Record<string, { ko: string; en: string; tags: string[] }> = {
  'duo-chemi': { ko: '커플·단톡방 케미', en: 'couple & group chat chemistry', tags: ['커플이모티콘', '단톡방', '친구이모티콘', '케미'] },
  'pet-meme': { ko: '반려동물 집사 밈', en: 'pet butler memes', tags: ['반려동물이모티콘', '집사밈', '강아지이모티콘', '고양이이모티콘'] },
  duo: { ko: '2인 케미', en: 'duo chemistry', tags: ['커플이모티콘', '투샷', '케미'] },
  situation: { ko: '직장·일상 리액션', en: 'work & daily reactions', tags: ['직장인이모티콘', '출근', '퇴근', '리액션'] },
  parody: { ko: '짤·뉴스 자막 패러디', en: 'meme & news captions', tags: ['짤', '패러디', '자막이모티콘'] },
  typo: { ko: '글자 주인공 타이포', en: 'typography hero', tags: ['글자이모티콘', '타이포', '손글씨'] },
  combo: { ko: '이펙트·2단 합체', en: 'effects & combos', tags: ['이펙트', '합체이모티콘'] },
};

const BASE_TAGS = ['이모티콘', '내얼굴이모티콘', 'AI이모티콘', '카카오이모티콘', '라인스티커', '셀카이모티콘'];

/** 컷 대사에서 자주 쓰는 말을 뽑아 제목 후보에 섞는다. */
function keywordFromLines(frames: { line: string }[]): string {
  const stop = new Set(['나', '너', '좀', '그', '이', '저', '해', '줘', '요', '내', '네', '우리', '중', '더', '다', '왜', '뭐', '지금']);
  const counts = new Map<string, number>();
  for (const frame of frames) {
    for (const word of frame.line.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/)) {
      const clean = word.trim();
      if (clean.length < 2 || stop.has(clean)) continue;
      counts.set(clean, (counts.get(clean) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '하루';
}

export function buildReviewSheet(input: ReviewSheetInput, locale: Locale = 'ko'): ReviewSheet {
  const format = input.format ? packFormatById(input.format) : undefined;
  const theme = input.format ? THEME_KEYWORD[input.format] : undefined;
  const toneKo = TONE_LABEL[input.tone] ?? input.tone;
  const toneEn = TONE_LABEL_EN[input.tone] ?? input.tone;
  const subject = input.subjectKind === 'pet' ? '반려동물' : '내 얼굴';
  const subjectEn = input.subjectKind === 'pet' ? 'pet' : 'my face';
  const keyword = keywordFromLines(input.frames.length ? input.frames : [{ line: '안녕' }]);
  const themeKo = theme?.ko ?? '일상 리액션';
  const themeEn = theme?.en ?? 'everyday reactions';

  const concept = [
    `${subject} 사진으로 만든 ${toneKo} 스타일 ${themeKo} 이모티콘 ${input.frames.length}종입니다.`,
    format ? `“${format.label}” 구성으로, 대화에서 바로 쓰는 상황과 표정을 ${input.frames.length}컷에 담았습니다.` : '기쁨·웃음·삐짐 같은 감정을 대화 흐름에 맞춰 배치했습니다.',
    `한 컷마다 짧은 한국어 대사를 넣어, 메신저에서 설명 없이도 뜻이 통하도록 했습니다.`,
  ].join(' ');

  const conceptEn = [
    `A ${toneEn} sticker set of ${input.frames.length} ${themeEn} cuts made from a ${subjectEn} photo.`,
    format ? `Built as a "${format.labelEn}" pack with everyday chat situations and expressions.` : 'Everyday emotions arranged for real conversations.',
    'Each cut carries a short Korean caption so the meaning lands without explanation.',
  ].join(' ');

  const core = input.title.replace(/\s*(이모티콘|팩|스티커)\s*/g, ' ').trim() || keyword;
  const formatWord = format?.label.replace(/\s*팩$/, '') ?? '일상';
  const titles = [
    `${core}의 하루`,
    `${formatWord} ${core}`,
    `${keyword} ${input.subjectKind === 'pet' ? '집사' : '일상'}`,
    `${core} 리액션 ${input.frames.length}종`,
    `${input.subjectKind === 'pet' ? '냥' : '내'} ${keyword} ${formatWord}`,
  ].map((title) => title.replace(/\s+/g, ' ').trim()).filter((title, index, list) => list.indexOf(title) === index).slice(0, 5);
  while (titles.length < 5) titles.push(`${core} ${['에디션', '컬렉션', '시리즈', '세트', '팩'][titles.length]}`);

  const hashtags = [...new Set([
    ...BASE_TAGS,
    ...(theme?.tags ?? []),
    ...(input.tone === 'photo-sticker' ? ['실사이모티콘'] : []),
    ...(input.subjectKind === 'pet' ? ['반려동물', '집사일상'] : ['셀피', '일상이모티콘']),
  ])].slice(0, 10);
  while (hashtags.length < 10) hashtags.push(`이모티콘${hashtags.length + 1}`);

  const checklist = [
    `32종 구성 확인 (현재 ${input.frames.length}컷 — 카카오 제안은 32종 기준)`,
    '360×360px 투명 PNG · 개당 150KB 이하 (앱의 규격 패키저가 자동 검증)',
    '78×78px 아이콘 16KB 이하',
    '대사·표정에 정치·종교·비하 표현이 없는지 확인',
    '실제 인물 사진을 쓰는 경우 본인(또는 초상권 동의) 확인',
    '제목·해시태그는 심사 제출 화면에서 직접 입력',
  ];

  return {
    concept: locale === 'en' ? conceptEn : concept,
    conceptEn,
    titles,
    hashtags,
    checklist,
    cutCount: input.frames.length,
    generatedAt: new Date().toISOString(),
  };
}

/** ZIP 안에 넣을 사람이 읽는 텍스트 */
export function reviewSheetText(sheet: ReviewSheet, locale: Locale = 'ko'): string {
  return [
    '이모티학 · 카카오/라인 심사 시트 (초안)',
    '',
    '[캐릭터 컨셉]',
    sheet.concept,
    '',
    '[이모티콘 제목 후보]',
    ...sheet.titles.map((title, index) => `${index + 1}. ${title}`),
    '',
    '[해시태그 10개]',
    sheet.hashtags.map((tag) => `#${tag}`).join(' '),
    '',
    `[구성] ${sheet.cutCount}컷`,
    '',
    '[제출 전 체크리스트]',
    ...sheet.checklist.map((line) => `· ${line}`),
    '',
    '※ 이 시트는 초안입니다. 카카오 이모티콘 스튜디오 제안·심사는 직접 진행해야 하며 통과를 보장하지 않습니다.',
  ].join('\n');
}
