// ─────────────────────────────────────────────────────────────
// 번들 캘리그라피 폰트 로더 (브라우저)
//  · 페이지 CSS(@font-face)로 폰트를 받아 캔버스에서 쓰고,
//  · 같은 파일을 base64 로 감아 SVG 안에 심어 <img> 래스터화에서도 동일하게 그려지게 한다.
// ─────────────────────────────────────────────────────────────

import {
  CAPTION_FONT_FILES,
  CAPTION_FONT_FAMILIES,
  type CaptionFace,
} from '@/lib/studio/caption';

/** 임베드 대상 = 실제 폰트 파일이 있는 face */
function embaddableFaces(): CaptionFace[] {
  return (Object.keys(CAPTION_FONT_FILES) as CaptionFace[]).filter((face) => CAPTION_FONT_FILES[face]);
}

function familyName(face: CaptionFace): string {
  const first = CAPTION_FONT_FAMILIES[face].split(',')[0].trim();
  return first.replace(/^"|"$/g, '');
}

const ready = new Set<CaptionFace>();
const cssCache = new Map<CaptionFace, string>();

/** 화면용 폰트를 미리 받아 둔다(캔버스가 대체 폰트로 먼저 그려지는 것을 막는다). */
export async function ensureCaptionFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const probe = '자리 비웠습니다 커피 수혈 중 월요병 금요일이다';
  await Promise.all(
    embaddableFaces().map(async (face) => {
      if (ready.has(face)) return;
      const family = familyName(face);
      try {
        await (document as Document & { fonts: FontFaceSet }).fonts.load(`400 64px "${family}"`, probe);
        await (document as Document & { fonts: FontFaceSet }).fonts.load(`700 64px "${family}"`, probe);
      } catch {
        /* 폰트를 못 받아도 시스템 서체로 계속한다 */
      }
      ready.add(face);
    }),
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * SVG 에 심을 @font-face CSS. 파일을 한 번만 받아 캐시한다.
 * 실패하면 '' 을 돌려주고 SVG 는 시스템 서체로 그린다(깨진 글자보다 낫다).
 */
export async function captionFontCss(face: CaptionFace = 'calli'): Promise<string> {
  const url = CAPTION_FONT_FILES[face];
  if (!url) return '';
  const cached = cssCache.get(face);
  if (cached !== undefined) return cached;
  let css = '';
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (res.ok) {
      const bytes = new Uint8Array(await res.arrayBuffer());
      const weight = face === 'hand' ? 700 : 400;
      css =
        `@font-face{font-family:"${familyName(face)}";font-style:normal;font-weight:${weight};` +
        `src:url(data:font/woff2;base64,${bytesToBase64(bytes)}) format("woff2");}`;
    }
  } catch {
    /* 네트워크 실패 → 시스템 서체 */
  }
  cssCache.set(face, css);
  return css;
}

/** 서버·테스트용: 이미 읽어 둔 폰트 바이트로 CSS 를 만든다. */
export function fontCssFromBytes(face: CaptionFace, bytes: Uint8Array): string {
  const weight = face === 'hand' ? 700 : 400;
  return (
    `@font-face{font-family:"${familyName(face)}";font-style:normal;font-weight:${weight};` +
    `src:url(data:font/woff2;base64,${bytesToBase64(bytes)}) format("woff2");}`
  );
}
