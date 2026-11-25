// ─────────────────────────────────────────────────────────────
// 시즌팩 3종 — 일정 판정 · 프롬프트 · 누끼 소품 · 화면 연결 전수 점검
// 실행: npx tsx scripts/test-season-packs.ts
// ─────────────────────────────────────────────────────────────
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, extra = '') {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    console.log(`  ✘ ${name} ${extra}`);
  }
}

const { SEASON_PACKS, SEASON_PACK_COUNT, SEASON_ACCESSORIES, seasonPackById, seasonAccessoryById } = await import(
  '../src/data/season-packs'
);
const {
  SEASON_PREVIEW_VALUE,
  availableSeasonAccessories,
  countdownTo,
  kstDayDiff,
  seasonQueryString,
  seasonStageAt,
  seasonTeaserViews,
  seasonTimeContext,
  seasonViewAt,
  seasonViews,
  isSeasonAccessoryAvailable,
} = await import('../src/lib/season');
const { SEASON_PROPS, SEASON_PROP_COUNT, seasonPropById, seasonPropsForPack, SEASON_PROP_SPOTS } = await import(
  '../src/lib/studio/season-props'
);
const { NAV_ITEMS, MENU_SHEET, isNavActive } = await import('../src/lib/nav');

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');
const exists = (file: string) => existsSync(join(process.cwd(), file));
const at = (iso: string) => new Date(Date.parse(iso));

console.log('\n[1] 데이터 — 3팩 · 일정 · 가격');
check('시즌팩 3개', SEASON_PACK_COUNT === 3 && SEASON_PACKS.length === 3);
check(
  'id 는 christmas·newyear·lunar',
  SEASON_PACKS.map((p) => p.id).join(',') === 'christmas,newyear,lunar',
);
check(
  '모든 팩에 제목·후킹·소개·가격·이모지',
  SEASON_PACKS.every(
    (p) => p.title && p.titleEn && p.headline && p.headlineEn && p.tagline && p.taglineEn && p.priceLabel && p.priceLabelEn && p.emoji,
  ),
);
check('12컷 공통 · 5,900원 완성권', SEASON_PACKS.every((p) => p.cuts === 12 && p.priceLabel.includes('5,900')));
check(
  '일정 순서 티저 < 오픈 < 종료',
  SEASON_PACKS.every((p) => Date.parse(p.teaseAt) < Date.parse(p.openAt) && Date.parse(p.openAt) < Date.parse(p.closeAt)),
);
check(
  '사용자 지정 일정과 일치 (12/01→12/11 · 12/18→12/26 · 01/10→01/20)',
  seasonPackById('christmas')?.teaseAt === '2026-12-01T00:00:00+09:00' &&
    seasonPackById('christmas')?.openAt === '2026-12-11T00:00:00+09:00' &&
    seasonPackById('newyear')?.teaseAt === '2026-12-18T00:00:00+09:00' &&
    seasonPackById('newyear')?.openAt === '2026-12-26T00:00:00+09:00' &&
    seasonPackById('lunar')?.teaseAt === '2027-01-10T00:00:00+09:00' &&
    seasonPackById('lunar')?.openAt === '2027-01-20T00:00:00+09:00',
);
check('order 1·2·3 고유', new Set(SEASON_PACKS.map((p) => p.order)).size === 3);
check('예시 대사 4줄씩', SEASON_PACKS.every((p) => p.lines.length === 4 && p.lines.every((l) => l.line && l.lineEn && l.emoji)));

