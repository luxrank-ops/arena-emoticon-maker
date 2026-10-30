import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCredits(credits: number): string {
  return new Intl.NumberFormat('ko-KR').format(credits);
}

export function formatCurrency(amount: number, currency = 'KRW'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const EMOTION_OPTIONS = [
  { value: 'joy', label: '기쁨', description: '미소, 웃음, 엄지척', icon: '😊' },
  { value: 'excitement', label: '열정', description: '불타오름, 파이팅, 박수', icon: '🔥' },
  { value: 'sadness', label: '슬픔/당황', description: '눈물, 동공지진, 시무룩', icon: '😢' },
  { value: 'approval', label: '최고/인정', description: '엄지척, 홀드, 베스트', icon: '👍' },
  { value: 'love', label: '사랑/하트', description: '하트, 뽀뽀, 윙크', icon: '❤️' },
  { value: 'anger', label: '화남/짜증', description: '불만, 화염, 으르렁', icon: '😡' },
  { value: 'surprise', label: '놀람/감탄', description: '입벌림, 별눈, 와우', icon: '😲' },
  { value: 'sleepy', label: '졸림/피곤', description: '하품, 눈감김, 잠', icon: '😴' },
] as const;

export const STYLE_OPTIONS = [
  { value: '3d-disney-pixar', label: '3D 디즈니/픽사', description: '말랑한 질감, 입체감, 부드러운 조명' },
  { value: '2d-cute', label: '2D 귀여운', description: '플랫 디자인, 선명한 라인, 파스텔톤' },
  { value: 'pixel-art', label: '픽셀 아트', description: '레트로 감성, 도트 그래픽, 게임풍' },
  { value: 'sketch', label: '스케치/손그림', description: '연필 질감, 자연스러운 선, 아날로그' },
  { value: 'watercolor', label: '수채화', description: '번짐 효과, 투명감, 예술적 감성' },
  { value: 'minimal', label: '미니멀/라인', description: '단순한 선, 여백의 미, 심플' },
] as const;

export const CREDIT_COSTS = {
  generation: 1,
  high_quality: 2,
  upscale: 1,
  variation: 1,
} as const;

export const FREE_CREDITS = 10;
export const DAILY_FREE_CREDITS = 3;