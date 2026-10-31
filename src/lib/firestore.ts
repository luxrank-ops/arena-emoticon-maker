import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { getAccessToken } from '@/lib/gcp-token';

// ─────────────────────────────────────────────────────────────
// Firebase Firestore (Native 모드) 원격 저장소 어댑터
//
// 왜 REST 인가?
//   · firebase-admin 은 gRPC/무거운 의존성을 끌고 온다. 서버리스 콜드스타트·번들 크기에
//     불리하므로 Firestore REST v1 + 서비스 계정 JWT 만 쓴다 (추가 의존성 0).
//
// 왜 압축 + 청크인가?
//   · Firestore 문서 1개 상한은 1 MiB. 앱 상태(JSON)는 이벤트 로그까지 포함해 커질 수 있다.
//   · 먼저 gzip 으로 압축(JSON 대비 5~10배)하고, 그래도 남으면 SHA-256 해시로 이름 붙인
//     **불변 청크 문서**(`emotime_store_chunks/<hash>-<i>`)에 base64 로 나눠 담는다.
//   · 메타 문서(`emotime/store`)가 청크 목록을 가리키고, 성공한 뒤 이전 해시의 청크는
//     best-effort 로 정리한다(고아 문서 누적 방지).
//
// 왜 CAS(compare-and-set) 인가?
//   · 읽은 메타의 updateTime 을 precondition 으로 걸고, 청크 + 메타를 한 번의 commit 으로
//     원자적으로 쓴다. 그 사이 다른 인스턴스가 먼저 썼다면 FAILED_PRECONDITION 이 떨어지고
//     store 쪽이 최신본으로 재시도한다.
// ─────────────────────────────────────────────────────────────

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
const PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || '';
/** 표준 Firebase 에뮬레이터 변수 (host:port 또는 URL) — 인증 없이 로컬 에뮬레이터/스텁 사용 */
const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST || '';
/** 토큰 엔드포인트 재정의 (에뮬레이터에 인증까지 붙여 검증할 때만 사용) */
const TOKEN_URL = process.env.FIREBASE_TOKEN_URL || '';

const STORE_PATH = process.env.FIRESTORE_STORE_PATH || 'emotime/store';
const CHUNK_COLLECTION = process.env.FIRESTORE_CHUNK_COLLECTION || 'emotime_store_chunks';
/** 한 문서에 넣는 압축 바이트 (base64 팽창 33% + 필드 오버헤드 고려 → 1 MiB 안전) */
const CHUNK_BYTES = clamp(Number(process.env.FIRESTORE_CHUNK_BYTES) || 500_000, 1024, 700_000);
/** commit 1회 최대 쓰기 수 */
const MAX_WRITES = 450;
/** commit 요청 본문 상한(10MiB) 대비 안전선 */
const MAX_TOTAL_BYTES = 7_000_000;
const TIMEOUT_MS = 8000;
/** 이전 스냅샷 청크 삭제 유예 (진행 중인 읽기를 깨지 않게) */
const GC_GRACE_MS = Number(process.env.FIRESTORE_GC_GRACE_MS) || 60_000;

function clamp(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : lo;
}

export function hasFirestore(): boolean {
  if (!PROJECT_ID) return false;
  if (EMULATOR) return true; // 로컬 에뮬레이터: 크레덴셜 불필요
  return !!(CLIENT_EMAIL && PRIVATE_KEY);
}

function baseUrl(): string {
  if (!EMULATOR) return 'https://firestore.googleapis.com';
  return /^https?:\/\//.test(EMULATOR) ? EMULATOR.replace(/\/$/, '') : `http://${EMULATOR}`;
}

