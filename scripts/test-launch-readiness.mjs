// 출시 차단 P0·UX 수리 — 정적 회귀 점검 (node 로 실행)
//  · 2026-11-15 점검 보고서의 "1주차" 항목이 코드로 되돌아가지 않게 고정한다.
//  · 브라우저/스토어가 없는 CI 에서도 검증되도록 파일 내용과 규칙성만 확인한다.
// 실행: node scripts/test-launch-readiness.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8');
let passed = 0;
function check(name, condition) {
  assert.ok(condition, name);
  console.log(`  ✔ ${name}`);
  passed++;
}
function count(needle, file) {
  return read(file).split(needle).length - 1;
}

// ── 1. 법정 표시 ─────────────────────────────────────────────
const business = read('src/lib/business.ts');
check('통신판매업 신고번호가 기본값으로 노출됨', business.includes('2026-부산강서구-0693'));
check('신고번호가 "정보 미입력"으로 비지 않음', !business.includes("NEXT_PUBLIC_MAIL_ORDER_NO || null"));
const pricingPage = read('src/app/pricing/page.tsx');
check('요금제 화면이 사업자 정보에 신고번호를 표시', pricingPage.includes('BUSINESS.mailOrder'));

// ── 2. 요금제 표기와 실제 허용 스타일 수 일치 ─────────────────
const pricing = read('src/lib/pricing.ts');
const packs = read('src/lib/packs.ts');
const freeTones = packs.match(/FREE_TONES[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? '';
const paidTones = packs.match(/tonesForPlan[\s\S]*?:\s*\[([^\]]*)\]/)?.[1] ?? '';
const countQuoted = (list) => (list.match(/'[^']+'/g) ?? []).length;
check('무료 스타일 수 = FREE_TONES 길이(7)', countQuoted(freeTones) === 7);
check('유료 스타일 수 = tonesForPlan 길이(11)', countQuoted(paidTones) === 11);
check('요금제 표의 무료 스타일 수가 7', /styles:\s*7,/.test(pricing));
check('요금제 표의 유료 스타일 수가 11', count('styles: 11,', 'src/lib/pricing.ts') === 2);
check('옛 표기(2종/6종)가 남아 있지 않음', !/styles:\s*(2|6),/.test(pricing));
check('굿즈 할인 판촉 문구 제거', !pricing.includes('굿즈 20% 할인') && !pricing.includes('goodsDiscount: 20'));

// ── 3. 미구현 기능 문구 정정 ─────────────────────────────────
const disclosures = read('src/lib/pricing.ts');
check('카카오 최신 규격(32종·150KB) 참고 안내 존재', disclosures.includes('32종') && disclosures.includes('150KB'));
check('카카오 출품 보장 아님을 명시', disclosures.includes('대행하거나 보장하지 않고'));
check('푸시 알림 미구현 안내 존재', disclosures.includes('푸시 알림은 준비 중'));
check('움직이는 이모티콘(APNG·GIF) 내보내기와 150KB 자동 압축 안내 존재', disclosures.includes('APNG') && disclosures.includes('150KB') && !disclosures.includes('변환하지는 않습니다'));
const storeDoc = read('docs/PLAY-STORE.md');
check('스토어 문구에서 "카카오 규격 검증·ZIP" 판촉 제거', !storeDoc.includes('카카오 규격 검증·ZIP'));
check('스토어 문구가 무료 다운로드 + 인앱결제 모델', storeDoc.includes('무료 다운로드') && storeDoc.includes('인앱결제'));
check('플랜 문구가 Daily Brief 푸시를 약속하지 않음', !read('src/lib/pricing.ts').includes('Daily Face Brief 매일 아침') && !read('src/lib/pricing.ts').includes('07:30'));

// ── 4. 헤더 beta 라벨 ────────────────────────────────────────
check('헤더에 beta 라벨 없음', !read('src/components/SiteHeader.tsx').includes('>beta<'));

// ── 5. 홈 CTA · 오류 UX ─────────────────────────────────────
const home = read('src/app/page.tsx');
check('홈이 대사 스튜디오(/quotes)로 안내', home.includes("href=\"/quotes\""));
check('홈이 AI 게이트 상태를 확인', home.includes('canUseAiGeneration'));
check('AI 잠금 시 "준비 중"으로 안내', home.includes('AI 스튜디오 (준비 중)'));
const errors = read('src/lib/client-errors.ts');
check('AI_ADMIN_ONLY 는 retry 가 아니라 quotes 안내', /case 'AI_ADMIN_ONLY':[\s\S]*?action: 'quotes'/.test(errors));
const uploadFlow = read('src/components/studio/UploadFlow.tsx');
check('업로드 실패 화면에 대사 스튜디오 이동 버튼', uploadFlow.includes("failureGuide?.action === 'quotes'"));
const uploadPage = read('src/components/studio/UploadPageContent.tsx');
check('AI 잠금 배너에 대사 스튜디오 링크', uploadPage.includes("'/quotes'"));

// ── 6. Daily Brief ───────────────────────────────────────────
const brief = read('src/app/brief/page.tsx');
check('브리핑에서 내부 원가·전환 메모 삭제', !brief.includes('만능 컷 25%를 강제') && !brief.includes('구독 유지의 핵심 장치'));
check('브리핑에서 미구현 07:30 도착 표기 삭제', !brief.includes('07:30 자동 도착'));
check('컷이 없을 때 추천 대사를 보여줌', brief.includes('dailyQuotePicks') && brief.includes('오늘 쓸 대사'));
check('컷이 없어도 빈 카드 8개를 그리지 않음', brief.includes('hasCuts ?'));

// ── 7. 보안 기본값 ──────────────────────────────────────────
const adminAccess = read('src/lib/admin-access.ts');
check('ADMIN_LOGIN_ANY_IDENTIFIER 기본값 fail-closed', adminAccess.includes("process.env.ADMIN_LOGIN_ANY_IDENTIFIER === '1'"));
check('원가 보호 플래그 기본값 유지(관리자 전용)', adminAccess.includes("process.env.GENERATION_ADMIN_ONLY ?? '1'"));
check('env 예시도 fail-closed 기본값', read('.env.example').includes('ADMIN_LOGIN_ANY_IDENTIFIER=0'));

// ── 8. 결제 미연동 시 충전 버튼 · 잘못된 JSON 400 ────────────
check('요금제 화면이 결제 가능 여부로 크레딧 충전 버튼을 막음', pricingPage.includes('paymentsUnavailable()') && pricingPage.includes('충전 준비 중'));
const apiLib = read('src/lib/api.ts');
check('깨진 JSON 본문은 400 INVALID_JSON 으로 응답', apiLib.includes('e instanceof SyntaxError') && apiLib.includes("fail('INVALID_JSON'") && /INVALID_JSON'[\s\S]{0,80}?400\)/.test(apiLib));
check('검증 오류(ZodError) 응답은 그대로 유지', apiLib.includes("fail('INVALID_INPUT'") && apiLib.includes('422'));

// ── 9. 첫 화면(홈) · 하단 고정 내비게이션 ─────────────────────
const layout = read('src/app/layout.tsx');
check('하단 고정 바가 루트 레이아웃에 붙어 있음', layout.includes("from '@/components/BottomNav'") && layout.includes('<BottomNav'));
check('본문이 하단 바 높이 + 안전 영역만큼 여백을 가짐', layout.includes('pb-[calc(4.25rem_+_env(safe-area-inset-bottom))]'));
check('뷰포트가 안전 영역을 덮음(viewportFit cover)', layout.includes("viewportFit: 'cover'"));
const bottomNav = read('src/components/BottomNav.tsx');
check('하단 바가 안전 영역 여백을 사용', bottomNav.includes('env(safe-area-inset-bottom)'));
check('하단 바는 데스크톱에서 숨기고 모바일에서만 고정', bottomNav.includes('fixed') && bottomNav.includes('lg:hidden'));
check('하단 바 현재 위치 표시(aria-current)', bottomNav.includes("aria-current={active ? 'page' : undefined}"));
const navSource = read('src/lib/nav.ts');
const bottomKeys = navSource.match(/BOTTOM_NAV_KEYS: NavKey\[\] = \[([^\]]*)\]/)?.[1] ?? '';
check('하단 바 주요 위치는 5곳 이내', (bottomKeys.match(/'[a-z]+'/g) ?? []).length === 5);
check('하단 바 첫 항목이 홈(/)', /home: \{ key: 'home', href: '\/'/.test(navSource));
const headerSource = read('src/components/SiteHeader.tsx');
check('상단 탭과 하단 바가 같은 목록을 공유', headerSource.includes('SiteNav') && read('src/components/SiteNav.tsx').includes('headerNav'));
const manifestSource = JSON.parse(read('public/manifest.webmanifest'));
check('매니페스트 첫 화면(start_url)이 홈(/)', manifestSource.start_url === '/');
check('매니페스트 바로가기에 홈·만들기·내 팩이 있음', (manifestSource.shortcuts ?? []).map((s) => s.url).join(',').includes('/studio/upload'));
check('로그인한 사람의 로그인 화면은 홈으로 리다이렉트', read('src/app/login/page.tsx').includes('redirect('));

console.log(`\n출시 준비 정적 점검: ${passed}개 통과`);
console.log('Note: 브라우저·실기기·스토어 콘솔 동작은 이 점검 범위가 아닙니다.');
