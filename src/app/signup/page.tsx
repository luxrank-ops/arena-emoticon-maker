import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { getCurrentUser } from '@/lib/session';

/** 로그인한 사람에게는 가입 화면 대신 홈을 보여 준다. */
export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user.isAuthenticated) redirect('/');
  return <div className="wrap py-12"><AuthForm mode="signup" /></div>;
}
