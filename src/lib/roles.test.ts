import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasRole, homeFor, safeNextPath } from './roles.ts';

test('hierarquia de papéis', () => {
  assert.ok(hasRole('admin', 'organizer'));
  assert.ok(hasRole('organizer', 'participant'));
  assert.equal(hasRole('participant', 'organizer'), false);
  assert.equal(hasRole('organizer', 'admin'), false);
});

test('página inicial por papel', () => {
  assert.equal(homeFor('participant'), '/conta');
  assert.equal(homeFor('organizer'), '/organizador');
  assert.equal(homeFor('admin'), '/admin');
});

test('redirecionamento só para caminhos internos', () => {
  assert.equal(safeNextPath('/organizador/cadastro'), '/organizador/cadastro');
  for (const bad of ['//evil.com', 'https://evil.com', '/\\evil.com', '', null, undefined, 'conta']) {
    assert.equal(safeNextPath(bad), '/conta', String(bad));
  }
});
