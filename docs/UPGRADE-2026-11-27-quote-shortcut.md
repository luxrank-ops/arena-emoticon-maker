# 대사 스튜디오 NEW 배너 바로가기 수정

담당: Lead Developer · 2026-11-27

## 원인과 동작

- `/quotes` 상단 NEW 배너는 `/quotes?pack=drip-twist`만 열었다. 드립 팩이 이미 기본 선택이라 화면에 변화가 없고, 대사 영역으로 이동하는 앵커도 없었다.
- 팩·세부 테마 선택은 첫 렌더의 `initialPackId` / `initialGroupId`로만 초기화되는 로컬 상태였다. 같은 페이지 내 URL 이동과 선택 상태가 따로 관리됐다.
- NEW 배너는 `?pack=drip-twist#quote-studio`로 연결한다. 드립 팩의 전체 66컷을 선택하고 편집·미리보기 영역으로 이동한다.
- `QuotePackShortcut`은 일반 클릭/Enter의 `onNavigate`에서 History API·스크롤·포커스를 직접 처리한다. 동일한 URL을 재클릭해도 이동하며, Ctrl+클릭·새 탭·JavaScript 비활성 상태에서는 일반 링크 동작을 유지한다.
- 팩·세부 테마는 URL을 기준으로 파생한다. 화면에서 고른 값도 Next.js가 지원하는 History API로 URL에 반영하여 재클릭·뒤로/앞으로 가기·공유·새로고침 시 일관되게 유지한다. 선택 변경만으로 서버 요청이나 크레딧 차감은 발생하지 않는다.
- 잘못된 팩은 첫 팩, 잘못된/다른 팩의 세부 테마는 전체 컷으로 처리한다. 유료 팩의 공개 범위·구매 권한은 기존 서버 응답을 그대로 사용한다.

## 접근성·프리뷰

- 링크의 최소 터치 높이는 44px이며 hover·키보드 focus 표시를 제공한다.
- 이동 대상에는 제목 연결과 스크롤 여백을 두어 고정 헤더에 가리지 않게 한다.
- `/en/quotes`에서도 언어 경로를 유지한다.
- 개발 서버만 Arena 프리뷰 호스트를 허용하고 iframe 표시를 허용한다. 운영의 `X-Frame-Options: SAMEORIGIN`은 유지한다.

## 검증

- `scripts/test-drip-themes.ts`: URL 선택·필터·폴백·반복 선택 및 배너 앵커 회귀 검사 **47개 통과**.
- Playwright + Chromium, 모바일 390px/데스크톱 1440px: 기본 화면, 다른 팩 선택 후 배너, 세부 테마 선택 후 배너, 반복 클릭, Enter·포커스, 뒤로/앞으로, 영문 경로·새로고침 **18개 통과**.
- 추가 브라우저 검사 **3개 통과**: 서버 왕복 없는 선택·배너 이동, Ctrl+클릭 새 탭, JavaScript 비활성 시 일반 링크 폴백.
- `npm run typecheck` · `npm test` · `npm run test:quotes` · `npm run build` 통과.
- `npm run lint`: 오류 0, 수정 범위 밖의 기존 경고 6개.
- 운영 설정의 `X-Frame-Options: SAMEORIGIN` 유지 확인.

## 원가·정책 영향

- 선택·이동은 클라이언트 처리로 추가 AI/API 실행 원가 0원.
- 가격·결제·개인정보·저작권·워터마크 정책 변경 없음.
