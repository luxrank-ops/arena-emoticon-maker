import vinextHandler from "vinext/server/fetch-handler";

export default {
  async fetch(request: Request, env: any, ctx: any) {
    if (env) {
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
    return (vinextHandler as any).fetch(request, env, ctx);
  },
};
