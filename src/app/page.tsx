import Link from 'next/link';
import { ACCESSORIES } from '@/lib/accessories';
import { getLocale } from '@/lib/i18n/server';
import { EnglishLanding } from '@/components/home/EnglishLanding';
import { getCurrentUser } from '@/lib/session';
import { aiAccess, canUseAiGeneration } from '@/lib/admin-access';
import { TRIAL_MESSAGES } from '@/lib/trial-policy';
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
  // 지금 100% 동작하는 대사 스튜디오를 주 CTA 로 안내한다.
  const aiEnabled = canUseAiGeneration(user);
  // 일반 방문자에게는 '1~2컷 무료 체험'이 열려 있다 — 첫 화면에서 그 사실을 분명히 알린다.
  const trial = aiAccess(user) === 'trial';
  if (locale === 'en') return <EnglishLanding aiEnabled={aiEnabled} />;
  return (
    <div className="overflow-hidden">
      <section className="relative border-b border-line">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
        <div className="wrap relative grid items-center gap-9 py-10 md:grid-cols-[1fr_0.85fr] md:gap-16 md:py-16">
          <div>
            <span className="chip !border-primary/20 !bg-primary/10 !text-primary-dark">{trial ? '12컷 전체를 워터마크로 무료 미리보기' : '사람과 반려동물 사진 한 장으로 시작해요'}</span>
            <h1 className="h1 mt-4">내 사진으로 만드는<br /><span className="text-primary">나만의 이모티콘</span></h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-sub sm:text-base">
              {trial
                ? TRIAL_MESSAGES.banner
                : aiEnabled
                  ? '사진을 올리고 마음에 드는 스타일과 표정을 골라 보세요. AI가 컷을 하나씩 만들고, 완성된 팩은 언제든 편집하고 저장할 수 있어요.'
                  : '지금은 대사 스튜디오가 바로 열려 있어요. 마음에 드는 한 줄을 고르고 표정을 바꿔 내 대화방용 이모티콘을 만들어 보세요.'}
            </p>
            <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap">
              {aiEnabled ? (
                <>
                  <Link href="/studio/upload" className="btn-primary !py-4 text-base">{trial ? '12컷 무료로 미리보기' : '이모티콘 만들기'} <span aria-hidden="true">→</span></Link>
                  <Link href="/quotes" className="btn-ghost !py-4">대사 스튜디오</Link>
                </>
              ) : (
                <>
                  <Link href="/quotes" className="btn-primary !py-4 text-base">대사로 바로 만들기 <span aria-hidden="true">→</span></Link>
                  <Link href="/studio/upload" className="btn-ghost !py-4">AI 스튜디오 (준비 중)</Link>
                </>
              )}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-sub">
              {trial
                ? '원본 사진은 서버에 저장하지 않아요 · 체험 컷은 미리보기용 · 정식 출시 후 팩 저장이 열려요'
                : aiEnabled
                  ? '원본 사진은 서버에 저장하지 않아요 · 생성 결과는 사진과 다를 수 있어요'
                  : '내 사진으로 만드는 AI 스튜디오는 정비 중이에요 · 대사 스튜디오는 지금 바로 쓸 수 있어요'}
            </p>
          </div>
          <div aria-label="이모티콘 스타일 예시" className="rounded-2xl border border-line bg-paper p-4 shadow-pop sm:p-5">
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-black">어떤 모습으로 만들까요?</p><span className="chip !bg-cream">원본 + 6종</span></div>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border-2 border-line bg-lemon/25 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/samples/original-portrait.webp" alt="스타일 변환에 사용한 원본 인물 사진" width={512} height={512} className="aspect-square w-20 shrink-0 rounded-xl border border-line bg-white object-cover sm:w-24" />
              <div>
                <p className="text-xs font-black">원본 사진</p>
                <p className="mt-1 text-[11px] leading-relaxed text-sub">이 한 장을 아래 6가지 스타일로 바꿔요.</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              {samples.map((sample) => <div key={sample.src} className="overflow-hidden rounded-2xl border-2 border-line bg-cream p-1.5 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sample.src} alt={`${sample.label} 스타일 이모티콘 예시`} width={512} height={512} className="aspect-square w-full object-contain" />
                <p className="pb-1 pt-1 text-[11px] font-black sm:text-xs">{sample.label}</p>
              </div>)}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-sub">원본과 6가지 스타일의 예시입니다. 실사 스티커와 다른 화풍도 선택할 수 있어요.</p>
          </div>
        </div>
      </section>

      {/* 내 사진 바로 누끼 — AI 생성 게이트와 무관하게 누구나 지금 쓸 수 있는 무료 경로 */}
      <section className="border-b border-line bg-lemon/25 py-8 sm:py-10" aria-labelledby="cutout-title">
        <div className="wrap flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="chip !border-primary/25 !bg-white !text-primary-dark">NEW · 무료 · AI 생성 없이</span>
            <h2 id="cutout-title" className="mt-2 break-keep text-xl font-black tracking-tight sm:text-2xl">📸 내 사진 바로 누끼 스티커</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">
              올린 사진 그대로 배경만 떼고, 캘리그라피 한 줄과 심플 데코를 얹어 <strong className="text-ink">360×360 투명 PNG</strong>로 바로 저장해요.
              AI가 새로 그리지 않아 결과가 사진과 똑같고, 사진은 서버로 보내지 않으며 크레딧도 쓰지 않아요.
            </p>
            <p className="mt-2 text-[11px] font-bold text-sub">사진 1장이면 바로 · 최대 12장을 팩처럼 한 번에 · 카카오 규격 ZIP까지</p>
          </div>
          <Link href="/studio/photo" className="btn-primary shrink-0 !py-4 text-base">사진 올리고 바로 만들기 <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="wrap py-12 sm:py-16" aria-labelledby="how-title">
        <span className="chip !bg-lemon/40 !text-ink">처음이신가요?</span>
        <h2 id="how-title" className="h2 mt-3">이렇게 만들어요</h2>
        <p className="mt-2 text-sm leading-relaxed text-sub">한 단계씩 선택하면 돼요. 그림을 직접 그리지 않아도 됩니다.</p>
        <ol className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {steps.map((step) => <li key={step.number} className="card h-full p-4 sm:p-5"><span className="text-xs font-black text-coralink sm:text-sm">STEP {step.number}</span><h3 className="mt-2 text-base font-black sm:text-lg">{step.title}</h3><p className="mt-2 text-xs leading-relaxed text-sub sm:text-sm">{step.text}</p></li>)}
        </ol>
        <Link href={aiEnabled ? '/studio/upload' : '/quotes'} className="btn-dark mt-6">
          {aiEnabled ? '사진 선택하기 →' : '대사 스튜디오에서 시작하기 →'}
        </Link>
      </section>

      <section className="wrap py-12 sm:py-16" aria-labelledby="killer-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="chip !border-coral/40 !bg-coral/10 !text-coralink">KILLER THEMES</span>
            <h2 id="killer-title" className="h2 mt-3">요즘 제일 많이 만드는 두 팩</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">사진 2장이면 커플·단톡방 케미, 한 장이면 반려동물 집사 밈. 12컷 전체를 먼저 보고 필요한 팩만 잠금 해제해요.</p>
          </div>
          <Link href="/presets" className="text-sm font-black text-coralink underline underline-offset-4">전체 프리셋 보기 →</Link>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
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
      </section>

      <section className="border-y border-line bg-paper py-12 sm:py-16" aria-labelledby="price-title">
        <div className="wrap">
          <span className="chip !bg-lemon/40 !text-ink">PRICING</span>
          <h2 id="price-title" className="h2 mt-3">미리 보고, 필요한 만큼만</h2>
          <p className="mt-2 text-sm leading-relaxed text-sub">12컷 전체를 무료로 확인한 뒤, 팩 하나만 결제하거나 여러 팩을 크레딧으로 만드세요.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
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

      <section className="border-y border-line bg-paper py-12 sm:py-16" aria-labelledby="use-title">
        <div className="wrap">
          <h2 id="use-title" className="h2">필요한 곳으로 바로 가기</h2>
          <p className="mt-2 text-sm text-sub">만든 이모티콘을 다시 열거나 대화에 어울리는 컷을 찾아보세요.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              { icon: '🎬', title: '대사 스튜디오', desc: '영화·드라마 무드의 오리지널 대사로 바로 이모티콘을 만들어요.', href: '/quotes', link: '대사 스튜디오 열기' },
              { icon: '🗂️', title: '내 이모티콘 팩', desc: '만든 팩의 컷을 확인하고 편집하거나 내려받아요.', href: '/studio/packs', link: '내 팩 열기' },
              { icon: '💬', title: '톡 답장 추천', desc: '대화를 입력하고 어울리는 답장 컷을 찾아요.', href: '/reply', link: '답장 추천하기' },
              ...(aiEnabled
                ? [{ icon: '🎨', title: '내 사진으로 만들기', desc: '사진 한 장으로 같은 얼굴의 여러 표정을 만들어요.', href: '/studio/upload', link: '사진으로 만들기' }]
                : []),
            ].map((item) => <Link key={item.href + item.title} href={item.href} className="card group flex min-h-[150px] flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-pop"><span aria-hidden="true" className="text-2xl">{item.icon}</span><h3 className="mt-3 text-base font-black">{item.title}</h3><p className="mt-1 flex-1 text-sm leading-relaxed text-sub">{item.desc}</p><span className="mt-4 text-sm font-black text-coralink group-hover:underline">{item.link} →</span></Link>)}
          </div>
        </div>
      </section>

      <section id="accessory-guide" className="wrap scroll-mt-36 py-12 sm:py-16" aria-labelledby="accessory-guide-title">
        <span className="chip !bg-lemon/40 !text-ink">컷 편집 가이드</span>
        <h2 id="accessory-guide-title" className="h2 mt-3">표정과 악세사리 바꾸기</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">내 팩에서 컷의 편집을 누른 뒤 표정·문구·악세사리를 고르고 ‘다시 그리기’를 눌러 적용해요. 악세사리는 최대 3개까지 고를 수 있어요.</p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="악세사리 예시">{ACCESSORIES.slice(0, 4).map((item) => <span key={item.id} className="chip !bg-paper"><span aria-hidden="true">{item.emoji}</span> {item.name}</span>)}</div>
        <p className="mt-4 text-xs leading-relaxed text-sub">다시 그리기는 일반 사용자 1크레딧이며 관리자는 차감되지 않습니다. 다시 그리기 실패 시 크레딧 자동 복구를 시도합니다.</p>
        <Link href="/studio/packs" className="btn-ghost mt-5">내 팩에서 편집하기 →</Link>
      </section>

      <section className="border-t border-line bg-paper py-12 sm:py-16" aria-labelledby="faq-title">
        <div className="wrap grid gap-6 md:grid-cols-[0.7fr_1.3fr]"><div><h2 id="faq-title" className="h2">자주 묻는 질문</h2><p className="mt-2 text-sm text-sub">더 궁금한 점은 고객센터에서 확인해 주세요.</p><Link href="/support" className="mt-3 inline-block text-sm font-black text-coralink underline underline-offset-4">고객센터 →</Link></div>
          <div className="space-y-3">{questions.map((item) => <details key={item.q} className="card-flat p-4"><summary className="cursor-pointer text-sm font-black">{item.q}</summary><p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-sub">{item.a}</p></details>)}</div>
        </div>
      </section>
    </div>
  );
}
