import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bike, CheckCircle2, Clock3, MapPin, Search, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { mapRequest } from './delivery'
import { supabase } from './supabase'
import { summarizeOrders } from './analytics'

const DeliveryMap = lazy(() => import('./DeliveryMap'))
const money = value => Number(value || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}) : '—'
const todayKey = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const dayKey = value => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))
const completed = order => order.status === 'Entregue'
const nextStatus = order => order.status === 'Novo pedido' ? 'Preparando' : order.status === 'Preparando' ? 'Pronto' : order.status === 'Pronto' && order.type !== 'Entrega' ? 'Entregue' : null

function Metric({ label, value, detail }) { return <article className="stat-card"><div className="stat-number">{value}</div><div className="stat-label">{label}</div><div className="stat-note">{detail}</div></article> }

function BarChart({ rows, valueKey = 'revenue', format = money, label = 'Vendas por dia' }) {
  const maximum = Math.max(1, ...rows.map(row => row[valueKey] || 0))
  return <div className="insight-chart" role="img" aria-label={`${label}: ${rows.map(row => `${row.label}: ${format(row[valueKey])}`).join('; ')}`}>
    <div className="insight-chart-grid"><span>{format(maximum)}</span><span>{format(maximum / 2)}</span><span>{format(0)}</span></div>
    <div className="insight-chart-columns">{rows.map((row, index) => <div className="insight-chart-column" key={`${row.label}-${index}`} title={`${row.label}: ${format(row[valueKey])}`}><div className="insight-chart-track"><i style={{ height: `${Math.max(0, (row[valueKey] || 0) / maximum * 100)}%` }}/></div><small>{row.label}</small></div>)}</div>
  </div>
}

function ShareList({ rows, empty }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  return rows.length ? <div className="insight-share-list">{rows.map(row => <div className="insight-share-row" key={row.name}><div><b>{row.name}</b><span>{row.count} · {total ? Math.round(row.count / total * 100) : 0}%</span></div><i><em style={{ width: `${total ? row.count / total * 100 : 0}%` }}/></i></div>)}</div> : <p className="insight-empty">{empty}</p>
}

