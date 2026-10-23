-- Regras que o Prisma não expressa. Cole no fim da primeira migration
-- (npm run db:migrate -- --create-only --name init) antes de aplicá-la.

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
