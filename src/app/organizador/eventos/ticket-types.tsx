'use client';

import { useActionState, useState, useTransition } from 'react';
import { AVAILABILITY_LABEL, availability, buyerUnitPriceCents, type Availability } from '@/lib/events.ts';
import { formatBRL } from '@/lib/money.ts';
import { deleteTicketType, saveTicketType, type FormState } from './actions.ts';
import { Field, FormMessage, inputCls } from './ui.tsx';

export interface TicketTypeRow {
  id: string;
  name: string;
  description: string | null;
  kind: 'free' | 'paid';
  priceCents: number;
  quantityTotal: number;
  quantitySold: number;
  quantityReserved: number;
  maxPerOrder: number;
  salesStartAt: string | null; // ISO
  salesEndAt: string | null; // ISO
  salesStartLocal: string;
  salesEndLocal: string;
  isHidden: boolean;
}

const initial: FormState = { status: 'idle' };

function priceInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function TicketTypeForm({
  eventId,
  lot,
  onDone,
}: {
  eventId: string;
  lot: TicketTypeRow | null;
  onDone: () => void;
}) {
  const action = saveTicketType.bind(null, eventId, lot?.id ?? null);
  const [state, formAction, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const out = await action(prev, fd);
    if (out.status === 'saved') onDone();
    return out;
  }, initial);
  const [kind, setKind] = useState<'free' | 'paid'>(lot?.kind ?? 'free');
  const e = state.fieldErrors ?? {};
  const id = (n: string) => `${lot?.id ?? 'novo'}-${n}`;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nome do lote" htmlFor={id('name')} error={e.name} className="sm:col-span-2">
          <input id={id('name')} name="name" defaultValue={lot?.name} placeholder="1º lote, VIP, Meia-entrada…" required className={inputCls} />
        </Field>
        <Field label="Tipo" htmlFor={id('kind')}>
          <select id={id('kind')} name="kind" value={kind} onChange={(ev) => setKind(ev.currentTarget.value as 'free' | 'paid')} className={inputCls}>
            <option value="free">Gratuito</option>
            <option value="paid">Pago</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {kind === 'paid' && (
          <Field label="Preço (R$)" htmlFor={id('price')} error={e.price}>
            <input id={id('price')} name="price" defaultValue={lot?.kind === 'paid' ? priceInput(lot.priceCents) : ''} inputMode="decimal" placeholder="50,00" required className={inputCls} />
          </Field>
        )}
        <Field label="Quantidade" htmlFor={id('quantityTotal')} error={e.quantityTotal}>
          <input id={id('quantityTotal')} name="quantityTotal" type="number" min={1} defaultValue={lot?.quantityTotal ?? 100} required className={inputCls} />
        </Field>
        <Field label="Máx. por pedido" htmlFor={id('maxPerOrder')} error={e.maxPerOrder}>
          <input id={id('maxPerOrder')} name="maxPerOrder" type="number" min={1} max={50} defaultValue={lot?.maxPerOrder ?? 10} className={inputCls} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início das vendas (opcional)" htmlFor={id('salesStartLocal')} error={e.salesStartLocal}>
          <input id={id('salesStartLocal')} name="salesStartLocal" type="datetime-local" defaultValue={lot?.salesStartLocal} className={inputCls} />
        </Field>
        <Field label="Fim das vendas (opcional)" htmlFor={id('salesEndLocal')} error={e.salesEndLocal}>
          <input id={id('salesEndLocal')} name="salesEndLocal" type="datetime-local" defaultValue={lot?.salesEndLocal} className={inputCls} />
        </Field>
      </div>
      <Field label="Descrição curta (opcional)" htmlFor={id('description')} error={e.description}>
        <input id={id('description')} name="description" defaultValue={lot?.description ?? ''} maxLength={300} className={inputCls} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isHidden" defaultChecked={lot?.isHidden} /> Ocultar da página pública
      </label>
      <FormMessage status={state.status === 'saved' ? 'idle' : state.status} message={state.message} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {pending ? 'Salvando…' : lot ? 'Salvar lote' : 'Criar lote'}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-4 py-2 text-sm hover:bg-zinc-200">
          Cancelar
        </button>
      </div>
    </form>
  );
}

const AVAIL_CLS: Record<Availability, string> = {
  on_sale: 'text-emerald-700',
  sold_out: 'text-red-700',
  not_started: 'text-amber-700',
  ended: 'text-zinc-500',
  hidden: 'text-zinc-500',
};

export function TicketTypesManager({
  eventId,
  feeMode,
  lots,
}: {
  eventId: string;
  feeMode: 'pass_to_buyer' | 'absorb';
  lots: TicketTypeRow[];
}) {
  const [editing, setEditing] = useState<string | 'new' | null>(lots.length === 0 ? 'new' : null);
  const [message, setMessage] = useState<FormState>(initial);
  const [pending, startTransition] = useTransition();
  const now = new Date();

  function remove(lot: TicketTypeRow) {
    if (!window.confirm(`Excluir o lote "${lot.name}"?`)) return;
    startTransition(async () => setMessage(await deleteTicketType(eventId, lot.id)));
  }

  return (
    <div className="flex flex-col gap-3">
      <FormMessage status={message.status} message={message.message} />
      {lots.map((lot) =>
        editing === lot.id ? (
          <TicketTypeForm key={lot.id} eventId={eventId} lot={lot} onDone={() => setEditing(null)} />
        ) : (
          <article key={lot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4">
            {(() => {
              const a = availability(
                {
                  ...lot,
                  salesStartAt: lot.salesStartAt ? new Date(lot.salesStartAt) : null,
                  salesEndAt: lot.salesEndAt ? new Date(lot.salesEndAt) : null,
                },
                now,
              );
              return (
                <div>
                  <h3 className="font-medium">
                    {lot.name} <span className={`ml-2 text-xs font-medium ${AVAIL_CLS[a]}`}>{AVAILABILITY_LABEL[a]}</span>
                  </h3>
                  <p className="text-sm text-zinc-600">
                    {lot.kind === 'free'
                      ? 'Gratuito'
                      : `${formatBRL(lot.priceCents)}${
                          feeMode === 'pass_to_buyer' ? ` · comprador paga ${formatBRL(buyerUnitPriceCents(lot.priceCents, feeMode))}` : ''
                        }`}{' '}
                    · {lot.quantitySold} vendidos de {lot.quantityTotal}
                  </p>
                </div>
              );
            })()}
            <div className="flex gap-2 text-sm">
              <button type="button" onClick={() => setEditing(lot.id)} className="rounded-lg px-3 py-1.5 hover:bg-zinc-100">
                Editar
              </button>
              {lot.quantitySold === 0 && (
                <button type="button" disabled={pending} onClick={() => remove(lot)} className="rounded-lg px-3 py-1.5 text-red-700 hover:bg-red-50">
                  Excluir
                </button>
              )}
            </div>
          </article>
        ),
      )}
      {editing === 'new' ? (
        <TicketTypeForm eventId={eventId} lot={null} onDone={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="self-start rounded-lg border border-dashed border-zinc-400 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          + Adicionar lote
        </button>
      )}
    </div>
  );
}
