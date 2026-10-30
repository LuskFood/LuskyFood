create table if not exists public.lusky_delivery_incidents (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.lusky_orders(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  detail text not null check (length(trim(detail)) between 10 and 500),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create index if not exists lusky_incidents_order_idx on public.lusky_delivery_incidents(order_id,created_at desc);
alter table public.lusky_delivery_incidents enable row level security;
grant select on public.lusky_delivery_incidents to authenticated;
create policy "Participants read incidents" on public.lusky_delivery_incidents for select to authenticated
  using (exists(select 1 from public.lusky_orders o where o.id=order_id));
create or replace function public.lusky_report_incident(p_order_number bigint,p_detail text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_order public.lusky_orders;
begin
  if auth.uid() is null then raise exception 'Entre novamente.' using errcode='42501'; end if;
  select * into v_order from public.lusky_orders where order_number=p_order_number and status='Saiu para entrega';
  if not found or not (public.lusky_can_manage() or v_order.assigned_driver=auth.uid()) then raise exception 'Entrega indisponível.' using errcode='42501'; end if;
  if length(trim(coalesce(p_detail,''))) not between 10 and 500 then raise exception 'Descreva a ocorrência em 10 a 500 caracteres.' using errcode='22023'; end if;
  insert into public.lusky_delivery_incidents(order_id,actor_id,detail) values(v_order.id,auth.uid(),trim(p_detail));
  return true;
end; $$;
revoke all on function public.lusky_report_incident(bigint,text) from public, anon;
grant execute on function public.lusky_report_incident(bigint,text) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lusky_driver_locations') then
    alter publication supabase_realtime add table public.lusky_driver_locations;
  end if;
end $$;
