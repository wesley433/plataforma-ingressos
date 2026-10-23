import Link from 'next/link';
import { formatEventDate } from '@/lib/events.ts';
import { formatBRL } from '@/lib/money.ts';
import { listPublicEvents } from '@/lib/public-events.ts';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const events = await listPublicEvents().catch(() => []);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-12">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Próximos eventos</h1>
        <p className="text-lg text-zinc-600">Encontre um evento e garanta seu ingresso em poucos cliques.</p>
      </header>

      {events.length === 0 ? (
        <section className="flex flex-col items-start gap-3 rounded-2xl bg-brand-50 p-8">
          <h2 className="text-xl font-semibold">Nenhum evento publicado ainda</h2>
          <p className="text-zinc-700">Organiza eventos? Publique o seu: gratuito sem custo, pago com taxa de 5%.</p>
          <Link href="/organizador/cadastro" className="rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white hover:bg-brand-700">
            Quero organizar eventos
          </Link>
        </section>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/e/${e.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 hover:shadow-md">
                <div className="aspect-[40/21] bg-gradient-to-br from-brand-100 to-brand-50">
                  {e.bannerUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.bannerUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-4">
                  <p className="text-sm font-medium text-brand-700">{formatEventDate(e.startsAt, e.timezone)}</p>
                  <h2 className="font-semibold leading-snug group-hover:underline">{e.title}</h2>
                  <p className="text-sm text-zinc-600">
                    {e.format === 'online' ? 'Online' : [e.venueName, e.city && `${e.city}${e.state ? `/${e.state}` : ''}`].filter(Boolean).join(' · ')}
                  </p>
                  <p className="mt-auto pt-2 text-sm font-medium">
                    {!e.onSale ? 'Vendas fechadas' : e.allFree ? 'Gratuito' : `A partir de ${formatBRL(e.minPriceCents)}`}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
