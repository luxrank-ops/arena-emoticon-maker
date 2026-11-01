import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN_SERVER, baseSentryOptions } from './sentry.shared';

Sentry.init({
  ...baseSentryOptions(SENTRY_DSN_SERVER),
  // 서버: 느린 API 를 잡기 위해 트랜잭션 샘플링 유지 (base 옵션 값 사용)
  profilesSampleRate: 0,
});
