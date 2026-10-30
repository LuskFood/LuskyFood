-- Lusky Food: initial menu, image storage and role-scoped delivery flow.
alter table public.lusky_products
  add column if not exists icon text not null default 'fork',
  add column if not exists image_url text;

alter table public.lusky_orders
  add column if not exists delivery_address text not null default '',
  add column if not exists pickup_code text not null default '',
  add column if not exists assigned_driver uuid references public.lusky_profiles(id) on delete set null,
  add column if not exists route_order integer;

create index if not exists lusky_orders_driver_route_idx
  on public.lusky_orders (assigned_driver, route_order)
  where assigned_driver is not null;

-- The customer's handoff code lives separately, so the assigned rider never
-- reads it while viewing the delivery record.
create table if not exists public.lusky_order_handoffs (
  order_id uuid primary key references public.lusky_orders(id) on delete cascade,
  delivery_code text not null check (delivery_code ~ '^[0-9]{6}$'),
  created_at timestamptz not null default now()
);
alter table public.lusky_order_handoffs enable row level security;
grant select, insert on public.lusky_order_handoffs to authenticated;
drop policy if exists "Customer and team can read their handoff code" on public.lusky_order_handoffs;
create policy "Customer and team can read their handoff code" on public.lusky_order_handoffs
  for select to authenticated using (
    exists (select 1 from public.lusky_orders o where o.id = order_id and
      (o.created_by = (select auth.uid()) or (select public.lusky_can_manage())))
  );
drop policy if exists "Customer and team can create their handoff code" on public.lusky_order_handoffs;
create policy "Customer and team can create their handoff code" on public.lusky_order_handoffs
  for insert to authenticated with check (
    exists (select 1 from public.lusky_orders o where o.id = order_id and
      (o.created_by = (select auth.uid()) or (select public.lusky_can_manage())))
  );

create or replace function public.lusky_current_role()
returns text language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'customer');
$$;
create or replace function public.lusky_is_team_member()
returns boolean language sql stable set search_path = '' as $$
  select public.lusky_current_role() in ('owner','manager','staff');
$$;
create or replace function public.lusky_can_manage()
returns boolean language sql stable set search_path = '' as $$
  select public.lusky_current_role() in ('owner','manager','staff');
$$;

drop policy if exists "Users can read their own profile" on public.lusky_profiles;
create policy "Users can read their own profile" on public.lusky_profiles
  for select to authenticated using ((select auth.uid()) = id or (select public.lusky_can_manage()));

drop policy if exists "Team can read orders" on public.lusky_orders;
create policy "Team can read all orders" on public.lusky_orders
  for select to authenticated using ((select public.lusky_is_team_member()));
drop policy if exists "Customer can read own orders" on public.lusky_orders;
create policy "Customer can read own orders" on public.lusky_orders
  for select to authenticated using (created_by = (select auth.uid()));
drop policy if exists "Motoboy can read assigned route" on public.lusky_orders;
create policy "Motoboy can read assigned route" on public.lusky_orders
  for select to authenticated using (
    (select public.lusky_current_role()) = 'motoboy' and assigned_driver = (select auth.uid())
  );
drop policy if exists "Team can create orders" on public.lusky_orders;
create policy "Customers and team can create orders" on public.lusky_orders
  for insert to authenticated with check (
    created_by = (select auth.uid()) and
    ((select public.lusky_is_team_member()) or (select public.lusky_current_role()) = 'customer')
  );
drop policy if exists "Team can update orders" on public.lusky_orders;
create policy "Team can update orders" on public.lusky_orders
  for update to authenticated using ((select public.lusky_can_manage()))
  with check ((select public.lusky_can_manage()));

