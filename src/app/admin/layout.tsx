import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminLayout from '@/components/admin/AdminLayout';

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <AdminLayout>{children}</AdminLayout>;
}