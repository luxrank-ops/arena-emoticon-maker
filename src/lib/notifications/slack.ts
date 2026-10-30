interface SlackMessage {
  text?: string;
  blocks?: any[];
  attachments?: any[];
  channel?: string;
  username?: string;
  icon_emoji?: string;
}

interface SlackWebhookPayload {
  url: string;
  message: SlackMessage;
}

const DEFAULT_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';
const ALERTS_WEBHOOK_URL = process.env.SLACK_ALERTS_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
const DEPLOY_WEBHOOK_URL = process.env.SLACK_DEPLOY_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
const PAYMENT_WEBHOOK_URL = process.env.SLACK_PAYMENT_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

/**
 * Slack 웹훅으로 메시지 전송
 */
export async function sendSlackMessage(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      console.error('Slack 웹훅 전송 실패:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Slack 전송 오류:', error);
    return false;
  }
}

/**
 * 알림 채널로 메시지 전송 (기본 웹훅)
 */
export async function sendAlert(message: SlackMessage): Promise<boolean> {
  return sendSlackMessage(ALERTS_WEBHOOK_URL, message);
}

/**
 * 배포 알림 전송
 */
export async function sendDeployNotification(message: SlackMessage): Promise<boolean> {
  return sendSlackMessage(DEPLOY_WEBHOOK_URL, message);
}

/**
 * 결제 알림 전송
 */
export async function sendPaymentNotification(message: SlackMessage): Promise<boolean> {
  return sendSlackMessage(PAYMENT_WEBHOOK_URL, message);
}

/**
 * 에러 알림 블록 생성
 */
export function createErrorBlocks(
  title: string,
  error: Error | string,
  context?: Record<string, any>,
  severity: 'warning' | 'critical' = 'critical'
): any[] {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  const color = severity === 'critical' ? '#ff0000' : '#ffa500';
  const emoji = severity === 'critical' ? '🚨' : '⚠️';

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*메시지:*\n\`\`\`${errorMessage.slice(0, 3000)}\`\`\``,
        },
        {
          type: 'mrkdwn',
          text: `*심각도:*\n${severity.toUpperCase()}`,
        },
      ],
    },
    ...(context
      ? [
          {
            type: 'section',
            fields: Object.entries(context).map(([key, value]) => ({
              type: 'mrkdwn',
              text: `*${key}:*\n\`${String(value).slice(0, 1000)}\``,
            })),
          },
        ]
      : []),
    ...(errorStack
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*스택 트레이스:*\n\`\`\`${errorStack.slice(0, 3000)}\`\`\``,
            },
          },
        ]
      : []),
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `환경: ${process.env.NODE_ENV} | 시간: ${new Date().toISOString()}`,
        },
      ],
    },
  ];
}

/**
 * 결제 성공 알림 블록
 */
export function createPaymentSuccessBlocks(data: {
  userId: string;
  userEmail: string;
  userName: string | null;
  plan: string;
  amount: number;
  currency: string;
  credits: number;
  isSubscription: boolean;
}): any[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '💰 새 결제 발생',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*사용자:*\n${data.userName || '익명'} (${data.userEmail})` },
        { type: 'mrkdwn', text: `*플랜:*\n${data.plan}` },
        { type: 'mrkdwn', text: `*금액:*\n${formatCurrency(data.amount, data.currency)}` },
        { type: 'mrkdwn', text: `*크레딧:*\n${data.credits}개` },
        { type: 'mrkdwn', text: `*타입:*\n${data.isSubscription ? '구독 갱신' : '일회성 구매'}` },
        { type: 'mrkdwn', text: `*User ID:*\n\`${data.userId}\`` },
      ],
    },
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `시간: ${new Date().toLocaleString('ko-KR')}` },
      ],
    },
  ];
}

/**
 * 배포 알림 블록
 */
