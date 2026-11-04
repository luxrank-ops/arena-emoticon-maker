import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";

// 비밀값(GEMINI_API_KEY 등)과 운영 설정은 여기서 주입하지 않는다.
// Cloudflare Worker 런타임 변수(Settings > Variables)에서 process.env 로 읽는다.
export default defineConfig({
  plugins: [
    vinext({
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
