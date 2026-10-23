import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth.ts';
import { hasRole } from '@/lib/roles.ts';

export const metadata: Metadata = { title: 'Minha conta' };

const ROLE_LABEL = { participant: 'Participante', organizer: 'Organizador', admin: 'Administrador' } as const;

export default async function AccountPage() {
  const user = await requireUser('/conta');

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Olá, {user.name}</h1>
        <p className="mt-1 text-zinc-600">
          {user.email} · {ROLE_LABEL[user.role]}
        </p>
      </div>

      <section className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
        Seus ingressos aparecerão aqui.
      </section>

      {hasRole(user.role, 'organizer') ? (
        <Link href="/organizador" className="font-medium text-brand-700 underline">
          Ir para o painel do organizador
        </Link>
      ) : (
        <section className="flex flex-col items-start gap-3 rounded-xl bg-brand-50 p-6">
          <h2 className="text-lg font-semibold">Quer vender ingressos?</h2>
          <p className="text-zinc-700">Crie eventos gratuitos sem custo ou pagos com taxa de 5%.</p>
          <Link
            href="/organizador/cadastro"
            className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Quero organizar eventos
          </Link>
        </section>
      )}
    </main>
  );
}
