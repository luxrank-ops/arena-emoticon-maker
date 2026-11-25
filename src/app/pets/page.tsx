import type { Metadata } from 'next';
import { ChannelLanding, type ChannelLandingCopy } from '@/components/landing/ChannelLanding';
import { getLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === 'en'
    ? 'Pet stickers from one photo — EmotiHak'
    : '강아지·고양이 이모티콘 만들기 — 사진 1장으로 12컷 | 이모티학';
  const description = locale === 'en'
    ? 'Turn your dog or cat into a 12-cut sticker pack in 3 minutes. Clay style, butler memes, KakaoTalk-ready.'
    : '우리 애 사진 1장으로 12컷 이모티콘 완성. 클레이 화풍·집사 밈·카톡 바로 보내기까지 3분.';
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
  };
}

const KO: ChannelLandingCopy = {
  campaign: 'pets',
  badge: '🐶 반려동물 전용 12컷 팩',
  title: '우리 애 사진 1장이면 12컷 이모티콘',
  subtitle: '산책 재촉·간식 조르기·꿀잠 — 집사만 아는 그 표정을 카톡에 바로 뿌리세요.',
  bullets: [
    { emoji: '🧸', title: '클레이 화풍', body: '뭉게뭉게 귀여운 질감으로 우리 애가 피규어가 됩니다' },
    { emoji: '💬', title: '집사 밈 대사', body: '산책·간식·쓰다듬기 — 집사 일상 대사가 기본 탑재' },
    { emoji: '📱', title: '카톡 바로 보내기', body: '투명 PNG로 뽑아서 단톡방에 사진처럼 전송' },
  ],
  steps: [
    '우리 애 정면 사진 1장을 올린다 (사람 얼굴 아님 주의!)',
    '클레이·2D·수채 중 화풍을 고른다',
    '12컷 미리보기를 확인하고 마음에 들면 잠금 해제',
  ],
  faq: [
    { q: '사람 사진과 같이 올리면 되나요?', a: '반려동물 팩은 동물 사진 1장으로 만듭니다. 사람+반려는 2인 케미 팩을 이용해 주세요.' },
    { q: '사진이 서버에 저장되나요?', a: '아니요. 원본은 서버에 저장하지 않고 분석용 특징만 잠시 사용 후 파기합니다.' },
    { q: '무료로 어디까지 되나요?', a: '12컷 워터마크 미리보기까지 무료입니다. 내보내기·고화질은 ₩5,900부터 잠금 해제됩니다.' },
  ],
};

const EN: ChannelLandingCopy = {
  campaign: 'pets',
  badge: '🐶 12-cut pet pack',
  title: 'One pet photo becomes 12 stickers',
  subtitle: 'Walkies, treats, naps — the faces only pet parents know, ready for chat in 3 minutes.',
  bullets: [
    { emoji: '🧸', title: 'Clay style', body: 'Squishy figurine texture turns your pet into a collectible' },
    { emoji: '💬', title: 'Pet-parent memes', body: 'Walk·treat·cuddle lines come preloaded' },
    { emoji: '📱', title: 'Chat-ready', body: 'Transparent PNGs you can send like photos' },
  ],
  steps: [
    'Upload one front-facing photo of your pet',
    'Pick a style: clay, 2D, or watercolor',
    'Check the 12-cut preview, unlock if you love it',
  ],
  faq: [
    { q: 'Can I mix a person and a pet?', a: 'Pet packs use one animal photo. For person+pet, use the duo chemistry pack.' },
    { q: 'Are my photos stored?', a: 'No. Originals are never stored; only analysis features are briefly used and purged.' },
    { q: 'What is free?', a: 'The watermarked 12-cut preview is free. Exports and Hi-Res unlock from ₩5,900.' },
  ],
};

export default async function PetsLandingPage() {
  const locale = await getLocale();
  return <ChannelLanding locale={locale} copy={locale === 'en' ? EN : KO} />;
}
