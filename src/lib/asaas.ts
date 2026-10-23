/**
 * Cliente mínimo da API do Asaas (v3). Só o necessário até agora: criar a subconta
 * do organizador. Cobranças, split e webhooks entram na Sprint 4.
 * Documentação: https://docs.asaas.com/reference/criar-subconta
 */
import { onlyDigits } from './documents.ts';

export type CompanyType = 'MEI' | 'LIMITED' | 'INDIVIDUAL' | 'ASSOCIATION';

export interface OrganizerProfileInput {
  legalName: string;
  email: string;
  document: string; // CPF ou CNPJ, com ou sem máscara
  birthDate?: string; // AAAA-MM-DD, obrigatório para CPF
  companyType?: CompanyType; // obrigatório para CNPJ
  mobilePhone: string;
  monthlyIncomeCents: number; // faturamento/renda mensal estimada
  postalCode: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string; // bairro
}

export interface AsaasSubaccountPayload {
  name: string;
  email: string;
  cpfCnpj: string;
  birthDate?: string;
  companyType?: CompanyType;
  mobilePhone: string;
  incomeValue: number;
  postalCode: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
}

export function buildSubaccountPayload(input: OrganizerProfileInput): AsaasSubaccountPayload {
  const cpfCnpj = onlyDigits(input.document);
  const isCompany = cpfCnpj.length === 14;
  const payload: AsaasSubaccountPayload = {
    name: input.legalName.trim(),
    email: input.email.trim().toLowerCase(),
    cpfCnpj,
    mobilePhone: onlyDigits(input.mobilePhone),
    incomeValue: Math.round(input.monthlyIncomeCents) / 100,
    postalCode: onlyDigits(input.postalCode),
    address: input.address.trim(),
    addressNumber: input.addressNumber.trim(),
    province: input.province.trim(),
  };
  if (input.complement?.trim()) payload.complement = input.complement.trim();
  if (isCompany) {
    if (!input.companyType) throw new Error('Tipo de empresa é obrigatório para CNPJ');
    payload.companyType = input.companyType;
  } else {
    if (!input.birthDate) throw new Error('Data de nascimento é obrigatória para CPF');
    payload.birthDate = input.birthDate;
  }
  return payload;
}

export interface AsaasSubaccount {
  id: string;
  walletId: string;
  apiKey: string;
}

export class AsaasError extends Error {
  readonly status: number;
  readonly details: string[];

  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.name = 'AsaasError';
    this.status = status;
    this.details = details;
  }
}

export async function createSubaccount(
  payload: AsaasSubaccountPayload,
  opts: { apiUrl: string; apiKey: string; fetchImpl?: typeof fetch },
): Promise<AsaasSubaccount> {
  const res = await (opts.fetchImpl ?? fetch)(`${opts.apiUrl}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'plataforma-ingressos',
      access_token: opts.apiKey,
    },
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const errors = Array.isArray(body.errors) ? (body.errors as { description?: string }[]) : [];
    throw new AsaasError(
      'Asaas recusou a criação da subconta',
      res.status,
      errors.map((e) => e.description ?? '').filter(Boolean),
    );
  }

  const { id, walletId, apiKey } = body as Partial<AsaasSubaccount>;
  if (!id || !walletId || !apiKey) throw new AsaasError('Resposta do Asaas sem id, walletId ou apiKey', res.status);
  return { id, walletId, apiKey };
}
