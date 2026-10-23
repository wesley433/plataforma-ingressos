import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/roles.ts';
import { createSupabaseServerClient } from '@/lib/supabase/server.ts';

/** Destino do link mágico: troca o código pela sessão e segue para a página pedida. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL('/entrar?erro=link', origin));
}
