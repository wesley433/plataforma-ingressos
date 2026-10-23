import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentKind, formatDocument, isValidCnpj, isValidCpf, maskDocument } from './documents.ts';

test('CPFs válidos (com e sem máscara)', () => {
  assert.ok(isValidCpf('529.982.247-25'));
  assert.ok(isValidCpf('52998224725'));
  assert.ok(isValidCpf('111.444.777-35'));
});

test('CPFs inválidos', () => {
  for (const bad of ['529.982.247-24', '11111111111', '123', '', '5299822472a']) {
    assert.equal(isValidCpf(bad), false, bad);
  }
});

test('CNPJs válidos e inválidos', () => {
  assert.ok(isValidCnpj('11.222.333/0001-81'));
  assert.ok(isValidCnpj('11222333000181'));
  assert.equal(isValidCnpj('11.222.333/0001-80'), false);
  assert.equal(isValidCnpj('00000000000000'), false);
});

test('identifica o tipo de documento', () => {
  assert.equal(documentKind('529.982.247-25'), 'cpf');
  assert.equal(documentKind('11.222.333/0001-81'), 'cnpj');
  assert.equal(documentKind('529.982.247-24'), null);
});

test('formata e mascara', () => {
  assert.equal(formatDocument('52998224725'), '529.982.247-25');
  assert.equal(formatDocument('11222333000181'), '11.222.333/0001-81');
  assert.equal(maskDocument('52998224725'), '529.***.***-25');
  assert.equal(maskDocument('11222333000181'), '11.***.***/****-81');
});
