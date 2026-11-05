# 구글 플레이스토어 등록 준비 — 이모티학

> 대상: `emotihak.com` (Next.js 웹앱, Cloudflare Workers 배포)
> 작성일: 2026-11-05

## 1. 현황과 방식 선택

이 앱은 **웹앱**입니다. 플레이스토어에 올리려면 둘 중 하나:

| 방식 | 설명 | 권장 |
|---|---|---|
| **TWA (Trusted Web Activity)** | Bubblewrap이 웹앱을 안드로이드 앱으로 래핑. 코드베이스 1개 유지, 웹 업데이트가 앱에 즉시 반영 | ✅ **권장** |
| 네이티브/하이브리드 (Capacitor 등) | 별도 Android 프로젝트 유지·빌드 | 초기 비용 큼 |

이 문서는 **TWA 방식** 기준입니다.

### ⚠️ 먼저 확인할 정책 리스크 (중요)

앱 내 **크레딧(디지털 상품) 판매가 토스 웹 결제**로 이루어집니다. 구글 정책상
앱에서 디지털 상품 판매는 **Google Play Billing** 사용이 원칙이며, TWA에서 웹 결제로
디지털 상품을 파는 구조는 심사 반려 가능성이 있습니다.

- **최소 리스크 출시안(권장)**: TWA에서는 크레딧 결제를 제외하고, 충전 UI가
  "웹에서 열기"(브라우저 딥링크 → `https://emotihak.com/pricing`)로 연결되게 합니다.
  ✅ **구현 완료** — TWA 감지(`src/lib/twa.ts`, UA `TWA/` 토큰)로
  ① 클라이언트: `PayPanel` 이 TWA+크레딧이면 결제 대신 웹 딥링크 안내로 대체
  ② 서버: `POST /api/checkout` 이 TWA 요청+크레딧 SKU면 409 `IAP_POLICY_RESTRICTED` 로 차단
- 대안(향후): TWA에 Play Billing 연동 (작업량 큼)
- 참고: 실물 굿즈(물류) 결제는 디지털 상품이 아니므로 TWA 내 웹 결제 유지(영향 없음).

