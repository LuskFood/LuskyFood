-- Administrative customer history is account-attributed, never inferred by name/phone.
create index if not exists lusky_orders_creator_history_idx
  on public.lusky_orders(created_by, created_at desc, id);

create or replace function internal.lusky_admin_customer_directory(
  p_query text default '', p_limit integer default 25, p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit,25),1),50);
  v_offset integer := greatest(coalesce(p_offset,0),0);
  v_query text := lower(trim(coalesce(p_query,'')));
  v_result jsonb;
begin
  if auth.uid() is null or public.lusky_current_role() not in ('owner','manager','staff') then
    raise exception 'Acesso administrativo necessário.' using errcode='42501';
  end if;
  with eligible as (
    select p.id, coalesce(nullif(p.full_name,''),p.display_name,'Cliente') as full_name,
      p.phone, p.contact_preference
    from public.lusky_profiles p
    join auth.users u on u.id=p.id
    where u.raw_app_meta_data->>'role'='customer'
      and (v_query='' or lower(coalesce(p.full_name,p.display_name,'')) like '%'||v_query||'%'
        or coalesce(p.phone,'') like '%'||regexp_replace(v_query,'\D','','g')||'%')
  ), counted as (
    select count(*)::integer as total from eligible
  ), page as (
    select e.* from eligible e order by e.full_name,e.id limit v_limit offset v_offset
  ), customers as (
    select p.id,p.full_name,p.phone,p.contact_preference,
      count(o.id)::integer as order_count,
      count(o.id) filter(where o.status='Entregue')::integer as completed_count,
      count(o.id) filter(where o.status='Cancelado')::integer as cancelled_count,
      coalesce(sum(o.total) filter(where o.status='Entregue'),0)::numeric(12,2) as completed_total,
      max(o.created_at) filter(where o.status='Entregue') as last_order_at
    from page p left join public.lusky_orders o on o.created_by=p.id
    group by p.id,p.full_name,p.phone,p.contact_preference
  )
  select jsonb_build_object('total',counted.total,'limit',v_limit,'offset',v_offset,
    'customers',coalesce((select jsonb_agg(to_jsonb(c) order by c.full_name,c.id) from customers c),'[]'::jsonb))
  into v_result from counted;
  return v_result;
end;
$$;
revoke all on function internal.lusky_admin_customer_directory(text,integer,integer) from public,anon;
grant execute on function internal.lusky_admin_customer_directory(text,integer,integer) to authenticated;

create or replace function internal.lusky_admin_customer_history(
  p_customer_id uuid, p_limit integer default 20, p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit,20),1),50);
  v_offset integer := greatest(coalesce(p_offset,0),0);
  v_result jsonb;
begin
  if auth.uid() is null or public.lusky_current_role() not in ('owner','manager','staff') then
    raise exception 'Acesso administrativo necessário.' using errcode='42501';
  end if;
  if not exists(select 1 from auth.users u where u.id=p_customer_id and u.raw_app_meta_data->>'role'='customer') then
    raise exception 'Conta de cliente não encontrada.' using errcode='22023';
  end if;
  with summary as (
    select count(*)::integer as order_count,
      count(*) filter(where status='Entregue')::integer as completed_count,
      count(*) filter(where status='Cancelado')::integer as cancelled_count,
      coalesce(sum(total) filter(where status='Entregue'),0)::numeric(12,2) as completed_total,
      max(created_at) filter(where status='Entregue') as last_order_at
    from public.lusky_orders where created_by=p_customer_id
  ), page as (
    select id,order_number,created_at,order_type,status,items,total,payment_method,
      delivery_snapshot,delivery_address,customer_name,customer_phone
    from public.lusky_orders where created_by=p_customer_id
    order by created_at desc,id desc limit v_limit offset v_offset
  ), addresses as (
    select coalesce(jsonb_agg(to_jsonb(a) order by a.is_default desc,a.updated_at desc),'[]'::jsonb) as rows
    from public.lusky_customer_addresses a where a.user_id=p_customer_id
  )
  select jsonb_build_object('summary',to_jsonb(summary),'limit',v_limit,'offset',v_offset,
    'orders',coalesce((select jsonb_agg(to_jsonb(page) order by page.created_at desc,page.id desc) from page),'[]'::jsonb),
    'addresses',addresses.rows)
  into v_result from summary cross join addresses;
  return v_result;
end;
$$;
revoke all on function internal.lusky_admin_customer_history(uuid,integer,integer) from public,anon;
grant execute on function internal.lusky_admin_customer_history(uuid,integer,integer) to authenticated;

create or replace function internal.lusky_admin_driver_history(
  p_driver_id uuid, p_limit integer default 20, p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit,20),1),50);
  v_offset integer := greatest(coalesce(p_offset,0),0);
  v_result jsonb;
