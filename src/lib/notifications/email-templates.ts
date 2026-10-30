// 알림 이메일 템플릿 추가

const NOTIFICATION_TEMPLATE = (data: {
  name: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  priority: string;
}) => {
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
};

export { NOTIFICATION_TEMPLATE };