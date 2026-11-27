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
    ? 'Turn your dog or cat into a 12-cut sticker pack in 3 minutes. Butler memes, your pet’s real background kept in a soft rounded frame, chat-ready.'
    : '우리 애 사진 1장으로 12컷 이모티콘 완성. 집사 밈 대사·사진 그대로 둥근 프레임·카톡 바로 보내기까지 3분.';
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
  format: 'pet-meme',
  subject: 'pet',
  badge: '🐶 반려동물 전용 12컷 팩',
  title: '우리 애 사진 1장이면 12컷 이모티콘',
  subtitle: '“지금 뭐 먹어?” “나 좀 봐줘” “삐졌어 건들지마” — 우리 애가 사람 말로 말하는 12컷, 카톡에 바로 뿌리세요.',
  photoSamples: PHOTO_SAMPLES.pet,
  photoSampleTitle: '예시 · 우리 애 사진 한 장이면',
  photoSampleNote: '누끼(배경 지우기) 없이 사진 배경 그대로, 둥근 프레임에 집사 밈 대사만 얹은 실사 스티커예요. 털 끝까지 살아 있어요. 예시 이미지입니다.',
  bullets: [
    { emoji: '💬', title: '사람 말투 12컷', body: '“지금 뭐 먹어?” “오늘 늦게 와?” “진짜 실화야?” — 단톡방에서 사람이 쓰는 말투 그대로' },
    { emoji: '🖼️', title: '4컷 먼저, 12컷 완성', body: '무료로 4컷을 먼저 보고, 마음에 들면 6,900원 잠금 해제로 나머지 8컷까지 12컷 완성' },
    { emoji: '📱', title: '카톡 바로 보내기', body: '잠금 해제하면 360×360 PNG로 뽑아서 단톡방에 사진처럼 전송' },
  ],
  steps: [
    '우리 애 정면 사진 1장을 올린다 (사람 얼굴 아님 주의!)',
    '화풍을 고르고 무료 4컷 미리보기를 만든다',
    '마음에 들면 반려동물 팩 완성권 6,900원으로 잠금 해제 — 나머지 8컷까지 12컷 완성',
  ],
  faq: [
    { q: '사람 사진과 같이 올리면 되나요?', a: '반려동물 팩은 동물 사진 1장으로 만듭니다. 사람+반려는 2인 케미 팩을 이용해 주세요.' },
    { q: '배경을 지우지 않나요?', a: '반려동물은 털 끝이 뭉개지지 않도록 배경을 지우지 않고 사진 그대로 둥근 프레임으로 마감합니다. 사람·커플·팀 팩은 배경을 지운 투명 스티커로 만들 수 있어요.' },
    { q: '사진이 서버에 저장되나요?', a: '아니요. 원본은 서버에 저장하지 않고 분석용 특징만 잠시 사용 후 파기합니다.' },
    { q: '무료로 어디까지 되나요?', a: '4컷 워터마크 미리보기까지 무료입니다. 반려동물 집사 밈 팩 잠금 해제는 6,900원이고, 잠금 해제하면 나머지 8컷까지 그려 12컷 전체를 받습니다.' },
    { q: '일반 팩 5,900원과 무엇이 다른가요?', a: '반려동물 집사 밈은 강아지·고양이 전용 대사 12컷 구성이라 완성권이 6,900원입니다(일반 팩 5,900원 · 2인 케미 7,900원).' },
  ],
};

const EN: ChannelLandingCopy = {
  campaign: 'pets',
  format: 'pet-meme',
  subject: 'pet',
  badge: '🐶 12-cut pet pack',
  title: 'One pet photo becomes 12 stickers',
  subtitle: '“What are you eating?” “Look at me” — twelve cuts where your pet talks like a person, ready for chat in 3 minutes.',
  photoSamples: PHOTO_SAMPLES.pet,
  photoSampleTitle: 'Example · one pet photo',
  photoSampleNote: 'Cut straight from your photo with the real background kept in a soft rounded frame — one pet-parent line on top. Sample image.',
  bullets: [
    { emoji: '💬', title: 'Twelve human lines', body: '"What are you eating?" "Home late?" — the way people actually talk in a group chat' },
    { emoji: '🖼️', title: '4 cuts now, 12 on unlock', body: 'See 4 cuts free first; unlock for ₩6,900 to draw the remaining 8 and finish all 12' },
    { emoji: '📱', title: 'Chat-ready', body: 'Unlocked packs export as 360×360 PNGs you can send like photos' },
  ],
  steps: [
    'Upload one front-facing photo of your pet',
    'Pick a style and generate the free 4-cut preview',
    'Unlock the pet pack (₩6,900) to finish the remaining 8 cuts for all 12',
  ],
  faq: [
    { q: 'Can I mix a person and a pet?', a: 'Pet packs use one animal photo. For person+pet, use the duo chemistry pack.' },
    { q: 'Is the background removed?', a: 'For pets we keep the real background so fine fur stays crisp, and finish the sticker in a soft rounded frame. People, couple and team packs can still be cut out on a transparent background.' },
    { q: 'Are my photos stored?', a: 'No. Originals are never stored; only analysis features are briefly used and purged.' },
    { q: 'What is free?', a: 'The watermarked 4-cut preview is free. The pet pack unlock is ₩6,900 and finishes the remaining 8 cuts for all 12.' },
    { q: 'How is this different from the ₩5,900 pack?', a: 'The pet butler pack has its own 12 pet-specific lines, so the completion pass is ₩6,900 (classic ₩5,900, duo ₩7,900).' },
  ],
};

export default async function PetsLandingPage() {
  const locale = await getLocale();
  return <ChannelLanding locale={locale} copy={locale === 'en' ? EN : KO} />;
}
