import type { Metadata } from 'next';

export const metadata: Metadata = { title: '개인정보처리방침 · 이모티미' };

export default function PrivacyPage() {
  return (
    <div className="wrap max-w-3xl py-12">
      <h1 className="h2">개인정보처리방침</h1>
      <p className="mt-2 text-xs text-sub">시행일: 2026년 10월 30일 · 버전 v1.0</p>

      <div className="mt-8 space-y-8 text-[13px] leading-relaxed text-sub">
        <section>
          <h2 className="text-sm font-black text-ink">1. 수집하는 개인정보 항목과 방법</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead className="text-[11px] uppercase tracking-wide text-sub">
                <tr className="border-b border-line">
                  <th className="py-2">항목</th>
                  <th className="py-2">목적</th>
                  <th className="py-2">보유 기간</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">얼굴 이미지에서 추출한 색상 팔레트·특징점 지표</td>
                  <td className="py-2">이모티콘 생성</td>
                  <td className="py-2">생성 후 24시간 이내 파기</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">이메일·닉네임(선택), 결제·정산 기록</td>
                  <td className="py-2">회원 관리, 결제·환불, 법정 보존</td>
                  <td className="py-2">계약·결제 기록 5년</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">서비스 이용 기록(생성·편집·추천 로그)</td>
                  <td className="py-2">추천 품질 개선, 통계</td>
                  <td className="py-2">1년 (비식별 처리 후 통계 활용)</td>
                </tr>
                <tr>
                  <td className="py-2 font-bold text-ink">붙여넣은 대화 텍스트</td>
                  <td className="py-2">답장 추천</td>
                  <td className="py-2 font-bold text-ink">저장하지 않음 (요청 처리 후 즉시 폐기)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            원본 사진은 <strong className="text-ink">서버로 전송되지 않습니다.</strong> 얼굴 분석은 이용자의
            브라우저(온디바이스)에서 수행되며, 서버에는 생성에 필요한 색상·특징 지표만 전달됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">2. 민감정보(생체인식정보) 처리</h2>
          <p className="mt-2">
            얼굴 이미지는 개인정보보호법상 민감정보로 해석될 수 있는 정보입니다. 회사는 ① 별도 동의를 받고
            ② 생성 목적 외로 이용하지 않으며 ③ 파기 예약 시각을 기록하고 ④ 원본을 보관하지 않습니다.
            또한 회원은 언제든지 동의를 철회하고 생성 결과물 및 파생 정보의 삭제를 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">3. 개인정보의 국외 이전</h2>
          <p className="mt-2">
            이미지 생성 처리를 위해 아래와 같이 국외 이전이 발생합니다.
          </p>
          <ul className="mt-2 space-y-1">
            <li>· 이전받는 자: Google LLC (Gemini API)</li>
            <li>· 이전 항목: 얼굴 특징 지표, 생성 프롬프트</li>
            <li>· 이전 국가·시기·방법: 미국 / 생성 요청 시점 / 네트워크 전송</li>
            <li>· 이용 목적: 이미지 생성·편집</li>
            <li>· 보유 기간: 처리 목적 달성 시까지(생성 후 즉시 파기)</li>
          </ul>
          <p className="mt-2">이전을 거부할 수 있으나, 이 경우 이미지 생성 서비스 이용이 제한됩니다.</p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">4. 파기 절차 및 방법</h2>
          <p className="mt-2">
            파기 사유가 발생하면 내부 절차에 따라 지체 없이 파기합니다. 전자적 파일은 복구 불가능한 방법으로
            영구 삭제하며, 파기 시각·대상을 로그로 기록합니다. 얼굴 파생 정보는 생성 후 24시간이 지나면
            자동 파기됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">5. 이용자의 권리</h2>
          <p className="mt-2">
            이용자는 언제든지 자신의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다. 요청은
            support@emotime.app 으로 접수하며, 10일 이내 처리합니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">6. AI 생성 결과물의 표시</h2>
          <p className="mt-2">
            서비스가 생성한 결과물에는 AI 생성 사실이 메타데이터 및 화면 라벨로 표시될 수 있습니다.
            이용자는 이를 임의로 제거하여 타인에게 오인하게 해서는 안 됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">7. 개인정보 보호책임자</h2>
          <p className="mt-2">
            성명: 홍길동 · 직책: 개인정보보호책임자 · 연락처: support@emotime.app / 02-000-0000
          </p>
        </section>
      </div>

      <div className="mt-10 rounded-2xl border-2 border-dashed border-line p-4 text-[11px] leading-relaxed text-sub">
        본 방침은 법률 검토 후 확정되며, 변경 시 7일 전 공지합니다.
      </div>
    </div>
  );
}
