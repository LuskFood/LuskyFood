-- Operational checkout, protected handoffs and auditable state transitions.
-- Preserves existing orders and accepts their legacy status names.
create table if not exists public.lusky_restaurant_settings (
  id integer primary key default 1 check (id = 1),
  name text not null default 'Lusky Food',
  street text not null default '', street_number text not null default '',
  district text not null default '', city text not null default '', state text not null default '', zip_code text not null default '',
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  delivery_radius_km numeric(6,2) not null default 10 check (delivery_radius_km > 0),
  delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0),
  accepts_cash boolean not null default true,
  accepts_manual_pix boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.lusky_restaurant_settings(id) values (1) on conflict do nothing;
alter table public.lusky_restaurant_settings enable row level security;
grant select on public.lusky_restaurant_settings to authenticated;
grant update on public.lusky_restaurant_settings to authenticated;
create policy "Authenticated users read restaurant" on public.lusky_restaurant_settings for select to authenticated using (true);
create policy "Team updates restaurant" on public.lusky_restaurant_settings for update to authenticated
  using ((select public.lusky_can_manage())) with check ((select public.lusky_can_manage()));

create table if not exists public.lusky_customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Casa',
  zip_code text not null check (zip_code ~ '^[0-9]{8}$'),
  street text not null, street_number text not null,
  no_number boolean not null default false,
  complement text not null default '', district text not null,
  city text not null, state text not null check (state ~ '^[A-Z]{2}$'),
  reference text not null default '', instructions text not null default '',
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  pin_confirmed_at timestamptz,
  is_default boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (no_number or length(trim(street_number)) > 0),
  check (length(trim(street)) > 1 and length(trim(district)) > 0 and length(trim(city)) > 1)
);
create index if not exists lusky_addresses_user_idx on public.lusky_customer_addresses(user_id, created_at desc);
create unique index if not exists lusky_addresses_default_idx on public.lusky_customer_addresses(user_id) where is_default;
alter table public.lusky_customer_addresses enable row level security;
grant select, insert, update, delete on public.lusky_customer_addresses to authenticated;
create policy "Customers read own addresses" on public.lusky_customer_addresses for select to authenticated using (user_id = (select auth.uid()));
create policy "Customers add own addresses" on public.lusky_customer_addresses for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Customers edit own addresses" on public.lusky_customer_addresses for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Customers delete own addresses" on public.lusky_customer_addresses for delete to authenticated using (user_id = (select auth.uid()));

alter table public.lusky_profiles add column if not exists full_name text not null default '';
alter table public.lusky_profiles add column if not exists phone text not null default '';
alter table public.lusky_profiles add column if not exists contact_preference text not null default 'app';
alter table public.lusky_orders add column if not exists request_id uuid;
alter table public.lusky_orders add column if not exists customer_phone text not null default '';
alter table public.lusky_orders add column if not exists delivery_snapshot jsonb;
alter table public.lusky_orders add column if not exists delivery_latitude double precision;
alter table public.lusky_orders add column if not exists delivery_longitude double precision;
alter table public.lusky_orders add column if not exists delivery_fee numeric(10,2) not null default 0;
alter table public.lusky_orders add column if not exists payment_method text not null default 'cash';
create unique index if not exists lusky_orders_idempotency_idx on public.lusky_orders(created_by, request_id) where request_id is not null;
create index if not exists lusky_orders_status_created_idx on public.lusky_orders(status, created_at desc);

create table if not exists public.lusky_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.lusky_orders(id) on delete cascade,
  from_status text, to_status text not null,
  actor_id uuid references auth.users(id) on delete set null,
  reason text not null default '', created_at timestamptz not null default now()
);
create index if not exists lusky_order_events_order_idx on public.lusky_order_events(order_id, created_at);
alter table public.lusky_order_events enable row level security;
grant select on public.lusky_order_events to authenticated;
create policy "Participants read order events" on public.lusky_order_events for select to authenticated
  using (exists (select 1 from public.lusky_orders o where o.id = order_id));

