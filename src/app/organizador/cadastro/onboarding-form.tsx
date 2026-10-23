'use client';

import { useActionState, useState } from 'react';
import { becomeOrganizer, type OnboardingState } from './actions.ts';

const initial: OnboardingState = { status: 'idle' };

const inputCls =
  'w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 aria-[invalid=true]:border-red-500';

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={name}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-zinc-500">{hint}</span>}
      {error && (
        <span id={`${name}-error`} className="text-sm text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(becomeOrganizer, initial);
  const [personType, setPersonType] = useState<'pf' | 'pj'>('pf');
  const e = state.fieldErrors ?? {};
  const inv = (name: string) => ({ id: name, name, 'aria-invalid': Boolean(e[name]) || undefined });

  return (
    <form action={action} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">Quem recebe os pagamentos</legend>
        <div className="flex gap-2" role="radiogroup" aria-label="Tipo de pessoa">
          {(['pf', 'pj'] as const).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium ${
                personType === t ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="personType"
                value={t}
                checked={personType === t}
                onChange={() => setPersonType(t)}
                className="sr-only"
              />
              {t === 'pf' ? 'Pessoa física (CPF)' : 'Empresa (CNPJ)'}
            </label>
          ))}
        </div>

        <Field label={personType === 'pf' ? 'Nome completo' : 'Razão social'} name="legalName" error={e.legalName}>
          <input {...inv('legalName')} defaultValue={defaultName} required className={inputCls} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={personType === 'pf' ? 'CPF' : 'CNPJ'} name="document" error={e.document}>
            <input {...inv('document')} inputMode="numeric" required className={inputCls} />
          </Field>
          {personType === 'pf' ? (
            <Field label="Data de nascimento" name="birthDate" error={e.birthDate}>
              <input {...inv('birthDate')} type="date" required className={inputCls} />
            </Field>
          ) : (
            <Field label="Tipo de empresa" name="companyType" error={e.companyType}>
              <select {...inv('companyType')} required defaultValue="" className={inputCls}>
                <option value="" disabled>
                  Selecione
                </option>
                <option value="MEI">MEI</option>
                <option value="LIMITED">Limitada (LTDA)</option>
                <option value="INDIVIDUAL">Empresário individual</option>
                <option value="ASSOCIATION">Associação</option>
              </select>
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Celular com DDD" name="mobilePhone" error={e.mobilePhone}>
            <input {...inv('mobilePhone')} type="tel" inputMode="tel" required className={inputCls} />
          </Field>
          <Field
            label={personType === 'pf' ? 'Renda mensal (R$)' : 'Faturamento mensal (R$)'}
            name="monthlyIncome"
            error={e.monthlyIncome}
            hint="Exigido pelo gateway de pagamento."
          >
            <input {...inv('monthlyIncome')} inputMode="decimal" placeholder="5.000,00" required className={inputCls} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">Endereço</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="CEP" name="postalCode" error={e.postalCode}>
            <input {...inv('postalCode')} inputMode="numeric" required className={inputCls} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Rua" name="address" error={e.address}>
              <input {...inv('address')} required className={inputCls} />
            </Field>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Número" name="addressNumber" error={e.addressNumber}>
            <input {...inv('addressNumber')} required className={inputCls} />
          </Field>
          <Field label="Complemento" name="complement" error={e.complement}>
            <input {...inv('complement')} className={inputCls} />
          </Field>
          <Field label="Bairro" name="province" error={e.province}>
            <input {...inv('province')} required className={inputCls} />
          </Field>
        </div>
      </fieldset>

      {state.status === 'error' && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? 'Salvando…' : 'Quero organizar eventos'}
        </button>
        <p className="text-xs text-zinc-500">
          Os dados vão para o gateway de pagamento (Asaas) para abrir a conta que recebe as vendas. Eventos gratuitos
          podem ser criados logo em seguida.
        </p>
      </div>
    </form>
  );
}
