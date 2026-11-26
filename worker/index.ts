import vinextHandler from "vinext/server/fetch-handler";

/** 운영 도메인 — 크론이 자기 자신의 API 를 호출할 때 쓴다. */
const CANONICAL_ORIGIN = "https://emotihak.com";

/**
 * HSTS — 180일. preload 는 서브도메인 전체를 https 로 고정하는 되돌리기 어려운 선택이라 넣지 않는다.
 * (Cloudflare 대시보드의 Always Use HTTPS 와 함께 동작한다)
 */
const HSTS_HEADER = "max-age=15552000; includeSubDomains";

/** 요청마다 Worker env 를 Next 런타임(process.env)에 비춘다. fetch·scheduled 가 같은 경로를 쓴다. */
function applyEnv(env: any) {
  if (!env) return;
  (globalThis as any).CLOUDFLARE_ENV = env;
  if (env.STORE_KV) {
    (globalThis as any).STORE_KV = env.STORE_KV;
  }
  if (typeof process !== "undefined" && process.env) {
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === "string") process.env[k] = v;
    }
  }
}

/** 엣지에 http 로 들어온 요청인지 (Cloudflare 는 원래 스킴을 x-forwarded-proto 로 넘긴다) */
function isInsecureRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]!.trim().toLowerCase() === "http";
  return new URL(request.url).protocol === "http:";
}

/** 모든 응답에 HSTS 를 붙인다 (리다이렉트 응답 포함). */
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Strict-Transport-Security", HSTS_HEADER);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const worker = {
  async fetch(request: Request, env: any, ctx: any) {
    applyEnv(env);

    // http → https. GET/HEAD 는 301(캐시 가능), 그 밖의 메서드는 308 로 메서드·본문을 보존한다.
    if (isInsecureRequest(request)) {
      const target = new URL(request.url);
      target.protocol = "https:";
      target.host = "emotihak.com";
      target.port = "";
      const status = request.method === "GET" || request.method === "HEAD" ? 301 : 308;
      return withSecurityHeaders(new Response(null, { status, headers: { Location: target.toString() } }));
    }

    const response = await (vinextHandler as any).fetch(request, env, ctx);
    return withSecurityHeaders(response);
  },

  /**
   * Cron Trigger (cloudflare.config.ts: 매일 18:00 UTC = 03:00 KST).
   *  · 얼굴 파생 정보 24시간 내 파기 약속을 실제로 지키는 경로다.
   *  · CRON_SECRET 이 없으면 조용히 넘어가지 않고 로그를 남긴다(설정 누락을 바로 알 수 있게).
   */
  async scheduled(_controller: any, env: any, ctx: any) {
    applyEnv(env);
    const secret = typeof env?.CRON_SECRET === "string" ? env.CRON_SECRET : "";
    if (!secret) {
      console.error("[cron] CRON_SECRET 이 없어 얼굴 파기 크론을 건너뜁니다");
      return;
    }
    try {
      const response = await (vinextHandler as any).fetch(
        new Request(`${CANONICAL_ORIGIN}/api/cron/purge`, {
          method: "GET",
          headers: { authorization: `Bearer ${secret}` },
        }),
        env,
        ctx,
      );
      const body = await response.text().catch(() => "");
      console.log(`[cron] face-purge ${response.status} ${body.slice(0, 400)}`);
    } catch (error) {
      console.error(`[cron] face-purge 실패: ${(error as Error)?.message ?? error}`);
    }
  },
};

export default worker;
