import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth.ts';
import { hasRole } from '@/lib/roles.ts';

export async function SiteHeader() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <header className="border-b border-zinc-200">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Plataforma de Ingressos
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              {hasRole(user.role, 'admin') && (
                <Link href="/admin" className="hover:underline">
                  Admin
                </Link>
              )}
              {hasRole(user.role, 'organizer') && (
                <Link href="/organizador" className="hover:underline">
                  Painel
                </Link>
              )}
              <Link href="/conta" className="hover:underline">
                Minha conta
              </Link>
              <form action="/auth/sair" method="post">
                <button type="submit" className="text-zinc-500 hover:text-zinc-900">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/entrar" className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700">
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
