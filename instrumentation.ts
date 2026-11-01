// Next.js App Router 진입점 — 런타임별 Sentry 초기화
// (next.config.js 의 experimental.instrumentationHook: true 와 함께 동작)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
