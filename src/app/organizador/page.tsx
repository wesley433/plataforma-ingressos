import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth.ts';
import { prisma } from '@/lib/db.ts';
import { maskDocument } from '@/lib/documents.ts';

export const metadata: Metadata = { title: 'Painel do organizador' };

export default async function OrganizerHome({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const user = await requireRole('organizer', '/organizador');
  const { bemvindo } = await searchParams;
  const account = await prisma.organizerAccount.findUnique({ where: { userId: user.id } });

  const paymentsActive = Boolean(account?.gatewayWalletId);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
      {bemvindo && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
          Pronto! Sua conta de organizador foi criada.
        </p>
      )}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Painel do organizador</h1>
        <p className="mt-1 text-zinc-600">{account?.legalName ?? user.name}</p>
      </div>

      {!account ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          Você tem acesso de administrador, mas ainda não tem conta de organizador.{' '}
          <a className="font-medium underline" href="/organizador/cadastro">
            Criar agora
          </a>
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
                  Você já pode criar eventos gratuitos. Eventos pagos ficam liberados quando a conta de recebimento for
                  aprovada.
                </p>
              </>
            )}
          </article>
        </section>
      )}

      <section className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
        Seus eventos aparecerão aqui. Criação de eventos e lotes chega na próxima etapa.
      </section>
    </main>
  );
}
