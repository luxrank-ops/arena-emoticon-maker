'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadTossPayments, ANONYMOUS, TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { getTossClientKey } from '@/lib/payments/toss';

interface TossPaymentWidgetProps {
  /** 주문 ID */
  orderId: string;
  /** 주문명 */
  orderName: string;
  /** 결제 금액 (원) */
  amount: number;
  /** 고객 이메일 */
  customerEmail?: string;
  /** 고객 이름 */
  customerName?: string;
  /** 고객 키 (로그인한 사용자의 고유 ID, 비회원은 자동으로 ANONYMOUS 처리) */
  customerKey?: string;
  /** 결제 성공 시 콜백 */
  onSuccess: (data: { paymentKey: string; orderId: string; amount: number }) => void;
  /** 결제 실패 시 콜백 */
  onError: (error: { code: string; message: string }) => void;
  /** 결제 진행 중 상태 변경 콜백 */
  onLoadingChange?: (loading: boolean) => void;
  /** 성공 리다이렉트 URL */
  successUrl?: string;
  /** 실패 리다이렉트 URL */
  failUrl?: string;
  /** 메타데이터 */
  metadata?: Record<string, string>;
}

export function TossPaymentWidget({
  orderId,
  orderName,
  amount,
  customerEmail,
  customerName,
  customerKey,
  onSuccess,
  onError,
  onLoadingChange,
  successUrl,
  failUrl,
  metadata = {},
}: TossPaymentWidgetProps) {
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const agreementWidgetRef = useRef<HTMLDivElement>(null);
  const paymentMethodWidgetRef = useRef<any>(null);
  const agreementWidgetInstanceRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  // SDK 초기화
  useEffect(() => {
    let mounted = true;

    const initWidget = async () => {
      try {
        // 토스페이먼츠 SDK 로드
        const tossPayments = await loadTossPayments(getTossClientKey());
        
        if (!mounted) return;

        // 고객 키 설정 (비회원은 ANONYMOUS)
        const key = customerKey || ANONYMOUS;
        
        // 위젯 인스턴스 생성
        const widgets = tossPayments.widgets({ customerKey: key });
        widgetsRef.current = widgets;

        // 결제 금액 설정
        widgets.setAmount({ value: amount, currency: 'KRW' });

        // 결제 수단 위젯 렌더링
        if (widgetContainerRef.current) {
          paymentMethodWidgetRef.current = await widgets.renderPaymentMethods({
            selector: '#toss-payment-method-widget',
            variantKey: 'DEFAULT',
          });
        }

        // 약관 위젯 렌더링 (선택 사항)
        if (agreementWidgetRef.current) {
          agreementWidgetInstanceRef.current = await widgets.renderAgreement({
            selector: '#toss-agreement-widget',
          });
        }

        setIsReady(true);
      } catch (error) {
        console.error('토스페이먼츠 위젯 초기화 실패:', error);
        onError({
          code: 'WIDGET_INIT_ERROR',
          message: '결제 위젯을 불러오는데 실패했습니다. 페이지를 새로고침해 주세요.',
        });
      }
    };

    initWidget();

    return () => {
      mounted = false;
      // 위젯 정리
      if (widgetsRef.current) {
        try {
          // 위젯 정리 (SDK가 제공하는 경우)
        } catch (e) {
          console.warn('위젯 정리 중 오류:', e);
        }
      }
    };
  }, [customerKey, getTossClientKey, amount]);

  // 결제 요청 함수
  const requestPayment = useCallback(async () => {
    if (!widgetsRef.current || !paymentMethodWidgetRef.current) {
      onError({ code: 'WIDGET_NOT_READY', message: '결제 위젯이 준비되지 않았습니다.' });
      return;
    }

    setIsLoading(true);
    onLoadingChange?.(true);

    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const defaultSuccessUrl = `${baseUrl}/dashboard/credits?payment=success`;
      const defaultFailUrl = `${baseUrl}/dashboard/credits?payment=fail`;

      // 결제 요청 (주문서형 - 위젯에서 선택한 결제수단으로 결제)
      // 선택된 결제수단(카드, 간편결제, 계좌이체 등)은 위젯에서 자동으로 처리됨
      await widgetsRef.current.requestPayment({
        orderId,
        orderName,
        customerEmail,
        customerName,
        successUrl: successUrl || defaultSuccessUrl,
        failUrl: failUrl || defaultFailUrl,
        metadata,
      });

      // 리다이렉트 방식이므로 이 코드는 실행되지 않음
      // 성공 시 successUrl로 이동하여 거기서 결제 승인 처리
    } catch (error: any) {
      console.error('결제 요청 실패:', error);
      
      // 사용자 취소 에러 처리
      if (error.code === 'USER_CANCEL') {
        onError({ code: 'USER_CANCEL', message: '결제가 취소되었습니다.' });
      } else {
        onError({ 
          code: error.code || 'PAYMENT_ERROR', 
          message: error.message || '결제 처리 중 오류가 발생했습니다.' 
        });
      }
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  }, [orderId, orderName, customerEmail, customerName, successUrl, failUrl, metadata, onSuccess, onError, onLoadingChange]);

  if (!isReady) {
    return (
      <div className="toss-payment-widget">
        <div className="widget-loading" role="status" aria-label="결제 위젯 로딩 중">
          <div className="spinner"></div>
          <p>결제 위젯을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="toss-payment-widget">
      {/* 결제 수단 위젯 컨테이너 */}
      <div 
        id="toss-payment-method-widget" 
        ref={widgetContainerRef}
        className="payment-method-widget"
        role="region"
        aria-label="결제 수단 선택"
      />
      
      {/* 약관 동의 위젯 컨테이너 */}
      <div 
        id="toss-agreement-widget" 
        ref={agreementWidgetRef}
        className="agreement-widget"
        role="region"
        aria-label="약관 동의"
      />

      {/* 결제 버튼 */}
      <div className="general-payment-section">
        <button
          type="button"
          className={`payment-btn ${isLoading ? 'loading' : ''}`}
          onClick={requestPayment}
          disabled={isLoading}
          aria-label={isLoading ? '결제 처리 중' : '결제하기'}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner" aria-hidden="true"></span>
              결제 처리 중...
            </>
          ) : (
            `결제하기 (${formatAmount(amount)}원)`
          )}
        </button>
        <p className="payment-hint">
          위쪽에서 결제 수단(카드, 토스페이, 카카오페이, 네이버페이, 페이코, 계좌이체 등)을 선택한 후 결제하기 버튼을 눌러주세요.
        </p>
      </div>

      <style jsx>{`
        .toss-payment-widget {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .widget-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #666;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e0e0e0;
          border-top-color: #3182f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .payment-method-widget {
          margin-bottom: 16px;
          min-height: 200px;
        }
        .agreement-widget {
          margin-bottom: 20px;
        }
        .general-payment-section {
          text-align: center;
        }
        .payment-btn {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 8px;
          background: #3182f6;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .payment-btn:hover:not(:disabled) {
          background: #2563eb;
        }
        .payment-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .payment-btn.loading {
          background: #3182f6;
        }
        .btn-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }
        .payment-hint {
          margin-top: 12px;
          font-size: 13px;
          color: #888;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}

/**
 * 금액 포맷팅 헬퍼
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

export default TossPaymentWidget;