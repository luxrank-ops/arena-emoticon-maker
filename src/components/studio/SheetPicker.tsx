'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Sticker } from '@/components/Sticker';
import { ConsistencyNotice } from '@/components/studio/ConsistencyNotice';
import { PresetPicker } from '@/components/studio/PresetPicker';
import { recommendedPresetIds } from '@/data/emoticon-presets-150';
import {
  CURATION_PACKAGES,
  DEFAULT_CURATION_PACKAGE_ID,
  curationPackagePresetIds,
} from '@/data/curation-packages';
import {
  packagePickFromSearch,
  presetPickFromSearch,
  rememberedPackagePick,
  rememberedPresetPick,
  rememberPackagePick,
} from '@/lib/studio/preset-selection';
import { localizedComicExpressions, toneCopy } from '@/lib/i18n/presets';
import { localizedPath, tr, type Locale } from '@/lib/i18n/locale';
import { compressPhotoFile, linkPhoto, loadPhoto, renderImage, runLimited, savePhoto } from '@/lib/studio/photo';
import type { Emotion, Palette, SheetVariant, StickerSpec, Tone, SubjectKind } from '@/lib/types';
import { packFormatById, type PackFormatId } from '@/lib/pack-formats';
import { PREVIEW_PACK_SIZE, TRIAL_MESSAGES } from '@/lib/trial-policy';
import type { TrialStatus } from '@/lib/free-trial';

// ─────────────────────────────────────────────────────────────
// 캐릭터 시안 선택 (AI 생성본)
//  · 시안 3종은 사진을 참조해 Gemini 가 실제로 그린 이미지다 (SVG 아님)
//  · 사진은 이 탭의 임시 보관본을 쓰고, 사전 확인 및 생성 요청 때 서버로 전송된다
// ─────────────────────────────────────────────────────────────

