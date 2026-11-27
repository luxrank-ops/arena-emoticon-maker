/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Arena's proxied dev preview and local browser checks; never used in production.
  allowedDevOrigins: ['*.e2b.app', '127.0.0.1'],
  // <title>·description 같은 메타데이터를 스트리밍(셸 뒤 hidden div)이 아니라 <head> 에서 바로 내보낸다.
  // 기본값은 "봇이 아닌 UA"에 스트리밍 메타데이터를 주는데, 그 경로에서는 <title> 이 body 쪽에 중복 노출되고
  // head 에는 들어가지 않아 SEO 감점·크롤러 혼선이 있었다. 모든 UA 에 블로킹 렌더를 적용한다.
  htmlLimitedBots: /.*/,
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Allow embedding the local dev preview without relaxing production protection.
          ...(process.env.NODE_ENV === 'development' ? [] : [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }]),
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          // 운영은 Cloudflare Worker(worker/index.ts)가 같은 값을 붙인다. 다른 호스팅으로 옮겨도 유지되게 여기에도 둔다.
          { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
