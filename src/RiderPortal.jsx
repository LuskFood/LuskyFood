import React, { lazy, Suspense, useEffect, useState } from 'react'
import { Bike, CheckCircle2, ClipboardCheck, LogOut, MapPin, Navigation, PackageCheck, UserRound, UtensilsCrossed } from 'lucide-react'
import { mapRequest, requestDemoRoadRoute, validMapPoint, validRoadRoute } from './delivery'
import { supabase } from './supabase'
import AccountSettings from './AccountSettings'

const DeliveryMap = lazy(() => import('./DeliveryMap'))
const formatTime = value => value ? new Date(value).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short', timeZone:'America/Sao_Paulo' }) : '—'

export default function RiderPortal({ orders, onStatus, onSignOut, driverProfile, restaurant, syncError, user, demo, onDriverSaved }) {
  const assigned = orders.filter(order => order.type === 'Entrega' && order.assigned_driver === user?.id)
  const ordered = list => list.slice().sort((a,b) => (a.route_order || 999) - (b.route_order || 999) || Date.parse(a.created_at) - Date.parse(b.created_at))
  const waiting = ordered(assigned.filter(order => ['Novo pedido','Preparando','Pronto'].includes(order.status)))
  const inRoute = ordered(assigned.filter(order => order.status === 'Saiu para entrega'))
  const completed = assigned.filter(order => order.status === 'Entregue').sort((a,b) => Date.parse(b.delivered_at || b.updated_at || b.created_at) - Date.parse(a.delivered_at || a.updated_at || a.created_at))
  const [section, setSection] = useState(() => inRoute.length ? 'route' : 'pickup')
  const [sectionTouched, setSectionTouched] = useState(false)
  const [selectedRouteOrderId, setSelectedRouteOrderId] = useState(null)
  const [codes, setCodes] = useState({})
  const [incidentText, setIncidentText] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [sharing, setSharing] = useState(false)
  const [gpsState, setGpsState] = useState('Localização desligada.')
  const [position, setPosition] = useState(null)
  const [pickupOrigin, setPickupOrigin] = useState(null)
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState('')
  const [routeBusy, setRouteBusy] = useState(false)
  const [routeRetry, setRouteRetry] = useState(0)
  const [available, setAvailable] = useState(true)
  const [accountOpen, setAccountOpen] = useState(false)
  const hasActive = inRoute.length > 0
  const hasWork = waiting.length + inRoute.length > 0
  const sectionOrders = section === 'pickup' ? waiting : section === 'route' ? inRoute : []
  const selectedOrder = sectionOrders.find(order => order.id === selectedRouteOrderId) || sectionOrders[0] || null
  const stage = section === 'pickup' ? 'pickup' : 'delivery'
  useEffect(() => { if (!sectionTouched) setSection(inRoute.length ? 'route' : 'pickup') }, [inRoute.length, sectionTouched])
  useEffect(() => { if (driverProfile) setAvailable(!!driverProfile.active) }, [driverProfile?.id, driverProfile?.active])
  useEffect(() => { setPickupOrigin(null) }, [selectedOrder?.id, stage])
  useEffect(() => {
    if (!hasWork) { setSharing(false); setPosition(null); setGpsState('Nenhuma entrega atribuída.'); }
    else if (!sharing) setGpsState('GPS ainda não iniciado.')
  }, [hasWork, sharing])
  useEffect(() => {
    if (!sharing || !hasWork) return
    if (!navigator.geolocation || !window.isSecureContext) { setGpsState('GPS exige HTTPS e permissão do dispositivo.'); setSharing(false); return }
    let lastSent = 0
    const watcher = navigator.geolocation.watchPosition(async result => {
      const point = { latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy_m: result.coords.accuracy, observed_at: new Date(result.timestamp).toISOString() }
      setPosition(point)
      if (stage === 'pickup') setPickupOrigin(current => current || point)
      setGpsState(`Última posição observada ${formatTime(point.observed_at)} · precisão ${Math.round(point.accuracy_m)} m`)
      if (!hasActive || Date.now() - lastSent < 15000 || !supabase || demo) return
      lastSent = Date.now()
      try {
        const { data, error } = await supabase.rpc('lusky_report_location', { p_latitude: point.latitude, p_longitude: point.longitude, p_accuracy_m: point.accuracy_m, p_observed_at: point.observed_at })
        if (error || data !== true) setGpsState('A posição não chegou ao servidor. Verifique a conexão e a entrega ativa.')
      } catch { setGpsState('A posição não chegou ao servidor. Verifique sua conexão.') }
    }, error => {
      setGpsState(error.code === 1 ? 'Permissão de GPS negada. Ative-a nas configurações do navegador.' : 'GPS indisponível. Tente novamente em uma área aberta.')
      if (error.code === 1) setSharing(false)
    }, { enableHighAccuracy:true, maximumAge:0, timeout:20000 })
    return () => navigator.geolocation.clearWatch(watcher)
  }, [sharing, hasWork, hasActive, stage, selectedOrder?.id])
  useEffect(() => {
    setRoute(null); setRouteError('')
    if (!selectedOrder || (stage === 'pickup' && (demo || !supabase || !validMapPoint(pickupOrigin))) || (stage === 'delivery' && selectedOrder.delivery_latitude == null) || (!demo && !supabase)) { setRouteBusy(false); return }
    let alive = true
    setRouteBusy(true)
    const request = demo
      ? requestDemoRoadRoute(restaurant, { latitude:selectedOrder.delivery_latitude, longitude:selectedOrder.delivery_longitude })
      : mapRequest(supabase, { action:'route', order_number:Number(String(selectedOrder.id).replace(/\D/g,'')), ...(stage === 'pickup' ? { stage:'pickup', origin:[Number(pickupOrigin.longitude), Number(pickupOrigin.latitude)] } : {}) })
    request.then(value => { if (alive) { if (validRoadRoute(value)) setRoute(value); else setRouteError('O provedor não retornou uma rota viária válida.') } }).catch(error => { if (alive) setRouteError(error.message) }).finally(() => { if (alive) setRouteBusy(false) })
    return () => { alive = false }
  }, [selectedOrder?.id, selectedOrder?.status, selectedOrder?.delivery_latitude, selectedOrder?.delivery_longitude, restaurant?.latitude, restaurant?.longitude, stage, pickupOrigin, routeRetry, demo])

  const confirm = async order => {
    if (busy) return
    const code = String(codes[order.id] || '').replace(/\D/g,'')
    if (code.length !== 6) { setMessage('Digite os seis números informados pelo cliente.'); return }
    setBusy(order.id); setMessage('')
    try {
      let problem = ''
      const okay = await onStatus(order.id, 'Entregue', code, undefined, text => { problem = text })
      setMessage(okay ? `Entrega ${order.id} confirmada.` : problem || 'Não foi possível confirmar. Confira o pedido antes de tentar novamente.')
      if (okay) { setCodes(current => ({ ...current, [order.id]:'' })); setSectionTouched(true); setSection(inRoute.length>1?'route':'done') }
    } catch { setMessage('Falha de conexão. Atualize a tela e confira o estado do pedido antes de tentar novamente.') }
    finally { setBusy('') }
  }
  const toggleAvailability = async () => {
    if (demo) { setAvailable(value=>!value); setMessage(available?'Você está offline nesta demonstração.':'Você está disponível nesta demonstração.'); return }
    if (!supabase) { setMessage('Disponibilidade exige conexão com o sistema.'); return }
    try {
      const { data, error } = await supabase.rpc('lusky_set_driver_availability', { p_active: !available })
      if (error || data !== true) { setMessage('Não foi possível mudar sua disponibilidade.'); return }
      setAvailable(value => !value); setMessage(available ? 'Você está offline para novas entregas.' : 'Você está disponível para novas entregas.')
    } catch { setMessage('Falha de conexão ao atualizar disponibilidade.') }
  }
  const reportIncident = async order => {
    const detail = String(incidentText[order.id] || '').trim()
    if (detail.length < 10) { setMessage('Descreva a ocorrência em pelo menos 10 caracteres.'); return }
    if (demo || !supabase) { setMessage('O registro de ocorrência está disponível na operação conectada.'); return }
    try {
      const { data, error } = await supabase.rpc('lusky_report_incident', { p_order_number:Number(String(order.id).replace(/\D/g,'')), p_detail:detail })
      if (error || data !== true) { setMessage('Não foi possível registrar a ocorrência.'); return }
      setIncidentText(current => ({ ...current, [order.id]:'' })); setMessage('Ocorrência registrada para a equipe.')
    } catch { setMessage('Falha de conexão ao registrar a ocorrência.') }
  }
  const destination = selectedOrder?.delivery_latitude != null ? { latitude:selectedOrder.delivery_latitude, longitude:selectedOrder.delivery_longitude } : null
  const mapRoute = route
  const navigationPoint = stage === 'pickup' ? restaurant : destination
  const navigateUrl = validMapPoint(navigationPoint) ? `https://www.google.com/maps/dir/?api=1&destination=${Number(navigationPoint.latitude)}%2C${Number(navigationPoint.longitude)}` : null
  const locationLabel = restaurant?.street ? `${restaurant.street}, ${restaurant.street_number || 's/n'} · ${restaurant.city || ''} ${restaurant.state || ''}` : 'Endereço do restaurante indisponível'
  const retryRoute = () => { if (routeBusy) return; if (stage === 'pickup' && validMapPoint(position)) setPickupOrigin(position); setRouteRetry(value=>value+1) }

  return <div className="rider-portal"><header className="portal-header"><div className="brand"><span className="brand-symbol"><UtensilsCrossed size={19}/></span><span className="brand-wordmark">lusky<span>food</span></span></div><div className="portal-account"><Bike size={18}/><b>{driverProfile?.full_name || 'Motoboy Lusky'}</b><small>{driverProfile?.driver_code}</small><button className="portal-account-link" onClick={()=>setAccountOpen(value=>!value)}><UserRound size={16}/>{accountOpen?'Minha rota':'Minha conta'}</button><button className="portal-account-link portal-signout" onClick={onSignOut}><LogOut size={16}/>Sair</button></div></header>
    <main className="rider-main">{syncError&&<p className="checkout-error" role="alert">{syncError}</p>}{accountOpen?<AccountSettings user={user} role="motoboy" driverProfile={driverProfile} onDriverSaved={onDriverSaved} onSignOut={onSignOut} demo={demo}/>:<><section className="rider-welcome"><div><h1>Suas entregas</h1><p>Acompanhe a próxima ação e sua sequência de paradas.</p></div><button className="button button-secondary" onClick={toggleAvailability}>{available ? 'Disponível · ficar offline' : 'Offline · ficar disponível'}</button></section>
      {demo&&<p className="rider-demo-note">Modo demonstração · pedidos e posições são exemplos locais.</p>}
      <nav className="rider-sections" aria-label="Etapas das entregas">{[['pickup','Para retirar',waiting.length],['route','Em rota',inRoute.length],['done','Concluídos',completed.length]].map(([key,label,count])=><button type="button" key={key} className={section===key?'is-selected':''} aria-current={section===key?'page':undefined} onClick={()=>{setSectionTouched(true);setSection(key)}}><span>{label}</span><b>{count}</b></button>)}</nav>
      {message&&<p role="status" className="rider-feedback">{message}</p>}
      <div className="rider-layout"><section className="route-list"><div className="route-list-heading"><h2>{section==='pickup'?'Para retirar':section==='route'?'Em rota':'Entregas concluídas'}</h2></div>
        {section==='pickup'&&(waiting.length?waiting.map((order,index)=><article className={`route-stop rider-task ${selectedOrder?.id===order.id?'is-map-selected':''}`} key={order.id}><div className="stop-number">{index+1}</div><div className="stop-content"><div className="stop-topline"><button type="button" className="rider-route-select" aria-pressed={selectedOrder?.id===order.id} onClick={()=>setSelectedRouteOrderId(order.id)}>{order.id}<small>{selectedOrder?.id===order.id?'No mapa':'Ver mapa'}</small></button><span>{order.status}</span></div><h3>{restaurant?.name||'Lusky Food'}</h3><p className="stop-address"><MapPin size={15}/>{locationLabel}</p><div className="stop-order-items">{order.items?.map(item=>`${item.quantity}× ${item.name}`).join(' · ')}</div><p className="rider-pickup-note"><ClipboardCheck size={17}/> Informe <b>{order.id}</b> à equipe. A retirada será confirmada pelo restaurante.</p></div></article>):<div className="route-empty"><PackageCheck size={24}/><b>Sem pedidos para retirar.</b><span>Novas atribuições aparecerão aqui.</span></div>)}
        {section==='route'&&(inRoute.length?inRoute.map((order,index)=><article className={`route-stop rider-task ${selectedOrder?.id===order.id?'is-map-selected':''}`} key={order.id}><div className="stop-number">{index+1}</div><div className="stop-content"><div className="stop-topline"><button type="button" className="rider-route-select" aria-pressed={selectedOrder?.id===order.id} onClick={()=>setSelectedRouteOrderId(order.id)}>{order.id}<small>{selectedOrder?.id===order.id?'No mapa':'Ver rota'}</small></button><span>Em rota</span></div><h3>{order.name}</h3><p className="stop-address"><MapPin size={15}/>{order.address||'Endereço pendente de confirmação'}</p><div className="stop-order-items">{order.items?.map(item=>`${item.quantity}× ${item.name}`).join(' · ')}</div><label className="rider-code delivery-code"><span><PackageCheck size={16}/> Peça o código ao cliente na chegada</span><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={codes[order.id]||''} onChange={event=>setCodes(current=>({...current,[order.id]:event.target.value.replace(/\D/g,'')}))} placeholder="Código de 6 dígitos"/><button className="button button-yellow" disabled={!!busy||(codes[order.id]||'').length!==6} onClick={()=>confirm(order)}>{busy===order.id?'Confirmando…':'Confirmar entrega'}</button></label><div className="rider-incident"><label>Problema nesta entrega<textarea value={incidentText[order.id]||''} onChange={event=>setIncidentText(current=>({...current,[order.id]:event.target.value}))} placeholder="Descreva o que aconteceu para a equipe" maxLength={500}/></label><button className="text-button" onClick={()=>reportIncident(order)}>Registrar ocorrência</button></div></div></article>):<div className="route-empty"><Navigation size={24}/><b>Nenhuma entrega em rota.</b><span>A equipe confirma a retirada quando entregar o pedido a você.</span></div>)}
        {section==='done'&&(completed.length?completed.map(order=><article className="rider-completed" key={order.id}><CheckCircle2 size={19}/><div><b>{order.id} · {order.name}</b><small>{order.delivered_at?`Entregue em ${formatTime(order.delivered_at)}`:`Concluído · atualizado ${formatTime(order.updated_at||order.created_at)}`}</small></div><span>Entregue</span></article>):<div className="route-empty"><CheckCircle2 size={24}/><b>Nenhuma entrega concluída.</b><span>Seu histórico disponível aparecerá aqui.</span></div>)}
      </section>{section!=='done'&&<aside className="rider-map-panel"><Suspense fallback={<div className="map-unavailable">Abrindo mapa…</div>}><DeliveryMap restaurant={restaurant} destination={stage==='delivery'?destination:null} rider={position||selectedOrder?.demo_position} route={mapRoute} routeLabel={stage==='pickup'?'Sua posição → restaurante':'Retirada → entrega'}/></Suspense><div className="map-note"><Navigation size={16}/><span><b>{stage==='pickup'?'Caminho até o restaurante':`Rota do pedido ${selectedOrder?.id||''}`}</b><small>{route?`${(route.distance_m/1000).toFixed(1)} km · cerca de ${Math.ceil(route.duration_s/60)} min · calculada ${formatTime(route.calculated_at)}. Perfil carro, sem trânsito ao vivo.`:routeError||(routeBusy?'Calculando rota pelas ruas…':!selectedOrder?'Selecione um pedido para ver a rota no mapa.':stage==='pickup'&&!pickupOrigin?'Inicie o GPS para calcular o caminho até o restaurante.':'Rota pelas ruas indisponível.')}</small></span></div>{routeError&&<button className="text-button rider-retry" disabled={routeBusy} onClick={retryRoute}>Tentar calcular rota novamente</button>}{selectedOrder&&navigateUrl&&<a className="button button-secondary rider-navigation" href={navigateUrl} target="_blank" rel="noreferrer">Abrir navegação externa</a>}<div className="gps-panel"><b>Localização</b><p>Antes da retirada, o GPS é usado para calcular seu caminho. Durante a entrega, cliente e equipe podem acompanhar sua última posição enviada.</p>{demo&&<p className="address-hint">Nesta demonstração, o mapa consulta o FOSSGIS/OSRM para calcular o trajeto pelas ruas. A linha pode ser registrada nos logs do provedor.</p>}<button className="button button-dark" disabled={!hasWork} onClick={()=>setSharing(value=>!value)}>{sharing?'Parar GPS':'Iniciar GPS'}</button><small role="status">{gpsState}</small></div></aside>}</div></>}</main></div>
}

