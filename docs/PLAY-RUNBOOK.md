# 구글 인앱 실행 — 처음부터 끝까지 실행 순서

> "구글 인 앱으로 실행" = **① 플레이 스토어에 앱 등록(무료 다운로드) → ② 앱 안에서 인앱결제가 실제로 돌아가게 만들기**.
> 이 문서는 **명령·콘솔 화면 단위**로 순서를 적는다. 코드가 이미 되어 있는 부분과 사람 손이 필요한 부분을 구분한다.
> 관련: [PLAY-STORE.md](./PLAY-STORE.md) (등록·정책) · [PLAY-BILLING.md](./PLAY-BILLING.md) (연동 구조) · `twa/README.md` (서명·AAB)

---

## 0. 한눈에 보는 순서

| 단계 | 하는 일 | 걸리는 시간 | 비용 |
| --- | --- | --- | --- |
| 1 | 개발자 계정 + 판매자 프로필 | 1~3일(신원 인증) | $25 1회 |
| 2 | 웹 배포(HTTPS 도메인 살아 있게) | 이미 됨 | 0 |
| 3 | 서명 키 준비 | 1분 | 0 |
| 4 | AAB 빌드 (JDK 17 + Android SDK 필요) | 30~60분(최초 설치 포함) | 0 |
| 5 | Play Console 앱 생성 + AAB 업로드 | 30분 | 0 |
| 6 | 앱 서명 지문 → Asset Links 등록·배포 | 10분 | 0 |
| 7 | 상품 등록(구독·크레딧) + 서비스 계정(API 액세스) | 30분 | 0 |
| 8 | Worker Secret 4개 등록 → 재배포 | 10분 | 0 |
| 9 | `play-preflight` 통과 확인 | 1분 | 0 |
| 10 | 내부 테스트 설치 → 실기기 결제 테스트 | 30분 | 테스트 결제는 무료(카드 등록 필요) |
| 11 | `PLAY_BILLING_ENABLED=1` → 버튼 노출 | 1분 | 0 |
| 12 | 비공개 테스트(12명 × 14일) → 프로덕션 출시 | 2~3주 대기 | 0 |

---

## 1. 계정 (사람만 가능)

1. https://play.google.com/console → 가입. **$25 1회 결제**(카드).
2. **신원 인증**: 개인은 신분증, 사업자는 사업자등록증. 사업자로 등록하면 나중에 정산·세금이 깔끔하다.
   - 사업자등록이 없다면 → `docs/FREE-PAYMENT-PLAYBOOK.md` §5 참고(교환권으로 먼저 매출을 내고, 사업자등록 후 전환).
3. **설정 > 결제 프로필(판매자 프로필)** 생성: 정산 계좌, 세금 정보, 주소. 이게 없으면 인앱 상품 등록이 막힌다.
4. **신규 개인 개발자 계정**은 프로덕션 전에 **비공개 테스트 12명 × 연속 14일** 요건이 있다(콘솔에 표시되는 조건을 확인).

---

## 2. 웹이 먼저 살아 있어야 한다 (TWA는 웹을 감싼다)

```bash
# 필수 환경변수 (Cloudflare Worker 변수/Secret 기준)
NEXT_PUBLIC_SITE_URL=https://emotihak.com      # TWA host 와 같아야 함
STORE_BACKEND=auto                             # Firestore 또는 KV 필수 (파일 저장소는 자격이 유실됨)
CRON_SECRET=<임의의 긴 문자열>                  # 환불 자격 회수 크론 보호
ADMIN_PASSCODE=<운영자 코드>                    # 구매 대사 콘솔
```

확인:

```bash
curl -sI https://emotihak.com | head -1          # 200
curl -s  https://emotihak.com/.well-known/assetlinks.json | head -20
```

> `assetlinks.json` 이 404거나 내용이 비면 **앱이 주소창 있는 크롬 탭으로 열린다**(= TWA 실패).

---

## 3. 서명 키 준비 (로컬 1분)

```bash
npm i                                   # 최초 1회
node scripts/prepare-play-signing.mjs   # 없으면 RSA 4096 업로드 키 생성 + assetlinks 갱신
```

- 생성물: `twa/private/android-keystore.p12`, `-password.txt`, `-cert.pem` → **Git 제외**(이미 `.gitignore`).
- 비밀번호는 **반드시 오프라인 백업**(비밀번호 관리자 + 종이). 잃으면 앱 업데이트가 불가능하다.
- 기존 키가 있으면 명령 없이 재사용된다. **절대 `--force` 를 습관적으로 쓰지 말 것**(Console 업로드 키 재설정 절차 필요).

---

## 4. AAB 빌드 (JDK 17 + Android SDK 필요)

```bash
# macOS
brew install --cask temurin@17
brew install --cask android-commandlinetools

# 환경변수
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
sdkmanager --licenses           # 전부 y

npm i -g @bubblewrap/cli
cd twa
bubblewrap update               # twa-manifest.json → Android 프로젝트 반영
bubblewrap build --aab          # app-release-bundle.aab 생성 (비밀번호 입력)
```

