import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 1.0,
      debug: process.env.NODE_ENV === 'development',
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      beforeSend(event, hint) {
        // 필터링: 개발 환경에서는 일부 에러 무시
        if (process.env.NODE_ENV === 'development') {
          const error = hint.originalException;
          if (error instanceof Error) {
            // 네트워크 에러 등 무시
            if (error.message.includes('ECONNREFUSED') || error.message.includes('Network request failed')) {
              return null;
            }
          }
        }
        return event;
      },
    });
  }
}

// 서버 사이드 에러 캡처
export function captureServerError(error: Error, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        component: 'server',
      },
    });
  }
  console.error('[Server Error]', error, context);
}

// 클라이언트 사이드 에러 캡처
export function captureClientError(error: Error, context?: Record<string, any>) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        component: 'client',
      },
    });
  }
  console.error('[Client Error]', error, context);
}

// 사용자 컨텍스트 설정
export function setSentryUser(user: { id: string; email?: string; username?: string } | null) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (user) {
      Sentry.setUser(user);
    } else {
      Sentry.setUser(null);
    }
  }
}

// 브레드크럼 추가
export function addSentryBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
  }
}

// 성능 모니터링용 스팬 (Sentry v8+ 호환)
export function startSentrySpan(name: string, op: string) {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return Sentry.startSpan({ name, op }, () => {});
  }
  return null;
}

export { Sentry };