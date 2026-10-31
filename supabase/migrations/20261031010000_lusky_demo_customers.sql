-- Separates fictional showcase customers from authenticated people.
create table if not exists public.lusky_demo_customers (
  id uuid primary key default gen_random_uuid(),
  demo_key text not null unique,
  full_name text not null,
  contact_email text not null,
  delivery_address text not null,
  delivery_latitude double precision not null,
  delivery_longitude double precision not null,
  created_at timestamptz not null default now(),
  constraint lusky_demo_customer_email check (contact_email like '%@example.invalid')
);

alter table public.lusky_demo_customers enable row level security;
grant select on public.lusky_demo_customers to authenticated;
create policy "Team reads demo customers" on public.lusky_demo_customers
  for select to authenticated using ((select public.lusky_can_manage()));

alter table public.lusky_orders
  add column if not exists demo_customer_id uuid references public.lusky_demo_customers(id),
  add column if not exists demo_seed_key text;
create unique index if not exists lusky_orders_demo_seed_key_idx
  on public.lusky_orders(demo_seed_key) where demo_seed_key is not null;
create index if not exists lusky_orders_demo_customer_idx
  on public.lusky_orders(demo_customer_id, created_at desc) where demo_customer_id is not null;

create or replace function internal.lusky_admin_unlinked_order_page(p_limit integer default 20,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit,20),1),50);
  v_offset integer := greatest(coalesce(p_offset,0),0);
  v_result jsonb;
begin
  if auth.uid() is null or public.lusky_current_role() not in ('owner','manager','staff') then
    raise exception 'Acesso administrativo necessário.' using errcode='42501';
  end if;
  with unlinked as (
    select o.id,o.order_number,o.created_at,o.customer_name,o.customer_phone,o.order_type,o.status,
      o.items,o.total,o.payment_method,o.delivery_address
    from public.lusky_orders o left join auth.users u on u.id=o.created_by
    where o.demo_customer_id is null and coalesce(u.raw_app_meta_data->>'role','')<>'customer'
  ), counted as (select count(*)::integer as total from unlinked), page as (
    select * from unlinked order by created_at desc,id desc limit v_limit offset v_offset
  )
  select jsonb_build_object('total',counted.total,'limit',v_limit,'offset',v_offset,
    'orders',coalesce((select jsonb_agg(to_jsonb(page) order by page.created_at desc,page.id desc) from page),'[]'::jsonb))
  into v_result from counted;
  return v_result;
end;
$$;
