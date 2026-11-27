import type { Metadata } from 'next';
import { ChannelLanding, type ChannelLandingCopy } from '@/components/landing/ChannelLanding';
import { PHOTO_SAMPLES } from '@/lib/photo-samples';
import { getLocale } from '@/lib/i18n/server';
import { pageAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === 'en'
    ? 'Team chat stickers from your face — EmotiHak'
    : '팀 단톡방 이모티콘 — 내 얼굴 야근·칼퇴 12컷 | 이모티학';
  const description = locale === 'en'
    ? 'Overtime, sign-off, meetings — 12 work-proof cuts from your face for the team chat.'
    : '야근·칼퇴·회식·보고 — 팀 단톡방 생존용 12컷을 내 얼굴로 3분 만에.';
  return {
    title,
    description,
    keywords: locale === 'en'
      ? ['team stickers', 'work emoticons', 'office memes']
      : ['직장인 이모티콘', '팀 단톡 이모티콘', '야근 짤', '칼퇴 이모티콘', '회사 단톡방'],
    openGraph: {
      title, description, type: 'website', url: '/team',
      images: [{ url: '/og/emotihak-og.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og/emotihak-og.png'] },
    alternates: await pageAlternates('/team'),
  };
}

const KO: ChannelLandingCopy = {
  campaign: 'team',
  format: 'situation',
  badge: '🏢 직장인 생존 12컷',
  title: '팀 단톡방에 내 얼굴 야근콘을 던져라',
  subtitle: '야근 확정·칼퇴 승인·회식 참석 — 사회생활 필수 12컷을 내 얼굴로 3분 만에.',
  photoSamples: PHOTO_SAMPLES.team,
  photoSampleTitle: '예시 · 회사에서 쓰는 실사 짤',
  photoSampleNote: '사진 그대로 누끼 따고 직장 대사만 얹은 실사 스티커예요. 예시 이미지입니다.',
  bullets: [
    { emoji: '🌙', title: '야근·칼퇴 대사', body: '“야근 중 살려줘” “칼퇴 가능?” — 월요병·야근 시즌 대사가 기본 탑재' },
    { emoji: '👥', title: '팀·부서 관계팩', body: '보고·회의·회식까지 팀 단톡방에서 바로 쓰는 12컷' },
    { emoji: '🖼️', title: '4컷 먼저, 12컷 완성', body: '무료로 4컷을 먼저 보고, 마음에 들면 5,900원 잠금 해제로 나머지 8컷까지 12컷 완성' },
  ],
  steps: [
    '정면 사진 1장을 올린다',
    '직장인 무드와 대사를 골라 무료 4컷 미리보기를 만든다',
    '마음에 들면 단건 완성권 5,900원으로 잠금 해제 — 나머지 8컷까지 12컷 완성',
  ],
  faq: [
    { q: '회사에서 써도 되나요?', a: '내 대화방에 보내는 용도는 자유롭게 쓸 수 있습니다. 상업적 이용(광고·판매)은 Creator Pro 라이선스가 필요합니다.' },
    { q: '사진이 서버에 저장되나요?', a: '아니요. 원본은 서버에 저장하지 않고 분석용 특징만 잠시 사용 후 파기합니다.' },
    { q: '무료로 어디까지 되나요?', a: '4컷 워터마크 미리보기까지 무료입니다. 단건 팩 완성권(5,900원)으로 잠금 해제하면 나머지 8컷까지 그려 12컷 전체를 받습니다.' },
  ],
};

const EN: ChannelLandingCopy = {
  campaign: 'team',
  format: 'situation',
  badge: '🏢 12 work-survival cuts',
  title: 'Drop your own face into the team chat',
  subtitle: 'Overtime, sign-off, team dinners — the 12 cuts office life needs, in 3 minutes.',
  photoSamples: PHOTO_SAMPLES.team,
  photoSampleTitle: 'Example · office-ready photo stickers',
  photoSampleNote: 'Cut straight from the photo with a work line. Sample image.',
  bullets: [
    { emoji: '🌙', title: 'Overtime lines', body: '"Still at work, send help" — Monday and late-night lines included' },
    { emoji: '👥', title: 'Team & department pack', body: '12 cuts for reports, meetings and team dinners' },
    { emoji: '🖼️', title: '4 cuts now, 12 on unlock', body: 'See 4 cuts free first; unlock for ₩5,900 to draw the remaining 8 and finish all 12' },
  ],
  steps: [
    'Upload one front-facing photo',
    'Pick the office mood and lines, generate the free 4-cut preview',
    'Unlock (₩5,900) to finish the remaining 8 cuts for all 12',
  ],
  faq: [
    { q: 'Can I use these at work?', a: 'Yes for your own chats. Commercial use (ads, resale) needs the Creator Pro license.' },
    { q: 'Are my photos stored?', a: 'No. Originals are never stored; only analysis features are briefly used and purged.' },
    { q: 'What is free?', a: 'The watermarked 4-cut preview is free. The ₩5,900 unlock finishes the remaining 8 cuts for all 12.' },
  ],
};

export default async function TeamLandingPage() {
  const locale = await getLocale();
  return <ChannelLanding locale={locale} copy={locale === 'en' ? EN : KO} />;
}
