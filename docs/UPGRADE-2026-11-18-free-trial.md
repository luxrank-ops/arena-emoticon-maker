# 무료 체험(1~2컷) 개방 · 원가 방어 가드 (2026-11-18)

`luxrank-ops/arena-emoticon-maker` (`https://emotihak.com`)

## 왜

유료 등급 정비 기간에 `GENERATION_ADMIN_ONLY=1` 이라 일반 방문자는 AI 이모티콘을 **한 장도** 만들어 볼 수 없었다.
체험 없이 결제를 기대할 수 없으므로 '시안 1장 + 컷 2장' 맛보기를 열되, 컷 1장마다 실제 Gemini 원가가 나가는 만큼
**쿠키 삭제·새 탭으로 우회할 수 없는 상한**을 저장소(Cloudflare KV 스냅샷 CAS)에 강제한다.

## 무엇이 열리나

| 단계 | 일반 방문자(체험) | 관리자 · 서버 검증된 플레이 구매자 |
| --- | --- | --- |
| 사진 확인(로컬) · AI 사진 재확인(Gemini 비전) | 가능 (하루 상한 있음) | 가능 |
| 캐릭터 시안 | **1장**(A) | 3장 |
| 스타일 | 실사 스티커(`photo-sticker`) 제외 6종 | 11종 |
| 체험 컷 | **2컷** (기쁨·웃음) — 팩에 붙지 않는 미리보기 | 전체 12/16/24/32컷 팩 |
| 팩 생성(`/api/packs`) · 단건/배치 생성(`/api/generate*`) | **차단**(`TRIAL_ONLY`) | 가능 |

## 상한 (기본값 · Worker 변수로 조정)

| 변수 | 기본값 | 의미 |
| --- | --- | --- |
| `TRIAL_FREE_ENABLED` | `1` | 체험 개방 스위치. `0` 이면 즉시 닫힌다(코드는 유지) |
| `TRIAL_CUTS_PER_USER_DAY` | `2` | 사용자 1명 하루 체험 컷 |
| `TRIAL_IMAGES_PER_USER_DAY` | `5` | 사용자 1명 하루 AI 이미지(시안·재시도 포함) |
| `TRIAL_IMAGES_PER_IP_DAY` | `6` | IP 1곳 하루 AI 이미지 |
| `TRIAL_IMAGES_PER_DAY` | `15` | **전체** 방문자 하루 AI 이미지 (원가 상한의 핵심) |
| `TRIAL_IMAGES_PER_MONTH` | `300` | **전체** 한 달 AI 이미지 (월 예산 방어) |
| `TRIAL_PREPS_PER_USER_DAY` / `TRIAL_PREPS_PER_IP_DAY` | `4` / `8` | 사진 특징 재확인(AI 비전) 횟수 |

- 카운터 키: `img:user:<id>:<KST일>`, `img:ip:<sha256 16자>:<일>`, `img:all:<일>`, `img:all:<월>`, `cut:user:<id>:<일>`, `prep:*`.
- IP 원문은 저장하지 않는다(해시 16자만). 지난 날짜·월 버킷은 다음 소비 때 정리된다.
- 상한은 **모두 확인한 뒤** 증가시킨다 — 하나라도 넘으면 아무것도 쓰지 않고 429 `TRIAL_LIMIT` 을 돌려준다.

## 원가

| 항목 | 단가(추정) | 비고 |
| --- | --- | --- |
| 시안/컷 1장 (스타일 화풍) | 약 $0.04 | `gemini-3.1-flash-image-preview` |
| 체험 방문자 1명(시안 1 + 컷 2) | 약 **$0.12** (≈170원) | 상위 모델(실사 스티커, 약 $0.13/장)은 체험에서 제외 |
| 전체 하루 상한 소진(15장) | 약 **$0.60** (≈850원) | |
| 전체 월 상한 소진(300장) | 약 **$12** (≈1.7만원) | GCP 월 예산 알림 5만원 안에서 여유 |

## 바뀐 파일

| 파일 | 내용 |
| --- | --- |
| `src/lib/trial-policy.ts` | 화면·API 공용 문구, 체험 제외 스타일, 체험 감정(2컷) — 클라이언트에서도 안전 |
| `src/lib/free-trial.ts` | 상한 조회·소비(`consumeTrialImage`, `consumeTrialPrep`), IP 해시, `TrialLimitError`(429) |
| `src/lib/admin-access.ts` | `aiAccess()` = `full` \| `trial` \| `blocked`, `trialFreeEnabled()`. `canUseAiGeneration` 은 `blocked` 가 아닐 때 true |
| `src/lib/types.ts`, `src/lib/store.ts` | `TrialUsage` 카운터를 DB·KV 샤드(users)에 추가 |
| `src/app/api/render/route.ts` | 체험 컷 대상 `preview` 추가, 체험은 `frame`·실사 스티커·시안 B/C 차단, 생성 직전 카운터 소비 |
| `src/app/api/sheets/route.ts`, `src/lib/packs.ts` | 체험 시안 1장(`createSheet` `variantLimit`) |
| `src/app/api/packs/route.ts`, `src/app/api/generate{,/batch}/route.ts` | 체험 사용자 팩·대량 생성 차단 |
| `src/app/api/face/consistency/route.ts` | 체험 사진 재확인 상한 |
| `src/app/page.tsx`, `src/components/studio/UploadPageContent.tsx`, `src/app/studio/sheet/[id]/page.tsx`, `src/components/studio/SheetPicker.tsx` | 체험 안내·체험 컷 패널(2컷 생성, 남은 수, 요금제 안내) |
| `cloudflare.config.ts` | 위 Worker 변수 등록 |
| `scripts/test-free-trial.ts` | 상한·차단·라우트 배선 55개 점검 (`npm run test:trial`) |

## 되돌리기

- 체험만 닫기: Worker 변수 `TRIAL_FREE_ENABLED=0` (배포 불필요, 다음 요청부터 차단).
- 예산이 빠듯하면 `TRIAL_IMAGES_PER_DAY`·`TRIAL_IMAGES_PER_MONTH` 를 낮춘다.
- `GENERATION_ADMIN_ONLY`(기본 `1`)와 `PLAY_BILLING_ENABLED`(기본 `0`)는 **건드리지 않았다**.

## 남은 일(다음 작업 후보)

- 체험 컷 이미지는 팩에 붙지 않아 KV(`img:<id>`)에 계속 남는다(포화 시 하루 약 3MB). 정기 정리 크론 후보.
- 정식 출시 후에는 체험 상한을 늘리거나 가입자 전용으로 전환하고, `photo-sticker` 체험 허용 여부를 다시 판단.
