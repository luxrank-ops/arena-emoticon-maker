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
const { SEASON_PROPS, SEASON_PROP_COUNT, seasonPropById, seasonPropsForPack, SEASON_PROP_SPOTS, computeSubjectMetrics, resolveSeasonPropRect, planFigureScale } = await import(
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

console.log('\n[6] 시즌 소품 — 실사 PNG 에셋 · 피사체 비율 자동 맞춤');
check('소품 11종', SEASON_PROP_COUNT === SEASON_PROPS.length && SEASON_PROP_COUNT >= 10);
check('소품 id 고유', new Set(SEASON_PROPS.map((p) => p.id)).size === SEASON_PROPS.length);
check(
  '모든 소품에 한국어/영어 이름·기본 자리·자동 맞춤 기준',
  SEASON_PROPS.every(
    (p) => p.label && p.labelEn && !!SEASON_PROP_SPOTS[p.spot] && p.scale > 0 && !!p.fit && p.asset.endsWith('.png'),
  ),
);
check('자산 경로가 public/props/season', SEASON_PROPS.every((p) => p.asset.startsWith('/props/season/')));

// ── PNG 헤더 검사(알파 채널·크기·용량) : 의존성 없이 직접 읽는다
const pngOf = (rel: string) => {
  const path = join(process.cwd(), rel);
  if (!existsSync(path)) return { exists: false, sig: false, width: 0, height: 0, colorType: 0, trns: false, bytes: 0 };
  const buf = readFileSync(path);
  const chunks: string[] = [];
  let offset = 8;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('latin1');
    chunks.push(type);
    offset += 12 + length;
  }
  return {
    exists: true,
    sig: buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a',
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25],
    trns: chunks.includes('tRNS'),
    bytes: buf.length,
  };
};
const assets = SEASON_PROPS.map((p) => ({ id: p.id, aspect: p.aspect, ...pngOf(`public${p.asset}`) }));
check('자산 파일이 실제로 있다', assets.every((a) => a.exists), assets.filter((a) => !a.exists).map((a) => a.id).join(','));
check('모두 PNG 시그니처', assets.every((a) => a.sig));
check(
  '투명을 담은 PNG (RGBA colorType 6 또는 팔레트+tRNS)',
  assets.every((a) => a.colorType === 6 || (a.colorType === 3 && a.trns)),
  assets.map((a) => `${a.id}:${a.colorType}`).join(','),
);
check(
  '가로·세로 512 이하 / 96 이상',
  assets.every((a) => Math.max(a.width, a.height) <= 512 && Math.min(a.width, a.height) >= 96),
  assets.map((a) => `${a.id}:${a.width}x${a.height}`).join(','),
);
check(
  '파일 하나 120KB 이하 (모바일 부담 없음)',
  assets.every((a) => a.bytes <= 120 * 1024),
  assets.filter((a) => a.bytes > 120 * 1024).map((a) => a.id).join(','),
);
check(
  '선언한 비율 = 실제 픽셀 비율 (±0.01)',
  assets.every((a) => Math.abs(a.aspect - a.width / a.height) < 0.01),
  assets.map((a) => `${a.id}:${a.aspect}/${(a.width / a.height).toFixed(3)}`).join(','),
);
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

// ── 피사체 비율 측정: 위쪽 18% 구간이 '머리', 아래는 어깨가 넓다
const alphaBuf = new Uint8ClampedArray(100 * 100 * 4);
for (let y = 20; y <= 95; y += 1) {
  const [x0, x1] = y <= 40 ? [30, 70] : [20, 80];
  for (let x = x0; x <= x1; x += 1) alphaBuf[(y * 100 + x) * 4 + 3] = 255;
}
const measured = computeSubjectMetrics(alphaBuf, 100);
check(
  '피사체 바운딩박스 측정',
  !!measured && Math.abs(measured.top - 0.2) < 0.011 && Math.abs(measured.bottom - 0.95) < 0.011 && Math.abs(measured.left - 0.2) < 0.011 && Math.abs(measured.right - 0.8) < 0.011,
  JSON.stringify(measured),
);
check('머리 너비는 위쪽 구간의 폭', !!measured && Math.abs(measured.headWidth - 0.41) < 0.011, String(measured?.headWidth));
check('머리 중심 x', !!measured && Math.abs(measured.headCenterX - 0.5) < 0.011);
check('투명한 이미지는 null (폴백으로 간다)', computeSubjectMetrics(new Uint8ClampedArray(100 * 100 * 4), 100) === null);

