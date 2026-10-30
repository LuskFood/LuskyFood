create extension if not exists pgcrypto;

create table if not exists public.lusky_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.lusky_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  category text not null check (char_length(category) between 2 and 40),
  price numeric(10,2) not null check (price >= 0),
  description text not null default '',
  emoji text not null default '🍽️',
  color text not null default 'sage',
  available boolean not null default true,
  sold integer not null default 0 check (sold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lusky_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  created_by uuid not null default auth.uid() references auth.users(id),
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  order_type text not null check (order_type in ('Retirada','Entrega','Salão','Salão · Mesa 01')),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'Novo pedido' check (status in ('Novo pedido','Preparando','Pronto','Saiu para entrega','Entregue','Cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lusky_orders_created_at_idx on public.lusky_orders (created_at desc);
create index if not exists lusky_orders_status_idx on public.lusky_orders (status);

create or replace function public.lusky_current_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'viewer');
$$;

create or replace function public.lusky_is_team_member()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.lusky_current_role() in ('owner','manager','staff','viewer');
$$;

create or replace function public.lusky_can_manage()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.lusky_current_role() in ('owner','manager','staff');
$$;

create or replace function public.lusky_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lusky_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.lusky_handle_new_user() from public, anon, authenticated;
drop trigger if exists lusky_auth_user_created on auth.users;
create trigger lusky_auth_user_created
  after insert on auth.users
  for each row execute function public.lusky_handle_new_user();

alter table public.lusky_profiles enable row level security;
alter table public.lusky_products enable row level security;
alter table public.lusky_orders enable row level security;

grant select, insert, update on public.lusky_profiles to authenticated;
grant select on public.lusky_products to anon, authenticated;
grant insert, update, delete on public.lusky_products to authenticated;
grant select, insert, update on public.lusky_orders to authenticated;
grant usage, select on sequence public.lusky_orders_order_number_seq to authenticated;

drop policy if exists "Users can read their own profile" on public.lusky_profiles;
create policy "Users can read their own profile" on public.lusky_profiles
  for select to authenticated using ((select auth.uid()) = id or (select public.lusky_current_role()) = 'owner');
drop policy if exists "Users can update their own profile" on public.lusky_profiles;
create policy "Users can update their own profile" on public.lusky_profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Menu is readable" on public.lusky_products;
create policy "Menu is readable" on public.lusky_products
  for select to anon, authenticated using (true);
drop policy if exists "Team can add menu items" on public.lusky_products;
create policy "Team can add menu items" on public.lusky_products
  for insert to authenticated with check ((select public.lusky_can_manage()));
drop policy if exists "Team can edit menu items" on public.lusky_products;
create policy "Team can edit menu items" on public.lusky_products
  for update to authenticated using ((select public.lusky_can_manage())) with check ((select public.lusky_can_manage()));
drop policy if exists "Team can remove menu items" on public.lusky_products;
create policy "Team can remove menu items" on public.lusky_products
  for delete to authenticated using ((select public.lusky_can_manage()));

drop policy if exists "Team can read orders" on public.lusky_orders;
create policy "Team can read orders" on public.lusky_orders
  for select to authenticated using ((select public.lusky_is_team_member()));
drop policy if exists "Team can create orders" on public.lusky_orders;
create policy "Team can create orders" on public.lusky_orders
  for insert to authenticated with check ((select public.lusky_can_manage()) and created_by = (select auth.uid()));
drop policy if exists "Team can update orders" on public.lusky_orders;
create policy "Team can update orders" on public.lusky_orders
  for update to authenticated using ((select public.lusky_can_manage())) with check ((select public.lusky_can_manage()));

create or replace function public.lusky_create_order(
  p_customer_name text,
  p_order_type text,
  p_items jsonb
)
returns public.lusky_orders
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.lusky_orders;
  v_item jsonb;
  v_product public.lusky_products;
  v_items jsonb := '[]'::jsonb;
  v_total numeric(10,2) := 0;
  v_quantity integer;
  v_count integer := 0;
begin
  if not (select public.lusky_can_manage()) then
    raise exception 'Acesso restrito à equipe do restaurante.' using errcode = '42501';
  end if;
  if p_customer_name is null or char_length(trim(p_customer_name)) not between 2 and 100 then
    raise exception 'Informe o nome do cliente.' using errcode = '22023';
  end if;
  if p_order_type not in ('Retirada','Entrega','Salão','Salão · Mesa 01') then
    raise exception 'Tipo de pedido inválido.' using errcode = '22023';
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

  if v_count = 0 then
    raise exception 'Adicione pelo menos um item.' using errcode = '22023';
  end if;
  insert into public.lusky_orders (customer_name,order_type,items,total,status)
  values (trim(p_customer_name),p_order_type,v_items,v_total,'Novo pedido')
  returning * into v_order;
  return v_order;
end;
$$;

revoke all on function public.lusky_create_order(text,text,jsonb) from public, anon;
grant execute on function public.lusky_create_order(text,text,jsonb) to authenticated;

insert into public.lusky_products (name,category,price,description,emoji,color,sold) values
  ('Lusky Smash Burger','Burgers',38.90,'Blend da casa, cheddar inglês, cebola caramelizada e molho especial.','🍔','peach',32),
  ('Bowl Miso Crispy','Bowls',42.00,'Arroz japonês, salmão crispy, sunomono, avocado e maionese de missô.','🍱','sage',24),
  ('Truffle Parmesan Fries','Acompanhamentos',24.50,'Batatas rústicas, parmesão, azeite trufado e ervas frescas.','🍟','cream',21),
  ('Pasta al Limone','Principais',46.00,'Tagliatelle fresco, limão siciliano, parmesão e pimenta rosa.','🍝','butter',19),
  ('Tarta Basca','Sobremesas',19.90,'Cheesecake basco de baunilha com calda de frutas vermelhas.','🍰','lilac',16),
  ('Limonada de Hibisco','Bebidas',12.00,'Limão-taiti, hibisco, água com gás e um toque de mel.','🍹','coral',27),
  ('Chicken Pesto Melt','Burgers',36.00,'Frango grelhado, pesto de manjericão, provolone e rúcula.','🥪','sage',14),
  ('Cookie de Chocolate','Sobremesas',14.50,'Cookie artesanal macio com chocolate 54% e flor de sal.','🍪','peach',12)
on conflict do nothing;
