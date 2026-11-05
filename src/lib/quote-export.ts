'use client';

import type { QuotePackView } from '@/lib/quote-packs';
import { renderPngBlob } from '@/lib/export';
import type { StickerSpec } from '@/lib/types';

/** ZIP export with provenance and a personal-use license for original quote packs. */
export async function exportQuotePackZip(
  pack: QuotePackView,
  items: { spec: StickerSpec; filename: string; quoteId: string }[],
  opts: { watermark?: boolean } = {},
) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const item of items) {
    const blob = await renderPngBlob(item.spec, { watermark: opts.watermark, size: 360 });
    zip.file(`${item.filename}.png`, blob);
  }
  zip.file('LICENSE.txt', [
    `이모티학 오리지널 대사 팩: ${pack.title}`,
    `팩 ID: ${pack.id}`,
    `권리 검토일: ${pack.rights.reviewedAt}`,
    '',
    pack.rights.note,
    '구매자 또는 무료 팩 이용자에게 개인 메신저에서 사용할 수 있는 비독점적 사용권을 제공합니다.',
    '팩·이미지·대사의 재판매, 재배포, 광고·방송·출판 등 상업적 이용은 별도 서면 라이선스가 필요합니다.',
    '특정 영화·드라마·배우·제작사와 제휴하거나 공식 라이선스를 받았다는 의미가 아닙니다.',
    '실제 영화·드라마 명대사는 권리자의 서면 라이선스와 지역·기간·매체 범위 검토 없이 등록하지 않습니다.',
  ].join('\n'));
  zip.file('pack.json', JSON.stringify({
    id: pack.id,
    title: pack.title,
    rights: pack.rights,
    quoteIds: items.map((item) => item.quoteId),
    exportedAt: new Date().toISOString(),
  }, null, 2));
  return zip.generateAsync({ type: 'blob' });
}
