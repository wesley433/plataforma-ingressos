/** Conversões de valores em reais (texto digitado) ↔ centavos (inteiros). */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/**
 * Aceita "5000", "5.000", "5.000,50", "5000,5", "R$ 1.234,56" e devolve centavos.
 * Devolve null para texto inválido ou negativo.
 */
export function parseBRL(input: string): number | null {
  const cleaned = input.replace(/R\$|\s/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(cleaned)) return null;
  const [intPart = '0', decPart = ''] = cleaned.replace(/\./g, '').split(',');
  const cents = Number(intPart) * 100 + Number(decPart.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}
