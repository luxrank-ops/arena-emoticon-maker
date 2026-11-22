import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { getCurrentUser } from '@/lib/session';

/**
 * 이미 로그인한 사람이 로그인 화면에 들어오면 로그인 창을 먼저 보여 주지 않고
 * 원래 가려던 화면(없으면 홈)으로 바로 보낸다. 앱을 다시 열었을 때 홈이 첫 화면이 되게 하는 장치.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const user = await getCurrentUser();
  if (user.isAuthenticated) redirect(target);
  return <div className="wrap py-12"><AuthForm mode="login" redirectTo={target} /></div>;
}
