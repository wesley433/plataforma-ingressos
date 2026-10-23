import 'server-only';
import { prisma } from '@/lib/db.ts';
import { availability, buyerUnitPriceCents } from '@/lib/events.ts';

/** Eventos publicados que ainda não terminaram, do mais próximo ao mais distante. */
export async function listPublicEvents(now = new Date()) {
  const events = await prisma.event.findMany({
    where: { status: 'published', endsAt: { gt: now } },
    orderBy: { startsAt: 'asc' },
    take: 60,
    include: { ticketTypes: true },
  });

  return events.map((e) => {
    const visible = e.ticketTypes.filter((t) => !t.isHidden);
    const prices = visible.map((t) => buyerUnitPriceCents(t.priceCents, e.feeMode));
    const onSale = visible.some((t) => availability(t, now) === 'on_sale');
    return {
      id: e.id,
      slug: e.slug,
      title: e.title,
      bannerUrl: e.bannerUrl,
      startsAt: e.startsAt,
      timezone: e.timezone,
      format: e.format,
      city: e.city,
      state: e.state,
      venueName: e.venueName,
      minPriceCents: prices.length ? Math.min(...prices) : 0,
      allFree: visible.every((t) => t.kind === 'free'),
      onSale,
    };
  });
}
