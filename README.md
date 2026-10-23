# Plataforma de Ingressos

MVP de gestão e venda de ingressos para eventos gratuitos e pagos (estilo Sympla).
Taxa da plataforma: **5% sobre o preço de face** de ingressos pagos, repassada ao comprador ou absorvida pelo organizador. Ingressos gratuitos: R$ 0,00.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage) · Prisma · Asaas (PIX, cartão e split) · Resend.

## Status

| Sprint | Escopo | Situação |
| --- | --- | --- |
| 0 | Base do projeto, schema do banco, cálculo de taxas, QR assinado, CI | ✅ |
| 1 | Autenticação, perfis, onboarding do organizador (subconta Asaas) | ✅ |
| 2 | Eventos e lotes | ✅ |
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

## Banco de dados

As migrations ficam em `prisma/migrations` e são aplicadas **automaticamente em cada deploy da Vercel**
(`vercel-build` roda `prisma migrate deploy` antes do build). A migration inicial inclui as regras que o
Prisma não expressa: CHECKs de valores, trava contra overselling, índice que impede check-in duplo,
gatilho que cria o usuário em `users` quando alguém se cadastra no Supabase Auth e RLS em todas as tabelas.

Para criar uma nova migration localmente: `npm run db:migrate -- --name descricao`.

## Onde está cada regra

| Regra | Arquivo |
| --- | --- |
| Taxa de 5% (repassada × absorvida), arredondamento, split do Asaas | `src/lib/fees.ts` |
| Token do QR Code (HMAC, sem dados pessoais) e código curto | `src/lib/ticket-token.ts` |
| Tabelas e relacionamentos | `prisma/schema.prisma` |
| Regras que só o banco garante | `prisma/migrations/*_init/migration.sql` (fim do arquivo) |

## Segurança

- Nunca versione `.env.local` nem chaves de API. Em produção, as variáveis ficam na Vercel.
- Dados de cartão nunca passam pelo servidor: o cartão é tokenizado no Asaas.
- Comece sempre pelo **sandbox** do Asaas (`ASAAS_API_URL=https://api-sandbox.asaas.com/v3`).
