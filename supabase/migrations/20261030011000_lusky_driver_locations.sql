create table if not exists public.lusky_driver_locations (
  driver_id uuid primary key references auth.users(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m numeric(8,2) not null check (accuracy_m between 0 and 1000),
  observed_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index if not exists lusky_driver_locations_received_idx on public.lusky_driver_locations(received_at desc);
alter table public.lusky_driver_locations enable row level security;
grant select on public.lusky_driver_locations to authenticated;
create policy "Active delivery participants read location" on public.lusky_driver_locations for select to authenticated using (
  driver_id=(select auth.uid())
  or ((select public.lusky_can_manage()) and exists(select 1 from public.lusky_orders o where o.assigned_driver=driver_id and o.status='Saiu para entrega'))
  or exists(select 1 from public.lusky_orders o where o.assigned_driver=driver_id and o.created_by=(select auth.uid()) and o.status='Saiu para entrega')
);

