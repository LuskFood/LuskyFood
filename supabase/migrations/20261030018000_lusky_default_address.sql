create or replace function public.lusky_set_default_address(p_address_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Entre novamente.' using errcode='42501'; end if;
  if not exists(select 1 from public.lusky_customer_addresses where id=p_address_id and user_id=auth.uid()) then raise exception 'Endereço não encontrado na sua conta.' using errcode='42501'; end if;
  update public.lusky_customer_addresses set is_default=false,updated_at=now() where user_id=auth.uid() and is_default;
  update public.lusky_customer_addresses set is_default=true,updated_at=now() where id=p_address_id and user_id=auth.uid();
  return true;
end; $$;
revoke all on function public.lusky_set_default_address(uuid) from public, anon;
grant execute on function public.lusky_set_default_address(uuid) to authenticated;
