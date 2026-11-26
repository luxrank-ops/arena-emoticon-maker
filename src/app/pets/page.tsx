import type { Metadata } from 'next';
import { ChannelLanding, type ChannelLandingCopy } from '@/components/landing/ChannelLanding';
import { PHOTO_SAMPLES } from '@/lib/photo-samples';
import { getLocale } from '@/lib/i18n/server';
import { pageAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === 'en'
    ? 'Pet stickers from one photo — EmotiHak'
    : '강아지·고양이 이모티콘 만들기 — 사진 1장으로 12컷 | 이모티학';
  const description = locale === 'en'
    ? 'Turn your dog or cat into a 12-cut sticker pack in 3 minutes. Butler memes, transparent PNG, chat-ready.'
    : '우리 애 사진 1장으로 12컷 이모티콘 완성. 집사 밈 대사·투명 PNG·카톡 바로 보내기까지 3분.';
  return {
    title,
    description,
    keywords: locale === 'en'
      ? ['pet stickers', 'dog emoticon', 'cat sticker maker']
      : ['강아지 이모티콘', '고양이 이모티콘', '반려동물 스티커 만들기', '펫 이모티콘'],
    openGraph: {
      title, description, type: 'website', url: '/pets',
      images: [{ url: '/og/emotihak-og.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og/emotihak-og.png'] },
    alternates: await pageAlternates('/pets'),
  };
}

const KO: ChannelLandingCopy = {
  campaign: 'pets',
  badge: '🐶 반려동물 전용 12컷 팩',
  title: '우리 애 사진 1장이면 12컷 이모티콘',
  subtitle: '산책 재촉·간식 조르기·꿀잠 — 집사만 아는 그 표정을 카톡에 바로 뿌리세요.',
  photoSamples: PHOTO_SAMPLES.pet,
  photoSampleTitle: '예시 · 우리 애 사진 한 장이면',
  photoSampleNote: '사진 그대로 누끼 따고 집사 밈 대사만 얹은 실사 스티커예요. 예시 이미지입니다.',
  bullets: [
    { emoji: '💬', title: '집사 밈 대사', body: '“간식 내놔” “산책 가자” “집사야 일해라” — 집사 일상 대사가 기본 탑재' },
    { emoji: '🖼️', title: '12컷 전체 미리보기', body: '워터마크 미리보기로 12컷을 다 본 뒤 마음에 들 때만 잠금 해제' },
    { emoji: '📱', title: '카톡 바로 보내기', body: '잠금 해제하면 투명 PNG로 뽑아서 단톡방에 사진처럼 전송' },
  ],
  steps: [
    '우리 애 정면 사진 1장을 올린다 (사람 얼굴 아님 주의!)',
    '화풍을 고르고 12컷 미리보기를 만든다',
    '마음에 들면 반려동물 팩 완성권으로 잠금 해제',
  ],
  faq: [
    { q: '사람 사진과 같이 올리면 되나요?', a: '반려동물 팩은 동물 사진 1장으로 만듭니다. 사람+반려는 2인 케미 팩을 이용해 주세요.' },
    { q: '사진이 서버에 저장되나요?', a: '아니요. 원본은 서버에 저장하지 않고 분석용 특징만 잠시 사용 후 파기합니다.' },
    { q: '무료로 어디까지 되나요?', a: '12컷 워터마크 미리보기까지 무료입니다. 반려동물 팩 잠금 해제는 6,900원입니다.' },
  ],
};

const EN: ChannelLandingCopy = {
  campaign: 'pets',
  badge: '🐶 12-cut pet pack',
  title: 'One pet photo becomes 12 stickers',
  subtitle: 'Walkies, treats, naps — the faces only pet parents know, ready for chat in 3 minutes.',
  photoSamples: PHOTO_SAMPLES.pet,
  photoSampleTitle: 'Example · one pet photo',
  photoSampleNote: 'Cut straight from the photo with one pet-parent line. Sample image.',
  bullets: [
    { emoji: '💬', title: 'Pet-parent memes', body: '"Treats, now" "Walk time" — the lines pet parents actually send' },
    { emoji: '🖼️', title: 'All 12 cuts first', body: 'See all 12 cuts watermarked, then unlock only if you love it' },
    { emoji: '📱', title: 'Chat-ready', body: 'Unlocked packs export as transparent PNGs you can send like photos' },
  ],
  steps: [
    'Upload one front-facing photo of your pet',
    'Pick a style and generate the 12-cut preview',
    'Unlock the pet pack if you love it',
  ],
  faq: [
    { q: 'Can I mix a person and a pet?', a: 'Pet packs use one animal photo. For person+pet, use the duo chemistry pack.' },
    { q: 'Are my photos stored?', a: 'No. Originals are never stored; only analysis features are briefly used and purged.' },
    { q: 'What is free?', a: 'The watermarked 12-cut preview is free. The pet pack unlock is ₩6,900.' },
  ],
};

export default async function PetsLandingPage() {
  const locale = await getLocale();
  return <ChannelLanding locale={locale} copy={locale === 'en' ? EN : KO} />;
}
