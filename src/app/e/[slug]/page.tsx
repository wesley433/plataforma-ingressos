import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getCurrentUser } from '@/lib/auth.ts';
import { prisma } from '@/lib/db.ts';
import { AVAILABILITY_LABEL, availability, buyerUnitPriceCents, formatEventDate } from '@/lib/events.ts';
import { platformFee } from '@/lib/fees.ts';
import { formatBRL } from '@/lib/money.ts';
import { plainText, sanitizeDescription } from '@/lib/sanitize.ts';

const loadEvent = cache(async (slug: string) =>
  prisma.event.findUnique({
    where: { slug },
    include: {
      ticketTypes: { where: { isHidden: false }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
      organizer: { select: { legalName: true, userId: true } },
    },
  }),
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event || event.status !== 'published') return { title: 'Evento', robots: { index: false } };
  const description = plainText(event.descriptionHtml) || `Ingressos para ${event.title}`;
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, images: event.bannerUrl ? [event.bannerUrl] : [] },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await loadEvent(slug);
  if (!event) notFound();

  // Rascunho só aparece para o dono ou admin (pré-visualização).
  const isPublic = event.status === 'published';
  if (!isPublic) {
    const user = await getCurrentUser();
    const canPreview = user && (user.role === 'admin' || user.id === event.organizer.userId);
    if (!canPreview) notFound();
  }

  const now = new Date();
  const tz = event.timezone;
  const place =
    event.format === 'online'
      ? 'Evento online · o link de acesso fica disponível para quem tiver ingresso.'
      : [event.venueName, event.addressLine, event.city && `${event.city}${event.state ? ` - ${event.state}` : ''}`]
          .filter(Boolean)
          .join(' · ');
  const mapsUrl =
    event.format === 'in_person' && event.addressLine
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [event.venueName, event.addressLine, event.city, event.state].filter(Boolean).join(', '),
        )}`
      : null;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      {!isPublic && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Pré-visualização: este evento ainda é um rascunho e só você consegue ver esta página.
        </p>
      )}

      {event.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.bannerUrl} alt="" className="aspect-[40/21] w-full rounded-2xl object-cover" />
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <p className="font-medium text-brand-700">{formatEventDate(event.startsAt, tz)}</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
            <p className="text-zinc-600">
              {place}
              {mapsUrl && (
                <>
                  {' '}
                  ·{' '}
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="underline">
                    ver no mapa
                  </a>
                </>
              )}
            </p>
            <p className="text-sm text-zinc-500">
              Termina em {formatEventDate(event.endsAt, tz)} · Organizado por {event.organizer.legalName}
            </p>
          </header>

          {event.descriptionHtml ? (
            <div className="rich-text" dangerouslySetInnerHTML={{ __html: sanitizeDescription(event.descriptionHtml) }} />
          ) : (
            <p className="text-zinc-500">O organizador ainda não escreveu uma descrição.</p>
          )}
        </article>

        <aside className="flex flex-col gap-3 self-start rounded-2xl border border-zinc-200 p-5 lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold">Ingressos</h2>
          {event.ticketTypes.length === 0 && <p className="text-sm text-zinc-500">Nenhum lote disponível.</p>}
          <ul className="flex flex-col divide-y divide-zinc-100">
            {event.ticketTypes.map((t) => {
              const a = availability(t, now);
              const price = buyerUnitPriceCents(t.priceCents, event.feeMode);
              return (
                <li key={t.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    {t.description && <p className="text-sm text-zinc-500">{t.description}</p>}
                    {a !== 'on_sale' && <p className="text-xs font-medium text-amber-700">{AVAILABILITY_LABEL[a]}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{t.kind === 'free' ? 'Grátis' : formatBRL(price)}</p>
                    {t.kind === 'paid' && event.feeMode === 'pass_to_buyer' && (
                      <p className="text-xs text-zinc-500">
                        {formatBRL(t.priceCents)} + {formatBRL(platformFee(t.priceCents))} taxa
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled
            className="mt-2 rounded-lg bg-brand-600 px-4 py-3 font-medium text-white opacity-60"
            title="As inscrições abrem na próxima etapa da plataforma"
          >
            Inscrições em breve
          </button>
        </aside>
      </div>
    </main>
  );
}