출시 전 [Google Play 정책 — 인앱 결제](https://play.google.com/console/about/policies) 최신 문서를 반드시 확인하세요.

## 2. 이 저장소에 이미 준비된 것 (이번 PR)

| 항목 | 파일 | 상태 |
|---|---|---|
| PWA 웹 매니페스트 | `public/manifest.webmanifest` | ✅ (앱명 이모티학, standalone, 아이콘 3종) |
| 앱 아이콘 512×512 | `public/icons/icon-512.png` | ✅ (플레이스토어 앱 아이콘 규격) |
| 아이콘 192×192 | `public/icons/icon-192.png` | ✅ |
| 마스크어블 아이콘 | `public/icons/icon-maskable-512.png` | ✅ |
| 브라우저/홈스크린 아이콘 | `src/app/icon.png`, `src/app/apple-icon.png` | ✅ |
| 매니페스트 연결 | `src/app/layout.tsx` (`manifest`, `themeColor`, `appleWebApp`) | ✅ |
| Digital Asset Links 템플릿 | `public/.well-known/assetlinks.json` | ⚠️ **패키지명·지문은 플레이 후 실제 값으로 교체** |
| 스토어 피처 그래픽(1024×500) | `public/marketing/feature-graphic-1024x500.png` | ⚠️ 플레이스홀더 — 브랜드 명칭 텍스트를 디자인 도구로 추가 권장 |

## 3. 진행 순서 (Checklist)

### [ ] 3-1. Google Play 개발자 계정 (사용자 직접)
1. <https://play.google.com/console> — Google 계정 로그인
2. **조직 개발자 계정** 가입 (앱 내 유료 판매가 있으므로 개인 계정은 불가)
   - 사업자 정보: 아모가 · 대표 이춘학 · 사업자등록번호 212-77-00245
   - 사업자등록증 등 인증 서류 제출
3. **개발자 등록비 $25** (일회성) 납부

### [ ] 3-2. TWA 프로젝트 생성 (로컬)
```bash
npm i -g @bubblewrap/cli   # 또는 npx @bubblewrap/cli

bubblewrap init \
  --manifest https://emotihak.com/manifest.webmanifest \
  --package com.emotihak.app
cd twa-project

# 서명 키 생성 (업로드 키 + 백업 키)
bubblewrap keys create
```
- 패키지명: `com.emotihak.app` (원한다면 `com.emotihak.web` 등 — 한 번 정하면 변경 불가하므로 `assetlinks.json`·Play 콘솔과 일치시켜야 함)

### [ ] 3-3. Digital Asset Links 채우고 배포 (도메인 검증)
1. `keytool -list -v -keystore <업로드키>.keystore` → **SHA-256** 지문 확인
2. `public/.well-known/assetlinks.json` 교체:
   ```json
   "package_name": "com.emotihak.app",
   "sha256_cert_fingerprints": ["<실제-SHA-256-16진수>"]
   ```
3. 커밋 → main 머지 → 클라우드플래어 배포 (자동)
4. 확인: `https://emotihak.com/.well-known/assetlinks.json` 가 200으로 내려오고 값이 정확히 일치하는지
   (`bubblewrap verify` 로 검증 가능)

### [ ] 3-4. TWA 빌드
```bash
bubblewrap build --mode release     # APK
# 플레이스토어는 AAB(App Bundle)가 필요합니다 (버전별 플래그 확인: --aab)
```
- 빌드 전 `bubblewrap verify` 로 매니페스트·도메인 검증을 통과해야 함

### [ ] 3-5. Play 콘솔 앱 생성 (사용자 직접)
1. **앱 만들기**: 이름 `이모티학`, 기본 언어 `한국어`, 앱 종류 `Android 앱`, 가격 `무료`
2. **스토어 목록(한국어 필수)**:
   - 제목: 이모티학 (80자 이내, "이모티학" 단독은 경쟁 앱과 충돌 가능성 — 심사 시 조정 안내될 수 있음)
   - 짧은 설명 / 전체 설명: 아래 **5절** 초안 사용
   - 카테고리: **엔터테인먼트** (또는 유틸리티)
   - 그래픽:
     - 앱 아이콘: `public/icons/icon-512.png` (512×512)
     - 피처 그래픽: `public/marketing/feature-graphic-1024x500.png` (1024×500)
     - 폰 스크린: **최소 2장** (16:9, 960×1280 이상) — 실기기/브라우저에서 촬영 필요
   - 웹사이트: `https://emotihak.com`
   - **개인정보처리방침 URL: `https://emotihak.com/privacy`** (필수 — 이미 존재)
3. **앱 콘텐츠**:
   - 콘텐츠 등급: IARC 자가진단 설문 (13세 이하, 가족 친화)
   - 데이터 안전성 폼: 수집 데이터를 사실대로 기재
     - 얼굴 사진 → **24시간 내 자동 파기**(앱 정책)
     - 사진 외부 전송 없음, 광고용 미사용
     - 분석: PostHog(사용 통계)
   - 앱 무결성: TWA는 Android 14+ TWA 무결성 지원 (Bubblewrap 적용, 문서 참조)
4. **결제**: 인앱 상품(크레딧)을 앱 내에서 결제하려면 Play Billing 등록 필요 —
   1절 정책 리스크 참조 (최소 리스크안은 웹 딥링크로 대체)
5. **테스트**: 내부 테스트 트래킹에 업로드 → 자체 점검 → (선택) 클로즈드 테스트(100명 이내)
6. **본격 출시**

## 4. TWA 유지보수

- 웹 업데이트 → 자동 반영 (앱 재배포 불필요)
- `assetlinks.json` 지문은 **업로드 키** 기준 — 키를 교체하면 반드시 재업로드
- 앱 내 브라우저 딥링크(`https://` URL)는 TWA에서 인앱으로 처리됨

## 5. 스토어 목록 초안 (한국어)

**짧은 설명** (80자 이내):
```
사진 한 장이면 얼굴이 이모티콘이 됩니다. 이모티학 — 3초 만에 완성하는 카톡 이모티콘
```

**전체 설명** (4000자 이내):
```
🎓 사진 한 장이면, 얼굴이 이모티콘이 됩니다 — 이모티학

셀카 한 장만 올리면 이모티학이 나만의 캐릭터로 만들어 드립니다.
표정을 고르고, 대사를 붙이고, 카카오톡에 바로 저장하세요.

[이용 방법]
1. 사진 촬영 → 얼굴 특징 자동 분석
2. 스타일 선택 → 2D 캐릭터·클레이 3D·수채화 등 10가지 스타일
3. 편집 → 대사·표정·소품·배경 커스터마이징
4. 내보내기 → 360×360 규격 PNG, 카톡 바로 저장

[주요 기능]
· 10가지 아트 스타일 (2D 캐릭터 / 클레이 3D / 수채화 / 스케치 / 픽셀아트 등)
· 12가지 감정 표현 세트 (기쁨·빵터짐·킹받음·삐짐·지침 등)
· 채팅 바로 이모티콘: 대화를 붙여넣으면 딱 맞는 표정을 추천
· 매일 아침 브리핑: 오늘의 8컷을 매일 아침 배달
· 카카오 이모티콘 스튜디오 제안 규격 자동 검증 (360×360 · 2MB 이하)

[참고]
· 생성 결과는 AI가 만들었습니다. 이용 전 확인 후 이용해 주세요.
· 상업적 이용은 Studio 플랜 라이선스가 필요합니다.
· 개인정보 처리에 관한 자세한 내용은 개인정보처리방침을 참고해 주세요.
```

## 6. 역할 분담

| 일 | 담당 |
|---|---|
| 매니페스트·아이콘·assetlinks 템플릿·스토어 초안 | ✅ 이번 PR (저) |
| TWA에서 크레딧 결제 차단 + 웹 딥링크 전환 (정책 대응) | ✅ 구현 완료 (TWA UA 감지, UI·API 이중 차단) |
| Play 개발자 계정 가입 · $25 · 사업자 인증 | **사용자** |
| Bubblewrap 실행 · 키 생성 · assetlinks 실제 값 채우기 | 사용자 (지문값 알려주시면 채워드립니다) |
| 스크린샷 2장 촬영 | 사용자 (또는 제가 웹 캡처 스크립트로 대용 제공 가능) |
| Play 콘솔 목록 등록 · 심사 제출 | **사용자** |
