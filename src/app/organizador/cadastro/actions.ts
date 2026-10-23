'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AsaasError, buildSubaccountPayload, createSubaccount, type OrganizerProfileInput } from '@/lib/asaas.ts';
import { requireUser } from '@/lib/auth.ts';
import { encryptSecret } from '@/lib/crypto.ts';
import { prisma } from '@/lib/db.ts';
import { documentKind, onlyDigits } from '@/lib/documents.ts';
import { serverEnv } from '@/lib/env.ts';
import { parseBRL } from '@/lib/money.ts';

export type OnboardingState = {
  status: 'idle' | 'error';
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const text = (min: number, msg: string) => z.string().trim().min(min, msg);

const schema = z
  .object({
    personType: z.enum(['pf', 'pj']),
    legalName: text(3, 'Informe o nome completo ou a razão social.'),
    document: z.string().trim(),
    birthDate: z.string().trim().optional(),
    companyType: z.enum(['MEI', 'LIMITED', 'INDIVIDUAL', 'ASSOCIATION']).optional(),
    mobilePhone: z
      .string()
      .transform(onlyDigits)
      .refine((v) => v.length === 10 || v.length === 11, 'Informe o celular com DDD.'),
    monthlyIncome: z.string().trim(),
    postalCode: z
      .string()
      .transform(onlyDigits)
      .refine((v) => v.length === 8, 'CEP deve ter 8 dígitos.'),
    address: text(3, 'Informe a rua.'),
    addressNumber: text(1, 'Informe o número.'),
    complement: z.string().trim().optional(),
    province: text(2, 'Informe o bairro.'),
  })
  .superRefine((v, ctx) => {
    const kind = documentKind(v.document);
    if (v.personType === 'pf' && kind !== 'cpf') {
      ctx.addIssue({ code: 'custom', path: ['document'], message: 'CPF inválido.' });
    }
    if (v.personType === 'pj' && kind !== 'cnpj') {
      ctx.addIssue({ code: 'custom', path: ['document'], message: 'CNPJ inválido.' });
    }
    if (v.personType === 'pf') {
      const ok = /^\d{4}-\d{2}-\d{2}$/.test(v.birthDate ?? '') && Date.parse(v.birthDate!) < Date.now();
      if (!ok) ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'Informe a data de nascimento.' });
    }
    if (v.personType === 'pj' && !v.companyType) {
      ctx.addIssue({ code: 'custom', path: ['companyType'], message: 'Escolha o tipo de empresa.' });
    }
    const income = parseBRL(v.monthlyIncome);
    if (income === null || income <= 0) {
      ctx.addIssue({ code: 'custom', path: ['monthlyIncome'], message: 'Informe um valor em reais, ex.: 5.000,00.' });
    }
  });

export async function becomeOrganizer(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireUser('/organizador/cadastro');

  // campos vazios viram "não informado" (ex.: tipo de empresa quando é pessoa física)
  const raw = Object.fromEntries([...formData.entries()].filter(([, value]) => value !== ''));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] ??= issue.message;
    }
    return { status: 'error', message: 'Confira os campos destacados.', fieldErrors };
  }

  const v = parsed.data;
  const profile: OrganizerProfileInput = {
    legalName: v.legalName,
    email: user.email,
    document: v.document,
    birthDate: v.personType === 'pf' ? v.birthDate : undefined,
    companyType: v.personType === 'pj' ? v.companyType : undefined,
    mobilePhone: v.mobilePhone,
    monthlyIncomeCents: parseBRL(v.monthlyIncome) ?? 0,
    postalCode: v.postalCode,
    address: v.address,
    addressNumber: v.addressNumber,
    complement: v.complement,
    province: v.province,
  };
  const payload = buildSubaccountPayload(profile);

  try {
    await prisma.$transaction([
      prisma.organizerAccount.create({
        data: {
          userId: user.id,
          legalName: payload.name,
          document: payload.cpfCnpj,
          phone: payload.mobilePhone,
          gatewayOnboarding: payload as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        // admin continua admin; participante vira organizador
        data: user.role === 'admin' ? {} : { role: 'organizer' },
      }),
    ]);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      redirect('/organizador'); // já é organizador
    }
    throw err;
  }

  await activatePayments(user.id);
  redirect('/organizador?bemvindo=1');
}

/**
 * Cria a subconta no Asaas com os dados guardados. Sem ASAAS_API_KEY (ainda não
 * configurada) ou se o Asaas recusar, o organizador segue podendo criar eventos
 * gratuitos e a ativação fica pendente para nova tentativa.
 */
async function activatePayments(userId: string): Promise<void> {
  const apiKey = serverEnv.asaasApiKey();
  if (!apiKey) return;

  const account = await prisma.organizerAccount.findUnique({ where: { userId } });
  if (!account || account.gatewayWalletId || !account.gatewayOnboarding) return;

  try {
    const sub = await createSubaccount(account.gatewayOnboarding as never, {
      apiUrl: serverEnv.asaasApiUrl(),
      apiKey,
    });
    await prisma.organizerAccount.update({
      where: { id: account.id },
      data: {
        gatewayAccountId: sub.id,
        gatewayWalletId: sub.walletId,
        gatewayApiKeyEnc: new Uint8Array(encryptSecret(sub.apiKey)),
        gatewayLastError: null,
      },
    });
  } catch (err) {
    const message =
      err instanceof AsaasError && err.details.length ? err.details.join(' · ') : 'Falha ao falar com o Asaas';
    await prisma.organizerAccount.update({ where: { id: account.id }, data: { gatewayLastError: message } });
  }
}
