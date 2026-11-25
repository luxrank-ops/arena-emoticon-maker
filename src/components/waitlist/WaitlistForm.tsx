'use client';

import { useState } from 'react';
import { rememberedShareAttribution } from '@/lib/share-attribution';
import type { Locale } from '@/lib/i18n/locale';

interface Props {
  locale: Locale;
  initialTotal: number;
}

const COPY = {
  ko: {
    emailLabel: '이메일 주소',
    emailPh: 'you@example.com',
    submit: '사전예약 신청하기',
    sending: '신청 중…',
    privacy: '입력한 이메일은 출시 알림 발송에만 사용하고, 출시 후 파기합니다.',
    doneTitle: '사전예약 완료! 🎉',
    doneBody: '12월 7일 출시일에 가장 먼저 알려드릴게요. 친구를 초대하면 출시 후 크레딧을 드립니다.',
    inviteCta: '친구에게 알리기',
    copyLink: '링크 복사',
    copied: '복사됨!',
    kakao: '카톡으로 공유',
    count: (n: number) => `${n.toLocaleString('ko-KR')}명이 사전예약 중`,
    invalid: '이메일 주소를 확인해 주세요.',
    error: '잠시 후 다시 시도해 주세요.',
  },
  en: {
    emailLabel: 'Email address',
    emailPh: 'you@example.com',
    submit: 'Notify me at launch',
    sending: 'Submitting…',
    privacy: 'Your email is only used for the launch notice and deleted afterwards.',
    doneTitle: 'You are on the list! 🎉',
    doneBody: 'We will tell you first on launch day. Invite friends to earn launch credits.',
    inviteCta: 'Tell a friend',
    copyLink: 'Copy link',
    copied: 'Copied!',
    kakao: 'Share via KakaoTalk',
    count: (n: number) => `${n.toLocaleString('en-US')} people waiting`,
    invalid: 'Please check your email address.',
    error: 'Please try again in a moment.',
  },
} as const;

export function WaitlistForm({ locale, initialTotal }: Props) {
  const t = COPY[locale === 'en' ? 'en' : 'ko'];
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(initialTotal);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (busy || done) return;
    setError('');
    const value = email.trim();
    if (!/^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/.test(value)) {
      setError(t.invalid);
      return;
    }
    setBusy(true);
    try {
      const utm = rememberedShareAttribution();
      const params = new URLSearchParams(window.location.search);
      const content = params.get('utm_content');
      let refCode: string | undefined;
      try {
        const saved = localStorage.getItem('emotime:invite:ref:v1');
        if (saved && /^[a-f0-9]{8}$/.test(saved)) refCode = saved;
      } catch { /* 무시 */ }
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: value,
          utm: utm ? { source: utm.source, medium: utm.medium, campaign: utm.campaign, content: content || undefined } : undefined,
          refCode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) throw new Error(data?.message || t.error);
      setTotal(typeof data?.total === 'number' ? data.total : total + 1);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    const url = `${window.location.origin}/waitlist?utm_source=waitlist&utm_medium=share&utm_campaign=launch1207`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t.error);
    }
  }

  async function shareKakao() {
    const url = `${window.location.origin}/waitlist?utm_source=kakaotalk&utm_medium=share&utm_campaign=launch1207`;
    const text = locale === 'en'
      ? 'EmotiHak pre-registration is open — get notified at launch!'
      : '이모티학 사전예약 오픈! 출시 소식을 가장 먼저 받아보세요.';
    // Web Share 우선(모바일 카톡 공유 시트), 미지원이면 링크 복사
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, text, url });
        return;
      }
    } catch { /* 취소·미지원 → 복사 폴백 */ }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t.error);
    }
  }

  return (
    <div>
      <p role="status" className="text-center text-sm font-black text-primary-dark">{t.count(total)}</p>
      {!done ? (
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          <label className="sr-only" htmlFor="waitlist-email">{t.emailLabel}</label>
          <input
            id="waitlist-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPh}
            className="h-12 flex-1 rounded-2xl border border-line bg-white px-4 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-sub/60 focus:border-primary"
          />
          <button type="submit" disabled={busy} className="btn-primary h-12 whitespace-nowrap !px-6 text-sm disabled:opacity-60">
            {busy ? t.sending : t.submit}
          </button>
        </form>
      ) : (
        <div className="mt-4 rounded-2xl bg-primary/5 px-4 py-5 text-center">
          <p className="text-lg font-black">{t.doneTitle}</p>
          <p className="mt-1 break-keep text-[13px] leading-relaxed text-sub">{t.doneBody}</p>
          <p className="mt-4 text-xs font-black text-primary-dark">{t.inviteCta}</p>
          <div className="mt-2 flex justify-center gap-2">
            <button type="button" onClick={() => void shareKakao()} className="btn-primary h-10 !px-4 text-[13px]">💬 {t.kakao}</button>
            <button type="button" onClick={() => void copyLink()} className="h-10 rounded-full border border-line bg-white px-4 text-[13px] font-bold">
              {copied ? t.copied : t.copyLink}
            </button>
          </div>
        </div>
      )}
      {error && !done ? <p role="alert" className="mt-2 text-center text-xs font-bold text-red-600">{error}</p> : null}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-sub">{t.privacy}</p>
    </div>
  );
}