Ubuntu라면: `sudo apt install -y openjdk-17-jdk`, Android SDK는 `cmdline-tools` zip을 `$HOME/Android/sdk`에 풀고 `sdkmanager "platforms;android-36" "build-tools;36.0.0" "platform-tools"`.

**주의**

- 매니페스트에 `features.playBilling.enabled`, `alphaDependencies.enabled` 가 켜져 있어야 **Digital Goods API** 가 동작한다(현재 켜져 있음).
- `bubblewrap update` 는 생성된 Android 프로젝트를 덮어쓴다 → 직접 고친 파일은 `twa/app/` 에 커밋하지 말고 매니페스트로 관리.
- 앱 버전 올리기: `twa-manifest.json` 의 `appVersionCode` 를 증가 → `bubblewrap update && build`.

---

## 5. Play Console 앱 생성 + 업로드

1. **앱 만들기**: 이름 `이모티학`, 기본 언어 한국어, **앱**, **무료**, 선언 체크.
2. **앱 콘텐츠** 항목을 모두 채운다(비어 있으면 출시 불가):
   - 개인정보처리방침 `https://emotihak.com/privacy`
   - **계정 삭제 URL** `https://emotihak.com/account-deletion`
   - 데이터 안전: 사진이 **Gemini(Google)로 전송**되어 AI 생성에 쓰인다는 사실, 얼굴 원본 24시간 파기, 계정/생성물/신고/사용량 기록.
   - 광고 여부(현재 없음), 콘텐츠 등급 설문, 생성형 AI 사용 선언, 대상 연령.
3. **테스트 > 내부 테스트 > 새 버전 만들기** → `app-release-bundle.aab` 업로드 → 출시.
4. 테스터 이메일 등록 → 폰에서 초대 링크로 설치.

**첫 업로드 직후 할 일 (중요)**

- **앱 무결성 > 앱 서명**에서 **앱 서명 인증서 SHA-256** 복사(업로드 키와 다르다).
- 로컬에 배포:

```bash
node scripts/update-assetlinks.mjs "AA:BB:CC:..."   # 기존 지문은 지우지 말고 추가
git commit -am "chore(twa): add Play app signing fingerprint" && git push
# 배포 후 확인
curl -s https://emotihak.com/.well-known/assetlinks.json
```

- 확인 후 앱 재실행 → **주소창 없는 전체화면**이면 TWA 연결 성공.

---

## 6. 상품 등록 (수익 창출)

**수익 창출 > 인앱 상품**

| 항목 | 값 | 비고 |
| --- | --- | --- |
| 상품 ID | `emotihak_credits_20` | **코드에 있는 값과 정확히 같아야** 한다(`src/lib/play-products.ts`) |
| 유형 | 소비성(consumable) | 살 때마다 재구매 가능 → 서버가 `:consume` 호출 |
| 이름/설명 | 크레딧 20 | 1컷 = 1크레딧 |
| 가격 | 4,900원(예시) | 콘솔에서 정한 가격을 앱이 그대로 표시 |

**수익 창출 > 구독**

| 항목 | 값 |
| --- | --- |
| 상품 ID | `emotihak_plus_monthly` |
| 요금제 | 월간, 무료 체험 없음(현재 코드 기준) |
| 혜택 | 웹의 Creator Pro 와 동일하게 안내 |

> 상품 ID를 바꾸려면 콘솔 등록 + `PLAY_PRODUCT_IDS` 환경변수 + `src/lib/play-products.ts`(소비성 판정) 3곳을 함께 바꾼다.

**설정 > API 액세스 (구매 검증용)**

1. Google Cloud Console → 새 서비스 계정 생성 → **키(JSON)** 발급.
2. Play Console > 사용자 및 권한 → 서비스 계정 이메일 초대 → 권한: **앱 정보 보기 + 재무 데이터 보기**.
3. JSON 파일 내용을 **Worker Secret** `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` 에 그대로 넣는다(개행 유지, `\n` 이스케이프도 허용).

---

## 7. 서버 설정 + 재배포

```bash
# Cloudflare Worker 기준 (대시보드 Settings > Variables and Secrets)
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = {"type":"service_account", ...}   # Secret
PLAY_PACKAGE_NAME                = com.emotihak.app
PLAY_BILLING_ENABLED             = 1     # 9단계 이후에 켠다
CRON_SECRET                      = <긴 임의 문자열>
STORE_BACKEND                    = auto  # Firestore/KV 필수
```