create table if not exists internal.lusky_pickup_secrets (
  order_id uuid primary key references public.lusky_orders(id) on delete cascade,
  code text not null check (code ~ '^[0-9]{4,6}$'),
  failed_attempts integer not null default 0,
  locked_until timestamptz
);
alter table internal.lusky_pickup_secrets enable row level security;
revoke all on internal.lusky_pickup_secrets from public, anon, authenticated;
insert into internal.lusky_pickup_secrets(order_id, code)
select id, pickup_code from public.lusky_orders where pickup_code ~ '^[0-9]{4,6}$'
on conflict (order_id) do nothing;
update public.lusky_orders set pickup_code = '' where pickup_code <> '';
create table if not exists internal.lusky_delivery_attempts (
  order_id uuid primary key references public.lusky_orders(id) on delete cascade,
  failed_attempts integer not null default 0,
  locked_until timestamptz
);
alter table internal.lusky_delivery_attempts enable row level security;
revoke all on internal.lusky_delivery_attempts from public, anon, authenticated;

-- Old direct write privileges would bypass the state machine.
revoke insert, update on public.lusky_orders from authenticated;
drop policy if exists "Customers and team can create orders" on public.lusky_orders;
drop policy if exists "Team can update orders" on public.lusky_orders;
drop policy if exists "Motoboy can read assigned route" on public.lusky_orders;
create policy "Motoboy reads active assigned delivery" on public.lusky_orders for select to authenticated
  using ((select public.lusky_current_role())='motoboy' and assigned_driver=(select auth.uid()) and status in ('Pronto','Saiu para entrega'));
revoke insert on public.lusky_order_handoffs from authenticated;
drop policy if exists "Customer and team can create their handoff code" on public.lusky_order_handoffs;
revoke execute on function public.lusky_create_order(text,text,text,jsonb) from authenticated;
revoke execute on function public.lusky_motoboy_transition(bigint,text,text) from authenticated;

create or replace function public.lusky_place_order(
  p_request_id uuid, p_customer_name text, p_customer_phone text,
  p_order_type text, p_address jsonb, p_items jsonb, p_payment_method text
) returns public.lusky_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.lusky_orders; v_item jsonb; v_product public.lusky_products;
  v_items jsonb := '[]'::jsonb; v_total numeric(10,2) := 0; v_fee numeric(10,2) := 0;
  v_qty integer; v_settings public.lusky_restaurant_settings; v_role text := public.lusky_current_role();
  v_address text := ''; v_phone text := regexp_replace(coalesce(p_customer_phone,''), '\D', '', 'g');
