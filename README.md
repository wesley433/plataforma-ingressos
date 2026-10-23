# Plataforma de Ingressos

MVP de gestão e venda de ingressos para eventos gratuitos e pagos (estilo Sympla).
Taxa da plataforma: **5% sobre o preço de face** de ingressos pagos, repassada ao comprador ou absorvida pelo organizador. Ingressos gratuitos: R$ 0,00.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage) · Prisma · Asaas (PIX, cartão e split) · Resend.

## Status

| Sprint | Escopo | Situação |
| --- | --- | --- |
| 0 | Base do projeto, schema do banco, cálculo de taxas, QR assinado, CI | ✅ |
| 1 | Autenticação, perfis, onboarding do organizador (subconta Asaas) | — |
| 2 | Eventos e lotes | — |
| 3 | Checkout gratuito e pipeline de ingresso (QR, PDF, e-mail) | — |
| 4 | Checkout pago, split e webhooks | — |
| 5 | Check-in mobile e painel do organizador | — |
| 6 | Admin, antifraude e go-live | — |

## Rodando localmente

Requisitos: Node.js 22.18 ou mais novo.

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm test                     # regras de taxa e QR
npm run dev                  # http://localhost:3000
```

## Banco de dados (primeira vez)

1. Crie um projeto no Supabase e copie `DATABASE_URL` e `DIRECT_URL` para o `.env.local`.
2. Gere a migration inicial **sem aplicar**:
   ```bash
   npm run db:migrate -- --create-only --name init
   ```
3. Abra `prisma/migrations/<data>_init/migration.sql` e cole **no final** o conteúdo de `prisma/constraints.sql`
   (CHECKs de valores, trava contra overselling, índice que impede check-in duplo, vínculo com `auth.users`).
4. Aplique: `npm run db:migrate`.

## Onde está cada regra

| Regra | Arquivo |
| --- | --- |
| Taxa de 5% (repassada × absorvida), arredondamento, split do Asaas | `src/lib/fees.ts` |
| Token do QR Code (HMAC, sem dados pessoais) e código curto | `src/lib/ticket-token.ts` |
| Tabelas e relacionamentos | `prisma/schema.prisma` |
| Regras que só o banco garante | `prisma/constraints.sql` |

## Segurança

- Nunca versione `.env.local` nem chaves de API. Em produção, as variáveis ficam na Vercel.
- Dados de cartão nunca passam pelo servidor: o cartão é tokenizado no Asaas.
- Comece sempre pelo **sandbox** do Asaas (`ASAAS_API_URL=https://api-sandbox.asaas.com/v3`).
