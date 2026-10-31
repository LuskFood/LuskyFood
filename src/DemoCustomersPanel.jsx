import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowRight, MapPin, Search } from 'lucide-react'
import { mapRequest, validRoadRoute } from './delivery'
import { supabase } from './supabase'

const DeliveryMap = lazy(() => import('./DeliveryMap'))
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }) : '—'

export default function DemoCustomersPanel({ restaurant }) {
  const [customers, setCustomers] = useState([])
  const [orders, setOrders] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState('')
  const [retry, setRetry] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([
      supabase.from('lusky_demo_customers').select('id,full_name,contact_email,delivery_address,delivery_latitude,delivery_longitude').order('full_name'),
      supabase.from('lusky_orders').select('id,order_number,demo_customer_id,created_at,status,total,items,delivery_address,delivery_latitude,delivery_longitude').not('demo_customer_id', 'is', null).order('created_at', { ascending: false }),
    ]).then(([people, history]) => {
      if (!alive) return
      if (people.error || history.error) setError(people.error?.message || history.error?.message)
      else { setCustomers(people.data || []); setOrders(history.data || []) }
      setLoading(false)
    }).catch(() => { if (alive) { setError('Não foi possível carregar a demonstração.'); setLoading(false) } })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!selectedOrder) { setRoute(null); setRouteError(''); return }
    let alive = true
    setRoute(null); setRouteError('')
    mapRequest(supabase, { action: 'route', order_number: selectedOrder.order_number })
      .then(value => { if (alive) validRoadRoute(value) ? setRoute(value) : setRouteError('Rota pelas ruas indisponível.') })
      .catch(err => { if (alive) setRouteError(err.message || 'Rota pelas ruas indisponível.') })
    return () => { alive = false }
  }, [selectedOrder?.id, retry])

  useEffect(() => {
    if (!selected) return
    const close = event => { if (event.key === 'Escape') { setSelected(null); setSelectedOrder(null) } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selected])

  const rows = useMemo(() => customers.map(customer => {
    const history = orders.filter(order => order.demo_customer_id === customer.id)
    return { ...customer, history, total: history.reduce((sum, order) => sum + Number(order.total || 0), 0), last: history[0]?.created_at }
  }).filter(customer => `${customer.full_name} ${customer.delivery_address}`.toLowerCase().includes(search.toLowerCase())), [customers, orders, search])
  const detail = rows.find(customer => customer.id === selected) || customers.find(customer => customer.id === selected)
  const history = detail ? orders.filter(order => order.demo_customer_id === detail.id) : []
  const destination = selectedOrder ? { latitude: selectedOrder.delivery_latitude, longitude: selectedOrder.delivery_longitude } : null

  if (loading) return <section className="panel customer-panel"><p className="ops-loading">Carregando clientes de demonstração…</p></section>
  if (error) return <section className="panel customer-panel"><p className="checkout-error" role="alert">Demonstração: {error}</p></section>
  if (!customers.length) return null
  return <>
    <section className="panel customer-panel demo-customer-panel">
      <div className="panel-heading"><div><b>Clientes fictícios · {customers.length}</b><small>{orders.length} pedidos históricos de demonstração. Não são contas reais nem entregas pendentes.</small></div><label className="inline-search"><Search size={15}/><input placeholder="Buscar cliente fictício" value={search} onChange={event => setSearch(event.target.value)}/></label></div>
      <div className="customer-directory-head"><span>Cliente</span><span>Contato</span><span>Pedidos</span><span>Faturamento</span><span>Última compra</span><span>Ações</span></div>
      {rows.map(customer => <button type="button" className="customer-row customer-row-button" key={customer.id} onClick={() => { setSelected(customer.id); setSelectedOrder(null) }}><span className="customer-person"><span className="customer-profile-avatar">{customer.full_name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span><b>{customer.full_name}</b></span><span className="customer-phone">E-mail fictício</span><span>{customer.history.length}</span><b className="customer-revenue">{money(customer.total)}</b><small>{dateTime(customer.last)}</small><span className="customer-open-profile">Ver perfil <ArrowRight size={15}/></span></button>)}
      {!rows.length && <p className="empty-state">Nenhum cliente fictício corresponde à busca.</p>}
    </section>
    {detail && <div className="order-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setSelected(null); setSelectedOrder(null) } }}><section className="order-dialog directory-dialog customer-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="demo-customer-title">
      <header className="order-dialog-header"><div><small>Cliente fictício · demonstração</small><h2 id="demo-customer-title">{detail.full_name}</h2><p>{detail.contact_email}</p></div><button className="icon-button" aria-label="Fechar perfil" onClick={() => { setSelected(null); setSelectedOrder(null) }}>×</button></header>
      <div className="customer-profile-metrics"><div><small>Pedidos</small><b>{history.length}</b></div><div><small>Concluídos</small><b>{history.filter(order => order.status === 'Entregue').length}</b></div><div><small>Faturamento ilustrativo</small><b>{money(history.reduce((sum, order) => sum + Number(order.total || 0), 0))}</b></div></div>
      <div className="directory-dialog-body"><section className="customer-info-section"><h3><MapPin size={16}/> Destino fictício</h3><p>{detail.delivery_address}</p></section><section className="customer-info-section"><h3>Pedidos históricos</h3>{history.map(order => <article className="customer-history-row" key={order.id}><span className="customer-history-order"><b>LF-{order.order_number}</b><small>{dateTime(order.created_at)}</small></span><span className="central-status is-done">{order.status}</span><span>{(order.items || []).map(item => `${item.quantity}× ${item.name}`).join(', ')}</span><b>{money(order.total)}</b><button className="text-button" onClick={() => setSelectedOrder(order)}>Ver rota</button></article>)}</section>
      {selectedOrder && <section className="customer-info-section demo-route-section"><h3>Rota do pedido LF-{selectedOrder.order_number}</h3><Suspense fallback={<div className="map-unavailable">Abrindo mapa…</div>}><DeliveryMap key={selectedOrder.id} restaurant={restaurant} destination={destination} route={route}/></Suspense><p>{route ? `Trajeto pelas ruas · ${(route.distance_m / 1000).toFixed(1)} km · cerca de ${Math.ceil(route.duration_s / 60)} min` : routeError || 'Calculando rota pelas ruas…'}</p>{routeError && <button className="text-button" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button>}</section>}</div>
    </section></div>}
  </>
}
