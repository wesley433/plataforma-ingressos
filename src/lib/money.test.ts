import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBRL, parseBRL } from './money.ts';

test('lê valores digitados em reais', () => {
  assert.equal(parseBRL('5000'), 500_000);
  assert.equal(parseBRL('5.000'), 500_000);
  assert.equal(parseBRL('5.000,50'), 500_050);
  assert.equal(parseBRL('5000,5'), 500_050);
  assert.equal(parseBRL('R$ 1.234,56'), 123_456);
  assert.equal(parseBRL('0,99'), 99);
});

test('recusa texto inválido', () => {
  for (const bad of ['', 'abc', '-10', '1,234', '12.34.5', '1,234,5']) assert.equal(parseBRL(bad), null, bad);
});

test('formata em reais', () => {
  assert.equal(formatBRL(123_456).replace(/\s/g, ' '), 'R$ 1.234,56');
});
