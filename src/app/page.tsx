import Link from 'next/link';
import { ACCESSORIES } from '@/lib/accessories';
import { getLocale } from '@/lib/i18n/server';
import { EnglishLanding } from '@/components/home/EnglishLanding';
import { getCurrentUser } from '@/lib/session';
import { aiAccess, canUseAiGeneration } from '@/lib/admin-access';
import { PRICE_TIERS } from '@/lib/pricing';

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
  if (locale === 'en') return <EnglishLanding aiEnabled={aiEnabled} />;

  // 첫 화면 바로가기 4카드 — 앱의 핵심 기능을 한 화면에서 한 번의 탭으로.
  // (긴 설명은 카드 아래 섹션으로 내리고, 여기서는 '무엇을 할 수 있는지'만 보여 준다.)
  const shortcuts = [
    {
      emoji: '📸',
      title: '내 사진 바로 스티커',
      desc: 'AI 없이 배경만 떼서 바로 저장',
      cta: '무료로 시작',
      href: '/studio/photo',
      badge: '무료',
    },
    {
      emoji: '🎨',
      title: 'AI 캐릭터 이모티콘',
      desc: '내 얼굴로 12컷 표정 팩',
      cta: aiEnabled ? (trial ? '12컷 무료로 미리보기' : 'AI로 만들기') : 'AI 스튜디오 (준비 중)',
      href: aiEnabled ? '/studio/upload' : '/quotes',
      badge: 'AI',
    },
    {
      emoji: '💬',
      title: '오늘 쓸 톡 답장',
      desc: '대화 넣으면 답장 컷 추천',
      cta: '답장 찾기',
      href: '/reply',
      badge: '',
    },
    {
      emoji: '📦',
      title: '내 이모티콘·굿즈',
      desc: '만든 팩 확인·편집·실물 주문',
      cta: '내 팩 열기',
      href: '/studio/packs',
      badge: '',
    },
  ];

  return (
    <div className="overflow-hidden">
      {/* ── 첫 화면: 바로가기 메뉴판 ─────────────────────────────── */}
      <section className="relative border-b border-line bg-cream" aria-labelledby="start-title">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
        <div className="wrap relative py-6 sm:py-10">
          <span className="chip !border-primary/20 !bg-primary/10 !text-primary-dark">
            {trial ? '12컷 전체를 워터마크로 무료 미리보기' : '사람과 반려동물 사진 한 장으로 시작해요'}
          </span>
          <h1 id="start-title" className="mt-3 text-[1.7rem] font-bold leading-[1.3] tracking-[-0.025em] text-cyber sm:text-[2.25rem]">
            내 사진으로 만드는<br /><span className="text-primary">나만의 이모티콘</span>
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-sub sm:text-base">
            무엇을 만들지 먼저 고르세요. 사진 한 장이면 충분하고, 사진이 없어도 대사·프리셋으로 바로 만들 수 있어요.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-6 sm:gap-3 lg:grid-cols-4">
            {shortcuts.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="card group flex min-h-[132px] flex-col justify-between border border-line bg-paper p-3.5 transition hover:-translate-y-0.5 hover:shadow-pop active:translate-y-0 sm:min-h-[156px] sm:p-4"
              >
                <span className="flex items-start justify-between gap-2">
                  <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl bg-lemon/40 text-xl sm:h-11 sm:w-11 sm:text-2xl">{item.emoji}</span>
                  {item.badge ? (
                    <span className="rounded-full border border-line bg-cream px-2 py-0.5 text-[10px] font-black leading-tight text-primary-dark">{item.badge}</span>
                  ) : null}                </span>
                <span className="mt-3 block">
                  <span className="block text-[13px] font-black leading-tight tracking-tight sm:text-[15px]">{item.title}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-sub sm:text-xs">{item.desc}</span>
                  <span className="mt-2 flex items-center gap-1 text-[11px] font-black text-coralink">
                    {item.cta}
                    <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-sub">더 보기</span>
            <Link href="/presets" className="chip !bg-paper !py-1.5 !text-[11px] hover:border-primary hover:text-primary-dark">프리셋 150</Link>
            <Link href="/quotes" className="chip !bg-paper !py-1.5 !text-[11px] hover:border-primary hover:text-primary-dark">대사·드립</Link>
            <Link href="/brief" className="chip !bg-paper !py-1.5 !text-[11px] hover:border-primary hover:text-primary-dark">오늘의 브리핑</Link>
            <Link href="/pricing" className="chip !bg-paper !py-1.5 !text-[11px] hover:border-primary hover:text-primary-dark">요금제</Link>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-sub">
            원본 사진은 서버에 저장하지 않아요 · 생성 결과는 사진과 다를 수 있어요
          </p>
        </div>
      </section>

      {/* ── 화풍 예시 (짧게) ─────────────────────────────────────── */}
      <section className="wrap py-8 sm:py-10" aria-labelledby="tone-title">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="tone-title" className="text-lg font-black tracking-tight sm:text-xl">어떤 화풍으로 만들까요?</h2>
            <p className="mt-1 text-xs leading-relaxed text-sub sm:text-sm">원본 사진 한 장을 아래 6가지 화풍으로 바꿔요.</p>
          </div>
          <Link href="/studio/upload" className="text-xs font-black text-coralink underline underline-offset-4">사진으로 만들기 →</Link>
        </div>
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
          {samples.map((sample) => (
            <li key={sample.src} className="overflow-hidden rounded-2xl border border-line bg-paper p-1.5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sample.src} alt={`${sample.label} 스타일 이모티콘 예시`} width={512} height={512} className="aspect-square w-full rounded-xl object-contain" />
              <p className="pb-0.5 pt-1 text-[11px] font-black">{sample.label}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── 킬러 테마 ────────────────────────────────────────────── */}
      <section className="border-y border-line bg-paper py-8 sm:py-12" aria-labelledby="killer-title">
        <div className="wrap">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="chip !border-coral/40 !bg-coral/10 !text-coralink">KILLER THEMES</span>
              <h2 id="killer-title" className="h2 mt-3">요즘 제일 많이 만드는 두 팩</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">사진 2장이면 커플·단톡방 케미, 한 장이면 반려동물 집사 밈. 12컷 전체를 먼저 보고 필요한 팩만 잠금 해제해요.</p>
            </div>
            <Link href="/presets" className="text-sm font-black text-coralink underline underline-offset-4">전체 프리셋 보기 →</Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Link href="/studio/upload?format=duo-chemi" className="card group flex flex-col overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-pop">
              <div className="flex items-center justify-between gap-2 bg-gradient-to-br from-pink/70 to-cream px-5 py-4">
                <span className="text-3xl" aria-hidden="true">💞</span>
                <span className="rounded-full border border-ink/10 bg-white/70 px-2.5 py-1 text-[10px] font-black">{trial ? '12컷 무료 미리보기' : '12컷 · 7,900원'}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-black">2인 케미 팩</h3>
                <p className="mt-1 text-sm leading-relaxed text-sub">“퇴근 후 치맥 콜?”, “야근 중 살려줘”, “삐짐 vs 달래기” — 커플·친구 12컷 전용.</p>
                <p className="mt-3 text-[11px] font-bold text-sub">사진 2장 · 12컷 · 완성권 7,900원</p>
                <span className="mt-4 text-sm font-black text-coralink group-hover:underline">12컷 미리보기 →</span>
              </div>
            </Link>
            <Link href="/studio/upload?format=pet-meme&subject=pet" className="card group flex flex-col overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-pop">
              <div className="flex items-center justify-between gap-2 bg-gradient-to-br from-mint/60 to-cream px-5 py-4">
                <span className="text-3xl" aria-hidden="true">🐾</span>
                <span className="rounded-full border border-ink/10 bg-white/70 px-2.5 py-1 text-[10px] font-black">{trial ? '12컷 무료 미리보기' : '12컷 · 6,900원'}</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-black">반려동물 집사 밈 팩</h3>
                <p className="mt-1 text-sm leading-relaxed text-sub">“간식 내놔”, “산책 가자”, “집사야 일해라”, “밥 줘”, “누가 방귀 꼈어” — 강아지·고양이 12컷.</p>
                <p className="mt-3 text-[11px] font-bold text-sub">사진 1장 · 12컷 · 완성권 6,900원</p>
                <span className="mt-4 text-sm font-black text-coralink group-hover:underline">12컷 미리보기 →</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 만드는 순서 ──────────────────────────────────────────── */}
      <section className="wrap py-10 sm:py-14" aria-labelledby="how-title">
        <span className="chip !bg-lemon/40 !text-ink">처음이신가요?</span>
        <h2 id="how-title" className="h2 mt-3">이렇게 만들어요</h2>
        <p className="mt-2 text-sm leading-relaxed text-sub">한 단계씩 선택하면 돼요. 그림을 직접 그리지 않아도 됩니다.</p>
        <ol className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {steps.map((step) => <li key={step.number} className="card h-full p-4 sm:p-5"><span className="text-xs font-black text-coralink sm:text-sm">STEP {step.number}</span><h3 className="mt-2 text-base font-black sm:text-lg">{step.title}</h3><p className="mt-2 text-xs leading-relaxed text-sub sm:text-sm">{step.text}</p></li>)}
        </ol>
        <Link href={aiEnabled ? '/studio' : '/quotes'} className="btn-dark mt-6">
          {aiEnabled ? '만들기 방법 고르기 →' : '대사 스튜디오에서 시작하기 →'}
        </Link>
      </section>

      {/* ── 가격 ────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-paper py-10 sm:py-14" aria-labelledby="price-title">
        <div className="wrap">
          <span className="chip !bg-lemon/40 !text-ink">PRICING</span>
          <h2 id="price-title" className="h2 mt-3">미리 보고, 필요한 만큼만</h2>
          <p className="mt-2 text-sm leading-relaxed text-sub">12컷 전체를 무료로 확인한 뒤, 팩 하나만 결제하거나 여러 팩을 크레딧으로 만드세요.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {PRICE_TIERS.map((tier) => (
              <div key={tier.id} className={`card flex h-full flex-col p-5 ${tier.highlight ? 'ring-4 ring-coral/25' : ''}`}>
                <p className="text-xs font-black uppercase tracking-widest text-sub">{tier.name}</p>
                <p className="mt-2 text-2xl font-black">{tier.priceLabel}<span className="text-xs font-bold text-sub"> {tier.unit}</span></p>
                <p className="mt-1 text-[12px] font-bold text-coralink">{tier.tagline}</p>
                <ul className="mt-3 flex-1 space-y-1 text-[11px] leading-relaxed text-sub">
                  {tier.points.map((point) => <li key={point}>· {point}</li>)}
                </ul>
                <Link href="/pricing" className="btn-ghost mt-4 !py-2 text-xs">자세히 보기 →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 컷 편집 가이드 ───────────────────────────────────────── */}
      <section id="accessory-guide" className="wrap scroll-mt-36 py-10 sm:py-14" aria-labelledby="accessory-guide-title">
        <span className="chip !bg-lemon/40 !text-ink">컷 편집 가이드</span>
        <h2 id="accessory-guide-title" className="h2 mt-3">표정과 악세사리 바꾸기</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">내 팩에서 컷의 편집을 누른 뒤 표정·문구·악세사리를 고르고 ‘다시 그리기’를 눌러 적용해요. 악세사리는 최대 3개까지 고를 수 있어요.</p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="악세사리 예시">{ACCESSORIES.slice(0, 4).map((item) => <span key={item.id} className="chip !bg-paper"><span aria-hidden="true">{item.emoji}</span> {item.name}</span>)}</div>
        <p className="mt-4 text-xs leading-relaxed text-sub">다시 그리기는 일반 사용자 1크레딧이며 관리자는 차감되지 않습니다. 다시 그리기 실패 시 크레딧 자동 복구를 시도합니다.</p>
        <Link href="/studio/packs" className="btn-ghost mt-5">내 팩에서 편집하기 →</Link>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-paper py-10 sm:py-14" aria-labelledby="faq-title">
        <div className="wrap grid gap-6 md:grid-cols-[0.7fr_1.3fr]"><div><h2 id="faq-title" className="h2">자주 묻는 질문</h2><p className="mt-2 text-sm text-sub">더 궁금한 점은 고객센터에서 확인해 주세요.</p><Link href="/support" className="mt-3 inline-block text-sm font-black text-coralink underline underline-offset-4">고객센터 →</Link></div>
          <div className="space-y-3">{questions.map((item) => <details key={item.q} className="card-flat p-4"><summary className="cursor-pointer text-sm font-black">{item.q}</summary><p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-sub">{item.a}</p></details>)}</div>
        </div>
      </section>
    </div>
  );
}
