create or replace function public.lusky_confirm_manual_pix(p_order_number bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order public.lusky_orders;
begin
  if auth.uid() is null or not public.lusky_can_manage() then
    raise exception 'Acesso restrito à equipe.' using errcode = '42501';
  end if;
  select * into v_order from public.lusky_orders where order_number = p_order_number for update;
  if not found or v_order.payment_method <> 'manual_pix' then
    raise exception 'Pedido com Pix manual não encontrado.' using errcode = '22023';
  end if;
  if v_order.payment_status = 'confirmed' then return true; end if;
  update public.lusky_orders set payment_status = 'confirmed',
    payment_confirmed_at = now(), payment_confirmed_by = auth.uid(), updated_at = now()
    where id = v_order.id;
  insert into public.lusky_order_events(order_id,from_status,to_status,actor_id,reason)
    values(v_order.id,v_order.status,v_order.status,auth.uid(),'Pix manual conferido pela equipe');
  return true;
end; $$;
revoke all on function public.lusky_confirm_manual_pix(bigint) from public, anon;
grant execute on function public.lusky_confirm_manual_pix(bigint) to authenticated;