console.log('\n[2] 일정 판정 — KST 기준 (오늘 2026-11-25)');
const today = at('2026-11-25T13:19:00+09:00');
const tv = (id: string, when = today) => seasonViewAt(seasonPackById(id)!, when.getTime());
check('오늘: 크리스마스 upcoming', tv('christmas').stage === 'upcoming');
check('오늘: 크리스마스 티저까지 D-6', tv('christmas').dday === 6);
check('오늘: 새해 upcoming', tv('newyear').stage === 'upcoming');
check('오늘: 설날 upcoming', tv('lunar').stage === 'upcoming');
check('오늘: 소품 잠금', SEASON_PACKS.every((p) => seasonViewAt(p, today.getTime()).unlocked === false));
check('티저 공개일 12/01 00:00 → teasing', tv('christmas', at('2026-12-01T00:00:00+09:00')).stage === 'teasing');
check('12/05 → teasing · 오픈까지 D-6', tv('christmas', at('2026-12-05T12:00:00+09:00')).stage === 'teasing' && tv('christmas', at('2026-12-05T12:00:00+09:00')).dday === 6);
check('12/10 23:59:59 → 아직 teasing', tv('christmas', at('2026-12-10T23:59:59+09:00')).stage === 'teasing');
check('12/11 00:00 → open', tv('christmas', at('2026-12-11T00:00:00+09:00')).stage === 'open');
check('12/11 → 소품 잠금 해제', tv('christmas', at('2026-12-11T00:00:01+09:00')).unlocked === true);
check('12/20 → 새해 teasing (12/18 티저)', tv('newyear', at('2026-12-20T09:00:00+09:00')).stage === 'teasing');
check('12/26 → 새해 open', tv('newyear', at('2026-12-26T00:00:00+09:00')).stage === 'open');
check('01/15 → 설날 teasing · D-5', tv('lunar', at('2027-01-15T09:00:00+09:00')).stage === 'teasing' && tv('lunar', at('2027-01-15T09:00:00+09:00')).dday === 5);
check('01/20 → 설날 open', tv('lunar', at('2027-01-20T00:00:00+09:00')).stage === 'open');
check('01/07 → 크리스마스 closed', tv('christmas', at('2027-01-07T00:00:00+09:00')).stage === 'closed');
check('preview → 세 팩 모두 open·해제', seasonViews(today, true).every((v) => v.stage === 'open' && v.unlocked));
check('티저 목록은 종료 팩 제외', seasonTeaserViews(at('2027-03-01T00:00:00+09:00')).length === 0);
check(
  '오픈 중인 팩이 티저 목록 맨 앞',
  seasonTeaserViews(at('2026-12-12T00:00:00+09:00'))[0]?.pack.id === 'christmas',
);
check('D-day 는 달력 날짜 차이', kstDayDiff(today.getTime(), Date.parse('2026-12-11T00:00:00+09:00')) === 16);
check('카운트다운 0 이하로 안 내려간다', countdownTo(Date.parse('2026-12-11T00:00:00+09:00'), Date.parse('2026-12-12T00:00:00+09:00')).totalMs === 0);

console.log('\n[3] 검수 파라미터 (?preview · ?at)');
const ctx1 = seasonTimeContext({});
check('기본은 preview 아님', ctx1.preview === false && ctx1.simulated === false);
const ctx2 = seasonTimeContext({ preview: 'season' });
check('?preview=season 인식', ctx2.preview === true);
const ctx3 = seasonTimeContext({ at: '2026-12-05' });
check('?at=날짜 → KST 00:00', ctx3.simulated && ctx3.now.toISOString() === '2026-12-04T15:00:00.000Z');
const ctx4 = seasonTimeContext({ at: 'garbage' });
check('잘못된 at 은 무시', ctx4.simulated === false && ctx4.invalidAt === true);
check('검수 링크 파라미터 유지', seasonQueryString({ ...ctx2, simulated: true }) === `?preview=${SEASON_PREVIEW_VALUE}&at=2026-11-25`);

console.log('\n[4] AI 프롬프트 — 복장·소품·배경·포즈');
for (const pack of SEASON_PACKS) {
  check(`${pack.id}: 프롬프트 6개 이상`, pack.prompts.length >= 6);
  check(`${pack.id}: 종류 id 고유`, new Set(pack.prompts.map((p) => p.id)).size === pack.prompts.length);
  check(
    `${pack.id}: 모든 프롬프트에 한국어 이름·영어 구절`,
    pack.prompts.every((p) => p.label.length > 0 && p.labelEn.length > 0 && p.prompt.length >= 20 && /^[\x20-\x7E]+$/.test(p.prompt)),
  );
  check(`${pack.id}: 복장·소품·배경 종류를 모두 포함`, ['costume', 'prop', 'background'].every((kind) => pack.prompts.some((p) => p.kind === kind)));
}
const allPrompts = SEASON_PACKS.flatMap((p) => p.prompts.map((item) => item.prompt)).join(' | ');
check(
  '크리스마스 필수 소재 (산타 복장·루돌프·썰매·선물보따리·트리)',
  ['Santa suit', 'reindeer antler', 'snow sled', 'gift sack', 'Christmas tree'].every((needle) => allPrompts.includes(needle)),
);
check('새해 필수 소재 (폭죽·카운트다운·파티)', ['fireworks', 'countdown', 'party popper'].every((needle) => allPrompts.includes(needle)));
check('설날 필수 소재 (한복·복주머니·한옥)', ['hanbok', 'bokjumeoni', 'hanok'].every((needle) => allPrompts.includes(needle)));

