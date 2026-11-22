'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { Sticker } from '@/components/Sticker';
import { ConsistencyNotice } from '@/components/studio/ConsistencyNotice';
import { FrameBottomSheet } from '@/components/studio/FrameBottomSheet';
import { compressPhotoFile, loadPhoto, renderImage, runLimited, savePhoto } from '@/lib/studio/photo';
import { downloadBlob, exportKakaoPackZip, exportPackZip, renderComboPreview, renderPngBlob } from '@/lib/export';
import { formatKstDateTime } from '@/lib/time';
import { formatBytes, KAKAO_RULES, type PackValidation } from '@/lib/packager';
import { packFormatById } from '@/lib/pack-formats';
import { MOTION_TEMPLATES, type MotionId } from '@/lib/studio/motion';
import { designSheetChecklist, isCharacterDesignSheet } from '@/lib/ai/character-sheet';
import type { TextLayer } from '@/lib/studio/layers';
import type { FrameView, Pack, Plan } from '@/lib/types';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';
import { shareKakaoFeed } from '@/lib/kakao-share';
import { CheckoutButton } from '@/components/payments/CheckoutButton';
import type { PackExportState } from '@/lib/packs';
import type { ReviewSheet } from '@/lib/reviewer-sheet';
import type { ReferralSummary } from '@/lib/referral';
import { PREVIEW_WATERMARK, TRIAL_MESSAGES } from '@/lib/trial-policy';

