'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db.ts';
import { isBrTimezone, eventSlug, publishProblems, zonedLocalToUtc } from '@/lib/events.ts';
import { parseBRL } from '@/lib/money.ts';
import { requireOrganizer, requireOwnedEvent } from '@/lib/organizer.ts';
import { sanitizeDescription } from '@/lib/sanitize.ts';
import { bannerProblem, uploadBanner } from '@/lib/supabase/admin.ts';
import { onlyDigits } from '@/lib/documents.ts';

export type FormState = {
  status: 'idle' | 'error' | 'saved';
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

/** Preço mínimo de um lote pago (o gateway recusa cobranças muito baixas). */
const MIN_PAID_PRICE_CENTS = 500;

function formToObject(formData: FormData): Record<string, FormDataEntryValue> {
  // campos vazios = "não informado"; arquivos vazios (nenhum banner escolhido) também
  return Object.fromEntries(
    [...formData.entries()].filter(([, v]) => v !== '' && !(v instanceof File && v.size === 0)),
  );
}

function issuesToState(issues: z.ZodError['issues']): FormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0] ?? 'form')] ??= issue.message;
  return { status: 'error', message: 'Confira os campos destacados.', fieldErrors };
}

// ─── Evento ───────────────────────────────────────────────────────────────

const eventSchema = z
  .object({
    title: z.string().trim().min(3, 'Dê um título com pelo menos 3 letras.').max(120, 'Título longo demais.'),
    descriptionHtml: z.string().max(50_000, 'Descrição longa demais.').default(''),
    timezone: z.string().refine(isBrTimezone, 'Fuso inválido.'),
    startsLocal: z.string(),
    endsLocal: z.string(),
    format: z.enum(['in_person', 'online']),
    venueName: z.string().trim().max(120).optional(),
    zipCode: z.string().transform(onlyDigits).optional(),
    addressLine: z.string().trim().max(200).optional(),
    city: z.string().trim().max(80).optional(),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, 'UF com 2 letras.')
      .optional(),
    onlineUrl: z.string().trim().url('Link inválido (comece com https://).').optional(),
    feeMode: z.enum(['pass_to_buyer', 'absorb']),
  })
  .transform((v, ctx) => {
    const startsAt = zonedLocalToUtc(v.startsLocal, v.timezone);
    const endsAt = zonedLocalToUtc(v.endsLocal, v.timezone);
    if (!startsAt) ctx.addIssue({ code: 'custom', path: ['startsLocal'], message: 'Informe data e hora de início.' });
    if (!endsAt) ctx.addIssue({ code: 'custom', path: ['endsLocal'], message: 'Informe data e hora de término.' });
    if (startsAt && endsAt && endsAt <= startsAt) {
      ctx.addIssue({ code: 'custom', path: ['endsLocal'], message: 'O término precisa ser depois do início.' });
    }
    if (v.format === 'in_person' && !v.addressLine) {
      ctx.addIssue({ code: 'custom', path: ['addressLine'], message: 'Informe o endereço.' });
    }
    if (v.format === 'online' && !v.onlineUrl) {
      ctx.addIssue({ code: 'custom', path: ['onlineUrl'], message: 'Informe o link da transmissão.' });
    }
    if (v.zipCode && v.zipCode.length !== 8) {
      ctx.addIssue({ code: 'custom', path: ['zipCode'], message: 'CEP deve ter 8 dígitos.' });
    }
    const inPerson = v.format === 'in_person';
    return {
      title: v.title,
      descriptionHtml: sanitizeDescription(v.descriptionHtml),
      timezone: v.timezone,
      startsAt: startsAt ?? new Date(0),
      endsAt: endsAt ?? new Date(0),
      format: v.format,
      venueName: inPerson ? (v.venueName ?? null) : null,
      zipCode: inPerson ? (v.zipCode ?? null) : null,
      addressLine: inPerson ? (v.addressLine ?? null) : null,
      city: inPerson ? (v.city ?? null) : null,
      state: inPerson ? (v.state ?? null) : null,
      onlineUrl: inPerson ? null : (v.onlineUrl ?? null),
      feeMode: v.feeMode,
    };
  });

