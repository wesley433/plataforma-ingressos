import type { Metadata } from 'next';
import { prisma } from '@/lib/db.ts';
import { formatEventDate, publishProblems, utcToZonedLocalInput } from '@/lib/events.ts';
import { requireOwnedEvent } from '@/lib/organizer.ts';
import { updateEvent } from '../actions.ts';
import { EventForm } from '../event-form.tsx';
import { PublishControls } from '../publish-controls.tsx';
import { TicketTypesManager, type TicketTypeRow } from '../ticket-types.tsx';
import { StatusBadge } from '../ui.tsx';

export const metadata: Metadata = { title: 'Editar evento' };

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ criado?: string; aviso?: string }>;
}) {
  const { id } = await params;
  const { criado, aviso } = await searchParams;
  const { event } = await requireOwnedEvent(id, `/organizador/eventos/${id}`);
  const owner = await prisma.organizerAccount.findUnique({ where: { id: event.organizerId } });
  const tz = event.timezone;

  const problems = publishProblems(
    { ...event, ticketTypes: event.ticketTypes, paymentsActive: Boolean(owner?.gatewayWalletId) },
    new Date(),
  );

  const lots: TicketTypeRow[] = event.ticketTypes.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    kind: t.kind,
    priceCents: t.priceCents,
    quantityTotal: t.quantityTotal,
    quantitySold: t.quantitySold,
    quantityReserved: t.quantityReserved,
    maxPerOrder: t.maxPerOrder,
    salesStartAt: t.salesStartAt?.toISOString() ?? null,
    salesEndAt: t.salesEndAt?.toISOString() ?? null,
    salesStartLocal: t.salesStartAt ? utcToZonedLocalInput(t.salesStartAt, tz) : '',
    salesEndLocal: t.salesEndAt ? utcToZonedLocalInput(t.salesEndAt, tz) : '',
    isHidden: t.isHidden,
  }));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12">
      <div className="flex flex-col gap-3">
        <a href="/organizador" className="text-sm text-zinc-500 hover:underline">
          ← Painel
        </a>
        {criado && (
          <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
            Evento criado como rascunho. Agora adicione os lotes de ingressos e publique.
          </p>
        )}
        {aviso === 'banner' && (
          <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            O evento foi criado, mas o banner não foi enviado. Tente de novo abaixo.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{event.title}</h1>
          <StatusBadge status={event.status} />
        </div>
        <p className="text-zinc-600">{formatEventDate(event.startsAt, tz)}</p>
        <PublishControls eventId={event.id} status={event.status} publicPath={`/e/${event.slug}`} problems={problems} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Lotes de ingressos</h2>
        <TicketTypesManager eventId={event.id} feeMode={event.feeMode} lots={lots} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Detalhes do evento</h2>
        <EventForm
          action={updateEvent.bind(null, event.id)}
          submitLabel="Salvar alterações"
          defaults={{
            title: event.title,
            descriptionHtml: event.descriptionHtml,
            timezone: tz,
            startsLocal: utcToZonedLocalInput(event.startsAt, tz),
            endsLocal: utcToZonedLocalInput(event.endsAt, tz),
            format: event.format,
            venueName: event.venueName ?? '',
            zipCode: event.zipCode ?? '',
            addressLine: event.addressLine ?? '',
            city: event.city ?? '',
            state: event.state ?? '',
            onlineUrl: event.onlineUrl ?? '',
            feeMode: event.feeMode,
            bannerUrl: event.bannerUrl,
          }}
        />
      </section>
    </main>
  );
}