console.log('\n[5] 시즌 악세사리 — 오픈일에만');
check('악세사리 3종 × 3팩', SEASON_ACCESSORIES.length === 9);
check('악세사리 id 고유', new Set(SEASON_ACCESSORIES.map((a) => a.id)).size === SEASON_ACCESSORIES.length);
check(
  '악세사리마다 이름·이모지·프롬프트',
  SEASON_ACCESSORIES.every((a) => a.name && a.nameEn && a.emoji && a.promptAddition.length > 10 && a.priceCredits >= 1),
);
check('오늘(11/25) 쓸 수 있는 시즌 악세사리 0건', availableSeasonAccessories(today).length === 0);
check('크리스마스 오픈일(12/11) 이후엔 크리스마스 3종만 열림', availableSeasonAccessories(at('2026-12-12T10:00:00+09:00')).length === 3);
check('새해 오픈(12/26) 뒤엔 6종', availableSeasonAccessories(at('2026-12-27T00:00:00+09:00')).length === 6);
check('설날 오픈(01/20) 뒤엔 설날 3종', availableSeasonAccessories(at('2027-01-21T00:00:00+09:00')).length === 3);
check('시즌이 겹치는 날(12/30)엔 6종', availableSeasonAccessories(at('2026-12-30T00:00:00+09:00')).length === 6);
check('id 로 악세사리 조회', seasonAccessoryById('season-xmas-santa-hat')?.name === '산타 모자');
check('오픈 전 악세사리는 잠김', isSeasonAccessoryAvailable('season-lunar-pouch', today) === false);

console.log('\n[6] 누끼 소품 벡터 데이터');
check('소품 11종', SEASON_PROP_COUNT === SEASON_PROPS.length && SEASON_PROP_COUNT >= 10);
check('소품 id 고유', new Set(SEASON_PROPS.map((p) => p.id)).size === SEASON_PROPS.length);
check('모든 소품에 한국어/영어 이름·기본 자리', SEASON_PROPS.every((p) => p.label && p.labelEn && !!SEASON_PROP_SPOTS[p.spot] && p.scale > 0));
check(
  '모든 소품에 2개 이상 파트 · path 는 M 으로 시작',
  SEASON_PROPS.every((p) => p.parts.length >= 2 && p.parts.every((part) => part.d.startsWith('M') && (part.fill || part.stroke))),
);
const bounds = SEASON_PROPS.map((p) => {
  let max = 0;
  for (const part of p.parts) {
    for (const token of part.d.replace(/[MLQCZ]/g, ' ').trim().split(/\s+/)) {
      const n = Number(token);
      if (Number.isFinite(n)) max = Math.max(max, Math.abs(n));
    }
  }
  return { id: p.id, max };
});
check('소품 좌표가 정규화 박스(-1.3~1.3) 안', bounds.every((b) => b.max <= 1.3), bounds.filter((b) => b.max > 1.3).map((b) => b.id).join(','));
check(
  '크리스마스 소품 6종 (산타모자·뿔·빨간코·선물보따리·썰매·눈결정)',
  seasonPropsForPack('christmas').length === 6 &&
    ['santaHat', 'reindeerAntlers', 'rudolphNose', 'giftSack', 'snowSled', 'snowflake'].every((id) => !!seasonPropById(id)),
);
check('새해 소품 3종', seasonPropsForPack('newyear').length === 3);
check('설날 소품 2종', seasonPropsForPack('lunar').length === 2);
check(
  '팩의 propIds 가 실제 소품과 연결',
  SEASON_PACKS.every((p) => p.propIds.length >= 2 && p.propIds.every((id) => seasonPropById(id)?.packId === p.id)),
);

