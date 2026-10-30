create or replace function internal.lusky_initial_payment_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.payment_status := case when new.payment_method = 'manual_pix' then 'pending' else 'not_applicable' end;
  new.payment_confirmed_at := null;
  new.payment_confirmed_by := null;
  return new;
end; $$;
revoke all on function internal.lusky_initial_payment_status() from public, anon, authenticated;
drop trigger if exists lusky_initial_payment_status on public.lusky_orders;
create trigger lusky_initial_payment_status before insert on public.lusky_orders
for each row execute function internal.lusky_initial_payment_status();

create or replace function internal.lusky_require_confirmed_pix()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'Novo pedido' and new.status = 'Preparando'
     and new.payment_method = 'manual_pix' and new.payment_status <> 'confirmed' then
    raise exception 'Confira o Pix manual antes de iniciar o preparo.' using errcode = '22023';
  end if;
  return new;
end; $$;
revoke all on function internal.lusky_require_confirmed_pix() from public, anon, authenticated;
drop trigger if exists lusky_require_confirmed_pix on public.lusky_orders;
create trigger lusky_require_confirmed_pix before update of status on public.lusky_orders
for each row execute function internal.lusky_require_confirmed_pix();
