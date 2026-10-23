import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth.ts';
import { prisma } from '@/lib/db.ts';

export const metadata: Metadata = { title: 'Administração' };

export default async function AdminHome() {
  await requireRole('admin', '/admin');

  const [users, organizers, pendingPayments] = await Promise.all([
    prisma.user.count(),
    prisma.organizerAccount.count(),
    prisma.organizerAccount.count({ where: { gatewayWalletId: null } }),
  ]);

  const cards = [
    { label: 'Usuários', value: users },
    { label: 'Organizadores', value: organizers },
    { label: 'Recebimento em ativação', value: pendingPayments },
  ];

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Administração</h1>
      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <article key={c.label} className="rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-medium text-zinc-500">{c.label}</h2>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{c.value}</p>
          </article>
        ))}
      </section>
      <p className="text-sm text-zinc-500">GMV, receita de taxas e moderação chegam com as vendas.</p>
    </main>
  );
}