begin
  if auth.uid() is null or v_role not in ('owner','manager','staff','customer') then raise exception 'Conta sem permissão para pedir.' using errcode='42501'; end if;
  if p_request_id is null then raise exception 'Identificador do pedido obrigatório.' using errcode='22023'; end if;
  select * into v_order from public.lusky_orders where created_by = auth.uid() and request_id = p_request_id;
  if found then return v_order; end if;
  if length(trim(coalesce(p_customer_name,''))) not between 3 and 120 then raise exception 'Informe o nome completo.' using errcode='22023'; end if;
  if v_role = 'customer' and length(v_phone) <> 11 then raise exception 'Informe celular com DDD.' using errcode='22023'; end if;
  if p_order_type not in ('Entrega','Retirada','Salão') then raise exception 'Tipo de pedido inválido.' using errcode='22023'; end if;
  select * into v_settings from public.lusky_restaurant_settings where id = 1;
  if p_payment_method not in ('cash','manual_pix') or (p_payment_method = 'manual_pix' and not v_settings.accepts_manual_pix) or (p_payment_method = 'cash' and not v_settings.accepts_cash) then
    raise exception 'Forma de pagamento indisponível.' using errcode='22023';
  end if;
  if p_order_type = 'Entrega' then
    if coalesce(p_address->>'zip_code','') !~ '^[0-9]{8}$'
      or length(trim(coalesce(p_address->>'street',''))) < 2
      or (coalesce(p_address->>'no_number','false') <> 'true' and length(trim(coalesce(p_address->>'street_number',''))) = 0)
      or length(trim(coalesce(p_address->>'district',''))) = 0
      or length(trim(coalesce(p_address->>'city',''))) < 2
      or coalesce(p_address->>'state','') !~ '^[A-Z]{2}$'
      or coalesce(p_address->>'pin_confirmed','false') <> 'true'
      or coalesce(p_address->>'latitude','') !~ '^[-+]?[0-9]+(\.[0-9]+)?$'
      or coalesce(p_address->>'longitude','') !~ '^[-+]?[0-9]+(\.[0-9]+)?$' then
      raise exception 'Confirme o endereço completo e o pino no mapa.' using errcode='22023';
    end if;
    if (p_address->>'latitude')::double precision not between -90 and 90 or (p_address->>'longitude')::double precision not between -180 and 180 then
      raise exception 'Coordenadas do endereço inválidas.' using errcode='22023';
    end if;
    v_address := concat_ws(', ',trim(p_address->>'street'),case when p_address->>'no_number' = 'true' then 's/n' else trim(p_address->>'street_number') end,
      nullif(trim(coalesce(p_address->>'complement','')),''),trim(p_address->>'district'),trim(p_address->>'city')||'/'||trim(p_address->>'state'));
    v_fee := v_settings.delivery_fee;
    if v_settings.latitude is null or v_settings.longitude is null then raise exception 'Restaurante ainda não configurou sua localização.' using errcode='22023'; end if;
    if 6371 * 2 * asin(sqrt(power(sin(radians(((p_address->>'latitude')::double precision-v_settings.latitude)/2)),2) + cos(radians(v_settings.latitude))*cos(radians((p_address->>'latitude')::double precision))*power(sin(radians(((p_address->>'longitude')::double precision-v_settings.longitude)/2)),2))) > v_settings.delivery_radius_km then
      raise exception 'Endereço fora da área de entrega.' using errcode='22023';
    end if;
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Escolha de 1 a 30 itens.' using errcode='22023'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    if coalesce(v_item->>'quantity','') !~ '^[0-9]{1,2}$' then raise exception 'Quantidade inválida.' using errcode='22023'; end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty not between 1 and 50 then raise exception 'Quantidade inválida.' using errcode='22023'; end if;
    select * into v_product from public.lusky_products where id = (v_item->>'product_id')::uuid and available = true for share;
    if not found then raise exception 'Um prato não está disponível.' using errcode='22023'; end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object('product_id',v_product.id,'name',v_product.name,'quantity',v_qty,'unit_price',v_product.price,'note',left(coalesce(v_item->>'note',''),300)));
    v_total := v_total + v_product.price*v_qty;
  end loop;
  insert into public.lusky_orders(created_by,request_id,customer_name,customer_phone,order_type,items,total,status,delivery_address,delivery_snapshot,delivery_latitude,delivery_longitude,delivery_fee,payment_method,pickup_code)
  values(auth.uid(),p_request_id,trim(p_customer_name),v_phone,p_order_type,v_items,v_total+v_fee,'Novo pedido',v_address,
    case when p_order_type='Entrega' then p_address else null end,
    case when p_order_type='Entrega' then (p_address->>'latitude')::double precision else null end,
    case when p_order_type='Entrega' then (p_address->>'longitude')::double precision else null end,v_fee,p_payment_method,'')
  on conflict (created_by,request_id) where request_id is not null do nothing returning * into v_order;
  if not found then select * into v_order from public.lusky_orders where created_by=auth.uid() and request_id=p_request_id; return v_order; end if;
insert into internal.lusky_pickup_secrets(order_id,code) values(v_order.id,lpad(((get_byte(extensions.gen_random_bytes(4),0)::integer*65536 + get_byte(extensions.gen_random_bytes(4),1)::integer*256 + get_byte(extensions.gen_random_bytes(4),2)::integer) % 1000000)::text,6,'0'));
  if p_order_type='Entrega' then
    insert into public.lusky_order_handoffs(order_id,delivery_code) values(v_order.id,lpad(((get_byte(extensions.gen_random_bytes(4),0)::integer*65536 + get_byte(extensions.gen_random_bytes(4),1)::integer*256 + get_byte(extensions.gen_random_bytes(4),2)::integer) % 1000000)::text,6,'0'));
  end if;
  insert into public.lusky_order_events(order_id,to_status,actor_id) values(v_order.id,'Novo pedido',auth.uid());
  return v_order;
