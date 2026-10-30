-- Route estimates and only the latest observed GPS point.
create table if not exists public.lusky_order_routes (
  order_id uuid primary key references public.lusky_orders(id) on delete cascade,
  geometry jsonb not null,
  distance_m numeric(12,2) not null check (distance_m >= 0),
  duration_s numeric(12,2) not null check (duration_s >= 0),
  profile text not null default 'driving-car',
  calculated_at timestamptz not null default now(),
  version integer not null default 1
);
alter table public.lusky_order_routes enable row level security;
grant select on public.lusky_order_routes to authenticated;
create policy "Participants read planned route" on public.lusky_order_routes for select to authenticated
  using (exists(select 1 from public.lusky_orders o where o.id=order_id));

