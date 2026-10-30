-- Service-role-only helper for editing a driver's private document and vehicle card.
create or replace function public.lusky_admin_save_driver(
  p_user_id uuid,
  p_full_name text,
  p_document_type text,
  p_document_number text,
  p_vehicle_color text,
  p_vehicle_plate text,
  p_vehicle_brand text,
  p_vehicle_model text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number text := regexp_replace(upper(coalesce(p_document_number,'')), '[^0-9A-Z]', '', 'g');
  v_valid boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Acesso restrito.' using errcode = '42501';
  end if;
  if p_user_id is null or length(trim(coalesce(p_full_name,''))) not between 3 and 120 then
    raise exception 'Dados do motoboy inválidos.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_vehicle_color,''))) not between 2 and 40
    or length(trim(coalesce(p_vehicle_brand,''))) not between 2 and 60
    or length(trim(coalesce(p_vehicle_model,''))) not between 1 and 80
    or coalesce(p_vehicle_plate,'') !~* '^[a-z]{3}[0-9][a-z0-9][0-9]{2}$' then
    raise exception 'Confira cor, placa, marca e modelo do veículo.' using errcode = '22023';
  end if;
  if coalesce(p_document_number,'') <> '' then
    if p_document_type = 'CPF' then
      v_valid := internal.lusky_cpf_is_valid(p_document_number);
    elsif p_document_type = 'RG' then
      v_valid := length(v_number) between 5 and 14 and v_number ~ '^[0-9A-Z]+$';
    else
      v_valid := false;
    end if;
    if not v_valid then raise exception 'Documento inválido.' using errcode = '22023'; end if;
    insert into internal.lusky_motoboy_documents(user_id,document_type,document_number,document_masked,document_valid)
    values (p_user_id,p_document_type,p_document_number,
      case when p_document_type = 'CPF' then '***.***.' || right(regexp_replace(p_document_number,'\D','','g'),5) else '••••' || right(v_number,3) end,
      true)
    on conflict (user_id) do update set document_type=excluded.document_type,document_number=excluded.document_number,document_masked=excluded.document_masked,document_valid=true;
  elsif not exists(select 1 from internal.lusky_motoboy_documents where user_id=p_user_id and document_valid) then
    raise exception 'Informe um documento válido para a conta de motoboy.' using errcode = '22023';
  end if;
  insert into public.lusky_motoboy_profiles(id,full_name,vehicle_color,vehicle_plate,vehicle_brand,vehicle_model,active)
  values(p_user_id,trim(p_full_name),trim(p_vehicle_color),upper(p_vehicle_plate),trim(p_vehicle_brand),trim(p_vehicle_model),false)
  on conflict (id) do update set full_name=excluded.full_name,vehicle_color=excluded.vehicle_color,vehicle_plate=excluded.vehicle_plate,vehicle_brand=excluded.vehicle_brand,vehicle_model=excluded.vehicle_model;
end;
$$;
revoke all on function public.lusky_admin_save_driver(uuid,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.lusky_admin_save_driver(uuid,text,text,text,text,text,text,text) to service_role;