export async function createEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const { account } = await requireOrganizer('/organizador/eventos/novo');
  const parsed = eventSchema.safeParse(formToObject(formData));
  if (!parsed.success) return issuesToState(parsed.error.issues);

  const banner = formData.get('banner');
  if (banner instanceof File && banner.size > 0) {
    const problem = bannerProblem(banner);
    if (problem) return { status: 'error', message: problem, fieldErrors: { banner: problem } };
  }

  const event = await prisma.event.create({
    data: {
      ...parsed.data,
      organizerId: account.id,
      slug: eventSlug(parsed.data.title, randomBytes(3).toString('hex')),
    },
  });

  if (banner instanceof File && banner.size > 0) {
    try {
      const bannerUrl = await uploadBanner(event.id, banner);
      await prisma.event.update({ where: { id: event.id }, data: { bannerUrl } });
    } catch {
      redirect(`/organizador/eventos/${event.id}?aviso=banner`);
    }
  }

  redirect(`/organizador/eventos/${event.id}?criado=1`);
}

export async function updateEvent(eventId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { event } = await requireOwnedEvent(eventId, `/organizador/eventos/${eventId}`);
  const parsed = eventSchema.safeParse(formToObject(formData));
  if (!parsed.success) return issuesToState(parsed.error.issues);

  let bannerUrl = event.bannerUrl;
  const banner = formData.get('banner');
  if (banner instanceof File && banner.size > 0) {
    const problem = bannerProblem(banner);
    if (problem) return { status: 'error', message: problem, fieldErrors: { banner: problem } };
    try {
      bannerUrl = await uploadBanner(event.id, banner);
    } catch {
      return { status: 'error', message: 'Não foi possível enviar o banner. Tente outra imagem.' };
    }
  }
  if (formData.get('removeBanner') === 'on') bannerUrl = null;

  // Evento publicado não pode ficar inválido por uma edição.
  if (event.status === 'published') {
    const account = await prisma.organizerAccount.findUnique({ where: { id: event.organizerId } });
    const problems = publishProblems(
      { ...parsed.data, ticketTypes: event.ticketTypes, paymentsActive: Boolean(account?.gatewayWalletId) },
      new Date(0),
    );
    if (problems.length) return { status: 'error', message: problems.join(' ') };
  }

  await prisma.event.update({ where: { id: event.id }, data: { ...parsed.data, bannerUrl } });
  revalidatePath(`/organizador/eventos/${event.id}`);
  revalidatePath(`/e/${event.slug}`);
  revalidatePath('/');
  return { status: 'saved', message: 'Alterações salvas.' };
}

export async function setEventPublished(eventId: string, publish: boolean): Promise<FormState> {
  const { event } = await requireOwnedEvent(eventId, `/organizador/eventos/${eventId}`);
  if (event.status === 'blocked') return { status: 'error', message: 'Este evento foi bloqueado pela moderação.' };

  if (publish) {
    const account = await prisma.organizerAccount.findUnique({ where: { id: event.organizerId } });
    const problems = publishProblems(
      { ...event, ticketTypes: event.ticketTypes, paymentsActive: Boolean(account?.gatewayWalletId) },
      new Date(),
    );
    if (problems.length) return { status: 'error', message: problems.join(' ') };
  }

  await prisma.event.update({
    where: { id: event.id },
    data: publish ? { status: 'published', publishedAt: event.publishedAt ?? new Date() } : { status: 'draft' },
  });
  revalidatePath(`/organizador/eventos/${event.id}`);
  revalidatePath(`/e/${event.slug}`);
  revalidatePath('/');
  return { status: 'saved', message: publish ? 'Evento publicado.' : 'Evento voltou para rascunho.' };
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { event } = await requireOwnedEvent(eventId, `/organizador/eventos/${eventId}`);
  const orders = await prisma.order.count({ where: { eventId: event.id } });
  if (event.status !== 'draft' || orders > 0) {
    throw new Error('Só é possível excluir rascunhos sem pedidos.');
  }
  await prisma.event.delete({ where: { id: event.id } });
  revalidatePath('/organizador');
  redirect('/organizador?excluido=1');
}

// ─── Lotes ────────────────────────────────────────────────────────────────

