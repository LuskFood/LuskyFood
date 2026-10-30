-- Motoboy self-registration, private document validation, and public route identity.
-- Auth users are created through Supabase Auth, never by SQL migration.

create schema if not exists internal;

create or replace function internal.lusky_cpf_is_valid(p_value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_digits text := regexp_replace(coalesce(p_value,''), '\D', '', 'g');
  v_sum integer;
  v_check integer;
  v_i integer;
begin
  if length(v_digits) <> 11 or v_digits ~ '^(.)\1{10}$' then return false; end if;
  v_sum := 0;
  for v_i in 1..9 loop
    v_sum := v_sum + substring(v_digits,v_i,1)::integer * (11-v_i);
  end loop;
  v_check := (v_sum * 10) % 11;
  if v_check = 10 then v_check := 0; end if;
  if v_check <> substring(v_digits,10,1)::integer then return false; end if;
  v_sum := 0;
  for v_i in 1..10 loop
    v_sum := v_sum + substring(v_digits,v_i,1)::integer * (12-v_i);
  end loop;
  v_check := (v_sum * 10) % 11;
  if v_check = 10 then v_check := 0; end if;
  return v_check = substring(v_digits,11,1)::integer;
end;
$$;
revoke all on function internal.lusky_cpf_is_valid(text) from public, anon, authenticated;

create table if not exists public.lusky_motoboy_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 3 and 120),
  driver_code text not null unique default ('LF-MOTO-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  vehicle_color text not null check (length(trim(vehicle_color)) between 2 and 40),
  vehicle_plate text not null check (vehicle_plate ~* '^[a-z]{3}[0-9][a-z0-9][0-9]{2}$'),
  vehicle_brand text not null check (length(trim(vehicle_brand)) between 2 and 60),
  vehicle_model text not null check (length(trim(vehicle_model)) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists internal.lusky_motoboy_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  document_type text not null check (document_type in ('CPF','RG')),
  document_number text not null,
  document_masked text not null,
  document_valid boolean not null,
  created_at timestamptz not null default now()
);
create unique index if not exists lusky_motoboy_documents_unique_normalized
  on internal.lusky_motoboy_documents(document_type, (regexp_replace(upper(document_number),'[^0-9A-Z]','','g')));

alter table public.lusky_motoboy_profiles enable row level security;
alter table internal.lusky_motoboy_documents enable row level security;
revoke all on internal.lusky_motoboy_documents from anon, authenticated;
grant select on public.lusky_motoboy_profiles to authenticated;
grant update (full_name,vehicle_color,vehicle_plate,vehicle_brand,vehicle_model)
  on public.lusky_motoboy_profiles to authenticated;

drop policy if exists "Motoboys and assigned customers read driver card" on public.lusky_motoboy_profiles;
create policy "Motoboys and assigned customers read driver card"
  on public.lusky_motoboy_profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.lusky_can_manage())
    or exists (
      select 1 from public.lusky_orders o
      where o.assigned_driver = lusky_motoboy_profiles.id
        and o.created_by = (select auth.uid())
    )
  );

drop policy if exists "Motoboys update own vehicle card" on public.lusky_motoboy_profiles;
create policy "Motoboys update own vehicle card"
  on public.lusky_motoboy_profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.lusky_current_role()) = 'motoboy')
  with check (id = (select auth.uid()) and (select public.lusky_current_role()) = 'motoboy');

