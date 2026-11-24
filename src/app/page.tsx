import Link from 'next/link';
import { Camera, ChevronRight, MessageCircle, Package, Sparkles } from 'lucide-react';
import { ACCESSORIES } from '@/lib/accessories';
import { getLocale } from '@/lib/i18n/server';
import { EnglishLanding } from '@/components/home/EnglishLanding';
import { getCurrentUser } from '@/lib/session';
import { aiAccess, canUseAiGeneration } from '@/lib/admin-access';
import { PRICE_TIERS } from '@/lib/pricing';
import { RainFloat } from '@/components/home/RainFloat';

const samples = [
  { src: '/samples/tone-2d-cute.webp', label: '캐릭터' },
  { src: '/samples/tone-doodle.webp', label: '손그림' },
  { src: '/samples/tone-clay-3d.webp', label: '클레이' },
  { src: '/samples/tone-3d-cartoon.webp', label: '3D 카툰' },
  { src: '/samples/tone-pixel-art.webp', label: '픽셀 아트' },
  { src: '/samples/tone-watercolor.webp', label: '수채화' },
];
const steps = [
  { number: '01', title: '사진 고르기', text: '밝은 정면 사진을 선택하고 사진 상태를 확인해요.' },
  { number: '02', title: '스타일과 시안 선택', text: '구도와 스타일을 정하고, 만들어진 시안 중 마음에 드는 것을 골라요.' },
  { number: '03', title: '표정 골라 만들기', text: '컷 수와 감정 표현을 선택하면 이모티콘을 한 장씩 만들어요.' },
  { number: '04', title: '편집하고 저장하기', text: '내 팩에서 컷을 편집하고 PNG나 ZIP으로 내려받아요.' },
];
const questions = [
  { q: '사진은 어떻게 사용되나요?', a: '사진은 이 탭에 임시 보관되고, 생성 전 확인과 이미지 생성 시 Google Gemini로 전송됩니다. 원본 사진은 서버에 저장하지 않으며 생성된 시안과 컷은 보관됩니다.' },
  { q: '몇 장을 만들 수 있고 비용은 얼마인가요?', a: '무료로 12컷 전체를 워터마크 미리보기로 먼저 확인할 수 있어요. 마음에 들면 단건 팩 완성권 5,900원(2인 케미 7,900원 · 반려동물 6,900원)으로 그 팩만 잠금 해제합니다. 여러 팩은 9,900~22,000원 크레딧 팩(1컷=1크레딧)으로 만들고, 작가·브랜드는 Creator Pro 월 19,900원을 쓸 수 있어요.' },
  { q: '사진을 다시 올려야 하나요?', a: '사진은 이 브라우저 탭에만 임시 보관됩니다. 탭을 닫거나 다른 기기에서 열면 시안을 만들 때 사용한 같은 사진을 다시 올려 주세요.' },
  { q: '카카오톡에서 사용할 수 있나요?', a: '내려받은 PNG나 GIF를 채팅방에 사진으로 보낼 수 있습니다. 카카오 이모티콘 스토어 정식 출품과 심사 통과는 별개이며 보장되지 않습니다.' },
];