end; $$;
revoke all on function public.lusky_place_order(uuid,text,text,text,jsonb,jsonb,text) from public, anon;
grant execute on function public.lusky_place_order(uuid,text,text,text,jsonb,jsonb,text) to authenticated;

create or replace function public.lusky_team_transition(p_order_number bigint,p_to_status text,p_reason text default '')
returns boolean language plpgsql security definer set search_path='' as $$
declare v_order public.lusky_orders;
begin
  if auth.uid() is null or not public.lusky_can_manage() then raise exception 'Acesso restrito à equipe.' using errcode='42501'; end if;
  select * into v_order from public.lusky_orders where order_number=p_order_number for update;
  if not found then raise exception 'Pedido não encontrado.' using errcode='22023'; end if;
  if v_order.status=p_to_status then return true; end if;
  if not ((v_order.status='Novo pedido' and p_to_status='Preparando') or
          (v_order.status='Preparando' and p_to_status='Pronto') or
          (v_order.status='Pronto' and v_order.order_type in ('Retirada','Salão','Salão · Mesa 01') and p_to_status='Entregue') or
          (v_order.status in ('Novo pedido','Preparando') and p_to_status='Cancelado' and length(trim(p_reason))>=5)) then
    raise exception 'Transição de pedido não permitida.' using errcode='22023'; end if;
  update public.lusky_orders set status=p_to_status,updated_at=now() where id=v_order.id;
  insert into public.lusky_order_events(order_id,from_status,to_status,actor_id,reason) values(v_order.id,v_order.status,p_to_status,auth.uid(),left(p_reason,500));
  return true;
end; $$;
revoke all on function public.lusky_team_transition(bigint,text,text) from public, anon;
grant execute on function public.lusky_team_transition(bigint,text,text) to authenticated;

create or replace function public.lusky_assign_driver(p_order_number bigint,p_driver_id uuid,p_route_order integer default null)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_order public.lusky_orders;
begin
  if auth.uid() is null or not public.lusky_can_manage() then raise exception 'Acesso restrito à equipe.' using errcode='42501'; end if;
  select * into v_order from public.lusky_orders where order_number=p_order_number for update;
  if not found or v_order.order_type<>'Entrega' or v_order.status not in ('Pronto','Saiu para entrega') then raise exception 'A entrega precisa estar pronta.' using errcode='22023'; end if;
  if v_order.status='Saiu para entrega' and p_driver_id is distinct from v_order.assigned_driver then raise exception 'Entrega em rota não pode trocar de motoboy.' using errcode='22023'; end if;
  if p_driver_id is not null and not exists(select 1 from public.lusky_motoboy_profiles p join internal.lusky_motoboy_documents d on d.user_id=p.id where p.id=p_driver_id and p.active and d.document_valid) then
    raise exception 'Motoboy indisponível ou documento pendente.' using errcode='22023'; end if;
  update public.lusky_orders set assigned_driver=p_driver_id,route_order=p_route_order,updated_at=now() where id=v_order.id;
  insert into public.lusky_order_events(order_id,from_status,to_status,actor_id,reason) values(v_order.id,v_order.status,v_order.status,auth.uid(),case when p_driver_id is null then 'Atribuição removida' else 'Motoboy atribuído' end);
  return true;
end; $$;
revoke all on function public.lusky_assign_driver(bigint,uuid,integer) from public, anon;
grant execute on function public.lusky_assign_driver(bigint,uuid,integer) to authenticated;

create or replace function public.lusky_kitchen_pickup_code(p_order_number bigint)
returns text language plpgsql security definer set search_path='' as $$
declare v_code text;
begin
  if auth.uid() is null or not public.lusky_can_manage() then raise exception 'Acesso restrito à cozinha.' using errcode='42501'; end if;
  select s.code into v_code from internal.lusky_pickup_secrets s join public.lusky_orders o on o.id=s.order_id where o.order_number=p_order_number and o.status='Pronto';
  return v_code;
