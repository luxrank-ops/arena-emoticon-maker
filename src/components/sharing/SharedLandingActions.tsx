'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';
import { rememberShareAttribution } from '@/lib/share-attribution';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.emotihak.app';

export function SharedLandingActions({ locale, createHref }: { locale: Locale; createHref: string }) {
  const [android, setAndroid] = useState(false);
  useEffect(() => {
    rememberShareAttribution(window.location.search);
    setAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  function openApp() {
    const target = `${window.location.pathname}${window.location.search}`;
    if (/Android/i.test(navigator.userAgent)) {
      window.location.assign(`intent://${window.location.host}${target}#Intent;scheme=https;package=com.emotihak.app;S.browser_fallback_url=${encodeURIComponent(PLAY_URL)};end`);
    } else {
      window.location.assign(PLAY_URL);
    }
  }

  return (
    <div className="mt-6 grid gap-2 sm:grid-cols-2">
      <button type="button" onClick={openApp} className="btn-primary min-h-14 w-full">{android ? tr(locale, '앱에서 결과 열기', 'Open result in the app') : tr(locale, 'Android 앱 받기', 'Get the Android app')}</button>
      <Link href={localizedPath(locale, createHref)} className="btn-ghost min-h-14 w-full">{tr(locale, '나도 만들기', 'Create my own')}</Link>
      <p className="text-center text-[11px] leading-relaxed text-sub sm:col-span-2">{tr(locale, '설치된 Android 앱으로 이동하며, 앱이 없으면 Google Play로 연결됩니다.', 'Opens the installed Android app, or Google Play when it is not installed.')}</p>
    </div>
  );
}