begin
  if auth.uid() is null or public.lusky_current_role() not in ('owner','manager','staff') then
    raise exception 'Acesso administrativo necessário.' using errcode='42501';
  end if;
  if not exists(select 1 from auth.users u where u.id=p_driver_id and u.raw_app_meta_data->>'role'='motoboy') then
    raise exception 'Conta de motoboy não encontrada.' using errcode='22023';
  end if;
  with summary as (
    select count(*)::integer as assigned_count,
      count(*) filter(where status in ('Novo pedido','Preparando','Pronto'))::integer as awaiting_pickup,
      count(*) filter(where status='Saiu para entrega')::integer as in_route,
      count(*) filter(where status='Entregue')::integer as completed_count,
      count(*) filter(where status='Cancelado')::integer as cancelled_count,
      max(coalesce(delivered_at,updated_at,created_at)) as last_activity
    from public.lusky_orders where assigned_driver=p_driver_id
  ), page as (
    select id,order_number,created_at,updated_at,delivered_at,order_type,status,items,total,
      delivery_address,delivery_snapshot,delivery_latitude,delivery_longitude,route_order
    from public.lusky_orders where assigned_driver=p_driver_id
    order by coalesce(delivered_at,updated_at,created_at) desc,id desc limit v_limit offset v_offset
  )
  select jsonb_build_object('summary',to_jsonb(summary),'limit',v_limit,'offset',v_offset,
    'orders',coalesce((select jsonb_agg(to_jsonb(page) order by coalesce(page.delivered_at,page.updated_at,page.created_at) desc,page.id desc) from page),'[]'::jsonb))
  into v_result from summary;
  return v_result;
end;
$$;
revoke all on function internal.lusky_admin_driver_history(uuid,integer,integer) from public,anon;
grant execute on function internal.lusky_admin_driver_history(uuid,integer,integer) to authenticated;

create or replace function internal.lusky_admin_unlinked_order_page(p_limit integer default 20,p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit,20),1),50);
  v_offset integer := greatest(coalesce(p_offset,0),0);
  v_result jsonb;
begin
  if auth.uid() is null or public.lusky_current_role() not in ('owner','manager','staff') then
    raise exception 'Acesso administrativo necessário.' using errcode='42501';
  end if;
  with unlinked as (
    select o.id,o.order_number,o.created_at,o.customer_name,o.customer_phone,o.order_type,o.status,
      o.items,o.total,o.payment_method,o.delivery_address
    from public.lusky_orders o left join auth.users u on u.id=o.created_by
    where coalesce(u.raw_app_meta_data->>'role','')<>'customer'
  ), counted as (select count(*)::integer as total from unlinked), page as (
    select * from unlinked order by created_at desc,id desc limit v_limit offset v_offset
  )
  select jsonb_build_object('total',counted.total,'limit',v_limit,'offset',v_offset,
    'orders',coalesce((select jsonb_agg(to_jsonb(page) order by page.created_at desc,page.id desc) from page),'[]'::jsonb))
  into v_result from counted;
  return v_result;
end;
$$;
revoke all on function internal.lusky_admin_unlinked_order_page(integer,integer) from public,anon;
grant execute on function internal.lusky_admin_unlinked_order_page(integer,integer) to authenticated;

create or replace function public.lusky_admin_customer_directory(p_query text default '',p_limit integer default 25,p_offset integer default 0)
returns jsonb language sql security invoker set search_path = '' as $$ select internal.lusky_admin_customer_directory(p_query,p_limit,p_offset) $$;
revoke all on function public.lusky_admin_customer_directory(text,integer,integer) from public,anon;
grant execute on function public.lusky_admin_customer_directory(text,integer,integer) to authenticated;

create or replace function public.lusky_admin_customer_history(p_customer_id uuid,p_limit integer default 20,p_offset integer default 0)
returns jsonb language sql security invoker set search_path = '' as $$ select internal.lusky_admin_customer_history(p_customer_id,p_limit,p_offset) $$;
revoke all on function public.lusky_admin_customer_history(uuid,integer,integer) from public,anon;
grant execute on function public.lusky_admin_customer_history(uuid,integer,integer) to authenticated;

create or replace function public.lusky_admin_driver_history(p_driver_id uuid,p_limit integer default 20,p_offset integer default 0)
returns jsonb language sql security invoker set search_path = '' as $$ select internal.lusky_admin_driver_history(p_driver_id,p_limit,p_offset) $$;
revoke all on function public.lusky_admin_driver_history(uuid,integer,integer) from public,anon;
grant execute on function public.lusky_admin_driver_history(uuid,integer,integer) to authenticated;

create or replace function public.lusky_admin_unlinked_order_page(p_limit integer default 20,p_offset integer default 0)
returns jsonb language sql security invoker set search_path = '' as $$ select internal.lusky_admin_unlinked_order_page(p_limit,p_offset) $$;
revoke all on function public.lusky_admin_unlinked_order_page(integer,integer) from public,anon;
grant execute on function public.lusky_admin_unlinked_order_page(integer,integer) to authenticated;
