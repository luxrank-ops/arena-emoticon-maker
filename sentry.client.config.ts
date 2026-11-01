import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN_CLIENT, baseSentryOptions } from './sentry.shared';

Sentry.init({
  ...baseSentryOptions(SENTRY_DSN_CLIENT),
  // 세션 리플레이·프로파일링은 켜지 않는다 (얼굴 사진이 화면에 남는 서비스 특성상 과수집)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