export function createDeployBlocks(data: {
  version: string;
  environment: string;
  commit: string;
  author: string;
  url?: string;
  status: 'success' | 'failed' | 'started';
}): any[] {
  const statusEmoji = { success: '✅', failed: '❌', started: '🚀' };
  const statusText = { success: '배포 성공', failed: '배포 실패', started: '배포 시작' };

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusEmoji[data.status]} ${statusText[data.status]}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*버전:*\n${data.version}` },
        { type: 'mrkdwn', text: `*환경:*\n${data.environment}` },
        { type: 'mrkdwn', text: `*커밋:*\n\`${data.commit.slice(0, 8)}\`` },
        { type: 'mrkdwn', text: `*작성자:*\n${data.author}` },
      ],
    },
    ...(data.url
      ? [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '배포 보기', emoji: true },
                url: data.url,
                style: data.status === 'success' ? 'primary' : 'danger',
              },
            ],
          },
        ]
      : []),
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `시간: ${new Date().toLocaleString('ko-KR')}` }],
    },
  ];
}

/**
 * 신규 가입 알림 블록
 */
export function createSignupBlocks(data: {
  userId: string;
  email: string;
  name: string | null;
  source: string;
}): any[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: '👋 신규 가입자', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*이름:*\n${data.name || '익명'}` },
        { type: 'mrkdwn', text: `*이메일:*\n${data.email}` },
        { type: 'mrkdwn', text: `*유입 경로:*\n${data.source}` },
        { type: 'mrkdwn', text: `*User ID:*\n\`${data.userId}\`` },
      ],
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `시간: ${new Date().toLocaleString('ko-KR')}` }],
    },
  ];
}

/**
 * 구독 해지 알림 블록
 */
export function createCancellationBlocks(data: {
  userId: string;
  email: string;
  name: string | null;
  plan: string;
  reason?: string;
}): any[] {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: '😢 구독 해지', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*사용자:*\n${data.name || '익명'} (${data.email})` },
        { type: 'mrkdwn', text: `*플랜:*\n${data.plan}` },
        { type: 'mrkdwn', text: `*사유:*\n${data.reason || '미입력'}` },
        { type: 'mrkdwn', text: `*User ID:*\n\`${data.userId}\`` },
      ],
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `시간: ${new Date().toLocaleString('ko-KR')}` }],
    },
  ];
}

/**
 * 일일/주간 리포트 블록
 */
export function createReportBlocks(data: {
  period: 'daily' | 'weekly' | 'monthly';
  metrics: Record<string, number | string>;
  highlights?: string[];
}): any[] {
  const periodLabels = { daily: '일일', weekly: '주간', monthly: '월간' };

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📊 ${periodLabels[data.period]} 리포트`, emoji: true },
    },
    {
      type: 'section',
      fields: Object.entries(data.metrics).map(([key, value]) => ({
        type: 'mrkdwn',
        text: `*${key}:*\n${value}`,
      })),
    },
    ...(data.highlights && data.highlights.length > 0
      ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*주요 하이라이트:*\n${data.highlights.map(h => `• ${h}`).join('\n')}`,
            },
          },
        ]
      : []),
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `생성 시간: ${new Date().toLocaleString('ko-KR')}` }],
    },
  ];
}

/**
 * 헬퍼: 금액 포맷팅
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * 즉시 알림 전송 헬퍼들
 */
export const notify = {
  error: async (title: string, error: Error | string, context?: Record<string, any>, severity?: 'warning' | 'critical') => {
    const blocks = createErrorBlocks(title, error, context, severity);
    return sendAlert({ blocks });
  },

  payment: async (data: Parameters<typeof createPaymentSuccessBlocks>[0]) => {
    const blocks = createPaymentSuccessBlocks(data);
    return sendPaymentNotification({ blocks });
  },

  deploy: async (data: Parameters<typeof createDeployBlocks>[0]) => {
    const blocks = createDeployBlocks(data);
    return sendDeployNotification({ blocks });
  },

  signup: async (data: Parameters<typeof createSignupBlocks>[0]) => {
    const blocks = createSignupBlocks(data);
    return sendAlert({ blocks });
  },

  cancellation: async (data: Parameters<typeof createCancellationBlocks>[0]) => {
    const blocks = createCancellationBlocks(data);
    return sendAlert({ blocks });
  },

  report: async (data: Parameters<typeof createReportBlocks>[0]) => {
    const blocks = createReportBlocks(data);
    return sendAlert({ blocks });
  },

  custom: async (blocks: any[]) => {
    return sendAlert({ blocks });
  },
};