create or replace function internal.lusky_driver_document_status(p_driver_id uuid)
returns table(document_type text, document_valid boolean, document_masked text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not (
    p_driver_id = auth.uid() or public.lusky_can_manage()
  ) then
    raise exception 'Acesso restrito ao próprio motoboy e à equipe Lusky.' using errcode = '42501';
  end if;
  return query
    select d.document_type,d.document_valid,d.document_masked
    from internal.lusky_motoboy_documents d where d.user_id = p_driver_id;
end;
$$;
revoke all on function internal.lusky_driver_document_status(uuid) from public, anon;
grant usage on schema internal to authenticated;
grant execute on function internal.lusky_driver_document_status(uuid) to authenticated;

create or replace function public.lusky_driver_document_status(p_driver_id uuid)
returns table(document_type text, document_valid boolean, document_masked text)
language sql
security invoker
set search_path = ''
as $$ select * from internal.lusky_driver_document_status(p_driver_id); $$;
revoke all on function public.lusky_driver_document_status(uuid) from public, anon;
grant execute on function public.lusky_driver_document_status(uuid) to authenticated;

create or replace function internal.lusky_auth_user_profile_bootstrap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data,'{}'::jsonb);
  v_type text := upper(coalesce(v_meta->>'document_type',''));
  v_document text := coalesce(v_meta->>'document_number','');
  v_normalized text := regexp_replace(v_document,'[^0-9A-Za-z]','','g');
  v_valid boolean;
  v_name text := trim(coalesce(v_meta->>'full_name',''));
begin
  if lower(new.email) = 'luskyfood1@gmail.com' then
    update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"owner"}'::jsonb
      where id = new.id;
    return new;
  end if;

  if v_meta->>'account_type' is distinct from 'motoboy' then return new; end if;

  if length(v_name) < 3 or length(v_name) > 120 then
    raise exception 'Informe seu nome completo.' using errcode = '22023';
  end if;
  if v_type not in ('CPF','RG') then
    raise exception 'Escolha CPF ou RG.' using errcode = '22023';
  end if;
  if v_type = 'CPF' then
    v_valid := internal.lusky_cpf_is_valid(v_document);
  else
    -- RG has no single national checksum; this checks only the submitted format.
    v_valid := length(v_normalized) between 5 and 14 and v_normalized ~ '^[0-9A-Za-z]+$';
  end if;
  if not v_valid then raise exception 'Documento inválido. Confira os dados e tente novamente.' using errcode = '22023'; end if;
  if length(trim(coalesce(v_meta->>'vehicle_color',''))) < 2
    or length(trim(coalesce(v_meta->>'vehicle_brand',''))) < 2
    or length(trim(coalesce(v_meta->>'vehicle_model',''))) < 1
    or coalesce(v_meta->>'vehicle_plate','') !~* '^[a-z]{3}[0-9][a-z0-9][0-9]{2}$' then
    raise exception 'Confira cor, placa, marca e modelo do veículo.' using errcode = '22023';
  end if;

  update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"motoboy"}'::jsonb
    where id = new.id;
  insert into public.lusky_motoboy_profiles(id,full_name,vehicle_color,vehicle_plate,vehicle_brand,vehicle_model)
  values (new.id,v_name,trim(v_meta->>'vehicle_color'),upper(regexp_replace(v_meta->>'vehicle_plate','[^0-9A-Za-z]','','g')),trim(v_meta->>'vehicle_brand'),trim(v_meta->>'vehicle_model'));
  insert into internal.lusky_motoboy_documents(user_id,document_type,document_number,document_masked,document_valid)
  values (
    new.id,v_type,v_document,
    case when v_type = 'CPF' then '***.***.' || right(regexp_replace(v_document,'\D','','g'),5) else '••••' || right(v_normalized,3) end,
    v_valid
  );
  return new;
exception when unique_violation then
  raise exception 'Este documento, placa ou identificador já está cadastrado.' using errcode = '23505';
end;
$$;
revoke all on function internal.lusky_auth_user_profile_bootstrap() from public, anon, authenticated;

drop trigger if exists lusky_auth_user_profile_bootstrap on auth.users;
create trigger lusky_auth_user_profile_bootstrap
  after insert on auth.users
  for each row execute function internal.lusky_auth_user_profile_bootstrap();

-- Existing owner account gets the role claim after its next sign-in/token refresh.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"owner"}'::jsonb
where lower(email) = 'luskyfood1@gmail.com';

comment on table public.lusky_motoboy_profiles is 'Public route identity and vehicle card; never stores RG/CPF.';
comment on table internal.lusky_motoboy_documents is 'Private RG/CPF values for motoboy verification; not exposed through the Data API.';
comment on column public.lusky_motoboy_profiles.driver_code is 'Stable public identifier shown to the motoboy, assigned customer, and Lusky staff.';
