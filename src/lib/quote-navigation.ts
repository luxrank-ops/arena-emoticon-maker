import type { QuotePackView } from '@/lib/quote-packs';

/** URL을 단일 기준으로 써서 같은 페이지의 링크·뒤로 가기도 화면 선택에 반영한다. */
export function resolveQuoteSelection(
  packs: QuotePackView[],
  packId: string | null,
  requestedGroupId: string | null,
) {
  const currentPack = packs.find((pack) => pack.id === packId) ?? packs[0];
  const groupId = requestedGroupId && currentPack?.groups?.some((group) => group.id === requestedGroupId)
    ? requestedGroupId
    : null;
  const visibleLines = (groupId ? currentPack?.lines.filter((line) => line.groupId === groupId) : currentPack?.lines) ?? [];
  return { currentPack, groupId, visibleLines };
}

/** 언어 경로·다른 쿼리는 유지하고, 팩 변경 시 이전 팩의 세부 테마는 지운다. */
export function quoteSelectionHref(
  pathname: string,
  searchParams: Pick<URLSearchParams, 'toString'>,
  packId: string,
  groupId: string | null = null,
) {
  const params = new URLSearchParams(searchParams.toString());
  params.set('pack', packId);
  if (groupId) params.set('theme', groupId);
  else params.delete('theme');
  return `${pathname}?${params.toString()}`;
}
