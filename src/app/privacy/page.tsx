import type { Metadata } from 'next';

export const metadata: Metadata = { title: '개인정보처리방침 · 이모티미' };

export default function PrivacyPage() {
  return (
    <div className="wrap max-w-3xl py-12">
      <h1 className="h2">개인정보처리방침</h1>
      <p className="mt-2 text-xs text-sub">시행일: 2026년 11월 2일 · 버전 v1.1</p>

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
                  <td className="py-2 font-bold text-ink">생성된 시안·컷 이미지</td>
                  <td className="py-2">내 팩 제공, 컷 생성 시 선택한 시안 참조, 굿즈 제작, 답장·브리핑에 재사용</td>
                  <td className="py-2">팩 삭제 시까지 (4항 참고)</td>
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
            <strong className="text-ink">원본 사진의 흐름</strong>은 다음과 같습니다. ① 사진은 이용자의 브라우저 탭에만
            임시 보관되며, 탭을 닫으면 사라집니다. ② 얼굴 분석 지표(색상·품질)는 브라우저에서 계산합니다.
            ③ 컷을 만들 때에만 사진이 서버를 거쳐 AI 제공자(Google Gemini API)로 전송됩니다. ④ 서버는 응답을 받은 뒤
            원본 사진을 저장하지 않습니다. 팩의 컷을 만들거나 다시 그릴 때는 선택한 생성 시안도 일관성 유지를 위한 참조 이미지로 Google에 전송될 수 있습니다.
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
            컷 생성을 위해 아래와 같이 국외 이전이 발생합니다.
          </p>
          <ul className="mt-2 space-y-1">
            <li>· 이전받는 자: Google LLC (Gemini API)</li>
            <li>· 이전 항목: 컷 생성 요청 시 셀카 사진, 선택한 생성 시안 이미지, 생성 지시문(표정·대사·화풍)</li>
            <li>· 이전 국가·시기·방법: 미국 / 컷 생성 요청 시점 / 암호화된 네트워크(HTTPS) 전송</li>
            <li>· 이용 목적: 이미지 생성</li>
            <li>· 보유 기간: 회사 서버는 응답 후 즉시 폐기합니다. 제공자 측 처리·보관 정책은 Google API 약관을 따르며, 이 부분은 법률 검토 중입니다.</li>
          </ul>
          <p className="mt-2">이전을 거부할 수 있으나, 이 경우 컷 생성 서비스 이용이 제한됩니다.</p>
        </section>

        <section>
          <h2 className="text-sm font-black text-ink">4. 파기 절차 및 방법</h2>
          <p className="mt-2">
            얼굴 분석 지표는 생성 후 24시간이 지나면 자동 파기됩니다. 원본 사진은 저장하지 않으므로 파기 대상이 아닙니다.
            생성된 컷 이미지는 팩 상세 화면의 "팩 삭제"로 즉시 영구 삭제할 수 있습니다. 삭제된 이미지는 복구할 수 없으며, 이미 사용한 크레딧은 환불되지 않습니다. 계정 전체 삭제나 앱에서 처리할 수 없는 요청은 support@emotime.app 으로 접수하면 수동으로 처리합니다. 전자적 파일은 복구 불가능한 방법으로 삭제하고, 처리 기록을 남깁니다.
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
