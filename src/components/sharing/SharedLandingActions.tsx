'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';
import { rememberShareAttribution } from '@/lib/share-attribution';

// 앱(TWA)은 아직 스토어에 없다 — 예전 'Play로 이동' 버튼은 404로 떨어져 제거했다.
// 출시 후에는 여기에 스토어 링크·intent 이동 버튼을 다시 붙인다.
export function SharedLandingActions({ locale, createHref }: { locale: Locale; createHref: string }) {
  useEffect(() => {
    rememberShareAttribution(window.location.search);
  }, []);

  return (
    <div className="mt-6 grid gap-2">
      <Link href={localizedPath(locale, createHref)} className="btn-primary min-h-14 w-full text-center">
        {tr(locale, '나도 내 사진으로 만들기', 'Create my own')}
      </Link>
      <p className="text-center text-[11px] leading-relaxed text-sub">
        {tr(
          locale,
          '설치·회원가입 없이 웹에서 바로 만들 수 있어요. 안드로이드 앱은 출시 준비 중입니다.',
          'Make it right here on the web — no install or sign-up. The Android app is coming soon.',
        )}
      </p>
    </div>
  );
}
