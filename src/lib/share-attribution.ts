export interface ShareAttribution { source: string; medium: string; campaign: string }
export const SHARE_UTM_KEY = 'emotime:share:utm:v1';

export function parseShareAttribution(input: string | URLSearchParams): ShareAttribution | null {
  const params = typeof input === 'string' ? new URLSearchParams(input.startsWith('?') ? input.slice(1) : input) : input;
  const clean = (value: string | null) => value && /^[a-zA-Z0-9_-]{1,60}$/.test(value) ? value : null;
  const source = clean(params.get('utm_source'));
  const medium = clean(params.get('utm_medium'));
  const campaign = clean(params.get('utm_campaign'));
  return source && medium && campaign ? { source, medium, campaign } : null;
}

export function rememberShareAttribution(search: string) {
  const value = parseShareAttribution(search);
  if (!value) return null;
  try { sessionStorage.setItem(SHARE_UTM_KEY, JSON.stringify(value)); } catch { /* optional attribution */ }
  return value;
}

export function rememberedShareAttribution(): ShareAttribution | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SHARE_UTM_KEY) || 'null');
    return value ? parseShareAttribution(`utm_source=${value.source}&utm_medium=${value.medium}&utm_campaign=${value.campaign}`) : null;
  } catch { return null; }
}