export function PackViewer({
  pack: initialPack,
  frames: initialFrames,
  ready: _initialReady,
  total,
  watermark,
  kakao,
  exportState,
  reviewSheet = null,
  invite = null,
  checkoutReady = true,
  locale = 'ko',
}: {
  pack: Pack;
  frames: FrameView[];
  ready: number;
  total: number;
  watermark: boolean;
  kakao: { validation: PackValidation; packaging: boolean; plan: Plan };
  /** 잠금 해제 상태 — 무료 미리보기 팩은 이 값으로 내보내기를 잠근다 */
  exportState?: PackExportState;
  reviewSheet?: ReviewSheet | null;
  invite?: ReferralSummary | null;
  /** 토스 결제가 준비됐는지 — 아니면 잠금 해제 버튼을 '결제 준비 중'으로 막는다 */
  checkoutReady?: boolean;
  locale?: Locale;
}) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);
  const [frames, setFrames] = useState(initialFrames);
  const [zipBusy, setZipBusy] = useState(false);
  const [kakaoBusy, setKakaoBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [kakaoNotice, setKakaoNotice] = useState<string | null>(null);
  const [kakaoFiles, setKakaoFiles] = useState<{ name: string; bytes: number }[] | null>(null);
  const [photoMissing, setPhotoMissing] = useState(false);
  const [genErrors, setGenErrors] = useState<Record<string, string>>({});
  const [genRound, setGenRound] = useState(0);
  const [generating, setGenerating] = useState(false);
  const aiPack = initialPack.renderer === 'ai';
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<'download' | 'share' | null>(null);
  const [sheetNotice, setSheetNotice] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [outline, setOutline] = useState(4);
  const [kakaoMotion, setKakaoMotion] = useState<MotionId | 'none'>('none');
  const [kakaoAnim, setKakaoAnim] = useState<'apng' | 'gif'>('apng');
  const [secondPreview, setSecondPreview] = useState<string | null>(null);
  const [comboBusy, setComboBusy] = useState<string | null>(null);
  const [comboNotice, setComboNotice] = useState<string | null>(null);
  const formatInfo = initialPack.format ? packFormatById(initialPack.format) : undefined;
  const unlocked = exportState?.unlocked ?? !watermark;
  const locked = !unlocked;
  const lockWatermark = initialPack.preview?.watermark ?? PREVIEW_WATERMARK;
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const finalizedRef = useRef(false);
  const duoScope = `duo:${initialPack.id}` as const;
  const closeSheet = useCallback(() => { setSelectedId(null); setShareLink(null); }, []);

  // AI 컷 생성: 아직 이미지가 없는 컷만 3개씩 병렬로 만든다 (사진은 이 탭의 임시 보관본)
  useEffect(() => {
    if (!aiPack) return;
    const missing = frames.filter((f) => !f.spec.imageUrl && !genErrors[f.id]).map((f) => f.id);
    if (missing.length === 0) return;
    const photo = loadPhoto(`pack:${initialPack.id}`);
    if (!photo) {
      setPhotoMissing(true);
      return;
    }
    if (formatInfo?.needsSecondPhoto) {
      const duo = loadPhoto(duoScope);
      setSecondPreview(duo);
      // 두 번째 사진이 없으면 생성 요청을 보내지 않는다 (서버도 SECOND_PHOTO_REQUIRED 로 막는다)
      if (!duo) return;
    }
    setGenerating(true);
    void runLimited(missing, 3, async (id) => {
      try {
        const url = await renderImage({ kind: 'frame', frameId: id }, photo, `pack:${initialPack.id}`, initialPack.subjectKind ?? 'person', formatInfo?.needsSecondPhoto ? duoScope : undefined);
        setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, spec: { ...f.spec, imageUrl: url } } : f)));
      } catch (e) {
        setGenErrors((prev) => ({ ...prev, [id]: locale === 'en' ? 'Generation failed. Try again.' : (e as Error).message }));
      }
    }).finally(() => setGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genRound]);

  // 잠금 해제 직후: 미리보기(Flash)로 그린 12컷을 고화질(화풍별 최상위 모델)로 한 번 다시 그린다.
  //  · 추가 결제 없음(finalize) · 사진이 이 탭에 없으면 팩 화면에서 다시 올리면 된다.
  useEffect(() => {
    if (locked || !initialPack.preview || initialPack.hiResAt || finalizedRef.current) return;
    const photo = loadPhoto(`pack:${initialPack.id}`);
    if (!photo) return;
    finalizedRef.current = true;
    setFinalizing(true);
    const ids = frames.filter((frame) => frame.spec.imageUrl).map((frame) => frame.id);
    void runLimited(ids, 2, async (id) => {
      try {
        const url = await renderImage({ kind: 'frame', frameId: id, finalize: true }, photo, `pack:${initialPack.id}`, initialPack.subjectKind ?? 'person', formatInfo?.needsSecondPhoto ? duoScope : undefined);
        setFrames((prev) => prev.map((frame) => (frame.id === id ? { ...frame, spec: { ...frame.spec, imageUrl: url } } : frame)));
      } catch {
        // 한 컷 실패는 무시한다 — 필요하면 '실패한 컷 다시 그리기'로 재시도한다.
      }
    }).finally(() => setFinalizing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  async function copyInvite() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.link);
      setInviteNotice(t('초대 링크를 복사했어요. 친구에게 보내 보세요!', 'Invite link copied. Send it to a friend!'));
    } catch {
      setInviteNotice(t('링크를 길게 눌러 직접 복사해 주세요.', 'Long-press the link to copy it.'));
    }
  }

  async function copyReviewSheet() {
    if (!reviewSheet) return;
    const text = [
      '[캐릭터 컨셉]', reviewSheet.concept, '',
      '[이모티콘 제목 후보]', ...reviewSheet.titles.map((title, index) => `${index + 1}. ${title}`), '',
      '[해시태그 10개]', reviewSheet.hashtags.map((tag) => `#${tag}`).join(' '),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setInviteNotice(t('심사 시트를 복사했어요.', 'Review sheet copied.'));
    } catch {
      setInviteNotice(t('복사하지 못했어요. 화면에서 직접 선택해 주세요.', 'Could not copy. Please select the text manually.'));
    }
  }

  async function deletePackNow() {
    const ok = window.confirm(t(
      '이 팩과 컷 이미지를 모두 삭제할까요?\n삭제한 이미지는 복구할 수 없고, 삭제만으로 자동 환불되지는 않습니다. 환불 가능 여부는 정책을 확인해 주세요.',
      'Delete this pack and all of its images?\nDeleted images cannot be restored. Deleting a pack does not automatically issue a refund; review the refund policy for eligibility.',
    ));
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/packs/${initialPack.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) throw new Error(locale === 'en' ? 'The pack could not be deleted.' : (json?.error?.message ?? '삭제하지 못했어요'));
      router.push(lp('/studio/upload'));
      router.refresh();
    } catch (e) {
      setNotice(locale === 'en' ? 'Something went wrong. Please try again.' : (e as Error).message);
      setDeleting(false);
    }
  }

  async function onPickPhoto(file: File) {
    try {
      savePhoto(await compressPhotoFile(file), `pack:${initialPack.id}`);
      setPhotoMissing(false);
      setGenRound((r) => r + 1);
    } catch (e) {
      setNotice(locale === 'en' ? 'Something went wrong. Please try again.' : (e as Error).message);
    }
  }

  function retryFailed() {
    setGenErrors({});
    setGenRound((r) => r + 1);
  }

  // AI 팩은 이미지가 실제로 생성돼야 완성 컷으로 본다 (시간 기반 가짜 완료 금지)
  const visible = frames.map((f) => ({ ...f, ready: aiPack ? !!f.spec.imageUrl : f.ready }));
  const ready = visible.filter((f) => f.ready).length;
  const done = ready >= total;
  const selectedFrame = visible.find((frame) => frame.id === selectedId && frame.ready) ?? null;

  async function downloadOne(f: FrameView) {
    setActionBusy('download');
    setSheetNotice(null);
    try {
      const blob = await renderPngBlob(f.spec, { watermark, outline });
      downloadBlob(blob, `${initialPack.id}-${f.index + 1}-${f.label}.png`);
      setSheetNotice(t('PNG를 기기에 저장했어요.', 'Saved the PNG to your device.'));
    } catch {
      setSheetNotice(t('PNG를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', 'Could not save the PNG. Please try again.'));
    } finally {
      setActionBusy(null);
    }
  }

  async function shareOne(f: FrameView) {
    setActionBusy('share');
    setSheetNotice(null);
    setShareLink(null);
    try {
      const blob = await renderPngBlob(f.spec, { watermark, watermarkText: lockWatermark });
      const filename = `${initialPack.id}-${f.index + 1}-${f.label}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      const title = t(`이모티학 ${f.label} 이모티콘`, `EmotiHak ${f.label} sticker`);
      let feed: { title: string; description: string; imageUrl: string; resultUrl: string; createUrl: string } | null = null;
      try {
        const res = await fetch(`/api/packs/${initialPack.id}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frameId: f.id }) });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error?.message ?? 'share link failed');
        const tracking = new URLSearchParams({ utm_source: 'kakaotalk', utm_medium: 'share', utm_campaign: 'emoticon_share' });
        if (invite) tracking.set('ref', invite.code);
        const resultUrl = new URL(json.share.path, window.location.origin);
        resultUrl.search = tracking.toString();
        const createUrl = new URL('/studio/upload', window.location.origin);
        if (invite) tracking.set('ref', invite.code);
        createUrl.search = tracking.toString();
        setShareLink(resultUrl.toString());
        feed = { title: json.share.title, description: json.share.description, imageUrl: new URL(json.share.imagePath, window.location.origin).toString(), resultUrl: resultUrl.toString(), createUrl: createUrl.toString() };
      } catch {
        setSheetNotice(t('결과 링크를 만들지 못해 PNG 공유로 진행합니다.', 'Could not create a result link, so PNG sharing will be used.'));
      }

      if (feed) {
        try {
          if (await shareKakaoFeed(feed)) {
            setSheetNotice(t('카카오톡 공유 창을 열었어요. 전송 여부는 카카오톡에서 확인해 주세요.', 'The KakaoTalk share dialog was opened. Check KakaoTalk to confirm whether you sent it.'));
            return;
          }
        } catch {
          setSheetNotice(t('카카오 직접 공유를 열지 못해 시스템 공유로 전환합니다.', 'Direct Kakao sharing could not open, so system sharing will be used.'));
        }
      }

      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text: `${title}\n${f.line}` });
        setSheetNotice(t('시스템 공유창에서 카카오톡을 선택해 주세요.', 'Choose KakaoTalk in the system share sheet.'));
      } else if (typeof navigator.share === 'function') {
        const shareText = [feed?.description ?? `${title}\n${f.line}`, locked ? `${PREVIEW_WATERMARK}\n${invite?.link ?? ''}` : ''].filter(Boolean).join('\n');
        await navigator.share({ title, text: shareText.trim(), url: feed?.resultUrl ?? invite?.link });
        setSheetNotice(t('시스템 공유창을 열었어요.', 'The system share sheet was opened.'));
      } else {
        downloadBlob(blob, filename);
        setSheetNotice(t('PNG를 저장했어요. 카카오톡에서 사진으로 볼 수 있고 결과 링크도 복사할 수 있어요.', 'The PNG was saved. You can send it as a photo in KakaoTalk or copy the result link.'));
      }
    } catch (cause) {
      if ((cause as Error).name !== 'AbortError') setSheetNotice(t('공유를 준비하지 못했어요. PNG 저장을 이용해 주세요.', 'Could not prepare sharing. Please save the PNG instead.'));
    } finally {
      setActionBusy(null);
    }
  }

  async function copyShareLink() {
    if (!shareLink) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('copy failed');
      }
      setSheetNotice(t('결과 링크를 복사했어요.', 'Copied the result link.'));
    } catch {
      setSheetNotice(t('링크를 길게 눌러 직접 복사해 주세요.', 'Long-press the link to copy it manually.'));
    }
  }

  async function revokeShareLink(frameId: string) {
    setActionBusy('share');
    try {
      const res = await fetch(`/api/packs/${initialPack.id}/share`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ frameId }) });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error('revoke failed');
      setShareLink(null);
      setSheetNotice(t('이 컷의 공유 링크를 모두 해제했어요.', 'Revoked all shared links for this sticker.'));
    } catch {
      setSheetNotice(t('링크를 해제하지 못했어요. 잠시 후 다시 시도해 주세요.', 'Could not revoke the link. Please try again.'));
    } finally {
      setActionBusy(null);
    }
  }

  async function saveCaption(frameId: string, line: string) {
    const res = await fetch(`/api/frames/${frameId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(locale === 'en' ? 'Could not save the caption.' : (json?.error?.message ?? '대사를 저장하지 못했어요.'));
    setFrames((previous) => previous.map((frame) => frame.id === frameId ? {
      ...json.frame,
      ready: frame.ready,
      spec: { ...json.frame.spec, imageUrl: frame.spec.imageUrl },
    } : frame));
    setSheetNotice(aiPack
      ? t('대사를 저장했어요. 표정·세부 편집에서 AI 컷을 다시 그려야 이미지에 반영됩니다.', 'Caption saved. Open expression and advanced editing to redraw the AI sticker.')
      : t('대사를 저장하고 미리보기에 반영했어요.', 'Caption saved and applied to the preview.'));
  }

  async function downloadZip() {
    setZipBusy(true);
    setNotice(null);
    try {
      const items = visible
        .filter((f) => f.ready)
        .map((f) => ({ spec: f.spec, filename: `${String(f.index + 1).padStart(2, '0')}-${f.label}` }));
      const blob = await exportPackZip(items, { watermark, watermarkText: lockWatermark, outline });
      downloadBlob(blob, `emotihak-${initialPack.id}.zip`);
      setNotice(t(`${items.length}컷을 ZIP으로 내려받았어요.`, `Downloaded ${items.length} cuts as a ZIP file.`));
    } finally {
      setZipBusy(false);
    }
  }

  async function onSecondPhoto(file: File) {
    try {
      const compressed = await compressPhotoFile(file);
      savePhoto(compressed, duoScope);
      setSecondPreview(compressed);
      setGenErrors({});
      setGenRound((round) => round + 1);
    } catch (e) {
      setNotice(locale === 'en' ? 'Something went wrong. Please try again.' : (e as Error).message);
    }
  }

  async function previewCombo(top: FrameView) {
    if (!top.comboPairId) return;
    const bottom = visible.find((frame) => frame.id === top.comboPairId);
    if (!bottom?.ready) {
      setComboNotice(t('짝이 되는 아래 컷이 아직 준비되지 않았어요.', 'The paired lower panel is not ready yet.'));
      return;
    }
    setComboBusy(top.id);
    setComboNotice(null);
    try {
      const blob = await renderComboPreview(top.spec, bottom.spec, { watermark, outline });
      downloadBlob(blob, `emotihak-combo-${initialPack.id}-${top.index + 1}.png`);
      setComboNotice(t('위아래로 이어지는 2단 합체 미리보기를 저장했어요. 두 장을 연달아 보내면 그림이 이어집니다.', 'Saved the stacked combo preview. Send the two panels one after another and they connect.'));
    } catch {
      setComboNotice(t('합체 미리보기를 만들지 못했어요. 잠시 후 다시 시도해 주세요.', 'Could not build the combo preview. Please try again.'));
    } finally {
      setComboBusy(null);
    }
  }

  function applyLayers(frameId: string, layers: TextLayer[]) {
    setFrames((previous) => previous.map((frame) => frame.id === frameId
      ? { ...frame, textLayers: layers, spec: { ...frame.spec, textLayers: layers } }
      : frame));
  }

  async function downloadKakao() {
    setKakaoBusy(true);
    setKakaoNotice(null);
    try {
      const items = visible
        .filter((f) => f.ready)
        .map((f) => ({ spec: f.spec, filename: `${f.index + 1}-${f.label}` }));
      const result = await exportKakaoPackZip(items, {
        watermark,
        watermarkText: lockWatermark,
        outline,
        motion: kakaoMotion,
        animationFormat: kakaoAnim,
        ...(reviewSheet ? { reviewSheet: { concept: reviewSheet.concept, titles: reviewSheet.titles, hashtags: reviewSheet.hashtags, checklist: reviewSheet.checklist, cutCount: reviewSheet.cutCount } } : {}),
        ...(invite ? { inviteLink: invite.link } : {}),
      });
      downloadBlob(result.blob, `emotihak-kakao-${initialPack.id}.zip`);
      setKakaoFiles(result.files);
      setKakaoNotice(
        result.validation.ok
          ? `${result.files.length}종 · ${KAKAO_RULES.size}×${KAKAO_RULES.size}px 패키징 완료 · 자동 압축 ${result.compressed}개 (${result.validation.summary})`
          : `패키징은 완료했지만 규격 미충족: ${result.validation.summary}`,
      );
    } catch {
      setKakaoNotice('패키징에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setKakaoBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {aiPack ? <ConsistencyNotice scope={`pack:${initialPack.id}`} subjectKind={initialPack.subjectKind ?? 'person'} locale={locale} /> : null}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">{initialPack.title}</p>
            <p className="text-xs text-sub">
              {t(`${initialPack.size}컷 · ${initialPack.creditsSpent}크레딧 사용`, `${initialPack.size} cuts · ${initialPack.creditsSpent} credits used`)}{' '}·{' '}
              {formatKstDateTime(initialPack.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'chip',
                done ? '!border-mint/60 !bg-mint/10 !text-ink' : '!border-coral/50 !bg-coral/10 !text-coralink',
              )}
            >
              {done ? t('● 생성 완료', '● Complete') : t('● 생성 중', '● Generating')}
            </span>
            <span className="text-sm font-black">
              {ready}/{total}
            </span>
          </div>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-line/70">
          <div
            className="h-full rounded-full bg-coral transition-[width] duration-500"
            style={{ width: `${Math.round((ready / total) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {locked ? (
            <a href="#unlock" className="btn-primary !py-2 text-xs">
              {t('잠금 해제하고 내려받기', 'Unlock to download')}
            </a>
          ) : (
            <button className="btn-dark !py-2 text-xs" disabled={!done || zipBusy} onClick={downloadZip}>
              {zipBusy ? t('ZIP 만드는 중…', 'Preparing ZIP…') : t('전체 PNG ZIP 다운로드', 'Download all PNGs (.zip)')}
            </button>
          )}
          {locale === 'ko' && !locked ? <Link href="/reply" className="btn-ghost !py-2 text-xs">톡 답장에 쓰기</Link> : null}
          <button
            onClick={deletePackNow}
            disabled={deleting}
            className="rounded-full border border-coral/50 px-3 py-2 text-xs font-bold text-coralink hover:bg-coral/10 disabled:opacity-50"
          >
            {deleting ? t('삭제 중…', 'Deleting…') : t('팩 삭제', 'Delete pack')}
          </button>
          {locked ? <span className="chip !border-coral/50 !bg-coral/10 !text-coralink">{t('미리보기 · 내보내기 잠김', 'Preview · export locked')}</span> : null}
          {finalizing ? <span className="chip !bg-primary/10 !text-primary-dark">{t('고화질로 다시 그리는 중…', 'Rendering at full quality…')}</span> : null}
        </div>
        {notice ? <p className="mt-2 text-xs font-bold text-mint">{notice}</p> : null}
      </div>

      {locked ? (
        <section id="unlock" className="card overflow-hidden scroll-mt-24 border-2 border-primary/40 p-0">
          <div className="bg-primary/10 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-widest text-primary-dark">LOCKED PREVIEW</p>
            <h2 className="mt-1 text-xl font-black break-keep">{t(`${total}컷 완성! 지금은 워터마크 미리보기예요`, `${total} cuts ready — watermarked preview`)}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-sub">
              {t(TRIAL_MESSAGES.lockedExport, 'This pack is a preview. Unlock it to download high-resolution, transparent PNGs and the ZIP.')}
            </p>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-black">
                  {locale === 'en'
                    ? (exportState?.unlockSku === 'pack-unlock-duo' ? 'Duo chemistry pack pass' : exportState?.unlockSku === 'pack-unlock-pet' ? 'Pet butler pack pass' : 'Single pack pass')
                    : (exportState?.unlockTitle ?? '단건 팩 완성권')}
                </p>
                <p className="mt-0.5 text-[11px] text-sub">{t('구독 없음 · 이 팩만 1회 결제', 'No subscription · one-time for this pack')}</p>
              </div>
              <p className="text-2xl font-black">{(exportState?.unlockPrice ?? 5900).toLocaleString('en-US')}<span className="text-sm font-bold text-sub">원</span></p>
            </div>
            <ul className="mt-3 grid gap-1.5 text-[12px] leading-relaxed text-ink/80 sm:grid-cols-2">
              <li>· {t('12컷 고화질 · 투명 PNG', '12 high-resolution transparent PNGs')}</li>
              <li>· {t('워터마크 제거', 'No watermark')}</li>
              <li>· {t('카카오·라인 규격 ZIP', 'Kakao / LINE spec ZIP')}</li>
              <li>· {t('대사·표정 계속 편집', 'Keep editing captions and expressions')}</li>
            </ul>
            <div className="mt-4">
              <CheckoutButton
                sku={exportState?.unlockSku ?? 'pack-unlock-single'}
                packId={initialPack.id}
                disabled={!checkoutReady}
                label={checkoutReady
                  ? t(`${(exportState?.unlockPrice ?? 5900).toLocaleString('en-US')}원으로 잠금 해제`, `Unlock for ₩${(exportState?.unlockPrice ?? 5900).toLocaleString('en-US')}`)
                  : t('결제 준비 중', 'Payment preparing')}
                className="btn-primary w-full !py-4 text-base"
              />
            </div>
            <p className="mt-2 text-center text-[10px] leading-relaxed text-sub">
              {t('결제 즉시 이 팩 전체가 열리고, 12컷을 고화질로 다시 그립니다. 디지털 콘텐츠 사용 시작 후에는 청약철회가 제한될 수 있어요.', 'The whole pack opens right after payment and all cuts are re-rendered at full quality. Digital content usage limits cancellation.')}
            </p>
            {formatInfo?.needsSecondPhoto ? (
              <p className="mt-1 text-center text-[10px] font-bold text-coralink">{t('2인 케미 팩 완성권 7,900원이 적용됩니다.', 'The duo chemistry unlock (₩7,900) applies.')}</p>
            ) : null}
            {initialPack.subjectKind === 'pet' ? (
              <p className="mt-1 text-center text-[10px] font-bold text-coralink">{t('반려동물 집사 밈 완성권 6,900원이 적용됩니다.', 'The pet butler unlock (₩6,900) applies.')}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {invite ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black">🎁 {t('친구 초대하고 3컷 무료 해제', 'Invite a friend, unlock 3 free cuts')}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-sub">
                {t(`내 초대 링크로 친구가 처음 미리보기 팩을 만들면 ${invite.rewardCuts}컷이 무료로 쌓여요. 지금까지 ${invite.invited}명 초대 · ${invite.earnedCuts}컷 적립.`, `When a friend makes their first preview pack from your link, you earn ${invite.rewardCuts} cuts. Invited ${invite.invited} · ${invite.earnedCuts} cuts earned.`)}
              </p>
            </div>
            <button type="button" onClick={() => void copyInvite()} className="btn-ghost min-h-11 shrink-0 !px-4 !py-2 text-xs">{t('초대 링크 복사', 'Copy invite link')}</button>
          </div>
          <p className="mt-2 break-all rounded-xl border border-line bg-cream px-3 py-2 text-[11px] text-sub">{invite.link}</p>
          {inviteNotice ? <p className="mt-2 text-[11px] font-bold text-mint">{inviteNotice}</p> : null}
        </section>
      ) : null}

      {reviewSheet ? (
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black">📝 {t('카카오·라인 작가 심사 시트', 'Kakao / LINE submission sheet')}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-sub">{t('카카오 규격 ZIP에 review-sheet.txt·json으로 함께 들어갑니다. Creator Pro 전용.', 'Included in the Kakao spec ZIP as review-sheet.txt/json. Creator Pro only.')}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => void copyReviewSheet()} className="btn-ghost min-h-10 !px-3 !py-1.5 text-[11px]">{t('복사', 'Copy')}</button>
              <button type="button" onClick={() => setReviewOpen((open) => !open)} className="chip min-h-10">{reviewOpen ? t('접기', 'Hide') : t('미리보기', 'Preview')}</button>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink/80">{reviewSheet.concept}</p>
          <p className="mt-1 text-[11px] font-bold text-coralink">{reviewSheet.titles.slice(0, 3).join(' · ')}</p>
          {reviewOpen ? (
            <div className="mt-3 space-y-3 rounded-xl border border-line bg-cream p-3 text-[11px] leading-relaxed">
              <div>
                <p className="font-black text-ink">{t('캐릭터 컨셉', 'Character concept')}</p>
                <p className="mt-1 text-sub">{reviewSheet.concept}</p>
              </div>
              <div>
                <p className="font-black text-ink">{t('제목 후보', 'Title candidates')}</p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-sub">{reviewSheet.titles.map((title) => <li key={title}>{title}</li>)}</ol>
              </div>
              <div>
                <p className="font-black text-ink">{t('해시태그 10개', '10 hashtags')}</p>
                <p className="mt-1 text-sub">{reviewSheet.hashtags.map((tag) => `#${tag}`).join(' ')}</p>
              </div>
              <div>
                <p className="font-black text-ink">{t('제출 전 체크리스트', 'Pre-submission checklist')}</p>
                <ul className="mt-1 space-y-0.5 text-sub">{reviewSheet.checklist.map((line) => <li key={line}>· {line}</li>)}</ul>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {done && !locked && locale === 'ko' ? (
        <Link
          href={`/goods?pack=${initialPack.id}&bundle=1&frames=${visible.slice(0, 3).map((frame) => frame.id).join(',')}`}
          className="card group flex flex-wrap items-center justify-between gap-3 border-2 border-ink/10 p-5 transition hover:-translate-y-0.5 hover:shadow-pop"
        >
          <div>
            <p className="text-sm font-black">방금 만든 최애 3컷으로 아크릴 키링 · 방수 스티커 만들기</p>
            <p className="mt-1 text-[11px] text-sub">이 팩의 1·2·3번 컷이 그대로 담깁니다 · 굿즈 번들 20% 할인</p>
          </div>
          <span className="text-sm font-black text-coralink group-hover:underline">굿즈로 만들기 →</span>
        </Link>
      ) : null}

      {formatInfo ? (
        <div className="card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip !border-primary/40 !bg-primary/10 !text-primary-dark">{formatInfo.emoji} {locale === 'en' ? formatInfo.labelEn : formatInfo.label}</span>
            {initialPack.textMode === 'layer' ? (
              <span className="chip">{t('AI 글자 없음 · 한글 레이어 합성', 'No AI lettering · Korean layers')}</span>
            ) : null}
            {formatInfo.needsSecondPhoto ? <span className="chip">{t('사진 2장', 'Two photos')}</span> : null}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-sub">{locale === 'en' ? formatInfo.descriptionEn : formatInfo.description}</p>
          {isCharacterDesignSheet(initialPack.designSheet) ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-black text-ink">{t('고정 캐릭터 디자인 시트 (전 컷 공통)', 'Locked character design sheet (all cuts)')}</summary>
              <ul className="mt-2 grid gap-1 text-[11px] text-sub sm:grid-cols-2">
                {designSheetChecklist(initialPack.designSheet).map((row) => (
                  <li key={row.id} className="flex gap-1">
                    <span className="shrink-0 font-bold text-ink">{row.label}:</span>
                    <span className="min-w-0 break-words">{row.value}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {aiPack && (photoMissing || Object.keys(genErrors).length > 0 || generating) ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          {photoMissing ? (
            <>
              <p className="text-sm font-bold">
                {t('이 탭에 사진이 없어 컷을 그릴 수 없어요. 같은 원본 사진을 다시 올려 주세요.', 'This tab no longer has the photo needed to draw your cuts. Please add the same original photo again.')}
              </p>
              <label className="btn-primary cursor-pointer !py-2 text-xs">
                {t('사진 다시 올리기', 'Add photo again')}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f && window.confirm(t('사진은 이미지 생성 전 확인과 생성 시 Google Gemini로 전송됩니다. AI 확인이 어려우면 파일만 확인하는 기본 방식으로 진행하며 일관성은 보장되지 않습니다. 동의하시면 확인을 눌러 주세요.', 'Your photo is sent to Google Gemini for pre-generation review and image creation. If AI review is unavailable, basic file checks are used and consistency is not guaranteed. Select OK to consent.'))) void onPickPhoto(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </>
          ) : generating ? (
            <p className="text-sm font-bold text-sub">{t('AI가 컷을 그리는 중이에요. 완성되는 순서대로 나타납니다.', 'AI is drawing your cuts. They will appear as they finish.')}</p>
          ) : (
            <>
              <p className="text-sm font-bold text-coralink">
                {t(`일부 컷을 그리지 못했어요 (${Object.keys(genErrors).length}컷).`, `${Object.keys(genErrors).length} cuts could not be generated.`)}
              </p>
              <button className="btn-ghost !py-2 text-xs" onClick={retryFailed}>
                {t('실패한 컷 다시 그리기', 'Retry failed cuts')}
              </button>
            </>
          )}
        </div>
      ) : null}

      {formatInfo?.needsSecondPhoto ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold">{t('두 번째 인물 사진', 'Second photo')}</p>
            <p className="mt-0.5 text-xs text-sub">
              {secondPreview
                ? t('두 번째 사진이 연결되었어요. 2인 구도 컷을 만들 수 있어요.', 'Second photo linked. Two-person cuts can be generated.')
                : t('이 팩은 사진 2장이 필요해요. 같은 사진을 다시 올리면 2인 컷을 그려 드립니다.', 'This pack needs two photos. Add the second photo to draw two-person cuts.')}
            </p>
          </div>
          <label className="btn-primary cursor-pointer !py-2 text-xs">
            {secondPreview ? t('사진 변경', 'Change photo') : t('사진 올리기', 'Add photo')}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && window.confirm(t('두 번째 사진도 이미지 생성 시 Google Gemini로 전송되며 서버에 저장되지 않습니다. 계속할까요?', 'The second photo is sent to Google Gemini for generation and is not stored. Continue?'))) void onSecondPhoto(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {visible.map((f) => (
          <article
            key={f.id}
            className={clsx('card overflow-hidden p-0 transition hover:shadow-pop', f.ready ? 'motion-safe:animate-grid-in' : 'opacity-60')}
            style={f.ready ? { animationDelay: `${Math.min(f.index, 15) * 50}ms` } : undefined}
          >
            <button
              type="button"
              disabled={!f.ready}
              aria-haspopup="dialog"
              aria-label={locked
                ? t(`${f.label} 미리보기 (잠김)`, `${f.label} preview (locked)`)
                : f.ready ? t(`${f.label} 컷 관리하기`, `Manage ${f.label} sticker`) : t(`${f.label} 컷 생성 중`, `${f.label} sticker is generating`)}
              onClick={() => { setSelectedId(f.id); setSheetNotice(null); setShareLink(null); }}
              className="group flex h-full w-full flex-col text-left disabled:cursor-wait"
            >
              <div className="relative w-full bg-cream p-2">
                {f.ready ? (
                  <div className="relative">
                    <Sticker spec={f.spec} ariaLabel={t(`${f.label} 컷`, `${f.label} sticker`)} />
                    {locked ? (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl" aria-hidden="true">
                        <span className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[9px] font-black text-white">🔒 {t('미리보기', 'Preview')}</span>
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                          <div className="-rotate-[20deg] space-y-3 text-center opacity-45">
                            {[0, 1].map((row) => (
                              <p key={row} className="whitespace-nowrap text-[8px] font-black leading-none tracking-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">{lockWatermark}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid aspect-square place-items-center rounded-xl bg-[length:200%_100%] bg-gradient-to-r from-line/20 via-line/50 to-line/20 animate-shimmer">
                    <span className="text-[11px] font-bold text-sub">{t('생성 중…', 'Generating…')}</span>
                  </div>
                )}
                <span className="absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full border border-line bg-paper px-1.5 text-[10px] font-bold text-sub">{f.index + 1}</span>
              </div>
              <div className="flex w-full flex-1 flex-col border-t-2 border-line p-3">
                <p className="truncate text-[13px] font-black">{f.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-sub">“{f.line}”</p>
                <span className="mt-2 flex min-h-12 w-full items-center justify-center gap-1 rounded-xl border border-line bg-paper px-2 py-2 text-center text-xs font-semibold transition group-hover:border-primary group-hover:bg-primary/5 group-hover:text-primary-dark">
                  {locked ? t('미리보기 · 공유', 'Preview · share') : f.ready ? t('관리하기', 'Manage') : t('생성 중…', 'Generating…')}{f.ready ? <span aria-hidden="true">↑</span> : null}
                </span>
              </div>
            </button>
          </article>
        ))}
      </div>

      <div className={locale === 'en' || locked ? 'hidden' : 'card p-5'}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-black">카카오 제안 규격 패키저</p>
            <p className="mt-0.5 text-[11px] text-sub">
              {KAKAO_RULES.count}종 · {KAKAO_RULES.size}×{KAKAO_RULES.size}px · 투명 PNG · 개당{' '}
              {formatBytes(KAKAO_RULES.maxBytes)} 이하
            </p>
          </div>
          <span className={clsx('chip', kakao.validation.ok ? '!border-mint/60 !bg-mint/10' : '!border-coral/50 !bg-coral/10 !text-coralink')}>
            {kakao.validation.ok ? '규격 충족' : '규격 미충족'}
          </span>
        </div>

        <ul className="mt-3 grid gap-1.5 text-[12px] sm:grid-cols-2">
          {kakao.validation.checks.map((c) => (
            <li key={c.id} className={clsx('flex items-start gap-1.5', c.pass ? 'text-ink/80' : 'text-coralink')}>
              <span className="font-black">{c.pass ? '✓' : c.blocking ? '✕' : '!'}</span>
              <span>
                <span className="font-bold">{c.label}</span>
                <span className="block text-[10px] leading-snug text-sub">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="btn-primary !py-2 text-xs"
            disabled={!done || kakaoBusy || !kakao.validation.exportable || !kakao.packaging}
            onClick={downloadKakao}
          >
            {kakaoBusy ? '패키징 중…' : '카카오 규격 ZIP 내려받기'}
          </button>
          {!kakao.packaging ? (
            <Link href="/pricing" className="chip !border-coral/50 !bg-coral/10 !text-coralink">
              Studio 플랜에서 사용 가능
            </Link>
          ) : null}
          {kakao.packaging && !kakao.validation.ok ? (
            <span className="text-[11px] leading-relaxed text-sub">
              32종 구성이 아니어도 360px·150KB 기준을 지키면 내 대화방용 ZIP은 받을 수 있어요. 규격 미충족 항목은 validation.json에 남습니다.
            </span>
          ) : null}
        </div>

        {kakaoNotice ? (
          <p className={clsx('mt-2 text-xs font-bold', kakaoNotice.includes('미충족') ? 'text-coralink' : 'text-mint')}>
            {kakaoNotice}
          </p>
        ) : null}
        {kakaoFiles ? (
          <p className="mt-1 text-[10px] text-sub">
            파일 크기: {kakaoFiles.map((f) => `${f.name}(${formatBytes(f.bytes)})`).slice(0, 6).join(', ')}
            {kakaoFiles.length > 6 ? ` 외 ${kakaoFiles.length - 6}개` : ''}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border-2 border-dashed border-line p-4 text-center text-xs leading-relaxed text-sub">
        {locale === 'en' ? <>Share the exported PNG or GIF in chats just like a photo.<br />Every caption remains editable before you download and share.</> : <>
        카톡에서는 내보낸 PNG/GIF를 사진처럼 보내면 됩니다. <br />
        <strong className="text-ink">Studio 플랜</strong>은 카카오 제안 규격(32종·360×360, 개당 150KB) 자동 압축·검증·패키징까지
        자동으로 해드려요.
        </>}
      </div>

      {selectedFrame ? (
        <FrameBottomSheet
          frame={selectedFrame}
          packId={initialPack.id}
          locale={locale}
          busy={actionBusy}
          notice={sheetNotice}
          requiresRedraw={aiPack}
          watermark={watermark}
          onClose={closeSheet}
          downloadDisabled={locked}
          onDownload={() => {
            if (locked) {
              setSheetNotice(t('미리보기는 공유만 할 수 있어요. 잠금 해제하면 고화질로 저장할 수 있습니다.', 'Previews can be shared only. Unlock to save in high resolution.'));
              return;
            }
            void downloadOne(selectedFrame);
          }}
          onShare={() => void shareOne(selectedFrame)}
          shareLink={shareLink}
          onCopyShareLink={() => void copyShareLink()}
          onRevokeShareLink={() => void revokeShareLink(selectedFrame.id)}
          onSaveCaption={(line) => saveCaption(selectedFrame.id, line)}
          onLayersSaved={(layers) => applyLayers(selectedFrame.id, layers)}
        />
      ) : null}
    </div>
  );
}
