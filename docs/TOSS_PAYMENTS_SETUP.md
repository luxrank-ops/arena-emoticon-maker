# 토스페이먼츠 결제 연동 설정 및 출시 전 점검

## 현재 범위
- 토스 주문서형 SDK v2와 서버 승인 API는 **일회성 크레딧 상품**에 연결한다. 플랜 정기결제, 굿즈 결제, 가상계좌, 결제 취소·환불 API와 웹훅은 구현하지 않았다. 구독과 운영 굿즈 주문은 차단한다.
- 실제 서비스 제공 전, 환불·청약철회 정책, 통신판매업 정보, 사업자 주소 및 고객센터 운영 절차, 상품과 가격·제공 조건을 확정하고 법률 검토한다.
- 주문 생성, 동의 저장과 승인 후 원장 반영은 원격 CAS 저장소를 필수로 사용한다. 장애 시 로컬·메모리에 대체 저장하지 않는다. 결제 승인 응답을 받지 못하거나 저장이 실패하면 동일 주문·결제키로 다시 확인한다.
- 사용자는 `/billing`에서 저장된 결제키로 승인 결과를 복구할 수 있다. 운영자는 `/admin`의 결제 대사 점검에서 미지급 의심 주문과 원장 불일치를 확인하고, 소유자·토스 거래를 대조한 뒤 복구한다. 원장 불일치는 자동 복구하지 않는다.
- 결제 UI의 카드 기반 선택만 허용한다. 토스 상점관리자의 결제 UI에서도 카드 기반 결제 외 수단(특히 가상계좌, 브랜드페이, 커스텀 결제)을 비활성화한다. 미지원 수단의 입금·취소 웹훅은 처리하지 않는다.

## 설정
1. 토스페이먼츠 가입·심사 후 주문서형 결제의 **서로 맞는** 클라이언트 키와 시크릿 키를 발급받는다. 시크릿 키는 절대 클라이언트·Git·대화에 넣지 않는다.
2. 개발 환경에서 `PAYMENT_PROVIDER=toss`, `NEXT_PUBLIC_TOSS_CLIENT_KEY` 및 서버 전용 `TOSS_SECRET_KEY`에 같은 상점의 테스트 키를 안전하게 설정한다. 실제 승인을 테스트하려면 토스 테스트 환경을 사용한다. `mock`은 로컬 개발 전용이다.
3. 키 형식은 클라이언트 `test_ck_`·`live_ck_`, 시크릿 `test_sk_`·`live_sk_`를 사용한다. 운영에서는 테스트 키, mock, 미설정·불일치 키를 거부한다.
4. 배포 환경에 영속적인 Firestore 또는 KV CAS 저장소를 설정하고, 토스 결제 UI의 수단·도메인 및 `/checkout/success`·`/checkout/fail` 콜백을 확인한다.
5. 실제 운영 활성화 전에 라이브 키를 배포 플랫폼의 안전한 환경변수에 직접 등록하고 `PAYMENT_PROVIDER=toss`로 설정해 재배포한다. 키 접두사가 같아도 동일 상점의 쌍인지 서버가 알 수 없으므로 실제 테스트와 계약 정보를 확인한다.

## 자동 검사
- `npm run test:payments`: 원장 불일치 탐지, 키 종류, 저장소 설정, 비상 스위치와 비밀값 미노출 preflight를 검사한다.
- `npm run test:checkout`: 실제 토스 API가 아닌 스텁 서버에서 동의, 금액·소유자·출처 검증, 동시 승인 멱등성, 조회 복구, 사용자·관리자 복구와 실패 승인 차단을 검사한다.
- `npm run test:checkout:suspended`: 같은 데이터와 스텁 상태를 유지한 채 서버를 `PAYMENT_CHECKOUT_DISABLED=1`로 재시작하면, 새 주문은 차단되고 기존 주문 복구는 성공하는지 검사한다.
- GitHub Actions `Payment readiness`가 세 검사를 실행한다. 스텁과 가짜 키는 배포하지 않는다.

격리된 로컬 통합 검사는 다음 조건으로 서버를 실행한 뒤 별도 터미널에서 실행한다. `RATE_LIMIT_DISABLED=1`과 스텁은 이 테스트에만 사용한다.

```sh
CHECKOUT_TEST_STUB=1 \
NODE_OPTIONS=--require\ ./scripts/toss-test-stub.cjs \
PAYMENT_PROVIDER=toss \
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_dummy \
TOSS_SECRET_KEY=test_sk_dummy \
STORE_BACKEND=file DATA_DIR=/tmp/emotime-checkout-data \
RATE_LIMIT_DISABLED=1 ADMIN_PASSCODE=checkout-admin \
npm run dev
```

```sh
CHECKOUT_TEST_BASE_URL=http://127.0.0.1:3000 CHECKOUT_TEST_STUB=1 npm run test:checkout
```

## 설정 preflight
- 운영 형식 검사: `npm run preflight:payments`
- 테스트 키 형식 검사: `node scripts/payment-preflight.mjs --test`
- 키·사업자 환경값·원격 저장소·사이트 URL·운영자 설정을 검사하고 값 자체는 출력하지 않는다. 실제 연결, 상점 계약, 법무 검토, 실제 결제를 대체하지 않으며 출력되는 수동 체크리스트도 완료해야 한다.

## 출시 전 필수 QA
- 실제 토스 테스트 키로 PC·모바일 브라우저에서 결제창, 동의, 인증 성공·실패·취소, 중복 클릭, 새로고침, 금액 변조, 승인 실패와 복구를 검증한다. 테스트 키는 운영 모드에서 차단되므로 별도 격리 개발 환경에서 진행한다.
- 원격 저장소 장애, 타임아웃, 승인 성공 후 데이터 저장 실패·재시도, 동시 승인 요청 시 중복 크레딧 방지를 테스트하고 운영자가 결제 조회를 대조하는 절차를 마련한다.
- 결제 완료 페이지와 `/billing`에서 같은 주문을 재확인한다. 세션이 바뀌어 소유자 확인이 불가능하면 고객센터가 주문번호와 토스 거래를 대조한 뒤 관리자 복구를 사용한다.
- 자동 정기결제·환불·굿즈 주문과 가상계좌 입금은 지원하지 않으므로 계속 차단되어 있는지 확인한다.

## 비상 중단과 운영
- `PAYMENT_CHECKOUT_DISABLED=1`은 새 주문·결제 준비만 멈춘다. 기존 주문의 승인 확인과 복구는 계속할 수 있다.
- 비상 스위치 회귀 검사는 통합 테스트 직후 같은 `DATA_DIR`과 스텁 상태로 개발 서버를 이 값과 함께 재시작하고 `CHECKOUT_TEST_BASE_URL=http://127.0.0.1:3000 CHECKOUT_TEST_STUB=1 npm run test:checkout:suspended`를 실행한다.
- 미지급 주문이 남았을 때 provider를 mock으로 바꾸거나 키를 삭제하면 복구까지 중단되므로 사용하지 않는다.
- 일상 대사, 장애별 대응, 환불 접수와 복구 절차는 `docs/PAYMENT_OPERATIONS.md`를 따른다.

## 참고
- https://docs.tosspayments.com/guides/v2/payment-widget/integration
- https://docs.tosspayments.com/guides/using-api/idempotency-key
