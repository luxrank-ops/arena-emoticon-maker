import type { Metadata } from 'next';

export const metadata: Metadata = { title: '고객센터 · 이모티미' };

export default function SupportPage() {
  return (
    <div className="wrap max-w-3xl py-12">
      <h1 className="h2">고객센터</h1>
      <p className="mt-2 text-sm text-sub">평일 10:00–18:00 (점심 12:30–13:30) · 주말·공휴일 휴무</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm font-black">1:1 문의</p>
          <p className="mt-1 text-xs text-sub">24시간 접수 · 영업일 기준 1일 내 회신</p>
          <a href="mailto:support@emotime.app" className="btn-dark mt-3 w-full !py-2.5 text-xs">
            support@emotime.app
          </a>
        </div>
        <div className="card p-5">
          <p className="text-sm font-black">전화 상담</p>
          <p className="mt-1 text-xs text-sub">평일 10:00–18:00</p>
          <a href="tel:020000000" className="btn-ghost mt-3 w-full !py-2.5 text-xs">
            02-000-0000
          </a>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {[
          {
            q: '생성이 실패했어요. 크레딧은 어떻게 되나요?',
            a: '회사 귀책으로 생성이 실패하면 사용된 크레딧이 자동 복구됩니다. 복구되지 않은 경우 문의 주시면 즉시 처리합니다.',
          },
          {
            q: '얼굴이 잘 안 나와요.',
            a: '캐릭터 시트 단계에서 다른 시안을 고르면 표정이 달라집니다. 밝은 정면 사진일수록 결과가 좋습니다. Plus 이상 플랜은 화풍을 바꿔 재생성할 수 있습니다.',
          },
          {
            q: '결제 취소하고 싶어요.',
            a: '결제일로부터 7일 이내이며 생성 이력이 없다면 전액 환불 가능합니다. 주문번호와 함께 문의해 주세요.',
          },
          {
            q: '내 사진이 저장되나요?',
            a: '아니요. 얼굴 분석은 브라우저에서 이뤄지고, 서버에는 색상·특징 지표만 전달되어 24시간 내 파기됩니다.',
          },
        ].map((f) => (
          <details key={f.q} className="card-flat p-4">
            <summary className="cursor-pointer list-none text-sm font-black">Q. {f.q}</summary>
            <p className="mt-2 border-t border-line pt-2 text-xs leading-relaxed text-sub">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
