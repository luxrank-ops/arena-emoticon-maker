#!/usr/bin/env node
// 로컬 Firestore 스텁 — Firestore REST v1 의 최소 부분집합 (개발·검증용)
//
//   node scripts/firestore-stub.mjs 4600            # 무인증 (에뮬레이터 흉내)
//   node scripts/firestore-stub.mjs 4600 --auth     # 서비스 계정 JWT 토큰 플로우까지 검증
//
// 앱 실행:
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:4600 FIREBASE_PROJECT_ID=emotime-demo npm start
//   (인증 경로까지: FIREBASE_TOKEN_URL=http://127.0.0.1:4600/token \
//     FIREBASE_CLIENT_EMAIL=stub@example.com FIREBASE_PRIVATE_KEY="$(cat key.pem)")
//
// 지원: GET 문서 · POST :commit(update/delete + currentDocument 선행조건, 원자적) · POST /token
// 실제 Firestore 와 동일하게 **문서 1MiB 상한**을 강제한다 (청크 분할 버그를 잡기 위한 것).
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.argv[2] ?? 4600);
const REQUIRE_AUTH = process.argv.includes('--auth');
const DOC_LIMIT = 1024 * 1024;

/** @type {Map<string, {fields: Record<string, unknown>, updateTime: string}>} */
const docs = new Map();
const tokens = new Set();
let tick = 0;

function nowStamp() {
  tick += 1;
  return new Date(Date.now() + tick).toISOString().replace('Z', `${String(tick % 1000).padStart(3, '0')}Z`);
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('bad json'));
      }
    });
  });
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(obj));
}

function fail(res, status, st, message) {
  json(res, status, { error: { code: status, status: st, message } });
}

/** projects/p/databases/(default)/documents/col/doc → col/doc */
function normalizeName(name) {
  const idx = String(name).indexOf('/documents/');
  return idx >= 0 ? String(name).slice(idx + '/documents/'.length) : String(name);
}

function docSize(doc) {
  return Buffer.byteLength(JSON.stringify(doc), 'utf8');
}

