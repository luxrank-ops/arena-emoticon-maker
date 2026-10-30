'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// App Router 전역 에러 바운더리 — 렌더 단계에서 터진 에러도 Sentry 로 보낸다.
// (DSN 이 없으면 SDK 가 no-op 이므로 로컬에서도 안전)
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { scope: 'app:global-error' } });
  }, [error]);

  return (
    <html lang="ko">
      <body className="grid min-h-screen place-items-center bg-[#FFFDF7] p-6">
        <div className="max-w-md text-center">
          <p className="text-5xl">🫠</p>
          <h1 className="mt-4 text-xl font-black text-[#1B1B1B]">잠깐 문제가 생겼어요</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6B6B6B]">
            화면을 불러오지 못했습니다. 결제가 진행 중이었다면 결제는 이뤄지지 않았습니다.
          </p>
          <button
            onClick={reset}
            type="button"
            className="mt-6 rounded-xl bg-[#1B1B1B] px-5 py-3 text-sm font-bold text-white"
          >
            다시 시도
          </button>
          <p className="mt-4 text-xs text-[#9B9B9B]">계속되면 고객센터로 알려주세요. (support@emotime.app)</p>
        </div>
      </body>
    </html>
  );
}
