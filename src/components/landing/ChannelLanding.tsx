import Link from 'next/link';
import type { Locale } from '@/lib/i18n/locale';
import { localizedPath, tr } from '@/lib/i18n/locale';

export interface ChannelLandingCopy {
  /** UTM campaign 값 (pets | couple | team) */
  campaign: string;
  badge: string;
  title: string;
  subtitle: string;
  bullets: { emoji: string; title: string; body: string }[];
  steps: string[];
  faq: { q: string; a: string }[];
}

interface Props {
  locale: Locale;
  copy: ChannelLandingCopy;
}

export function ChannelLanding({ locale, copy }: Props) {
  const uploadHref = `/studio/upload?utm_source=landing&utm_medium=page&utm_campaign=${copy.campaign}`;
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="card p-6 text-center sm:p-10">
        <span className="chip !border-primary/20 !bg-primary/10 !text-primary-dark">{copy.badge}</span>
        <h1 className="mt-4 break-keep text-3xl font-black leading-tight sm:text-4xl">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-md break-keep text-sm leading-relaxed text-sub">{copy.subtitle}</p>
        <Link href={localizedPath(locale, uploadHref)} className="btn-primary mt-6 w-full !py-4 text-base sm:w-auto sm:!px-10">
          {tr(locale, '무료로 1컷 만들기 →', 'Make one cut free →')}
        </Link>
        <p className="mt-2 text-[11px] font-bold text-sub">
          {tr(locale, '카드 등록 없이 · 원본 사진은 서버에 저장하지 않아요', 'No card required · Originals are never stored on our servers')}
        </p>
        <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          {copy.bullets.map((b) => (
            <div key={b.title} className="rounded-2xl bg-cream px-4 py-4">
              <p className="text-xl">{b.emoji}</p>
              <p className="mt-1 text-[13px] font-black">{b.title}</p>
              <p className="mt-1 break-keep text-xs leading-relaxed text-sub">{b.body}</p>
            </div>
          ))}
        </div>
        <ol className="mx-auto mt-8 max-w-md space-y-2 text-left">
          {copy.steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-white">{i + 1}</span>
              <span className="break-keep text-[13px] font-bold leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-8 space-y-2 text-left">
          {copy.faq.map((item) => (
            <details key={item.q} className="rounded-2xl bg-cream px-4 py-3">
              <summary className="cursor-pointer text-[13px] font-black">{item.q}</summary>
              <p className="mt-1 break-keep text-xs leading-relaxed text-sub">{item.a}</p>
            </details>
          ))}
        </div>
        <Link href={localizedPath(locale, uploadHref)} className="btn-primary mt-8 w-full !py-4 text-base sm:w-auto sm:!px-10">
          {tr(locale, '지금 바로 만들기 →', 'Start now →')}
        </Link>
        <p className="mt-6 text-xs text-sub">
          {tr(locale, '아직 고민 중이면 출시 알림부터 →', 'Still thinking? Get the launch notice →')}{' '}
          <Link href={localizedPath(locale, '/waitlist')} className="font-bold text-coralink underline">
            {tr(locale, '사전예약하기', 'Pre-register')}
          </Link>
        </p>
      </div>
    </section>
  );
}
