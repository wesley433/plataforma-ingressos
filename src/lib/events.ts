/**
 * Regras de eventos e lotes sem dependências externas (testáveis com node --test).
 */
import { platformFee, type FeeMode } from './fees.ts';

// ─── Fusos horários do Brasil ─────────────────────────────────────────────

export const BR_TIMEZONES = [
  { id: 'America/Sao_Paulo', label: 'Brasília (SP, RJ, MG, Sul, Nordeste, GO, DF)' },
  { id: 'America/Cuiaba', label: 'Mato Grosso (MT)' },
  { id: 'America/Campo_Grande', label: 'Mato Grosso do Sul (MS)' },
  { id: 'America/Manaus', label: 'Amazonas, Rondônia, Roraima' },
  { id: 'America/Rio_Branco', label: 'Acre' },
  { id: 'America/Noronha', label: 'Fernando de Noronha' },
] as const;

export type BrTimezone = (typeof BR_TIMEZONES)[number]['id'];

export function isBrTimezone(tz: string): tz is BrTimezone {
  return BR_TIMEZONES.some((z) => z.id === tz);
}

/** Diferença (ms) entre o relógio local do fuso e UTC num instante. */
function offsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - instant.getTime();
}

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * "2026-11-20T19:00" no fuso do evento → instante UTC.
 * Faz dois passos para acertar perto de mudanças de horário (caso o Brasil volte a ter horário de verão).
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const m = LOCAL_RE.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as [number, number, number, number, number, number];
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  let guess = naive - offsetMs(new Date(naive), timeZone);
  guess = naive - offsetMs(new Date(guess), timeZone);
  const out = new Date(guess);
  return Number.isNaN(out.getTime()) ? null : out;
}

/** Instante UTC → valor para <input type="datetime-local"> no fuso do evento. */
export function utcToZonedLocalInput(instant: Date, timeZone: string): string {
  const local = new Date(instant.getTime() + offsetMs(instant, timeZone));
  return local.toISOString().slice(0, 16);
}

/** "sex., 20 de nov. de 2026 · 19:00" no fuso do evento. */
export function formatEventDate(instant: Date, timeZone: string): string {
  const date = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(instant);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(instant);
  return `${date} · ${time}`;
}

// ─── Slug ─────────────────────────────────────────────────────────────────

export function slugify(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

/** slug + sufixo curto aleatório, para não colidir com outro evento de mesmo nome. */
export function eventSlug(title: string, randomSuffix: string): string {
  const base = slugify(title) || 'evento';
  return `${base}-${randomSuffix.toLowerCase()}`;
}

// ─── Preço que o comprador vê ─────────────────────────────────────────────

/** Taxa repassada: preço + 5%. Absorvida: só o preço. Gratuito: 0. */
export function buyerUnitPriceCents(priceCents: number, mode: FeeMode): number {
  return mode === 'pass_to_buyer' ? priceCents + platformFee(priceCents) : priceCents;
}

// ─── Disponibilidade do lote ──────────────────────────────────────────────

export interface TicketTypeState {
  kind: 'free' | 'paid';
  priceCents: number;
  quantityTotal: number;
  quantitySold: number;
  quantityReserved: number;
  salesStartAt: Date | null;
  salesEndAt: Date | null;
  isHidden: boolean;
}

export type Availability = 'on_sale' | 'sold_out' | 'not_started' | 'ended' | 'hidden';

export function availability(t: TicketTypeState, now: Date): Availability {
  if (t.isHidden) return 'hidden';
  if (t.salesStartAt && now < t.salesStartAt) return 'not_started';
  if (t.salesEndAt && now >= t.salesEndAt) return 'ended';
  if (t.quantitySold + t.quantityReserved >= t.quantityTotal) return 'sold_out';
  return 'on_sale';
}

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  on_sale: 'À venda',
  sold_out: 'Esgotado',
  not_started: 'Em breve',
  ended: 'Vendas encerradas',
  hidden: 'Oculto',
};

// ─── Publicação ───────────────────────────────────────────────────────────

export interface PublishCheckInput {
  startsAt: Date;
  endsAt: Date;
  format: 'in_person' | 'online';
  addressLine: string | null;
  onlineUrl: string | null;
  ticketTypes: Pick<TicketTypeState, 'kind' | 'isHidden'>[];
  paymentsActive: boolean;
}

/** Lista o que falta para publicar (vazia = pode publicar). */
export function publishProblems(e: PublishCheckInput, now: Date): string[] {
  const problems: string[] = [];
  if (e.startsAt <= now) problems.push('A data de início precisa estar no futuro.');
  if (e.endsAt <= e.startsAt) problems.push('O término precisa ser depois do início.');
  if (e.format === 'in_person' && !e.addressLine) problems.push('Informe o endereço do evento presencial.');
  if (e.format === 'online' && !e.onlineUrl) problems.push('Informe o link do evento online.');
  if (!e.ticketTypes.some((t) => !t.isHidden)) problems.push('Crie pelo menos um lote visível.');
  if (!e.paymentsActive && e.ticketTypes.some((t) => t.kind === 'paid')) {
    problems.push('Lotes pagos exigem o recebimento de vendas ativo. Use só lotes gratuitos por enquanto.');
  }
  return problems;
}
