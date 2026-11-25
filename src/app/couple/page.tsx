import type { Metadata } from 'next';
import { ChannelLanding, type ChannelLandingCopy } from '@/components/landing/ChannelLanding';
import { getLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === 'en'
    ? 'Couple stickers from your faces — EmotiHak'
    : '커플 이모티콘 만들기 — 둘만의 24컷 + 실물 선물 | 이모티학';
  const description = locale === 'en'
    ? 'A 24-cut couple pack from two photos — anniversaries, birthdays, and real photo-card gifts.'
    : '사진 2장으로 만드는 둘만의 24컷. 기념일·생일 선물 + 실물 포토카드까지.';
  return {
    title,
    description,
    keywords: locale === 'en'
      ? ['couple stickers', 'anniversary gift', 'photo gift']
      : ['커플 이모티콘', '커플 선물', '기념일 선물', '사진 포토카드 선물'],
    openGraph: {
      title, description, type: 'website', url: '/couple',
      images: [{ url: '/og/emotihak-og.png', width: 1200, height: 630, alt: title }],
    },
  };
}

const KO: ChannelLandingCopy = {
  campaign: 'couple',
  badge: '💑 커플·친구 24컷 + 실물 굿즈',
  title: '둘의 얼굴로 만드는 세상에 하나뿐인 선물',
  subtitle: '기념일·생일·크리스마스 — 웃기면서 감동적인 24컷과 실물 포토카드를 함께.',
  bullets: [
    { emoji: '💕', title: '2인 케미 팩', body: '사진 2장으로 애교·삐짐·화해까지 둘의 서사를 24컷에' },
    { emoji: '🎁', title: '실물 포토카드', body: '마음에 든 컷을 포토카드·아크릴로 인쇄해 선물' },
    { emoji: '📩', title: '상대방 초대 구조', body: '링크를 보내면 상대방 사진으로 완성 — 서프라이즈 가능' },
  ],
  steps: [
    '내 사진 1장을 올리고 커플 팩을 고른다',
    '상대방에게 초대 링크를 보내 사진을 받는다',
    '24컷 완성 → 카톡 공유 + 실물 굿즈 주문',
  ],
  faq: [
    { q: '상대방 몰래 만들 수 있나요?', a: '상대방 사진이 있으면 가능합니다. 단, 본인 외 사진은 반드시 당사자 동의를 받아 주세요.' },
    { q: '크리스마스 전에 받을 수 있나요?', a: '굿즈는 주문 후 제작·배송 기간이 필요합니다. 12월 중순 이전 주문을 권장합니다.' },
    { q: '친구끼리도 되나요?', a: '네! 커플뿐 아니라 단짝친구·동아리 2인 팩으로도 많이 만듭니다.' },
  ],
};

const EN: ChannelLandingCopy = {
  campaign: 'couple',
  badge: '💑 24-cut couple pack + real gifts',
  title: 'A one-of-a-kind gift from your two faces',
  subtitle: 'Anniversaries, birthdays, Christmas — 24 funny-touching cuts plus real photo cards.',
  bullets: [
    { emoji: '💕', title: 'Duo chemistry pack', body: 'Two photos become 24 cuts of your story: cute, sulky, sweet' },
    { emoji: '🎁', title: 'Real photo cards', body: 'Print favorite cuts as photo cards or acrylic stands' },
    { emoji: '📩', title: 'Partner invite', body: 'Send a link so their photo completes the pack — surprise-ready' },
  ],
  steps: [
    'Upload your photo and pick the couple pack',
    'Invite your partner with a link to add their photo',
    'Finish 24 cuts → share in chat + order real goods',
  ],
  faq: [
    { q: 'Can I make it as a surprise?', a: 'Yes if you have their photo. Always get consent for anyone else’s photo.' },
    { q: 'How long do goods take?', a: 'Printed goods need production and shipping time. Order early for holidays.' },
    { q: 'Friends too?', a: 'Absolutely — best friends and club duos love it as much as couples.' },
  ],
};

export default async function CoupleLandingPage() {
  const locale = await getLocale();
  return <ChannelLanding locale={locale} copy={locale === 'en' ? EN : KO} />;
}
