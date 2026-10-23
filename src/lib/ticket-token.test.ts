import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { generateTicketCode, signTicket, verifyTicket } from './ticket-token.ts';

const SECRET = 'x'.repeat(48);
const claims = () => ({ i: randomUUID(), e: randomUUID(), n: randomUUID() });

test('token assinado é aceito e devolve as claims', () => {
  const c = claims();
  assert.deepEqual(verifyTicket(signTicket(c, SECRET), SECRET), c);
});

test('token não carrega dados pessoais, só ids', () => {
  const token = signTicket(claims(), SECRET);
  const body = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
  assert.deepEqual(Object.keys(body).sort(), ['e', 'i', 'n']);
});

test('payload adulterado é rejeitado', () => {
  const token = signTicket(claims(), SECRET);
  const [v, , sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify(claims())).toString('base64url');
  assert.equal(verifyTicket(`${v}.${forged}.${sig}`, SECRET), null);
});

test('assinatura com outro segredo é rejeitada', () => {
  const token = signTicket(claims(), SECRET);
  assert.equal(verifyTicket(token, 'y'.repeat(48)), null);
});

test('lixo e formatos errados são rejeitados sem exceção', () => {
  for (const bad of ['', 'abc', 'v1..', 'v2.a.b', 'v1.a.b.c', 'x'.repeat(600)]) {
    assert.equal(verifyTicket(bad, SECRET), null);
  }
});

test('segredo curto falha alto', () => {
  assert.throws(() => signTicket(claims(), 'curto'));
});

test('código curto usa só caracteres sem ambiguidade', () => {
  for (let k = 0; k < 500; k++) {
    assert.match(generateTicketCode(randomBytes), /^[2-9A-HJKMNP-Z]{8}$/);
  }
});
