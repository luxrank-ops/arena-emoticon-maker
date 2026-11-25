import type { Metadata } from 'next';
import { ChannelLanding, type ChannelLandingCopy } from '@/components/landing/ChannelLanding';
import { getLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === 'en'
    ? 'Team chat stickers from your face — EmotiHak'
    : '팀 단톡방 이모티콘 — 내 얼굴 야근·칼퇴 24컷 | 이모티학';
  const description = locale === 'en'
    ? 'Overtime, sign-off, meetings — 24 work-proof cuts from your face for the team chat.'
    : '야근·칼퇴·회식·보고 — 팀 단톡방 생존용 24컷을 내 얼굴로 3분 만에.';
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
  };
}

const KO: ChannelLandingCopy = {
  campaign: 'team',
  badge: '🏢 P0 핵심 — 직장인 생존 24컷',
  title: '팀 단톡방에 내 얼굴 야근콘을 던져라',
  subtitle: '야근 확정·칼퇴 승인·회식 참석 — 사회생활 필수 24컷을 내 얼굴로.',
  bullets: [
    { emoji: '💼', title: '직장 상황 24컷', body: '출근·회의·야근·회식·보고 — 하루 동선에 붙는 대사' },
    { emoji: '😏', title: '사회생활 톤', body: '무뚝뚝·정색·킹받음 — 하고 싶은 말을 얼굴로 대신' },
    { emoji: '👥', title: '팀 전염 구조', body: '1명이 쓰면 팀 전체가 저장 — 초대하면 서로 보너스' },
  ],
  steps: [
    '셀카 1장을 올리고 직장 팩(팀·부서)을 고른다',
    '야근·칼퇴·회식 컷 24종을 확인한다',
    '팀 단톡방에 투하 → 반응 감상 → 동료 초대',
  ],
  faq: [
    { q: '회사 사람이 보면 민망하지 않나요?', a: '개그 캐리커처 화풍이 가장 인기입니다. 적당히 웃기고 적당히 닮아서 반응이 좋습니다.' },
    { q: '팀원 얼굴로 만들어도 되나요?', a: '반드시 본인 동의를 받으세요. 본인 사진 외 사용은 약관 위반이며 신고 대상입니다.' },
    { q: '매일 새로운 컷을 받을 수 있나요?', a: '매일 아침 오늘의 브리핑 8컷이 자동 도착합니다. 요일·시간대에 맞춘 생존 키트예요.' },
  ],
};

const EN: ChannelLandingCopy = {
  campaign: 'team',
  badge: '🏢 24 work-survival cuts',
  title: 'Drop your overtime face in the team chat',
  subtitle: 'Overtime, sign-off, dinners, reports — 24 work-essential cuts from your face.',
  bullets: [
    { emoji: '💼', title: '24 work situations', body: 'Commute, meetings, overtime, dinners — lines for your whole day' },
    { emoji: '😏', title: 'Office-safe tones', body: 'Deadpan, polite, savage — say it with your face' },
    { emoji: '👥', title: 'Team contagion', body: 'One person uses it, the whole team saves it — invite for bonuses' },
  ],
  steps: [
    'Upload one selfie and pick the team pack',
    'Check 24 overtime·sign-off·dinner cuts',
    'Drop it in the team chat → enjoy reactions → invite mates',
  ],
  faq: [
    { q: 'Won’t it be awkward at work?', a: 'The gag-caricature style is the favorite — funny enough, still you.' },
    { q: 'Can I use a coworker’s face?', a: 'Only with their consent. Using others’ photos violates the terms.' },
    { q: 'Fresh cuts every day?', a: 'Yes — the morning briefing delivers 8 cuts matched to your day.' },
  ],
};

export default async function TeamLandingPage() {
  const locale = await getLocale();
  return <ChannelLanding locale={locale} copy={locale === 'en' ? EN : KO} />;
}
