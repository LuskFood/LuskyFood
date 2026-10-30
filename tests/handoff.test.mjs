import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Isolated Postgres with minimal Auth/table fixtures. Never connects to the real project.
test('delivery migration enforces assignment, pickup, code ownership, attempts and one-time completion', async t => {
  const db = new PGlite()
  t.after(() => db.close())
  await db.exec(await readFile(new URL('./fixtures/handoff-schema.sql', import.meta.url), 'utf8'))
  const oldCore = await readFile(new URL('../supabase/migrations/20261030000000_lusky_operational_core.sql', import.meta.url), 'utf8')
  const start = oldCore.indexOf('create or replace function public.lusky_team_transition(')
  const end = oldCore.indexOf('create or replace function public.lusky_assign_driver(', start)
  assert.ok(start >= 0 && end > start, 'existing pickup-counter transition is available')
  await db.exec(oldCore.slice(start, end))
  await db.exec(await readFile(new URL('../supabase/migrations/20261030230158_lusky_delivery_handoff_v2.sql', import.meta.url), 'utf8'))
  const actors = {
    customer:'00000000-0000-0000-0000-000000000001', otherCustomer:'00000000-0000-0000-0000-000000000002',
    rider:'00000000-0000-0000-0000-000000000003', otherRider:'00000000-0000-0000-0000-000000000004',
    admin:'00000000-0000-0000-0000-000000000005',
  }
  const ids = ['10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000005']
  await db.query('insert into public.lusky_motoboy_profiles values ($1,true),($2,true)', [actors.rider,actors.otherRider])
  await db.query('insert into internal.lusky_motoboy_documents values ($1,true),($2,true)', [actors.rider,actors.otherRider])
  await db.query(`insert into public.lusky_orders(id,order_number,created_by,assigned_driver,order_type,status)
    values ($1,101,$6,null,'Entrega','Novo pedido'),($2,102,$7,$8,'Entrega','Pronto'),($3,103,$6,null,'Retirada','Pronto'),($4,104,$6,$9,'Entrega','Preparando'),($5,105,$10,$8,'Entrega','Saiu para entrega')`, [...ids,actors.customer,actors.otherCustomer,actors.otherRider,actors.rider,actors.admin])
  await db.query('insert into public.lusky_order_handoffs(order_id,delivery_code) values($1,$4),($2,$5),($3,$6),($7,$8)', [ids[0],ids[1],ids[3],'123456','654321','111222',ids[4],'999888'])
  async function as(user, role, sql, params = []) {
    await db.exec('set role authenticated')
    try {
      await db.query("select set_config('request.jwt.claim.sub',$1,false), set_config('test.lusky_role',$2,false)", [user,role])
      return await db.query(sql, params)
    } finally { await db.exec('reset role') }
  }
  const state = async number => (await db.query('select status,assigned_driver,delivered_at from public.lusky_orders where order_number=$1',[number])).rows[0]
  assert.equal((await as(actors.admin,'owner','select public.lusky_assign_driver(101,$1,null) as ok',[actors.rider])).rows[0].ok,true)
  assert.equal((await state(101)).status,'Novo pedido')
  assert.deepEqual((await as(actors.rider,'motoboy','select order_number from public.lusky_orders order by order_number')).rows.map(row=>Number(row.order_number)),[101,104])
  await assert.rejects(as(actors.admin,'owner','select public.lusky_team_confirm_pickup(101,$1)',[actors.rider]),/pronto/i)
  await assert.rejects(as(actors.rider,'motoboy',"select public.lusky_confirm_handoff(104,'delivery','111222')"),/indisponível/i)
  await db.query("update public.lusky_orders set status='Pronto' where order_number=101")
  await assert.rejects(as(actors.otherRider,'motoboy',"select public.lusky_confirm_handoff(101,'delivery','123456')"),/atribuído/i)
  await assert.rejects(as(actors.rider,'motoboy',"select public.lusky_confirm_handoff(101,'pickup','123456')"),/equipe/i)
  await assert.rejects(as(actors.admin,'owner','select public.lusky_team_confirm_pickup(101,$1)',[actors.otherRider]),/motoboy/i)
  assert.equal((await as(actors.admin,'owner','select public.lusky_team_confirm_pickup(101,$1) as ok',[actors.rider])).rows[0].ok,true)
  assert.equal((await state(101)).status,'Saiu para entrega')
  assert.equal((await as(actors.customer,'customer','select public.lusky_customer_delivery_code(101) as code')).rows[0].code,'123456')
  assert.equal((await as(actors.otherCustomer,'customer','select public.lusky_customer_delivery_code(101) as code')).rows[0].code,null)
  await assert.rejects(as(actors.rider,'motoboy','select public.lusky_customer_delivery_code(101)'),/cliente/i)
  await assert.rejects(as(actors.admin,'owner','select public.lusky_customer_delivery_code(105)'),/cliente/i)
  assert.equal((await as(actors.customer,'customer','select public.lusky_customer_delivery_code(105) as code')).rows[0].code,null)
  assert.equal((await as(actors.rider,'motoboy',"select public.lusky_confirm_handoff(101,'delivery','000000') as ok")).rows[0].ok,false)
  assert.equal((await as(actors.rider,'motoboy',"select public.lusky_confirm_handoff(101,'delivery','654321') as ok")).rows[0].ok,false)
  assert.equal((await state(101)).status,'Saiu para entrega')
  await db.query('update internal.lusky_delivery_attempts set failed_attempts=0,locked_until=null where order_id=$1',[ids[0]])
  for(let i=0;i<5;i++) assert.equal((await as(actors.rider,'motoboy',"select public.lusky_confirm_handoff(101,'delivery','000000') as ok")).rows[0].ok,false)
  await assert.rejects(as(actors.rider,'motoboy',"select public.lusky_confirm_handoff(101,'delivery','123456')"),/bloqueado/i)
  await db.query("update internal.lusky_delivery_attempts set locked_until=now()-interval '1 second' where order_id=$1",[ids[0]])
  assert.equal((await as(actors.rider,'motoboy',"select public.lusky_confirm_handoff(101,'delivery','123456') as ok")).rows[0].ok,true)
  const delivered = await state(101)
  assert.equal(delivered.status,'Entregue'); assert.ok(delivered.delivered_at)
  assert.ok((await db.query('select consumed_at from public.lusky_order_handoffs where order_id=$1',[ids[0]])).rows[0].consumed_at)
  await assert.rejects(as(actors.rider,'motoboy',"select public.lusky_confirm_handoff(101,'delivery','123456')"),/indisponível/i)
  assert.equal((await as(actors.customer,'customer','select public.lusky_customer_delivery_code(101) as code')).rows[0].code,null)
  assert.deepEqual((await as(actors.rider,'motoboy','select order_number from public.lusky_orders order by order_number')).rows.map(row=>Number(row.order_number)),[101,104])
  assert.equal((await as(actors.admin,'owner',"select public.lusky_team_transition(103,'Entregue','') as ok")).rows[0].ok,true)
  assert.equal((await state(103)).assigned_driver,null)
  const privileges = await db.query("select has_function_privilege('authenticated','public.lusky_team_confirm_handoff(bigint,text,text)','execute') as old_team, has_function_privilege('authenticated','public.lusky_kitchen_pickup_code(bigint)','execute') as old_kitchen, has_function_privilege('authenticated','internal.lusky_transition_assigned_order(bigint,text,text)','execute') as old_internal, has_function_privilege('authenticated','public.lusky_motoboy_transition(bigint,text,text)','execute') as old_rider")
  assert.equal(privileges.rows[0].old_team,false); assert.equal(privileges.rows[0].old_kitchen,false); assert.equal(privileges.rows[0].old_internal,false); assert.equal(privileges.rows[0].old_rider,false)
  const wrappers=await db.query("select count(*) as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('lusky_assign_driver','lusky_team_confirm_pickup','lusky_confirm_handoff','lusky_customer_delivery_code') and p.prosecdef")
  assert.equal(Number(wrappers.rows[0].n),0)
  assert.equal(Number((await db.query("select count(*) as n from public.lusky_order_events where order_id=$1 and to_status='Entregue'",[ids[0]])).rows[0].n),1)
})
