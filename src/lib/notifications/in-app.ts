import prisma from '@/lib/prisma';

export type NotificationType =
  | 'GENERATION_COMPLETE'
  | 'GENERATION_FAILED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'SUBSCRIPTION_EXPIRING'
  | 'LOW_CREDITS'
  | 'CREDITS_GRANTED'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'PROMOTION'
  | 'SECURITY_ALERT';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
}

export interface CreateNotificationOptions extends NotificationData {
  sendEmail?: boolean;
  sendPush?: boolean;
}

/**
 * 인앱 알림 생성
 */
export async function createNotification(options: CreateNotificationOptions): Promise<string | null> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        priority: options.priority || 'normal',
        data: options.data || {},
        actionUrl: options.actionUrl,
        actionLabel: options.actionLabel,
        expiresAt: options.expiresAt,
        read: false,
      },
    });

    // 실시간 알림 전송 (WebSocket/SSE)
    await sendRealTimeNotification(options.userId, {
      id: notification.id,
      type: options.type,
      title: options.title,
      message: options.message,
      priority: options.priority || 'normal',
      data: options.data,
      actionUrl: options.actionUrl,
      actionLabel: options.actionLabel,
      createdAt: notification.createdAt,
    });

    // 이메일 발송 옵션
    if (options.sendEmail) {
      await sendNotificationEmail(options.userId, options);
    }

    // 푸시 알림 옵션
    if (options.sendPush) {
      await sendPushNotification(options.userId, options);
    }

    return notification.id;
  } catch (error) {
    console.error('알림 생성 실패:', error);
    return null;
  }
}

/**
 * 대량 알림 생성 (관리자 공지 등)
 */
export async function createBulkNotifications(
  userIds: string[],
  notification: Omit<NotificationData, 'userId'>
): Promise<number> {
  try {
    const notifications = userIds.map(userId => ({
      ...notification,
      userId,
    }));

    await prisma.notification.createMany({
      data: notifications,
      skipDuplicates: true,
    });

    // 실시간 전송
    for (const userId of userIds) {
      await sendRealTimeNotification(userId, {
        ...notification,
        userId,
      });
    }

    return userIds.length;
  } catch (error) {
    console.error('대량 알림 생성 실패:', error);
    return 0;
  }
}

/**
 * 알림 읽음 처리
 */
export async function markAsRead(notificationId: string, userId: string): Promise<boolean> {
  try {
    await prisma.notification.update({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
    return true;
  } catch (error) {
    console.error('알림 읽음 처리 실패:', error);
    return false;
  }
}

/**
 * 전체 읽음 처리
 */
export async function markAllAsRead(userId: string): Promise<number> {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return result.count;
  } catch (error) {
    console.error('전체 읽음 처리 실패:', error);
    return 0;
  }
}

/**
 * 알림 삭제
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  try {
    await prisma.notification.delete({
      where: { id: notificationId, userId },
    });
    return true;
  } catch (error) {
    console.error('알림 삭제 실패:', error);
    return false;
  }
}

/**
 * 사용자 알림 목록 조회
 */
export async function getUserNotifications(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  } = {}
): Promise<{
  notifications: any[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  unreadCount: number;
}> {
  const { page = 1, limit = 20, unreadOnly = false, type } = options;
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (unreadOnly) where.read = false;
  if (type) where.type = type;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    unreadCount,
  };
}

/**
 * 만료된 알림 정리
 */
export async function cleanupExpiredNotifications(): Promise<number> {
  try {
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  } catch (error) {
    console.error('만료 알림 정리 실패:', error);
    return 0;
  }
}

/**
 * 실시간 알림 전송 (Server-Sent Events / WebSocket)
 * 실제 구현에서는 별도 SSE 엔드포인트 또는 WebSocket 서버 필요
 */
async function sendRealTimeNotification(
  userId: string,
  notification: any
): Promise<void> {
  // TODO: SSE 연결된 클라이언트에게 전송
  // 현재는 콘솔 로그만
  console.log(`[Real-time] 사용자 ${userId}에게 알림 전송:`, notification.title);
}

/**
 * 알림 이메일 발송
 */
async function sendNotificationEmail(userId: string, notification: NotificationData): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, emailNotifications: true },
    });

    if (!user?.email || !user.emailNotifications) return;

    const { sendTemplateEmail } = await import('./email');
    await sendTemplateEmail('notification', user.email, {
      name: user.name || '사용자',
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      actionLabel: notification.actionLabel,
    });
  } catch (error) {
    console.error('알림 이메일 발송 실패:', error);
  }
}

/**
 * 푸시 알림 발송 (Web Push)
 */
async function sendPushNotification(userId: string, notification: NotificationData): Promise<void> {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const webPush = await import('web-push');
    webPush.setVapidDetails(
      'mailto:admin@arena.ai',
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        url: notification.actionUrl,
        ...notification.data,
      },
      actions: notification.actionLabel ? [{ action: 'view', title: notification.actionLabel }] : [],
    });

    await Promise.all(
      subscriptions.map((sub: { endpoint: string; keys: any; id: string }) =>
        webPush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        ).catch(err => {
          if (err.statusCode === 410) {
            // 구독 만료 - 삭제
            prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        })
      )
    );
  } catch (error) {
    console.error('푸시 알림 발송 실패:', error);
  }
}

/**
 * 편의 함수들
 */
