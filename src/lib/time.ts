// ─────────────────────────────────────────────────────────────
// 한국 시간(KST) 유틸
//  · 서버는 UTC 로 도는 경우가 많다 (Vercel · 컨테이너 기본값).
//  · "오늘의 브리핑 / 시간대 / 날짜 표시"는 모두 KST 기준이어야 하므로
//    모든 시간 판단은 이 모듈을 통과시킨다.
//  · 표시 문자열은 Intl 로케일 데이터에 의존하지 않고 직접 조립한다
//    (서버·브라우저 ICU 차이로 인한 hydration 불일치 방지).
// ─────────────────────────────────────────────────────────────

export const KST_TZ = 'Asia/Seoul';

export interface KstParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  weekday: number; // 0=일 … 6=토
}

const PARTS_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: KST_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** 임의의 시각을 KST 기준 연/월/일/시/분/요일로 분해한다. */
export function kstParts(date: Date | string | number = new Date()): KstParts {
  const d = date instanceof Date ? date : new Date(date);
  const parts = PARTS_FMT.formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  return {
    year,
    month,
    day,
    hour: pick('hour'),
    minute: pick('minute'),
    // 요일은 KST 벽시계 날짜를 UTC 로 고정해 계산 → 로케일에 의존하지 않는다
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

/** KST 기준 시(hour). 추천 엔진의 시간대 판단에 사용. */
export function kstHour(date: Date | string | number = new Date()): number {
  return kstParts(date).hour;
}

/** KST 기준 요일 (0=일). */
export function kstWeekday(date: Date | string | number = new Date()): number {
  return kstParts(date).weekday;
}

/** KST 기준 YYYY-MM-DD (일일 브리핑 캐시 키). */
export function kstDateKey(date: Date | string | number = new Date()): string {
  const { year, month, day } = kstParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 예: 2026. 10. 31. */
export function formatKstDate(date: Date | string | number): string {
  const { year, month, day } = kstParts(date);
  return `${year}. ${month}. ${day}.`;
}

/** 예: 2026. 10. 31. 19:42 */
export function formatKstDateTime(date: Date | string | number): string {
  const { hour, minute } = kstParts(date);
  return `${formatKstDate(date)} ${pad2(hour)}:${pad2(minute)}`;
}

/** 예: 19:42 */
export function formatKstTime(date: Date | string | number): string {
  const { hour, minute } = kstParts(date);
  return `${pad2(hour)}:${pad2(minute)}`;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** 예: 10월 31일 토요일 */
export function formatKstMonthDayWeekday(date: Date | string | number): string {
  const { month, day, weekday } = kstParts(date);
  return `${month}월 ${day}일 ${WEEKDAY_KO[weekday]}요일`;
}

export function kstWeekdayLabel(date: Date | string | number = new Date()): string {
  return WEEKDAY_KO[kstWeekday(date)];
}
