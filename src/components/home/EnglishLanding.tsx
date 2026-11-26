import Image from 'next/image';
import Link from 'next/link';
import { localizedComicExpressions, tonesForLocale } from '@/lib/i18n/presets';
import { HERO_PHOTO_CUTS, PHOTO_SAMPLES, STYLE_TILES } from '@/lib/photo-samples';
import { Sticker } from '@/components/Sticker';
import { DEFAULT_PALETTE, DEFAULT_SIGNATURE } from '@/lib/art/sticker';
import type { Emotion, StickerSpec } from '@/lib/types';

/** 히어로 6컷 — 전부 실사 사진 누끼 컷(반려동물·커플·팀·셀카). */
const heroCuts: { src: string; emotion: Emotion }[] = [
  { src: HERO_PHOTO_CUTS[0].src, emotion: 'love' },
  { src: HERO_PHOTO_CUTS[1].src, emotion: 'laugh' },
  { src: HERO_PHOTO_CUTS[2].src, emotion: 'joy' },
  { src: PHOTO_SAMPLES.pet.cuts[2].src, emotion: 'smug' },
  { src: PHOTO_SAMPLES.couple.cuts[1].src, emotion: 'sulk' },
  { src: PHOTO_SAMPLES.team.cuts[1].src, emotion: 'tired' },
];

function heroSpec(src: string, emotion: Emotion): StickerSpec {
  return {
    seed: 1061,
    tone: 'photo-sticker',
    palette: DEFAULT_PALETTE,
    signature: DEFAULT_SIGNATURE,
    emotion,
    intensity: 74,
    prop: 'none',
    background: 'transparent',
    line: '',
    linePosition: 'bottom',
    imageUrl: src,
    textLayers: [],
  };
}

const questions = [
  { q: 'What happens to my photo?', a: 'Your photo stays temporarily in this browser tab and is sent to Google Gemini only for character analysis and image generation. The original photo is not stored on our servers. Generated character drafts and stickers are saved with your pack.' },
  { q: 'How many stickers can I make?', a: 'Choose a 12- or 24-cut character pack, or a 12- or 16-cut photo-sticker pack. Each generated cut uses one credit; regenerating an AI cut also uses one. You can preview your character before creating a full pack.' },
  { q: 'Can I write my own captions?', a: 'Yes. Pick a natural English preset or type your own line in the editor. AI regeneration is asked to preserve your caption exactly, and you can keep editing without regenerating.' },
  { q: 'Are these official KakaoTalk emoticons?', a: 'No. Download PNG or GIF files and share them in chats that support image stickers. Submission and acceptance to the Kakao emoticon store are separate processes and are not guaranteed.' },
];

