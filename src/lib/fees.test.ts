import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asaasPlatformSplit, platformFee, priceOrder, settle } from './fees.ts';

test('5% de R$ 100,00 = R$ 5,00', () => {
  assert.equal(platformFee(10_000), 500);
});

test('meio centavo arredonda para cima (R$ 12,30 → R$ 0,62)', () => {
  assert.equal(platformFee(1_230), 62);
});

test('ingresso gratuito não tem taxa', () => {
  assert.equal(platformFee(0), 0);
});

test('rejeita valores não inteiros ou negativos', () => {
  assert.throws(() => platformFee(10.5));
  assert.throws(() => platformFee(-1));
});

test('taxa repassada: comprador paga P + F, organizador fica com P', () => {
  const p = priceOrder([{ priceCents: 10_000, qty: 1 }], 'pass_to_buyer');
  assert.deepEqual(
    { ...p, unitFeesCents: undefined },
    { subtotalCents: 10_000, platformFeeCents: 500, buyerTotalCents: 10_500, organizerGrossCents: 10_000, unitFeesCents: undefined },
  );
});

test('taxa absorvida: comprador paga P, organizador fica com P − F', () => {
  const p = priceOrder([{ priceCents: 10_000, qty: 1 }], 'absorb');
  assert.equal(p.buyerTotalCents, 10_000);
  assert.equal(p.platformFeeCents, 500);
  assert.equal(p.organizerGrossCents, 9_500);
});

test('taxa é somada por ingresso, não sobre o total (3 × R$ 33,33)', () => {
  const p = priceOrder([{ priceCents: 3_333, qty: 3 }], 'pass_to_buyer');
  assert.equal(p.platformFeeCents, 501); // 3 × 167, e não 500
  assert.deepEqual(p.unitFeesCents, [167]);
});

test('pedido misto: gratuito + pago cobra só a parte paga', () => {
  const p = priceOrder(
    [
      { priceCents: 0, qty: 2 },
      { priceCents: 5_000, qty: 1 },
    ],
    'pass_to_buyer',
  );
  assert.equal(p.subtotalCents, 5_000);
  assert.equal(p.platformFeeCents, 250);
  assert.equal(p.buyerTotalCents, 5_250);
  assert.deepEqual(p.unitFeesCents, [0, 250]);
});

test('invariante do banco vale para muitos pedidos aleatórios', () => {
  let seed = 42;
  const rand = (max: number) => {
    seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
    return seed % max;
  };
  for (let i = 0; i < 2_000; i++) {
    const lines = Array.from({ length: 1 + rand(4) }, () => ({ priceCents: rand(50_000), qty: 1 + rand(10) }));
    for (const mode of ['pass_to_buyer', 'absorb'] as const) {
      const p = priceOrder(lines, mode);
      assert.equal(p.buyerTotalCents, p.organizerGrossCents + p.platformFeeCents);
      const perItem = lines.reduce((s, l, idx) => s + (p.unitFeesCents[idx] ?? 0) * l.qty, 0);
      assert.equal(perItem, p.platformFeeCents);
      assert.ok(p.organizerGrossCents >= 0);
    }
  }
});

test('exemplos do documento: PIX e cartão, repassada e absorvida', () => {
  const pix = 199; // R$ 1,99 (ilustrativo)
  const card = (valueCents: number) => Math.round(valueCents * 0.0399) + 49; // 3,99% + R$ 0,49 (ilustrativo)

  const rep = priceOrder([{ priceCents: 10_000, qty: 1 }], 'pass_to_buyer');
  const abs = priceOrder([{ priceCents: 10_000, qty: 1 }], 'absorb');

  assert.equal(settle(rep, rep.buyerTotalCents - pix).organizerNetCents, 9_801);
  assert.equal(settle(abs, abs.buyerTotalCents - pix).organizerNetCents, 9_301);
  assert.equal(settle(rep, rep.buyerTotalCents - card(rep.buyerTotalCents)).organizerNetCents, 9_532);
  assert.equal(settle(abs, abs.buyerTotalCents - card(abs.buyerTotalCents)).organizerNetCents, 9_052);
});

test('settle recusa líquido maior que o cobrado', () => {
  const p = priceOrder([{ priceCents: 1_000, qty: 1 }], 'absorb');
  assert.throws(() => settle(p, 1_001));
});

test('split do Asaas em reais', () => {
  assert.deepEqual(asaasPlatformSplit('wallet_123', 501), [{ walletId: 'wallet_123', fixedValue: 5.01 }]);
});
