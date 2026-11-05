'use client';

import { useEffect, useRef, useState } from 'react';
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
  requiresRedraw,
  onClose,
  onDownload,
  onShare,
  onSaveCaption,
}: {
  frame: FrameView;
  packId: string;
  locale?: Locale;
  busy: 'download' | 'share' | null;
  notice: string | null;
  requiresRedraw: boolean;
  onClose: () => void;
  onDownload: () => void;
  onShare: () => void;
  onSaveCaption: (line: string) => Promise<void>;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(frame.line);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
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

  useEffect(() => {
    if (editing) captionRef.current?.focus();
  }, [editing]);

  async function saveCaption() {
    if (saving || busy) return;
    setSaving(true);
    setEditError(null);
    try {
      await onSaveCaption(draft);
      setEditing(false);
    } catch (cause) {
      setEditError((cause as Error).message || t('대사를 저장하지 못했어요.', 'Could not save the caption.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-cyber/45 backdrop-blur-[3px] motion-safe:animate-fade-in sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !busy && !saving) onClose(); }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="frame-sheet-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-line bg-paper shadow-pop motion-safe:animate-sheet-up sm:rounded-[24px]"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 px-5 pt-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-coralink">{t('개별 이모티콘 관리', 'Manage sticker')}</p>
            <h2 id="frame-sheet-title" className="mt-1 text-lg font-black">{frame.label}</h2>
          </div>
          <button type="button" data-sheet-close aria-label={t('바텀 시트 닫기', 'Close bottom sheet')} onClick={onClose} disabled={!!busy || saving} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line bg-cream text-2xl font-semibold hover:border-primary hover:text-primary-dark disabled:opacity-40">×</button>
        </div>

        <div className="px-5 pb-5 pt-3">
          <div className="mx-auto max-w-[230px] rounded-2xl border-2 border-line bg-cream p-3">
            <Sticker spec={frame.spec} ariaLabel={t(`${frame.label} 컷 크게 보기`, `${frame.label} sticker preview`)} />
          </div>
          <p className="mt-3 text-center text-sm font-bold">“{frame.line}”</p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {editing ? (
              <form className="col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-3" onSubmit={(event) => { event.preventDefault(); void saveCaption(); }}>
                <label htmlFor="sheet-caption" className="text-xs font-semibold text-cyber">{t('이모티콘 대사', 'Sticker caption')}</label>
                <div className="relative mt-1">
                  <input
                    ref={captionRef}
                    id="sheet-caption"
                    value={draft}
                    maxLength={34}
                    onChange={(event) => setDraft(event.target.value)}
                    className="min-h-12 w-full rounded-xl border border-line bg-white px-3 py-3 pr-14 text-base font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder={t('짧은 대사를 입력해 주세요', 'Enter a short caption')}
                  />
                  {draft ? <button type="button" aria-label={t('대사 전체 지우기', 'Clear caption')} title={t('대사 전체 지우기', 'Clear caption')} onMouseDown={(event) => event.preventDefault()} onClick={() => { setDraft(''); captionRef.current?.focus(); }} className="absolute right-0.5 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full text-xl font-semibold text-sub hover:bg-primary/10 hover:text-primary-dark">×</button> : null}
                </div>
                {requiresRedraw ? <p className="mt-2 text-[11px] leading-relaxed text-sub">{t('AI 컷은 저장 후 표정·세부 편집에서 다시 그려야 이미지에 반영돼요.', 'For AI stickers, open expression and advanced editing after saving to redraw the image.')}</p> : null}
                {editError ? <p role="alert" className="mt-2 text-xs font-semibold text-primary-dark">{editError}</p> : null}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className="btn-ghost min-h-12 !py-3" disabled={saving} onClick={() => { setEditing(false); setEditError(null); }}>{t('취소', 'Cancel')}</button>
                  <button type="submit" className="btn-primary min-h-12 !py-3" disabled={saving || !!busy}>{saving ? t('저장 중…', 'Saving…') : t('대사 저장', 'Save caption')}</button>
                </div>
              </form>
            ) : (
              <>
                <button type="button" className="btn-ghost min-h-12 !px-3 !py-3" onClick={() => { setDraft(frame.line); setEditError(null); setEditing(true); }}>
                  {t('텍스트 수정하기', 'Edit text')}
                </button>
                <Link href={lp(`/editor/${packId}/${frame.id}`)} className="btn-ghost min-h-12 !px-3 !py-3 text-center">
                  {t('표정·세부 편집', 'Expression & advanced edit')}
                </Link>
              </>
            )}
          </div>
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
