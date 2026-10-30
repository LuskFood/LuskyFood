create or replace function public.lusky_resolve_incident(p_incident_id bigint)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_incident public.lusky_delivery_incidents;
begin
  if auth.uid() is null or not public.lusky_can_manage() then raise exception 'Acesso restrito à equipe.' using errcode='42501'; end if;
  select * into v_incident from public.lusky_delivery_incidents where id=p_incident_id for update;
  if not found then raise exception 'Ocorrência não encontrada.' using errcode='22023'; end if;
  if v_incident.status='resolved' then return true; end if;
  update public.lusky_delivery_incidents set status='resolved',resolved_at=now() where id=p_incident_id;
  return true;
end; $$;
revoke all on function public.lusky_resolve_incident(bigint) from public, anon;
grant execute on function public.lusky_resolve_incident(bigint) to authenticated;
