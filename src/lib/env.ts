/** Leitura das variáveis de ambiente com mensagem clara quando faltar alguma. */

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}. Cadastre na Vercel e faça um novo deploy.`);
  return value;
}

// NEXT_PUBLIC_* precisam ser lidas literalmente para o Next embutir no bundle do navegador.
export const publicEnv = {
  appUrl: () => (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: () =>
    required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
};

export const serverEnv = {
  asaasApiUrl: () => process.env.ASAAS_API_URL ?? 'https://api-sandbox.asaas.com/v3',
  /** Opcional até a Sprint 4: sem ela, o organizador fica com pagamentos "pendentes". */
  asaasApiKey: () => process.env.ASAAS_API_KEY || null,
};
