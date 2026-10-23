/** Papéis e para onde cada um vai depois do login. Sem dependências: testável. */

export type Role = 'participant' | 'organizer' | 'admin';

const RANK: Record<Role, number> = { participant: 0, organizer: 1, admin: 2 };

/** admin pode tudo que organizador pode; organizador pode tudo que participante pode. */
export function hasRole(userRole: Role, required: Role): boolean {
  return RANK[userRole] >= RANK[required];
}

export function homeFor(role: Role): string {
  if (role === 'admin') return '/admin';
  if (role === 'organizer') return '/organizador';
  return '/conta';
}

/**
 * Só aceita caminhos internos como destino pós-login (evita open redirect:
 * "//site-malicioso.com" e "https://..." são recusados).
 */
export function safeNextPath(next: string | null | undefined, fallback = '/conta'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
