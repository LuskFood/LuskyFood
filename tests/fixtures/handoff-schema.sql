create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema internal;
create table auth.users (id uuid primary key, raw_app_meta_data jsonb not null default '{}'::jsonb);
grant usage on schema auth to authenticated;
grant usage on schema internal to authenticated;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function public.lusky_current_role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('test.lusky_role', true), ''), 'customer');
$$;
create function public.lusky_can_manage() returns boolean language sql stable as $$
  select public.lusky_current_role() in ('owner','manager','staff');
$$;
create table public.lusky_orders (
  id uuid primary key, order_number bigint unique not null, created_by uuid,
  assigned_driver uuid, order_type text not null, status text not null,
  route_order integer, created_at timestamptz not null default now(), updated_at timestamptz default now(), delivered_at timestamptz,
  customer_name text not null default '', customer_phone text not null default '', items jsonb not null default '[]',
  total numeric not null default 0, payment_method text not null default 'cash', delivery_snapshot jsonb,
  delivery_address text not null default '', delivery_latitude double precision, delivery_longitude double precision
);
create table public.lusky_profiles (id uuid primary key, full_name text not null default '', display_name text not null default '', phone text not null default '', contact_preference text not null default 'app');
create table public.lusky_customer_addresses (id uuid primary key, user_id uuid, label text, zip_code text, street text, street_number text, no_number boolean, complement text, district text, city text, state text, reference text, instructions text, latitude double precision, longitude double precision, pin_confirmed_at timestamptz, is_default boolean, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.lusky_order_handoffs (order_id uuid primary key references public.lusky_orders(id), delivery_code text not null);
create table internal.lusky_delivery_attempts (order_id uuid primary key references public.lusky_orders(id), failed_attempts integer not null default 0, locked_until timestamptz);
create table public.lusky_motoboy_profiles (id uuid primary key, active boolean not null);
create table internal.lusky_motoboy_documents (user_id uuid primary key, document_valid boolean not null);
create table public.lusky_order_events (order_id uuid, from_status text, to_status text, actor_id uuid, reason text default '', created_at timestamptz default now());
alter table public.lusky_orders enable row level security;
grant select on public.lusky_orders to authenticated;
create function public.lusky_team_confirm_handoff(bigint,text,text) returns boolean language sql as $$ select true $$;
create function public.lusky_kitchen_pickup_code(bigint) returns text language sql as $$ select 'unused'::text $$;
create function public.lusky_motoboy_transition(bigint,text,text) returns boolean language sql as $$ select true $$;
create function internal.lusky_transition_assigned_order(bigint,text,text) returns boolean language sql as $$ select true $$;
grant execute on function public.lusky_team_confirm_handoff(bigint,text,text) to authenticated;
grant execute on function public.lusky_kitchen_pickup_code(bigint) to authenticated;
grant execute on function public.lusky_motoboy_transition(bigint,text,text) to authenticated;
grant execute on function internal.lusky_transition_assigned_order(bigint,text,text) to authenticated;
