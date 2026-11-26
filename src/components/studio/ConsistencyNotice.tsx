'use client';

import { useEffect, useState } from 'react';
import type { SubjectKind } from '@/lib/types';
import { photoConsistencyMethod, type PhotoScope } from '@/lib/studio/photo';
import { tr, type Locale } from '@/lib/i18n/locale';

/** Make basic fallback checks explicit rather than implying AI identity verification succeeded. */
export function ConsistencyNotice({ scope, subjectKind = 'person', locale = 'ko', showRedrawHint = true }: { scope: PhotoScope; subjectKind?: SubjectKind; locale?: Locale; showRedrawHint?: boolean }) {
  const [basic, setBasic] = useState(false);
  useEffect(() => {
    const update = () => setBasic(photoConsistencyMethod(scope, subjectKind) === 'basic');
    update();
    window.addEventListener('emotime:consistency-updated', update);
    return () => window.removeEventListener('emotime:consistency-updated', update);
  }, [scope, subjectKind]);
  if (!basic) return null;
  return (
    <div role="status" className="rounded-xl border-2 border-line bg-lemon/30 px-4 py-3 text-sm leading-relaxed text-ink">
      <p>
        <strong>{tr(locale, '기본 사진 확인으로 진행 중이에요.', 'Basic photo checks are active.')}</strong> {tr(locale, 'AI 특징 재확인을 완료하지 못해 사진 파일만 확인했습니다. 원본 사진과 선택한 시안을 참조하지만 대상의 일관성은 보장되지 않습니다.', 'AI feature verification was unavailable, so only the photo file was checked. The original photo and selected draft are used as references, but subject consistency is not guaranteed.')}
      </p>
      {/* 폴백으로 그려진 컷도 한 컷씩 바로잡을 수 있다는 사실을 미리 알려 준다. */}
      {showRedrawHint ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink/80">
          {tr(locale, '닮은 정도가 어색한 컷은 그 컷만 다시 그릴 수 있어요. 미리보기에서 그 컷을 눌러 ‘표정·세부 편집’으로 들어간 뒤 ‘AI로 다시 그리기’를 누르면 됩니다.', 'If a cut looks off, you can redraw just that cut: open it in the preview, tap “Expression & advanced edit”, then press “Redraw with AI”.')}
        </p>
      ) : null}
    </div>
  );
}
