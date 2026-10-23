import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth.ts';
import { prisma } from '@/lib/db.ts';
import { OnboardingForm } from './onboarding-form.tsx';

export const metadata: Metadata = { title: 'Quero organizar eventos' };

export default async function OrganizerOnboardingPage() {
  const user = await requireUser('/organizador/cadastro');
  const existing = await prisma.organizerAccount.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (existing) redirect('/organizador');

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Quero organizar eventos</h1>
        <p className="mt-2 text-zinc-600">
          Preencha uma vez. Eventos gratuitos não têm custo; nos pagos, a taxa da plataforma é de 5% por ingresso.
        </p>
      </div>
      <OnboardingForm defaultName={user.name} />
    </main>
  );
}
