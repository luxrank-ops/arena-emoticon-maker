'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudRain, X } from 'lucide-react';
import {
  CHANGWON_FORECAST_URL,
  isRainForecast,
  kstTodayKey,
  parseDailyForecast,
  rainCodeLabel,
  rainFloatDismissKey,
  type RainForecast,
  type WeatherLocale,
} from '@/lib/weather';
import { localizedPath } from '@/lib/i18n/locale';

const COPY = {
  ko: {
    eyebrow: '오늘의 날씨 · 창원',
    title: '오늘 창원에 비 소식이 있어요',
    prob: '강수확률 최대',
    sum: '예상 강수량',
    fallback: '비가 올 수 있어요',
    cta: '비 오는 날 브리핑 →',
    close: '오늘은 그만 보기',
    aria: '비 예보 안내',
    region: '창원',
  },
  en: {
    eyebrow: "Today's weather · Changwon",
    title: 'Rain is forecast in Changwon today',
    prob: 'Max rain chance',
    sum: 'Expected rainfall',
    fallback: 'Rain is possible today',
    cta: 'Rainy-day brief →',
    close: 'Hide for today',
    aria: 'Rain forecast notice',
    region: 'Changwon',
  },
} as const;

/**
 * 비 예보가 있을 때만 우하단에 떠 있는 날씨 카드.
 *  · Open-Meteo(키 불필요)에서 창원 오늘 예보를 읽는다. 실패하면 조용히 렌더하지 않는다.
 *  · 닫으면 그날(KST)은 다시 뜨지 않는다 — 다음 날 다시 확인.
 *  · 모바일에서는 하단 고정 탭 바 위쪽에, 데스크톱에서는 화면 모서리에 놓는다.
 */
export function RainFloat({ locale }: { locale: WeatherLocale }) {
  const [forecast, setForecast] = useState<RainForecast | null>(null);
  const t = COPY[locale];

  useEffect(() => {
    const today = kstTodayKey();
    try {
      if (window.localStorage.getItem(rainFloatDismissKey(today)) === '1') return;
    } catch {
      // localStorage를 못 쓰는 환경(프라이빗 모드 등)은 그냥 보여 준다.
    }

    const controller = new AbortController();
    // 느린 네트워크에서 홈 화면을 붙잡지 않도록 8초 안에 포기한다.
    const timeout = window.setTimeout(() => controller.abort(), 8000);

    fetch(CHANGWON_FORECAST_URL, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json) => {
        const parsed = parseDailyForecast(json);
        if (parsed && isRainForecast(parsed)) setForecast(parsed);
      })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (!forecast) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(rainFloatDismissKey(kstTodayKey()), '1');
    } catch {
      // 저장 실패해도 이번 세션에서는 닫힌다.
    }
    setForecast(null);
  };

  const prob = forecast.precipitationProbabilityMax;
  const sum = forecast.precipitationSum;
  const codeLabel = rainCodeLabel(forecast.weatherCode, locale);
  const detail =
    [
      typeof prob === 'number' ? `${t.prob} ${Math.round(prob)}%` : null,
      typeof sum === 'number' ? `${t.sum} ${sum.toFixed(1)}mm` : null,
      codeLabel,
    ]
      .filter(Boolean)
      .join(' · ') || t.fallback;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t.aria}
      className="fixed bottom-[calc(4.75rem_+_env(safe-area-inset-bottom))] right-3 z-40 w-[min(92vw,330px)] animate-fade-scale motion-reduce:animate-none sm:right-6 lg:bottom-6"
    >
      <div className="overflow-hidden rounded-[1.25rem] border-2 border-ink bg-paper shadow-pop">
        <div className="flex items-start gap-3 p-3.5">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 shrink-0 select-none place-items-center rounded-2xl text-[22px] leading-none brand-gradient shadow-cta"
          >
            ☂️
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase leading-none tracking-[0.14em] text-primary-dark/80">
              <CloudRain className="h-3.5 w-3.5" aria-hidden="true" />
              {t.eyebrow}
            </p>
            <p className="mt-1.5 break-keep text-[15px] font-extrabold leading-snug tracking-[-0.02em] text-ink">
              {t.title}
            </p>
            <p className="mt-1 break-keep text-[11.5px] font-semibold leading-snug text-sub">{detail}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t.close}
            title={t.close}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-cream text-sub transition hover:bg-white hover:text-ink active:scale-95"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-line/80 bg-cream/70 px-3.5 py-2">
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer"
            className="text-[9.5px] font-bold text-sub/70 transition hover:text-sub"
          >
            Open-Meteo · {t.region}
          </a>
          <Link
            href={localizedPath(locale, '/brief')}
            className="text-[11px] font-black text-primary-dark transition hover:underline"
          >
            {t.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
