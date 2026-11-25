import type { Metadata } from 'next';
import { ChannelLanding, type ChannelLandingCopy } from '@/components/landing/ChannelLanding';
import { getLocale } from '@/lib/i18n/server';

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
    alternates: { canonical: '/team' },
    openGraph: {
      title, description, type: 'website', url: '/team',
      images: [{ url: '/og/emotihak-og.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og/emotihak-og.png'] },
  };
}

const KO: ChannelLandingCopy = {
  campaign: 'team',
  badge: '🏢 직장인 생존 12컷',
  title: '팀 단톡방에 내 얼굴 야근콘을 던져라',
  subtitle: '야근 확정·칼퇴 승인·회식 참석 — 사회생활 필수 12컷을 내 얼굴로 3분 만에.',
  bullets: [
    { emoji: '🌙', title: '야근·칼퇴 대사', body: '“야근 중 살려줘” “칼퇴 가능?” — 월요병·야근 시즌 대사가 기본 탑재' },
    { emoji: '👥', title: '팀·부서 관계팩', body: '보고·회의·회식까지 팀 단톡방에서 바로 쓰는 12컷' },
    { emoji: '📱', title: '카톡 바로 보내기', body: '잠금 해제하면 투명 PNG로 뽑아서 단톡방에 사진처럼 전송' },
  ],
  steps: [
    '정면 사진 1장을 올린다',
    '직장인 무드와 대사를 골라 12컷 미리보기를 만든다',
    '마음에 들면 단건 완성권으로 잠금 해제',
  ],
  faq: [
    { q: '회사에서 써도 되나요?', a: '내 대화방에 보내는 용도는 자유롭게 쓸 수 있습니다. 상업적 이용(광고·판매)은 Creator Pro 라이선스가 필요합니다.' },
    { q: '사진이 서버에 저장되나요?', a: '아니요. 원본은 서버에 저장하지 않고 분석용 특징만 잠시 사용 후 파기합니다.' },
    { q: '무료로 어디까지 되나요?', a: '12컷 워터마크 미리보기까지 무료입니다. 단건 팩 완성권은 5,900원입니다.' },
  ],
};

const EN: ChannelLandingCopy = {
  campaign: 'team',
  badge: '🏢 12 work-survival cuts',
  title: 'Drop your own face into the team chat',
  subtitle: 'Overtime, sign-off, team dinners — the 12 cuts office life needs, in 3 minutes.',
  bullets: [
    { emoji: '🌙', title: 'Overtime lines', body: '"Still at work, send help" — Monday and late-night lines included' },
    { emoji: '👥', title: 'Team & department pack', body: '12 cuts for reports, meetings and team dinners' },
    { emoji: '📱', title: 'Chat-ready', body: 'Unlocked packs export as transparent PNGs you can send like photos' },
  ],
  steps: [
    'Upload one front-facing photo',
    'Pick the office mood and lines, generate the 12-cut preview',
    'Unlock the pack if you love it',
  ],
  faq: [
    { q: 'Can I use these at work?', a: 'Yes for your own chats. Commercial use (ads, resale) needs the Creator Pro license.' },
    { q: 'Are my photos stored?', a: 'No. Originals are never stored; only analysis features are briefly used and purged.' },
    { q: 'What is free?', a: 'The watermarked 12-cut preview is free. The single pack unlock is ₩5,900.' },
  ],
};

export default async function TeamLandingPage() {
  const locale = await getLocale();
  return <ChannelLanding locale={locale} copy={locale === 'en' ? EN : KO} />;
}
