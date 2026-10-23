import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth.ts';
import { safeNextPath } from '@/lib/roles.ts';
import { LoginForm } from './login-form.tsx';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-zinc-600">Use seu e-mail para acessar seus ingressos ou organizar eventos.</p>
      </div>
      {params.erro === 'link' && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Esse link expirou ou já foi usado. Peça um novo abaixo.
        </p>
      )}
      <LoginForm next={next} />
    </main>
  );
}
