'use client';

import { tr, type Locale } from '@/lib/i18n/locale';

export function CameraPermissionDialog({ locale, onCancel, onConfirm }: { locale: Locale; onCancel: () => void; onConfirm: () => void }) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="camera-disclosure-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-float motion-safe:animate-sheet-up">
        <span className="text-3xl" aria-hidden="true">📷</span>
        <h2 id="camera-disclosure-title" className="mt-3 text-xl font-black">{t('사진 촬영 안내', 'Camera access')}</h2>
        <p className="mt-3 text-sm leading-relaxed text-sub">{t('얼굴 분석과 이모티콘 제작을 위해 기기의 사진 촬영 기능을 엽니다. 촬영한 사진을 선택하기 전까지 이미지는 전송되지 않습니다.', 'Your device camera will open so you can take a photo for face analysis and sticker creation. No photo is sent before you take and select one.')}</p>
        <p className="mt-2 text-xs leading-relaxed text-sub">{t('운영체제가 사진 촬영 접근 권한을 요청하면 내용을 확인한 뒤 선택해 주세요. 사진첩에서 기존 사진을 고를 수도 있습니다.', 'If the operating system asks for camera access, review the request and choose whether to allow it. You can choose an existing gallery photo instead.')}</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button type="button" autoFocus onClick={onCancel} className="btn-ghost !min-h-12">{t('취소', 'Cancel')}</button>
          <button type="button" onClick={onConfirm} className="btn-primary !min-h-12">{t('촬영 시작', 'Open camera')}</button>
        </div>
      </div>
    </div>
  );
}

export function PhotoRetakeGuide({ locale, issueCode, onCamera, onGallery }: { locale: Locale; issueCode: string; onCamera: () => void; onGallery: () => void }) {
  const t = (ko: string, en: string) => tr(locale, ko, en);
  const noFace = issueCode === 'NO_FACE' || issueCode === 'ERR_ANALYZE_NO_OBJECT';
  return (
    <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-left" aria-label={t('재촬영 가이드', 'Retake guide')}>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-primary bg-white" aria-hidden="true">
          <div className="absolute left-1/2 top-4 h-11 w-11 -translate-x-1/2 rounded-full border-2 border-primary/60" />
          <div className="absolute bottom-2 left-1/2 h-5 w-14 -translate-x-1/2 rounded-t-full bg-primary/15" />
          <span className="absolute inset-x-1 bottom-1 text-center text-[9px] font-black text-primary-dark">GUIDE</span>
        </div>
        <div>
          <p className="text-sm font-black text-primary-dark">{noFace ? t('얼굴이 잘 보이지 않습니다', 'No clear face found') : t('사진이 흐리게 촬영됐어요', 'The photo is blurry')}</p>
          <p className="mt-1 text-xs leading-relaxed text-sub">{t('밝은 곳에서 한 명이 정면을 보게 하고, 눈과 얼굴이 가이드 안에 선명하게 들어오게 해 주세요.', 'Use good light, center one front-facing person, and keep the eyes and face sharp inside the guide.')}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCamera} className="btn-primary !min-h-12 !px-2 !text-xs">{t('다시 촬영', 'Retake photo')}</button>
        <button type="button" onClick={onGallery} className="btn-ghost !min-h-12 !px-2 !text-xs">{t('다른 사진 선택', 'Choose another')}</button>
      </div>
    </div>
  );
}
