'use client';

import { useState, useTransition } from 'react';
import { deleteEvent, setEventPublished, type FormState } from './actions.ts';
import { FormMessage } from './ui.tsx';

export function PublishControls({
  eventId,
  status,
  publicPath,
  problems,
}: {
  eventId: string;
  status: string;
  publicPath: string;
  problems: string[];
}) {
  const [state, setState] = useState<FormState>({ status: 'idle' });
  const [pending, startTransition] = useTransition();
  const published = status === 'published';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href={publicPath} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50">
          {published ? 'Ver página pública' : 'Pré-visualizar'}
        </a>
        {status !== 'blocked' && (
          <button
            type="button"
            disabled={pending || (!published && problems.length > 0)}
            onClick={() => startTransition(async () => setState(await setEventPublished(eventId, !published)))}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              published ? 'border border-zinc-300 hover:bg-zinc-50' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {pending ? 'Aguarde…' : published ? 'Despublicar' : 'Publicar evento'}
          </button>
        )}
        {status === 'draft' && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm('Excluir este rascunho? Não dá para desfazer.')) {
                startTransition(async () => {
                  await deleteEvent(eventId);
                });
              }
            }}
            className="rounded-lg px-4 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            Excluir rascunho
          </button>
        )}
      </div>
      {!published && problems.length > 0 && (
        <ul className="list-disc rounded-lg bg-amber-50 py-3 pr-3 pl-8 text-sm text-amber-900">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <FormMessage status={state.status} message={state.message} />
    </div>
  );
}
