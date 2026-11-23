// ─────────────────────────────────────────────────────────────
// 드립·밈 7테마 66컷 — 데이터·대사 팩·데코·사진 팩 형태 전수 점검
// 실행: npx tsx scripts/test-drip-themes.ts
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, extra = '') {
  if (condition) { passed++; console.log(`  ✔ ${name}`); }
  else { failed++; console.log(`  ✘ ${name} ${extra}`); }
}

const { DRIP_THEMES, DRIP_LINES, DRIP_THEME_COUNT, DRIP_LINE_COUNT, DRIP_PACK_ID, dripThemeById, dripLineById } = await import('../src/data/drip-themes');
const { QUOTE_PACKS, quotePackById } = await import('../src/lib/quote-packs');
const { decorMotifFor } = await import('../src/lib/studio/decor');
const { PACK_FORMATS, PACK_FORMAT_IDS, packFormatById, formatCuts, defaultLayerOf } = await import('../src/lib/pack-formats');
const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

const EMOTIONS = new Set(['joy', 'laugh', 'love', 'sad', 'angry', 'sulk', 'tired', 'surprised', 'smug', 'cry', 'king', 'blank']);

console.log('\n[1] 데이터 — 7테마 66컷');
check('테마 7개', DRIP_THEME_COUNT === 7 && DRIP_THEMES.length === 7);
check('문구 66컷', DRIP_LINE_COUNT === 66 && DRIP_LINES.length === 66);
const expectedCounts = [10, 12, 10, 10, 8, 8, 8];
check('테마별 구성 10·12·10·10·8·8·8', DRIP_THEMES.map((theme) => theme.lines.length).join(',') === expectedCounts.join(','));
check('모든 테마에 제목·소개·강조색·이모지', DRIP_THEMES.every((theme) => theme.title && theme.titleEn && theme.tagline && theme.taglineEn && theme.accent && theme.emoji));
const ids = DRIP_LINES.map((item) => item.id);
const lines = DRIP_LINES.map((item) => item.line);
check('문구 id 전부 고유', new Set(ids).size === ids.length);
check('대사 전부 고유', new Set(lines).size === lines.length);
check('줄마다 테마·한글/영문 문구·감정', DRIP_LINES.every((item) => item.themeId === dripThemeById(item.themeId)?.id && item.line.length > 0 && item.lineEn.length > 0 && item.label.length > 0 && item.labelEn.length > 0 && EMOTIONS.has(item.emotion)));
check('id 로 대사를 다시 찾는다', DRIP_LINES.every((item) => dripLineById(item.id) === item));
check('감정 8종 이상이 골고루 쓰인다', new Set(DRIP_LINES.map((item) => item.emotion)).size >= 8);

// 사용자가 지정한 문구가 그대로 들어갔는지 (테마별 대표 문구)
const mustHave = [
  '생존 신고합니다', '눈은 떴고 영혼은 로딩 중', '은혜는 월급날 갚겠음', '절 받으세요', '제 입이 방정입니다',
  '양심이 잠깐 가출함', '인생 치트키 쓰셨네', '내일 나 찾는 사람 모름', '꿈에서도 출근 금지', '어떻게든 되겠지 뭐',
  '넵! (영혼 없음)', '네? 제가요? 왜요?', '알겠습니다 (모르겠음)', '몸만 출근했습니다', '월요일 누가 만들었냐',
  '퇴근 버튼 고장남', '무시하고 퇴근 시작', '월급 루팡 출동', '월급 로그인·로그아웃', '들어는 있는데 안 들림',
  '오늘의 나 칭찬해', '자유의 몸이다!', '오늘 점심 뭐 먹지', '치킨 시킬까?', '야식은 내일부터 참자',
  '맛있게 먹으면 0칼로리', '다이어트는 내일부터', '커피 수혈 시급', '얼죽아 출동', '한잔 콜?', '적셔보자!', '내돈내산 찐맛집',
  '살아는 있지?', '읽씹 감지됨', '답장 버튼 고장 났냐', '3초 안에 안 오면 삐짐', '응~ 안가', '아무것도 안 하고 싶다',
  '배꼽 실종됨', '웃음 참기 실패', '썰렁해서 패딩 입음', '이게 맞아..?',
  '밥 뭇나?', '오다 주웠다', '억수로 고맙다', '단디 해라', '와 그리노', '쪼까 봐주쇼', '아따 참말로잉~', '내 편 맞제?',
  '심심함 폭발 직전', '얼굴 보여줘 사기치지 말고', '오늘도 귀여워서 문제', '뽀뽀 갈겨!', '나한테 푹 빠졌지?', '내 편은 너뿐',
  '봐주시면 착하게 살게요', '오늘 주인공 너야 너',
  '이 단톡 살아있나요?', '건강이 최고입니다', '복 다 쓸어 담으세요', '양손 무겁게 갈게요', '박수 짝짝짝', '돈벼락 맞으세요',
  '로또 1등 기원', '행복한 하루 되세요',
];
const missing = mustHave.filter((text) => !lines.includes(text));
check('지정 문구 66개가 순서대로 그대로', missing.length === 0 && mustHave.join('|') === lines.join('|'), missing.join(','));

