/**
 * Token do QR Code do ingresso: assinado (HMAC-SHA256), sem dados pessoais.
 *
 * Formato: v1.<payload base64url>.<assinatura base64url>
 * Payload: { i: order_item_id, e: event_id, n: qr_nonce }
 *
 * A assinatura impede falsificação. Trocar o qr_nonce no banco invalida o QR antigo
 * (reemissão por troca de titular ou suspeita de vazamento).
 * Só roda no servidor: o segredo nunca vai para o navegador.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface TicketClaims {
  /** order_items.id */
  i: string;
  /** events.id */
  e: string;
  /** order_items.qr_nonce */
  n: string;
}

const VERSION = 'v1';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSecret(secret?: string): string {
  const value = secret ?? process.env.TICKET_SECRET;
  if (!value || value.length < 32) {
    throw new Error('TICKET_SECRET ausente ou curto demais (mínimo 32 caracteres)');
  }
  return value;
}

function mac(body: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(`${VERSION}.${body}`).digest();
}

function isClaims(value: unknown): value is TicketClaims {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return [v.i, v.e, v.n].every((x) => typeof x === 'string' && UUID_RE.test(x));
}

export function signTicket(claims: TicketClaims, secret?: string): string {
  if (!isClaims(claims)) throw new TypeError('Claims do ingresso inválidas');
  const body = Buffer.from(JSON.stringify({ i: claims.i, e: claims.e, n: claims.n })).toString('base64url');
  const sig = mac(body, getSecret(secret)).toString('base64url');
  return `${VERSION}.${body}.${sig}`;
}

/** Devolve as claims se o token for autêntico; null em qualquer outro caso. */
export function verifyTicket(token: string, secret?: string): TicketClaims | null {
  if (typeof token !== 'string' || token.length > 512) return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [version, body, sig] = parts as [string, string, string];
  if (version !== VERSION || !body || !sig) return null;

  const expected = mac(body, getSecret(secret));
  const received = Buffer.from(sig, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return isClaims(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Código curto legível para busca manual no check-in (sem 0/O, 1/I/L). */
export function generateTicketCode(randomBytes: (n: number) => Uint8Array, length = 8): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = randomBytes(length);
  let out = '';
  for (let k = 0; k < length; k++) out += alphabet.charAt((bytes[k] ?? 0) % alphabet.length);
  return out;
}