재검증 크론 등록(환불·만료 자격 회수) — 매일 1회면 충분:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://emotihak.com/api/cron/play-entitlements
```

운영에서 크론이 403이면 `CRON_SECRET` 미설정이다(코드가 fail-closed).

---

## 8. 자동 점검 (코드가 맞는지 즉시 확인)

```bash
node scripts/play-preflight.mjs          # 운영 기준. 값은 출력하지 않음
node scripts/play-preflight.mjs --local   # 로컬 개발 기준
```

출력 예: `✓ 패키지 이름 일치` … `✗ 구매 검증 자격증명이 없습니다` → **✗가 0개**가 될 때까지 고친다.

회귀 테스트(구매 검증·acknowledge·**소비·크레딧 지급**·환불 회수):

```bash
npm run test:play:billing    # 58 checks
npm run test:play:static     # 서명·assetlinks·매니페스트
npm run test:redeem          # PG 없이 지급하는 교환권 경로
```

---

## 9. 실기기 결제 테스트 (여기서 대부분의 문제가 드러난다)

1. 내부 테스트 링크로 설치 → 앱 실행.
2. **로그인**(구매 자격은 계정에 붙는다. 게스트로 사면 복원이 어렵다).
3. 요금제 화면 → **크레딧 팩** 버튼 → 구글 결제 시트가 뜨는지.
   - 시트가 안 뜨면: `PLAY_BILLING_ENABLED=1` 인지, 상품이 **활성** 상태인지, 내부 테스트 트랙 계정인지 확인.
4. 결제 완료 → **크레딧 +20** 반영 확인(`/billing`).
5. **같은 상품을 다시 구매** → 다시 결제 시트가 떠야 한다(소비성 상품이 consume 되었는지 확인).
6. Play Console > 주문 관리에서 **환불** → 하루 안에 `/billing` 에서 자격이 회수되는지(크론 실행 후).
7. `GET /api/play/purchases/verify` 로 내 자격 목록 확인(구매 토큰은 노출되지 않는다).

체크리스트:

- [ ] 앱이 크롬 탭이 아니라 독립 앱(전체화면)
- [ ] 결제 시트 표시·완료
- [ ] 크레딧 지급 1회(재검증해도 중복 없음)
- [ ] 재구매 가능(consume)
- [ ] 환불 후 자격 회수
- [ ] 앱 안에서 **웹 카드결제(토스) 유도 없음** — 스토어 정책 위반 방지
- [ ] 비행기 모드에서 오프라인 페이지 표시

---

## 10. 출시 직전 최종 확인

- [ ] `node scripts/play-preflight.mjs` ✗ 0개
- [ ] 스토어 등록정보: 제목·짧은 설명·전체 설명·512 아이콘·1024×500 피처 그래픽·**스크린샷 2장 이상**
- [ ] 개인정보처리방침·계정 삭제 URL 이 실제로 열림
- [ ] 통신판매업 신고 정보(사업자등록 후) — 스토어 목록과 앱 안 요금제에 동일하게 표기
- [ ] 환불 정책 링크(`/refund`) 동작
- [ ] 비공개 테스트 12명 × 14일 완료(해당 계정)
- [ ] 프로덕션 트랙 출시 → 심사(보통 1~7일)

---

## 11. 자주 막히는 곳

| 증상 | 원인 | 해결 |
| --- | --- | --- |
| 앱이 주소창 있는 크롬으로 열림 | assetlinks 불일치 · 지문 누락 · 패키지명 불일치 | 앱 서명 SHA-256 추가 → 배포 → 앱 재설치 |
| 결제 버튼이 "준비 중" | 상품 미등록/비활성 · `PLAY_BILLING_ENABLED=0` | 콘솔에서 상품 활성 + 변수 1 |
| 결제는 됐는데 크레딧 0 | 서비스 계정 미설정(503) · 저장소가 파일 | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` + Firestore/KV |
| 같은 크레딧을 또 살 수 없음 | consume 누락 | 서버가 `:consume` 호출(이미 구현) + `PLAY_CONSUMER`… 환경 확인 |
| 환불했는데 계속 프리미엄 | 재검증 크론 미등록 | `CRON_SECRET` + 매일 크론 호출 |
| 빌드 실패 `Unsupported class file major` | JDK 버전 | `JAVA_HOME` 을 JDK 17 로 |
| `bubblewrap` 가 서명 오류 | 키 경로·비밀번호 불일치 | `twa/private/` 파일명·비밀번호 확인, `bubblewrap update` 재실행 |

---

## 12. 지금 이 저장소에서 "자동으로 되는 것 / 사람이 해야 하는 것"

| 자동(코드) | 사람(콘솔·기기) |
| --- | --- |
| 구매 토큰 서버 검증 · acknowledge | 개발자 계정·$25·판매자 프로필 |
| 크레딧 원장 지급(1회, 멱등) | 상품 등록·가격 결정 |
| 소비성 상품 consume | 서비스 계정 초대·JSON Secret 등록 |
| 환불·만료 자격 회수(크론) | AAB 빌드·업로드·앱 서명 지문 |
| 앱 안 웹결제 차단(IAP 정책) | 실기기 결제·환불 테스트 |
| preflight·회귀 테스트 3종 | 12명 × 14일 비공개 테스트 |
