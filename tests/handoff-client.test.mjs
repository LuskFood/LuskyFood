import test from 'node:test'
import assert from 'node:assert/strict'
import { confirmHandoffRequest } from '../src/handoff.js'

test('pickup and delivery call the correct server RPC and preserve the six-digit code', async () => {
  const calls=[]
  const client={rpc:async(name,args)=>{calls.push({name,args});return {data:true,error:null}}}
  assert.equal((await confirmHandoffRequest(client,{orderNumber:42,action:'pickup',driverId:'rider-id'})).ok,true)
  assert.deepEqual(calls[0],{name:'lusky_team_confirm_pickup',args:{p_order_number:42,p_driver_id:'rider-id'}})
  assert.equal((await confirmHandoffRequest(client,{orderNumber:42,action:'delivery',code:'001234'})).ok,true)
  assert.deepEqual(calls[1],{name:'lusky_confirm_handoff',args:{p_order_number:42,p_action:'delivery',p_code:'001234'}})
  assert.equal((await confirmHandoffRequest(client,{orderNumber:42,action:'delivery',code:'123'})).ok,false)
  assert.equal(calls.length,2)
})

test('wrong code, lockout and lost connection never report a successful confirmation', async () => {
  const args={orderNumber:42,action:'delivery',code:'001234'}
  assert.equal((await confirmHandoffRequest({rpc:async()=>({data:false,error:null})},args)).ok,false)
  const locked=await confirmHandoffRequest({rpc:async()=>({data:null,error:{message:'Código temporariamente bloqueado.'}})},args)
  assert.match(locked.message,/bloqueado/); assert.equal(locked.ok,false)
  const failed=await confirmHandoffRequest({rpc:async()=>{throw new Error('network lost')}},args)
  assert.equal(failed.ok,false); assert.match(failed.message,/conexão/)
})