const ticketSchema = z
  .object({
    name: z.string().trim().min(2, 'Dê um nome ao lote.').max(60),
    description: z.string().trim().max(300).optional(),
    kind: z.enum(['free', 'paid']),
    price: z.string().trim().optional(),
    quantityTotal: z.coerce.number().int('Use um número inteiro.').min(1, 'Mínimo 1.').max(100_000),
    maxPerOrder: z.coerce.number().int().min(1).max(50).default(10),
    salesStartLocal: z.string().optional(),
    salesEndLocal: z.string().optional(),
    isHidden: z.literal('on').optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'paid') {
      const cents = parseBRL(v.price ?? '');
      if (cents === null || cents < MIN_PAID_PRICE_CENTS) {
        ctx.addIssue({ code: 'custom', path: ['price'], message: 'Preço mínimo de R$ 5,00 para lotes pagos.' });
      }
    }
  });

export async function saveTicketType(
  eventId: string,
  ticketTypeId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { event } = await requireOwnedEvent(eventId, `/organizador/eventos/${eventId}`);
  const parsed = ticketSchema.safeParse(formToObject(formData));
  if (!parsed.success) return issuesToState(parsed.error.issues);
  const v = parsed.data;

  const salesStartAt = v.salesStartLocal ? zonedLocalToUtc(v.salesStartLocal, event.timezone) : null;
  const salesEndAt = v.salesEndLocal ? zonedLocalToUtc(v.salesEndLocal, event.timezone) : null;
  if (salesStartAt && salesEndAt && salesEndAt <= salesStartAt) {
    return { status: 'error', fieldErrors: { salesEndLocal: 'O fim das vendas precisa ser depois do início.' } };
  }

  const data = {
    name: v.name,
    description: v.description ?? null,
    kind: v.kind,
    priceCents: v.kind === 'paid' ? (parseBRL(v.price ?? '') ?? 0) : 0,
    quantityTotal: v.quantityTotal,
    maxPerOrder: v.maxPerOrder,
    salesStartAt,
    salesEndAt,
    isHidden: v.isHidden === 'on',
  };

  if (ticketTypeId) {
    const current = event.ticketTypes.find((t) => t.id === ticketTypeId);
    if (!current) return { status: 'error', message: 'Lote não encontrado.' };
    const committed = current.quantitySold + current.quantityReserved;
    if (data.quantityTotal < committed) {
      return { status: 'error', fieldErrors: { quantityTotal: `Já há ${committed} ingressos vendidos ou reservados.` } };
    }
    if (current.quantitySold > 0 && (data.kind !== current.kind || data.priceCents !== current.priceCents)) {
      return { status: 'error', message: 'Lote com vendas não pode mudar de tipo nem de preço. Crie um novo lote.' };
    }
    await prisma.ticketType.update({ where: { id: ticketTypeId }, data });
  } else {
    await prisma.ticketType.create({
      data: { ...data, eventId: event.id, sortOrder: event.ticketTypes.length },
    });
  }

  if (event.status === 'published' && data.kind === 'paid') {
    const account = await prisma.organizerAccount.findUnique({ where: { id: event.organizerId } });
    if (!account?.gatewayWalletId) {
      await prisma.event.update({ where: { id: event.id }, data: { status: 'draft' } });
    }
  }

  revalidatePath(`/organizador/eventos/${event.id}`);
  revalidatePath(`/e/${event.slug}`);
  return { status: 'saved', message: ticketTypeId ? 'Lote atualizado.' : 'Lote criado.' };
}

export async function deleteTicketType(eventId: string, ticketTypeId: string): Promise<FormState> {
  const { event } = await requireOwnedEvent(eventId, `/organizador/eventos/${eventId}`);
  const lot = event.ticketTypes.find((t) => t.id === ticketTypeId);
  if (!lot) return { status: 'error', message: 'Lote não encontrado.' };
  const items = await prisma.orderItem.count({ where: { ticketTypeId } });
  if (items > 0) return { status: 'error', message: 'Lote com pedidos não pode ser excluído. Oculte-o.' };
  await prisma.ticketType.delete({ where: { id: ticketTypeId } });
  revalidatePath(`/organizador/eventos/${event.id}`);
  revalidatePath(`/e/${event.slug}`);
  return { status: 'saved', message: 'Lote excluído.' };
}
