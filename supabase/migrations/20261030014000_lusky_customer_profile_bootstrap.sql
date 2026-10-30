create or replace function public.lusky_handle_new_user()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.lusky_profiles(id,display_name,full_name,phone)
  values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''))
  on conflict(id) do nothing;
  return new;
end; $$;
revoke all on function public.lusky_handle_new_user() from public, anon, authenticated;
