import { loadTossPayments, TossPaymentsWidgets, WidgetSelectedPaymentMethod } from '@tosspayments/tosspayments-sdk';

/**
 * 토스페이먼츠 설정 상수
 */
const TOSS_PAYMENTS_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.tosspayments.com'
  : 'https://api.tosspayments.com';

/**
 * 토스페이먼츠 서버 사이드 API 클라이언트
 * 결제 승인, 취소, 조회 등을 위한 API 호출
 */
export interface TossPaymentConfig {
  secretKey: string;
  clientKey: string;
}

export class TossPaymentsServerClient {
  private secretKey: string;
  private clientKey: string;
  private authHeader: string;

  constructor(config: TossPaymentConfig) {
    this.secretKey = config.secretKey;
    this.clientKey = config.clientKey;
    // Basic Auth: secretKey를 base64로 인코딩 (뒤에 : 추가)
    this.authHeader = `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`;
  }

  /**
   * 결제 승인 요청
   */
  async confirmPayment(params: {
    paymentKey: string;
    orderId: string;
    amount: number;
    orderName?: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    const response = await fetch(`${TOSS_PAYMENTS_API_URL}/v1/payments/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: params.paymentKey,
        orderId: params.orderId,
        amount: params.amount,
        orderName: params.orderName,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new TossPaymentsError(data.code, data.message, data);
    }

    return data as TossPaymentResponse;
  }

  /**
   * 결제 조회
   */
  async getPayment(paymentKey: string) {
    const response = await fetch(`${TOSS_PAYMENTS_API_URL}/v1/payments/${paymentKey}`, {
      method: 'GET',
      headers: {
        'Authorization': this.authHeader,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new TossPaymentsError(data.code, data.message, data);
    }

    return data as TossPaymentResponse;
  }

  /**
   * 결제 취소 (환불)
   */
  async cancelPayment(paymentKey: string, cancelReason: string, cancelAmount?: number) {
    const response = await fetch(`${TOSS_PAYMENTS_API_URL}/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cancelReason,
        ...(cancelAmount && { cancelAmount }),
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new TossPaymentsError(data.code, data.message, data);
    }

    return data as TossPaymentResponse;
  }

  /**
   * 현금영수증 발급
   */
  async issueCashReceipt(paymentKey: string, type: '소득공제' | '지출증빙', amount: number, taxFreeAmount: number) {
    const response = await fetch(`${TOSS_PAYMENTS_API_URL}/v1/payments/${paymentKey}/cash-receipts`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        amount,
        taxFreeAmount,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new TossPaymentsError(data.code, data.message, data);
    }

    return data;
  }

  /**
   * 정기결제(빌링) 고객 인증 요청 (빌링키 발급용)
   */
  async requestBillingAuth(params: {
    customerKey: string;
    successUrl: string;
    failUrl: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    // 빌링 인증은 프론트엔드에서 처리 (redirect 방식)
    // 여기서는 빌링키 발급 API만 제공
  }

  /**
   * 인증키로 빌링키 발급
   */
  async issueBillingKey(authKey: string, customerKey: string) {
    const response = await fetch(`${TOSS_PAYMENTS_API_URL}/v1/billing/authorizations/issue`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authKey,
        customerKey,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new TossPaymentsError(data.code, data.message, data);
    }

    return data as TossBillingKeyResponse;
  }

  /**
   * 정기결제(빌링) 결제 요청
   */
  async requestBillingPayment(params: {
    customerKey: string;
    amount: number;
    orderId: string;
    orderName: string;
    customerEmail?: string;
    customerName?: string;
  }) {
    const response = await fetch(`${TOSS_PAYMENTS_API_URL}/v1/billing/payments`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new TossPaymentsError(data.code, data.message, data);
    }

    return data as TossPaymentResponse;
  }
}

/**
 * 토스페이먼츠 에러 클래스
 */
export class TossPaymentsError extends Error {
  public code: string;
  public rawData: any;

  constructor(code: string, message: string, rawData: any) {
    super(message);
    this.name = 'TossPaymentsError';
    this.code = code;
    this.rawData = rawData;
  }
}

/**
 * 토스페이먼츠 결제 응답 타입
 */
export interface TossPaymentResponse {
  mId: string;
  version: string;
  paymentKey: string;
  orderId: string;
  orderName: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  taxFreeAmount: number;
  status: TossPaymentStatus;
  method: string;
  paidAt: string | null;
  cancel?: {
    cancelAmount: number;
    cancelReason: string;
    canceledAt: string;
  } | null;
  cashReceipt?: {
    receiptId: string;
    receiptUrl: string;
  } | null;
  receipt?: {
    url: string;
  } | null;
  discount?: any;
  metadata?: Record<string, string>;
  virtualAccount?: any;
  transfer?: any;
  mobilePhone?: any;
  giftCertificate?: any;
  card?: {
    issuerCode: string;
    acquirerCode: string;
    number: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    approveNo: string;
    useCardPoint: boolean;
    cardType: string;
    ownerType: string;
    acquireStatus: string;
  } | null;
  cashReceipts: any[];
  easyPay?: any;
  cultureExpense?: boolean;
  currency: string;
  country: string;
  failure?: {
    code: string;
    message: string;
  } | null;
  isPartialCancelable: boolean;
}

export interface TossBillingKeyResponse {
  billingKey: string;
  customerKey: string;
  method: string;
  card?: {
    issuerCode: string;
    acquirerCode: string;
    number: string;
    cardType: string;
    ownerType: string;
  } | null;
}

export type TossPaymentStatus = 
  | 'READY'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_DEPOSIT'
  | 'DONE'
  | 'CANCELED'
  | 'PARTIAL_CANCELED'
  | 'ABORTED'
  | 'EXPIRED';

/**
 * 주문 ID 생성 (고유한 주문 번호)
 */
export function generateOrderId(prefix: string = 'ORDER'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 결제 금액 포맷팅
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

/**
 * 결제 상태 한글 변환
 */
export function getPaymentStatusLabel(status: TossPaymentStatus): string {
  const labels: Record<TossPaymentStatus, string> = {
    READY: '결제 대기',
    IN_PROGRESS: '결제 진행 중',
    WAITING_FOR_DEPOSIT: '입금 대기',
    DONE: '결제 완료',
    CANCELED: '결제 취소',
    PARTIAL_CANCELED: '부분 취소',
    ABORTED: '결제 중단',
    EXPIRED: '결제 만료',
  };
  return labels[status] || status;
}

/**
 * 싱글톤 인스턴스 생성 (서버 사이드용)
 */
let tossPaymentsInstance: TossPaymentsServerClient | null = null;

export function getTossPaymentsServerClient(): TossPaymentsServerClient {
  if (!tossPaymentsInstance) {
    const secretKey = process.env.TOSS_SECRET_KEY;
    const clientKey = process.env.TOSS_CLIENT_KEY;
    
    if (!secretKey || !clientKey) {
      throw new Error('토스페이먼츠 환경 변수가 설정되지 않았습니다. (TOSS_SECRET_KEY, TOSS_CLIENT_KEY)');
    }
    
    tossPaymentsInstance = new TossPaymentsServerClient({ secretKey, clientKey });
  }
  
  return tossPaymentsInstance;
}

/**
 * 클라이언트 키 가져오기 (프론트엔드용)
 */
export function getTossClientKey(): string {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) {
    throw new Error('토스페이먼츠 클라이언트 키가 설정되지 않았습니다. (NEXT_PUBLIC_TOSS_CLIENT_KEY)');
  }
  return clientKey;
}

/**
 * 프론트엔드용 토스페이먼츠 SDK 로드 함수
 * 브라우저에서만 동작
 */
export async function loadTossPaymentsSDK(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('브라우저 환경에서만 사용 가능합니다.');
  }
  
  const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
  const clientKey = getTossClientKey();
  return loadTossPayments(clientKey);
}

/**
 * 결제 위젯 인스턴스 생성 (프론트엔드용)
 * 주문서형/결제창형 결제 위젯 초기화
 */
export async function createPaymentWidget(customerKey: string): Promise<any> {
  const tossPayments = await loadTossPaymentsSDK();
  // 비회원 결제인 경우 ANONYMOUS 사용
  const widgets = tossPayments.widgets({ customerKey });
  return widgets;
}

/**
 * 결제 위젯에서 사용할 결제 수단 타입
 */
export type TossPaymentMethod = 
  | 'CARD' 
  | 'TRANSFER' 
  | 'VIRTUAL_ACCOUNT' 
  | 'MOBILE_PHONE'
  | 'TOSSPAY' 
  | 'NAVERPAY' 
  | 'KAKAOPAY' 
  | 'PAYCO' 
  | 'APPLEPAY'
  | 'SAMSUNGPAY';

/**
 * 결제 요청 파라미터 타입 (프론트엔드 위젯용)
 */
export interface TossPaymentWidgetRequestParams {
  orderId: string;
  orderName: string;
  amount: { value: number; currency: 'KRW' };
  customerEmail?: string;
  customerName?: string;
  successUrl: string;
  failUrl: string;
  metadata?: Record<string, string>;
  // 선택된 결제수단으로 바로 결제 (간편결제 등)
  method?: TossPaymentMethod;
}