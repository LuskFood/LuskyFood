create or replace function public.lusky_set_driver_availability(p_active boolean)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or public.lusky_current_role()<>'motoboy' then raise exception 'Acesso restrito ao motoboy.' using errcode='42501'; end if;
  if p_active is false and exists(select 1 from public.lusky_orders where assigned_driver=auth.uid() and status='Saiu para entrega') then
    raise exception 'Conclua a entrega em rota antes de ficar offline.' using errcode='22023'; end if;
  update public.lusky_motoboy_profiles set active=p_active,updated_at=now() where id=auth.uid();
  if not found then raise exception 'Perfil de motoboy não encontrado.' using errcode='22023'; end if;
  return true;
end; $$;
revoke all on function public.lusky_set_driver_availability(boolean) from public, anon;
grant execute on function public.lusky_set_driver_availability(boolean) to authenticated;
