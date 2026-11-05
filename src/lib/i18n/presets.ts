import { COMIC_EXPRESSIONS } from '@/lib/comic-expressions';
import { PHOTO_STICKER_SCENES } from '@/lib/photo-stickers';
import { TONES } from '@/lib/art/sticker';
import type { Locale } from '@/lib/i18n/locale';
import type { Tone } from '@/lib/types';

/** Native-feeling chat copy keyed by stable IDs; stored IDs and visual actions never change by locale. */
const ENGLISH_COMIC_COPY: Record<string, { label: string; line: string }> = {
  'burst-laugh': { label: 'LOL', line: 'LOL' },
  'awkward-smile': { label: 'AWKWARD', line: 'Haha...' },
  speechless: { label: 'NO WORDS', line: 'No words.' },
  shocked: { label: 'SHOOK', line: 'Wait, what?!' },
  annoyed: { label: 'SERIOUSLY?!', line: 'Seriously?!' },
  pout: { label: 'HMMPH', line: 'Hmph.' },
  'ugly-cry': { label: 'SOBBING', line: 'Boo-hoo' },
  tired: { label: 'DRAINED', line: "I'm drained..." },
  excited: { label: "LET'S GO!", line: "Let's go!" },
  love: { label: 'LOVE YOU', line: 'Love you' },
  smug: { label: 'NAILED IT', line: 'Nailed it' },
  suspicious: { label: 'SUS', line: 'Hmm, sus' },
  sorry: { label: 'MY BAD', line: "I'm sorry" },
  please: { label: 'PRETTY PLEASE', line: 'Please!' },
  cheer: { label: 'YOU GOT THIS', line: 'You got this!' },
  clap: { label: 'BRAVO!', line: 'Bravo!' },
  hungry: { label: 'FEED ME', line: 'Feed me' },
  yum: { label: 'NOM NOM', line: 'Nom nom' },
  sleepy: { label: 'SO SLEEPY', line: 'So sleepy' },
  runaway: { label: "LET'S BOUNCE", line: "Let's run!" },
  thinking: { label: 'HMMM...', line: 'Hmm...' },
  celebrate: { label: 'CONGRATS!', line: 'Congrats!' },
  nope: { label: 'NOPE', line: 'No way!' },
  okay: { label: 'OKAY!', line: 'Okay!' },
};

const ENGLISH_PHOTO_COPY: Record<string, { label: string; line: string }> = {
  'photo-hello': { label: 'Hello', line: 'Hi!' },
  'photo-smile': { label: 'Smile', line: 'Hehe' },
  'photo-cry': { label: 'Crying', line: 'Boo-hoo' },
  'photo-sleep': { label: 'Sleepy', line: 'So sleepy' },
  'photo-excited': { label: 'Excited', line: 'Woohoo!' },
  'photo-thanks': { label: 'Thanks', line: 'Thank you' },
  'photo-love': { label: 'Love', line: 'Love you' },
  'photo-surprise': { label: 'Surprised', line: 'OMG!' },
  'photo-eat': { label: 'Snack time', line: 'Nom nom' },
  'photo-frown': { label: 'Confused', line: 'Huh?' },
  'photo-shy': { label: 'Shy', line: 'Oh, stop' },
  'photo-think': { label: 'Thinking', line: 'Hmm...' },
  'photo-wink': { label: 'Wink', line: 'Wink!' },
  'photo-cheer': { label: 'Cheering', line: 'You got this!' },
  'photo-sulk': { label: 'Sulking', line: 'Hmph.' },
  'photo-good': { label: 'Thumbs up', line: 'Sounds good!' },
};

const ENGLISH_TONES: Record<Tone, { label: string; desc: string; badge: string }> = {
  '2d-cute': { label: '2D character', desc: 'Soft outlines and a cute chat-sticker look', badge: 'CUTE' },
  'photo-sticker': { label: 'Photo stickers', desc: 'White cutout borders, expressive faces, and bold captions', badge: 'NEW' },
  caricature: { label: 'Photo reactions', desc: 'Your real-photo look transformed into expressive reactions', badge: 'PHOTO' },
  doodle: { label: 'Cozy doodle', desc: 'Hand-drawn charm and feel-good captions', badge: 'DOODLE' },
  'office-meme': { label: 'Office meme', desc: 'Workday chaos, side-eye, and relatable replies', badge: 'MEME' },
  'clay-3d': { label: 'Soft 3D clay', desc: 'A handmade clay-figure texture with dimensional detail', badge: '3D' },
  'pixel-art': { label: 'Retro pixel', desc: '16-bit Y2K pixel-art energy', badge: 'RETRO' },
  '3d-cartoon': { label: '3D cartoon', desc: 'Soft shading and a dimensional animated-character look', badge: '3D' },
  sketch: { label: 'Pencil sketch', desc: 'Paper texture and hand-drawn graphite lines', badge: '' },
  mono: { label: 'Monochrome line', desc: 'Minimal meme styling with bold captions', badge: 'MINIMAL' },
  watercolor: { label: 'Watercolor', desc: 'Soft pigment washes and an art-paper feel', badge: '' },
};

export function localizedComicExpressions(locale: Locale) {
  if (locale === 'ko') return COMIC_EXPRESSIONS;
  return COMIC_EXPRESSIONS.map((item) => ({ ...item, ...(ENGLISH_COMIC_COPY[item.id] ?? { label: item.label, line: item.line }) }));
}

export function localizedPhotoStickerScenes(locale: Locale) {
  if (locale === 'ko') return PHOTO_STICKER_SCENES;
  return PHOTO_STICKER_SCENES.map((item) => ({ ...item, ...(ENGLISH_PHOTO_COPY[item.id] ?? { label: item.label, line: item.line }) }));
}

export function tonesForLocale(locale: Locale) {
  return (Object.keys(TONES) as Tone[]).map((id) => ({ id, ...(locale === 'en' ? ENGLISH_TONES[id] : TONES[id]) }));
}

export function toneCopy(locale: Locale, tone: Tone) {
  return locale === 'en' ? ENGLISH_TONES[tone] : TONES[tone];
}
