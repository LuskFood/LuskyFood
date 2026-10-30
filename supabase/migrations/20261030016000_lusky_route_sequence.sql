create or replace function public.lusky_set_route_sequence(p_driver_id uuid,p_order_numbers bigint[])
returns boolean language plpgsql security definer set search_path='' as $$
declare v_count integer; v_number bigint; v_position integer := 0;
begin
  if auth.uid() is null or not public.lusky_can_manage() then raise exception 'Acesso restrito à equipe.' using errcode='42501'; end if;
  if p_driver_id is null or coalesce(array_length(p_order_numbers,1),0) not between 2 and 8 then raise exception 'Selecione de 2 a 8 entregas.' using errcode='22023'; end if;
  if exists(select 1 from unnest(p_order_numbers) n group by n having count(*)>1) then raise exception 'A sequência contém pedidos repetidos.' using errcode='22023'; end if;
  select count(*) into v_count from public.lusky_orders where assigned_driver=p_driver_id and status='Pronto' and order_type='Entrega';
  if v_count<>array_length(p_order_numbers,1) then raise exception 'A sequência precisa incluir todas as entregas prontas do motoboy.' using errcode='22023'; end if;
  if exists(select 1 from unnest(p_order_numbers) n left join public.lusky_orders o on o.order_number=n where o.id is null or o.assigned_driver is distinct from p_driver_id or o.status<>'Pronto' or o.order_type<>'Entrega') then
    raise exception 'Um pedido não pertence à rota pronta do motoboy.' using errcode='22023'; end if;
  foreach v_number in array p_order_numbers loop
    v_position := v_position + 1;
    update public.lusky_orders set route_order=v_position,updated_at=now() where order_number=v_number and assigned_driver=p_driver_id and status='Pronto';
    insert into public.lusky_order_events(order_id,from_status,to_status,actor_id,reason)
      select id,status,status,auth.uid(),'Sequência da rota definida: '||v_position from public.lusky_orders where order_number=v_number;
  end loop;
  return true;
end; $$;
revoke all on function public.lusky_set_route_sequence(uuid,bigint[]) from public, anon;
grant execute on function public.lusky_set_route_sequence(uuid,bigint[]) to authenticated;
