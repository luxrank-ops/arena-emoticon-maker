import type { Metadata } from 'next';
import Link from 'next/link';
import { BUSINESS } from '@/lib/business';

export const metadata: Metadata = { title: '개인정보처리방침 · 이모티학' };

export default function PrivacyPage() {
  return (
    <div className="wrap max-w-3xl py-12">
      <h1 className="h2">개인정보처리방침</h1>
      <p className="mt-2 text-xs text-sub">시행일: 2026년 11월 5일 · 버전 v1.3</p>

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
                  <td className="py-2 font-bold text-ink">셀카 사진(원본)</td>
                  <td className="py-2">컷 생성 요청 시 AI 처리</td>
                  <td className="py-2 font-bold text-ink">서버에 저장하지 않음 (응답 후 즉시 폐기)</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">얼굴 분석 지표(색상 팔레트·품질 지표)</td>
                  <td className="py-2">캐릭터 시트·컷 생성</td>
                  <td className="py-2">생성 후 24시간 이내 파기</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">일관성 준비 정보(사진 해시·시각적 특징·인증 토큰 해시)</td>
                  <td className="py-2">생성 전 사진 확인 및 같은 사진의 컷 생성 기준 유지</td>
                  <td className="py-2">유효기간 1시간, 이후 다음 자동 정리 시 삭제</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">생성된 시안·컷 이미지</td>
                  <td className="py-2">내 팩 제공, 컷 생성 시 선택한 시안 참조, 굿즈 제작, 답장·브리핑에 재사용</td>
                  <td className="py-2">팩 삭제 시까지 (4항 참고)</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">이메일, 이름, 닉네임, 생년월일, 성별(선택), 비밀번호 해시</td>
                  <td className="py-2">회원 식별, 로그인, 연령 확인 및 회원 관리</td>
                  <td className="py-2">회원 탈퇴 또는 삭제 요청 시까지 (법정 보존 항목 제외)</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">결제·정산 기록</td>
                  <td className="py-2">결제·환불, 법정 보존</td>
                  <td className="py-2">계약·결제 기록 5년</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">서비스 이용 기록(생성·편집·추천 로그)</td>
                  <td className="py-2">추천 품질 개선, 통계</td>
                  <td className="py-2">1년 (비식별 처리 후 통계 활용)</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">AI 콘텐츠 신고(컷 ID·사유·상세 설명)</td>
                  <td className="py-2">부적절한 생성 결과 검토와 안전 조치</td>
                  <td className="py-2">검토 완료 후 90일, 계정 삭제 시 즉시 삭제</td>
                </tr>
                <tr className="border-b border-line">
                  <td className="py-2 font-bold text-ink">플레이 앱 AI 공정 이용 기록(날짜·생성 시도 수)</td>
                  <td className="py-2">AI 원가와 서비스 남용 방지</td>
                  <td className="py-2">35일, 계정 삭제 시 즉시 삭제</td>
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
            <strong className="text-ink">원본 사진의 흐름</strong>은 다음과 같습니다. ① 사진은 이용자의 브라우저 탭에만
            임시 보관되며, 탭을 닫으면 사라집니다. ② 얼굴 분석 지표(색상·품질)는 브라우저에서 계산하고, 단계 이동을 위해 선택한 설정과 함께 이 탭에 임시 보관합니다.
            ③ 이미지 생성 전에 원본 사진을 Google Gemini로 최대 두 차례 전송해 시각적 특징을 확인합니다. AI 확인이 불가능하거나 얼굴이 불명확하다고 판단되면 서버에서 파일 형식과 디코딩 가능 여부만 확인하는 기본 방식으로 진행하며, 이 방식은 얼굴을 분석하거나 동일성을 확인하지 않습니다. 시안·컷 생성 시 사진과 선택한 시안도 전송될 수 있습니다. ④ 서버는 원본 사진을 저장하지 않지만, 생성 기준에 필요한 사진 해시와 시각적 특징을 1시간 동안 유효하게 보관하고 만료 후 다음 자동 정리 시 삭제합니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">2. 민감정보(생체인식정보) 처리</h2>
          <p className="mt-2">
            얼굴 이미지는 개인정보보호법상 민감정보로 해석될 수 있습니다. 회사는 ① 별도 동의를 받고
            ② 생성 목적 외로 이용하지 않으며 ③ 얼굴 분석 지표의 파기 예정 시각을 기록하고 ④ 원본 사진을 서버에
            보관하지 않습니다. 회원은 언제든지 동의를 철회하고, 생성 결과물 및 파생 정보의 삭제를 요청할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">3. 개인정보의 국외 이전</h2>
          <p className="mt-2">
            생성 전 사진 확인 및 컷 생성을 위해 아래와 같이 국외 이전이 발생합니다.
          </p>
          <ul className="mt-2 space-y-1">
            <li>· 이전받는 자: Google LLC (Gemini API)</li>
            <li>· 이전 항목: 생성 전 사진 확인 및 컷 생성 시 셀카 사진, 선택한 생성 시안, 사진 특징 및 생성 지시문</li>
            <li>· 이전 국가·시기·방법: 미국 / 컷 생성 요청 시점 / 암호화된 네트워크(HTTPS) 전송</li>
            <li>· 이용 목적: 생성 전 사진 확인 및 이미지 생성</li>
            <li>· 보유 기간: 회사 서버는 응답 후 즉시 폐기합니다. 제공자 측 처리·보관 정책은 Google API 약관을 따르며, 이 부분은 법률 검토 중입니다.</li>
          </ul>
          <p className="mt-2">이전을 거부할 수 있으나, 이 경우 컷 생성 서비스 이용이 제한됩니다.</p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">4. 파기 절차 및 방법</h2>
          <p className="mt-2">
            얼굴 분석 지표는 생성 후 24시간이 지나면 자동 파기됩니다. 원본 사진은 저장하지 않으므로 파기 대상이 아닙니다.
            생성된 컷 이미지는 팩 상세 화면의 "팩 삭제"로 삭제할 수 있습니다. <Link href="/account-deletion" className="font-bold text-ink underline">계정 및 데이터 삭제 페이지</Link>에서는 로그인과 비밀번호 확인 후 계정, 세션, 얼굴·생성 정보, 팩, 신고와 공정 이용 기록을 직접 삭제할 수 있습니다. 법령상 보존이 필요한 유료 주문·구매/환불 원장은 남기되 배송 정보와 생성 이미지는 제거합니다. 미해결 결제나 제작·배송 중인 주문은 먼저 정리해야 합니다. 저장소 지연으로 즉시 지워지지 않은 이미지는 접근을 차단하고 영속 작업으로 자동 재시도합니다. 삭제만으로 자동 환불되지는 않으며 환불 가능 여부는 환불 정책과 관련 법령에 따라 확인합니다. 로그인할 수 없는 삭제 요청은 {BUSINESS.email}으로 접수합니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">5. 이용자의 권리</h2>
          <p className="mt-2">
            이용자는 언제든지 자신의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다. 요청은
            {BUSINESS.email}으로 접수하며, 10일 이내 처리합니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">6. AI 생성 결과물의 표시</h2>
          <p className="mt-2">
            서비스가 생성한 결과물에는 AI 생성 사실이 메타데이터 및 화면 라벨로 표시될 수 있습니다.
            이용자는 이를 임의로 제거하여 타인에게 오인하게 해서는 안 됩니다. 부적절하거나 권리를 침해하는 AI 결과는 각 컷의 "신고" 버튼으로 앱을 떠나지 않고 신고할 수 있으며, 운영자는 신고된 컷을 검토해 숨기거나 삭제할 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">7. 개인정보 보호책임자</h2>
          <p className="mt-2">
            성명: {BUSINESS.owner} · 직책: 대표자 · 연락처: {BUSINESS.email} / {BUSINESS.tel}
          </p>
        </section>
      </div>

      <div className="mt-10 rounded-2xl border-2 border-dashed border-line p-4 text-[11px] leading-relaxed text-sub">
        본 방침은 법률 검토 후 확정되며, 변경 시 7일 전 공지합니다.
      </div>
    </div>
  );
}