export const notify = {
  generationComplete: (userId: string, data: { characterName: string; emotion: string; imageUrl?: string; creditsUsed: number; remainingCredits: number; generationId: string }) =>
    createNotification({
      userId,
      type: 'GENERATION_COMPLETE',
      title: '이모티콘 생성 완료! ✨',
      message: `${data.characterName}의 ${data.emotion} 이모티콘이 준비되었습니다.`,
      priority: 'normal',
      data: { generationId: data.generationId, imageUrl: data.imageUrl },
      actionUrl: `/dashboard/history?generation=${data.generationId}`,
      actionLabel: '결과 보기',
      sendEmail: true,
    }),

  generationFailed: (userId: string, data: { characterName: string; error: string; creditsRefunded: number; generationId: string }) =>
    createNotification({
      userId,
      type: 'GENERATION_FAILED',
      title: '이모티콘 생성 실패 😢',
      message: `${data.characterName} 생성 중 오류가 발생했습니다. 크레딧 ${data.creditsRefunded}개가 환불되었습니다.`,
      priority: 'high',
      data: { generationId: data.generationId, error: data.error },
      actionUrl: `/dashboard/history?generation=${data.generationId}`,
      actionLabel: '다시 시도',
      sendEmail: true,
    }),

  paymentSuccess: (userId: string, data: { plan: string; amount: number; credits: number; receiptNumber: string }) =>
    createNotification({
      userId,
      type: 'PAYMENT_SUCCESS',
      title: '결제 완료! 💰',
      message: `${data.plan} 결제가 완료되었습니다. ${data.credits} 크레딧이 지급되었습니다.`,
      priority: 'normal',
      data: { amount: data.amount, credits: data.credits, receiptNumber: data.receiptNumber },
      actionUrl: '/dashboard/credits',
      actionLabel: '영수증 보기',
      sendEmail: true,
    }),

  paymentFailed: (userId: string, data: { plan: string; error: string }) =>
    createNotification({
      userId,
      type: 'PAYMENT_FAILED',
      title: '결제 실패 ❌',
      message: `${data.plan} 결제 중 오류가 발생했습니다: ${data.error}`,
      priority: 'high',
      data: { error: data.error },
      actionUrl: '/dashboard/credits',
      actionLabel: '다시 결제',
      sendEmail: true,
    }),

  subscriptionRenewed: (userId: string, data: { plan: string; monthlyCredits: number; nextBillingDate: string }) =>
    createNotification({
      userId,
      type: 'SUBSCRIPTION_RENEWED',
      title: '구독 갱신 완료 🔄',
      message: `${data.plan} 플랜이 갱신되었습니다. 매월 ${data.monthlyCredits} 크레딧이 지급됩니다.`,
      priority: 'normal',
      data: { plan: data.plan, monthlyCredits: data.monthlyCredits },
      actionUrl: '/dashboard',
      actionLabel: '대시보드 보기',
      sendEmail: true,
    }),

  subscriptionCancelled: (userId: string, data: { plan: string; expiresAt: string; reason?: string }) =>
    createNotification({
      userId,
      type: 'SUBSCRIPTION_CANCELLED',
      title: '구독 해지 완료 😢',
      message: `${data.plan} 플랜이 해지되었습니다. ${data.expiresAt}까지 혜택을 이용하실 수 있습니다.`,
      priority: 'normal',
      data: { plan: data.plan, expiresAt: data.expiresAt, reason: data.reason },
      actionUrl: '/dashboard/credits',
      actionLabel: '다시 구독',
      sendEmail: true,
    }),

  lowCredits: (userId: string, data: { remainingCredits: number }) =>
    createNotification({
      userId,
      type: 'LOW_CREDITS',
      title: '크레딧 부족 ⚡',
      message: `남은 크레딧이 ${data.remainingCredits}개입니다. 충전이 필요합니다.`,
      priority: 'high',
      data: { remainingCredits: data.remainingCredits },
      actionUrl: '/dashboard/credits',
      actionLabel: '충전하기',
      sendEmail: true,
      sendPush: true,
    }),

  creditsGranted: (userId: string, data: { amount: number; reason: string }) =>
    createNotification({
      userId,
      type: 'CREDITS_GRANTED',
      title: '크레딧 지급 완료! 🎁',
      message: `${data.reason}로 ${data.amount} 크레딧이 지급되었습니다.`,
      priority: 'normal',
      data: { amount: data.amount, reason: data.reason },
      actionUrl: '/dashboard/credits',
      actionLabel: '확인하기',
    }),

  systemAnnouncement: (userId: string, data: { title: string; message: string; actionUrl?: string; actionLabel?: string }) =>
    createNotification({
      userId,
      type: 'SYSTEM_ANNOUNCEMENT',
      title: data.title,
      message: data.message,
      priority: 'normal',
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
      sendEmail: false,
    }),

  securityAlert: (userId: string, data: { action: string; ip: string; location?: string; timestamp: string }) =>
    createNotification({
      userId,
      type: 'SECURITY_ALERT',
      title: '보안 알림 🔒',
      message: `새로운 ${data.action}이 감지되었습니다. (IP: ${data.ip}${data.location ? `, 위치: ${data.location}` : ''})`,
      priority: 'urgent',
      data: { action: data.action, ip: data.ip, location: data.location, timestamp: data.timestamp },
      actionUrl: '/dashboard/settings?tab=security',
      actionLabel: '보안 설정 확인',
      sendEmail: true,
      sendPush: true,
    }),
};