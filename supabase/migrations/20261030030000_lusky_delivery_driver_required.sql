-- A delivery cannot be in transit without an assigned rider.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.lusky_orders'::regclass
      and conname = 'lusky_in_transit_requires_driver'
  ) then
    alter table public.lusky_orders
      add constraint lusky_in_transit_requires_driver
      check (status <> 'Saiu para entrega' or (order_type = 'Entrega' and assigned_driver is not null))
      not valid;
  end if;
end $$;

alter table public.lusky_orders validate constraint lusky_in_transit_requires_driver;
