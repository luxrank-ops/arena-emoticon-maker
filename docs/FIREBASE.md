# Firebase 연동 — Firestore 저장소 어댑터

> 대상: `src/lib/firestore.ts` · `src/lib/gcp-token.ts` · `src/lib/store.ts`
> 최종 확인: 2026-10-31 (KST) · 로컬 Firestore 스텁으로 E2E **60/60 통과**

앱의 서버 데이터(사용자·얼굴 프로필·시트·팩·크레딧 원장·주문·브리핑·이벤트)는
`withDB(fn)` 한 곳을 통과합니다. 이 함수의 백엔드를 **파일 → KV → Firestore** 중에서
고를 수 있게 되어 있고, Firebase 를 붙이는 작업은 **Firestore 백엔드를 추가**하는 것입니다.

```
withDB(fn)
  ├─ STORE_BACKEND=firestore 또는 FIREBASE_* 존재 → Firestore (REST v1, CAS)
  ├─ KV_REST_API_URL·TOKEN 존재            → Upstash/Vercel KV (REST, CAS)
  └─ 그 외                                  → 파일(.data/store.json) / 메모리
```

우선순위: **Firestore > KV > 파일**. `STORE_BACKEND=auto|firestore|kv|file` 로 고정할 수 있습니다.

---

## 1. 동작 방식 (왜 이렇게 만들었나)

| 결정 | 이유 |
| --- | --- |
| **firebase-admin 대신 Firestore REST v1** | gRPC·무거운 의존성 없이 동작. 서버리스 콜드스타트/번들 크기에 유리 (추가 npm 의존성 0) |
| **서비스 계정 JWT(RS256) → OAuth2 토큰, 메모리 캐시** | 콜드스타트당 1회 발급. 만료 60초 전까지 재사용 |
| **gzip 압축 + 해시 기반 청크 문서** | Firestore 문서 1개 상한이 1 MiB. 스냅샷 JSON 을 gzip(5~10배)한 뒤 필요하면 500 KB 단위 청크로 분할 |
| **메타 문서 + `currentDocument.updateTime` 선행조건 = CAS** | 여러 인스턴스가 동시에 써도 한쪽이 다른 쪽을 덮어써 잃어버리지 않음. 청크+메타를 **한 번의 commit** 으로 원자적으로 기록 |
| **청크는 내용 주소(content-addressed) 이름** | 같은 바이트는 같은 문서 → 재시도·동시 쓰기가 안전. 실패한 시도는 메타를 건드리지 않음 |
| **이전 세대 청크는 60초 유예 후 삭제** | 읽는 중인 인스턴스가 붙잡고 있을 수 있음 (읽기 타임아웃 8초 ≪ 유예 60초) |

### 저장 구조

```
emotime/store                      ← 메타 (v, format=gzip, hash, chunks, bytes, updatedAt)
emotime_store_chunks/<hash>-0      ← gzip 바이트의 0번째 조각 (base64)
emotime_store_chunks/<hash>-1      ← ...
```

- 컬렉션/문서 경로는 `FIRESTORE_STORE_PATH`(기본 `emotime/store`),
  `FIRESTORE_CHUNK_COLLECTION`(기본 `emotime_store_chunks`)로 바꿀 수 있습니다.
- 읽기는 체크섬(SHA-256) 검증 → 손상된 값은 **덮어쓰지 않고** 장애로 처리합니다(데이터 보존 우선).

---

## 2. 설정 (10분)

### 2-1. Firebase 프로젝트 + Firestore 생성
1. <https://console.firebase.google.com> → **프로젝트 추가**
2. 좌측 **빌드 → Firestore Database → 데이터베이스 만들기**
   - 모드: **프로덕션 모드** (클라이언트 접근을 쓰지 않으므로 규칙은 전면 차단)
   - 위치: `asia-northeast3` (서울) 권장
3. 프로젝트 설정(⚙️) → **서비스 계정** → **새 비공개 키 생성** → JSON 다운로드

JSON 안의 값 세 개를 그대로 환경변수로 씁니다.

| JSON 키 | 환경변수 |
| --- | --- |
| `project_id` | `FIREBASE_PROJECT_ID` |
| `client_email` | `FIREBASE_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_PRIVATE_KEY` (개행은 `\n` 그대로 넣어도 자동 처리) |

### 2-2. Vercel 에 등록 (프로덕션·프리뷰)

```bash
# 값은 서비스 계정 JSON 에서 복사
vercel env add FIREBASE_PROJECT_ID production
vercel env add FIREBASE_CLIENT_EMAIL production
vercel env add FIREBASE_PRIVATE_KEY production   # 여러 줄 붙여넣기 가능
vercel env add FIREBASE_PROJECT_ID preview
vercel env add FIREBASE_CLIENT_EMAIL preview
vercel env add FIREBASE_PRIVATE_KEY preview

# (선택) 프리뷰가 운영 데이터를 건드리지 않게 저장 위치를 분리
vercel env add FIRESTORE_STORE_PATH preview     # 예: emotime-preview/store
```