-- Team may read the customer code for support, while clients can read only
-- the code belonging to their own order. Riders can only verify it via RPC.
drop function if exists public.lusky_create_order(text,text,jsonb);
create or replace function public.lusky_create_order(
  p_customer_name text,
  p_order_type text,
  p_delivery_address text,
  p_items jsonb
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_order public.lusky_orders;
  v_item jsonb;
  v_product public.lusky_products;
  v_items jsonb := '[]'::jsonb;
  v_total numeric(10,2) := 0;
  v_quantity integer;
  v_count integer := 0;
  v_delivery_code text;
  v_pickup_code text;
  v_role text := public.lusky_current_role();
begin
  if v_role not in ('owner','manager','staff','customer') then
    raise exception 'Este perfil não pode criar pedidos.' using errcode = '42501';
  end if;
  if p_customer_name is null or char_length(trim(p_customer_name)) not between 2 and 100 then
    raise exception 'Informe o nome do cliente.' using errcode = '22023';
  end if;
  if p_order_type not in ('Retirada','Entrega','Salão','Salão · Mesa 01') then
    raise exception 'Tipo de pedido inválido.' using errcode = '22023';
  end if;
  if v_role = 'customer' and (p_order_type <> 'Entrega' or char_length(trim(coalesce(p_delivery_address,''))) < 6) then
    raise exception 'Informe um endereço de entrega válido.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'O pedido deve conter entre 1 e 30 itens.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity < 1 or v_quantity > 50 then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;
    select * into v_product from public.lusky_products
      where id = (v_item ->> 'product_id')::uuid and available = true;
    if not found then
      raise exception 'Um dos itens não está disponível.' using errcode = '22023';
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id',v_product.id,'name',v_product.name,'quantity',v_quantity,'unit_price',v_product.price
    ));
    v_total := v_total + v_product.price * v_quantity;
    v_count := v_count + 1;
  end loop;

  v_pickup_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  v_delivery_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into public.lusky_orders (created_by,customer_name,order_type,items,total,status,delivery_address,pickup_code)
  values (auth.uid(),trim(p_customer_name),p_order_type,v_items,v_total,'Novo pedido',trim(coalesce(p_delivery_address,'')),v_pickup_code)
  returning * into v_order;
  if p_order_type = 'Entrega' then
    insert into public.lusky_order_handoffs (order_id,delivery_code) values (v_order.id,v_delivery_code);
  end if;
  return jsonb_build_object(
    'id',v_order.id,'order_number',v_order.order_number,'created_by',v_order.created_by,
    'customer_name',v_order.customer_name,'order_type',v_order.order_type,'items',v_order.items,
    'total',v_order.total,'status',v_order.status,'created_at',v_order.created_at,
    'delivery_address',v_order.delivery_address,'pickup_code',v_order.pickup_code,
    'delivery_code',case when v_role = 'customer' then v_delivery_code else null end
  );
end;
$$;
revoke all on function public.lusky_create_order(text,text,text,jsonb) from public, anon;
grant execute on function public.lusky_create_order(text,text,text,jsonb) to authenticated;

create schema if not exists internal;
revoke all on schema internal from public, anon;
grant usage on schema internal to authenticated;

