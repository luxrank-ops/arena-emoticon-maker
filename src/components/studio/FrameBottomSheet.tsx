'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Sticker } from '@/components/Sticker';
import { ContentReportButton } from '@/components/moderation/ContentReportButton';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';
import type { FrameView } from '@/lib/types';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function FrameBottomSheet({
  frame,
  packId,
  locale = 'ko',
  busy,
  notice,
  onClose,
  onDownload,
  onShare,
}: {
  frame: FrameView;
  packId: string;
  locale?: Locale;
  busy: 'download' | 'share' | null;
  notice: string | null;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.querySelector<HTMLElement>('[data-sheet-close]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;
      const items = [...sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/55 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="frame-sheet-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border-x-2 border-t-2 border-ink bg-paper shadow-pop sm:rounded-[28px] sm:border-b-2"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 px-5 pt-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-coralink">{t('개별 이모티콘 관리', 'Manage sticker')}</p>
            <h2 id="frame-sheet-title" className="mt-1 text-lg font-black">{frame.label}</h2>
          </div>
          <button type="button" data-sheet-close aria-label={t('바텀 시트 닫기', 'Close bottom sheet')} onClick={onClose} disabled={!!busy} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-line bg-cream text-2xl font-bold hover:border-ink disabled:opacity-40">×</button>
        </div>

        <div className="px-5 pb-5 pt-3">
          <div className="mx-auto max-w-[230px] rounded-2xl border-2 border-line bg-cream p-3">
            <Sticker spec={frame.spec} ariaLabel={t(`${frame.label} 컷 크게 보기`, `${frame.label} sticker preview`)} />
          </div>
          <p className="mt-3 text-center text-sm font-bold">“{frame.line}”</p>

          <Link href={lp(`/editor/${packId}/${frame.id}`)} className="btn-ghost mt-4 min-h-12 w-full !py-3">
            {t('텍스트·표정 수정하기', 'Edit text and expression')}<span aria-hidden="true">→</span>
          </Link>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="btn-dark min-h-12 !px-3 !py-3 text-sm" onClick={onShare} disabled={!!busy}>
              {busy === 'share' ? t('공유 준비 중…', 'Preparing…') : t('카카오톡에 공유', 'Share to KakaoTalk')}
            </button>
            <button type="button" className="btn-primary min-h-12 !px-3 !py-3 text-sm" onClick={onDownload} disabled={!!busy}>
              {busy === 'download' ? t('저장 중…', 'Saving…') : t('기기에 PNG 저장', 'Save PNG')}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-sub">
            {t('공유는 모바일 시스템 공유창에서 카카오톡을 선택해 주세요. 지원하지 않는 환경에서는 PNG를 저장한 뒤 사진으로 볼 수 있어요.', 'Choose KakaoTalk in your device’s share sheet. If sharing is unavailable, save the PNG and send it as a photo.')}
          </p>
          {notice ? <p role="status" className="mt-3 rounded-xl border border-line bg-cream p-3 text-center text-xs font-bold text-sub">{notice}</p> : null}
          <div className="mt-3 flex justify-center">
            <ContentReportButton packId={packId} frameId={frame.id} className="min-h-12 rounded-full border border-line px-4 py-3 text-xs font-bold text-sub hover:border-coral hover:text-coralink" />
          </div>
        </div>
      </div>
    </div>
  );
}
