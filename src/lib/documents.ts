/** Validação e formatação de CPF e CNPJ (só dígitos no banco). */

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

function allSameDigit(digits: string): boolean {
  return /^(\d)\1+$/.test(digits);
}

export function isValidCpf(input: string): boolean {
  const cpf = onlyDigits(input);
  if (cpf.length !== 11 || allSameDigit(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf.charAt(i)) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf.charAt(9)) && digit(10) === Number(cpf.charAt(10));
}

export function isValidCnpj(input: string): boolean {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14 || allSameDigit(cnpj)) return false;
  const digit = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj.charAt(i)) * (weights.at(i) ?? 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return digit(12) === Number(cnpj.charAt(12)) && digit(13) === Number(cnpj.charAt(13));
}

export type DocumentKind = 'cpf' | 'cnpj';

export function documentKind(input: string): DocumentKind | null {
  const digits = onlyDigits(input);
  if (digits.length === 11) return isValidCpf(digits) ? 'cpf' : null;
  if (digits.length === 14) return isValidCnpj(digits) ? 'cnpj' : null;
  return null;
}

export function formatDocument(input: string): string {
  const d = onlyDigits(input);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return input;
}

/** Mostra só o começo e o fim do documento (LGPD): 123.***.***-09 */
export function maskDocument(input: string): string {
  const d = onlyDigits(input);
  if (d.length === 11) return `${d.slice(0, 3)}.***.***-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.***.***/****-${d.slice(12)}`;
  return '***';
}