console.log('\n[2] 대사 팩(/quotes)');
const pack = quotePackById(DRIP_PACK_ID);
check('대사 팩에 연결된다', !!pack && pack.title.includes('드립') && pack.priceCredits === 0);
check('팩 대사 = 드립 원본 (id·문구·감정·테마)', !!pack && pack.lines.length === DRIP_LINES.length && pack.lines.every((line, index) => {
  const source = DRIP_LINES[index];
  return line.id === source.id && line.line === source.line && line.emotion === source.emotion && line.groupId === source.themeId;
}));
check('세부 테마 7개가 팩에 실린다', !!pack && (pack.groups?.length ?? 0) === 7 && pack.groups!.every((group) => !!dripThemeById(group.id)));
check('팩이 대사 스튜디오 목록 맨 앞에 온다', QUOTE_PACKS[0]?.id === DRIP_PACK_ID);
check('나머지 대사 팩은 그대로 5개', QUOTE_PACKS.length === 6 && QUOTE_PACKS.slice(1).map((item) => item.id).join(',') === 'daily-cuts,film-romance,office-sitcom,fantasy-epic,noir-mystery');

console.log('\n[3] 데코 엔진(감정 → 모티프)');
const motifCases: [string, ReturnType<typeof decorMotifFor>][] = [
  ['배꼽 실종됨', 'laugh'],
  ['몸만 출근했습니다', 'tired'],
  ['월급 루팡 출동', 'money'],
  ['뽀뽀 갈겨!', 'love'],
  ['썰렁해서 패딩 입음', 'plain'],
  ['이게 맞아..?', 'surprised'],
  ['돈벼락 맞으세요', 'money'],
  ['치킨 시킬까?', 'question'],
  ['자유의 몸이다!', 'cheer'],
  ['읽씹 감지됨', 'angry'],
];
check('문구·감정에 맞는 데코 모티프', motifCases.every(([text, motif]) => decorMotifFor(text, DRIP_LINES.find((item) => item.line === text)?.emotion) === motif),
  motifCases.filter(([text, motif]) => decorMotifFor(text, DRIP_LINES.find((item) => item.line === text)?.emotion) !== motif).map(([text]) => text).join(','));

console.log('\n[4] 사진 팩 형태(drip)');
const format = packFormatById('drip');
check('형태 목록에 drip 이 있다', !!format && PACK_FORMAT_IDS.includes('drip'));
check('24컷', !!format && format.cuts.length === 24);
check('컷 문구가 모두 드립 원본', !!format && format.cuts.every((cut) => dripLineById(cut.id)?.line === cut.line && cut.lineEn === dripLineById(cut.id)?.lineEn));
check('컷마다 장면 지시·글자 레이어', !!format && format.cuts.every((cut) => cut.action.length > 20 && cut.textLayer?.bubble === 'none' && defaultLayerOf(cut)?.text === cut.line));
check('12·24컷 선택 가능', formatCuts('drip', 12).length === 12 && formatCuts('drip', 24).length === 24);
check('영문 컷은 영문 대사', formatCuts('drip', 6, 'en').every((cut) => cut.line === cut.lineEn));
check('사진 1장 · 한글 레이어', !!format && format.needsSecondPhoto === false && format.textMode === 'layer');
check('첫 12컷이 테마별로 섞여 있다', new Set(formatCuts('drip', 12).map((cut) => dripLineById(cut.id)?.themeId)).size >= 6);
check('기존 형태 7종 유지', PACK_FORMATS.length === 8 && ['situation', 'parody', 'duo', 'typo', 'combo', 'duo-chemi', 'pet-meme'].every((id) => PACK_FORMAT_IDS.includes(id as never)));

console.log('\n[5] 화면 연결');
check('/presets 에 테마별 추천 대사 섹션', read('src/app/presets/page.tsx').includes('DripThemeSection') && read('src/components/presets/DripThemeSection.tsx').includes('DRIP_THEMES'));
check('테마 카드가 대사 스튜디오로 연결', read('src/components/presets/DripThemeSection.tsx').includes('/quotes?pack=') && read('src/components/presets/DripThemeSection.tsx').includes('format=drip'));
check('/quotes 가 팩·테마 딥링크를 읽는다', read('src/app/quotes/page.tsx').includes('searchParams') && read('src/app/quotes/page.tsx').includes('initialGroupId') && read('src/components/quotes/QuoteShop.tsx').includes('currentPack.groups'));
check('/quotes 상단에 NEW 드립 안내', read('src/app/quotes/page.tsx').includes('킹받는 반전·드립'));

console.log(`\n결과: ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
