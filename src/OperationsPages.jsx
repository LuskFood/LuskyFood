import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bike, CheckCircle2, Clock3, MapPin, Search, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { mapRequest } from './delivery'
import { supabase } from './supabase'

const DeliveryMap = lazy(() => import('./DeliveryMap'))
const money = value => Number(value || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}) : '—'
const todayKey = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const dayKey = value => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))
const completed = order => order.status === 'Entregue'
const nextStatus = order => order.status === 'Novo pedido' ? 'Preparando' : order.status === 'Preparando' ? 'Pronto' : order.status === 'Pronto' && order.type !== 'Entrega' ? 'Entregue' : null

function Metric({ label, value, detail }) { return <article className="stat-card"><div className="stat-number">{value}</div><div className="stat-label">{label}</div><div className="stat-note">{detail}</div></article> }

export function OverviewPage({ orders, products, setPage, onNewOrder }) {
  const today = orders.filter(order => order.created_at && dayKey(order.created_at) === todayKey())
  const delivered = today.filter(completed)
  const revenue = delivered.reduce((sum,order)=>sum+Number(order.total),0)
  const active = orders.filter(order=>!['Entregue','Cancelado'].includes(order.status))
  return <><div className="section-heading"><div><h1>Operação de hoje</h1><p>Pedidos confirmados no banco, no horário de Brasília.</p></div><button className="button button-dark" onClick={onNewOrder}>Novo pedido</button></div><div className="stats-grid"><Metric label="Pedidos recebidos hoje" value={today.length} detail="Inclui pedidos ainda em preparo"/><Metric label="Em andamento" value={active.length} detail="Pedidos que precisam de ação"/><Metric label="Entregues hoje" value={delivered.length} detail="Conclusões confirmadas"/><Metric label="Vendas concluídas hoje" value={money(revenue)} detail="Soma dos pedidos entregues"/></div>
    <section className="panel recent-panel"><div className="panel-heading"><div><h2>Pedidos que precisam de atenção</h2><small>{active.length} em andamento</small></div><button className="text-button" onClick={()=>setPage('Pedidos')}>Abrir central <ArrowRight size={14}/></button></div>{active.length ? active.slice(0,8).map(order=><div className="ops-order-row" key={order.id}><b>{order.id}</b><span>{order.name}</span><span>{order.status}</span><small>{dateTime(order.created_at)}</small></div>) : <div className="empty-state">Nenhum pedido em andamento.</div>}</section>
    <section className="panel popular-panel"><div className="panel-heading"><h2>Cardápio disponível</h2><button className="text-button" onClick={()=>setPage('Cardápio')}>Gerenciar</button></div><p>{products.filter(product=>product.available).length} de {products.length} pratos disponíveis para novos pedidos.</p></section></>
}

function KitchenCode({ order }) {
  const [code,setCode]=useState('')
  const [error,setError]=useState('')
  if (order.type!=='Entrega'||order.status!=='Pronto') return null
  const load=async()=>{if(!supabase){setError('Código disponível apenas no sistema conectado.');return}const {data,error:apiError}=await supabase.rpc('lusky_kitchen_pickup_code',{p_order_number:Number(String(order.id).replace(/\D/g,''))});if(apiError||!data)setError('Código indisponível.');else setCode(data)}
  return <div className="kitchen-code"><button className="text-button" onClick={load}>Ver código da cozinha</button>{code&&<strong>{code}</strong>}{error&&<small role="alert">{error}</small>}</div>
}

