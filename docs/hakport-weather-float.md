# 학포트 세션 전달용 — 비 예보 플로팅 카드 (창원 → 학포트 이관)

> **목적**: arena-emoticon-maker(이모티학)에 PR #117로 넣었다가 PR #140으로 되돌린
> **'비가 예보되면 화면 우하단에 뜨는 날씨 플로팅 카드'**를, 학포트(`luxrank-ops/BUSAN-HAK-PORT-INFO`)
> 프로젝트에서 그대로 가져다 쓸 수 있게 정리한 인수인계 문서입니다.
> 이 문서는 학포트 세션에 그대로 붙여넣어도 동작합니다.
>
> **출처**
> - 원본 기능: PR #117 `feat(home): 창원 비 예보 시 우하단 플로팅 날씨 카드 (Open-Meteo)` (머지 커밋 `994b0f4`)
> - 사용자 요청으로 이모티학에서 제거: PR #140 (리버트 머지 커밋 `e3c9de4`, 현재 main 기준)
> - 기능의 정확한 소스 코드는 이 문서의 [부록 A](#부록-a-소스-코드-원문-pr-117-기준)에 있습니다.
>   (이 저장소는 shallow clone이라 git 히스토리에서 복원할 수 없으므로 원문을 그대로 싣습니다.)

---

## 1. 한눈에 보기

- **무엇**: 홈(랜딩) 진입 시 브라우저가 [Open-Meteo](https://open-meteo.com/)(무료, API 키 불필요, CORS 허용)로 **오늘 예보**를 조회하여, **비가 예보된 날에만** 화면 우하단에 카드를 띄운다.
- **비 판정**: WMO 날씨코드가 비 계열(이슬비·어는비·비·소나기·뇌우) **또는** 최대 강수확률 ≥ 50% **또는** 예상 강수량 합 ≥ 1mm.
- **카드 내용**: ☂️ · "오늘 ○○에 비 소식이 있어요" · 최대 강수확률/예상 강수량/날씨 코드 라벨 · CTA 링크 · 출처 링크(Open-Meteo, CC BY 4.0).
- **닫기**: X 버튼 → `localStorage`에 **KST 날짜 키**(`emotime:rain-float-dismissed:YYYY-MM-DD`)로 기록되어 **그날은 다시 뜨지 않음**, 다음 날 재확인.
- **실패 시**: 네트워크 오류/8초 타임아웃/응답 형식 이상 → **아무것도 렌더하지 않음** (홈 렌더링에 영향 없음, 조용한 실패).
- **위치**: 기본 구현은 **창원 고정**.
- **마운트 위치**: 홈 페이지 컴포넌트 (루트 레이아웃 아님) — 한/영 랜딩 모두.

## 2. 학포트에 맞게 바꿔야 하는 것 (체크리스트)

프로젝트 스택이 이모티학과 비슷하다면(Next.js + Tailwind) 거의 그대로, 아니면 아래 항목만 바꿉니다.

| # | 항목 | 원본(이모티학) | 학포트에서 할 일 |
|---|------|----------------|------------------|
| 1 | **지역 좌표** | 창원 `CHANGWON = { latitude: 35.227, longitude: 128.6816 }` | 학포트가 부산 기반이므로 **부산 좌표(35.1796, 129.0756)** 등 서비스 주 지역으로 변경. 변수명 `CHANGWON*` → `BUSAN*` (또는 `LOCATION*`) 로 함께 바꾸기 |
| 2 | **CTA 링크** | `/brief` (이모티학 '오늘의 브리핑') → `localizedPath(locale, '/brief')` | 학포트에는 `/brief`가 없을 수 있음. 학포트의 관련 화면(없으면 이 CTA 줄 자체를 제거하거나 메인으로)으로 교체 |
| 3 | **i18n 연결** | `@/lib/i18n/locale`의 `localizedPath` + `getLocale()`(서버) → 클라이언트에는 `locale` prop 전달 | 학포트의 라우팅/로케일 구조로. 없으면 `locale` prop 없이 ` ko ` 고정 문자열로 단순화해도 됨 |
| 4 | **스타일 토큰** | Tailwind + 이모티학 커스텀 토큰(`bg-paper`, `text-ink`, `text-sub`, `border-line`, `brand-gradient`, `shadow-card/cta/pop`, `border-ink`, `.wrap`) | 학포트 디자인 시스템 클래스로 교체. 없으면 Tailwind 기본 클래스나 인라인 스타일 사용 (모바일 하단 고정 탭 바 회피를 위해 `bottom` 오프셋은 그대로) |
| 5 | **아이콘** | `lucide-react`의 `CloudRain`, `X` | 학포트에 lucide가 없으면 ☂️/✕ 이모지/텍스트로 대체 (동작에 영향 없음) |
| 6 | **스토리지 키** | `emotime:rain-float-dismissed:<date>` | `hakport:rain-float-dismissed:<date>`로 prefix 변경 (충돌 방지) |
| 7 | **문구** | COPY.ko/en ("오늘 창원에 비 소식이 있어요") | 지역명(부산 등) 반영해 문구 수정. 영어판은 그대로 두거나 제거 |
| 8 | **배치** | 이모티학 홈 2곳(한/영)에서 마운트 | 학포트 홈(또는 원하는 화면 1곳)에서만 마운트 |
| 9 | **지점 원칙** | 위치는 **고정 좌표**, `Permissions-Policy: geolocation=()` 유지와 충돌 없음 | 브라우저 geolocation은 사용하지 않음 — 권한 요청 없이 동작 |
| 10 | **출처 표기** | 카드 하단에 `Open-Meteo · 지역` + CC BY 링크 (필수 아님, 권장) | 그대로 유지 권장 (Open-Meteo CC BY 4.0 출처 표기) |

비 판정 임계값(50% / 1mm / WMO 비 계열 코드), 8초 타임아웃, '닫으면 KST 당일 숨김', '실패 시 비표시' 로직은 **그대로 권장**합니다.

## 3. 적용 절차 (Next.js + Tailwind 기준)

```bash
# 1) 파일 2개 추가
src/lib/weather.ts              # 부록 A-1
src/components/home/RainFloat.tsx   # 부록 A-2

# 2) 홈(또는 원하는 페이지) 마운트
import { RainFloat } from '@/components/home/RainFloat';
...
<RainFloat locale="ko" />   // 학포트가 ko-only면 ko만
```

의존성: `next/link`, Tailwind, (선택) `lucide-react` — 모두 이미 있을 가능성이 높은 것만 사용합니다.

## 4. 검증 체크리스트

1. `tsc --noEmit` (또는 프로젝트의 typecheck) 통과
2. 개발 서버에서 홈 페이지 HTTP 200
3. 브라우저 콘솔/네트워크 탭에서 `https://api.open-meteo.com/v1/forecast?...` 200 응답 확인
   (응답 예: `{"daily":{"time":["2026-11-26"],"weather_code":[61],"precipitation_probability_max":[80],"precipitation_sum":[3.2]}}`)
4. 비 판정 로직 단위 점검 케이스 (이모티학에서 통과한 8가지):
   - [61, 80%, 3.2mm] → 표시 (날씨코드 비)
   - [3, 65%, 0mm] → 표시 (강수확률 ≥ 50)
   - [2, 10%, 1.4mm] → 표시 (강수량 ≥ 1)
   - [2, 10%, 0mm] → 미표시
   - [95, 30%, 0.2mm] → 표시 (뇌우)
   - 응답에 daily 없음/null → 미표시
   - 레거시 키 `weathercode` → 파싱됨
   - localStorage에 오늘 키가 있으면 → 미표시 (X로 닫은 경우)
5. 닫기(X) 후 새로고침 → 당일에는 안 보임 / 키 삭제 후 재확인

## 5. 알려진 제약

- 지역은 **고정 좌표**입니다(geolocation 미사용). 사용자 위치 기반으로 바꾸려면
  `navigator.geolocation` + 권한 처리 + 실패 시 폴백 좌표가 필요합니다.
- 서버 사이드 렌더링 시점에는 날씨를 알 수 없으므로, 카드는 **마운트 후 비동기로 등장**합니다
  (서버 HTML에는 없음). SSR 값이 필요하면 Open-Meteo를 서버에서 직접 fetch(`next: { revalidate: 1800 }`)하는 방식으로 바꾸세요.
- 샌드박스/오프라인 환경에서는 Open-Meteo에 못 가므로 미표시가 '정상'입니다.

---

## 부록 A. 소스 코드 원문 (PR #117 기준)

### A-1. `src/lib/weather.ts`

```ts
/**
 * 날씨 예보 유틸 — 창원(경남) 고정.
 * 홈 화면의 '비 예보 플로팅 카드'(RainFloat)가 사용한다.
 * 데이터 출처: Open-Meteo (https://open-meteo.com/ · CC BY 4.0) — API 키 불필요.
 */

/** 창원시청 부근 좌표 (기상 예보 격자 기준으로 충분히 대표적) */
export const CHANGWON = {
  latitude: 35.227,
  longitude: 128.6816,
  timezone: 'Asia/Seoul',
} as const;

export const CHANGWON_FORECAST_URL = `https://api.open-meteo.com/v1/forecast?latitude=${CHANGWON.latitude}&longitude=${CHANGWON.longitude}&daily=weather_code,precipitation_probability_max,precipitation_sum&timezone=Asia%2FSeoul&forecast_days=1`;

export type WeatherLocale = 'ko' | 'en';

export type RainForecast = {
  /** KST 기준 예보 날짜 (YYYY-MM-DD) */
  dateKey: string;
  /** 오늘 최대 강수확률 (%, 모르면 null) */
  precipitationProbabilityMax: number | null;
  /** 오늘 예상 강수량 합계 (mm, 모르면 null) */
  precipitationSum: number | null;
  /** WMO weather interpretation code (Open-Meteo daily.weather_code) */
  weatherCode: number | null;
};

/** WMO weather interpretation codes 중 비 계열 (이슬비·어는비·비·소나기·뇌우) */
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export function isRainCode(code: number | null | undefined): boolean {
  return typeof code === 'number' && RAIN_CODES.has(code);
}

/**
 * '비 예보'로 볼지 판정한다.
 *  weatherCode 가 비 계열이거나, 오늘 최대 강수확률 50% 이상이거나, 예상 강수량 합 1mm 이상이면 비.
 */
export function isRainForecast(
  f: Pick<RainForecast, 'precipitationProbabilityMax' | 'precipitationSum' | 'weatherCode'>,
): boolean {
  if (isRainCode(f.weatherCode)) return true;
  if (typeof f.precipitationProbabilityMax === 'number' && f.precipitationProbabilityMax >= 50) return true;
  if (typeof f.precipitationSum === 'number' && f.precipitationSum >= 1) return true;
  return false;
}

/** 비 계열 날씨코드 → 짧은 라벨. 비 계열이 아니면 null. */
export function rainCodeLabel(code: number | null | undefined, locale: WeatherLocale): string | null {
  if (typeof code !== 'number') return null;
  const ko = locale === 'ko';
  if ([51, 53, 55, 56, 57].includes(code)) return ko ? '이슬비' : 'Drizzle';
  if ([61, 63, 65].includes(code)) return ko ? '비' : 'Rain';
  if ([66, 67].includes(code)) return ko ? '어는비' : 'Freezing rain';
  if ([80, 81, 82].includes(code)) return ko ? '소나기' : 'Showers';
  if (code === 95) return ko ? '뇌우' : 'Thunderstorm';
  if (code === 96 || code === 99) return ko ? '뇌우·우박' : 'Thunderstorm w/ hail';
  return null;
}

/** KST 기준 오늘 날짜 키 (YYYY-MM-DD) — 플로팅 카드 '오늘 하루 숨기기' 판정에 사용 */
export function kstTodayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function rainFloatDismissKey(dateKey: string): string {
  return `emotime:rain-float-dismissed:${dateKey}`; // 학포트에서는 hakport: 로 변경
}

/**
 * Open-Meteo daily 응답을 RainForecast 로 파싱한다.
 * 형식이 기대와 다르면 null — 호출부는 null 이면 아무것도 보여 주지 않는다.
 */
export function parseDailyForecast(json: unknown): RainForecast | null {
  if (!json || typeof json !== 'object') return null;
  const daily = (json as { daily?: unknown }).daily;
  if (!daily || typeof daily !== 'object') return null;
  const d = daily as Record<string, unknown>;
  const pick = (key: string): unknown => {
    const value = d[key];
    return Array.isArray(value) ? value[0] : undefined;
  };
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

  const time = pick('time');
  const dateKey =
    typeof time === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(time) ? time : kstTodayKey();
  // Open-Meteo 는 weather_code 를 쓰지만, 구버전 호환으로 weathercode 도 읽는다.
  const weatherCode = num(pick('weather_code') ?? pick('weathercode'));

  return {
    dateKey,
    precipitationProbabilityMax: num(pick('precipitation_probability_max')),
    precipitationSum: num(pick('precipitation_sum')),
    weatherCode,
  };
}
```

### A-2. `src/components/home/RainFloat.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudRain, X } from 'lucide-react';
import {
  CHANGWON_FORECAST_URL,       // 학포트에서는 BUSAN_FORECAST_URL 등으로 변경
  isRainForecast,
  kstTodayKey,
  parseDailyForecast,
  rainCodeLabel,
  rainFloatDismissKey,
  type RainForecast,
  type WeatherLocale,
} from '@/lib/weather';
import { localizedPath } from '@/lib/i18n/locale';  // 학포트 i18n으로 교체하거나 제거

const COPY = {
  ko: {
    eyebrow: '오늘의 날씨 · 창원',        // → 부산 등으로
    title: '오늘 창원에 비 소식이 있어요',
    prob: '강수확률 최대',
    sum: '예상 강수량',
    fallback: '비가 올 수 있어요',
    cta: '비 오는 날 브리핑 →',          // → 학포트의 관련 화면으로, 없으면 이 줄과 CTA 제거
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
```

### A-3. 홈 페이지 마운트 형태 (이모티학에서 사용하던 형태)

```tsx
import { RainFloat } from '@/components/home/RainFloat';

// 영어(또는 단일 로케일) 분기
if (locale === 'en') {
  return (
    <>
      <EnglishLanding aiEnabled={aiEnabled} />
      <SeasonTeaser ... />
      <RainFloat locale="en" />
    </>
  );
}

// 한국어 분기 (기존 루트 div 아래)
      ...페이지 내용...
    </div>
    <RainFloat locale="ko" />
  );
```

### A-4. 이모티학에서 제거된 것 (PR #140 / 필요 시 동일하게 제거)

- `src/app/page.tsx`의 `RainFloat` import 2곳 사용부
- `README.md` 기능 표의 `비 예보 플로팅` 한 줄

---

## 6. 한 줄 요약 (학포트 세션에 붙여넣기용)

> 이모티학에서 쓰던 비 예보 플로팅 카드를 학포트에 이식해줘. 코드는 `docs/hakport-weather-float.md` 문서의
> 부록 A 원문을 그대로 쓰고, 지역은 창원 대신 부산(35.1796, 129.0756)으로 바꿔줘. CTA(`/brief`)는 학포트에 맞는 화면으로 바꾸거나 빼고,
> 스토리지 키는 `hakport:`로, 스타일 클래스는 학포트 디자인 시스템에 맞춰줘. 학포트는 Next.js+Tailwind라고 가정한다.

*문서 작성: 2026-11-26 · 근거: 이모티학 PR #117(머지) → PR #140(리버트)*
