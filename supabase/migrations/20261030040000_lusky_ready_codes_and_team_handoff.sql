-- Recover missing codes from older orders and guarantee both codes before delivery is ready.
insert into internal.lusky_pickup_secrets(order_id, code)
select o.id, lpad((('x' || encode(extensions.gen_random_bytes(3), 'hex'))::bit(24)::int % 1000000)::text, 6, '0')
from public.lusky_orders o
where o.order_type = 'Entrega' and o.status in ('Pronto', 'Saiu para entrega')
  and not exists (select 1 from internal.lusky_pickup_secrets s where s.order_id = o.id);

insert into public.lusky_order_handoffs(order_id, delivery_code)
select o.id, lpad((('x' || encode(extensions.gen_random_bytes(3), 'hex'))::bit(24)::int % 1000000)::text, 6, '0')
from public.lusky_orders o
where o.order_type = 'Entrega' and o.status in ('Pronto', 'Saiu para entrega')
  and not exists (select 1 from public.lusky_order_handoffs h where h.order_id = o.id);

create or replace function internal.lusky_ensure_ready_codes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.order_type = 'Entrega' and new.status = 'Pronto' then
    insert into internal.lusky_pickup_secrets(order_id, code)
    values (new.id, lpad((('x' || encode(extensions.gen_random_bytes(3), 'hex'))::bit(24)::int % 1000000)::text, 6, '0'))
    on conflict (order_id) do nothing;
    insert into public.lusky_order_handoffs(order_id, delivery_code)
    values (new.id, lpad((('x' || encode(extensions.gen_random_bytes(3), 'hex'))::bit(24)::int % 1000000)::text, 6, '0'))
    on conflict (order_id) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists lusky_ready_codes on public.lusky_orders;
create trigger lusky_ready_codes after update of status on public.lusky_orders
for each row when (new.status = 'Pronto') execute function internal.lusky_ensure_ready_codes();

-- Admin confirmation still requires the kitchen/customer code and is audited.
create or replace function public.lusky_team_confirm_handoff(p_order_number bigint, p_action text, p_code text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order public.lusky_orders; v_expected text; v_next text;
begin
  if auth.uid() is null or not public.lusky_can_manage() then
    raise exception 'Acesso restrito à equipe.' using errcode = '42501';
  end if;
  select * into v_order from public.lusky_orders where order_number = p_order_number for update;
  if not found or v_order.order_type <> 'Entrega' or v_order.assigned_driver is null then
    raise exception 'Atribua um motoboy antes de confirmar.' using errcode = '22023';
  end if;
  if p_action = 'pickup' and v_order.status = 'Pronto' then
    select code into v_expected from internal.lusky_pickup_secrets where order_id = v_order.id;
    v_next := 'Saiu para entrega';
  elsif p_action = 'delivery' and v_order.status = 'Saiu para entrega' then
    select delivery_code into v_expected from public.lusky_order_handoffs where order_id = v_order.id;
    v_next := 'Entregue';
  else
    raise exception 'Etapa indisponível para confirmação.' using errcode = '22023';
  end if;
  if v_expected is null or v_expected is distinct from trim(coalesce(p_code, '')) then return false; end if;
  update public.lusky_orders set status = v_next, updated_at = now() where id = v_order.id;
  insert into public.lusky_order_events(order_id, from_status, to_status, actor_id, reason)
  values(v_order.id, v_order.status, v_next, auth.uid(), 'Confirmação da equipe por código');
  return true;
end; $$;
revoke all on function public.lusky_team_confirm_handoff(bigint,text,text) from public, anon;
grant execute on function public.lusky_team_confirm_handoff(bigint,text,text) to authenticated;
