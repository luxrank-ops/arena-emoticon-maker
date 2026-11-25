'use client';

import posthog from 'posthog-js';
import { GA_MEASUREMENT_ID } from '@/lib/ga';

// ─────────────────────────────────────────────────────────────
// 제품 분석 (PostHog + GA4)
//  · PostHog: NEXT_PUBLIC_POSTHOG_KEY 가 없으면 no-op → 로컬/CI 안전
//    · persistence: 'memory' — 쿠키/로컬스토리지에 식별자를 남기지 않는다
//      (국내 개인정보보호법상 쿠키 기반 분석은 사전 동의가 필요. 메모리 모드는 동의 전에도 안전)
//  · GA4: 측정 ID는 공개 값이라 항상 켜져 있다(마케팅 채널 판정용).
//  · 얼굴 사진·대사 텍스트는 절대 전송하지 않는다 — 이벤트 이름/숫자 지표만 전송
// ─────────────────────────────────────────────────────────────

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let initialized = false;

export function analyticsEnabled() {
  return Boolean(KEY);
}

export function initAnalytics() {
  if (!KEY || initialized || typeof window === 'undefined') return;
  try {
    posthog.init(KEY, {
      api_host: HOST,
      persistence: 'memory', // 쿠키 미사용
      person_profiles: 'identified_only',
      capture_pageview: false, // 페이지뷰는 라우트 변경 시 직접 전송 (App Router)
      capture_pageleave: false, // 공유 토큰 등 현재 URL이 자동 이벤트에 포함되지 않도록 한다
      autocapture: false, // DOM 자동 수집 금지 (입력값 유출 방지)
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
    });
    initialized = true;
  } catch {
    /* 분석 실패가 UX 를 막지 않게 */
  }
}

type Props = Record<string, string | number | boolean | null | undefined>;
type SafeProps = Record<string, string | number | boolean>;

/** 화이트리스트 기반 이벤트 전송 — 허용된 스칼라만 통과시킨다. */
function sanitize(props: Props): SafeProps {
  const safe: SafeProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') safe[k] = v.slice(0, 100);
    else if (typeof v === 'number' || typeof v === 'boolean') safe[k] = v;
  }
  return safe;
}

function sendPosthog(event: string, props: SafeProps) {
  if (!KEY) return;
  initAnalytics();
  try {
    posthog.capture(event, props);
  } catch {
    /* noop */
  }
}

/**
 * GA4 는 이벤트 이름이 40자·영숫자/밑줄로 제한되고, 보고서 표준 이름을 쓰는 편이 좋다.
 * 마케팅 KPI 5종(photo_upload·sticker_export·preview_generated·checkout_click·purchase)에
 * 내부 이름을 매핑해 한 이벤트는 GA4 에 한 번만 보낸다.
 */
const GA4_EVENT_NAMES: Record<string, string> = {
  photo_analyzed: 'photo_upload',
  sheet_created: 'preview_generated',
  export_sticker: 'sticker_export',
  share_create_landing: 'share_landing_view',
};

function gaName(event: string) {
  return GA4_EVENT_NAMES[event] ?? event;
}

function sendGa4(event: string, props: SafeProps) {
  // PostHog 전용 의사 이벤트($pageview 등)는 GA4 로 보내지 않는다(쓰레기 이벤트 방지).
  if (event.startsWith('$')) return;
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  try {
    gtag('event', gaName(event), props);
  } catch {
    /* noop */
  }
}

export function track(event: string, props: Props = {}) {
  const safe = sanitize(props);
  sendPosthog(event, safe);
  sendGa4(event, safe);
}

export function pageview(path: string, opts: { ga?: boolean } = {}) {
  sendPosthog('$pageview', { path });
  if (opts.ga === false) return;
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  try {
    gtag('event', 'page_view', {
      page_path: path,
      // UTM 이 붙은 실제 URL 을 넘겨 캠페인 판정이 되게 한다.
      page_location: window.location.href.split('#')[0],
      page_title: document.title,
    });
  } catch {
    /* noop */
  }
}

/** 가입/결제 완료 시점에만 호출 — id 는 내부 사용자 식별자(이메일·전화번호 아님). */
export function identifyUser(userId: string, props: { plan?: string } = {}) {
  if (!KEY) return;
  initAnalytics();
  try {
    posthog.identify(userId, props);
  } catch {
    /* noop */
  }
}