end; $$;
revoke all on function public.lusky_kitchen_pickup_code(bigint) from public, anon;
grant execute on function public.lusky_kitchen_pickup_code(bigint) to authenticated;

create or replace function public.lusky_confirm_handoff(p_order_number bigint,p_action text,p_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_order public.lusky_orders; v_secret internal.lusky_pickup_secrets; v_attempt internal.lusky_delivery_attempts; v_expected text;
begin
  if auth.uid() is null or public.lusky_current_role()<>'motoboy' then raise exception 'Acesso restrito ao motoboy.' using errcode='42501'; end if;
  select * into v_order from public.lusky_orders where order_number=p_order_number and assigned_driver=auth.uid() and order_type='Entrega' for update;
  if not found then raise exception 'Pedido não atribuído.' using errcode='42501'; end if;
  if p_action='pickup' then
    if v_order.status='Saiu para entrega' then return true; end if;
    if v_order.status<>'Pronto' then raise exception 'Pedido ainda não está pronto.' using errcode='22023'; end if;
    select * into v_secret from internal.lusky_pickup_secrets where order_id=v_order.id for update;
    if v_secret.locked_until>now() then raise exception 'Código temporariamente bloqueado.' using errcode='22023'; end if;
    if v_secret.code is distinct from p_code then
      update internal.lusky_pickup_secrets set failed_attempts=case when failed_attempts>=4 then 0 else failed_attempts+1 end,locked_until=case when failed_attempts>=4 then now()+interval '15 minutes' else null end where order_id=v_order.id;
      return false;
    end if;
    update public.lusky_orders set status='Saiu para entrega',updated_at=now() where id=v_order.id;
    insert into public.lusky_order_events(order_id,from_status,to_status,actor_id) values(v_order.id,'Pronto','Saiu para entrega',auth.uid());
  elsif p_action='delivery' then
    if v_order.status='Entregue' then return true; end if;
    if v_order.status<>'Saiu para entrega' then raise exception 'Pedido ainda não saiu para entrega.' using errcode='22023'; end if;
    insert into internal.lusky_delivery_attempts(order_id) values(v_order.id) on conflict do nothing;
    select * into v_attempt from internal.lusky_delivery_attempts where order_id=v_order.id for update;
    if v_attempt.locked_until>now() then raise exception 'Código temporariamente bloqueado.' using errcode='22023'; end if;
    select delivery_code into v_expected from public.lusky_order_handoffs where order_id=v_order.id;
    if v_expected is distinct from p_code then
      update internal.lusky_delivery_attempts set failed_attempts=case when failed_attempts>=4 then 0 else failed_attempts+1 end,locked_until=case when failed_attempts>=4 then now()+interval '15 minutes' else null end where order_id=v_order.id;
      return false;
    end if;
    update public.lusky_orders set status='Entregue',updated_at=now() where id=v_order.id;
    insert into public.lusky_order_events(order_id,from_status,to_status,actor_id) values(v_order.id,'Saiu para entrega','Entregue',auth.uid());
  else raise exception 'Ação inválida.' using errcode='22023'; end if;
  return true;
end; $$;
revoke all on function public.lusky_confirm_handoff(bigint,text,text) from public, anon;
grant execute on function public.lusky_confirm_handoff(bigint,text,text) to authenticated;

revoke select on public.lusky_order_handoffs from authenticated;
create or replace function public.lusky_customer_delivery_code(p_order_number bigint)
returns text language plpgsql security definer set search_path='' as $$
declare v_code text;
begin
  if auth.uid() is null then raise exception 'Faça login para consultar o código.' using errcode='42501'; end if;
  select h.delivery_code into v_code from public.lusky_order_handoffs h
    join public.lusky_orders o on o.id=h.order_id
    where o.order_number=p_order_number and o.created_by=auth.uid() and o.status='Saiu para entrega';
  return v_code;
end; $$;
revoke all on function public.lusky_customer_delivery_code(bigint) from public, anon;
grant execute on function public.lusky_customer_delivery_code(bigint) to authenticated;

-- Realtime follows RLS on SELECT; do not publish private code tables.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='lusky_orders') then
    alter publication supabase_realtime add table public.lusky_orders;
  end if;
end $$;
