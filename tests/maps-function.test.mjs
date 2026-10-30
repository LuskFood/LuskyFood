import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { transformWithEsbuild } from 'vite'

const source = await readFile(new URL('../supabase/functions/lusky-maps/index.ts', import.meta.url), 'utf8')
const compiled = (await transformWithEsbuild(source, 'lusky-maps.ts', { format:'cjs', target:'es2022' })).code

async function createHarness({ badGeometry=false, networkFailure=false } = {}) {
  const fixture = {
    user:{id:'rider-a',app_metadata:{role:'motoboy'}},
    order:{id:'order-a',order_number:42,created_by:'customer-a',assigned_driver:'rider-a',order_type:'Entrega',status:'Pronto',delivery_latitude:-23.65,delivery_longitude:-46.77},
    sequenceStops:[{order_number:42,assigned_driver:'rider-a',order_type:'Entrega',status:'Saiu para entrega',delivery_latitude:-23.65,delivery_longitude:-46.77},{order_number:43,assigned_driver:'rider-a',order_type:'Entrega',status:'Saiu para entrega',delivery_latitude:-23.64,delivery_longitude:-46.76}],
    restaurant:{latitude:-23.66,longitude:-46.78}, saved:null, fetches:0, hasKey:true, coordinates:null,
  }
  const client={
    auth:{getUser:async token=>token==='fixture-token'?{data:{user:fixture.user},error:null}:{data:{user:null},error:true}},
    from(table){this.table=table;return {select(){return this},eq(){return this},in(){return this},async maybeSingle(){return {data:table==='lusky_orders'?fixture.order:table==='lusky_restaurant_settings'?fixture.restaurant:fixture.saved}},then(resolve){return Promise.resolve({data:table==='lusky_orders'?fixture.sequenceStops:[],error:null}).then(resolve)},async upsert(value){fixture.saved=value;return {error:null}}}}
  }
  let handler
  const context={
    require:name=>name.startsWith('npm:@supabase/supabase-js')?{createClient:()=>client}:{},
    module:{exports:{}},exports:{},Response,Request,Headers,AbortController,URL,Map,Date,JSON,Number,Math,Array,Set,String,Boolean,Promise,setTimeout,clearTimeout,
    Deno:{env:{get:name=>name==='HEIGIT_API_KEY'?(fixture.hasKey?'fixture-key':undefined):'fixture-value'},serve:fn=>{handler=fn}},
    fetch:async(_url,options)=>{
      fixture.fetches++
      if(networkFailure)throw new Error('offline')
      const coords=JSON.parse(options.body).coordinates
      fixture.coordinates=coords
      const geometry={type:'LineString',coordinates:badGeometry?[coords[0],['invalid',0]]:coords.length===2?[coords[0],[(coords[0][0]+coords[1][0])/2,coords[0][1]],coords[1]]:coords}
      return new Response(JSON.stringify({features:[{geometry,properties:{summary:{distance:1500,duration:300}}}]}),{status:200})
    },
  }
  vm.runInNewContext(compiled,context)
  const request=body=>handler(new Request('https://fixture.invalid', {method:'POST',headers:{Authorization:'Bearer fixture-token','Content-Type':'application/json'},body:JSON.stringify(body)}))
  return {fixture,request}
}

test('map function saves a valid road geometry and reuses it without another provider request', async()=>{
  const {fixture,request}=await createHarness()
  const first=await request({action:'route',order_number:42})
  assert.equal(first.status,200)
  const result=await first.json()
  assert.equal(result.geometry.type,'LineString');assert.equal(result.geometry.coordinates.length,3)
  assert.equal(result.distance_m,1500);assert.equal(fixture.saved.order_id,'order-a')
  fixture.hasKey=false
  const cached=await request({action:'route',order_number:42})
  assert.equal(cached.status,200);assert.equal(fixture.fetches,1)
})

test('pickup route requires the assigned rider and is not persisted', async()=>{
  const {fixture,request}=await createHarness()
  const response=await request({action:'route',stage:'pickup',order_number:42,origin:[-46.79,-23.67]})
  assert.equal(response.status,200);assert.equal(fixture.saved,null)
  fixture.user={id:'other-rider',app_metadata:{role:'motoboy'}}
  const denied=await request({action:'route',stage:'pickup',order_number:42,origin:[-46.79,-23.67]})
  assert.equal(denied.status,403)
})

test('map function rejects invalid geometry and reports provider network failure', async()=>{
  const invalid=await createHarness({badGeometry:true})
  assert.equal((await invalid.request({action:'route',order_number:42})).status,404)
  assert.equal(invalid.fixture.saved,null)
  const offline=await createHarness({networkFailure:true})
  assert.equal((await offline.request({action:'route',order_number:42})).status,504)
  assert.equal(offline.fixture.saved,null)
})

test('sequence route follows ordered active stops assigned to the signed-in rider', async()=>{
  const {fixture,request}=await createHarness()
  const response=await request({action:'sequence',order_numbers:[42,43]})
  assert.equal(response.status,200)
  const value=await response.json()
  assert.equal(value.geometry.coordinates.length,3)
  assert.equal(value.profile,'driving-car-shortest-sequence')
  assert.deepEqual(fixture.coordinates, [[-46.78,-23.66],[-46.77,-23.65],[-46.76,-23.64]])
  assert.equal(fixture.saved,null)
  fixture.sequenceStops[1].assigned_driver='other-rider'
  const denied=await request({action:'sequence',order_numbers:[42,43]})
  assert.equal(denied.status,403)
})
