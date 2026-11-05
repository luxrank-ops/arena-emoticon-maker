import { AuthForm } from '@/components/AuthForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <div className="wrap py-12"><AuthForm mode="login" redirectTo={next ?? '/'} /></div>;
}
