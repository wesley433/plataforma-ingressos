import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User as DbUser } from '@prisma/client';
import { prisma } from '@/lib/db.ts';
import { createSupabaseServerClient } from '@/lib/supabase/server.ts';
import { hasRole, type Role } from '@/lib/roles.ts';

/**
 * Usuário logado (validado no Supabase) + registro na tabela users.
 * O trigger do banco cria a linha em users no cadastro; o upsert cobre contas antigas.
 */
export const getCurrentUser = cache(async (): Promise<DbUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || !data.user.email) return null;

  const authUser = data.user;
  const fallbackName = authUser.email!.split('@')[0] ?? 'Participante';
  return prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email: authUser.email!,
      name: (authUser.user_metadata?.name as string | undefined) ?? fallbackName,
    },
  });
});

export async function requireUser(nextPath = '/conta'): Promise<DbUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(nextPath)}`);
  if (user.isBlocked) redirect('/bloqueado');
  return user;
}

export async function requireRole(role: Role, nextPath: string): Promise<DbUser> {
  const user = await requireUser(nextPath);
  if (!hasRole(user.role, role)) {
    redirect(role === 'organizer' ? '/organizador/cadastro' : '/conta');
  }
  return user;
}
