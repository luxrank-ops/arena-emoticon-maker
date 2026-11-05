'use client';

import { useEffect, useState } from 'react';
import type { SubjectKind } from '@/lib/types';
import { photoConsistencyMethod, type PhotoScope } from '@/lib/studio/photo';
import { tr, type Locale } from '@/lib/i18n/locale';

/** Make basic fallback checks explicit rather than implying AI identity verification succeeded. */
export function ConsistencyNotice({ scope, subjectKind = 'person', locale = 'ko' }: { scope: PhotoScope; subjectKind?: SubjectKind; locale?: Locale }) {
  const [basic, setBasic] = useState(false);
  useEffect(() => {
    const update = () => setBasic(photoConsistencyMethod(scope, subjectKind) === 'basic');
    update();
    window.addEventListener('emotime:consistency-updated', update);
    return () => window.removeEventListener('emotime:consistency-updated', update);
  }, [scope, subjectKind]);
  if (!basic) return null;
  return (
    <p role="status" className="rounded-xl border-2 border-line bg-lemon/30 px-4 py-3 text-sm leading-relaxed text-ink">
      <strong>{tr(locale, '기본 사진 확인으로 진행 중이에요.', 'Basic photo checks are active.')}</strong> {tr(locale, 'AI 특징 재확인을 완료하지 못해 사진 파일만 확인했습니다. 원본 사진과 선택한 시안을 참조하지만 대상의 일관성은 보장되지 않습니다.', 'AI feature verification was unavailable, so only the photo file was checked. The original photo and selected draft are used as references, but subject consistency is not guaranteed.')}
    </p>
  );
}
