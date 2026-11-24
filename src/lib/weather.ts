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
  return `emotime:rain-float-dismissed:${dateKey}`;
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
