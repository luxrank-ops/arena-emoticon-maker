export interface Accessory {
  id: string;
  name: string;
  emoji: string;
  promptAddition: string;
  priceCredits: number;
}

export const ACCESSORIES: Accessory[] = [
  { id: 'sunglasses', name: '스마트 힙 선글라스', emoji: '🕶️', promptAddition: 'wearing stylish cool sunglasses', priceCredits: 1 },
  { id: 'cat_ears', name: '귀여운 고양이 귀', emoji: '🐱', promptAddition: 'wearing cute fluffy cat ears headband', priceCredits: 1 },
  { id: 'angel_ring', name: '반짝이는 천사 링', emoji: '😇', promptAddition: 'with a glowing golden angel halo floating above the head', priceCredits: 1 },
  { id: 'party_hat', name: '생일 파티 고깔모자', emoji: '🎉', promptAddition: 'wearing a colorful birthday party cone hat', priceCredits: 1 },
  { id: 'coffee_mug', name: '카페인 충전 머그잔', emoji: '☕', promptAddition: 'holding a warm coffee mug in hands with steam', priceCredits: 2 },
  { id: 'soju_glass', name: '퇴근길 소주잔', emoji: '🍶', promptAddition: 'holding a small glass of soju with a tired joyful expression', priceCredits: 2 },
  { id: 'head_flower', name: '광기 실속 광인 꽃핀', emoji: '🌸', promptAddition: 'with a funny colorful flower hairpin on the hair', priceCredits: 1 },
  { id: 'vr_headset', name: '메타버스 VR 헤드셋', emoji: '🥽', promptAddition: 'wearing a futuristic futuristic VR headset', priceCredits: 2 },
];
