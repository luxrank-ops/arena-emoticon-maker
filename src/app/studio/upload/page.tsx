import { UploadPageContent } from '@/components/studio/UploadPageContent';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return pageMetadata({
    path: '/studio/upload',
    title: '사진으로 이모티콘 만들기 — 12컷 무료 미리보기 | 이모티학',
    description:
      '사진 한 장을 올리고 화풍과 구도를 고르면 12컷 이모티콘을 만들어 드려요. 12컷 전체를 워터마크로 먼저 보고 마음에 드는 팩만 잠금 해제하세요.',
  });
}

export default function UploadPage() {
  return <UploadPageContent step="photo" />;
}
