/** Peças de formulário compartilhadas pelo painel (sem estado). */

export const inputCls =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 aria-[invalid=true]:border-red-500';

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = '',
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <span className="text-xs text-zinc-500">{hint}</span>}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}

export function FormMessage({ status, message }: { status: string; message?: string }) {
  if (!message || status === 'idle') return null;
  const ok = status === 'saved';
  return (
    <p
      role={ok ? 'status' : 'alert'}
      className={`rounded-lg p-3 text-sm ${ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}
    >
      {message}
    </p>
  );
}

export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Rascunho', cls: 'bg-zinc-100 text-zinc-700' },
  published: { label: 'Publicado', cls: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-800' },
  finished: { label: 'Encerrado', cls: 'bg-zinc-100 text-zinc-600' },
  blocked: { label: 'Bloqueado', cls: 'bg-red-100 text-red-800' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABEL[status] ?? { label: status, cls: 'bg-zinc-100' };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
