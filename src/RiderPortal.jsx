import React, { lazy, Suspense, useEffect, useState } from 'react'
import { Bike, Check, ClipboardCheck, MapPin, Navigation, PackageCheck, UtensilsCrossed } from 'lucide-react'
import { mapRequest } from './delivery'
import { supabase } from './supabase'

const DeliveryMap = lazy(() => import('./DeliveryMap'))
const formatTime = value => value ? new Date(value).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short', timeZone:'America/Sao_Paulo' }) : '—'

export default function RiderPortal({ orders, onStatus, onSignOut, driverProfile, restaurant }) {
  const deliveries = orders.filter(order => order.type === 'Entrega' && ['Pronto','Saiu para entrega'].includes(order.status)).sort((a,b) => (a.route_order || 999) - (b.route_order || 999))
  const next = deliveries.find(order => order.status === 'Saiu para entrega') || deliveries[0]
  const active = deliveries.some(order => order.status === 'Saiu para entrega')
  const [codes, setCodes] = useState({})
  const [incidentText, setIncidentText] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [gpsState, setGpsState] = useState('Localização desligada.')
  const [position, setPosition] = useState(null)
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState('')
  const [available, setAvailable] = useState(true)
  useEffect(() => { if (driverProfile) setAvailable(!!driverProfile.active) }, [driverProfile?.id, driverProfile?.active])

  useEffect(() => {
    if (!active) { setSharing(false); setPosition(null); setGpsState('Nenhuma entrega em rota.'); }
  }, [active])
  useEffect(() => {
    if (!sharing || !active) return
    if (!navigator.geolocation || !window.isSecureContext) { setGpsState('GPS exige HTTPS e permissão do dispositivo.'); setSharing(false); return }
    let lastSent = 0
    const watcher = navigator.geolocation.watchPosition(async result => {
      const point = { latitude: result.coords.latitude, longitude: result.coords.longitude, accuracy_m: result.coords.accuracy, observed_at: new Date(result.timestamp).toISOString() }
      setPosition(point)
      setGpsState(`Última posição observada ${formatTime(point.observed_at)} · precisão ${Math.round(point.accuracy_m)} m`)
      if (Date.now() - lastSent < 15000 || !supabase) return
      lastSent = Date.now()
      const { data, error } = await supabase.rpc('lusky_report_location', { p_latitude: point.latitude, p_longitude: point.longitude, p_accuracy_m: point.accuracy_m, p_observed_at: point.observed_at })
      if (error || data !== true) setGpsState('A posição não chegou ao servidor. Verifique sua conexão e a entrega ativa.')
    }, error => {
      setGpsState(error.code === 1 ? 'Permissão de GPS negada. Ative-a nas configurações do navegador.' : 'GPS indisponível. Tente novamente em uma área aberta.')
      if (error.code === 1) setSharing(false)
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 })
    return () => navigator.geolocation.clearWatch(watcher)
  }, [sharing, active])
  useEffect(() => {
    if (!next || !supabase || next.delivery_latitude == null) { setRoute(null); return }
    let alive = true
    setRouteError('')
    mapRequest(supabase, { action: 'route', order_number: Number(String(next.id).replace(/\D/g,'')) }).then(value => { if (alive) setRoute(value) }).catch(error => { if (alive) setRouteError(error.message) })
    return () => { alive = false }
  }, [next?.id, next?.delivery_latitude])

  const confirm = async (order, status) => {
    if (busy) return
    const code = String(codes[order.id] || '').replace(/\D/g,'')
    if (code.length < 4) { setMessage('Digite o código informado pela cozinha ou pelo cliente.'); return }
    setBusy(true)
    const okay = await onStatus(order.id, status, code)
    setBusy(false)
    setMessage(okay ? `${status === 'Entregue' ? 'Entrega' : 'Retirada'} confirmada.` : 'Código incorreto ou etapa indisponível. Confira com a pessoa responsável.')
    if (okay) setCodes(current => ({ ...current, [order.id]: '' }))
  }
  const toggleAvailability = async () => {
    if (!supabase) { setGpsState('Disponibilidade exige conexão com o Supabase.'); return }
    const { data, error } = await supabase.rpc('lusky_set_driver_availability', { p_active: !available })
    if (error || data !== true) { setMessage(error?.message || 'Não foi possível mudar sua disponibilidade.'); return }
    setAvailable(value => !value)
    setMessage(!available ? 'Você está disponível para novas entregas.' : 'Você está offline para novas entregas.')
  }
  const reportIncident = async order => {
    if (!supabase) { setMessage('Ocorrência disponível somente no sistema conectado.'); return }
    const detail = String(incidentText[order.id] || '').trim()
    if (detail.length < 10) { setMessage('Descreva a ocorrência em pelo menos 10 caracteres.'); return }
    const { data, error } = await supabase.rpc('lusky_report_incident', { p_order_number:Number(String(order.id).replace(/\D/g,'')), p_detail:detail })
    if (error || data !== true) { setMessage(error?.message || 'Não foi possível registrar a ocorrência.'); return }
    setIncidentText(current => ({ ...current, [order.id]:'' }))
    setMessage('Ocorrência registrada para a equipe.')
  }
  const destination = next?.delivery_latitude != null ? { latitude: next.delivery_latitude, longitude: next.delivery_longitude } : null
  const navigateUrl = destination ? `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude}%2C${destination.longitude}` : null
  return <div className="rider-portal"><header className="portal-header"><div className="brand"><span className="brand-symbol"><UtensilsCrossed size={19}/></span><span className="brand-wordmark">lusky<span>food</span></span></div><div className="portal-account"><Bike size={18}/><b>{driverProfile?.full_name || 'Motoboy Lusky'}</b><small>{driverProfile?.driver_code}</small><button className="text-button" onClick={onSignOut}>Sair</button></div></header>
    <main className="rider-main"><section className="rider-welcome"><div><h1>Sua rota de hoje</h1><p>{deliveries.length} {deliveries.length === 1 ? 'entrega atribuída' : 'entregas atribuídas'} · confira a próxima ação.</p></div><button className="button button-secondary" onClick={toggleAvailability}>{available ? 'Disponível · ficar offline' : 'Offline · ficar disponível'}</button></section>
      <div className="rider-layout"><section className="route-list"><div className="route-list-heading"><h2>Paradas</h2></div>{deliveries.length ? deliveries.map((order,index) => <article className={`route-stop ${order.id === next?.id ? 'next-stop' : ''}`} key={order.id}><div className="stop-number">{index+1}</div><div className="stop-content"><div className="stop-topline"><b>{order.id}</b><span>{order.status}</span></div><h3>{order.name}</h3><p className="stop-address"><MapPin size={14}/>{order.address || 'Endereço pendente de confirmação'}</p><div className="stop-order-items">{order.items?.map(item => `${item.quantity}× ${item.name}`).join(' · ')}</div>
        {order.status === 'Pronto' && <label className="rider-code pickup"><span><ClipboardCheck size={15}/> Peça o código de retirada à cozinha</span><input inputMode="numeric" maxLength={6} value={codes[order.id] || ''} onChange={event => setCodes(current => ({ ...current, [order.id]: event.target.value.replace(/\D/g,'') }))} placeholder="Código da cozinha"/><button className="button button-dark" disabled={busy} onClick={() => confirm(order,'Saiu para entrega')}>Confirmar retirada <Check size={15}/></button></label>}
        {order.status === 'Saiu para entrega' && <><label className="rider-code delivery-code"><span><PackageCheck size={15}/> Peça o código ao cliente na chegada</span><input inputMode="numeric" maxLength={6} value={codes[order.id] || ''} onChange={event => setCodes(current => ({ ...current, [order.id]: event.target.value.replace(/\D/g,'') }))} placeholder="Código do cliente"/><button className="button button-yellow" disabled={busy} onClick={() => confirm(order,'Entregue')}>Confirmar entrega <Check size={15}/></button></label><div className="rider-incident"><label>Problema nesta entrega<textarea value={incidentText[order.id]||''} onChange={event=>setIncidentText(current=>({...current,[order.id]:event.target.value}))} placeholder="Descreva o que aconteceu para a equipe" maxLength={500}/></label><button className="text-button" onClick={()=>reportIncident(order)}>Registrar ocorrência</button></div></>}
      </div></article>) : <div className="route-empty"><PackageCheck size={24}/><b>Sem entregas atribuídas agora.</b></div>}{message && <p role="status" className="checkout-error">{message}</p>}</section>
      <aside className="rider-map-panel"><Suspense fallback={<div className="map-unavailable">Abrindo mapa…</div>}><DeliveryMap restaurant={restaurant} destination={destination} rider={position} route={route} /></Suspense><div className="map-note"><Navigation size={16}/><span><b>Rota planejada</b><small>{route ? `${(route.distance_m/1000).toFixed(1)} km · cerca de ${Math.ceil(route.duration_s/60)} min · calculada ${formatTime(route.calculated_at)}. Perfil carro, sem trânsito ao vivo.` : routeError || 'Aguardando cálculo da rota.'}</small></span></div>
        {next && navigateUrl && <a className="button button-secondary" href={navigateUrl} target="_blank" rel="noreferrer">Abrir navegação externa</a>}
        <div className="gps-panel"><b>Compartilhamento de localização</b><p>Enquanto houver entrega em rota, cliente e equipe podem ver sua última posição enviada.</p><button className="button button-dark" disabled={!active} onClick={() => setSharing(value => !value)}>{sharing ? 'Parar compartilhamento' : 'Iniciar GPS'}</button><small role="status">{gpsState}</small></div>
      </aside></div></main></div>
}
