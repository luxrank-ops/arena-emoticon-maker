'use client';

const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
let loader: Promise<any> | null = null;

function kakaoEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
}

async function loadKakao() {
  if (!kakaoEnabled() || typeof window === 'undefined') return null;
  if (loader) return loader;
  loader = new Promise<any>((resolve, reject) => {
    const existing = (window as any).Kakao;
    if (existing) { resolve(existing); return; }
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => resolve((window as any).Kakao);
    script.onerror = () => { loader = null; reject(new Error('Kakao SDK load failed')); };
    document.head.appendChild(script);
  });
  return loader;
}

export interface KakaoFeedData {
  title: string;
  description: string;
  imageUrl: string;
  resultUrl: string;
  createUrl: string;
}

/** Returns false when direct integration is not configured; never implies message delivery. */
export async function shareKakaoFeed(data: KakaoFeedData): Promise<boolean> {
  const Kakao = await loadKakao();
  if (!Kakao) return false;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY!;
  if (!Kakao.isInitialized()) Kakao.init(key);
  if (!Kakao.Share?.sendDefault) throw new Error('Kakao Share is unavailable');
  const link = { mobileWebUrl: data.resultUrl, webUrl: data.resultUrl };
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: { title: data.title, description: data.description, imageUrl: data.imageUrl, link },
    buttons: [
      { title: '결과 보기', link },
      { title: '나도 만들기', link: { mobileWebUrl: data.createUrl, webUrl: data.createUrl } },
    ],
  });
  return true;
}
