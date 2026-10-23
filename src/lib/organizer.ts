import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth.ts';
import { prisma } from '@/lib/db.ts';

/** Organizador logado + sua conta. Admin sem conta é mandado criar uma. */
export async function requireOrganizer(nextPath: string) {
  const user = await requireRole('organizer', nextPath);
  const account = await prisma.organizerAccount.findUnique({ where: { userId: user.id } });
  if (!account) redirect('/organizador/cadastro');
  return { user, account };
}

/** Evento do organizador logado (admin vê qualquer um). 404 para os demais. */
export async function requireOwnedEvent(eventId: string, nextPath: string) {
  const { user, account } = await requireOrganizer(nextPath);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { ticketTypes: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } },
  });
  if (!event || (event.organizerId !== account.id && user.role !== 'admin')) notFound();
  return { user, account, event };
}