export function SheetPicker({
  sheetId,
  subjectKind = 'person',
  variants,
  palette,
  tone,
  credits,
  unlimited = false,
  alreadyChosen,
  locale = 'ko',
  format = null,
  trial = false,
  trialStatus = null,
}: {
  sheetId: string;
  subjectKind?: SubjectKind;
  variants: SheetVariant[];
  palette: Palette;
  tone: Tone;
  credits: number;
  unlimited?: boolean;
  alreadyChosen: string | null;
  locale?: Locale;
  format?: PackFormatId | null;
  /** 무료 체험(일반 방문자) — 팩 대신 '컷 2장 맛보기' 패널을 보여준다 */
  trial?: boolean;
  trialStatus?: TrialStatus | null;
}) {
  const router = useRouter();
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const lp = (href: string) => localizedPath(locale, href);
  const expressions = localizedComicExpressions(locale);
  const formatInfo = format ? packFormatById(format) : undefined;
  const maxCuts = formatInfo?.cuts.length ?? 24;
  const sizeOptions = (formatInfo ? (maxCuts >= 32 ? [12, 24, 32] : maxCuts >= 24 ? [12, 24] : [12]) : tone === 'photo-sticker' ? [12, 16] : [12, 24, 32]) as readonly number[];
  const [chosen, setChosen] = useState<string | null>(alreadyChosen);
  const [size, setSize] = useState<12 | 16 | 24 | 32>(format || tone === 'photo-sticker' ? 12 : 24);
  // 일반 기본 팩은 고빈도 표준 24컷으로 시작하고, 실사·표현형 팩은 기존 크기를 유지한다.
  const [composition, setComposition] = useState<'auto' | 'comic' | 'preset'>(format || tone === 'photo-sticker' ? 'auto' : 'preset');
  const [comicIds, setComicIds] = useState<string[]>([]);
  const [presetIds, setPresetIds] = useState<number[]>(
    format || tone === 'photo-sticker' ? [] : curationPackagePresetIds(DEFAULT_CURATION_PACKAGE_ID),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, string>>(() =>
    Object.fromEntries(variants.filter((v) => v.imageId).map((v) => [v.key, `/api/images/${v.imageId}`])),
  );
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [needPhoto, setNeedPhoto] = useState(false);
  const [photoTick, setPhotoTick] = useState(0);
  // 무료 미리보기 팩 — 오늘 남은 미리보기 팩 수(서버 카운터)
  const [previewLeft, setPreviewLeft] = useState(trialStatus?.previewPacksLeftToday ?? 0);
  const [previewBusy, setPreviewBusy] = useState(false);
  const activePackage = !formatInfo && composition === 'preset'
    ? CURATION_PACKAGES.find((pkg) => pkg.count === presetIds.length && pkg.cuts.every((cut, index) => presetIds[index] === cut.presetId))
    : undefined;

  async function generate(keys: string[]) {
    const photo = loadPhoto(`sheet:${sheetId}`);
    if (!photo) {
      setNeedPhoto(true);
      return;
    }
    setFailed((prev) => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
    setPending((prev) => ({ ...prev, ...Object.fromEntries(keys.map((k) => [k, true])) }));
    await runLimited(keys, 3, async (key) => {
      try {
        const url = await renderImage({ kind: 'sheet', sheetId, variantKey: key }, photo, `sheet:${sheetId}`, subjectKind);
        setImages((prev) => ({ ...prev, [key]: url }));
      } catch (e) {
        setFailed((prev) => ({ ...prev, [key]: locale === 'en' ? 'This draft could not be generated. Try again.' : (e as Error).message }));
      } finally {
        setPending((prev) => ({ ...prev, [key]: false }));
      }
    });
  }

  // 체험은 시안이 1장뿐이라, 그려지면 자동으로 골라 둔다 (고르는 단계 생략).
  useEffect(() => {
    if (!trial || chosen) return;
    const ready = variants.find((variant) => images[variant.key])?.key;
    if (ready) setChosen(ready);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial, chosen, images, variants]);

  // 처음 열렸을 때, 그리고 사진을 다시 올렸을 때 아직 없는 시안을 생성한다
  useEffect(() => {
    const missing = variants.filter((v) => !images[v.key]).map((v) => v.key);
    if (missing.length) void generate(missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoTick]);

  // 프리셋 화면에서 골라 온 값이 있으면 '프리셋' 구성으로 미리 채운다.
  useEffect(() => {
    if (formatInfo) return;
    // 큐레이션 패키지가 우선한다 — 컷 수와 순서를 패키지 그대로 맞춘다.
    const pickedPackage = packagePickFromSearch(window.location.search) ?? rememberedPackagePick();
    if (pickedPackage) {
      const ids = curationPackagePresetIds(pickedPackage);
      const target = CURATION_PACKAGES.find((pkg) => pkg.id === pickedPackage);
      if (ids.length && target && (tone === 'photo-sticker' ? target.count <= 16 : true)) {
        setComposition('preset');
        setSize(target.count);
        setPresetIds(ids);
        return;
      }
    }
    const picked = presetPickFromSearch(window.location.search) ?? rememberedPresetPick();
    if (!picked) return;
    setComposition('preset');
    setPresetIds([picked, ...recommendedPresetIds(Math.max(0, size - 1), [picked])]);
    rememberPackagePick(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 패키지 원클릭: 컷 수·순서를 패키지에 맞추고 만들기까지 들고 간다. */
  function applyPackage(id: string) {
    const target = CURATION_PACKAGES.find((pkg) => pkg.id === id);
    if (!target) return;
    if (tone === 'photo-sticker' && target.count > 16) return;
    setComposition('preset');
    setSize(target.count);
    setPresetIds(curationPackagePresetIds(target.id));
    rememberPackagePick(target.id);
    setError(null);
  }

  async function onPickPhoto(file: File) {
    setError(null);
    try {
      savePhoto(await compressPhotoFile(file), `sheet:${sheetId}`);
      setNeedPhoto(false);
      setPhotoTick((t) => t + 1);
    } catch (e) {
      setError(locale === 'en' ? 'Something went wrong. Please try again.' : (e as Error).message);
    }
  }

  function specOf(v: SheetVariant): StickerSpec {
    return {
      seed: v.seed,
      tone,
      palette,
      signature: v.signature,
      emotion: 'joy',
      intensity: 72,
      prop: 'none',
      // 기본은 투명 배경(누끼) — 실사 스티커만 흰 배경이 이미지에 박혀 있어 크림으로 둔다.
      background: tone === 'photo-sticker' ? 'cream' : 'transparent',
      line: '',
      linePosition: 'bottom',
      imageUrl: images[v.key],
    };
  }

  /** 무료 12컷 워터마크 미리보기 팩 — 크레딧 없이 만들고, 결제 전에는 내보내기가 잠긴다. */
  async function createPreview() {
    if (!chosen || previewBusy) return;
    setPreviewBusy(true);
    setError(null);
    try {
      const chooseRes = await fetch(`/api/sheets/${sheetId}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantKey: chosen }),
      });
      if (!chooseRes.ok) {
        const j = await chooseRes.json().catch(() => null);
        throw new Error(locale === 'en' ? 'We could not select this character. Try again.' : (j?.error?.message ?? '캐릭터를 선택하지 못했어요'));
      }
      const previewSelection = format
        ? { format }
        : activePackage
          ? { curationPackageId: activePackage.id }
          : composition === 'preset'
            ? { presetIds: presetIds.slice(0, PREVIEW_PACK_SIZE) }
            : composition === 'comic'
              ? { comicExpressionIds: comicIds.slice(0, PREVIEW_PACK_SIZE) }
              : {};
      const packRes = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetId, size: PREVIEW_PACK_SIZE, locale, preview: true, ...previewSelection }),
      });
      const packJson = await packRes.json().catch(() => null);
      if (!packRes.ok) throw new Error(locale === 'en' ? 'We could not open your preview pack. Please try again tomorrow.' : (packJson?.error?.message ?? '미리보기 팩을 만들지 못했어요.'));
      setPreviewLeft((left) => Math.max(0, left - 1));
      try {
        if (loadPhoto(`sheet:${sheetId}`)) linkPhoto(`sheet:${sheetId}`, `pack:${packJson.packId}`);
        if (formatInfo?.needsSecondPhoto && loadPhoto(`duo:${sheetId}`)) linkPhoto(`duo:${sheetId}`, `duo:${packJson.packId}`);
      } catch { /* 팩은 이미 만들어졌다 — 팩 화면에서 사진을 다시 올릴 수 있다 */ }
      const targetUrl = lp(`/studio/pack/${packJson.packId}`);
      router.push(targetUrl);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) window.location.assign(targetUrl);
      }, 1000);
    } catch (e) {
      setError(locale === 'en' ? 'Something went wrong. Please try again.' : (e as Error).message);
      setPreviewBusy(false);
    }
  }

  /** 팩 크기가 바뀌면 고른 구성도 그 크기에 맞춘다 (부족분은 카테고리를 번갈아 추천). */
  function changeSize(next: 12 | 16 | 24 | 32) {
    rememberPackagePick(null);
    setSize(next);
    if (composition === 'comic') setComicIds(expressions.slice(0, next).map((item) => item.id));
    if (composition === 'preset') {
      setPresetIds((prev) => {
        const kept = prev.slice(0, next);
        if (kept.length === next) return kept;
        return [...kept, ...recommendedPresetIds(next - kept.length, kept)];
      });
    }
  }

  function changeComposition(next: 'auto' | 'comic' | 'preset') {
    if (next !== 'preset') rememberPackagePick(null);
    setComposition(next);
    if (next === 'comic' && comicIds.length !== size) setComicIds(expressions.slice(0, size).map((item) => item.id));
    if (next === 'preset' && presetIds.length !== size) setPresetIds(recommendedPresetIds(size, presetIds));
  }

  async function create() {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const chooseRes = await fetch(`/api/sheets/${sheetId}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantKey: chosen }),
      });
      if (!chooseRes.ok) {
        const j = await chooseRes.json();
        throw new Error(locale === 'en' ? 'We could not select this character. Try again.' : (j?.error?.message ?? '캐릭터를 선택하지 못했어요'));
      }
      const packRes = await fetch('/api/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetId,
          size,
          locale,
          ...(activePackage ? { title: locale === 'en' ? activePackage.titleEn : activePackage.title, curationPackageId: activePackage.id } : {}),
          ...(format ? { format } : {}),
          ...(!format && composition === 'comic' ? { comicExpressionIds: comicIds } : {}),
          ...(!format && composition === 'preset' && !activePackage ? { presetIds } : {}),
        }),
      });
      const packJson = await packRes.json();
      if (!packRes.ok) throw new Error(locale === 'en' ? 'We could not create this pack. Check your credits and try again.' : (packJson?.error?.message ?? '팩을 만들지 못했어요'));
      // 시안 생성 시 사용한 사진만 새 팩에 연결한다.
      try {
        if (loadPhoto(`sheet:${sheetId}`)) linkPhoto(`sheet:${sheetId}`, `pack:${packJson.packId}`);
        if (formatInfo?.needsSecondPhoto && loadPhoto(`duo:${sheetId}`)) linkPhoto(`duo:${sheetId}`, `duo:${packJson.packId}`);
      } catch {
        // 팩은 이미 생성되었으므로 중복 결제를 유발하지 않도록 이동한다. 팩에서 사진을 다시 올릴 수 있다.
      }
      const targetUrl = lp(`/studio/pack/${packJson.packId}`);
      router.push(targetUrl);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
          window.location.assign(targetUrl);
        }
      }, 1000);
    } catch (e) {
      setError(locale === 'en' ? 'Something went wrong. Please try again.' : (e as Error).message);
      setBusy(false);
    }
  }

  const chosenReady = !!(chosen && images[chosen]);
  const packageBlocked = tone === 'photo-sticker';

  return (
    <div className="space-y-6">
      <ConsistencyNotice scope={`sheet:${sheetId}`} subjectKind={subjectKind} locale={locale} />
      {needPhoto ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-black">{t('이 탭에 사진이 없어요', 'This tab no longer has your photo')}</p>
            <p className="text-xs text-sub">
              {t('사진은 탭을 닫으면 지워집니다. 같은 원본 사진을 한 번 더 올려 주세요.', 'Photos are cleared when the tab closes. Please add the same original photo again.')}
            </p>
          </div>
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
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {variants.map((v) => {
          const isPending = !!pending[v.key];
          const err = failed[v.key];
          return (
            <div
              key={v.key}
              role="button"
              tabIndex={0}
              onClick={() => images[v.key] && setChosen(v.key)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && images[v.key]) setChosen(v.key);
              }}
              className={clsx(
                'card overflow-hidden p-0 text-left transition',
                images[v.key] ? 'cursor-pointer' : 'cursor-default',
                chosen === v.key ? 'ring-4 ring-coral/40' : images[v.key] ? 'hover:-translate-y-0.5' : '',
              )}
            >
              <div className="checker p-3">
                {images[v.key] ? (
                  <Sticker spec={specOf(v)} ariaLabel={t(`캐릭터 시안 ${v.key}`, `Character draft ${v.key}`)} />
                ) : (
                  <div className="grid aspect-square place-items-center rounded-xl bg-[length:200%_100%] bg-gradient-to-r from-line/20 via-line/50 to-line/20 p-4 text-center animate-shimmer">
                    {err ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-coralink">{err}</p>
                        <button
                          type="button"
                          className="btn-ghost !px-3 !py-1.5 text-[11px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            void generate([v.key]);
                          }}
                        >
                          {t('다시 그리기', 'Try again')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-sub">
                        {isPending || !needPhoto ? t('AI가 시안을 그리는 중…', 'AI is drawing this draft…') : t('사진을 기다리는 중', 'Waiting for a photo')}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between border-t-2 border-line px-4 py-3">
                <div>
                  <p className="text-sm font-black">
                    {t('시안', 'Draft')} {v.key} · {locale === 'en' ? ({ A: 'Classic', B: 'Round', C: 'Cool' }[v.key] ?? v.key) : v.label}
                  </p>
                  <p className="text-[11px] text-sub">{toneCopy(locale, tone).label} · {t('같은 사진 기준', 'Same photo reference')}</p>
                </div>
                <span
                  className={clsx(
                    'grid h-6 w-6 place-items-center rounded-full border-2 text-xs font-black',
                    chosen === v.key ? 'border-ink bg-coral text-white' : 'border-line text-sub',
                  )}
                >
                  ✓
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {trial ? (
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black">{t('무료 12컷 미리보기', 'Free 12-cut preview')}</p>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-sub">
                {t(TRIAL_MESSAGES.banner, 'Free preview: one draft, then all twelve cuts with a watermark. Unlock the pack to download.')}
              </p>
            </div>
            <span className="chip">{t(`오늘 ${previewLeft}팩 남음`, `${previewLeft} preview today`)}</span>
          </div>

          <ul className="mt-4 grid gap-1.5 text-[12px] leading-relaxed text-ink/80 sm:grid-cols-2">
            <li>· {t('12컷 전체를 워터마크로 먼저 확인', 'See all 12 cuts, watermarked')}</li>
            <li>· {t('마음에 들면 ₩5,900에 잠금 해제 (2인 케미 ₩7,900 · 반려동물 ₩6,900)', 'Unlock from ₩5,900 (duo ₩7,900 · pet ₩6,900)')}</li>
            <li>· {t('친구 초대 1명당 3컷 무료 해제', '3 free cuts per invited friend')}</li>
            <li>· {t('잠금 해제 후 고화질·투명 PNG·ZIP', 'High-res transparent PNG & ZIP after unlock')}</li>
          </ul>

          {error ? (
            <p className="mt-3 rounded-lg border-2 border-coral/50 bg-coral/10 px-3 py-2 text-sm font-bold text-coralink">{error}</p>
          ) : null}

          <button
            type="button"
            className="btn-primary mt-4 w-full !py-4"
            disabled={!chosenReady || previewBusy || previewLeft === 0}
            onClick={() => void createPreview()}
          >
            {previewBusy
              ? t('12컷 미리보기 팩을 여는 중…', 'Opening your 12-cut preview…')
              : previewLeft === 0
                ? t('오늘의 무료 미리보기를 모두 사용했어요', "Today's free preview is used up")
                : t(`12컷 전체 미리보기 팩 만들기`, 'Open my 12-cut preview pack')}
          </button>
          <p className="mt-2 text-center text-[11px] leading-relaxed text-sub">
            {t('미리보기는 저해상도·워터마크이며, 결제 전에는 내보내기가 잠깁니다.', 'Previews are low-resolution and watermarked; exports stay locked until payment.')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href={lp('/pricing')} className="btn-ghost !px-4 !py-2 text-xs">{t('가격 보기', 'See pricing')}</Link>
            <Link href={lp('/quotes')} className="btn-ghost !px-4 !py-2 text-xs">{t('대사 스튜디오 바로 쓰기', 'Try the quote studio')}</Link>
          </div>
        </div>
      ) : (
      <div className="card p-5">
        {formatInfo ? (
          <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
            <p className="text-sm font-black">{formatInfo.emoji} {locale === 'en' ? formatInfo.labelEn : formatInfo.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-sub">{locale === 'en' ? formatInfo.descriptionEn : formatInfo.description}</p>
            <p className="mt-1 text-[11px] font-bold text-primary-dark">{t('AI는 글자 없이 그리고, 한글 대사는 앱이 레이어로 합성합니다.', 'AI draws without lettering; the app composes Korean text layers.')}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">{t('팩 사이즈', 'Pack size')}</p>
            <p className="text-xs text-sub">{unlimited ? t('크레딧 차감 없음', 'No credit deduction') : t(`1컷 = 1크레딧 · 보유 ${credits}크레딧`, `1 cut = 1 credit · ${credits} credits available`)}</p>
          </div>
          <div className="flex gap-2">
            {sizeOptions.map((s) => (
              <button
                key={s}
                onClick={() => changeSize(s as 12 | 16 | 24 | 32)}
                className={clsx(
                  'rounded-xl border-2 px-4 py-2 text-sm font-black transition',
                  size === s ? 'border-ink bg-ink text-cream' : 'border-line bg-paper hover:border-ink',
                )}
              >
                {s}{t('컷', ' cuts')}
                <span className="ml-2 text-[11px] font-bold opacity-70">{unlimited ? t('차감 없음', 'No charge') : t(`${s}크레딧`, `${s} credits`)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl border-2 border-line p-4">
          <p className="text-sm font-black">{t('컷 구성 방식', 'How the cuts are chosen')}</p>
          {formatInfo ? (
            <p className="mt-1 text-xs leading-relaxed text-sub">
              {t('표현 형태 팩은 컷 구성이 형태에 맞춰 자동으로 정해져요. 프리셋을 고르려면 형태를 “기본 감정 팩”으로 두고 시작해 주세요.', 'A format pack uses its own cut list. To pick presets, start with the classic pack.')}
            </p>
          ) : (
            <>
              <div className="mt-2 grid grid-cols-3 gap-1.5" role="group" aria-label={t('컷 구성 방식 선택', 'Choose how cuts are built')}>
                {([
                  ['auto', t('자동 구성', 'Automatic')],
                  ['comic', t('코믹 24종', 'Comic 24')],
                  ['preset', t('프리셋 150', 'Presets 150')],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={composition === value}
                    onClick={() => changeComposition(value)}
                    className={clsx('min-h-11 rounded-xl border-2 px-1 text-[11px] font-black transition', composition === value ? 'border-primary bg-primary/10 text-primary-dark' : 'border-line bg-paper text-sub')}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-sub">
                {composition === 'auto'
                  ? t('감정을 골고루 섞어 자동으로 컷을 구성해요.', 'Cuts are mixed automatically across emotions.')
                  : composition === 'comic'
                    ? t('일상에서 쓰기 좋은 오리지널 코믹 반응 24종 중에서 직접 골라요.', 'Pick from 24 original everyday reactions.')
                    : t('표정·포즈·이펙트·대사가 묶인 150종 중에서 골라요. 검색과 카테고리로 찾을 수 있어요.', 'Pick from 150 bundles of expression, pose, effects and caption — searchable by category.')}
              </p>
            </>
          )}
          {!formatInfo && composition === 'comic' ? <>
            <p className="mt-3 text-xs font-bold text-sub">{comicIds.length} / {size}{t('개 선택 · 선택 순서대로 개별 이미지 생성', ' selected · generated individually in selection order')}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" role="group" aria-label={t('코믹 감정 표현 선택', 'Choose comic reactions')}>
              {expressions.map((item) => { const selected = comicIds.includes(item.id); return <button key={item.id} type="button" aria-pressed={selected} disabled={!selected && comicIds.length >= size} onClick={() => setComicIds((prev) => selected ? prev.filter((id) => id !== item.id) : [...prev, item.id])} className={clsx('rounded-xl border-2 p-2 text-left text-xs font-bold disabled:opacity-40', selected ? 'border-ink bg-lemon/30 text-ink' : 'border-line bg-paper text-sub')}><span aria-hidden="true">{item.emoji}</span> {item.label} <span className="block pt-1 text-[10px] font-normal">{item.line}</span></button>; })}
            </div>
            {comicIds.length !== size ? <p className="mt-2 text-xs font-bold text-coralink">{t(`${size}개를 선택해야 팩을 만들 수 있어요.`, `Select ${size} reactions to create this pack.`)}</p> : null}
          </> : null}
          {!formatInfo && composition === 'preset' ? (
            <div className="mt-3">
              <div className="mb-2 rounded-xl border-2 border-primary/30 bg-primary/5 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-[11px] font-black text-primary-dark">
                    🎁 {t('추천 큐레이션 패키지 원클릭', 'One-tap curated packages')}
                  </p>
                  {activePackage ? (
                    <span className="chip min-h-7 !border-primary/40 !bg-white !px-2 text-[10px] !text-primary-dark">
                      {t('적용 중', 'Applied')} · {activePackage.count}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-sub">
                  {packageBlocked
                    ? t('실사 카톡 스티커는 12·16컷만 지원해요. 다른 스타일에서 패키지를 쓸 수 있어요.', 'Photo stickers support 12 or 16 cuts only. Use a package with another style.')
                    : t('누르면 이 패키지의 컷 수(24·32)와 순서가 그대로 채워집니다.', 'Tap to fill this set’s cut count (24 or 32) and exact order.')}
                </p>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
                  {CURATION_PACKAGES.map((pkg) => {
                    const applied = activePackage?.id === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        aria-pressed={applied}
                        disabled={packageBlocked}
                        onClick={() => applyPackage(pkg.id)}
                        className={clsx(
                          'rounded-xl border-2 px-2 py-2 text-left transition disabled:opacity-40',
                          applied ? 'border-primary bg-white shadow-card' : 'border-line bg-paper hover:border-primary/50',
                        )}
                      >
                        <span className="block text-[11px] font-black leading-tight text-ink break-keep">
                          <span aria-hidden="true">{pkg.emoji}</span> {locale === 'en' ? pkg.titleEn : pkg.title}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-bold text-coralink">
                          {t(`${pkg.count}컷`, `${pkg.count} cuts`)} ·{' '}
                          {applied ? t('적용됨', 'applied') : t('불러오기', 'load')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <PresetPicker
                selectedIds={presetIds}
                max={size}
                onChange={(ids) => { rememberPackagePick(null); setPresetIds(ids); }}
                locale={locale}
              />
              {presetIds.length !== size ? <p className="mt-2 text-xs font-bold text-coralink">{t(`${size}개를 골라야 팩을 만들 수 있어요.`, `Pick ${size} presets to create this pack.`)}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-line bg-cream px-4 py-3 text-[12px] leading-relaxed text-sub">
          {tone === 'photo-sticker'
            ? t('표정마다 각각 독립된 이미지로 만들어집니다. 12·16컷은 개인 사용용이며 카카오 정식 제안 규격 충족을 보장하지 않습니다.', 'Each reaction is generated as an individual image. The 12- and 16-cut packs are for personal use; compliance with official Kakao submission requirements is not guaranteed.')
            : <>
                {t('카카오 이모티콘 스튜디오 제안 규격은 ', 'Kakao Emoticon Studio asks for ')}
                <strong className="text-ink">{t('멈춘 이모티콘(PNG) 32컷', '32 still stickers (PNG)')}</strong>
                {t(' 또는 ', ' or ')}
                <strong className="text-ink">{t('움직이는 이모티콘(GIF·APNG) 24컷', '24 animated stickers (GIF/APNG)')}</strong>
                {t('입니다. ', '. ')}
                <strong className="text-ink">{t('12컷', '12 cuts')}</strong>{t('은 개인 사용·빠른 제작에 적합합니다.', ' is a quicker option for personal use.')}
                {sizeOptions.includes(32) ? <> <strong className="text-ink">{t('32컷', '32 cuts')}</strong>{t('은 멈춘 이모티콘 제안 규격과 같은 구성이고, ', ' matches the still-sticker submission count, and ')}</> : null}
                {sizeOptions.includes(24) ? <><strong className="text-ink">{t('24컷', '24 cuts')}</strong>{t('은 움직이는 이모티콘 제안 규격과 같습니다.', ' matches the animated-sticker submission count.')}</> : null}
              </>}
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border-2 border-coral/50 bg-coral/10 px-3 py-2 text-sm font-bold text-coralink">
            {error}
          </p>
        ) : null}

        <button className="btn-primary mt-4 w-full !py-4" disabled={!chosenReady || busy || (composition === 'comic' && comicIds.length !== size) || (composition === 'preset' && presetIds.length !== size)} onClick={create}>
          {busy
            ? t('팩 만드는 중…', 'Creating your pack…')
            : chosenReady
              ? t(`${size}컷 만들기 (${unlimited ? '차감 없음' : `${size}크레딧`})`, `Create ${size} cuts (${unlimited ? 'no charge' : `${size} credits`})`)
              : chosen
                ? t('시안을 그리는 중입니다', 'Your draft is still drawing')
                : t('마음에 드는 시안을 골라 주세요', 'Choose your favorite draft')}
        </button>
        <p className="mt-2 text-center text-[11px] text-sub">
          {t('컷은 한 장씩 AI가 그리며, 완성되는 순서대로 팩에 나타납니다', 'AI draws each cut individually, and finished stickers appear in your pack as they become ready')}
        </p>
      </div>
      )}
    </div>
  );
}
