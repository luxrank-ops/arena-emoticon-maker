import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { responseStoreServiceBinding } from "./cloudflare.config";
import { responseStoreAdapter } from "@vinext/cloudflare/cache/response-store-adapter";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";

// 비밀값(GEMINI_API_KEY 등)과 운영 설정은 여기서 주입하지 않는다.
// Cloudflare Worker 런타임 변수(Settings > Variables)에서 process.env 로 읽는다.
// (define 으로 굽으면 키가 클라이언트 번들에 노출되고, NODE_ENV/PAYMENT_PROVIDER 가 고정돼 결제 차단이 깨진다)
export default defineConfig({
  plugins: [
    vinext({
      cache: responseStoreAdapter(),
      prerender: { routes: "*" },
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      auxiliaryWorkers: [{ config: responseStoreServiceBinding }],
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