// ── 배치 계산
const humanMetrics = {
  top: 0.16,
  bottom: 0.9,
  left: 0.18,
  right: 0.78,
  width: 0.6,
  height: 0.74,
  centerX: 0.48,
  headWidth: 0.32,
  headCenterX: 0.5,
  headTop: 0.16,
  noseY: 0.16 + 0.32 * 0.72,
};
const hat = seasonPropById('santaHat')!;
const hatRect = resolveSeasonPropRect(hat, { id: 'santaHat' }, humanMetrics, 360);
const idealHatW = 0.32 * 360 * hat.scale;
check(
  '산타 모자 폭이 머리 너비에 비례 (공간이 좁으면 조금 줄어든다)',
  hatRect.w <= idealHatW + 0.5 && hatRect.w >= idealHatW * 0.7,
  `${hatRect.w.toFixed(1)} / ideal ${idealHatW.toFixed(1)}`,
);
check(
  '모자 챙이 눈(머리 너비 0.45) 위에서 멈춘다 — 얼굴을 가리지 않는다',
  hatRect.cy + hatRect.h / 2 <= (humanMetrics.top + 0.32 * 0.45) * 360 + 0.5,
  `${(hatRect.cy + hatRect.h / 2).toFixed(1)} vs ${((humanMetrics.top + 0.32 * 0.45) * 360).toFixed(1)}`,
);
check('모자 중심이 머리 중심과 같다', Math.abs(hatRect.cx - 180) < 1);
const zoomMetrics = { ...humanMetrics, top: 0.02, headTop: 0.02, bottom: 1, height: 0.98, headWidth: 0.62, noseY: 0.02 + 0.62 * 0.72 };
const zoomHat = resolveSeasonPropRect(hat, { id: 'santaHat' }, zoomMetrics, 360);
check(
  '얼굴 클로즈업에서도 챙이 눈을 덮지 않는다',
  zoomHat.cy + zoomHat.h / 2 <= (0.02 + 0.62 * 0.45) * 360 + 1,
  `${(zoomHat.cy + zoomHat.h / 2).toFixed(1)}`,
);
check('정수리 위 공간이 없으면 사진을 줄여 자리를 만든다', planFigureScale(hat, { id: 'santaHat' }, zoomMetrics, 360) < 1);
check(
  '공간이 넉넉하면 사진을 줄이지 않는다',
  planFigureScale(hat, { id: 'santaHat' }, { ...humanMetrics, top: 0.55, headTop: 0.55, bottom: 1, height: 0.45 }, 360) === 1,
);
const sackRect = resolveSeasonPropRect(seasonPropById('giftSack')!, { id: 'giftSack' }, humanMetrics, 360);
check('선물보따리는 피사체 오른쪽 아래 여백으로', sackRect.cx > humanMetrics.right * 360 - 1 && sackRect.cy > humanMetrics.bottom * 360 - 1);
check(
  '여백보다 커지지 않는다',
  sackRect.w <= 360 - humanMetrics.right * 360 + 1 && sackRect.h <= 360 - humanMetrics.bottom * 360 + 1,
);
const fallbackRect = resolveSeasonPropRect(seasonPropById('giftSack')!, { id: 'giftSack' }, null, 360);
check('피사체를 못 재면 옛 고정 자리로 폴백', fallbackRect.basis === 'fallback' && fallbackRect.w > 0);
const roomyMetrics = { ...humanMetrics, top: 0.55, headTop: 0.55, bottom: 1, height: 0.45 };
const roomyHat = resolveSeasonPropRect(hat, { id: 'santaHat' }, roomyMetrics, 360);
const bigHat = resolveSeasonPropRect(hat, { id: 'santaHat', sizeFactor: 1.5 }, roomyMetrics, 360);
check('크기 슬라이더 배율이 반영된다', bigHat.w > roomyHat.w * 1.15, `${bigHat.w.toFixed(1)} vs ${roomyHat.w.toFixed(1)}`);
const movedHat = resolveSeasonPropRect(hat, { id: 'santaHat', dx: 0.2 }, humanMetrics, 360);
check('좌우 미세조정이 반영된다', Math.abs(movedHat.cx - hatRect.cx - 72) < 1);
check('자리 고르기는 자유 배치로 계산된다', resolveSeasonPropRect(hat, { id: 'santaHat', spot: 'bottomRight' }, humanMetrics, 360).basis === 'free');

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
check('소품 카드 아트가 저장과 같은 PNG 에셋을 쓴다', read('src/components/season/SeasonPropArt.tsx').includes('prop.asset'));
check(
  '소품 크기·좌우·상하 미세조정 슬라이더',
  studio.includes('prop-size') && studio.includes('prop-dx') && studio.includes('prop-dy'),
);
check('옷 전체는 AI 변환으로 안내하고 시즌팩으로 이어진다', studio.includes('AI 변환으로') && studio.includes("lp('/season')"));
check(
  'export 가 누끼 피사체 비율을 재서 소품을 그린다',
  read('src/lib/export.ts').includes('computeSubjectMetrics') &&
    read('src/lib/export.ts').includes('drawSeasonProp(ctx, seasonProp, size, subject)'),
);
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