function OrderDetails({ order, restaurant, drivers }) {
  const [route,setRoute]=useState(null)
  const [routeError,setRouteError]=useState('')
  const [location,setLocation]=useState(null)
  const [events,setEvents]=useState([])
  const [incidents,setIncidents]=useState([])
  const [now,setNow]=useState(Date.now())
  useEffect(()=>{
    if(!supabase||order.type!=='Entrega'||order.delivery_latitude==null)return
    let alive=true
    mapRequest(supabase,{action:'route',order_number:Number(String(order.id).replace(/\D/g,''))}).then(value=>{if(alive)setRoute(value)}).catch(error=>{if(alive)setRouteError(error.message)})
    return()=>{alive=false}
  },[order.id,order.delivery_latitude])
  useEffect(()=>{
    if(!supabase||!order.db_id)return
    let alive=true
    Promise.all([supabase.from('lusky_order_events').select('to_status,reason,created_at').eq('order_id',order.db_id).order('created_at'),supabase.from('lusky_delivery_incidents').select('id,detail,status,created_at').eq('order_id',order.db_id).order('created_at',{ascending:false})]).then(([history,problems])=>{if(alive){setEvents(history.data||[]);setIncidents(problems.data||[])}})
    return()=>{alive=false}
  },[order.db_id,order.status])
  useEffect(()=>{
    if(!supabase||!order.assigned_driver||order.status!=='Saiu para entrega'){setLocation(null);return}
    let alive=true
    const load=async()=>{const {data}=await supabase.from('lusky_driver_locations').select('*').eq('driver_id',order.assigned_driver).maybeSingle();if(alive)setLocation(data||null)}
    load()
    const channel=supabase.channel(`ops-location-${order.id}`).on('postgres_changes',{event:'*',schema:'public',table:'lusky_driver_locations',filter:`driver_id=eq.${order.assigned_driver}`},load).subscribe(status=>{if(status==='SUBSCRIBED')load()})
    const timer=setInterval(()=>{setNow(Date.now());load()},30000)
    return()=>{alive=false;clearInterval(timer);supabase.removeChannel(channel)}
  },[order.id,order.assigned_driver,order.status])
  const fresh=location&&now-Date.parse(location.observed_at)<120000?location:null
  const resolveIncident=async id=>{const {data,error}=await supabase.rpc('lusky_resolve_incident',{p_incident_id:id});if(!error&&data===true)setIncidents(list=>list.map(item=>item.id===id?{...item,status:'resolved'}:item))}
  return <div className="ops-details"><p><b>Pedido:</b> {order.items?.map(item=>`${item.quantity}× ${item.name}`).join(' · ')}</p><p><b>Total:</b> {money(order.total)} · <b>Pagamento:</b> {order.payment_method==='manual_pix'?'Pix manual, aguardando conferência':'Na entrega/retirada'}</p>{order.type==='Entrega'&&<><p><MapPin size={14}/> {order.address||'Endereço legado sem ponto confirmado'}</p><p><Bike size={14}/> {drivers.find(driver=>driver.id===order.assigned_driver)?.full_name||'Aguardando motoboy'}</p><Suspense fallback={<div className="map-unavailable">Abrindo mapa…</div>}><DeliveryMap restaurant={restaurant} destination={order.delivery_latitude!=null?{latitude:order.delivery_latitude,longitude:order.delivery_longitude}:null} rider={fresh} route={route}/></Suspense><small>{route?`Rota planejada ${(route.distance_m/1000).toFixed(1)} km · ${Math.ceil(route.duration_s/60)} min estimados · calculada ${dateTime(route.calculated_at)}`:routeError||'Aguardando rota planejada.'}</small><small>{fresh?`GPS observado ${dateTime(fresh.observed_at)} · precisão ${Math.round(fresh.accuracy_m)} m`:location?`GPS desatualizado desde ${dateTime(location.observed_at)}`:'Sem GPS recebido.'}</small></>}{events.length>0&&<div className="ops-events"><b>Histórico de etapas</b>{events.map((event,index)=><div key={index}>{dateTime(event.created_at)} · {event.to_status}{event.reason&&` · ${event.reason}`}</div>)}</div>}{incidents.length>0&&<div className="ops-incidents"><b>Ocorrências</b>{incidents.map(item=><div key={item.id}>{dateTime(item.created_at)} · {item.status==='open'?'Aberta':'Resolvida'} · {item.detail} {item.status==='open'&&<button className="text-button" onClick={()=>resolveIncident(item.id)}>Marcar resolvida</button>}</div>)}</div>}</div>
}

