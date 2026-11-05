'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { analyzeSelfie, analyzePetPhoto, type FaceAnalysis } from '@/lib/face/analyze';
import { TONES } from '@/lib/art/sticker';
import { track } from '@/lib/analytics';
import { compressPhotoFile, ensurePhotoConsistency, linkPhoto, loadPhoto, photoScopeId, savePhoto } from '@/lib/studio/photo';
import type { SubjectKind, Tone } from '@/lib/types';

const CONSENT_VERSION = 'v1.2';
const DRAFT_KEY = 'emotime:studio:draft:v1';

export function UploadFlow({
  step,
  allowedTones,
  credits,
  planName,
  unlimited = false,
}: {
  step: 'photo' | 'settings';
  allowedTones: Tone[];
  credits: number;
  planName: string;
  unlimited?: boolean;
}) {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [subjectKind, setSubjectKind] = useState<SubjectKind>('person');
  const [mode, setMode] = useState<'face' | 'full'>('face');
  const [tone, setTone] = useState<Tone>(allowedTones[0] ?? '2d-cute');
  const [consent, setConsent] = useState({ terms: false, privacy: false, overseas: false });
  const [dragging, setDragging] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [currentStep, setCurrentStep] = useState<'photo' | 'settings'>(step);

  useEffect(() => {
    setCurrentStep(step);
  }, [step]);

  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname.endsWith('/settings')) setCurrentStep('settings');
      else if (window.location.pathname.endsWith('/upload')) setCurrentStep('photo');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || 'null');
      if (saved?.analysis && saved.photoId && saved.photoId === photoScopeId('draft') && loadPhoto('draft')) {
        setAnalysis(saved.analysis);
        setFileName(saved.fileName || '');
        setSubjectKind(saved.subjectKind === 'pet' ? 'pet' : 'person');
        setMode(saved.mode === 'full' ? 'full' : 'face');
        if (allowedTones.includes(saved.tone)) setTone(saved.tone);
        if (saved.consent) setConsent(saved.consent);
      }
    } catch { /* 잘못된 임시 정보는 무시하고 사진부터 다시 시작한다 */ }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated || !analysis) return;
    try {
      const photoId = photoScopeId('draft');
      if (photoId) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ analysis, fileName, mode, tone, consent, photoId, subjectKind }));
    } catch { /* 다음 단계로 이동할 때 저장 실패를 알린다 */ }
  }, [hydrated, analysis, fileName, mode, tone, consent, subjectKind]);

  function goToSettings() {
    if (!analysis?.ok || busy) return;
    try {
      const photoId = photoScopeId('draft');
      if (!photoId || !loadPhoto('draft')) throw new Error();
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ analysis, fileName, mode, tone, consent, photoId, subjectKind }));
      setError(null);
      setCurrentStep('settings');
      try { window.history.pushState(null, '', '/studio/upload/settings'); } catch { /* ignore */ }
    } catch { setError('임시 정보를 저장하지 못했어요. 사진을 다시 선택해 주세요.'); }
  }

  function goToPhoto() {
    if (busy) return;
    setError(null);
    setCurrentStep('photo');
    try { window.history.pushState(null, '', '/studio/upload'); } catch { /* ignore */ }
  }


  const onFile = useCallback(async (file: File) => {
    setError(null);
    setBusy(true);
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* 저장 불가 시 다음 단계에서 안내 */ }
    setConsent({ terms: false, privacy: false, overseas: false });
    setAnalysis(null);
    setFileName(file.name);
    try {
      const result = subjectKind === 'pet' ? await analyzePetPhoto(file) : await analyzeSelfie(file);
      track('photo_analyzed', { ok: result.ok });
      if (!result.ok) { setAnalysis(result); return; }
      // 생성 단계에서 쓸 사진을 이 탭에만 임시 보관 (서버 저장 없음)
      savePhoto(await compressPhotoFile(file), 'draft');
      setAnalysis(result);
    } catch {
      setError('사진을 읽지 못했어요. 다른 사진으로 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }, [subjectKind]);

  const ready = analysis?.ok && consent.terms && consent.privacy && consent.overseas && !busy;


  async function submit() {
    if (!analysis?.ok || !consent.terms || !consent.privacy || !consent.overseas || busy) return;
    const photo = loadPhoto('draft');
    if (!photo) {
      setError('사진을 다시 선택해 주세요. 탭을 새로 열면 사진 보관이 초기화돼요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setStage('이미지 생성 전에 사진을 확인하고 있어요. AI 확인이 어려우면 기본 확인으로 전환합니다…');
      await ensurePhotoConsistency(photo, 'draft', subjectKind);
      setStage('사진 분석 정보를 준비하고 있어요…');
      const faceRes = await fetch('/api/face/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          palette: analysis.palette,
          signature: analysis.signature,
          metrics: analysis.metrics,
          consent: { accepted: true, version: CONSENT_VERSION, overseas: true },
        }),
      });
      const faceJson = await faceRes.json();
      if (!faceRes.ok) throw new Error(faceJson?.error?.message ?? '얼굴 정보를 저장하지 못했어요');

      const sheetRes = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceId: faceJson.faceId, tone, mode, subjectKind }),
      });
      const sheetJson = await sheetRes.json();
      if (!sheetRes.ok) throw new Error(sheetJson?.error?.message ?? '캐릭터 시트를 만들지 못했어요');

      linkPhoto('draft', `sheet:${sheetJson.sheet.id}`);
      track('sheet_created', { tone, credits });
      const targetUrl = `/studio/sheet/${sheetJson.sheet.id}`;
      router.push(targetUrl);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== targetUrl) {
          window.location.assign(targetUrl);
        }
      }, 1000);
    } catch (e) {
      track('sheet_failed', { tone });
      setError((e as Error).message);
      setBusy(false);
      setStage('');
    }
  }

  const isPhoto = currentStep === 'photo';
  const stepHeader = (
    <>
      <nav className="mb-6 flex items-center gap-2 text-xs font-bold text-sub" aria-label="현재 위치">
        <Link href="/" className="hover:text-ink">홈</Link><span>/</span>
        {isPhoto ? (
          <span className="text-ink">사진 선택</span>
        ) : (
          <>
            <button type="button" onClick={goToPhoto} className="hover:text-ink">사진 선택</button>
            <span>/</span>
            <span className="text-ink">스타일과 동의</span>
          </>
        )}
        <span className="ml-auto chip">STEP {isPhoto ? '1' : '2'} / 4</span>
      </nav>
      <div className="mx-auto mb-8 max-w-3xl">
        <h1 className="h2">{isPhoto ? '어떤 사진으로 만들까요?' : '이모티콘 스타일을 골라주세요'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-sub">
          {isPhoto ? '사람 또는 반려동물을 선택하고 사진 한 장으로 시작해요.' : '구도와 스타일을 선택하고 필수 항목에 동의하면 시안 만들기를 시작합니다.'}
        </p>
        <ol aria-label="제작 진행 단계" className="mt-5 grid grid-cols-4 gap-1 text-center text-xs font-bold sm:gap-2 sm:text-sm">
          {['사진 선택', '스타일·동의', '시안 선택', '팩 완성'].map((label, index) => (
            <li key={label} aria-current={index === (isPhoto ? 0 : 1) ? 'step' : undefined} className={`rounded-xl border-2 px-1 py-2 ${index === (isPhoto ? 0 : 1) ? 'border-ink bg-lemon/30 text-ink' : 'border-line text-sub'}`}>
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </div>
    </>
  );

  if (!hydrated) return <>{stepHeader}<p role="status" className="text-sm text-sub">준비 중이에요…</p></>;
  if (currentStep === 'settings' && (!analysis?.ok || !loadPhoto('draft'))) {
    return <>{stepHeader}<div className="card p-6"><p className="font-bold">먼저 사진을 선택해 주세요.</p><p className="mt-2 text-sm text-sub">사진과 분석 정보는 이 탭에서만 보관됩니다.</p><button type="button" onClick={goToPhoto} className="btn-primary mt-4 inline-flex">사진 선택으로 돌아가기</button></div></>;
  }

  const errorNotice = error ? <p role="alert" className="rounded-xl border-2 border-coral/50 bg-coral/10 px-4 py-3 text-sm font-bold text-coralink">{error}</p> : null;
  if (currentStep === 'photo') return (
    <>
      {stepHeader}
      <div className="mx-auto max-w-2xl space-y-4">
        <div role="group" aria-label="사진 대상 선택" className="card flex gap-2 p-3">
          {([['person', '사람'], ['pet', '반려동물']] as const).map(([kind, label]) => (
            <button key={kind} type="button" disabled={busy} aria-pressed={subjectKind === kind} onClick={() => {
              if (kind === subjectKind) return;
              setSubjectKind(kind); setAnalysis(null); setFileName(''); setError(null);
              setConsent({ terms: false, privacy: false, overseas: false });
              try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* 임시 저장소 이용 불가 */ }
            }} className={clsx('flex-1 rounded-xl border-2 px-4 py-3 text-sm font-black', subjectKind === kind ? 'border-ink bg-ink text-cream' : 'border-line bg-paper text-ink')}>{label}</button>
          ))}
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f && !busy) void onFile(f);
          }}
          className={clsx(
            'card relative grid min-h-[240px] place-items-center p-6 text-center transition',
            dragging && 'bg-lemon/20',
          )}
        >
          {/* 사진첩에서 선택: capture 속성 없음 → 갤러리/파일 선택 열림 */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = '';
            }}
          />
          {/* 사람은 전면 카메라, 반려동물은 후면 카메라를 우선한다. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture={subjectKind === 'pet' ? 'environment' : 'user'}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              e.target.value = '';
            }}
          />
          {!analysis ? (
            <div>
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-cream text-3xl shadow-card">
                📸
              </div>
              <p className="text-lg font-black">{subjectKind === 'pet' ? '반려동물 사진 한 장을 올려주세요' : '정면 셀카 한 장을 올려주세요'}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-sub">
                {subjectKind === 'pet' ? '반려동물 한 마리의 얼굴과 무늬가 잘 보이는 밝은 사진을 선택해 주세요. ' : '밝은 곳에서, 안경·모자 없이, 얼굴이 화면의 절반 정도 차게. '}원본 사진은
                <strong className="text-ink"> 생성 전 확인 및 생성 요청 때 AI로 전송되며 서버에 저장되지 않습니다</strong>. 선택한 생성 시안은 저장되며 컷 생성 시 참조됩니다.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button className="btn-primary" onClick={() => galleryInputRef.current?.click()} disabled={busy}>
                  {busy ? '분석 중…' : '사진 선택'}
                </button>
                <button className="btn-ghost" onClick={() => cameraInputRef.current?.click()} disabled={busy}>
                  카메라로 찍기
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between gap-3 text-left">
                <div>
                  <p className="text-sm font-black">
                    {subjectKind === 'pet' ? (analysis.ok ? '사진 파일 확인 완료' : '사진을 확인해 주세요') : (analysis.ok ? '사진 확인 완료' : '사진을 확인해 주세요')}
                  </p>
                  <p className="text-xs text-sub">
                    {fileName}{subjectKind === 'pet' ? ' · 파일 형식과 크기만 확인했어요. 동물 인식은 보장되지 않아요.' : ` · ${analysis.metrics.faceDetected ? '얼굴 검출' : '얼굴 미검출'} · 커버리지 ${(analysis.metrics.coverage * 100).toFixed(1)}%`}
                  </p>
                </div>
                <button className="chip hover:border-ink" disabled={busy} onClick={() => galleryInputRef.current?.click()}>
                  다시 선택
                </button>
              </div>

              <ul className="mt-3 space-y-1.5 text-left text-[13px]">
                {analysis.issues.length === 0 ? (
                  <li className="font-bold text-mint">{subjectKind === 'pet' ? '✓ 사진 파일을 확인했어요.' : '✓ 사진 확인을 마쳤어요.'}</li>
                ) : (
                  analysis.issues.map((i) => (
                    <li key={i.code} className={i.blocking ? 'font-bold text-coralink' : 'text-sub'}>
                      {i.blocking ? '✕' : '!'} {i.label}
                    </li>
                  ))
                )}
              </ul>

              {subjectKind === 'person' ? <div className="mt-4 flex items-center gap-2 text-left">
                <span className="text-xs font-bold text-sub">추출된 팔레트</span>
                <div className="flex gap-1">
                  {Object.entries(analysis.palette).map(([k, v]) => (
                    <span
                      key={k}
                      title={`${k} ${v}`}
                      className="h-6 w-6 rounded-full border-2 border-ink"
                      style={{ background: v }}
                    />
                  ))}
                </div>
              </div> : null}
              <p className="mt-4 rounded-xl border border-line bg-cream px-3 py-2 text-left text-[11px] leading-relaxed text-sub">
                원본 사진은 서버에 저장되지 않습니다. 생성 전 AI가 사진을 확인합니다. AI 확인이 어려우면 파일만 확인하는 기본 방식으로 진행하며 일관성은 보장되지 않습니다. 컷 생성 시 사진과 선택한 시안이 Google Gemini로 전송됩니다.
              </p>
            </div>
          )}
        </div>
      {errorNotice}
      <button className="btn-primary w-full !py-4 text-base" disabled={!analysis?.ok || busy} onClick={goToSettings}>다음 · 스타일 선택 →</button>
      <p className="text-center text-xs text-sub">사진 분석은 브라우저에서 진행되며, 다음 단계에서 구도와 스타일을 선택합니다.</p>
    </div>
    </>
  );
  return (
    <>
      {stepHeader}
      <div className="mx-auto max-w-3xl space-y-4">
      <div className="card p-5"><p className="text-sm font-black">구도 선택</p><p className="mt-1 text-xs text-sub">얼굴 중심 또는 전신 이모티콘을 선택해 주세요.</p></div>
          <div role="group" aria-label="이모티콘 구도 선택" className="card flex gap-2 p-3">
            <button type="button" aria-pressed={mode === 'face'} onClick={() => setMode('face')} className={clsx("flex-1 rounded-xl border-2 px-4 py-3 text-sm font-black", mode === 'face' ? "border-ink bg-ink text-cream" : "border-line bg-paper text-ink")}>얼굴 모드</button>
            <button type="button" aria-pressed={mode === 'full'} onClick={() => setMode('full')} className={clsx("flex-1 rounded-xl border-2 px-4 py-3 text-sm font-black", mode === 'full' ? "border-ink bg-ink text-cream" : "border-line bg-paper text-ink")}>전신 모드</button>
          </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black">버전 선택 (캐릭터 vs 실사포토)</p>
            <span className="chip !bg-cream">{planName} · {allowedTones.length}종</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(Object.keys(TONES) as Tone[]).map((t) => {
              const allowed = allowedTones.includes(t);
              return (
                <button
                  key={t}
                  disabled={!allowed}
                  onClick={() => setTone(t)}
                  className={clsx(
                    'rounded-xl border-2 p-3 text-left transition',
                    tone === t ? 'border-ink bg-lemon/30' : 'border-line bg-paper hover:border-ink/50',
                    !allowed && 'cursor-not-allowed opacity-45',
                  )}
                >
                  <p className="text-[13px] font-black">{TONES[t].label}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-sub">{TONES[t].desc}</p>
                  {!allowed ? <p className="mt-1 text-[10px] font-bold text-coralink">유료 플랜</p> : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="card p-5">
          <p className="text-sm font-black">필수 동의</p>
          <div className="mt-3 space-y-2.5 text-[13px]">
            {[
              { key: 'terms' as const, label: '서비스 이용약관 동의', href: '/terms' },
              { key: 'privacy' as const, label: '개인정보 수집·이용 동의 (생성 요청 시 사진 일시 처리, 원본 미저장)', href: '/privacy' },
              { key: 'overseas' as const, label: '개인정보 국외이전 동의 (사진·선택한 시안, Google LLC · 사전 확인 및 생성 목적)', href: '/privacy' },
            ].map((c) => (
              <label key={c.key} className="flex items-start gap-2 leading-snug">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-coral"
                  checked={consent[c.key]}
                  onChange={(e) => setConsent((s) => ({ ...s, [c.key]: e.target.checked }))}
                />
                <span>
                  <span className="font-bold">[필수]</span> {c.label}{' '}
                  <a href={c.href} target="_blank" className="text-coralink underline">
                    보기
                  </a>
                </span>
              </label>
            ))}
          </div>
        </div>
      {busy && stage ? <p role="status" className="rounded-xl border-2 border-line bg-cream px-4 py-3 text-sm font-bold">{stage}</p> : null}
      {errorNotice}
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button type="button" disabled={busy} onClick={goToPhoto} className="btn-ghost text-center sm:flex-1">← 사진 선택</button>
        <button className="btn-primary !py-4 text-base sm:flex-[2]" disabled={!ready} onClick={submit}>{busy ? '처리 중…' : '다음 · 캐릭터 시안 만들기 →'}</button>
      </div>
      <p className="text-center text-[11px] text-sub">생성 전 사진을 확인합니다. AI 확인이 어려우면 기본 확인으로 진행합니다 · {unlimited ? '크레딧 차감 없음' : `보유 크레딧 ${credits}`}</p>
    </div>
    </>
  );
}
