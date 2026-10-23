import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth.ts';
import { prisma } from '@/lib/db.ts';
import { maskDocument } from '@/lib/documents.ts';
import { formatEventDate } from '@/lib/events.ts';
import { StatusBadge } from './eventos/ui.tsx';

export const metadata: Metadata = { title: 'Painel do organizador' };

export default async function OrganizerHome({
  searchParams,
}: {
  searchParams: Promise<{ bemvindo?: string; excluido?: string }>;
}) {
  const user = await requireRole('organizer', '/organizador');
  const { bemvindo, excluido } = await searchParams;
  const account = await prisma.organizerAccount.findUnique({ where: { userId: user.id } });

  const events = account
    ? await prisma.event.findMany({
        where: { organizerId: account.id },
        orderBy: { startsAt: 'desc' },
        include: { ticketTypes: { select: { quantitySold: true, quantityTotal: true } } },
      })
    : [];

  const paymentsActive = Boolean(account?.gatewayWalletId);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12">
      {bemvindo && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
          Pronto! Sua conta de organizador foi criada.
        </p>
      )}
      {excluido && (
        <p role="status" className="rounded-xl bg-zinc-100 p-4 text-zinc-700">
          Rascunho excluído.
        </p>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Painel do organizador</h1>
          <p className="mt-1 text-zinc-600">{account?.legalName ?? user.name}</p>
        </div>
        {account && (
          <Link href="/organizador/eventos/novo" className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700">
            + Criar evento
          </Link>
        )}
      </div>

      {!account ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Você tem acesso de administrador, mas ainda não tem conta de organizador.{' '}
          <Link className="font-medium underline" href="/organizador/cadastro">
            Criar agora
          </Link>
          .
        </p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Documento</h2>
            <p className="mt-1 font-mono">{maskDocument(account.document)}</p>
          </article>
          <article className="rounded-xl border border-zinc-200 p-5">
            <h2 className="text-sm font-medium text-zinc-500">Recebimento de vendas</h2>
            {paymentsActive ? (
              <p className="mt-1 font-medium text-emerald-700">Ativo</p>
            ) : (
              <>
                <p className="mt-1 font-medium text-amber-700">Em ativação</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Eventos gratuitos já podem ser publicados. Lotes pagos ficam liberados quando a conta de recebimento for
                  aprovada.
                </p>
              </>
            )}
          </article>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Seus eventos</h2>
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
            Nenhum evento ainda. Clique em <strong>Criar evento</strong> para começar.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
            {events.map((ev) => {
              const sold = ev.ticketTypes.reduce((s, t) => s + t.quantitySold, 0);
              const total = ev.ticketTypes.reduce((s, t) => s + t.quantityTotal, 0);
              return (
                <li key={ev.id}>
                  <Link href={`/organizador/eventos/${ev.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-zinc-50">
                    <div>
                      <p className="font-medium">{ev.title}</p>
                      <p className="text-sm text-zinc-600">{formatEventDate(ev.startsAt, ev.timezone)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="tabular-nums text-zinc-600">
                        {sold}/{total} ingressos
                      </span>
                      <StatusBadge status={ev.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
