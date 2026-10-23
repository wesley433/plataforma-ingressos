-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('participant', 'organizer', 'admin');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('draft', 'published', 'cancelled', 'finished', 'blocked');

-- CreateEnum
CREATE TYPE "event_format" AS ENUM ('in_person', 'online');

-- CreateEnum
CREATE TYPE "fee_mode" AS ENUM ('pass_to_buyer', 'absorb');

-- CreateEnum
CREATE TYPE "ticket_kind" AS ENUM ('free', 'paid');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'awaiting_payment', 'paid', 'expired', 'cancelled', 'refunded', 'chargeback');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('pix', 'credit_card');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'confirmed', 'received', 'overdue', 'refunded', 'chargeback', 'deleted');

-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('pending', 'valid', 'checked_in', 'cancelled');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" CHAR(11),
    "phone" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'participant',
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizer_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "legal_name" TEXT NOT NULL,
    "document" VARCHAR(14) NOT NULL,
    "gateway_provider" TEXT NOT NULL DEFAULT 'asaas',
    "gateway_account_id" TEXT,
    "gateway_wallet_id" TEXT,
    "gateway_api_key_enc" BYTEA,
    "webhook_token_hash" TEXT,
    "kyc_status" TEXT NOT NULL DEFAULT 'pending',
    "phone" VARCHAR(11),
    "gateway_onboarding" JSONB,
    "gateway_last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizer_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizer_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description_html" TEXT NOT NULL,
    "banner_url" TEXT,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "format" "event_format" NOT NULL,
    "venue_name" TEXT,
    "address_line" TEXT,
    "city" TEXT,
    "state" CHAR(2),
    "zip_code" CHAR(8),
    "online_url" TEXT,
    "fee_mode" "fee_mode" NOT NULL DEFAULT 'pass_to_buyer',
    "status" "event_status" NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "ticket_kind" NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "quantity_total" INTEGER NOT NULL,
    "quantity_sold" INTEGER NOT NULL DEFAULT 0,
    "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
    "min_per_order" SMALLINT NOT NULL DEFAULT 1,
    "max_per_order" SMALLINT NOT NULL DEFAULT 10,
    "sales_start_at" TIMESTAMPTZ,
    "sales_end_at" TIMESTAMPTZ,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "event_id" UUID NOT NULL,
    "buyer_id" UUID,
    "buyer_name" TEXT NOT NULL,
    "buyer_email" CITEXT NOT NULL,
    "buyer_cpf" CHAR(11),
    "buyer_phone" TEXT,
    "status" "order_status" NOT NULL DEFAULT 'pending',
    "fee_mode" "fee_mode" NOT NULL,
    "fee_rate_bps" INTEGER NOT NULL DEFAULT 500,
    "subtotal_cents" INTEGER NOT NULL,
    "platform_fee_cents" INTEGER NOT NULL,
    "buyer_total_cents" INTEGER NOT NULL,
    "organizer_gross_cents" INTEGER NOT NULL,
    "processing_fee_cents" INTEGER,
    "organizer_net_cents" INTEGER,
    "reserved_until" TIMESTAMPTZ,
    "paid_at" TIMESTAMPTZ,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "ticket_type_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "unit_price_cents" INTEGER NOT NULL,
    "unit_fee_cents" INTEGER NOT NULL,
    "attendee_name" TEXT NOT NULL,
    "attendee_email" CITEXT NOT NULL,
    "attendee_cpf" CHAR(11),
    "ticket_code" TEXT NOT NULL,
    "qr_nonce" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" "ticket_status" NOT NULL DEFAULT 'pending',
    "issued_at" TIMESTAMPTZ,
    "pdf_path" TEXT,
    "email_sent_at" TIMESTAMPTZ,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'asaas',
    "provider_payment_id" TEXT NOT NULL,
    "method" "payment_method" NOT NULL,
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "amount_cents" INTEGER NOT NULL,
    "net_amount_cents" INTEGER,
    "split_payload" JSONB NOT NULL,
    "pix_copy_paste" TEXT,
    "pix_qr_image" TEXT,
    "pix_expires_at" TIMESTAMPTZ,
    "card_brand" TEXT,
    "card_last4" CHAR(4),
    "confirmed_at" TIMESTAMPTZ,
    "refunded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_item_id" UUID,
    "event_id" UUID NOT NULL,
    "operator_id" UUID NOT NULL,
    "method" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "device_info" TEXT,
    "scanned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs_outbox" (
    "id" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "run_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,

    CONSTRAINT "jobs_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizer_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "provider_transfer_id" TEXT,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_staff" (
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'checkin',

    CONSTRAINT "event_staff_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_accounts_user_id_key" ON "organizer_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_accounts_gateway_account_id_key" ON "organizer_accounts"("gateway_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizer_accounts_gateway_wallet_id_key" ON "organizer_accounts"("gateway_wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_public_idx" ON "events"("status", "starts_at");

-- CreateIndex
CREATE INDEX "ticket_types_event_idx" ON "ticket_types"("event_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_event_status_idx" ON "orders"("event_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_ticket_code_key" ON "order_items"("ticket_code");

-- CreateIndex
CREATE INDEX "order_items_event_idx" ON "order_items"("event_id", "status");

-- CreateIndex
CREATE INDEX "order_items_attendee_idx" ON "order_items"("event_id", "attendee_name");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payments_order_idx" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_provider_event_id_key" ON "webhook_events"("provider", "provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_outbox_dedupe_key_key" ON "jobs_outbox"("dedupe_key");

-- AddForeignKey
ALTER TABLE "organizer_accounts" ADD CONSTRAINT "organizer_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizer_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "organizer_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff" ADD CONSTRAINT "event_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ═══ Regras que o Prisma não expressa (prisma/constraints.sql) ═══

-- users.id aponta para o Supabase Auth
alter table users
  add constraint users_auth_fk foreign key (id) references auth.users(id) on delete cascade;

alter table organizer_accounts
  add constraint organizer_kyc_chk check (kyc_status in ('pending','approved','rejected'));

alter table events
  add constraint events_dates_chk check (ends_at > starts_at),
  add constraint events_format_chk check (
    (format = 'in_person' and address_line is not null)
    or (format = 'online' and online_url is not null)
  );

-- Trava contra overselling: a reserva é um UPDATE condicional que respeita este CHECK
alter table ticket_types
  add constraint ticket_types_price_chk check (
    (kind = 'free' and price_cents = 0) or (kind = 'paid' and price_cents > 0)
  ),
  add constraint ticket_types_qty_chk check (
    quantity_total > 0
    and quantity_sold >= 0
    and quantity_reserved >= 0
    and quantity_sold + quantity_reserved <= quantity_total
  ),
  add constraint ticket_types_per_order_chk check (min_per_order >= 1 and max_per_order >= min_per_order);

alter table orders
  add constraint orders_totals_chk check (buyer_total_cents = organizer_gross_cents + platform_fee_cents),
  add constraint orders_nonneg_chk check (
    subtotal_cents >= 0 and platform_fee_cents >= 0 and buyer_total_cents >= 0
  );

create index orders_expiring_idx on orders (reserved_until)
  where status in ('pending','awaiting_payment');

alter table checkins
  add constraint checkins_method_chk check (method in ('qr','manual')),
  add constraint checkins_result_chk check (
    result in ('ok','already_used','invalid','wrong_event','cancelled')
  );

-- No máximo UMA leitura 'ok' por ingresso, mesmo com dois celulares ao mesmo tempo
create unique index checkins_single_ok on checkins (order_item_id) where result = 'ok';

alter table webhook_events
  add constraint webhook_events_status_chk check (status in ('received','processed','ignored','failed'));

alter table withdrawals
  add constraint withdrawals_amount_chk check (amount_cents > 0),
  add constraint withdrawals_status_chk check (status in ('requested','processing','done','failed'));

alter table moderation_actions
  add constraint moderation_target_chk check (target_type in ('event','user','order'));

-- ═══ Sincroniza auth.users (Supabase Auth) → public.users ═══
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    return new;
  end if;
  insert into public.users (id, email, name, updated_at)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ═══ RLS ligado em todas as tabelas ═══
-- O app acessa o banco pelo servidor (Prisma, dono das tabelas). Sem políticas,
-- a API pública do Supabase não lê nem grava nada. Políticas entram quando forem usadas.
alter table users enable row level security;
alter table organizer_accounts enable row level security;
alter table events enable row level security;
alter table ticket_types enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table checkins enable row level security;
alter table webhook_events enable row level security;
alter table jobs_outbox enable row level security;
alter table withdrawals enable row level security;
alter table event_staff enable row level security;
alter table moderation_actions enable row level security;
