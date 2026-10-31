import { createSign } from 'node:crypto';

// ─────────────────────────────────────────────────────────────
// Google 서비스 계정 → OAuth2 액세스 토큰 (JWT bearer 플로우)
// 외부 의존성 없이 node:crypto 만 사용한다 (firebase-admin 불필요).
//   · 서명: RS256 (JWT assertion)
//   · 토큰은 만료 60초 전까지 메모리에 캐시 (콜드스타트당 1회 발급)
// ─────────────────────────────────────────────────────────────

export interface ServiceAccount {
  clientEmail: string;
  /** PEM. 환경변수로 넣을 때 `\n` 이스케이프가 남아 있어도 처리한다. */
  privateKey: string;
}

export const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface TokenCache {
  token: string;
  /** epoch ms */
  expiresAt: number;
}
let cache: TokenCache | null = null;

/** 테스트용 — 캐시 비우기 */
export function resetTokenCache(): void {
  cache = null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function normalizePem(key: string): string {
  // Vercel/도커 환경변수로 넣으면 개행이 "\n" 두 글자로 들어오는 경우가 흔하다
  return key.includes('\\n') ? key.replace(/\\n/g, '\n') : key;
}

/** 서명된 JWT assertion 생성 (테스트에서 직접 검증 가능) */
export function buildAssertion(
  sa: ServiceAccount,
  opts: { scope?: string; aud?: string; now?: number; ttlSec?: number } = {},
): string {
  const now = opts.now ?? Date.now();
  const aud = opts.aud ?? GOOGLE_TOKEN_URL;
  const iat = Math.floor(now / 1000);
  const exp = iat + (opts.ttlSec ?? 3600);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: sa.clientEmail, scope: opts.scope ?? FIRESTORE_SCOPE, aud, iat, exp }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(normalizePem(sa.privateKey));
  return `${header}.${claims}.${b64url(signature)}`;
}

/**
 * 서비스 계정으로 액세스 토큰 발급.
 *  · 실패 시 던진다 → 호출부(store)가 저장소 장애로 처리하고 파일/메모리로 폴백한다.
 */
export async function getAccessToken(
  sa: ServiceAccount,
  opts: { scope?: string; tokenUrl?: string; now?: number; timeoutMs?: number } = {},
): Promise<string> {
  const now = opts.now ?? Date.now();
  if (cache && cache.expiresAt > now + 60_000) return cache.token;

  const tokenUrl = opts.tokenUrl ?? GOOGLE_TOKEN_URL;
  const assertion = buildAssertion(sa, { scope: opts.scope, aud: tokenUrl, now });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 5000);
  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`google token ${res.status}`);
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) throw new Error('google token: no access_token');
    cache = { token: json.access_token, expiresAt: now + (json.expires_in ?? 3600) * 1000 };
    return cache.token;
  } finally {
    clearTimeout(timer);
  }
}
