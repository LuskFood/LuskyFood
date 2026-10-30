-- Manual Pix requires explicit instructions and a team confirmation before preparation.
alter table public.lusky_restaurant_settings add column if not exists manual_pix_instructions text not null default '';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lusky_manual_pix_instructions_check') then
    alter table public.lusky_restaurant_settings add constraint lusky_manual_pix_instructions_check
      check (length(manual_pix_instructions) <= 500 and (not accepts_manual_pix or length(trim(manual_pix_instructions)) >= 5));
  end if;
end $$;

alter table public.lusky_orders add column if not exists payment_status text not null default 'not_applicable';
alter table public.lusky_orders add column if not exists payment_confirmed_at timestamptz;
alter table public.lusky_orders add column if not exists payment_confirmed_by uuid references auth.users(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lusky_orders_payment_status_check') then
    alter table public.lusky_orders add constraint lusky_orders_payment_status_check
      check (payment_status in ('not_applicable','pending','confirmed'));
  end if;
end $$;
update public.lusky_orders set payment_status = 'pending'
  where payment_method = 'manual_pix' and payment_status = 'not_applicable';
create index if not exists lusky_orders_payment_pending_idx on public.lusky_orders(created_at desc)
  where payment_method = 'manual_pix' and payment_status = 'pending';
