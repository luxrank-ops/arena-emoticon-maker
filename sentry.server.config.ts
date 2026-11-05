import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN_SERVER, baseSentryOptions } from './sentry.shared';

Sentry.init({
  ...baseSentryOptions(SENTRY_DSN_SERVER),
  // 서버: 느린 API 를 잡기 위해 트랜잭션 샘플링 유지 (base 옵션 값 사용)
  // 프로파일링 샘플레이트는 @sentry/nextjs v11 서버 옵션에서 제거됨 (프로파일러 통합에서 설정)
});