export function EnglishLanding({ aiEnabled = true }: { aiEnabled?: boolean }) {
  const expressions = localizedComicExpressions('en');
  return (
    <div className="overflow-hidden">
      <section className="relative border-b-2 border-ink/90">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
        <div className="wrap relative grid items-center gap-9 py-12 md:grid-cols-[1fr_0.85fr] md:gap-16 md:py-20">
          <div>
            <span className="chip !border-ink !bg-lemon !text-ink">ONE PHOTO · REAL-PHOTO STICKERS · PEOPLE & PETS</span>
            <h1 className="h1 mt-5">One photo.<br /><span className="font-hand text-coralink">A whole pack of you.</span></h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-sub sm:text-lg">
              Turn a favorite photo into expressive stickers with natural English captions. Pick a style, choose your reactions, and make every line your own.
            </p>
            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
              {aiEnabled ? (
                <>
                  <Link href="/en/studio/upload" className="btn-primary !px-7 !py-4 text-base">Make my stickers <span aria-hidden="true">→</span></Link>
                  <Link href="/en/quotes" className="btn-ghost !py-4">Quote studio</Link>
                </>
              ) : (
                <>
                  <Link href="/en/quotes" className="btn-primary !px-7 !py-4 text-base">Start from a quote <span aria-hidden="true">→</span></Link>
                  <Link href="/en/studio/upload" className="btn-ghost !py-4">AI studio (coming soon)</Link>
                </>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-extrabold text-sub">
              <span>✓ 11 art styles</span><span>✓ 24 reaction presets</span><span>✓ PNG & GIF downloads</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[390px]">
            <div className="absolute -right-3 -top-4 rotate-6 rounded-xl border-2 border-ink bg-lemon px-4 py-2 font-hand text-2xl shadow-card">so you!</div>
            <div className="rotate-2 rounded-[28px] border-2 border-ink bg-paper p-4 shadow-pop">
              <div className="grid grid-cols-3 gap-2 rounded-2xl border-2 border-line bg-white p-3">
                {heroCuts.map((cut) => (
                  <Sticker key={cut.src} spec={heroSpec(cut.src, cut.emotion)} ariaLabel="Real-photo sticker sample" />
                ))}
              </div>
              <p className="mt-3 text-center text-xs font-black">REAL-PHOTO STICKERS. ONE PHOTO.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-ink/90 bg-paper py-14">
        <div className="wrap">
          <p className="eyebrow">FROM PHOTO TO GROUP CHAT</p>
          <h2 className="h2 mt-2">Your face, your humor,<br className="hidden sm:block" /> your sticker pack.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ['01', 'Add a photo', 'Use a bright, front-facing photo of you or your pet. We check it before generation.'],
              ['02', 'Pick a look', 'Choose an art style and composition, then select your favorite AI character draft.'],
              ['03', 'Choose reactions', 'Build a pack with natural English lines, from “LOL” and “You got this” to “Love you.”'],
              ['04', 'Edit & share', 'Fine-tune captions and expressions, then download individual images or the full pack.'],
            ].map(([number, title, text]) => <div key={number} className="card p-5"><span className="font-hand text-3xl text-coralink">{number}</span><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-relaxed text-sub">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-ink/90 bg-lemon/35 py-14">
        <div className="wrap grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="chip !border-ink !bg-white">24-CUT COMIC PACK</span>
            <h2 className="h2 mt-4">Every reaction.<br />Zero awkward translations.</h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-sub sm:text-base">The English pack is written for real chats—not translated word for word from Korean. Mix 24 expressions or choose only the reactions you actually use.</p>
            <Link href="/en/studio/upload" className="btn-primary mt-6">Build a reaction pack →</Link>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {expressions.slice(0, 12).map((item) => <div key={item.id} className="rounded-2xl border-2 border-ink bg-white p-3 text-center shadow-card"><div className="text-2xl" aria-hidden="true">{item.emoji}</div><p className="mt-1 truncate text-[10px] font-black text-sub">{item.label}</p><p className="mt-1 truncate font-hand text-lg">{item.line}</p></div>)}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-line bg-paper py-14">
        <div className="wrap">
          <p className="eyebrow">STYLE IT YOUR WAY</p>
          <h2 className="h2 mt-2">Straight from the photo, or drawn anew.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sub">The default is the photo cut — your picture, background removed, one line added, free. AI redraw adds six free art styles, eleven with a plan.</p>
          <div className="mt-7 flex flex-wrap gap-2">{tonesForLocale('en').map((tone) => <span key={tone.id} className="chip !bg-white !px-4 !py-2">{tone.label}</span>)}</div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">{STYLE_TILES.map((tile) => <figure key={tile.src} className="card overflow-hidden p-2"><Image src={tile.src} alt={`${tile.label.en} style sample`} width={240} height={240} className="aspect-square rounded-xl object-contain" /><figcaption className="py-2 text-center text-xs font-black">{tile.label.en}</figcaption></figure>)}</div>
        </div>
      </section>

      <section className="border-b-2 border-line py-14">
        <div className="wrap grid gap-8 md:grid-cols-[0.75fr_1.25fr]">
          <div><p className="eyebrow">GOOD TO KNOW</p><h2 className="h2 mt-2">Questions,<br />answered.</h2></div>
          <div className="space-y-3">{questions.map((item) => <details key={item.q} className="card group p-5"><summary className="cursor-pointer list-none text-base font-black">{item.q}<span className="float-right text-coralink group-open:rotate-45">＋</span></summary><p className="mt-3 text-sm leading-relaxed text-sub">{item.a}</p></details>)}</div>
        </div>
      </section>

      <section className="border-b-2 border-line bg-coral/5 py-14" aria-labelledby="en-killer">
        <div className="wrap">
          <p className="eyebrow text-coralink">KILLER THEMES · 12 CUTS</p>
          <h2 id="en-killer" className="h2 mt-2">The two packs people make most</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sub">
            Preview all twelve cuts with a watermark for free. Unlock only the pack you love — ₩5,900 per pack (duo ₩7,900 · pet ₩6,900).
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Link href="/en/studio/upload?format=duo-chemi" className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="text-3xl" aria-hidden="true">💞</span>
              <h3 className="mt-2 text-lg font-black">Duo chemistry pack</h3>
              <p className="mt-1 text-sm leading-relaxed text-sub">Two photos, twelve couple and group-chat cuts — chi-maek after work, overtime rescue, sulking vs soothing.</p>
              <span className="mt-4 text-sm font-black text-coralink group-hover:underline">Preview 12 cuts →</span>
            </Link>
            <Link href="/en/studio/upload?format=pet-meme&subject=pet" className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-pop">
              <span className="text-3xl" aria-hidden="true">🐾</span>
              <h3 className="mt-2 text-lg font-black">Pet butler meme pack</h3>
              <p className="mt-1 text-sm leading-relaxed text-sub">One dog or cat photo, twelve butler memes — give me a treat, walk time, feed me, who farted.</p>
              <span className="mt-4 text-sm font-black text-coralink group-hover:underline">Preview 12 cuts →</span>
            </Link>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white p-4"><p className="text-xs font-black uppercase tracking-widest text-sub">Single pack</p><p className="mt-1 text-xl font-black">₩5,900</p><p className="mt-1 text-[11px] text-sub">12-cut unlock · high-res transparent PNG · ZIP</p></div>
            <div className="rounded-2xl border border-line bg-white p-4"><p className="text-xs font-black uppercase tracking-widest text-sub">Theme credits</p><p className="mt-1 text-xl font-black">₩9,900 ~ ₩22,000</p><p className="mt-1 text-[11px] text-sub">30 · 48 · 80 credits, never expire</p></div>
            <div className="rounded-2xl border border-line bg-white p-4"><p className="text-xs font-black uppercase tracking-widest text-sub">Creator Pro</p><p className="mt-1 text-xl font-black">₩19,900 / mo</p><p className="mt-1 text-[11px] text-sub">80 credits/mo · 32 motion cuts · commercial licence · submission sheet</p></div>
          </div>
        </div>
      </section>

      <section className="bg-ink py-14 text-cream">
        <div className="wrap text-center">
          <p className="font-hand text-3xl text-lemon">ready when you are</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Make the group chat a little more you.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-cream/70">Start with a photo and preview your character before creating a full pack. AI results vary, and every caption stays editable.</p>
          <Link href="/en/studio/upload" className="btn-primary mt-6 !px-7 !py-4 text-base">Create my first pack →</Link>
        </div>
      </section>
    </div>
  );
}
