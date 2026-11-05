import Link from 'next/link';
import { ACCESSORIES } from '@/lib/accessories';

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
  { q: '몇 장을 만들 수 있고 비용은 얼마인가요?', a: '일반 팩은 12컷 또는 24컷, 실사 스티커는 12컷 또는 16컷을 선택할 수 있습니다. 팩 생성은 컷당 1크레딧이며 AI로 컷을 다시 그릴 때도 1크레딧이 필요합니다. 관리자는 차감되지 않습니다.' },
  { q: '사진을 다시 올려야 하나요?', a: '사진은 이 브라우저 탭에만 임시 보관됩니다. 탭을 닫거나 다른 기기에서 열면 시안을 만들 때 사용한 같은 사진을 다시 올려 주세요.' },
  { q: '카카오톡에서 사용할 수 있나요?', a: '내려받은 PNG나 GIF를 채팅방에 사진으로 보낼 수 있습니다. 카카오 이모티콘 스토어 정식 출품과 심사 통과는 별개이며 보장되지 않습니다.' },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      <section className="relative border-b-2 border-ink/90">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
        <div className="wrap relative grid items-center gap-9 py-10 md:grid-cols-[1fr_0.85fr] md:gap-16 md:py-16">
          <div>
            <span className="chip !border-ink !bg-lemon !text-ink">사람과 반려동물 사진 한 장으로 시작해요</span>
            <h1 className="h1 mt-4">내 사진으로 만드는<br /><span className="text-coralink">나만의 이모티콘</span></h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-sub sm:text-base">
              사진을 올리고 마음에 드는 스타일과 표정을 골라 보세요. AI가 컷을 하나씩 만들고, 완성된 팩은 언제든 편집하고 저장할 수 있어요.
            </p>
            <div className="mt-6 grid gap-2 sm:flex sm:flex-wrap">
              <Link href="/studio/upload" className="btn-primary !py-4 text-base">이모티콘 만들기 <span aria-hidden="true">→</span></Link>
              <Link href="/studio/packs" className="btn-ghost !py-4">내 팩 보기</Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-sub">원본 사진은 서버에 저장하지 않아요 · 생성 결과는 사진과 다를 수 있어요</p>
          </div>
          <div aria-label="이모티콘 스타일 예시" className="rounded-3xl border-2 border-ink bg-paper p-4 shadow-pop sm:p-5">
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

      <section className="wrap py-12 sm:py-16" aria-labelledby="how-title">
        <span className="chip !bg-lemon/40 !text-ink">처음이신가요?</span>
        <h2 id="how-title" className="h2 mt-3">이렇게 만들어요</h2>
        <p className="mt-2 text-sm leading-relaxed text-sub">한 단계씩 선택하면 돼요. 그림을 직접 그리지 않아도 됩니다.</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => <li key={step.number} className="card p-5"><span className="text-sm font-black text-coralink">STEP {step.number}</span><h3 className="mt-2 text-lg font-black">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-sub">{step.text}</p></li>)}
        </ol>
        <Link href="/studio/upload" className="btn-dark mt-6">사진 선택하기 →</Link>
      </section>

      <section className="border-y-2 border-ink/90 bg-paper py-12 sm:py-16" aria-labelledby="use-title">
        <div className="wrap">
          <h2 id="use-title" className="h2">필요한 곳으로 바로 가기</h2>
          <p className="mt-2 text-sm text-sub">만든 이모티콘을 다시 열거나 대화에 어울리는 컷을 찾아보세요.</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              { icon: '🗂️', title: '내 이모티콘 팩', desc: '만든 팩의 컷을 확인하고 편집하거나 내려받아요.', href: '/studio/packs', link: '내 팩 열기' },
              { icon: '💬', title: '톡 답장 추천', desc: '대화를 입력하고 어울리는 답장 컷을 찾아요.', href: '/reply', link: '답장 추천하기' },
              { icon: '🎨', title: '다양한 표정', desc: '코믹한 감정 표현 24종과 여러 스타일을 골라 만들어요.', href: '/studio/upload', link: '새 팩 만들기' },
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

      <section className="border-t-2 border-ink/90 bg-paper py-12 sm:py-16" aria-labelledby="faq-title">
        <div className="wrap grid gap-6 md:grid-cols-[0.7fr_1.3fr]"><div><h2 id="faq-title" className="h2">자주 묻는 질문</h2><p className="mt-2 text-sm text-sub">더 궁금한 점은 고객센터에서 확인해 주세요.</p><Link href="/support" className="mt-3 inline-block text-sm font-black text-coralink underline underline-offset-4">고객센터 →</Link></div>
          <div className="space-y-3">{questions.map((item) => <details key={item.q} className="card-flat p-4"><summary className="cursor-pointer text-sm font-black">{item.q}</summary><p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-sub">{item.a}</p></details>)}</div>
        </div>
      </section>
    </div>
  );
}
