# 이모티학 TWA (Trusted Web Activity)

`emotihak.com`을 감싸는 Bubblewrap Android 프로젝트(`com.emotihak.app`). 선택한 가격 모델은 **일회성 유료 다운로드**입니다. 앱에서는 크레딧을 차감하지 않지만 속도 제한과 KST 일일 AI 공정 이용 한도가 적용됩니다.

> **권한 검증 주의:** `TWA/` User-Agent는 클라이언트가 위조할 수 있는 환경 신호이며 Play 구매 증명이 아닙니다. 현재 코드는 크레딧 무차감 혜택에 이 신호를 사용하므로, 실제 유료 출시 전에는 Play 라이선스 검증과 환불 후 접근 회수를 별도로 구현해야 합니다. 공정 이용 한도는 원가 완화 장치이지 구매 검증이 아닙니다.

## 서명 키 — Git에 저장하지 않음

| 위치 | 용도 | Git |
|---|---|---|
| `twa/private/android-keystore.p12` | AAB 업로드 키 | ⛔ 제외 |
| `twa/private/android-keystore-password.txt` | 키 비밀번호 | ⛔ 제외 |
| `twa/private/android-keystore-cert.pem` | 공개 인증서·지문 확인 | ⛔ 제외(공개 지문만 Asset Links에 등록) |

과거 추적됐던 업로드 키는 폐기하고 새 키로 교체했습니다. Git 이력에 남은 이전 키는 사용하지 마세요. 새 개인 키와 비밀번호는 비밀 관리자와 오프라인 백업에 보관하고, 백업의 복원 가능 여부를 확인하세요.

새 키 생성 또는 기존 무시된 키 재사용:

```bash
# 최초 1회. 기존에 교체할 업로드 지문이 있으면 명시한다.
node scripts/prepare-play-signing.mjs --replace-upload "OLD:SHA256:..."

# 이후에는 키를 교체하지 않고 공개 설정만 다시 동기화한다.
node scripts/prepare-play-signing.mjs
```

이 스크립트는 OpenSSL로 RSA 4096 업로드 키를 만들고, 무작위 비밀번호를 `twa/private/`에만 저장하며, `twa-manifest.json`과 Asset Links의 업로드 지문을 갱신합니다. 비밀번호를 출력하거나 AAB를 생성하지 않습니다. `--force`는 기존 업로드 키를 무시된 로컬 회전 폴터에 옮기고 새 키를 만들므로, Play Console의 업로드 키 재설정 절차 없이 실행하면 안 됩니다.

## AAB 빌드 (JDK 17 + Android SDK 필요)

```bash
npm i -g @bubblewrap/cli
cd twa
bubblewrap build --aab
```

- `twa-manifest.json`은 `private/android-keystore.p12`, alias `emotihak`을 가리킵니다.
- 빌드 시 비밀번호를 안전하게 입력합니다. CI나 명령행 인자에 비밀번호를 남기지 마세요.
- target/compile SDK 36, min SDK 24, version 1입니다.
- AAB 생성·서명과 실제 기기 설치는 별도 검증 단계이며, 저장소의 정적 검사만으로 대체할 수 없습니다.

## PWA · 오프라인 · 브랜드 색상

- 웹 매니페스트와 TWA/Gradle 색상은 `#7C4DFF`, `#1A237E`, `#F8F9FA`를 사용한다.
- 프로덕션 웹은 `/sw.js`를 등록하며 `/offline.html`과 정적 자산만 캐시한다. API·인증·공유 결과·사적 페이지는 저장하지 않는다.
- 사진 촬영 전 사전 고지, TWA 히스토리/루트 종료, App Link와 오프라인 동작은 실기기에서 확인한다.
- 텍스트 선택과 핀치 확대는 접근성을 위해 유지한다. 자세한 명세는 `docs/FAILSAFE-SHARING-TWA.md`를 참고한다.

## Digital Asset Links

`public/.well-known/assetlinks.json`에는 새 업로드 인증서 지문이 등록돼 있습니다. 이 파일은 웹에 배포된 후에야 도메인 연결이 갱신됩니다.

Play App Signing을 사용하면 설치된 앱은 업로드 키가 아닌 **Play 앱 서명 인증서**로 서명됩니다. 첫 AAB 업로드 후 Console의 `앱 무결성 → 앱 서명`에서 SHA-256 지문을 확인하고 기존 지문을 지우지 말고 추가하세요.

```bash
node scripts/update-assetlinks.mjs "AA:BB:CC:..."
# 커밋·배포 후 https://emotihak.com/.well-known/assetlinks.json 확인
```

## 템플릿 재생성

```bash
node scripts/generate-twa.mjs
```

`public/manifest.webmanifest`와 로컬 아이콘을 사용하며 JDK 없이 프로젝트 템플릿을 생성합니다. 개인 키가 없으면 중단합니다.