export default async function LandingPage() {
  const locale = await getLocale();
  const user = await getCurrentUser();
  // AI 스튜디오가 관리자 전용으로 잠겨 있는 동안에는 첫 화면이 막다른 길이 되지 않게
  // 지금 100% 동작하는 대사 스튜디오로 주 CTA 를 안내한다.
  const aiEnabled = canUseAiGeneration(user);
  // 일반 방문자에게는 '12컷 무료 미리보기'가 열려 있다 — 첫 화면에서 그 사실을 분명히 알린다.
  const trial = aiAccess(user) === 'trial';
  if (locale === 'en') {
    return (
      <>
        <EnglishLanding aiEnabled={aiEnabled} />
        <RainFloat locale="en" />
      </>
    );
  }

  // 첫 화면 바로가기 4카드 — 앱의 핵심 기능을 한 화면에서 한 번의 탭으로.
  // (긴 설명은 카드 아래 섹션으로 내리고, 여기서는 '무엇을 할 수 있는지'만 보여 준다.)
  const shortcuts = [
    {
      icon: Camera,
      tile: 'from-[#8B5CF6] to-[#6E29F5]',
      glow: 'shadow-[0_10px_22px_-12px_rgba(110,41,245,0.85)]',
      title: '내 사진 바로 스티커',
      desc: 'AI 없이 배경만 떼서 바로 저장',
      cta: '무료로 시작',
      href: '/studio/photo',
      badge: '무료',
      badgeClass: 'border-mint/25 bg-mint/10 text-mint',
    },
    {
      icon: Sparkles,
      tile: 'from-[#6E29F5] via-[#A855F7] to-[#FF4D8D]',
      glow: 'shadow-[0_10px_22px_-12px_rgba(168,85,247,0.85)]',
      title: 'AI 캐릭터 이모티콘',
      desc: '내 얼굴로 12컷 표정 팩',
      cta: aiEnabled ? (trial ? '12컷 무료로 미리보기' : 'AI로 만들기') : 'AI 스튜디오 (준비 중)',
      href: aiEnabled ? '/studio/upload' : '/quotes',
      badge: 'AI',
      badgeClass: 'border-primary/20 bg-primary/[0.07] text-primary-dark',
    },
    {
      icon: MessageCircle,
      tile: 'from-[#FF9F5A] to-[#FF4D8D]',
      glow: 'shadow-[0_10px_22px_-12px_rgba(255,77,141,0.8)]',
      title: '오늘 쓸 톡 답장',
      desc: '대화 넣으면 답장 컷 추천',
      cta: '답장 찾기',
      href: '/reply',
      badge: '',
      badgeClass: '',
    },
    {
      icon: Package,
      tile: 'from-[#5EEAD4] to-[#0E9F6E]',
      glow: 'shadow-[0_10px_22px_-12px_rgba(14,159,110,0.75)]',
      title: '내 이모티콘·굿즈',
      desc: '만든 팩 확인·편집·실물 주문',
      cta: '내 팩 열기',
      href: '/studio/packs',
      badge: '',
      badgeClass: '',
    },
  ];

  const moreLinkClass =
    'rounded-full border border-line/80 bg-white/70 px-2.5 py-1 text-[10.5px] font-bold text-sub transition hover:border-primary/35 hover:bg-white hover:text-primary-dark';

  return (
    <>
    <div className="overflow-hidden">
      {/* ── 첫 화면: 바로가기 메뉴판 ─────────────────────────────── */}
      <section className="relative isolate overflow-hidden" aria-labelledby="start-title">
        <div aria-hidden="true" className="mesh-hero pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0 -z-10" />

        <div className="wrap relative pb-9 pt-7 sm:pb-12 sm:pt-11">
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 py-1.5 pl-2 pr-3.5 text-[11px] font-bold text-primary-dark shadow-[0_8px_20px_-16px_rgba(53,25,120,0.6)] backdrop-blur">
                <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full brand-gradient text-[9px] text-white">
                  ✦
                </span>
                {trial ? '12컷 전체를 워터마크로 무료 미리보기' : '사람과 반려동물 사진 한 장으로 시작해요'}
              </span>

              <h1
                id="start-title"
                className="mt-4 break-keep text-[1.95rem] font-extrabold leading-[1.18] tracking-[-0.04em] text-ink sm:text-[2.65rem] lg:text-[3.05rem]"
              >
                내 사진으로 만드는
                <br />
                <span className="text-gradient">나만의 이모티콘</span>
              </h1>

              <p className="mt-3 max-w-xl break-keep text-[13.5px] leading-relaxed text-sub sm:text-[15px]">
                무엇을 만들지 먼저 고르세요. 사진 한 장이면 충분하고, 사진이 없어도 대사·프리셋으로 바로 만들 수 있어요.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {['사진 1장', '9가지 화풍', '12컷 무료 미리보기'].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full border border-line/80 bg-white/65 px-2.5 py-1 text-[10.5px] font-bold text-sub backdrop-blur"
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full brand-gradient" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* 데스크톱 전용 스티커 콜라주 — 실제 화풍 샘플을 스티커처럼 겹쳐 보여 준다. */}
            <div aria-hidden="true" className="relative hidden h-[320px] w-[370px] lg:block">
              <div className="sticker-frame absolute left-[86px] top-6 w-[186px] -rotate-[5deg] p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/samples/tone-clay-3d.webp" alt="" width={512} height={512} className="aspect-square w-full rounded-[1.15rem] object-contain" />
              </div>
              <div className="sticker-frame absolute right-0 top-0 w-[124px] rotate-[7deg] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/samples/tone-2d-cute.webp" alt="" width={512} height={512} className="aspect-square w-full rounded-[0.95rem] object-contain" />
              </div>
              <div className="sticker-frame absolute bottom-1 left-0 w-[116px] -rotate-[10deg] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/samples/tone-doodle.webp" alt="" width={512} height={512} className="aspect-square w-full rounded-[0.95rem] object-contain" />
              </div>
              <span className="absolute bottom-12 right-0 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-[11px] font-black text-primary-dark shadow-card backdrop-blur">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-mint" />
                12컷 한 팩
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-3 lg:grid-cols-4">
            {shortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-[1.35rem] border border-line/80 bg-white/95 p-3.5 shadow-card transition duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-pop active:translate-y-0 sm:min-h-[164px] sm:p-4"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-primary/[0.06] blur-2xl transition duration-300 group-hover:bg-hot/[0.12]"
                  />
                  <span className="relative flex items-start justify-between gap-2">
                    <span className={`grid h-10 w-10 place-items-center rounded-[0.95rem] bg-gradient-to-br text-white ${item.tile} ${item.glow} sm:h-11 sm:w-11`}>
                      <Icon className="h-[19px] w-[19px] sm:h-5 sm:w-5" strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    {item.badge ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[9.5px] font-black uppercase leading-tight tracking-[0.06em] ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="relative mt-3 block">
                    <span className="block break-keep text-[13px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[15px]">{item.title}</span>
                    <span className="mt-1 block break-keep text-[10.5px] leading-snug text-sub sm:text-xs">{item.desc}</span>
                    <span className="mt-2.5 flex items-center gap-1 text-[11px] font-black text-primary-dark">
                      {item.cta}
                      <ChevronRight className="h-3 w-3 transition duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-black uppercase tracking-[0.14em] text-sub/80">더 보기</span>
            <Link href="/presets" className={moreLinkClass}>프리셋 150</Link>
            <Link href="/quotes" className={moreLinkClass}>대사·드립</Link>
            <Link href="/brief" className={moreLinkClass}>오늘의 브리핑</Link>
            <Link href="/pricing" className={moreLinkClass}>요금제</Link>
          </div>

          <p className="mt-3 text-[10.5px] leading-relaxed text-sub/90">원본 사진은 서버에 저장하지 않아요 · 생성 결과는 사진과 다를 수 있어요</p>
        </div>
      </section>

      {/* ── 화풍 예시 (짧게) ─────────────────────────────────────── */}
      <section className="wrap py-8 sm:py-11" aria-labelledby="tone-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">STYLE LIBRARY</p>
            <h2 id="tone-title" className="mt-2 text-lg font-extrabold tracking-[-0.025em] sm:text-xl">어떤 화풍으로 만들까요?</h2>
            <p className="mt-1 text-xs leading-relaxed text-sub sm:text-sm">원본 사진 한 장을 아래 6가지 화풍으로 바꿔요.</p>
          </div>
          <Link href="/studio/upload" className="group inline-flex items-center gap-1 text-xs font-black text-primary-dark">
            사진으로 만들기
            <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {samples.map((sample) => (
            <li key={sample.src} className="group overflow-hidden rounded-[1.15rem] border border-line/80 bg-white p-1.5 text-center shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-pop">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sample.src} alt={`${sample.label} 스타일 이모티콘 예시`} width={512} height={512} className="aspect-square w-full rounded-[0.9rem] object-contain transition duration-300 group-hover:scale-[1.03]" />
              <p className="pb-0.5 pt-1.5 text-[11px] font-black">{sample.label}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 킬러 테마 ────────────────────────────────────────────── */}
      <section className="relative border-y border-line/70 bg-white/70 py-9 sm:py-12" aria-labelledby="killer-title">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">KILLER THEMES</p>
              <h2 id="killer-title" className="h2 mt-2">요즘 제일 많이 만드는 두 팩</h2>
              <p className="mt-2 max-w-2xl break-keep text-sm leading-relaxed text-sub">사진 2장이면 커플·단톡방 케미, 한 장이면 반려동물 집사 밈. 12컷 전체를 먼저 보고 필요한 팩만 잠금 해제해요.</p>
            </div>
            <Link href="/presets" className="group inline-flex items-center gap-1 text-sm font-black text-primary-dark">
              전체 프리셋 보기
              <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Link href="/studio/upload?format=duo-chemi" className="group relative overflow-hidden rounded-[1.5rem] border border-line/80 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop">
              <div className="relative flex items-center justify-between gap-2 bg-[radial-gradient(120%_120%_at_8%_0%,#FFDCE9_0%,#FFF4F8_48%,#FFFFFF_100%)] px-5 py-4">
                <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl border border-white/70 bg-white/70 text-2xl shadow-[0_10px_24px_-18px_rgba(255,77,141,0.9)] backdrop-blur">
                  💞
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[10px] font-black text-primary-dark shadow-sm backdrop-blur">
                  {trial ? '12컷 무료 미리보기' : '12컷 · 7,900원'}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-extrabold tracking-[-0.02em]">2인 케미 팩</h3>
                <p className="mt-1 break-keep text-sm leading-relaxed text-sub">“퇴근 후 치맥 콜?”, “야근 중 살려줘”, “삐짐 vs 달래기” — 커플·친구 12컷 전용.</p>
                <p className="mt-3 text-[11px] font-bold text-sub">사진 2장 · 12컷 · 완성권 7,900원</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-primary-dark">
                  12컷 미리보기
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
            <Link href="/studio/upload?format=pet-meme&subject=pet" className="group relative overflow-hidden rounded-[1.5rem] border border-line/80 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop">
              <div className="relative flex items-center justify-between gap-2 bg-[radial-gradient(120%_120%_at_8%_0%,#D8F7E8_0%,#F2FDF7_48%,#FFFFFF_100%)] px-5 py-4">
                <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl border border-white/70 bg-white/70 text-2xl shadow-[0_10px_24px_-18px_rgba(14,159,110,0.9)] backdrop-blur">
                  🐾
                </span>
                <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[10px] font-black text-mint shadow-sm backdrop-blur">
                  {trial ? '12컷 무료 미리보기' : '12컷 · 6,900원'}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-extrabold tracking-[-0.02em]">반려동물 집사 밈 팩</h3>
                <p className="mt-1 break-keep text-sm leading-relaxed text-sub">“간식 내놔”, “산책 가자”, “집사야 일해라”, “밥 줘”, “누가 방귀 꼈어” — 강아지·고양이 12컷.</p>
                <p className="mt-3 text-[11px] font-bold text-sub">사진 1장 · 12컷 · 완성권 6,900원</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-black text-primary-dark">
                  12컷 미리보기
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 만드는 순서 ──────────────────────────────────────────── */}
      <section className="wrap py-10 sm:py-14" aria-labelledby="how-title">
        <p className="eyebrow">HOW IT WORKS</p>
        <h2 id="how-title" className="h2 mt-2">이렇게 만들어요</h2>
        <p className="mt-2 text-sm leading-relaxed text-sub">한 단계씩 선택하면 돼요. 그림을 직접 그리지 않아도 됩니다.</p>
        <ol className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {steps.map((step) => (
            <li key={step.number} className="relative overflow-hidden rounded-[1.35rem] border border-line/80 bg-white p-4 shadow-card sm:p-5">
              <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-3 text-[54px] font-black leading-none text-primary/[0.06]">{step.number}</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-primary-dark">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full brand-gradient" />
                Step {step.number}
              </span>
              <h3 className="mt-2 break-keep text-base font-extrabold tracking-[-0.02em] sm:text-lg">{step.title}</h3>
              <p className="mt-2 break-keep text-xs leading-relaxed text-sub sm:text-sm">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link href={aiEnabled ? '/studio' : '/quotes'} className="btn-dark mt-6">
          {aiEnabled ? '만들기 방법 고르기 →' : '대사 스튜디오에서 시작하기 →'}
        </Link>
      </section>

      {/* ── 가격 ────────────────────────────────────────────────── */}
      <section className="border-y border-line/70 bg-white/70 py-10 sm:py-14" aria-labelledby="price-title">
        <div className="wrap">
          <p className="eyebrow">PRICING</p>
          <h2 id="price-title" className="h2 mt-2">미리 보고, 필요한 만큼만</h2>
          <p className="mt-2 text-sm leading-relaxed text-sub">12컷 전체를 무료로 확인한 뒤, 팩 하나만 결제하거나 여러 팩을 크레딧으로 만드세요.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {PRICE_TIERS.map((tier) => {
              const card = (
                <div className={`flex h-full flex-col rounded-[1.5rem] p-5 ${tier.highlight ? 'bg-white' : 'border border-line/80 bg-white/90 shadow-card'}`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sub">{tier.name}</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                    {tier.priceLabel}
                    <span className="text-xs font-bold text-sub"> {tier.unit}</span>
                  </p>
                  <p className="mt-1 text-[12px] font-bold text-primary-dark">{tier.tagline}</p>
                  <ul className="mt-3 flex-1 space-y-1 text-[11px] leading-relaxed text-sub">
                    {tier.points.map((point) => <li key={point}>· {point}</li>)}
                  </ul>
                  <Link href="/pricing" className="btn-ghost mt-4 !py-2 text-xs">자세히 보기 →</Link>
                </div>
              );
              return tier.highlight ? (
                <div key={tier.id} className="gradient-ring shadow-glow">{card}</div>
              ) : (
                <div key={tier.id}>{card}</div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 컷 편집 가이드 ───────────────────────────────────────── */}
      <section id="accessory-guide" className="wrap scroll-mt-36 py-10 sm:py-14" aria-labelledby="accessory-guide-title">
        <p className="eyebrow">CUT EDITOR</p>
        <h2 id="accessory-guide-title" className="h2 mt-2">표정과 악세사리 바꾸기</h2>
        <p className="mt-2 max-w-2xl break-keep text-sm leading-relaxed text-sub">내 팩에서 컷의 편집을 누른 뒤 표정·문구·악세사리를 고르고 ‘다시 그리기’를 눌러 적용해요. 악세사리는 최대 3개까지 고를 수 있어요.</p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="악세사리 예시">
          {ACCESSORIES.slice(0, 4).map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-white px-3 py-1.5 text-[11px] font-bold text-sub shadow-card">
              <span aria-hidden="true" className="text-sm">{item.emoji}</span> {item.name}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-sub">다시 그리기는 일반 사용자 1크레딧이며 관리자는 차감되지 않습니다. 다시 그리기 실패 시 크레딧 자동 복구를 시도합니다.</p>
        <Link href="/studio/packs" className="btn-ghost mt-5">내 팩에서 편집하기 →</Link>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="border-t border-line/70 bg-white/70 py-10 sm:py-14" aria-labelledby="faq-title">
        <div className="wrap grid gap-6 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 id="faq-title" className="h2 mt-2">자주 묻는 질문</h2>
            <p className="mt-2 text-sm text-sub">더 궁금한 점은 고객센터에서 확인해 주세요.</p>
            <Link href="/support" className="mt-3 inline-block text-sm font-black text-primary-dark underline underline-offset-4">고객센터 →</Link>
          </div>
          <div className="space-y-2.5">
            {questions.map((item) => (
              <details key={item.q} className="group rounded-[1.15rem] border border-line/80 bg-white p-4 shadow-card open:shadow-pop">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold">
                  {item.q}
                  <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/[0.08] text-[11px] font-black text-primary-dark transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 border-t border-line/70 pt-3 text-sm leading-relaxed text-sub">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
    <RainFloat locale="ko" />
    </>
  );
}