function applyWrite(write) {
  if (write.delete) {
    const path = normalizeName(write.delete);
    return () => docs.delete(path);
  }

  const upd = write.update;
  if (!upd) throw new Error('unsupported write');

  const path = normalizeName(upd.name);
  const cur = docs.get(path) ?? null;
  const pre = write.currentDocument;

  if (pre) {
    if (pre.exists === false && cur) return { conflict: 'ALREADY_EXISTS' };
    if (pre.exists === true && !cur) return { conflict: 'NOT_FOUND' };
    if (pre.updateTime && (!cur || cur.updateTime !== pre.updateTime)) {
      return { conflict: 'FAILED_PRECONDITION' };
    }
  }

  const mask = write.updateMask?.fieldPaths;
  const fields = mask && mask.length ? { ...(cur?.fields ?? {}) } : {};
  if (mask && mask.length) {
    for (const f of mask) {
      if (upd.fields && f in upd.fields) fields[f] = upd.fields[f];
      else delete fields[f];
    }
  } else {
    Object.assign(fields, upd.fields ?? {});
  }

  const next = { fields, updateTime: nowStamp() };
  if (docSize(next) > DOC_LIMIT) {
    return { tooLarge: Buffer.byteLength(JSON.stringify(upd.fields ?? {}), 'utf8') };
  }
  return () => docs.set(path, next);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = decodeURIComponent(url.pathname);

  if (req.method === 'GET' && path === '/__dump') {
    json(res, 200, { docs: [...docs.entries()], tokens: tokens.size });
    return;
  }

  // ── OAuth2 토큰 엔드포인트 (JWT bearer) ─────────────────────
  if (req.method === 'POST' && path === '/token') {
    const raw = await new Promise((resolve) => {
      let b = '';
      req.on('data', (c) => (b += c));
      req.on('end', () => resolve(b));
    });
    const params = new URLSearchParams(raw);
    if (params.get('grant_type') !== 'urn:ietf:params:oauth:grant-type:jwt-bearer') {
      fail(res, 400, 'INVALID_ARGUMENT', 'bad grant_type');
      return;
    }
    const assertion = params.get('assertion') ?? '';
    const parts = assertion.split('.');
    if (parts.length !== 3) {
      fail(res, 400, 'INVALID_ARGUMENT', 'bad assertion');
      return;
    }
    let claims = {};
    try {
      claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    } catch {
      fail(res, 400, 'INVALID_ARGUMENT', 'bad claims');
      return;
    }
    if (!String(claims.scope ?? '').includes('datastore') || !claims.iss || !claims.exp) {
      fail(res, 400, 'INVALID_ARGUMENT', 'bad claims');
      return;
    }
    // 서명 검증은 스텁 범위 밖 (실서비스는 Google 이 검증한다)
    const token = `stub-${randomUUID()}`;
    tokens.add(token);
    json(res, 200, { access_token: token, expires_in: 3600, token_type: 'Bearer' });
    return;
  }

  if (REQUIRE_AUTH) {
    const auth = req.headers.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!tokens.has(token)) {
      fail(res, 401, 'UNAUTHENTICATED', 'missing/invalid bearer token');
      return;
    }
  }

  const prefix = '/v1/projects/';
  if (!path.startsWith(prefix)) {
    fail(res, 404, 'NOT_FOUND', 'unknown path');
    return;
  }
  const rest = path.slice(prefix.length);
  const idx = rest.indexOf('/databases/(default)/documents');
  if (idx < 0) {
    fail(res, 404, 'NOT_FOUND', 'unknown path');
    return;
  }
  const tail = rest.slice(idx + '/databases/(default)/documents'.length);

  // ── commit ────────────────────────────────────────────────
  if (req.method === 'POST' && tail === ':commit') {
    let payload;
    try {
      payload = await body(req);
    } catch {
      fail(res, 400, 'INVALID_ARGUMENT', 'bad json');
      return;
    }
    const writes = Array.isArray(payload.writes) ? payload.writes : [];
    // 1) 전부 검사 (원자성: 하나라도 실패하면 아무것도 쓰지 않는다)
    const ops = [];
    for (const w of writes) {
      const out = applyWrite(w);
      if (typeof out !== 'function') {
        if (out.tooLarge != null) fail(res, 400, 'INVALID_ARGUMENT', `document too large: ${out.tooLarge}B`);
        else fail(res, 409, out.conflict, `precondition failed: ${out.conflict}`);
        return;
      }
      ops.push(out);
    }
    // 2) 적용
    for (const op of ops) op();
    json(res, 200, { writeResults: ops.map(() => ({})) });
    return;
  }

  // ── 문서 읽기 ─────────────────────────────────────────────
  const docPath = tail.replace(/^\//, '');
  if (req.method === 'GET' && docPath) {
    const doc = docs.get(docPath);
    if (!doc) {
      fail(res, 404, 'NOT_FOUND', `no document ${docPath}`);
      return;
    }
    json(res, 200, { name: `projects/x/databases/(default)/documents/${docPath}`, ...doc });
    return;
  }

  // ── 문서 쓰기 (PATCH) ─────────────────────────────────────
  if (req.method === 'PATCH' && docPath) {
    let payload;
    try {
      payload = await body(req);
    } catch {
      fail(res, 400, 'INVALID_ARGUMENT', 'bad json');
      return;
    }
    const maskField = url.searchParams.getAll('updateMask.fieldPaths');
    const apply = applyWrite({
      update: { name: docPath, fields: payload.fields ?? {} },
      updateMask: maskField.length ? { fieldPaths: maskField } : undefined,
    });
    if (typeof apply !== 'function') {
      fail(res, 409, apply.conflict ?? 'INVALID_ARGUMENT', 'write rejected');
      return;
    }
    apply();
    json(res, 200, { ...docs.get(docPath), name: docPath });
    return;
  }

  fail(res, 404, 'NOT_FOUND', 'unsupported');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`firestore stub on ${PORT}${REQUIRE_AUTH ? ' (auth required)' : ''}`);
});