export function OverviewPage({ orders, products, setPage, onNewOrder }) {
  const today = orders.filter(order => order.created_at && dayKey(order.created_at) === todayKey())
  const todayDone = today.filter(completed)
  const revenue = todayDone.reduce((sum, order) => sum + Number(order.total || 0), 0)
  const active = orders.filter(order => !['Entregue', 'Cancelado'].includes(order.status))
  const summary = summarizeOrders(orders, 7)
  const chart = summary.daily.map(row => ({ ...row, label: `${row.day.slice(8, 10)}/${row.day.slice(5, 7)}` }))
  const recent = orders.slice().sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)).slice(0, 6)
  return <div className="insights-page overview-page"><div className="insights-hero"><div><span>{new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full' }).format(new Date())}</span><h1>Seu dia está com tudo, Lusky.</h1><p>Acompanhe a operação e os pedidos da casa em tempo real.</p></div><button className="button button-dark" onClick={onNewOrder}>+ Novo pedido</button></div>
    <div className="insights-metrics"><Metric label="Vendas concluídas hoje" value={money(revenue)} detail="Pedidos entregues hoje"/><Metric label="Pedidos recebidos hoje" value={today.length} detail="Todos os tipos de pedido"/><Metric label="Ticket médio de hoje" value={money(todayDone.length ? revenue / todayDone.length : 0)} detail="Pedidos entregues hoje"/><Metric label="Em andamento" value={active.length} detail="Pedidos que ainda precisam de ação"/></div>
    <div className="insights-main-grid"><section className="panel insight-panel"><div className="panel-heading"><div><h2>Visão de vendas</h2><small>Pedidos entregues · últimos 7 dias</small></div><b className="insight-total">{money(summary.revenue)}</b></div><BarChart rows={chart}/></section><section className="panel insight-panel"><div className="panel-heading"><div><h2>Queridinhos da casa</h2><small>Pratos dos pedidos entregues nos últimos 7 dias</small></div><button className="text-button" onClick={() => setPage('Cardápio')}>Cardápio <ArrowRight size={14}/></button></div>{summary.dishes.length ? summary.dishes.slice(0, 5).map((dish, index) => <div className="insight-dish" key={dish.name}><span>{String(index + 1).padStart(2, '0')}</span><b>{dish.name}</b><small>{dish.quantity} unidades</small></div>) : <p className="insight-empty">Nenhum prato vendido nesta semana.</p>}<p className="insight-availability">{products.filter(product => product.available).length} de {products.length} pratos disponíveis no cardápio.</p></section></div>
    <section className="panel insight-panel insight-recent"><div className="panel-heading"><div><h2>Pedidos recentes</h2><small>{active.length} em andamento</small></div><button className="text-button" onClick={() => setPage('Pedidos')}>Ver todos os pedidos <ArrowRight size={14}/></button></div>{recent.length ? recent.map(order => <button className="insight-recent-row" key={order.id} onClick={() => setPage('Pedidos')}><span className="insight-avatar">{String(order.name || '?').trim().charAt(0)}</span><span><b>{order.name}</b><small>{order.id} · {order.type}</small></span><span className={`insight-status ${order.status === 'Entregue' ? 'is-done' : ''}`}>{order.status}</span><strong>{money(order.total)}</strong><small>{dateTime(order.created_at)}</small><ArrowRight size={16}/></button>) : <p className="insight-empty">Nenhum pedido registrado.</p>}</section></div>
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
  const [paymentStatus,setPaymentStatus]=useState(order.payment_status)
  const [paymentBusy,setPaymentBusy]=useState(false)
  const [paymentError,setPaymentError]=useState('')
  useEffect(()=>setPaymentStatus(order.payment_status),[order.payment_status])
  useEffect(()=>{
    if(!supabase||!order.db_id||order.type!=='Entrega'||order.delivery_latitude==null)return
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
  const confirmPayment=async()=>{
    if(paymentBusy||!supabase)return
    setPaymentBusy(true);setPaymentError('')
    const {data,error}=await supabase.rpc('lusky_confirm_manual_pix',{p_order_number:Number(String(order.id).replace(/\D/g,''))})
    setPaymentBusy(false)
    if(error||data!==true){setPaymentError(error?.message||'Não foi possível confirmar o Pix.');return}
    setPaymentStatus('confirmed')
  }
  return <div className="ops-details"><p><b>Pedido:</b> {order.items?.map(item=>`${item.quantity}× ${item.name}`).join(' · ')}</p><p><b>Total:</b> {money(order.total)} · <b>Pagamento:</b> {order.payment_method==='manual_pix'?(paymentStatus==='confirmed'?'Pix manual conferido':'Pix manual aguardando conferência'):'Na entrega/retirada'}</p>{order.payment_method==='manual_pix'&&paymentStatus!=='confirmed'&&<div className="manual-pix-note"><b>Conferência manual necessária</b><p>Verifique o recebimento no canal financeiro antes de confirmar.</p><button className="button button-dark" disabled={paymentBusy} onClick={confirmPayment}>{paymentBusy?'Confirmando…':'Confirmar Pix conferido'}</button></div>}{paymentError&&<p className="checkout-error" role="alert">{paymentError}</p>}{order.type==='Entrega'&&<><p><MapPin size={14}/> {order.address||'Endereço legado sem ponto confirmado'}</p><p><Bike size={14}/> {drivers.find(driver=>driver.id===order.assigned_driver)?.full_name||'Aguardando motoboy'}</p><Suspense fallback={<div className="map-unavailable">Abrindo mapa…</div>}><DeliveryMap restaurant={restaurant} destination={order.delivery_latitude!=null?{latitude:order.delivery_latitude,longitude:order.delivery_longitude}:null} rider={fresh||order.demo_position} route={route}/></Suspense><small>{route?`Rota planejada ${(route.distance_m/1000).toFixed(1)} km · ${Math.ceil(route.duration_s/60)} min estimados · calculada ${dateTime(route.calculated_at)}`:routeError||(order.delivery_latitude==null||restaurant?.latitude==null?'Origem ou destino sem pino confirmado.':order.db_id?'Aguardando rota planejada.':'Demonstração: linha reta entre os pinos; trajeto por vias não calculado.')}</small><small>{fresh?`GPS observado ${dateTime(fresh.observed_at)} · precisão ${Math.round(fresh.accuracy_m)} m`:location?`GPS desatualizado desde ${dateTime(location.observed_at)}`:order.demo_position?'Posição simulada do motoboy na demonstração.':'Sem GPS recebido.'}</small></>}{events.length>0&&<div className="ops-events"><b>Histórico de etapas</b>{events.map((event,index)=><div key={index}>{dateTime(event.created_at)} · {event.to_status}{event.reason&&` · ${event.reason}`}</div>)}</div>}{incidents.length>0&&<div className="ops-incidents"><b>Ocorrências</b>{incidents.map(item=><div key={item.id}>{dateTime(item.created_at)} · {item.status==='open'?'Aberta':'Resolvida'} · {item.detail} {item.status==='open'&&<button className="text-button" onClick={()=>resolveIncident(item.id)}>Marcar resolvida</button>}</div>)}</div>}</div>
}

export function OrdersPage({ orders, drivers, restaurant, onStatus, onAssignDriver, onSequence, onNewOrder, remote = false }) {
  const [status,setStatus]=useState('Todos')
  const [type,setType]=useState('Todos')
  const [driver,setDriver]=useState('Todos')
  const [search,setSearch]=useState('')
  const [debouncedSearch,setDebouncedSearch]=useState('')
  const [period,setPeriod]=useState('Todos')
  const [olderThan45,setOlderThan45]=useState(false)
  const [page,setPage]=useState(1)
  const [remoteRows,setRemoteRows]=useState([])
  const [remoteCount,setRemoteCount]=useState(0)
  const [loading,setLoading]=useState(false)
  const [queryError,setQueryError]=useState('')
  const [selected,setSelected]=useState(null)
  useEffect(()=>{if(!selected)return;const close=event=>{if(event.key==='Escape')setSelected(null)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[selected])
  const [busy,setBusy]=useState('')
  const [error,setError]=useState('')
  const [suggestion,setSuggestion]=useState(null)
  const [routeBusy,setRouteBusy]=useState(false)
  useEffect(()=>{const timer=setTimeout(()=>setDebouncedSearch(search),300);return()=>clearTimeout(timer)},[search])
  useEffect(()=>setPage(1),[status,type,driver,search,period,olderThan45])
  useEffect(()=>{
    if(!remote||!supabase)return
    let alive=true
    setLoading(true);setQueryError('')
    const load=async()=>{
      let query=supabase.from('lusky_orders').select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id').range((page-1)*20,page*20-1)
      if(status!=='Todos')query=query.eq('status',status)
      if(type!=='Todos')query=query.eq('order_type',type)
      if(driver==='Sem motoboy')query=query.is('assigned_driver',null)
      else if(driver!=='Todos')query=query.eq('assigned_driver',driver)
      const days=Number(period)
      if(Number.isFinite(days)&&days>0)query=query.gte('created_at',new Date(Date.now()-days*86400000).toISOString())
      if(olderThan45)query=query.lt('created_at',new Date(Date.now()-45*60000).toISOString()).neq('status','Entregue').neq('status','Cancelado')
      const term=debouncedSearch.trim().replace(/[^\p{L}\p{N} -]/gu,'').slice(0,60)
      if(term){const number=term.match(/^(?:LF-)?(\d+)$/i);query=number?query.eq('order_number',Number(number[1])):query.or(`customer_name.ilike.%${term}%,delivery_address.ilike.%${term}%`)}
      const {data,count,error:apiError}=await query
      if(!alive)return
      setLoading(false)
      if(apiError){setRemoteRows([]);setRemoteCount(0);setQueryError('Não foi possível carregar esta página: '+apiError.message);return}
      setRemoteCount(count||0)
      setRemoteRows((data||[]).map(row=>({...row,db_id:row.id,id:`LF-${row.order_number}`,name:row.customer_name,type:row.order_type,items:row.items||[],total:Number(row.total),address:row.delivery_address||''})))
    }
    load()
    return()=>{alive=false}
  },[remote,orders,page,status,type,driver,period,olderThan45,debouncedSearch])
  const filtered=useMemo(()=>orders.filter(order=>(status==='Todos'||order.status===status)&&(type==='Todos'||order.type===type)&&(driver==='Todos'||(driver==='Sem motoboy'?!order.assigned_driver:order.assigned_driver===driver))&&`${order.name} ${order.id} ${order.address||''}`.toLowerCase().includes(search.toLowerCase())&&(period==='Todos'||(order.created_at&&Date.parse(order.created_at)>=Date.now()-Number(period)*86400000))&&(!olderThan45||(!['Entregue','Cancelado'].includes(order.status)&&Date.parse(order.created_at)<Date.now()-45*60000))),[orders,status,type,driver,search,period,olderThan45])
  const pages=Math.max(1,Math.ceil((remote?remoteCount:filtered.length)/20))
  const visible=remote?remoteRows:filtered.slice((page-1)*20,page*20)
  const selectedOrder=visible.find(order=>order.id===selected)||orders.find(order=>order.id===selected)
  const transition=async(order,next)=>{setBusy(order.id);setError('');const okay=await onStatus(order.id,next);if(!okay)setError(`Não foi possível atualizar ${order.id}.`);setBusy('')}
  const readyRoutes=drivers.map(item=>({driver:item,orders:orders.filter(order=>order.type==='Entrega'&&order.status==='Pronto'&&order.assigned_driver===item.id)})).filter(item=>item.orders.length>=2)
  const suggest=async group=>{setRouteBusy(true);setError('');setSuggestion(null);try{const result=await mapRequest(supabase,{action:'optimize',order_numbers:group.orders.map(order=>Number(String(order.id).replace(/\D/g,'')))});setSuggestion({driver_id:group.driver.id,...result})}catch(error){setError(error.message)}finally{setRouteBusy(false)}}
  const move=(index,delta)=>setSuggestion(current=>{const numbers=[...current.order_numbers];[numbers[index],numbers[index+delta]]=[numbers[index+delta],numbers[index]];return {...current,order_numbers:numbers}})
  const apply=async()=>{setRouteBusy(true);const okay=await onSequence(suggestion.driver_id,suggestion.order_numbers);setRouteBusy(false);if(okay)setSuggestion(null)}
  return <><div className="section-heading"><div><h1>Central de pedidos</h1><p>Filtre, acompanhe e avance cada etapa confirmada.</p></div><button className="button button-dark" onClick={onNewOrder}>Novo pedido</button></div><section className="panel orders-panel"><div className="ops-filters"><label>Status<select value={status} onChange={event=>setStatus(event.target.value)}>{['Todos','Novo pedido','Preparando','Pronto','Saiu para entrega','Entregue','Cancelado'].map(value=><option key={value}>{value}</option>)}</select></label><label>Tipo<select value={type} onChange={event=>setType(event.target.value)}>{['Todos','Entrega','Retirada','Salão','Salão · Mesa 01'].map(value=><option key={value}>{value}</option>)}</select></label><label>Motoboy<select value={driver} onChange={event=>setDriver(event.target.value)}><option>Todos</option><option>Sem motoboy</option>{drivers.map(item=><option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label><label>Período<select value={period} onChange={event=>setPeriod(event.target.value)}><option>Todos</option><option value="1">Últimas 24 horas</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></label><label>Buscar<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Número, cliente ou endereço"/></label><label className="ops-late-filter"><input type="checkbox" checked={olderThan45} onChange={event=>setOlderThan45(event.target.checked)}/>Mais de 45 min sem concluir</label></div>
    {error&&<p className="checkout-error" role="alert">{error}</p>}{queryError&&<p className="checkout-error" role="alert">{queryError}</p>}{loading&&<p className="ops-loading" role="status">Carregando pedidos…</p>}{!loading&&(visible.length?visible.map(order=><div className="ops-order" key={order.id}><div className="ops-order-row clickable" role="button" tabIndex={0} aria-label={`Abrir detalhes do pedido ${order.id}`} onClick={event=>{if(!event.target.closest('button, select'))setSelected(order.id)}} onKeyDown={event=>{if(event.target===event.currentTarget&&(event.key==='Enter'||event.key===' ')){event.preventDefault();setSelected(order.id)}}}><button className="text-button" onClick={()=>setSelected(order.id)}>{order.id}</button><b>{order.name}</b><span>{order.status}</span><span>{order.type}</span><span>{money(order.total)}</span><small>{dateTime(order.created_at)}</small>{nextStatus(order)&&<button className="button button-dark" disabled={busy===order.id} onClick={()=>transition(order,nextStatus(order))}>{nextStatus(order)}</button>}</div>
      {order.type==='Entrega'&&order.status==='Pronto'&&<div className="ops-assignment"><KitchenCode order={order}/><label>Motoboy <select value={order.assigned_driver||''} onChange={event=>onAssignDriver(order,event.target.value||null)}><option value="">Sem motoboy</option>{drivers.filter(item=>item.active&&item.document_valid).map(item=><option key={item.id} value={item.id}>{item.full_name} · {item.driver_code}</option>)}</select></label></div>}
      </div>):<div className="empty-state"><ShoppingBag size={24}/><b>Nenhum pedido com esses filtros.</b></div>)}
    <div className="table-footer"><span>{remote?remoteCount:filtered.length} pedidos · página {page} de {pages}</span><div><button className="pagination-button" disabled={page===1||loading} onClick={()=>setPage(current=>current-1)}>Anterior</button><button className="pagination-button" disabled={page===pages||loading} onClick={()=>setPage(current=>current+1)}>Próxima</button></div></div></section>
    {readyRoutes.length>0&&<section className="panel route-planning"><h2>Sequência de entregas</h2><p>O provedor sugere uma ordem pelas vias disponíveis. Revise antes de salvar.</p>{readyRoutes.map(group=><div key={group.driver.id}><b>{group.driver.full_name} · {group.orders.length} pedidos prontos</b><button className="button button-secondary" disabled={routeBusy||!supabase} onClick={()=>suggest(group)}>{routeBusy?'Calculando…':'Sugerir sequência'}</button></div>)}{suggestion&&<div className="route-suggestion"><b>Sugestão · {(suggestion.distance_m/1000).toFixed(1)} km · cerca de {Math.ceil(suggestion.duration_s/60)} min</b>{suggestion.order_numbers.map((number,index)=><div key={number}><span>{index+1}. LF-{number}</span><button disabled={index===0} onClick={()=>move(index,-1)}>Subir</button><button disabled={index===suggestion.order_numbers.length-1} onClick={()=>move(index,1)}>Descer</button></div>)}<button className="button button-dark" disabled={routeBusy} onClick={apply}>Salvar sequência revisada</button></div>}</section>}
    {selectedOrder&&<div className="order-dialog-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}><section className="order-dialog" role="dialog" aria-modal="true" aria-labelledby="order-dialog-title"><header className="order-dialog-header"><div><small>Central de pedidos</small><h2 id="order-dialog-title">Pedido {selectedOrder.id}</h2><p>{selectedOrder.status} · {selectedOrder.type} · {dateTime(selectedOrder.created_at)}</p></div><button className="icon-button" aria-label="Fechar detalhes" onClick={()=>setSelected(null)}>×</button></header><div className="order-dialog-facts"><div><small>Cliente</small><b>{selectedOrder.name}</b><span>{selectedOrder.customer_phone||'Telefone não informado no pedido'}</span></div><div><small>Motoboy</small><b>{drivers.find(item=>item.id===selectedOrder.assigned_driver)?.full_name||'Não atribuído'}</b><span>{drivers.find(item=>item.id===selectedOrder.assigned_driver)?.vehicle_model||'Veículo não informado'}</span></div><div><small>Retirada</small><b>{restaurant?.street?`${restaurant.street}, ${restaurant.street_number}`:'Origem pendente'}</b><span>{restaurant?.city||''} {restaurant?.state||''}</span></div><div><small>Entrega</small><b>{selectedOrder.address||'Endereço pendente'}</b><span>{selectedOrder.delivery_latitude!=null?'Pino disponível':'Pedido sem pino confirmado'}</span></div></div><OrderDetails key={selectedOrder.id} order={selectedOrder} restaurant={restaurant} drivers={drivers}/></section></div>}
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
  const summary=summarizeOrders(orders,Number(period))
  const rows=summary.dishes
  const chart=summary.daily.map(row=>({...row,label:`${row.day.slice(8,10)}/${row.day.slice(5,7)}`}))
  const active=summary.period.filter(order=>!['Entregue','Cancelado'].includes(order.status)).length
  const exportCsv=()=>{const csv=['Prato;Quantidade;Receita (R$)',...rows.map(item=>`"${item.name.replaceAll('"','""')}";${item.quantity};${item.priced?item.revenue.toFixed(2).replace('.',','):''}`)].join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`lusky-relatorio-${period}d.csv`;link.click();URL.revokeObjectURL(url)}
  return <div className="insights-page reports-page"><div className="insights-hero"><div><h1>Relatórios</h1><p>Dados dos pedidos no período selecionado. Receita considera apenas entregas concluídas.</p></div><label>Período<select value={period} onChange={event=>setPeriod(event.target.value)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label></div>
    <div className="insights-metrics"><Metric label="Pedidos recebidos" value={summary.period.length} detail="Criados no período"/><Metric label="Pedidos entregues" value={summary.done.length} detail="Conclusões confirmadas"/><Metric label="Faturamento concluído" value={money(summary.revenue)} detail="Pedidos entregues"/><Metric label="Ticket médio" value={money(summary.ticket)} detail="Receita por pedido entregue"/></div>
    <div className="insights-main-grid"><section className="panel insight-panel"><div className="panel-heading"><div><h2>Vendas por dia</h2><small>Receita de pedidos entregues</small></div></div><BarChart rows={chart}/></section><section className="panel insight-panel"><div className="panel-heading"><div><h2>Estado dos pedidos</h2><small>{active} ainda em andamento</small></div></div><ShareList rows={summary.statuses} empty="Ainda não há pedidos neste período."/></section></div>
    <div className="insights-main-grid"><section className="panel insight-panel"><div className="panel-heading"><div><h2>Pedidos por horário</h2><small>Horário de criação · Brasília</small></div></div><BarChart rows={summary.hourly.filter((_, index) => index % 2 === 0).map(row => ({ ...row, label: `${String(row.hour).padStart(2, '0')}h`, received: row.received + (summary.hourly[row.hour + 1]?.received || 0) }))} valueKey="received" format={value => String(Math.round(value))} label="Pedidos recebidos por faixa de duas horas"/></section><section className="panel insight-panel"><div className="panel-heading"><div><h2>Tipo de atendimento</h2><small>Todos os pedidos do período</small></div></div><ShareList rows={summary.types} empty="Ainda não há pedidos neste período."/></section></div>
    <section className="panel insight-panel insight-products"><div className="panel-heading"><div><h2>Pratos vendidos</h2><small>Quantidade e receita nos pedidos entregues</small></div><button className="text-button" disabled={!rows.length} onClick={exportCsv}>Exportar CSV <ArrowRight size={14}/></button></div>{rows.length ? rows.map((item,index) => <div className="insight-dish" key={item.name}><span>{String(index+1).padStart(2,'0')}</span><b>{item.name}</b><small>{item.quantity} unidades</small><strong>{item.priced?money(item.revenue):'—'}</strong></div>) : <p className="insight-empty">Ainda não há pratos vendidos neste período.</p>}</section></div>
}
