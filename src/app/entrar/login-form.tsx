'use client';

import { useActionState } from 'react';
import { sendMagicLink, type LoginState } from './actions.ts';

const initial: LoginState = { status: 'idle' };

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === 'sent') {
    return (
      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
        <p className="font-semibold">Link enviado para {state.email}</p>
        <p className="mt-1 text-sm">
          Abra o e-mail e clique em <strong>Entrar</strong>. O link vale por 1 hora. Confira também a caixa de spam.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">E-mail</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.email}
          placeholder="voce@exemplo.com"
          className="rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? 'Enviando…' : 'Receber link de acesso'}
      </button>
      <p className="text-xs text-zinc-500">Sem senha: enviamos um link de acesso para o seu e-mail.</p>
    </form>
  );
}
