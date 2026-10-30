'use client';

import { EmoticonGenerator } from '@/components/generator/EmoticonGenerator';
import { Sparkles, Zap, Heart, Star, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: Sparkles,
    title: 'AI 프롬프트 최적화',
    desc: 'Gemini AI가 캐릭터 컨셉과 감정을 분석해 최적의 이미지 생성 프롬프트를 자동 작성',
  },
  {
    icon: Zap,
    title: '즉시 사용 가능',
    desc: '생성된 프롬프트를 DALL·E 3, Midjourney, Stable Diffusion에 바로 복사해 사용',
  },
  {
    icon: Heart,
    title: '다양한 감정 표현',
    desc: '기쁨, 열정, 슬픔, 사랑, 화남, 놀람, 졸림 등 8가지 감정과 커스텀 대사 지원',
  },
  {
    icon: Star,
    title: '다양한 아트 스타일',
    desc: '3D 디즈니/픽사, 2D 귀여운, 픽셀 아트, 스케치, 수채화, 미니멀 6가지 스타일',
  },
];

const steps = [
  { step: '01', title: '캐릭터 설정', desc: '이름, 컨셉, 아트 스타일 선택' },
  { step: '02', title: '감정 & 대사', desc: '표정 종류와 말풍선 대사 입력' },
  { step: '03', title: 'AI 최적화', desc: 'Gemini AI로 프롬프트 자동 생성' },
  { step: '04', title: '이미지 생성', desc: 'DALL·E/Midjourney로 고품질 이미지 제작' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-100/50 via-transparent to-transparent" />
        <div className="container-main relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3 h-3" />
            Arena AI Project
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-6">
            나만의 <span className="gradient-text">이모티콘</span> 제작기
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            캐릭터 컨셉만 입력하면 <strong>Gemini AI</strong>가 최적의 프롬프트를 만들어줍니다.
            DALL·E 3, Midjourney, Stable Diffusion에서 바로 사용하세요.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="#generator" className="btn-primary text-lg px-10 py-4">
              <Sparkles className="w-5 h-5 mr-2" />
              지금 시작하기 (무료 10 크레딧)
            </Link>
            <Link href="/auth/signin" className="btn-secondary text-lg px-10 py-4">
              로그인하고 크레딧 받기
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 bg-white border-y border-slate-100">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              왜 <span className="gradient-text">Arena Emoticon Maker</span>인가요?
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              프롬프트 엔지니어링의 번거로움 없이, 내 상상력만으로 최고의 이모티콘을 만드세요.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card-hover p-6 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              <span className="gradient-text">4단계</span>로 완성하는 나만의 이모티콘
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              복잡한 프롬프트 작성 없이, 직관적인 UI로 누구나 쉽게 만들 수 있습니다.
            </p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-[calc(100%-2.5rem)] bg-gradient-to-b from-primary-200 to-transparent" />
            <div className="space-y-8">
              {steps.map((step, index) => (
                <div key={step.step} className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 text-white font-bold text-lg flex-shrink-0 z-10">
                    {step.step}
                  </div>
                  <div className="flex-1 text-center md:text-left md:pl-4">
                    <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                    <p className="text-slate-600 mt-1">{step.desc}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block w-12 flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-primary-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Generator Section */}
      <section id="generator" className="py-16 sm:py-20 bg-white">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              지금 바로 <span className="gradient-text">시작해보세요</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              로그인 없이도 체험 가능합니다. 로그인 시 무료 10 크레딧을 드려요.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <EmoticonGenerator />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-slate-900">
        <div className="container-main text-center">
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary-900/30 text-primary-300 px-3 py-1 rounded-full text-sm font-medium mb-6">
              <CheckCircle className="w-4 h-4" />
              무료 체험 · 신용카드 불필요 · 언제든 취소 가능
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              더 많은 이모티콘이 필요하신가요?
            </h2>
            <p className="text-slate-300 text-lg mb-8">
              프로 플랜으로 업그레이드하고 무제한 생성, 고해상도 다운로드, 우선 지원 혜택을 누리세요.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/pricing" className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-semibold transition">
                요금제 보기
              </Link>
              <Link href="/auth/signin" className="border-2 border-slate-700 hover:border-slate-600 text-white px-8 py-4 rounded-xl font-semibold transition">
                무료 시작하기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-12">
        <div className="container-main">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-primary-600" />
                <span className="text-xl font-bold text-slate-900">Arena Emoticon Maker</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed max-w-sm">
                AI 기술로 누구나 쉽게 나만의 캐릭터 이모티콘을 만들 수 있는 세상을 만듭니다.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">제품</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="#" className="hover:text-primary-600 transition">이모티콘 생성기</Link></li>
                <li><Link href="/pricing" className="hover:text-primary-600 transition">요금제</Link></li>
                <li><Link href="/gallery" className="hover:text-primary-600 transition">갤러리</Link></li>
                <li><Link href="/api/docs" className="hover:text-primary-600 transition">API 문서</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">지원</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><Link href="/docs" className="hover:text-primary-600 transition">가이드</Link></li>
                <li><Link href="/faq" className="hover:text-primary-600 transition">자주 묻는 질문</Link></li>
                <li><Link href="/contact" className="hover:text-primary-600 transition">문의하기</Link></li>
                <li><Link href="/status" className="hover:text-primary-600 transition">서비스 상태</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © 2024 Arena AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/privacy" className="hover:text-primary-600 transition">개인정보처리방침</Link>
              <Link href="/terms" className="hover:text-primary-600 transition">이용약관</Link>
              <Link href="/cookies" className="hover:text-primary-600 transition">쿠키 정책</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}