console.log('\n[7] 화면 연결');
check('/season 페이지가 있다', exists('src/app/season/page.tsx'));
const seasonPage = read('src/app/season/page.tsx');
check('/season 이 preview·at 검수를 안내', seasonPage.includes('preview') && seasonPage.includes('at=') && seasonPage.includes('SeasonCountdownClock'));
check('홈이 시즌 티저를 노출', read('src/app/page.tsx').includes('SeasonTeaser') && read('src/app/page.tsx').includes('seasonTeaserViews'));
check('만들기 허브가 시즌 티저를 노출', read('src/app/studio/page.tsx').includes('SeasonTeaser'));
check('티저 카드가 GA4 season_teaser_click 을 보낸다', read('src/components/season/SeasonTeaser.tsx').includes("track('season_teaser_click'"));
check('티저 카드가 커밍순 배지·D-day 를 그린다', read('src/components/season/SeasonTeaser.tsx').includes('COMING SOON') && read('src/components/season/SeasonTeaser.tsx').includes('D-'));
const photoPage = read('src/app/studio/photo/page.tsx');
check('/studio/photo 가 오픈 판정을 서버에서 넘긴다', photoPage.includes('seasonViews') && photoPage.includes('seasonGroups'));
const studio = read('src/components/studio/PhotoCutoutStudio.tsx');
check('누끼 스튜디오에 시즌 소품 영역', studio.includes('시즌 소품') && studio.includes('SeasonPropArt'));
check('잠긴 소품은 안내만 하고 적용하지 않는다', studio.includes('season_prop_locked') && studio.includes('if (!group.unlocked)'));
check('소품이 미리보기·내려받기·ZIP 에 모두 들어간다', (studio.match(/seasonProp: seasonPlacement/g) ?? []).length >= 3);
check('오픈된 뒤에는 잠금 안내 대신 사용 안내를 보여 준다', studio.includes('orderedSeasonGroups.some((group) => group.unlocked)'));
check('export 가 소품을 그린다', read('src/lib/export.ts').includes('drawSeasonProp') && read('src/lib/export.ts').includes('seasonProp?: SeasonPropPlacement'));
check('AI 악세사리 목록이 오픈 판정을 쓴다', read('src/lib/accessories.ts').includes('availableSeasonAccessories'));
check('생성 API 가 시즌 악세사리를 검증한다', read('src/app/api/render/route.ts').includes('accessoryById'));
check('에디터가 시즌 악세사리를 보여 준다', read('src/components/editor/FrameEditor.tsx').includes('seasonAccessories') && read('src/app/editor/[packId]/[frameId]/page.tsx').includes('availableSeasonAccessories'));
check('전체메뉴에 시즌팩이 있다', MENU_SHEET.some((item) => item.href === '/season') && NAV_ITEMS.season.href === '/season');
check('하단 탭은 그대로 5개', ['home', 'create', 'packs', 'reply', 'menu'].every((key) => NAV_ITEMS[key as keyof typeof NAV_ITEMS]));
check('/season 에서 전체메뉴 탭이 켜진다', isNavActive('menu', '/season') && isNavActive('season', '/season'));
check('사이트맵에 /season', read('public/sitemap.xml').includes('https://emotihak.com/season'));

console.log('\n[8] 잠금 원칙');
check('preview 는 서버 악세사리 잠금을 풀지 않는다', availableSeasonAccessories(today).length === 0);
const seasonSource = read('src/lib/season.ts');
const lockBody = seasonSource.slice(seasonSource.indexOf('export function availableSeasonAccessories'), seasonSource.indexOf('export function seasonAccessoryIdsAt'));
check('시즌 악세사리 잠금은 날짜만 본다 (preview 인자 없음)', lockBody.length > 100 && !lockBody.includes('preview'));
check('검수 모드는 읽기 전용 주석으로 명시', read('src/lib/season.ts').includes('읽기 전용'));

console.log(`\n결과: ${passed} passed / ${failed} failed`);
if (failed > 0) process.exit(1);
