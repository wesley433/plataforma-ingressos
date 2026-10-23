'use server';

import { z } from 'zod';
import { publicEnv } from '@/lib/env.ts';
import { safeNextPath } from '@/lib/roles.ts';
import { createSupabaseServerClient } from '@/lib/supabase/server.ts';

export type LoginState = { status: 'idle' | 'sent' | 'error'; message?: string; email?: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Informe um e-mail válido.'),
  next: z.string().optional(),
});

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: formData.get('email'), next: formData.get('next') ?? undefined });
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'E-mail inválido.' };
  }

  const { email } = parsed.data;
  const next = safeNextPath(parsed.data.next);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${publicEnv.appUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    const tooMany = error.status === 429 || /rate limit/i.test(error.message);
    return {
      status: 'error',
      email,
      message: tooMany
        ? 'Muitos pedidos de link em pouco tempo. Aguarde alguns minutos e tente de novo.'
        : 'Não foi possível enviar o link agora. Tente de novo em instantes.',
    };
  }

  return { status: 'sent', email };
}