function docName(path: string): string {
  return `projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
}

function root(): string {
  return `${baseUrl()}/v1/projects/${encodeURIComponent(PROJECT_ID)}/databases/(default)/documents`;
}

export function storeLabel(): string {
  return `firestore:${STORE_PATH}`;
}

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { timestampValue: string };

interface FsDoc {
  name?: string;
  updateTime?: string;
  fields?: Record<string, FsValue>;
}

async function authHeaders(): Promise<Record<string, string>> {
  // 에뮬레이터는 기본적으로 무인증. FIREBASE_TOKEN_URL 을 주면 인증 경로까지 태워 본다.
  if (EMULATOR && !TOKEN_URL) return {};
  const token = await getAccessToken(
    { clientEmail: CLIENT_EMAIL, privateKey: PRIVATE_KEY },
    { timeoutMs: TIMEOUT_MS, ...(TOKEN_URL ? { tokenUrl: TOKEN_URL } : {}) },
  );
  return { authorization: `Bearer ${token}` };
}

async function fsFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${root()}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(await authHeaders()),
        ...(init.headers ?? {}),
      },
      signal: ctrl.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function errorText(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const json = JSON.parse(text) as { error?: { status?: string; message?: string } };
    return json.error?.status || json.error?.message || text.slice(0, 120);
  } catch {
    return text.slice(0, 120);
  }
}

/** 문서 1개 읽기 (없으면 null) */
async function getDoc(path: string): Promise<FsDoc | null> {
  const res = await fsFetch(`/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore read ${res.status}: ${await errorText(res)}`);
  return (await res.json()) as FsDoc;
}

function str(doc: FsDoc, key: string): string | null {
  const v = doc.fields?.[key];
  return v && 'stringValue' in v ? v.stringValue : null;
}

function int(doc: FsDoc, key: string): number {
  const v = doc.fields?.[key];
  return v && 'integerValue' in v ? Number(v.integerValue) : 0;
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * 현재 스냅샷 읽기.
 *  · raw: JSON 문자열 (없으면 null)
 *  · version: CAS 용 토큰 `<updateTime>|<hash>|<chunks>` (없으면 '')
 */
export async function firestoreRead(): Promise<{ raw: string | null; version: string }> {
  const meta = await getDoc(STORE_PATH);
  if (!meta) return { raw: null, version: '' };

  const hash = str(meta, 'hash');
  const chunks = int(meta, 'chunks');
  if (!hash || chunks <= 0) {
    // 메타만 있고 청크가 없는 상태는 '빈 저장소'가 아니라 손상이다 → 덮어쓰지 않고 장애로 취급
    throw new Error('firestore: malformed store meta');
  }

  const parts = await Promise.all(
    Array.from({ length: chunks }, async (_, i) => {
      const chunk = await getDoc(`${CHUNK_COLLECTION}/${hash}-${i}`);
      if (!chunk) throw new MissingChunkError(`firestore: missing chunk ${i}/${chunks}`);
      const b64 = str(chunk, 'b64');
      if (b64 == null) throw new MissingChunkError(`firestore: empty chunk ${i}`);
      return Buffer.from(b64, 'base64');
    }),
  );

  const packed = Buffer.concat(parts);
  let raw: string;
  try {
    raw = str(meta, 'format') === 'gzip' ? gunzipSync(packed).toString('utf8') : packed.toString('utf8');
  } catch (e) {
    throw new Error(`firestore: bad payload (${(e as Error).message})`);
  }
  if (sha256(raw) !== hash) throw new Error('firestore: checksum mismatch');

  return { raw, version: `${meta.updateTime ?? ''}|${hash}|${chunks}` };
}

/** 다른 인스턴스가 스냅샷을 교체하는 중에 청크를 읽었을 때 */
class MissingChunkError extends Error {}

/** 청크 유실은 '스냅샷이 바뀌는 중'일 수 있으니 메타를 다시 읽어 몇 번 재시도한다 */
async function readWithRetry(): Promise<{ raw: string | null; version: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await firestoreRead();
    } catch (e) {
      lastError = e;
      if (!(e instanceof MissingChunkError)) throw e;
      await new Promise((r) => setTimeout(r, 20 + attempt * 40));
    }
  }
  throw lastError;
}

export { readWithRetry as firestoreReadSafe };

/** 커밋 요청 */
async function commit(writes: unknown[]): Promise<Response> {
  return fsFetch(':commit', { method: 'POST', body: JSON.stringify({ writes }) });
}

/** 이전 스냅샷 청크 정리 (best-effort — 실패해도 데이터에는 영향 없음) */
function gcChunks(prevHash: string, prevChunks: number): void {
  if (!prevHash || prevChunks <= 0) return;
  const deletes = Array.from({ length: Math.min(prevChunks, MAX_WRITES - 1) }, (_, i) => ({
    delete: docName(`${CHUNK_COLLECTION}/${prevHash}-${i}`),
  }));
  void commit(deletes).catch(() => undefined);
}

/**
 * 원자적 쓰기 (청크 + 메타를 한 commit 으로).
 *  · version 이 '' 이면 "메타 문서가 없어야 한다"를 precondition 으로 건다.
 *  · 다른 인스턴스가 먼저 썼으면 false (호출부가 최신본으로 재시도)
 */
export async function firestoreCas(version: string, next: string): Promise<boolean> {
  const [prevUpdateTime = '', prevHash = '', prevChunksRaw = '0'] = version.split('|');
  const hash = sha256(next);
  const packed = gzipSync(Buffer.from(next, 'utf8'), { level: 6 });
  if (packed.length > MAX_TOTAL_BYTES) throw new Error(`firestore: snapshot too large (${packed.length}B)`);

  const chunkCount = Math.max(1, Math.ceil(packed.length / CHUNK_BYTES));
  if (chunkCount + 1 > MAX_WRITES) throw new Error(`firestore: too many chunks (${chunkCount})`);

  const writes: unknown[] = [];
  for (let i = 0; i < chunkCount; i++) {
    const slice = packed.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES);
    writes.push({
      update: {
        name: docName(`${CHUNK_COLLECTION}/${hash}-${i}`),
        fields: { b64: { stringValue: slice.toString('base64') } },
      },
      // 내용 주소 청크: 같은 문서에는 같은 바이트만 쓰이므로 선행조건 없이 덮어써도 안전
      updateMask: { fieldPaths: ['b64'] },
    });
  }

  writes.push({
    update: {
      name: docName(STORE_PATH),
      fields: {
        v: { integerValue: '1' },
        format: { stringValue: 'gzip' },
        hash: { stringValue: hash },
        chunks: { integerValue: String(chunkCount) },
        bytes: { integerValue: String(Buffer.byteLength(next, 'utf8')) },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    },
    currentDocument: prevUpdateTime ? { updateTime: prevUpdateTime } : { exists: false },
  });

  const res = await commit(writes);
  if (res.ok) {
    if (prevHash && prevHash !== hash) {
      // 유예: 읽는 중인 다른 인스턴스가 이전 청크를 붙잡고 있을 수 있다 (읽기 타임아웃 8초 ≪ 유예 60초)
      const t = setTimeout(() => gcChunks(prevHash, Number(prevChunksRaw) || 0), GC_GRACE_MS);
      if (typeof (t as unknown as { unref?: () => void }).unref === 'function') {
        (t as unknown as { unref: () => void }).unref();
      }
    }
    return true;
  }

  const status = await errorText(res);
  // 다른 인스턴스가 먼저 썼다 → 재시도 신호
  if (res.status === 409 || status === 'FAILED_PRECONDITION' || status === 'ABORTED') return false;
  throw new Error(`firestore write ${res.status}: ${status}`);
}

/** 진단용: 저장된 스냅샷 원문 (없으면 null) */
export async function firestoreDebugRead(): Promise<string | null> {
  return (await firestoreRead()).raw;
}
