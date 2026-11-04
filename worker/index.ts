import vinextHandler from "vinext/server/fetch-handler";

export default {
  async fetch(request: Request, env: any, ctx: any) {
    if (env) {
      (globalThis as any).CLOUDFLARE_ENV = env;
      if (env.STORE_KV) {
        (globalThis as any).STORE_KV = env.STORE_KV;
      }
    }
    return (vinextHandler as any).fetch(request, env, ctx);
  },
};
