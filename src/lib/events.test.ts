import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  availability,
  buyerUnitPriceCents,
  eventSlug,
  formatEventDate,
  publishProblems,
  slugify,
  utcToZonedLocalInput,
  zonedLocalToUtc,
  type TicketTypeState,
} from './events.ts';

test('horário local do evento vira UTC no fuso certo', () => {
  assert.equal(zonedLocalToUtc('2026-11-20T19:00', 'America/Sao_Paulo')?.toISOString(), '2026-11-20T22:00:00.000Z');
  assert.equal(zonedLocalToUtc('2026-11-20T19:00', 'America/Cuiaba')?.toISOString(), '2026-11-20T23:00:00.000Z');
  assert.equal(zonedLocalToUtc('2026-11-20T19:00', 'America/Rio_Branco')?.toISOString(), '2026-11-21T00:00:00.000Z');
  assert.equal(zonedLocalToUtc('20/11/2026 19:00', 'America/Sao_Paulo'), null);
});

test('ida e volta: UTC → campo datetime-local', () => {
  for (const tz of ['America/Sao_Paulo', 'America/Cuiaba', 'America/Noronha']) {
    const utc = zonedLocalToUtc('2027-02-14T08:30', tz)!;
    assert.equal(utcToZonedLocalInput(utc, tz), '2027-02-14T08:30', tz);
  }
});

test('data formatada em português no fuso do evento', () => {
  const utc = new Date('2026-11-20T23:00:00Z');
  const s = formatEventDate(utc, 'America/Cuiaba');
  assert.match(s, /20/);
  assert.match(s, /nov/);
  assert.match(s, /19:00/);
});

test('slug sem acentos e com sufixo', () => {
  assert.equal(slugify('Festival de Música & Arte — Campo Grande 2026!'), 'festival-de-musica-arte-campo-grande-2026');
  assert.equal(eventSlug('Ação', 'X7K2'), 'acao-x7k2');
  assert.equal(eventSlug('!!!', 'ab12'), 'evento-ab12');
  assert.ok(slugify('a'.repeat(100)).length <= 60);
});

test('preço exibido ao comprador por modo de taxa', () => {
  assert.equal(buyerUnitPriceCents(10_000, 'pass_to_buyer'), 10_500);
  assert.equal(buyerUnitPriceCents(10_000, 'absorb'), 10_000);
  assert.equal(buyerUnitPriceCents(0, 'pass_to_buyer'), 0);
});

const lot = (over: Partial<TicketTypeState> = {}): TicketTypeState => ({
  kind: 'free',
  priceCents: 0,
  quantityTotal: 10,
  quantitySold: 0,
  quantityReserved: 0,
  salesStartAt: null,
  salesEndAt: null,
  isHidden: false,
  ...over,
});

test('disponibilidade do lote', () => {
  const now = new Date('2026-11-01T12:00:00Z');
  assert.equal(availability(lot(), now), 'on_sale');
  assert.equal(availability(lot({ quantitySold: 7, quantityReserved: 3 }), now), 'sold_out');
  assert.equal(availability(lot({ salesStartAt: new Date('2026-11-02T00:00:00Z') }), now), 'not_started');
  assert.equal(availability(lot({ salesEndAt: new Date('2026-11-01T12:00:00Z') }), now), 'ended');
  assert.equal(availability(lot({ isHidden: true }), now), 'hidden');
});

test('regras para publicar', () => {
  const now = new Date('2026-11-01T12:00:00Z');
  const ok = {
    startsAt: new Date('2026-11-20T22:00:00Z'),
    endsAt: new Date('2026-11-21T02:00:00Z'),
    format: 'in_person' as const,
    addressLine: 'Rua X, 100',
    onlineUrl: null,
    ticketTypes: [{ kind: 'free' as const, isHidden: false }],
    paymentsActive: false,
  };
  assert.deepEqual(publishProblems(ok, now), []);
  assert.equal(publishProblems({ ...ok, ticketTypes: [] }, now).length, 1);
  assert.equal(publishProblems({ ...ok, ticketTypes: [{ kind: 'paid', isHidden: false }] }, now).length, 1);
  assert.deepEqual(
    publishProblems({ ...ok, ticketTypes: [{ kind: 'paid', isHidden: false }], paymentsActive: true }, now),
    [],
  );
  assert.equal(publishProblems({ ...ok, startsAt: new Date('2026-10-01T00:00:00Z') }, now).length, 1);
  assert.equal(publishProblems({ ...ok, format: 'online', addressLine: null }, now).length, 1);
});
