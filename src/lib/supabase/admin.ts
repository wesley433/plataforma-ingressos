import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env.ts';

/** Cliente com a chave secreta: só no servidor, para Storage e tarefas administrativas. */
export function createSupabaseAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error('Variável de ambiente ausente: SUPABASE_SECRET_KEY');
  return createClient(publicEnv.supabaseUrl(), secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const BANNER_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const BANNER_MAX_BYTES = 4 * 1024 * 1024;

export function bannerProblem(file: File): string | null {
  if (!BANNER_TYPES[file.type]) return 'O banner deve ser JPG, PNG ou WebP.';
  if (file.size > BANNER_MAX_BYTES) return 'O banner deve ter no máximo 4 MB.';
  return null;
}

/** Envia o banner para o bucket público "banners" e devolve a URL pública. */
export async function uploadBanner(eventId: string, file: File): Promise<string> {
  const ext = BANNER_TYPES[file.type] ?? 'jpg';
  const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from('banners')
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false, cacheControl: '31536000' });
  if (error) throw new Error(`Falha ao enviar o banner: ${error.message}`);
  return supabase.storage.from('banners').getPublicUrl(path).data.publicUrl;
}