export function OrdersPage({ orders, drivers, restaurant, onStatus, onAssignDriver, onSequence, onNewOrder }) {
  const [status,setStatus]=useState('Todos')
  const [type,setType]=useState('Todos')
  const [driver,setDriver]=useState('Todos')
  const [search,setSearch]=useState('')
  const [page,setPage]=useState(1)
  const [selected,setSelected]=useState(null)
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [suggestion,setSuggestion]=useState(null)
  const [routeBusy,setRouteBusy]=useState(false)
  const filtered=useMemo(()=>orders.filter(order=>(status==='Todos'||order.status===status)&&(type==='Todos'||order.type===type)&&(driver==='Todos'||(driver==='Sem motoboy'?!order.assigned_driver:order.assigned_driver===driver))&&`${order.name} ${order.id} ${order.address||''}`.toLowerCase().includes(search.toLowerCase())),[orders,status,type,driver,search])
  useEffect(()=>setPage(1),[status,type,driver,search])
  const pages=Math.max(1,Math.ceil(filtered.length/20))
  const visible=filtered.slice((page-1)*20,page*20)
  const transition=async(order,next)=>{setBusy(order.id);setError('');const okay=await onStatus(order.id,next);if(!okay)setError(`Não foi possível atualizar ${order.id}.`);setBusy('')}
  const readyRoutes=drivers.map(item=>({driver:item,orders:orders.filter(order=>order.type==='Entrega'&&order.status==='Pronto'&&order.assigned_driver===item.id)})).filter(item=>item.orders.length>=2)
  const suggest=async group=>{setRouteBusy(true);setError('');setSuggestion(null);try{const result=await mapRequest(supabase,{action:'optimize',order_numbers:group.orders.map(order=>Number(String(order.id).replace(/\D/g,'')))});setSuggestion({driver_id:group.driver.id,...result})}catch(error){setError(error.message)}finally{setRouteBusy(false)}}
  const move=(index,delta)=>setSuggestion(current=>{const numbers=[...current.order_numbers];[numbers[index],numbers[index+delta]]=[numbers[index+delta],numbers[index]];return {...current,order_numbers:numbers}})
  const apply=async()=>{setRouteBusy(true);const okay=await onSequence(suggestion.driver_id,suggestion.order_numbers);setRouteBusy(false);if(okay)setSuggestion(null)}
  return <><div className="section-heading"><div><h1>Central de pedidos</h1><p>Filtre, acompanhe e avance cada etapa confirmada.</p></div><button className="button button-dark" onClick={onNewOrder}>Novo pedido</button></div><section className="panel orders-panel"><div className="ops-filters"><label>Status<select value={status} onChange={event=>setStatus(event.target.value)}>{['Todos','Novo pedido','Preparando','Pronto','Saiu para entrega','Entregue','Cancelado'].map(value=><option key={value}>{value}</option>)}</select></label><label>Tipo<select value={type} onChange={event=>setType(event.target.value)}>{['Todos','Entrega','Retirada','Salão','Salão · Mesa 01'].map(value=><option key={value}>{value}</option>)}</select></label><label>Motoboy<select value={driver} onChange={event=>setDriver(event.target.value)}><option>Todos</option><option>Sem motoboy</option>{drivers.map(item=><option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label><label>Buscar<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Número, cliente ou endereço"/></label></div>
    {error&&<p className="checkout-error" role="alert">{error}</p>}{visible.length?visible.map(order=><div className="ops-order" key={order.id}><div className="ops-order-row"><button className="text-button" onClick={()=>setSelected(selected===order.id?null:order.id)}>{order.id}</button><b>{order.name}</b><span>{order.status}</span><span>{order.type}</span><span>{money(order.total)}</span><small>{dateTime(order.created_at)}</small>{nextStatus(order)&&<button className="button button-dark" disabled={busy===order.id} onClick={()=>transition(order,nextStatus(order))}>{nextStatus(order)}</button>}</div>
      {order.type==='Entrega'&&order.status==='Pronto'&&<div className="ops-assignment"><KitchenCode order={order}/><label>Motoboy <select value={order.assigned_driver||''} onChange={event=>onAssignDriver(order,event.target.value||null)}><option value="">Sem motoboy</option>{drivers.filter(item=>item.active&&item.document_valid).map(item=><option key={item.id} value={item.id}>{item.full_name} · {item.driver_code}</option>)}</select></label></div>}
      {selected===order.id&&<OrderDetails order={order} restaurant={restaurant} drivers={drivers}/>}</div>):<div className="empty-state"><ShoppingBag size={24}/><b>Nenhum pedido com esses filtros.</b></div>}
    <div className="table-footer"><span>{filtered.length} pedidos · página {page} de {pages}</span><div><button className="pagination-button" disabled={page===1} onClick={()=>setPage(current=>current-1)}>Anterior</button><button className="pagination-button" disabled={page===pages} onClick={()=>setPage(current=>current+1)}>Próxima</button></div></div></section>
    {readyRoutes.length>0&&<section className="panel route-planning"><h2>Sequência de entregas</h2><p>O provedor sugere uma ordem pelas vias disponíveis. Revise antes de salvar.</p>{readyRoutes.map(group=><div key={group.driver.id}><b>{group.driver.full_name} · {group.orders.length} pedidos prontos</b><button className="button button-secondary" disabled={routeBusy||!supabase} onClick={()=>suggest(group)}>{routeBusy?'Calculando…':'Sugerir sequência'}</button></div>)}{suggestion&&<div className="route-suggestion"><b>Sugestão · {(suggestion.distance_m/1000).toFixed(1)} km · cerca de {Math.ceil(suggestion.duration_s/60)} min</b>{suggestion.order_numbers.map((number,index)=><div key={number}><span>{index+1}. LF-{number}</span><button disabled={index===0} onClick={()=>move(index,-1)}>Subir</button><button disabled={index===suggestion.order_numbers.length-1} onClick={()=>move(index,1)}>Descer</button></div>)}<button className="button button-dark" disabled={routeBusy} onClick={apply}>Salvar sequência revisada</button></div>}</section>}
  </>
}

export function CustomersPage({ orders }) {
  const [search,setSearch]=useState('')
  const grouped=useMemo(()=>{const map=new Map();for(const order of orders){const key=order.customer_phone||order.name?.trim().toLowerCase();if(!key)continue;const item=map.get(key)||{id:key,name:order.name,count:0,total:0,last:order.created_at};item.count++;if(completed(order))item.total+=Number(order.total);if(order.created_at>item.last){item.last=order.created_at;item.name=order.name}map.set(key,item)}return [...map.values()].sort((a,b)=>b.last.localeCompare(a.last))},[orders])
  const rows=grouped.filter(item=>item.name.toLowerCase().includes(search.toLowerCase()))
  return <><div className="section-heading"><h1>Clientes com pedidos</h1></div><section className="panel customer-panel"><div className="panel-heading"><span>{grouped.length} clientes nos pedidos carregados</span><label className="inline-search"><Search size={15}/><input placeholder="Buscar pelo nome" value={search} onChange={event=>setSearch(event.target.value)}/></label></div>{rows.length?rows.map(item=><div className="customer-row" key={item.id}><b>{item.name}</b><span>{item.count} pedidos</span><span>{money(item.total)} concluídos</span><small>Último: {dateTime(item.last)}</small></div>):<div className="empty-state">Nenhum cliente encontrado.</div>}</section></>
}

export function ReportsPage({ orders }) {
  const [period,setPeriod]=useState('7')
  const days=Number(period)
  const start=Date.now()-days*86400000
  const filtered=orders.filter(order=>order.created_at&&Date.parse(order.created_at)>=start)
  const done=filtered.filter(completed)
  const revenue=done.reduce((sum,order)=>sum+Number(order.total),0)
  const items=new Map()
  for(const order of done)for(const item of order.items||[]){const key=item.name;const current=items.get(key)||{name:key,quantity:0,revenue:0};current.quantity+=Number(item.quantity);current.revenue+=Number(item.unit_price||0)*Number(item.quantity);items.set(key,current)}
  const rows=[...items.values()].sort((a,b)=>b.quantity-a.quantity)
  const exportCsv=()=>{const csv=['Prato;Quantidade;Receita (R$)',...rows.map(item=>`"${item.name.replaceAll('"','""')}";${item.quantity};${item.revenue.toFixed(2).replace('.',',')}`)].join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`lusky-relatorio-${period}d.csv`;link.click();URL.revokeObjectURL(url)}
  return <><div className="section-heading"><div><h1>Relatórios</h1><p>Dados dos pedidos concluídos no período selecionado.</p></div><label>Período <select value={period} onChange={event=>setPeriod(event.target.value)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label></div><div className="stats-grid"><Metric label="Pedidos recebidos" value={filtered.length} detail="No período"/><Metric label="Pedidos concluídos" value={done.length} detail="Estado entregue"/><Metric label="Faturamento concluído" value={money(revenue)} detail="Total dos pedidos entregues"/><Metric label="Ticket médio" value={money(done.length?revenue/done.length:0)} detail="Pedidos entregues"/></div><section className="panel best-sellers"><div className="panel-heading"><h2>Pratos vendidos</h2><button className="text-button" disabled={!rows.length} onClick={exportCsv}>Exportar CSV <ArrowRight size={14}/></button></div>{rows.length?rows.map(item=><div className="popular-row" key={item.name}><b>{item.name}</b><span>{item.quantity} unidades</span><strong>{money(item.revenue)}</strong></div>):<div className="empty-state">Ainda não há vendas concluídas neste período.</div>}</section></>
}
