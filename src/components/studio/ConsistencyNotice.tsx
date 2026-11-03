'use client';

import { useEffect, useState } from 'react';
import { photoConsistencyMethod, type PhotoScope } from '@/lib/studio/photo';

/** 대체 방식이 적용된 경우 AI 얼굴 재확인을 수행한 것처럼 보이지 않게 알린다. */
export function ConsistencyNotice({ scope }: { scope: PhotoScope }) {
  const [basic, setBasic] = useState(false);
  useEffect(() => {
    const update = () => setBasic(photoConsistencyMethod(scope) === 'basic');
    update();
    window.addEventListener('emotime:consistency-updated', update);
    return () => window.removeEventListener('emotime:consistency-updated', update);
  }, [scope]);
  if (!basic) return null;
  return <p role="status" className="rounded-xl border-2 border-line bg-lemon/30 px-4 py-3 text-sm leading-relaxed text-ink"><strong>기본 사진 확인으로 진행 중이에요.</strong> AI 특징 재확인을 완료하지 못해 사진 파일만 확인했습니다. 원본 사진과 선택한 시안을 참조하지만 인물의 일관성은 보장되지 않습니다.</p>;
}
