-- Require a Brazilian mobile number for every newly created Auth account.
-- Existing accounts remain readable; they can fill their missing number in Minha conta.
create or replace function internal.lusky_require_signup_phone()
returns trigger language plpgsql set search_path = '' as $$
declare v_phone text := regexp_replace(coalesce(new.raw_user_meta_data->>'phone',''), '\D', '', 'g');
begin
  if v_phone !~ '^[0-9]{11}$' then
    raise exception 'Informe celular com DDD (11 dígitos) para criar a conta.' using errcode = '22023';
  end if;
  new.raw_user_meta_data := jsonb_set(coalesce(new.raw_user_meta_data,'{}'::jsonb), '{phone}', to_jsonb(v_phone), true);
  return new;
end; $$;
revoke all on function internal.lusky_require_signup_phone() from public, anon, authenticated;
drop trigger if exists lusky_require_signup_phone on auth.users;
create trigger lusky_require_signup_phone before insert on auth.users
  for each row execute function internal.lusky_require_signup_phone();

create or replace function public.lusky_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lusky_profiles (id, display_name, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''))
  on conflict (id) do nothing;
  return new;
end; $$;
revoke all on function public.lusky_handle_new_user() from public, anon, authenticated;
