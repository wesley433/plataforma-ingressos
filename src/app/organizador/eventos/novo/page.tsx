import type { Metadata } from 'next';
import { requireOrganizer } from '@/lib/organizer.ts';
import { createEvent } from '../actions.ts';
import { EventForm } from '../event-form.tsx';

export const metadata: Metadata = { title: 'Novo evento' };

export default async function NewEventPage() {
  await requireOrganizer('/organizador/eventos/novo');

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12">
      <div>
        <a href="/organizador" className="text-sm text-zinc-500 hover:underline">
          ← Painel
        </a>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Novo evento</h1>
        <p className="mt-1 text-zinc-600">O evento nasce como rascunho. Depois você cria os lotes e publica.</p>
      </div>
      <EventForm
        action={createEvent}
        submitLabel="Criar evento"
        defaults={{
          title: '',
          descriptionHtml: '',
          timezone: 'America/Sao_Paulo',
          startsLocal: '',
          endsLocal: '',
          format: 'in_person',
          venueName: '',
          zipCode: '',
          addressLine: '',
          city: '',
          state: '',
          onlineUrl: '',
          feeMode: 'pass_to_buyer',
          bannerUrl: null,
        }}
      />
    </main>
  );
}
