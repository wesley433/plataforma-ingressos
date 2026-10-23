'use client';

import { useActionState, useState } from 'react';
import { BR_TIMEZONES } from '@/lib/events.ts';
import { priceOrder } from '@/lib/fees.ts';
import { formatBRL, parseBRL } from '@/lib/money.ts';
import type { FormState } from './actions.ts';
import { RichTextEditor } from './rich-text-editor.tsx';
import { Field, FormMessage, inputCls } from './ui.tsx';

export interface EventFormDefaults {
  title: string;
  descriptionHtml: string;
  timezone: string;
  startsLocal: string;
  endsLocal: string;
  format: 'in_person' | 'online';
  venueName: string;
  zipCode: string;
  addressLine: string;
  city: string;
  state: string;
  onlineUrl: string;
  feeMode: 'pass_to_buyer' | 'absorb';
  bannerUrl: string | null;
}

const initial: FormState = { status: 'idle' };

export function EventForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: EventFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [format, setFormat] = useState(defaults.format);
  const [feeMode, setFeeMode] = useState(defaults.feeMode);
  const [address, setAddress] = useState({
    addressLine: defaults.addressLine,
    city: defaults.city,
    state: defaults.state,
  });
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [samplePrice, setSamplePrice] = useState('100,00');
  const e = state.fieldErrors ?? {};
  const inv = (name: string) => ({ id: name, name, 'aria-invalid': Boolean(e[name]) || undefined });

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepStatus('loading');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (data.erro) throw new Error('CEP não encontrado');
      setAddress({
        addressLine: [data.logradouro, data.bairro].filter(Boolean).join(', '),
        city: data.localidade ?? '',
        state: data.uf ?? '',
      });
      setCepStatus('idle');
    } catch {
      setCepStatus('error');
    }
  }

  const sampleCents = parseBRL(samplePrice) ?? 0;
  const sim = sampleCents > 0 ? priceOrder([{ priceCents: sampleCents, qty: 1 }], feeMode) : null;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Sobre o evento</h2>
        <Field label="Título" htmlFor="title" error={e.title}>
          <input {...inv('title')} defaultValue={defaults.title} required maxLength={120} className={inputCls} />
        </Field>
        <Field label="Descrição" error={e.descriptionHtml} hint="Programação, atrações, o que levar, regras de entrada…">
          <RichTextEditor name="descriptionHtml" initialHtml={defaults.descriptionHtml} />
        </Field>
        <Field label="Banner" htmlFor="banner" error={e.banner} hint="JPG, PNG ou WebP até 4 MB. Formato ideal: 1600 × 840 px.">
          {defaults.bannerUrl && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={defaults.bannerUrl} alt="Banner atual" className="h-20 w-36 rounded-lg object-cover" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="removeBanner" /> Remover banner
              </label>
            </div>
          )}
          <input {...inv('banner')} type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Quando</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Início" htmlFor="startsLocal" error={e.startsLocal}>
            <input {...inv('startsLocal')} type="datetime-local" defaultValue={defaults.startsLocal} required className={inputCls} />
          </Field>
          <Field label="Término" htmlFor="endsLocal" error={e.endsLocal}>
            <input {...inv('endsLocal')} type="datetime-local" defaultValue={defaults.endsLocal} required className={inputCls} />
          </Field>
        </div>
        <Field label="Fuso horário do evento" htmlFor="timezone" error={e.timezone}>
          <select {...inv('timezone')} defaultValue={defaults.timezone} className={inputCls}>
            {BR_TIMEZONES.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Onde</h2>
        <div className="flex gap-2">
          {(['in_person', 'online'] as const).map((f) => (
            <label
              key={f}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium ${
                format === f ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-zinc-300'
              }`}
            >
              <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
              {f === 'in_person' ? 'Presencial' : 'Online'}
            </label>
          ))}
        </div>

        {format === 'in_person' ? (
          <>
            <Field label="Nome do local" htmlFor="venueName" error={e.venueName} hint="Ex.: Teatro Glauce Rocha">
              <input {...inv('venueName')} defaultValue={defaults.venueName} className={inputCls} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="CEP"
                htmlFor="zipCode"
                error={e.zipCode}
                hint={cepStatus === 'loading' ? 'Buscando…' : cepStatus === 'error' ? 'CEP não encontrado.' : 'Preenche o endereço.'}
              >
                <input
                  {...inv('zipCode')}
                  defaultValue={defaults.zipCode}
                  inputMode="numeric"
                  onBlur={(ev) => lookupCep(ev.currentTarget.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Endereço (rua, número, bairro)" htmlFor="addressLine" error={e.addressLine} className="sm:col-span-2">
                <input
                  {...inv('addressLine')}
                  value={address.addressLine}
                  onChange={(ev) => setAddress({ ...address, addressLine: ev.currentTarget.value })}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Cidade" htmlFor="city" error={e.city} className="sm:col-span-2">
                <input
                  {...inv('city')}
                  value={address.city}
                  onChange={(ev) => setAddress({ ...address, city: ev.currentTarget.value })}
                  className={inputCls}
                />
              </Field>
              <Field label="UF" htmlFor="state" error={e.state}>
                <input
                  {...inv('state')}
                  value={address.state}
                  maxLength={2}
                  onChange={(ev) => setAddress({ ...address, state: ev.currentTarget.value.toUpperCase() })}
                  className={inputCls}
                />
              </Field>
            </div>
          </>
        ) : (
          <Field
            label="Link da transmissão"
            htmlFor="onlineUrl"
            error={e.onlineUrl}
            hint="Só quem tem ingresso válido vê este link."
          >
            <input {...inv('onlineUrl')} type="url" defaultValue={defaults.onlineUrl} placeholder="https://" className={inputCls} />
          </Field>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Taxa de serviço (5% nos ingressos pagos)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['pass_to_buyer', 'Repassar ao comprador', 'O comprador paga o preço do ingresso + 5%.'],
              ['absorb', 'Absorver a taxa', 'O comprador paga só o preço; os 5% saem do seu valor.'],
            ] as const
          ).map(([value, title, desc]) => (
            <label
              key={value}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 ${
                feeMode === value ? 'border-brand-600 bg-brand-50' : 'border-zinc-300'
              }`}
            >
              <input type="radio" name="feeMode" value={value} checked={feeMode === value} onChange={() => setFeeMode(value)} className="sr-only" />
              <span className="font-medium">{title}</span>
              <span className="text-sm text-zinc-600">{desc}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4 rounded-xl bg-zinc-50 p-4 text-sm">
          <label className="flex flex-col gap-1">
            <span className="font-medium">Simular ingresso de</span>
            <input
              value={samplePrice}
              onChange={(ev) => setSamplePrice(ev.currentTarget.value)}
              inputMode="decimal"
              className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2"
              aria-label="Preço para simulação"
            />
          </label>
          {sim && (
            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-zinc-500">Comprador paga</dt>
                <dd className="font-semibold tabular-nums">{formatBRL(sim.buyerTotalCents)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Taxa (5%)</dt>
                <dd className="font-semibold tabular-nums">{formatBRL(sim.platformFeeCents)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Você recebe*</dt>
                <dd className="font-semibold tabular-nums">{formatBRL(sim.organizerGrossCents)}</dd>
              </div>
            </dl>
          )}
          <p className="w-full text-xs text-zinc-500">* Antes da taxa de processamento do PIX ou cartão.</p>
        </div>
      </section>

      <FormMessage status={state.status} message={state.message} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? 'Salvando…' : submitLabel}
      </button>
    </form>
  );
}
