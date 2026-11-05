'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { Sticker } from '@/components/Sticker';
import { ConsistencyNotice } from '@/components/studio/ConsistencyNotice';
import { ContentReportButton } from '@/components/moderation/ContentReportButton';
import { compressPhotoFile, loadPhoto, renderImage, runLimited, savePhoto } from '@/lib/studio/photo';
import { downloadBlob, exportKakaoPackZip, exportPackZip, renderPngBlob } from '@/lib/export';
import { formatKstDateTime } from '@/lib/time';
import { formatBytes, KAKAO_RULES, type PackValidation } from '@/lib/packager';
import type { FrameView, Pack, Plan } from '@/lib/types';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';

export function PackViewer({
  pack: initialPack,
  frames: initialFrames,
  ready: _initialReady,
  total,
  watermark,
  kakao,
  locale = 'ko',
}: {
  pack: Pack;
  frames: FrameView[];
  ready: number;
  total: number;
  watermark: boolean;
  kakao: { validation: PackValidation; packaging: boolean; plan: Plan };
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
    setGenerating(true);
    void runLimited(missing, 3, async (id) => {
      try {
        const url = await renderImage({ kind: 'frame', frameId: id }, photo, `pack:${initialPack.id}`, initialPack.subjectKind ?? 'person');
        setFrames((prev) => prev.map((f) => (f.id === id ? { ...f, spec: { ...f.spec, imageUrl: url } } : f)));
      } catch (e) {
        setGenErrors((prev) => ({ ...prev, [id]: locale === 'en' ? 'Generation failed. Try again.' : (e as Error).message }));
      }
    }).finally(() => setGenerating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genRound]);

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

  async function downloadOne(f: FrameView) {
    const blob = await renderPngBlob(f.spec, { watermark });
    downloadBlob(blob, `${initialPack.id}-${f.index + 1}-${f.label}.png`);
  }

  async function downloadZip() {
    setZipBusy(true);
    setNotice(null);
    try {
      const items = visible
        .filter((f) => f.ready)
        .map((f) => ({ spec: f.spec, filename: `${String(f.index + 1).padStart(2, '0')}-${f.label}` }));
      const blob = await exportPackZip(items, { watermark });
      downloadBlob(blob, `emotihak-${initialPack.id}.zip`);
      setNotice(t(`${items.length}컷을 ZIP으로 내려받았어요.`, `Downloaded ${items.length} cuts as a ZIP file.`));
    } finally {
      setZipBusy(false);
    }
  }

  async function downloadKakao() {
    setKakaoBusy(true);
    setKakaoNotice(null);
    try {
      const items = visible
        .filter((f) => f.ready)
        .map((f) => ({ spec: f.spec, filename: `${f.index + 1}-${f.label}` }));
      const result = await exportKakaoPackZip(items, { watermark });
      downloadBlob(result.blob, `emotihak-kakao-${initialPack.id}.zip`);
      setKakaoFiles(result.files);
      setKakaoNotice(
        result.validation.ok
          ? `${result.files.length}종 · ${KAKAO_RULES.size}×${KAKAO_RULES.size}px 패키징 완료 (${result.validation.summary})`
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
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-cream">
          <div
            className="h-full rounded-full bg-coral transition-[width] duration-500"
            style={{ width: `${Math.round((ready / total) * 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-dark !py-2 text-xs" disabled={!done || zipBusy} onClick={downloadZip}>
            {zipBusy ? t('ZIP 만드는 중…', 'Preparing ZIP…') : t('전체 PNG ZIP 다운로드', 'Download all PNGs (.zip)')}
          </button>
          {locale === 'ko' ? <Link href="/reply" className="btn-ghost !py-2 text-xs">톡 답장에 쓰기</Link> : null}
          <button
            onClick={deletePackNow}
            disabled={deleting}
            className="rounded-full border border-coral/50 px-3 py-2 text-xs font-bold text-coralink hover:bg-coral/10 disabled:opacity-50"
          >
            {deleting ? t('삭제 중…', 'Deleting…') : t('팩 삭제', 'Delete pack')}
          </button>
          {locale === 'ko' ? <Link href="/goods" className="btn-ghost !py-2 text-xs">굿즈로 만들기</Link> : null}
          {watermark && locale === 'ko' ? (
            <Link href="/pricing" className="chip !border-coral/50 !bg-coral/10 !text-coralink">
              워터마크 제거는 Plus
            </Link>
          ) : null}
        </div>
        {notice ? <p className="mt-2 text-xs font-bold text-mint">{notice}</p> : null}
      </div>

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((f) => (
          <div
            key={f.id}
            className={clsx(
              'card overflow-hidden p-0 transition',
              f.ready ? 'animate-pop' : 'opacity-60',
            )}
          >
            <div className="relative bg-cream p-2">
              {f.ready ? (
                <Sticker spec={f.spec} ariaLabel={t(`${f.label} 컷`, `${f.label} sticker`)} />
              ) : (
                <div className="grid aspect-square place-items-center rounded-xl bg-[length:200%_100%] bg-gradient-to-r from-line/20 via-line/50 to-line/20 animate-shimmer">
                  <span className="text-[11px] font-bold text-sub">{t('생성 중…', 'Generating…')}</span>
                </div>
              )}
              {!f.ready ? (
                <span className="absolute right-2 top-2 rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] font-bold text-sub">
                  {f.index + 1}
                </span>
              ) : null}
            </div>
            <div className="border-t-2 border-line px-3 py-2">
              <p className="truncate text-[13px] font-black">{f.label}</p>
              <p className="truncate text-[11px] text-sub">“{f.line}”</p>
              <div className="mt-2 flex gap-1">
                <Link
                  href={lp(`/editor/${initialPack.id}/${f.id}`)}
                  className="flex-1 rounded-lg border-2 border-ink bg-paper py-1 text-center text-[11px] font-black hover:bg-lemon/40"
                >
                  {t('편집', 'Edit')}
                </Link>
                <button
                  onClick={() => downloadOne(f)}
                  disabled={!f.ready}
                  title={f.ready ? t('이 컷을 PNG로 저장', 'Download this cut as PNG') : t('생성 중', 'Generating')}
                  className="rounded-lg border border-line px-2 py-1 text-[11px] font-bold text-sub hover:border-ink disabled:opacity-40"
                >
                  PNG
                </button>
                {f.ready ? <ContentReportButton packId={initialPack.id} frameId={f.id} /> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={locale === 'en' ? 'hidden' : 'card p-5'}>
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
            disabled={!done || kakaoBusy || !kakao.validation.ok || !kakao.packaging}
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
            <span className="text-[11px] text-sub">규격을 충족하면 내려받을 수 있어요</span>
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
        <strong className="text-ink">Studio 플랜</strong>은 카카오 제안 규격(360×360, 개당 2MB 이하) 검증·패키징까지
        자동으로 해드려요.
        </>}
      </div>
    </div>
  );
}
