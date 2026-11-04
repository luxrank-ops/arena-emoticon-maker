import type { Metadata } from 'next';
import { BUSINESS } from '@/lib/business';

export const metadata: Metadata = { title: '고객센터 · 이모티미' };

export default function SupportPage() {
  const email = BUSINESS.email;
  const phone = BUSINESS.tel;
  return (
    <div className="wrap max-w-3xl py-12">
      <h1 className="h2">고객센터</h1>
      <p className="mt-2 text-sm text-sub">이용 중 궁금한 점이나 결제·환불 문의를 접수해 주세요.</p>
      <p className="mt-1 text-xs text-sub">고객센터 운영시간: 평일 시간 확인 중 · 주말·공휴일 휴무</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm font-black">1:1 문의</p>
          <p className="mt-1 text-xs text-sub">환불·결제 문의는 주문번호와 함께 접수해 주세요.</p>
          {email ? <a href={`mailto:${email}`} className="btn-dark mt-3 w-full !py-2.5 text-xs">{email}</a> : <p className="mt-3 text-xs font-bold text-coralink">이메일 접수처를 설정 중입니다.</p>}
        </div>
        <div className="card p-5">
          <p className="text-sm font-black">전화 상담</p>
          <p className="mt-1 text-xs text-sub">문의 전화를 이용하실 수 있습니다.</p>
          {phone ? <a href={`tel:${phone.replace(/[^0-9+]/g, '')}`} className="btn-ghost mt-3 w-full !py-2.5 text-xs">{phone}</a> : <p className="mt-3 text-xs font-bold text-coralink">전화 접수처를 설정 중입니다.</p>}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {[
          {
            q: '생성이 실패했어요. 크레딧은 어떻게 되나요?',
            a: '다시 그리기 실패 시 크레딧 자동 복구를 시도합니다. 처음 팩 생성 중 실패하거나 복구가 확인되지 않으면 주문번호와 함께 문의해 주세요.',
          },
          {
            q: '얼굴이 잘 안 나와요.',
            a: '캐릭터 시트 단계에서 다른 시안을 고르면 표정이 달라집니다. 밝은 정면 사진일수록 결과가 좋습니다. Plus 이상 플랜은 화풍을 바꿔 재생성할 수 있습니다.',
          },
          {
            q: '결제 취소하고 싶어요.',
            a: '결제 후 7일 이내 미사용 유료 크레딧의 청약철회를 신청할 수 있습니다. 일부를 사용했더라도 미사용 부분은 별도로 확인합니다. 주문번호와 함께 문의해 주세요.',
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
