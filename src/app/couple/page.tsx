import type { Metadata } from 'next';
import { ChannelLanding, type ChannelLandingCopy } from '@/components/landing/ChannelLanding';
import { PHOTO_SAMPLES } from '@/lib/photo-samples';
import { getLocale } from '@/lib/i18n/server';
import { pageAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === 'en'
    ? 'Couple stickers from two photos — EmotiHak'
    : '커플 이모티콘 만들기 — 사진 2장으로 둘만의 12컷 | 이모티학';
  const description = locale === 'en'
    ? 'A 12-cut couple pack from two photos — the lines couples actually send, chat-ready in 3 minutes.'
    : '사진 2장으로 만드는 둘만의 12컷. “삐짐 vs 달래기” 같은 커플 대사까지, 3분이면 완성.';
  return {
    title,
    description,
    keywords: locale === 'en'
      ? ['couple stickers', 'anniversary gift', 'photo gift']
      : ['커플 이모티콘', '커플 선물', '기념일 선물', '커플 짤'],
    openGraph: {
      title, description, type: 'website', url: '/couple',
      images: [{ url: '/og/emotihak-og.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og/emotihak-og.png'] },
    alternates: await pageAlternates('/couple'),
  };
}

const KO: ChannelLandingCopy = {
  campaign: 'couple',
  format: 'duo-chemi',
  badge: '💑 커플·친구 2인 케미 12컷',
  title: '둘의 얼굴로 만드는 세상에 하나뿐인 12컷',
  subtitle: '사진 2장이면 하이파이브·삐짐·화해까지 — 둘만 아는 표정으로 단톡방을 장악하세요.',
  photoSamples: PHOTO_SAMPLES.couple,
  photoSampleTitle: '예시 · 두 사람 사진이면',
  photoSampleNote: '사진 그대로 누끼 따고 대사만 얹은 2인 실사 스티커예요. 예시 이미지입니다.',
  bullets: [
    { emoji: '💕', title: '2인 케미 12컷', body: '사진 2장의 얼굴을 각각 참조해 둘이 함께 나오는 컷을 만듭니다' },
    { emoji: '🗣️', title: '커플 대사 기본 탑재', body: '“퇴근 후 치맥 콜?” “삐짐 vs 달래기” — 커플·친구 12컷 전용 대사' },
    { emoji: '🖼️', title: '4컷 먼저, 12컷 완성', body: '무료로 4컷을 먼저 보고, 마음에 들면 7,900원 잠금 해제로 나머지 8컷까지 12컷 완성' },
  ],
  steps: [
    '내 사진 1장을 올리고 2인 케미 팩을 고른다',
    '두 번째 사진(상대방)을 올려 무료 4컷 미리보기를 만든다',
    '마음에 들면 2인 케미 완성권 7,900원으로 잠금 해제 — 나머지 8컷까지 12컷 완성',
  ],
  faq: [
    { q: '상대방 사진은 어떻게 받나요?', a: '내 사진을 먼저 올리고, 팩 화면에서 상대방 사진을 한 장 더 올리면 됩니다. 두 사진의 얼굴을 각각 참조해 컷을 만듭니다.' },
    { q: '사진이 서버에 저장되나요?', a: '아니요. 원본은 서버에 저장하지 않고 분석용 특징만 잠시 사용 후 파기합니다.' },
    { q: '무료로 어디까지 되나요?', a: '4컷 워터마크 미리보기까지 무료입니다. 2인 케미 팩 잠금 해제는 7,900원이고, 잠금 해제하면 나머지 8컷까지 그려 12컷 전체를 받습니다.' },
  ],
};

const EN: ChannelLandingCopy = {
  campaign: 'couple',
  format: 'duo-chemi',
  badge: '💑 12-cut duo pack',
  title: 'A one-of-a-kind 12-cut pack from both your faces',
  subtitle: 'Two photos for high-fives, sulking and making up — the faces only the two of you know.',
  photoSamples: PHOTO_SAMPLES.couple,
  photoSampleTitle: 'Example · two photos',
  photoSampleNote: 'Both faces cut from your photos with one line. Sample image.',
  bullets: [
    { emoji: '💕', title: '12 duo cuts', body: 'Each photo is referenced so both of you appear together' },
    { emoji: '🗣️', title: 'Couple lines included', body: 'Lines couples and friends actually send come preloaded' },
    { emoji: '🖼️', title: '4 cuts now, 12 on unlock', body: 'See 4 cuts free first; unlock for ₩7,900 to draw the remaining 8 and finish all 12' },
  ],
  steps: [
    'Upload your photo and pick the duo chemistry pack',
    'Add the second photo and generate the free 4-cut preview',
    'Unlock the duo pack (₩7,900) to finish the remaining 8 cuts for all 12',
  ],
  faq: [
    { q: 'How do I get the other photo?', a: 'Upload yours first, then add the second photo on the pack screen. Both faces are referenced per cut.' },
    { q: 'Are my photos stored?', a: 'No. Originals are never stored; only analysis features are briefly used and purged.' },
    { q: 'What is free?', a: 'The watermarked 4-cut preview is free. The duo pack unlock is ₩7,900 and finishes the remaining 8 cuts for all 12.' },
  ],
};

export default async function CoupleLandingPage() {
  const locale = await getLocale();
  return <ChannelLanding locale={locale} copy={locale === 'en' ? EN : KO} />;
}
