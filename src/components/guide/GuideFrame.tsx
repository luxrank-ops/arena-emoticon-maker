'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/lib/i18n/locale';

/** Same-origin guide document that reports its content height to avoid nested scrolling. */
export function GuideFrame({ locale }: { locale: Locale }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1600);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;
      const data = event.data as { type?: unknown; height?: unknown };
      if (data.type !== 'emotihak-guide-height' || typeof data.height !== 'number' || !Number.isFinite(data.height)) return;
      setHeight(Math.max(900, Math.min(40_000, Math.ceil(data.height))));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const requestHeight = () => {
    frameRef.current?.contentWindow?.postMessage({ type: 'emotihak-guide-request-height' }, window.location.origin);
  };

  return (
    <iframe
      ref={frameRef}
      src="/guide/manual.html"
      title={locale === 'en' ? 'EmotiHak Korean user guide' : '이모티학 사용 설명서'}
      className="block w-full border-0 bg-paper"
      style={{ height }}
      loading="eager"
      onLoad={requestHeight}
    />
  );
}
