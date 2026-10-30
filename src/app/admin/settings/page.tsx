import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminSettingsClient from '@/components/admin/AdminSettingsClient';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return null; // 레이아웃에서 리다이렉트 처리
  }

  return <AdminSettingsClient />;
}