import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@arena.ai';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Arena Emoticon Maker';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

interface TemplateData {
  [key: string]: any;
}

/**
 * 이메일 발송
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY가 설정되지 않음 - 이메일 발송 스킵');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('이메일 발송 실패:', error);
      return false;
    }

    console.log('이메일 발송 성공:', data?.id);
    return true;
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    return false;
  }
}

/**
 * 템플릿 렌더링 (간단한 변수 치환)
 */
function renderTemplate(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * 이메일 템플릿들
 */
const TEMPLATES = {
  // 환영 이메일
  welcome: (data: TemplateData) => ({
    subject: 'Arena Emoticon Maker에 오신 것을 환영합니다! 🎨',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎨 Arena Emoticon Maker</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">나만의 이모티콘 제작을 시작하세요!</p>
  </div>
  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <h2 style="color: #1e293b; margin-top: 0;">${data.name || '사용자'}님, 환영합니다! 👋</h2>
    <p style="color: #475569; font-size: 16px;">Arena Emoticon Maker에 가입해 주셔서 감사합니다. 이제 AI로 나만의 캐릭터 이모티콘을 만들 수 있습니다.</p>
    
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <p style="margin: 0 0 12px; color: #64748b;">가입 축하 선물로 <strong style="color: #6366f1; font-size: 18px;">10 크레딧</strong>을 드렸어요!</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">지금 시작하기 →</a>
    </div>

    <h3 style="color: #1e293b; margin: 32px 0 16px;">시작 가이드</h3>
    <ul style="color: #475569; padding-left: 20px;">
      <li style="margin: 8px 0;">캐릭터 이름과 컨셉을 입력하세요</li>
      <li style="margin: 8px 0;">표현하고 싶은 감정을 선택하세요</li>
      <li style="margin: 8px 0;">말풍선 대사를 적어보세요</li>
      <li style="margin: 8px 0;">AI가 최적의 프롬프트를 만들고 이미지를 생성합니다</li>
    </ul>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <p style="color: #64748b; font-size: 14px; margin: 0;">궁금한 점이 있으시면 언제든 <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact" style="color: #6366f1;">문의해 주세요</a>.</p>
    </div>
  </div>
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    © 2024 Arena AI. All rights reserved.
  </div>
</body>
</html>
`,
  }),

  // 생성 완료 알림
  generationComplete: (data: TemplateData) => ({
    subject: '이모티콘 생성이 완료되었습니다! ✨',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✨ 생성 완료!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">이모티콘이 준비되었습니다</p>
  </div>
  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <p style="color: #475569; font-size: 16px;">${data.characterName || '캐릭터'}의 <strong>${data.emotion || '이모티콘'}</strong> 생성이 완료되었습니다.</p>
    
    ${data.imageUrl ? `
    <div style="text-align: center; margin: 24px 0;">
      <img src="${data.imageUrl}" alt="생성된 이모티콘" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    </div>
    ` : ''}

    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.dashboardUrl || process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">대시보드에서 확인하기 →</a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">사용된 크레딧: <strong>${data.creditsUsed || 1}개</strong> | 남은 크레딧: <strong>${data.remainingCredits || 0}개</strong></p>
  </div>
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    © 2024 Arena AI. All rights reserved.
  </div>
</body>
</html>
`,
  }),

  // 결제 영수증
  paymentReceipt: (data: TemplateData) => ({
    subject: '결제 영수증 - Arena Emoticon Maker 💰',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">💰 결제 완료</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">영수증 번호: ${data.receiptNumber || 'N/A'}</p>
  </div>
  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr><td style="padding: 8px 0; color: #64748b;">상품</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.planName || '크레딧 팩'}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">금액</td><td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 18px; color: #1e293b;">${data.amount || '₩0'}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">지급 크레딧</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #6366f1;">${data.credits || 0}개</td></tr>
      <tr style="border-top: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b;">결제일시</td><td style="padding: 8px 0; text-align: right;">${data.paidAt || new Date().toLocaleString('ko-KR')}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b;">결제 수단</td><td style="padding: 8px 0; text-align: right;">${data.paymentMethod || '카드'}</td></tr>
    </table>

    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; color: #475569;">세금계산서가 필요하시면 <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="color: #6366f1;">설정 페이지</a>에서 사업자 정보를 등록해 주세요.</p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">크레딧 현황 보기 →</a>
    </div>
  </div>
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    © 2024 Arena AI. All rights reserved.
  </div>
</body>
</html>
`,
  }),

  // 구독 갱신 알림
  subscriptionRenewal: (data: TemplateData) => ({
    subject: '구독이 갱신되었습니다 🔄',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔄 구독 갱신 완료</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">${data.planName || 'Pro'} 플랜이 갱신되었습니다</p>
  </div>
  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <p style="color: #475569; font-size: 16px;">구독이 성공적으로 갱신되었습니다. 이번 달에도 무제한 이모티콘 생성을 즐겨보세요!</p>
    
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <p style="margin: 0 0 8px; color: #64748b;">플랜: <strong style="color: #8b5cf6;">${data.planName || 'Pro'}</strong></p>
      <p style="margin: 0 0 8px; color: #64748b;">월 크레딧: <strong>${data.monthlyCredits || 500}개</strong> 지급 완료</p>
      <p style="margin: 0; color: #64748b;">다음 결제일: <strong>${data.nextBillingDate || '다음 달 동일 날짜'}</strong></p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; background: #8b5cf6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">대시보드 이동 →</a>
    </div>
  </div>
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    © 2024 Arena AI. All rights reserved.
  </div>
</body>
</html>
`,
  }),

  // 구독 해지 확인
  subscriptionCancelled: (data: TemplateData) => ({
    subject: '구독이 해지되었습니다 😢',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #f87171 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">😢 구독 해지 완료</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">${data.planName || 'Pro'} 플랜이 해지되었습니다</p>
  </div>
  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <p style="color: #475569; font-size: 16px;">구독이 해지되었습니다. 만료일까지는 계속 혜택을 이용하실 수 있습니다.</p>
    
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <p style="margin: 0 0 8px; color: #991b1b;">만료일: <strong>${data.expiresAt || '다음 결제일'}</strong></p>
      <p style="margin: 0; color: #991b1b;">이후 FREE 플랜으로 전환되며, 보유 크레딧은 계속 사용 가능합니다.</p>
    </div>

    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">다시 구독하기 →</a>
    </div>

    <p style="color: #64748b; font-size: 14px; text-align: center;">더 나은 서비스를 위해 피드백을 <a href="${process.env.NEXT_PUBLIC_APP_URL}/feedback" style="color: #6366f1;">남겨주세요</a>.</p>
  </div>
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    © 2024 Arena AI. All rights reserved.
  </div>
</body>
</html>
`,
  }),

  // 크레딧 부족 알림
  lowCredits: (data: TemplateData) => ({
    subject: '크레딧이 부족합니다 ⚡',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⚡ 크레딧 부족 알림</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">남은 크레딧: <strong>${data.remainingCredits || 0}개</strong></p>
  </div>
  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <p style="color: #475569; font-size: 16px;">이모티콘 생성을 계속하려면 크레딧을 충전해 주세요.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/credits" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">크레딧 충전하기 →</a>
    </div>

    <p style="color: #64748b; font-size: 14px; text-align: center;">구독 플랜으로 업그레이드하면 매월 자동으로 크레딧이 충전됩니다.</p>
  </div>
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    © 2024 Arena AI. All rights reserved.
  </div>
</body>
</html>
`,
  }),

  // 비밀번호 재설정
  passwordReset: (data: TemplateData) => ({
    subject: '비밀번호 재설정 링크 🔐',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔐 비밀번호 재설정</h1>
  </div>
  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <p style="color: #475569; font-size: 16px;">비밀번호 재설정을 요청하셨습니다. 아래 버튼을 클릭해 새 비밀번호를 설정하세요.</p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">비밀번호 재설정 →</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">이 링크는 1시간 후 만료됩니다. 본인이 요청하지 않았다면 이 이메일을 무시하세요.</p>
  </div>
  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    © 2024 Arena AI. All rights reserved.
  </div>
</body>
</html>
`,
  }),

  // 알림 이메일
  notification: (data: TemplateData) => {
    const priorityColors: Record<string, string> = {
      low: '#64748b',
      normal: '#6366f1',
      high: '#f59e0b',
      urgent: '#ef4444',
    };
    const color = priorityColors[data.priority] || '#6366f1';

    return {
      subject: `[Arena] ${data.title}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${data.title}</h1>
  </div>
  <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
    <p style="color: #475569; font-size: 16px;">안녕하세요, ${data.name}님!</p>
    <p style="color: #475569; font-size: 16px; white-space: pre-line;">${data.message}</p>
    
    ${data.actionUrl && data.actionLabel ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.actionUrl}" style="display: inline-block; background: ${color}; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">${data.actionLabel} →</a>
    </div>
    ` : ''}

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
    <p style="color: #94a3b8; font-size: 12px; text-align: center;">
      이 메일은 Arena Emoticon Maker에서 발송되었습니다.<br>
      수신을 원치 않으시면 <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="color: #6366f1;">설정</a>에서 변경하실 수 있습니다.
    </p>
  </div>
</body>
</html>
`,
    };
  },
};

/**
 * 템플릿 이메일 발송
 */
export async function sendTemplateEmail(
  templateName: keyof typeof TEMPLATES,
  to: string | string[],
  data: TemplateData,
  options?: Partial<EmailOptions>
): Promise<boolean> {
  const template = TEMPLATES[templateName];
  if (!template) {
    console.error(`템플릿을 찾을 수 없음: ${templateName}`);
    return false;
  }

  const rendered = template(data);
  return sendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    ...options,
  });
}

/**
 * 배치 이메일 발송 (뉴스레터 등)
 */
export async function sendBatchEmails(
  templateName: keyof typeof TEMPLATES,
  recipients: Array<{ email: string; data: TemplateData }>,
  options?: Partial<EmailOptions>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendTemplateEmail(templateName, recipient.email, recipient.data, options);
    if (result) success++;
    else failed++;
    
    // 레이트 리밋 회피
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { success, failed };
}