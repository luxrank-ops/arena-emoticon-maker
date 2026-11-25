'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n/locale';
import type { ReferralSummary } from '@/lib/referral';

interface Props {
  locale: Locale;
  summary: ReferralSummary;
}

const COPY = {
  ko: {
    invited: '초대한 친구', cuts: '받은 보너스 컷', cutsUnit: '컷',
    howTitle: '보너스 받는 방법',
    how1: '아래 링크를 친구에게 보낸다',
    how2: '친구가 처음 미리보기 팩을 만든다',
    how3: (n: number) => `나에게 ${n}컷 자동 지급 (하루 최대 5명)`,
    copy: '초대 링크 복사', copied: '복사됨!',
    share: '카톡으로 보내기',
    note: '방문만으로는 지급되지 않아요. 친구가 실제로 만들어야 보너스가 들어옵니다.',
  },
  en: {
    invited: 'Invited friends', cuts: 'Bonus cuts earned', cutsUnit: 'cuts',
    howTitle: 'How to earn',
    how1: 'Send the link below to a friend',
    how2: 'Your friend makes their first preview pack',
    how3: (n: number) => `${n} cuts land automatically (max 5 friends/day)`,
    copy: 'Copy invite link', copied: 'Copied!',
    share: 'Send via KakaoTalk',
    note: 'Visits alone do not pay. Your friend must actually create for the bonus.',
  },
} as const;

export function InvitePanel({ locale, summary }: Props) {
  const t = COPY[locale === 'en' ? 'en' : 'ko'];
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* 클립보드 미지원 환경 */ }
  }

  async function share() {
    const text = locale === 'en'
      ? 'Make stickers from your face in 3 minutes — try one cut free!'
      : '내 얼굴로 3분 만에 이모티콘 만들기 — 1컷 무료!';
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, text, url: summary.link });
        return;
      }
    } catch { /* 취소·미지원 → 복사 폴백 */ }
    void copy();
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-cream px-4 py-4 text-center">
          <p className="text-2xl font-black">{summary.invited}</p>
          <p className="mt-1 text-xs font-bold text-sub">{t.invited}</p>
        </div>
        <div className="rounded-2xl bg-cream px-4 py-4 text-center">
          <p className="text-2xl font-black">+{summary.earnedCuts}<span className="text-sm">{t.cutsUnit}</span></p>
          <p className="mt-1 text-xs font-bold text-sub">{t.cuts}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-coralink">{summary.link}</p>
        <button type="button" onClick={() => void copy()} className="h-9 shrink-0 rounded-full bg-ink px-4 text-[13px] font-bold text-white">
          {copied ? t.copied : t.copy}
        </button>
      </div>
      <button type="button" onClick={() => void share()} className="btn-primary mt-3 h-12 w-full text-sm">
        💬 {t.share}
      </button>
      <div className="mt-6 rounded-2xl bg-cream px-4 py-4 text-left">
        <p className="text-[13px] font-black">{t.howTitle}</p>
        <ol className="mt-2 space-y-1 text-[13px] font-semibold leading-relaxed text-sub">
          <li>1. {t.how1}</li>
          <li>2. {t.how2}</li>
          <li>3. {t.how3(summary.rewardCuts)}</li>
        </ol>
      </div>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-sub">{t.note}</p>
    </div>
  );
}
