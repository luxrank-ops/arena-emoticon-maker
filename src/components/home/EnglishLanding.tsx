import Image from 'next/image';
import Link from 'next/link';
import { localizedComicExpressions, tonesForLocale } from '@/lib/i18n/presets';

const samples = [
  { src: '/samples/tone-2d-cute.webp', label: 'Character' },
  { src: '/samples/tone-doodle.webp', label: 'Doodle' },
  { src: '/samples/tone-clay-3d.webp', label: 'Clay' },
  { src: '/samples/tone-3d-cartoon.webp', label: '3D cartoon' },
  { src: '/samples/tone-pixel-art.webp', label: 'Pixel art' },
  { src: '/samples/tone-watercolor.webp', label: 'Watercolor' },
];

const questions = [
  { q: 'What happens to my photo?', a: 'Your photo stays temporarily in this browser tab and is sent to Google Gemini only for character analysis and image generation. The original photo is not stored on our servers. Generated character drafts and stickers are saved with your pack.' },
  { q: 'How many stickers can I make?', a: 'Choose a 12- or 24-cut character pack, or a 12- or 16-cut photo-sticker pack. Each generated cut uses one credit; regenerating an AI cut also uses one. You can preview your character before creating a full pack.' },
  { q: 'Can I write my own captions?', a: 'Yes. Pick a natural English preset or type your own line in the editor. AI regeneration is asked to preserve your caption exactly, and you can keep editing without regenerating.' },
  { q: 'Are these official KakaoTalk emoticons?', a: 'No. Download PNG or GIF files and share them in chats that support image stickers. Submission and acceptance to the Kakao emoticon store are separate processes and are not guaranteed.' },
];

export function EnglishLanding() {
  const expressions = localizedComicExpressions('en');
  return (
    <div className="overflow-hidden">
      <section className="relative border-b-2 border-ink/90">
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
        <div className="wrap relative grid items-center gap-9 py-12 md:grid-cols-[1fr_0.85fr] md:gap-16 md:py-20">
          <div>
            <span className="chip !border-ink !bg-lemon !text-ink">ONE PHOTO · PEOPLE & PETS · AI STICKERS</span>
            <h1 className="h1 mt-5">One photo.<br /><span className="font-hand text-coralink">A whole pack of you.</span></h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-sub sm:text-lg">
              Turn a favorite photo into expressive stickers with natural English captions. Pick a style, choose your reactions, and make every line your own.
            </p>
            <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
              <Link href="/en/studio/upload" className="btn-primary !px-7 !py-4 text-base">Make my stickers <span aria-hidden="true">→</span></Link>
              <Link href="/en/studio/packs" className="btn-ghost !py-4">Open my packs</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-extrabold text-sub">
              <span>✓ 11 art styles</span><span>✓ 24 reaction presets</span><span>✓ PNG & GIF downloads</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[390px]">
            <div className="absolute -right-3 -top-4 rotate-6 rounded-xl border-2 border-ink bg-lemon px-4 py-2 font-hand text-2xl shadow-card">so you!</div>
            <div className="rotate-2 rounded-[28px] border-2 border-ink bg-paper p-4 shadow-pop">
              <div className="grid grid-cols-3 gap-2 rounded-2xl border-2 border-line bg-white p-3">
                {samples.slice(0, 6).map((sample) => <Image key={sample.src} src={sample.src} alt={`${sample.label} sticker sample`} width={160} height={160} className="aspect-square rounded-xl object-cover" />)}
              </div>
              <p className="mt-3 text-center text-xs font-black">SIX STYLES. ENDLESS REACTIONS.</p>
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
          <h2 className="h2 mt-2">Cute today. Chaotic tomorrow.</h2>
          <div className="mt-7 flex flex-wrap gap-2">{tonesForLocale('en').map((tone) => <span key={tone.id} className="chip !bg-white !px-4 !py-2">{tone.label}</span>)}</div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{samples.map((sample) => <figure key={sample.src} className="card overflow-hidden p-2"><Image src={sample.src} alt={`${sample.label} style sample`} width={240} height={240} className="aspect-square rounded-xl object-cover" /><figcaption className="py-2 text-center text-xs font-black">{sample.label}</figcaption></figure>)}</div>
        </div>
      </section>

      <section className="border-b-2 border-line py-14">
        <div className="wrap grid gap-8 md:grid-cols-[0.75fr_1.25fr]">
          <div><p className="eyebrow">GOOD TO KNOW</p><h2 className="h2 mt-2">Questions,<br />answered.</h2></div>
          <div className="space-y-3">{questions.map((item) => <details key={item.q} className="card group p-5"><summary className="cursor-pointer list-none text-base font-black">{item.q}<span className="float-right text-coralink group-open:rotate-45">＋</span></summary><p className="mt-3 text-sm leading-relaxed text-sub">{item.a}</p></details>)}</div>
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
