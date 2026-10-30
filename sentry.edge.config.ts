import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN_SERVER, baseSentryOptions } from './sentry.shared';

Sentry.init(baseSentryOptions(SENTRY_DSN_SERVER));