create or replace function internal.lusky_transition_assigned_order(
  p_order_number bigint,
  p_action text,
  p_code text default null
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_order public.lusky_orders;
  v_matches boolean;
begin
  if auth.uid() is null or public.lusky_current_role() <> 'motoboy' then
    raise exception 'Acesso restrito ao motoboy autenticado.' using errcode = '42501';
  end if;
  select * into v_order from public.lusky_orders
    where order_number = p_order_number and assigned_driver = auth.uid() for update;
  if not found then raise exception 'Pedido não pertence à sua rota.' using errcode = '42501'; end if;
  if p_action = 'pickup' then
    if v_order.status <> 'Pronto' or p_code is distinct from v_order.pickup_code then
      raise exception 'Código de retirada inválido ou pedido indisponível.' using errcode = '22023';
    end if;
    update public.lusky_orders set status = 'Saiu para entrega', updated_at = now() where id = v_order.id;
  elsif p_action = 'delivery' then
    select exists(select 1 from public.lusky_order_handoffs h where h.order_id = v_order.id and h.delivery_code = p_code) into v_matches;
    if v_order.status <> 'Saiu para entrega' or not v_matches then
      raise exception 'Código de entrega inválido ou pedido fora da etapa de entrega.' using errcode = '22023';
    end if;
    update public.lusky_orders set status = 'Entregue', updated_at = now() where id = v_order.id;
  else
    raise exception 'Ação de entrega inválida.' using errcode = '22023';
  end if;
  return true;
end;
$$;
revoke all on function internal.lusky_transition_assigned_order(bigint,text,text) from public, anon;
grant execute on function internal.lusky_transition_assigned_order(bigint,text,text) to authenticated;

create or replace function public.lusky_motoboy_transition(p_order_number bigint,p_action text,p_code text)
returns boolean language sql security invoker set search_path = '' as $$
  select internal.lusky_transition_assigned_order(p_order_number,p_action,p_code);
$$;
revoke all on function public.lusky_motoboy_transition(bigint,text,text) from public, anon;
grant execute on function public.lusky_motoboy_transition(bigint,text,text) to authenticated;

create or replace function public.lusky_customer_delivery_code(p_order_number bigint)
returns text language sql security invoker set search_path = '' as $$
  select h.delivery_code from public.lusky_order_handoffs h
    join public.lusky_orders o on o.id = h.order_id
    where o.order_number = p_order_number and o.created_by = auth.uid();
$$;
revoke all on function public.lusky_customer_delivery_code(bigint) from public, anon;
grant execute on function public.lusky_customer_delivery_code(bigint) to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('lusky-dishes','lusky-dishes',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true,file_size_limit = 5242880,allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Anyone can view dish photos" on storage.objects;
create policy "Anyone can view dish photos" on storage.objects for select using (bucket_id = 'lusky-dishes');
drop policy if exists "Restaurant team can upload dish photos" on storage.objects;
create policy "Restaurant team can upload dish photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'lusky-dishes' and (select public.lusky_can_manage()));
drop policy if exists "Restaurant team can update dish photos" on storage.objects;
create policy "Restaurant team can update dish photos" on storage.objects
  for update to authenticated using (bucket_id = 'lusky-dishes' and (select public.lusky_can_manage()))
  with check (bucket_id = 'lusky-dishes' and (select public.lusky_can_manage()));
drop policy if exists "Restaurant team can delete dish photos" on storage.objects;
create policy "Restaurant team can delete dish photos" on storage.objects
  for delete to authenticated using (bucket_id = 'lusky-dishes' and (select public.lusky_can_manage()));

delete from public.lusky_products where name in (
  'Lusky Smash Burger','Bowl Miso Crispy','Truffle Parmesan Fries','Pasta al Limone',
  'Tarta Basca','Limonada de Hibisco','Chicken Pesto Melt','Cookie de Chocolate'
);
insert into public.lusky_products (name,category,price,description,emoji,icon,image_url,color,available,sold)
select seed.name,seed.category,seed.price,seed.description,'',seed.icon,seed.image_url,seed.color,true,seed.sold
from (values
  ('Frango Xadrez','Pratos principais',50.00,'Frango suculento, legumes crocantes e molho especial, acompanhado de arroz.','flame','/images/frango-xadrez.jpg','peach',32),
  ('Sobá','Pratos principais',45.00,'Macarrão dourado com carne, cebolinha e o sabor acolhedor do caldo da casa.','bowl','/images/soba.jpg','sage',24),
  ('Yakisoba','Pratos principais',50.00,'Carne macia e legumes frescos envolvidos no molho especial da casa.','fork','/images/yakisoba.jpg','cream',21),
  ('Kibe Cru','Pratos principais',50.00,'Kibe cru servido com hortelã, pão sírio, cebola, limão e acompanhamentos.','sparkle','/images/kibe-cru.jpg','butter',19)
) as seed(name,category,price,description,icon,image_url,color,sold)
where not exists (select 1 from public.lusky_products p where p.name = seed.name);
