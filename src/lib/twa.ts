// TWA(Trusted Web Activity) environment detection.
// A UA token is an environment signal, never proof of a Play purchase.
// Keep rate limits and the KST daily AI fair-use quota enabled. Paid-app
// purchase/refund verification requires a separate Play licensing flow.
export const PLAY_HEADER = 'x-emotihak-play';

export function uaIsTWA(ua: string): boolean {
  return /TWA\//i.test(ua ?? '');
}

/** Browser-only helper; returns false during server rendering. */
export function isTWA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return uaIsTWA(navigator.userAgent);
}
