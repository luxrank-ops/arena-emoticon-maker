import { UploadPageContent } from '@/components/studio/UploadPageContent';
import { pageMetadata } from '@/lib/seo';
import { getLocale } from '@/lib/i18n/server';
import { tr } from '@/lib/i18n/locale';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const locale = await getLocale();
  return pageMetadata({
    path: '/studio/upload',
    title: tr(
      locale,
      '사진으로 이모티콘 만들기 — 무료 4컷 미리보기 | 이모티학',
      'Make stickers from a photo — 4 cuts free to preview | EmotiHak',
    ),
    description: tr(
      locale,
      '사진 한 장을 올리고 화풍과 구도를 고르면 12컷 이모티콘을 만들어 드려요. 4컷은 무료로 먼저 보여 드리고, 잠금 해제하면 나머지 8컷까지 그려 12컷 전체를 받습니다.',
      'Upload one photo and pick a style — 4 cuts are drawn free first, and unlocking finishes the remaining 8 for all 12 stickers.',
    ),
  });
}

export default function UploadPage() {
  return <UploadPageContent step="photo" />;
}