등록 후 **재배포**해야 반영됩니다 (`git` push 또는 `vercel --prod`).

> 프리뷰 분리: `FIRESTORE_STORE_PATH=emotime-preview/store`,
> `FIRESTORE_CHUNK_COLLECTION=emotime_preview_chunks` 처럼 프리뷰 전용 경로를 쓰면
> 운영 데이터와 섞이지 않습니다.

### 2-3. 보안 규칙 (클라이언트 접근 전면 차단)

앱은 **서버(서비스 계정)에서만** Firestore 를 읽고 씁니다. 클라이언트 SDK 를 쓰지 않으므로
아래처럼 막아 두는 것이 안전합니다.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;   // 서버(Admin/서비스 계정)만 접근
    }
  }
}
```

### 2-4. 로컬/CI (에뮬레이터 또는 스텁)

```bash
# 이 저장소에 포함된 경량 스텁 (Firestore REST 부분집합 + 1MiB 문서 상한 강제)
node scripts/firestore-stub.mjs 4600

FIRESTORE_EMULATOR_HOST=127.0.0.1:4600 FIREBASE_PROJECT_ID=emotime-demo \
STORE_BACKEND=firestore npm start
```

인증(JWT 발급) 경로까지 로컬에서 태우려면:

```bash
openssl genrsa -out /tmp/fb-key.pem 2048
node scripts/firestore-stub.mjs 4600 --auth &

FIREBASE_PROJECT_ID=emotime-demo \
FIREBASE_CLIENT_EMAIL=stub@emotime-demo.iam.gserviceaccount.com \
FIREBASE_PRIVATE_KEY="$(cat /tmp/fb-key.pem)" \
FIREBASE_TOKEN_URL=http://127.0.0.1:4600/token \
FIRESTORE_EMULATOR_HOST=127.0.0.1:4600 \
npm start
```

---

## 3. 확인 방법

```bash
curl -s https://<도메인>/api/health | jq .store
```

```json
{
  "dir": "firestore:emotime/store",
  "backend": "firestore",
  "mode": "remote",
  "lastError": null,
  "fallbackWrites": 0,
  "importedFrom": null
}
```

| 필드 | 의미 |
| --- | --- |
| `backend` | `firestore` / `kv` / `file` — 실제로 쓰는 백엔드 |
| `mode` | `remote`(정상) · `memory`(장애로 로컬 폴백 중) |
| `lastError` | 마지막 저장소 오류 메시지 |
| `fallbackWrites` | **원격 장애로 로컬에만 기록된 건수** — 0 이 아니면 유실 위험 신호 |
| `importedFrom` | `kv` 이면 최초 1회 KV 스냅샷을 Firestore 로 승계했다는 뜻 |

---

## 4. 운영 동작

- **장애 폴백**: Firestore 통신 실패/체크섬 불일치 → 15초간 파일/메모리로 서비스(페이지는 계속 뜸) → 자동 재시도·복구.
- **동시 쓰기**: CAS 충돌 시 지터 백오프로 최대 25회 재시도. 그래도 실패하면 **503 + `Retry-After: 2`**
  (`STORE_BUSY`)를 돌려줍니다. 성공한 척 하고 저장을 잃지 않습니다.
- **KV → Firestore 승계**: Firestore 가 비어 있고 KV 자격증명이 남아 있으면, 첫 요청에서 KV 스냅샷을
  1회 복사합니다(`importedFrom: "kv"`). 이후에는 KV 를 읽지 않습니다.
- **되돌리기**: `STORE_BACKEND=kv` 로 배포하면 즉시 KV 로 돌아갑니다(KV 데이터는 그대로 남아 있음).

---

## 5. 비용·한도 메모

- 쓰기 1회 = `청크 수 + 1` 문서 쓰기 (스냅샷이 작으면 1~4개). 읽기 1회 = `청크 수 + 1` 문서 읽기.
- 무료 티어(Spark): 일 20K 쓰기 / 50K 읽기 / 저장 1 GiB.
- 청크는 해시 이름이라 값이 바뀌면 새 문서가 생기고, 이전 세대는 60초 뒤 삭제됩니다.
- 스냅샷이 계속 커지면(이벤트 로그 등) 청크 수가 늘어납니다. 대규모 전에는
  엔티티별 컬렉션(users/packs/orders …)으로 정규화하는 것이 권장됩니다 (`docs/ARCHITECTURE.md` §3).

## 6. 이번 범위가 아닌 것

- **Firebase Auth**: 현재 세션은 `emotime_sid` 쿠키 + 서버 저장소 기반입니다. Firebase Auth 도입은
  로그인 UX·정책(개인정보 처리방침) 변경을 동반하므로 별도 작업으로 분리했습니다.
- **Firebase Storage**: 렌더 결과물은 브라우저에서 생성(PNG/GIF/ZIP)되어 서버에 저장하지 않습니다.
- **Hosting / Functions**: 배포는 Vercel 을 유지합니다.
