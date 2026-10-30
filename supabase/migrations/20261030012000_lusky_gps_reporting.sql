create or replace function public.lusky_report_location(p_latitude double precision,p_longitude double precision,p_accuracy_m numeric,p_observed_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or public.lusky_current_role()<>'motoboy' then raise exception 'Acesso restrito ao motoboy.' using errcode='42501'; end if;
  if not exists(select 1 from public.lusky_orders where assigned_driver=auth.uid() and status='Saiu para entrega') then raise exception 'Nenhuma entrega ativa para compartilhar posição.' using errcode='22023'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 or p_accuracy_m not between 0 and 1000 or p_observed_at not between now()-interval '2 minutes' and now()+interval '10 seconds' then
    raise exception 'Posição GPS inválida ou antiga.' using errcode='22023'; end if;
  insert into public.lusky_driver_locations(driver_id,latitude,longitude,accuracy_m,observed_at)
  values(auth.uid(),p_latitude,p_longitude,p_accuracy_m,p_observed_at)
  on conflict(driver_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,accuracy_m=excluded.accuracy_m,observed_at=excluded.observed_at,received_at=now()
  where public.lusky_driver_locations.received_at < now()-interval '10 seconds';
  return true;
end; $$;
revoke all on function public.lusky_report_location(double precision,double precision,numeric,timestamptz) from public, anon;
grant execute on function public.lusky_report_location(double precision,double precision,numeric,timestamptz) to authenticated;

create or replace function internal.lusky_clear_finished_location()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status='Saiu para entrega' and new.status<>'Saiu para entrega' and old.assigned_driver is not null
    and not exists(select 1 from public.lusky_orders o where o.assigned_driver=old.assigned_driver and o.status='Saiu para entrega') then
    delete from public.lusky_driver_locations where driver_id=old.assigned_driver;
  end if;
  return new;
end; $$;
revoke all on function internal.lusky_clear_finished_location() from public, anon, authenticated;
drop trigger if exists lusky_clear_finished_location on public.lusky_orders;
create trigger lusky_clear_finished_location after update of status on public.lusky_orders
for each row execute function internal.lusky_clear_finished_location();

