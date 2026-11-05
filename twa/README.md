# 이모티학 TWA (Trusted Web Activity)

`emotihak.com` 을 감싸는 안드로이드 앱(Bubblewrap TWA) 프로젝트.
**유료 앱** 모델: Play 에서 앱 구매(일회성) → 앱(TWA) 안에서는 모든 기능 무제한
(서버가 TWA UA 로 감지 — `src/middleware.ts` → `x-emotihak-play` 헤더 → `user.play`).

## 서명 키

| 파일 | 용도 | git |
|---|---|---|
| `android-keystore.p12` | **업로드 키** — AAB 빌드 서명 | ✅ 저장소에 보관 (비공개 저장소)|
| `backup-keystore.p12` | **백업 키** — 업로드 키 유실 시 재발급용 | ⛔ **git 제외** — 반드시 본인 저장소(구글 드라이브 등)에 별도 보관 |

- 업로드 키: alias `emotihak` · RSA 4096 · 만료 2051-10 (25년)
- 백업 키: alias `emotihak-backup` · 별도 비밀번호
- 비밀번호는 `keystore-passwords.txt` (git 제외) 또는 이 세션 대화 기록 참고 — **절대 저장소에 커밋 금지**

## AAB 빌드 (사용자 로컬 — JDK 17 + Android SDK 필요)

샌드박스에서는 Android SDK 다운로드(dl.google.com)가 차단되어 빌드 불가 →
본인 머신에서 아래 명령만:

```bash
# 1) bubblewrap 설치 (JDK 17 이 없으면 prompt 로 자동 설치 제안)
npm i -g @bubblewrap/cli

# 2) 이 저장소 twa/ 로 이동해 빌드
cd twa
bubblewrap build --aab

# 산출물: dist/EmotiHak.twa.app-1.aab
```

- `twa-manifest.json` 의 `signingKey` 가 `android-keystore.p12` / alias `emotihak` 을 가리킨다.
  빌드 시 저장소/키 비밀번호를 입력하라고 프롬프트한다.
- 타겟 SDK 36 (최신) · 최소 SDK 24 · Gradle 8.11.1.
- 플레이스토어 **앱 무결성** 요구가 있으면 콘솔 안내에 따라 `twa-manifest.json` 조정 가능.

## Digital Asset Links (도메인 검증)

- `public/.well-known/assetlinks.json` — 업로드 키 SHA-256 지문 **기입 완료** ✅
  (이 파일은 웹에 배포되어야 유효 → main 머지 후 https://emotihak.com/.well-known/assetlinks.json 확인)
- ⚠️ **Play 앱 서명(Play App Signing) 사용 시** — 신규 앱은 자동 가입되며, 설치된 앱의 실제 서명 인증서는
  **Play 서명 키**이다. 첫 AAB 업로드 후 콘솔 `앱 무결성 → 앱 서명` 에서 Play 서명 키의 SHA-256 지문을 확인해
  아래로 assetlinks.json 에 **추가**하고 재배포한다 (두 지문 모두 유효):

```bash
node scripts/update-assetlinks.mjs "AA:BB:CC:..."   # 새 지문을 배열에 추가
```

## 재생성 (템플릿 갱신 등)

```bash
node scripts/generate-twa.mjs   # public/manifest.webmanifest + 로컬 아이콘 기반, JDK 불필요
```
