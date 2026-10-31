-- Idempotent, fictional production showcase. Run only after lusky_demo_customers.
-- All orders are historical and completed, so they never enter the live rider queue.
insert into public.lusky_demo_customers
  (demo_key,full_name,contact_email,delivery_address,delivery_latitude,delivery_longitude)
values
  ('showcase-01','Marina Costa','marina@example.invalid','Endereço fictício · Jardim Ipê, São Paulo/SP',-23.6524,-46.7688),
  ('showcase-02','Pedro Henrique','pedro@example.invalid','Endereço fictício · Capão Redondo, São Paulo/SP',-23.6617,-46.7678),
  ('showcase-03','Camila Oliveira','camila@example.invalid','Endereço fictício · Vila Andrade, São Paulo/SP',-23.6590,-46.7795),
  ('showcase-04','Lucas Martins','lucas@example.invalid','Endereço fictício · Vila das Belezas, São Paulo/SP',-23.6458,-46.7812),
  ('showcase-05','Ana Beatriz','ana@example.invalid','Endereço fictício · Parque Santo Antônio, São Paulo/SP',-23.6638,-46.7864),
  ('showcase-06','Bruno Ferreira','bruno@example.invalid','Endereço fictício · Jardim Germânia, São Paulo/SP',-23.6530,-46.7605),
  ('showcase-07','Juliana Rocha','juliana@example.invalid','Endereço fictício · Jardim São Luís, São Paulo/SP',-23.6492,-46.7701),
  ('showcase-08','Rafael Nunes','rafael@example.invalid','Endereço fictício · Pirajussara, São Paulo/SP',-23.6430,-46.7782),
  ('showcase-09','Beatriz Lima','beatriz@example.invalid','Endereço fictício · Jardim Ângela, São Paulo/SP',-23.6691,-46.7760),
  ('showcase-10','André Santos','andre@example.invalid','Endereço fictício · Campo Limpo, São Paulo/SP',-23.6386,-46.7732)
on conflict (demo_key) do update set
  full_name=excluded.full_name,contact_email=excluded.contact_email,
  delivery_address=excluded.delivery_address,delivery_latitude=excluded.delivery_latitude,
  delivery_longitude=excluded.delivery_longitude;

do $$
declare v_owner uuid;
begin
  select id into v_owner from auth.users where raw_app_meta_data->>'role'='owner' order by created_at limit 1;
  if v_owner is null then raise exception 'Conta administradora não encontrada para a demonstração.'; end if;

  with numbered as (
    select n, 'showcase-'||lpad((((n-1)%10)+1)::text,2,'0') as customer_key,
      case when n <= 7 then now() - (n * interval '20 hours')
           when n <= 20 then now() - ((n-6) * interval '18 days')
           else now() - ((n-20) * interval '42 days') end as placed_at
    from generate_series(1,30) n
  ), dishes as (
    select id,name,price,row_number() over(order by name) as rank from public.lusky_products
    where name in ('Frango Xadrez','Kibe Cru','Sobá','Yakisoba') and available
  )
  insert into public.lusky_orders
    (created_by,customer_name,order_type,items,total,status,created_at,updated_at,
     delivery_address,delivery_latitude,delivery_longitude,delivery_fee,
     payment_method,payment_status,delivered_at,pickup_code,demo_customer_id,demo_seed_key)
  select v_owner,c.full_name,'Entrega',
    jsonb_build_array(jsonb_build_object('product_id',p.id,'name',p.name,
      'quantity',1+(x.n%3),'unit_price',p.price)),
    p.price * (1+(x.n%3)) + 8,'Entregue',x.placed_at,
    x.placed_at + interval '47 minutes',c.delivery_address,
    c.delivery_latitude,c.delivery_longitude,8,
    'cash','not_applicable',x.placed_at + interval '47 minutes',
    lpad((600000+x.n)::text,6,'0'),c.id,'lusky-showcase-2026-'||lpad(x.n::text,2,'0')
  from numbered x
  join public.lusky_demo_customers c on c.demo_key=x.customer_key
  join dishes p on p.rank=1+((x.n-1)%4)
  on conflict do nothing;
end $$;
