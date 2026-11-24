import type { Metadata } from 'next';
import { GuideFrame } from '@/components/guide/GuideFrame';
import { getLocale } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: '사용 설명서 · 이모티학',
  description: '실제 앱 화면을 보며 이모티학의 사진 스티커, AI 팩, 대사, 프리셋과 저장 기능을 익혀 보세요.',
};

export default async function GuidePage() {
  const locale = await getLocale();
  return <GuideFrame locale={locale} />;
}
