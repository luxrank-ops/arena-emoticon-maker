'use client';

import posthog from 'posthog-js';

// ─────────────────────────────────────────────────────────────
// 프로덕트 분석 (PostHog)
//  · NEXT_PUBLIC_POSTHOG_KEY 가 없으면 모든 호출이 no-op → 로컬/CI 안전
//  · persistence: 'memory' — 쿠키/로컬스토리지에 식별자를 남기지 않는다
//    (국내 개인정보보호법상 쿠키 기반 분석은 사전 동의가 필요. 메모리 모드는 동의 전에도 안전)
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
      capture_pageleave: true,
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

/** 화이트리스트 기반 이벤트 전송 — 허용된 스칼라만 통과시킨다. */
export function track(event: string, props: Props = {}) {
  if (!KEY) return;
  initAnalytics();
  const safe: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') safe[k] = v.slice(0, 60);
    else if (typeof v === 'number' || typeof v === 'boolean') safe[k] = v;
  }
  try {
    posthog.capture(event, safe);
  } catch {
    /* noop */
  }
}

export function pageview(path: string) {
  track('$pageview', { path });
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
