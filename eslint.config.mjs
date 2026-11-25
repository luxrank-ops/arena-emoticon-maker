import nextConfig from 'eslint-config-next';

/**
 * 이모티학 lint 설정 (ESLint 9 flat config).
 *  · Next.js 16 기본 규칙(@next/eslint-plugin-next + typescript-eslint + react-hooks)을 그대로 쓴다.
 *  · 빌드 산출물·생성물·로컬 런타임 데이터만 검사에서 제외한다.
 *  · `npm run lint` 가 CI 의 Lint 단계에서 실제로 돈다(이전에는 lint 스크립트가 없어
 *    `npm run lint --if-present` 가 아무것도 하지 않았다).
 */
const config = [
  ...nextConfig,
  {
    name: 'emotihak/ignores',
    ignores: [
      '.next/**',
      '.vinext/**',
      '.cloudflare/**',
      '.wrangler/**',
      '.data/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      'public/**',
      'data/**',
      'node_modules/**',
      'twa/**',
      'next-env.d.ts',
    ],
  },
];

export default config;
