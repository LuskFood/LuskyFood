import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('admin history is account-attributed, role-checked and paginated with completed-only revenue', async t => {
  const db = new PGlite()
  t.after(() => db.close())
  await db.exec(await readFile(new URL('./fixtures/handoff-schema.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../supabase/migrations/20261030230235_lusky_admin_customer_history.sql', import.meta.url), 'utf8'))
  const admin='00000000-0000-0000-0000-000000000005', c1='00000000-0000-0000-0000-000000000001', c2='00000000-0000-0000-0000-000000000002', staffCreator='00000000-0000-0000-0000-000000000006'
  const rider='00000000-0000-0000-0000-000000000007'
  await db.query("insert into auth.users(id,raw_app_meta_data) values ($1,'{\"role\":\"customer\"}'),($2,'{\"role\":\"customer\"}'),($3,'{\"role\":\"staff\"}'),($4,'{\"role\":\"motoboy\"}')",[c1,c2,staffCreator,rider])
  await db.query('insert into public.lusky_profiles(id,full_name,phone) values ($1,\'Ana Lima\',\'11999990000\'),($2,\'Ana Lima\',\'11999991111\')',[c1,c2])
  await db.query(`insert into public.lusky_orders(id,order_number,created_by,order_type,status,customer_name,customer_phone,items,total,created_at)
    values ('10000000-0000-0000-0000-000000000001',201,$1,'Entrega','Entregue','Ana Lima','11999990000','[{"name":"Sobá","quantity":2,"unit_price":25}]',50,'2026-10-01'),
    ('10000000-0000-0000-0000-000000000002',202,$1,'Retirada','Cancelado','Ana Lima','11999990000','[]',90,'2026-10-02'),
    ('10000000-0000-0000-0000-000000000003',203,$1,'Entrega','Entregue','Ana Lima','11999990000','[]',20,'2026-10-03'),
    ('10000000-0000-0000-0000-000000000004',204,$2,'Entrega','Entregue','Ana Lima','11999991111','[]',10,'2026-10-04'),
    ('10000000-0000-0000-0000-000000000005',205,$3,'Entrega','Entregue','Cliente de terceiros','11900000000','[]',999,'2026-10-05')`,[c1,c2,staffCreator])
  await db.query("update public.lusky_orders set assigned_driver=$1 where order_number in (201,202)",[rider])
  await db.query("insert into public.lusky_customer_addresses(id,user_id,label,zip_code,street,street_number,district,city,state,is_default) values ('20000000-0000-0000-0000-000000000001',$1,'Casa','01001000','Rua A','1','Centro','São Paulo','SP',true)",[c1])
  async function as(user,role,sql,params=[]){await db.exec('set role authenticated');try{await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('test.lusky_role',$2,false)",[user,role]);return await db.query(sql,params)}finally{await db.exec('reset role')}}
  const directory=(await as(admin,'owner',"select public.lusky_admin_customer_directory('',1,0) as result")).rows[0].result
  assert.equal(directory.total,2);assert.equal(directory.customers.length,1);assert.equal(directory.customers[0].order_count,3);assert.equal(directory.customers[0].completed_count,2);assert.equal(directory.customers[0].cancelled_count,1);assert.equal(Number(directory.customers[0].completed_total),70)
  const next=(await as(admin,'owner',"select public.lusky_admin_customer_directory('1111',25,0) as result")).rows[0].result
  assert.equal(next.total,1);assert.equal(next.customers[0].id,c2)
  const first=(await as(admin,'owner','select public.lusky_admin_customer_history($1,1,0) as result',[c1])).rows[0].result
  assert.equal(first.summary.order_count,3);assert.equal(first.orders.length,1);assert.equal(first.orders[0].order_number,203);assert.equal(first.addresses.length,1)
  const second=(await as(admin,'owner','select public.lusky_admin_customer_history($1,1,1) as result',[c1])).rows[0].result
  assert.equal(second.orders[0].order_number,202)
  const wrappers=await db.query("select bool_and(not p.prosecdef) as invoker from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('lusky_admin_customer_directory','lusky_admin_customer_history','lusky_admin_driver_history')")
  assert.equal(wrappers.rows[0].invoker,true)
  await assert.rejects(as(c1,'customer',"select public.lusky_admin_customer_directory()"),/Acesso administrativo/i)
  await assert.rejects(as(admin,'owner','select public.lusky_admin_customer_history($1,20,0)',[staffCreator]),/não encontrada/i)
  const riderHistory=(await as(admin,'owner','select public.lusky_admin_driver_history($1,1,0) as result',[rider])).rows[0].result
  assert.equal(riderHistory.summary.assigned_count,2);assert.equal(riderHistory.summary.completed_count,1);assert.equal(riderHistory.summary.cancelled_count,1);assert.equal(riderHistory.orders.length,1)
  await assert.rejects(as(c1,'customer','select public.lusky_admin_driver_history($1,20,0)',[rider]),/Acesso administrativo/i)
  const unlinked=(await as(admin,'owner','select public.lusky_admin_unlinked_order_page(20,0) as result')).rows[0].result
  assert.equal(unlinked.total,1);assert.equal(unlinked.orders[0].order_number,205);assert.equal(unlinked.orders[0].customer_name,'Cliente de terceiros')
  await assert.rejects(as(c1,'customer','select public.lusky_admin_unlinked_order_page(20,0)'),/Acesso administrativo/i)
})
