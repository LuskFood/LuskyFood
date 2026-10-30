-- Etapa 2: retirada confirmada pela equipe e entrega confirmada pelo motoboy.
-- Nenhum pedido ou código existente é apagado; a migração precisa de validação isolada antes de aplicação.
alter table public.lusky_order_handoffs add column if not exists consumed_at timestamptz;
alter table public.lusky_orders add column if not exists delivered_at timestamptz;

-- O motoboy vê apenas os próprios pedidos, inclusive preparo e histórico concluído.
drop policy if exists "Motoboy reads active assigned delivery" on public.lusky_orders;
drop policy if exists "Motoboy reads assigned delivery lifecycle" on public.lusky_orders;
create policy "Motoboy reads assigned delivery lifecycle" on public.lusky_orders for select to authenticated
  using ((select public.lusky_current_role())='motoboy' and assigned_driver=(select auth.uid())
    and order_type='Entrega' and status in ('Novo pedido','Preparando','Pronto','Saiu para entrega','Entregue'));

create or replace function internal.lusky_assign_driver_v2(p_order_number bigint, p_driver_id uuid, p_route_order integer default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order public.lusky_orders;
begin
  if auth.uid() is null or public.lusky_can_manage() is not true then
    raise exception 'Acesso restrito à equipe.' using errcode = '42501';
  end if;
  select * into v_order from public.lusky_orders where order_number = p_order_number for update;
  if not found or v_order.order_type <> 'Entrega' or v_order.status not in ('Novo pedido','Preparando','Pronto','Saiu para entrega') then
    raise exception 'Pedido indisponível para atribuição.' using errcode = '22023';
  end if;
  if v_order.status = 'Saiu para entrega' and p_driver_id is distinct from v_order.assigned_driver then
    raise exception 'Entrega em rota não pode trocar de motoboy.' using errcode = '22023';
  end if;
  if p_driver_id is not null and not exists (
    select 1 from public.lusky_motoboy_profiles p
    join internal.lusky_motoboy_documents d on d.user_id = p.id
    where p.id = p_driver_id and p.active and d.document_valid
  ) then raise exception 'Motoboy indisponível ou documento pendente.' using errcode = '22023'; end if;
  update public.lusky_orders set assigned_driver = p_driver_id, route_order = p_route_order, updated_at = now() where id = v_order.id;
  insert into public.lusky_order_events(order_id,from_status,to_status,actor_id,reason)
  values(v_order.id,v_order.status,v_order.status,auth.uid(),case when p_driver_id is null then 'Atribuição removida' else 'Motoboy atribuído' end);
  return true;
end; $$;
revoke all on function internal.lusky_assign_driver_v2(bigint,uuid,integer) from public, anon;
grant execute on function internal.lusky_assign_driver_v2(bigint,uuid,integer) to authenticated;
create or replace function public.lusky_assign_driver(p_order_number bigint, p_driver_id uuid, p_route_order integer default null)
returns boolean language sql security invoker set search_path = '' as $$
  select internal.lusky_assign_driver_v2(p_order_number,p_driver_id,p_route_order);
$$;
revoke all on function public.lusky_assign_driver(bigint,uuid,integer) from public, anon;
grant execute on function public.lusky_assign_driver(bigint,uuid,integer) to authenticated;

create or replace function internal.lusky_team_confirm_pickup_v2(p_order_number bigint, p_driver_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order public.lusky_orders;
begin
  if auth.uid() is null or public.lusky_can_manage() is not true then
    raise exception 'Acesso restrito à equipe.' using errcode = '42501';
  end if;
  select * into v_order from public.lusky_orders where order_number = p_order_number for update;
  if not found or v_order.order_type <> 'Entrega' or v_order.status <> 'Pronto' then
    raise exception 'Pedido não está pronto para retirada.' using errcode = '22023';
  end if;
  if p_driver_id is null or v_order.assigned_driver is distinct from p_driver_id then
    raise exception 'Confira o motoboy atribuído ao pedido.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.lusky_motoboy_profiles p join internal.lusky_motoboy_documents d on d.user_id=p.id where p.id=p_driver_id and p.active and d.document_valid) then
    raise exception 'Motoboy indisponível ou documento pendente.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.lusky_order_handoffs h where h.order_id=v_order.id and h.consumed_at is null) then
    raise exception 'Código de entrega indisponível. Contate o suporte.' using errcode = '22023';
  end if;
  update public.lusky_orders set status='Saiu para entrega', updated_at=now() where id=v_order.id;
  insert into public.lusky_order_events(order_id,from_status,to_status,actor_id,reason)
  values(v_order.id,'Pronto','Saiu para entrega',auth.uid(),'Retirada confirmada pela equipe após conferir o motoboy');
  return true;
end; $$;
revoke all on function internal.lusky_team_confirm_pickup_v2(bigint,uuid) from public, anon;
grant execute on function internal.lusky_team_confirm_pickup_v2(bigint,uuid) to authenticated;
create or replace function public.lusky_team_confirm_pickup(p_order_number bigint, p_driver_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  select internal.lusky_team_confirm_pickup_v2(p_order_number,p_driver_id);
$$;
revoke all on function public.lusky_team_confirm_pickup(bigint,uuid) from public, anon;
grant execute on function public.lusky_team_confirm_pickup(bigint,uuid) to authenticated;

-- Retira caminhos antigos que permitiam confirmar entrega sem o mesmo limite de tentativas.
revoke all on function public.lusky_team_confirm_handoff(bigint,text,text) from public, anon, authenticated;
revoke all on function public.lusky_kitchen_pickup_code(bigint) from public, anon, authenticated;
revoke all on function public.lusky_motoboy_transition(bigint,text,text) from public, anon, authenticated;
revoke all on function internal.lusky_transition_assigned_order(bigint,text,text) from public, anon, authenticated;

create or replace function internal.lusky_confirm_handoff_v2(p_order_number bigint,p_action text,p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order public.lusky_orders; v_attempt internal.lusky_delivery_attempts; v_expected text;
begin
  if auth.uid() is null or public.lusky_current_role() is distinct from 'motoboy' then
    raise exception 'Acesso restrito ao motoboy.' using errcode = '42501';
  end if;
  if p_action is distinct from 'delivery' then
    raise exception 'A retirada deve ser confirmada pela equipe.' using errcode = '22023';
  end if;
  select * into v_order from public.lusky_orders
    where order_number=p_order_number and assigned_driver=auth.uid() and order_type='Entrega' for update;
  if not found then raise exception 'Pedido não atribuído.' using errcode='42501'; end if;
  if v_order.status <> 'Saiu para entrega' then raise exception 'Entrega indisponível para confirmação.' using errcode='22023'; end if;
  insert into internal.lusky_delivery_attempts(order_id) values(v_order.id) on conflict do nothing;
  select * into v_attempt from internal.lusky_delivery_attempts where order_id=v_order.id for update;
  if v_attempt.locked_until > now() then raise exception 'Código temporariamente bloqueado. Tente mais tarde.' using errcode='22023'; end if;
  select delivery_code into v_expected from public.lusky_order_handoffs where order_id=v_order.id and consumed_at is null;
  if v_expected is null then raise exception 'Código de entrega indisponível.' using errcode='22023'; end if;
  if coalesce(p_code,'') !~ '^[0-9]{6}$' or v_expected is distinct from p_code then
    update internal.lusky_delivery_attempts
      set failed_attempts=case when failed_attempts>=4 then 0 else failed_attempts+1 end,
          locked_until=case when failed_attempts>=4 then now()+interval '15 minutes' else null end
      where order_id=v_order.id;
    return false;
  end if;
  update public.lusky_order_handoffs set consumed_at=now() where order_id=v_order.id and consumed_at is null;
  update public.lusky_orders set status='Entregue',delivered_at=now(),updated_at=now() where id=v_order.id;
  insert into public.lusky_order_events(order_id,from_status,to_status,actor_id,reason)
  values(v_order.id,'Saiu para entrega','Entregue',auth.uid(),'Entrega confirmada pelo motoboy');
  return true;
end; $$;
revoke all on function internal.lusky_confirm_handoff_v2(bigint,text,text) from public, anon;
grant execute on function internal.lusky_confirm_handoff_v2(bigint,text,text) to authenticated;
create or replace function public.lusky_confirm_handoff(p_order_number bigint,p_action text,p_code text)
returns boolean language sql security invoker set search_path = '' as $$
  select internal.lusky_confirm_handoff_v2(p_order_number,p_action,p_code);
$$;
revoke all on function public.lusky_confirm_handoff(bigint,text,text) from public, anon;
grant execute on function public.lusky_confirm_handoff(bigint,text,text) to authenticated;

create or replace function internal.lusky_customer_delivery_code_v2(p_order_number bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if auth.uid() is null or public.lusky_current_role() is distinct from 'customer' then
    raise exception 'Faça login na conta do cliente para consultar o código.' using errcode='42501';
  end if;
  select h.delivery_code into v_code from public.lusky_order_handoffs h
    join public.lusky_orders o on o.id=h.order_id
    where o.order_number=p_order_number and o.created_by=auth.uid() and o.status='Saiu para entrega' and h.consumed_at is null;
  return v_code;
end; $$;
revoke all on function internal.lusky_customer_delivery_code_v2(bigint) from public, anon;
grant execute on function internal.lusky_customer_delivery_code_v2(bigint) to authenticated;
create or replace function public.lusky_customer_delivery_code(p_order_number bigint)
returns text language sql security invoker set search_path = '' as $$
  select internal.lusky_customer_delivery_code_v2(p_order_number);
$$;
revoke all on function public.lusky_customer_delivery_code(bigint) from public, anon;
grant execute on function public.lusky_customer_delivery_code(bigint) to authenticated;
