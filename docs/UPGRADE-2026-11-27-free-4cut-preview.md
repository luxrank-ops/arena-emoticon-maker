# 무료 미리보기 4컷 · 계정당 최초 1회 (2026-11-27)

`luxrank-ops/arena-emoticon-maker` (`https://emotihak.com`)

## 왜

1. **원가** — 무료 미리보기가 12컷 전체를 Flash 모델로 그려 팩 1개당 약 **$0.24** 가 나갔다. 실사 짤이 기본값이라 체험 1회 원가가 결제 전환보다 컸다.
2. **정책(사용자 지시)** — 미리보기는 '하루 1팩'이 아니라 **계정당 최초 1회(평생 1팩)**. 같은 계정이 날이 바뀌어 다시 무료 팩을 만들 수 없어야 한다.
3. **동선** — `/pets` 의 시작 버튼이 `format=pet-meme&subject=pet` 을 넘기지 않아 신규 방문자가 반려동물 모드로 바로 들어가지 못했다.

## 무엇이 바뀌나

| 단계 | 무료 미리보기(체험) | 잠금 해제(단건 완성권 결제 후) |
| --- | --- | --- |
| 팩 구성 | 12컷 (`PREVIEW_PACK_SIZE = 12`) | 같은 팩 |
| AI 생성 컷 | **앞 4컷**(`PREVIEW_FREE_CUTS = 4`, 2×2) | **나머지 8컷 + 앞 4컷 고화질 재생성 = 12컷** |
| 컷 이미지 | 5~12번째는 이미지 없이 잠금 타일(「잠금 해제 후 완성」) | 전 컷 생성 |
| 내보내기 | 잠김(공유만) · 워터마크 | 고화질·투명 PNG · 카카오 규격 ZIP |
| 가격 | 0원 | 5,900원 / 반려동물 6,900원 / 2인 케미 7,900원 (변동 없음) |

- 서버(`/api/render`)가 잠금 컷 요청을 **403 `PREVIEW_CUT_LOCKED`** 로 막는다 — 화면을 우회해 12컷을 모두 그려 받는 경로가 없다.
- 잠금 해제 뒤 마무리 렌더(`paidUnlock`)는 **체험 한도·스타일 제한·크레딧 차감에서 제외**한다(유료 단계).
- 컷별 `hiResAt` 로 고화질 마감을 1회만 수행한다(잠금 해제 후 반복 호출로 원가가 새지 않게).

## 상한 (기본값 · Worker 변수)

| 변수 | 기본값 | 의미 |
| --- | --- | --- |
| `TRIAL_FREE_ENABLED` | `1` | 체험 개방 스위치 |
| `TRIAL_PREVIEW_PACKS_PER_USER` | `1` | **계정당 생애 미리보기 팩** (하루 리셋 없음) |
| `TRIAL_PREVIEW_PACKS_PER_IP_DAY` | `2` | IP 1곳 하루 팩 (보조 방어) |
| `TRIAL_CUTS_PER_USER_DAY` | `4` | 사용자 하루 체험 컷(= 무료 4컷) |
| `TRIAL_IMAGES_PER_USER_DAY` | `18` | 사용자 하루 AI 이미지(시안 1 + 4컷 + 재시도 여유) |
| `TRIAL_IMAGES_PER_IP_DAY` / `TRIAL_IMAGES_PER_DAY` / `TRIAL_IMAGES_PER_MONTH` | `24` / `45` / `900` | IP·전체 하루·월 상한 |
| `TRIAL_PREPS_PER_USER_DAY` / `TRIAL_PREPS_PER_IP_DAY` | `4` / `8` | 사진 특징 재확인(AI 비전) |

- 계정 카운터 키는 날짜가 없는 **`pack:life:<userId>`** 이고, 정리(prune) 단계에서도 버리지 않는다.
- 나머지 카운터는 기존처럼 KST 일·월 키이며 지난 창은 소비 시 정리된다.

## 원가

| 항목 | 단가(추정) | 계산 |
| --- | --- | --- |
| 미리보기(Flash) | ≈ $0.02/장 | 시안 1 + 4컷 = 5장 ≈ **$0.10/체험 계정** (기존 12컷 ≈ $0.24 → 약 58% 절감) |
| 잠금 해제 후 마무리 | 유료(5,900원~) | 나머지 8컷 + 앞 4컷 재생성 = 12장 |

- 미리보기 원가는 계정당 1회로 고정되어, 신규 방문자가 늘어도 계정 1개당 상한이 재발하지 않는다(IP·전체 상한 병행).

## 채널 동선

- `ChannelLanding` 이 `format`·`subject` 를 함께 넘긴다: `/pets` → `/studio/upload?format=pet-meme&subject=pet&utm_campaign=pets`, `/couple` → `duo-chemi`, `/team` → `situation`, `/en` 은 같은 경로에 로케일 프리픽스.
- `UploadFlow` 는 URL 의 `format`·`subject` 를 드래프트 복원 뒤에 적용하므로 새로 온 방문자도 해당 모드가 바로 켜진다.
- `/pets` 문구에서 반려동물 완성권 **6,900원**을 일반 팩 5,900원과 섞이지 않게 분리 표기(FAQ 에 차이 설명 추가).

## 검증

- `npm run typecheck` · `npm run lint`(0 errors) · `npm test`(전 시나리오 통과) · `npm run build`.
- `scripts/test-free-trial.ts` — 4컷 상한, 계정당 생애 1팩(날짜 리셋 없음), 잠금 컷 서버 차단, 채널 쿼리.
- `scripts/test-paywall-unlock.ts` — `preview.sampleCuts=4`, 앞 4컷만 생성 대상, 잠금 해제 후 12컷 전체 생성 대상, `hiResAt` 1회 마감.
- 실서버: `/pets` → 반려동물 모드 자동 선택, 무료 4컷 미리보기 팩 화면(4컷 + 잠금 8컷) 확인.
