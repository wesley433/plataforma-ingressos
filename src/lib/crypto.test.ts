import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptSecret, encryptSecret, sha256Hex } from './crypto.ts';

const SECRET = 'uma-frase-longa-e-aleatoria-com-mais-de-32-caracteres';

test('cifra e decifra', () => {
  const enc = encryptSecret('$aact_chave_da_subconta', SECRET);
  assert.equal(decryptSecret(enc, SECRET), '$aact_chave_da_subconta');
});

test('o texto original não aparece no cifrado e o IV muda a cada vez', () => {
  const a = encryptSecret('segredo', SECRET);
  const b = encryptSecret('segredo', SECRET);
  assert.ok(!a.toString('latin1').includes('segredo'));
  assert.notDeepEqual(a, b);
});

test('chave errada ou dado adulterado falham', () => {
  const enc = encryptSecret('segredo', SECRET);
  assert.throws(() => decryptSecret(enc, 'outra-frase-longa-e-aleatoria-com-32-caracteres'));
  const tampered = Buffer.from(enc);
  tampered[tampered.length - 1] = (tampered.at(-1) ?? 0) ^ 1;
  assert.throws(() => decryptSecret(tampered, SECRET));
});

test('segredo curto é recusado', () => {
  assert.throws(() => encryptSecret('x', 'curto'));
});

test('sha256 hex', () => {
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});
