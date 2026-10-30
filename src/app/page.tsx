import Link from 'next/link';
import { Sticker } from '@/components/Sticker';
import { SectionHead } from '@/components/ui';
import { styleSample } from '@/lib/samples';
import { EMOTIONS, TONES } from '@/lib/art/sticker';
import { GOODS, PLANS, won } from '@/lib/pricing';
import { sampleSpec } from '@/lib/samples';

const HERO = [
  { i: 0, cls: 'col-span-2 row-span-2 rotate-[-3deg]', bg: 'bg-lemon/40' },
  { i: 1, cls: 'rotate-[3deg]', bg: 'bg-pink/50' },
  { i: 2, cls: 'rotate-[-2deg]', bg: 'bg-mint/30' },
  { i: 3, cls: 'rotate-[2deg]', bg: 'bg-sky/30' },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-60" />
        <div className="wrap relative grid items-center gap-10 py-14 md:grid-cols-[1.05fr_1fr] md:py-20">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="chip !border-ink !bg-lemon !text-ink">🔥 카카오 이모티콘 시장 1.2조 원</span>
              <span className="chip">내 사진 1장이면 끝</span>
            </div>
            <h1 className="h1">
              내 얼굴로 만드는
              <br />
              <span className="relative inline-block">
                <span className="relative z-10">3초 이모티콘</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-3 -rotate-1 bg-lemon" />
              </span>
              ,<br />
              오늘 쓸 답장까지.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-sub sm:text-base">
              셀카 한 장을 올리면 <strong className="text-ink">얼굴이 그대로 살아있는 24컷</strong>이 만들어집니다.
              매일 아침엔 오늘 대화에 딱 맞는 컷을 추천하고, 마음에 들면 <strong className="text-ink">실물 굿즈</strong>로
              인쇄까지. 그림 실력은 필요 없습니다.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/studio/upload" className="btn-primary !px-6 !py-4 text-base">
                내 얼굴로 무료로 만들기 →
              </Link>
              <Link href="/reply" className="btn-ghost !px-5 !py-4">
                톡 붙여넣어 답장 받기
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-bold text-sub">
              <li>✓ 가입 즉시 12크레딧</li>
              <li>✓ 카드 등록 없이 체험</li>
              <li>✓ 원본 사진 24시간 내 자동 파기</li>
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-4 hidden rotate-[-8deg] rounded-2xl border-2 border-ink bg-paper px-3 py-2 text-xs font-black shadow-card sm:block">
              “이거 내 얼굴이잖아 ㅋㅋ”
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {HERO.map((h) => (
                <div
                  key={h.i}
                  className={`${h.cls} ${h.bg} rounded-[28px] border-2 border-ink p-1.5 shadow-pop`}
                >
                  <Sticker spec={sampleSpec(h.i, { background: 'transparent' })} />
                </div>
              ))}
              <div className="flex flex-col justify-center rounded-[28px] border-2 border-dashed border-ink/30 p-3 text-center">
                <p className="text-[11px] font-bold text-sub">오늘의 추천</p>
                <p className="mt-1 text-sm font-black leading-tight">퇴근 컷 3개</p>
                <p className="mt-1 text-[10px] text-sub">07:30 도착</p>
              </div>
            </div>
            <div className="absolute -bottom-3 right-2 rotate-[4deg] rounded-2xl border-2 border-ink bg-coral px-3 py-2 text-xs font-black text-white shadow-card">
              실물 굿즈까지 원클릭
            </div>
          </div>
        </div>
      </section>

      {/* ── 문제 → 해결 ─────────────────────────────────────── */}
      <section className="border-y-2 border-ink bg-paper py-14">
        <div className="wrap">
          <SectionHead
            eyebrow="왜 이모티미인가"
            title="이모티콘은 잘 쓰는 사람만 쓰는 게 아니었어요"
            desc="히트 이모티콘 2,885개가 1억 원을 번 시장에서, 일반인에게 막혀 있던 건 단 하나 — ‘그림 실력’이었습니다."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                before: '만들고 싶어도 그림을 못 그린다',
                after: '사진 1장이면 24컷 자동 완성',
                desc: '표정·상황·대사까지, 검증된 성공 템플릿 위에 내 얼굴을 얹습니다.',
                emoji: '✍️',
              },
              {
                before: '만들어도 카톡에서 안 쓴다',
                after: '오늘 쓸 답장을 먼저 보내줌',
                desc: '톡을 붙여넣으면 3초 안에 답장 컷 3개. 매일 아침 브리핑은 덤.',
                emoji: '💬',
              },
              {
                before: 'AI 그림은 매번 얼굴이 바뀐다',
                after: 'Identity Lock으로 같은 얼굴 유지',
                desc: '캐릭터 시트 1장을 먼저 만들고, 24컷 전부 그 얼굴에서 파생됩니다.',
                emoji: '🔒',
              },
            ].map((c) => (
              <div key={c.after} className="card p-5">
                <div className="text-2xl">{c.emoji}</div>
                <p className="mt-3 text-xs font-bold text-sub line-through decoration-coral/70 decoration-2">
                  {c.before}
                </p>
                <p className="mt-1 text-lg font-black leading-snug">{c.after}</p>
                <p className="mt-2 text-sm leading-relaxed text-sub">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 킬러 기능 4종 ───────────────────────────────────── */}
      <section className="py-16">
        <div className="wrap">
          <SectionHead
            eyebrow="기존 앱에 없던 것"
            title="만드는 앱이 아니라, 쓰는 순간에 붙는 앱"
            desc="생성은 한 번, 사용은 매일. 그래서 이모티콘 앱의 숙명인 ‘한 번 만들고 안 들어옴’을 뒤집습니다."
          />

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <div className="card relative overflow-hidden p-6">
              <span className="chip !border-ink !bg-lemon">기능 01</span>
              <h3 className="mt-3 text-2xl font-black">오늘의 얼굴 브리핑</h3>
              <p className="mt-2 text-sm leading-relaxed text-sub">
                매일 07:30, 요일·시간대·최근 사용 기록으로 오늘 쓸 8컷을 골라 도착. 새로 그리지 않고
                <strong className="text-ink"> 재조합만</strong> 하기 때문에 원가 0원 — 구독을 정당화하는 장치입니다.
              </p>
              <div className="mt-4 flex gap-2">
                {[0, 3, 1].map((i) => (
                  <div key={i} className="w-20 rounded-2xl border-2 border-line bg-cream p-1">
                    <Sticker spec={sampleSpec(i + 4, { background: 'cream' })} />
                  </div>
                ))}
                <div className="grid w-20 place-items-center rounded-2xl border-2 border-dashed border-line text-[10px] font-bold text-sub">
                  +5컷
                </div>
              </div>
            </div>

            <div className="card relative overflow-hidden bg-ink p-6 text-cream">
              <span className="chip !border-cream/30 !bg-cream/10 !text-cream">기능 02</span>
              <h3 className="mt-3 text-2xl font-black">톡 붙여넣기 · 3초 답장</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/70">
                대화를 복사해 붙여넣으면 의도·감정을 판독해 3장을 제안. 이미 만들어둔 표정 뱅크에서 고르기 때문에
                <strong className="text-cream"> 지연 1.5초, 생성 비용 0원</strong>.
              </p>
              <div className="mt-4 rounded-2xl border border-cream/15 bg-cream/5 p-3 font-mono text-[11px] leading-relaxed text-cream/70">
                <p>“야 너 또 늦었네 ㅋㅋㅋ”</p>
                <p className="mt-2 text-coral">→ 감정: 웃김 / 상황: 지각</p>
                <p className="text-cream">→ 추천: 사과 · 실실 · 만능 ㅇㅋ</p>
              </div>
              <Link href="/reply" className="mt-4 inline-flex text-sm font-black text-lemon underline underline-offset-4">
                지금 테스트하기 →
              </Link>
            </div>

            <div className="card p-6">
              <span className="chip !border-ink !bg-mint/30">기능 03</span>
              <h3 className="mt-3 text-2xl font-black">스티커 → 실물 굿즈</h3>
              <p className="mt-2 text-sm leading-relaxed text-sub">
                아크릴 스탠드, 포토카드, 머그. 내 얼굴 굿즈는 선물이 됩니다. 재고 없는 POD 위탁 제작이라
                재고 리스크 없이 <strong className="text-ink">마진 45%</strong>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {GOODS.map((g) => (
                  <span key={g.sku} className="chip !bg-cream">
                    {g.emoji} {g.name} {won(g.price)}원
                  </span>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <span className="chip !border-ink !bg-lilac/20">기능 04</span>
              <h3 className="mt-3 text-2xl font-black">카카오 제안 패키저</h3>
              <p className="mt-2 text-sm leading-relaxed text-sub">
                만든 팩을 카카오 이모티콘 스튜디오 규격(<strong className="text-ink">24종 · 360×360 · 개당 2MB 이하</strong>)으로
                자동 검증·리사이즈·패키징. “내가 만든 게 진짜 상품이 되는” 순간입니다.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                {['규격 검사', '투명 PNG', 'GIF 24프레임', 'ZIP 패키징'].map((t) => (
                  <span key={t} className="chip !border-line !bg-cream">✓ {t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 스타일 ──────────────────────────────────────────── */}
      <section className="border-y-2 border-ink bg-paper py-16">
        <div className="wrap">
          <SectionHead eyebrow="6가지 화풍" title="얼굴은 그대로, 분위기는 골라서" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(TONES).map(([key, tone], i) => (
              <div key={key} className="card-flat overflow-hidden">
                <div className="bg-cream p-2">
                  <Sticker spec={styleSample(key as keyof typeof TONES, i)} />
                </div>
                <div className="border-t-2 border-line px-3 py-2">
                  <p className="text-sm font-black">{tone.label}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-sub">{tone.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3단계 ───────────────────────────────────────────── */}
      <section className="py-16">
        <div className="wrap">
          <SectionHead eyebrow="3단계" title="사진 → 시트 → 24컷, 3분이면 끝" align="center" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { n: '01', t: '셀카 1장', d: '정면 사진이면 충분해요. 얼굴 품질은 브라우저에서 바로 검사합니다.' },
              { n: '02', t: '캐릭터 확정', d: '3가지 시안 중 마음에 드는 얼굴을 고르세요. 이 얼굴이 24컷 내내 유지됩니다.' },
              { n: '03', t: '대사만 바꿔 쓰기', d: '감정선 다이얼, 소품, 배경, 대사. 편집기는 진짜로 3초입니다.' },
            ].map((s) => (
              <div key={s.n} className="card p-6">
                <span className="text-3xl font-black text-coral">{s.n}</span>
                <p className="mt-2 text-xl font-black">{s.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-sub">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/studio/upload" className="btn-dark !px-7 !py-4">
              지금 시작하기 — 12크레딧 무료
            </Link>
          </div>
        </div>
      </section>

      {/* ── 요금제 요약 ─────────────────────────────────────── */}
      <section className="border-y-2 border-ink bg-cream py-16">
        <div className="wrap">
          <SectionHead eyebrow="요금제" title="한 팩 값보다 싸게, 매달 새로" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Object.values(PLANS).map((p) => (
              <div
                key={p.plan}
                className={`card p-6 ${p.highlight ? 'relative bg-white ring-4 ring-coral/30' : ''}`}
              >
                {p.highlight ? (
                  <span className="absolute -top-3 left-6 rounded-full border-2 border-ink bg-coral px-3 py-1 text-[11px] font-black text-white">
                    가장 많이 선택
                  </span>
                ) : null}
                <p className="text-xs font-black uppercase tracking-widest text-sub">{p.name}</p>
                <p className="mt-2 text-3xl font-black">
                  {p.price === 0 ? '무료' : `${won(p.price)}원`}
                  {p.price > 0 ? <span className="text-sm font-bold text-sub"> /월</span> : null}
                </p>
                <p className="mt-1 text-sm font-bold text-coralink">{p.tagline}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-ink/80">
                  {p.features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className={`mt-5 w-full ${p.highlight ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {p.price === 0 ? '무료로 시작' : '플랜 보기'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 지표 ────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="wrap">
          <SectionHead eyebrow="시장 근거" title="수요는 이미 검증되어 있습니다" align="center" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: '1.2조 원', v: '카카오 이모티콘 시장 규모' },
              { k: '2,885개', v: '누적 매출 1억 원↑ 이모티콘' },
              { k: '2,800억 건', v: '누적 이모티콘 발신량' },
              { k: '250만 명', v: '이모티콘 플러스 구독자' },
            ].map((s) => (
              <div key={s.k} className="card-flat p-5 text-center">
                <p className="text-2xl font-black">{s.k}</p>
                <p className="mt-1 text-xs text-sub">{s.v}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-[11px] text-sub">
            출처: 카카오 · 머니투데이(2025.05), 조선비즈(2025.05)
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="border-t-2 border-ink bg-paper py-16">
        <div className="wrap grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
          <SectionHead eyebrow="FAQ" title="자주 묻는 질문" />
          <div className="space-y-3">
            {[
              {
                q: '내 사진이 서버에 저장되나요?',
                a: '아니요. 얼굴 분석은 브라우저에서 끝나고, 서버에는 피부·헤어 색상 팔레트와 품질 지표만 전달됩니다. 원본 이미지는 업로드되지 않습니다.',
              },
              {
                q: '다른 사람 사진으로도 만들 수 있나요?',
                a: '아니요. 본인 사진만 사용할 수 있습니다. 타인 사진 악용(딥페이크) 방지를 위해 이용약관에 금지행위로 명시되어 있고, 위반 시 이용이 제한됩니다.',
              },
              {
                q: '만든 이모티콘을 카카오톡에서 쓸 수 있나요?',
                a: '내보내기한 PNG/GIF를 카톡 채팅방에 사진으로 보내 사용할 수 있습니다. 카카오 이모티콘 스토어에 정식 출품하려면 작가 심사가 필요하며, Studio 플랜은 제안 규격 패키징을 제공합니다.',
              },
              {
                q: '구독을 해지하면 만든 이모티콘은?',
                a: '이미 만든 팩은 그대로 보관·다운로드됩니다. 크레딧 지급만 중단됩니다.',
              },
            ].map((f) => (
              <details key={f.q} className="card-flat group p-4">
                <summary className="cursor-pointer list-none text-sm font-black marker:hidden">
                  <span className="mr-2 text-coral">Q.</span>
                  {f.q}
                </summary>
                <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-sub">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="wrap">
          <div className="relative overflow-hidden rounded-[36px] border-2 border-ink bg-ink p-8 text-cream sm:p-12">
            <div className="pointer-events-none absolute -right-10 -top-10 opacity-20">
              <div className="h-56 w-56 rounded-full bg-coral blur-3xl" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-lemon">EmotiMe</p>
            <h2 className="mt-3 max-w-xl text-[clamp(1.6rem,4vw,2.6rem)] font-black leading-tight tracking-[-0.03em]">
              오늘 대화에 쓸 내 얼굴,
              <br />
              지금 3분이면 준비됩니다.
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/studio/upload" className="btn-primary !px-6 !py-4">
                무료로 만들기
              </Link>
              <Link href="/pricing" className="btn !border-cream/40 !bg-transparent !text-cream hover:!bg-cream/10">
                요금제 보기
              </Link>
            </div>
            <p className="mt-5 text-xs text-cream/50">
              생성 결과물에는 AI 생성 표시가 포함됩니다 · {EMOTIONS.joy.label}부터 {EMOTIONS.king.label}까지 12감정 지원
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
