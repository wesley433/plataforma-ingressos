import { FEE_PERCENT_LABEL } from '@/lib/fees.ts';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-16 sm:px-6">
      <header className="flex flex-col gap-4">
        <span className="w-fit rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          Sprint 0 · base do projeto
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Plataforma de Ingressos</h1>
        <p className="text-lg text-zinc-600">
          Eventos gratuitos sem custo. Eventos pagos com taxa de {FEE_PERCENT_LABEL}, repassada ao comprador ou
          absorvida pelo organizador.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Participante', text: 'Compra com PIX ou cartão e recebe o ingresso com QR Code por e-mail.' },
          { title: 'Organizador', text: 'Cria eventos e lotes, acompanha vendas e faz check-in pelo celular.' },
          { title: 'Administrador', text: 'Acompanha GMV, receita de taxas e modera eventos.' },
        ].map((card) => (
          <article key={card.title} className="rounded-xl border border-zinc-200 p-5">
            <h2 className="font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">{card.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
