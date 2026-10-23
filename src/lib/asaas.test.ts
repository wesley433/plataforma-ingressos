import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AsaasError, buildSubaccountPayload, createSubaccount, type OrganizerProfileInput } from './asaas.ts';

const base: OrganizerProfileInput = {
  legalName: '  Maria Souza ',
  email: 'Maria@Ex.com',
  document: '529.982.247-25',
  birthDate: '1990-05-20',
  mobilePhone: '(67) 99999-1234',
  monthlyIncomeCents: 500_000,
  postalCode: '79002-000',
  address: 'Rua 14 de Julho',
  addressNumber: '100',
  province: 'Centro',
};

test('pessoa física: limpa máscaras, exige data de nascimento', () => {
  const p = buildSubaccountPayload(base);
  assert.equal(p.cpfCnpj, '52998224725');
  assert.equal(p.mobilePhone, '67999991234');
  assert.equal(p.postalCode, '79002000');
  assert.equal(p.incomeValue, 5000);
  assert.equal(p.name, 'Maria Souza');
  assert.equal(p.email, 'maria@ex.com');
  assert.equal(p.birthDate, '1990-05-20');
  assert.equal(p.companyType, undefined);
  assert.throws(() => buildSubaccountPayload({ ...base, birthDate: undefined }));
});

test('pessoa jurídica: exige tipo de empresa, sem data de nascimento', () => {
  const p = buildSubaccountPayload({ ...base, document: '11.222.333/0001-81', companyType: 'LIMITED' });
  assert.equal(p.companyType, 'LIMITED');
  assert.equal(p.birthDate, undefined);
  assert.throws(() => buildSubaccountPayload({ ...base, document: '11.222.333/0001-81' }));
});

test('createSubaccount envia a chave no header e devolve id, walletId e apiKey', async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ id: 'acc_1', walletId: 'w_1', apiKey: '$aact_x' }), { status: 200 });
  }) as unknown as typeof fetch;

  const out = await createSubaccount(buildSubaccountPayload(base), {
    apiUrl: 'https://api-sandbox.asaas.com/v3',
    apiKey: 'k',
    fetchImpl: fakeFetch,
  });
  assert.deepEqual(out, { id: 'acc_1', walletId: 'w_1', apiKey: '$aact_x' });
  assert.equal(seen!.url, 'https://api-sandbox.asaas.com/v3/accounts');
  assert.equal((seen!.init.headers as Record<string, string>).access_token, 'k');
});

test('createSubaccount traduz erros do Asaas', async () => {
  const fakeFetch = (async () =>
    new Response(JSON.stringify({ errors: [{ description: 'CPF inválido' }] }), { status: 400 })) as unknown as typeof fetch;
  await assert.rejects(
    createSubaccount(buildSubaccountPayload(base), { apiUrl: 'x', apiKey: 'k', fetchImpl: fakeFetch }),
    (err: unknown) => err instanceof AsaasError && err.status === 400 && err.details[0] === 'CPF inválido',
  );
});
