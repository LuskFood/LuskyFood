import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bike, CheckCircle2, Clock, LogOut, MapPin, Minus, Plus, ShoppingBag, UserRound, UtensilsCrossed, X } from 'lucide-react'
import DeliveryAddress from './DeliveryAddress'
import { PasswordChangeForm } from './AccountSettings'
import { addressIsComplete, distanceKm, emptyAddress, mapRequest, maskPhone, digits } from './delivery'
import { supabase } from './supabase'

const DeliveryMap = lazy(() => import('./DeliveryMap'))
const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const formatTime = value => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }) : '—'
const cartKey = 'lusky-customer-cart-v2'
const notesKey = 'lusky-customer-notes-v1'

function HistoryEntry({ order }) {
  const [open,setOpen]=useState(false)
  const [events,setEvents]=useState([])
  const [historyError,setHistoryError]=useState('')
  useEffect(()=>{
    if(!open||!supabase||!order.db_id)return
    let alive=true
    supabase.from('lusky_order_events').select('to_status,reason,created_at').eq('order_id',order.db_id).order('created_at').then(({data,error})=>{
      if(!alive)return
      if(error)setHistoryError('Não foi possível carregar as etapas deste pedido.')
      else {setEvents(data||[]);setHistoryError('')}
    })
    return()=>{alive=false}
  },[open,order.db_id,order.status])
  return <details className="order-history-entry" onToggle={event=>setOpen(event.currentTarget.open)}><summary><b>{order.id}</b><span>{order.status} · {order.type} · {money(order.total)}</span><small>{formatTime(order.created_at)}</small></summary>
    <div className="order-history-detail"><p><b>Itens:</b> {order.items?.map(item=>`${item.quantity}× ${item.name}${item.note?` (${item.note})`:''}`).join(' · ')||'Sem itens registrados'}</p>{order.type==='Entrega'&&<p><b>Endereço usado:</b> {order.address||order.delivery_snapshot?.street||'Pedido antigo sem endereço estruturado'}</p>}{order.payment_method==='manual_pix'&&<p><b>Pix manual:</b> {order.payment_status==='confirmed'?'Conferido pela equipe':'Aguardando conferência'}</p>}{historyError&&<p role="alert">{historyError}</p>}{events.length>0&&<ol>{events.map((item,index)=><li key={index}><time>{formatTime(item.created_at)}</time> · {item.to_status}{item.reason&&` · ${item.reason}`}</li>)}</ol>}</div>
  </details>
}

export default function CustomerPortal({ products, orders, drivers, session, onPlaceOrder, onSignOut, restaurant, syncError, preview = false }) {
  const user = session?.user
  const [cart, setCart] = useState(() => { try { return JSON.parse(sessionStorage.getItem(cartKey) || '{}') } catch { return {} } })
  const [notes,setNotes]=useState(() => { try { return JSON.parse(sessionStorage.getItem(notesKey) || '{}') } catch { return {} } })
  const [cartOpen, setCartOpen] = useState(false)
  const [section, setSection] = useState('menu')
  const [type, setType] = useState('Entrega')
  const [address, setAddress] = useState(emptyAddress)
  const [savedAddresses, setSavedAddresses] = useState([])
  const [name, setName] = useState(user?.user_metadata?.full_name || '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [payment, setPayment] = useState('cash')
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [handoffCode, setHandoffCode] = useState('')
  const [route, setRoute] = useState(null)
  const [routeError, setRouteError] = useState('')
  const [driverLocation, setDriverLocation] = useState(null)
  const [clock, setClock] = useState(Date.now())
  const ownOrders = useMemo(() => orders.filter(order => order.created_by === user?.id || (session?.localDemo && order.localCustomer === user?.email)), [orders, user?.id, user?.email, session?.localDemo])
  const active = ownOrders.find(order => !['Entregue', 'Cancelado'].includes(order.status))
  const assignedDriver = drivers.find(driver => driver.id === active?.assigned_driver)
  const count = Object.values(cart).reduce((sum, quantity) => sum + Number(quantity || 0), 0)
  const subtotal = products.reduce((sum, product) => sum + Number(product.price) * (cart[product.id] || 0), 0)
  const fee = type === 'Entrega' ? Number(restaurant?.delivery_fee || 0) : 0
  const deliveryDistance = distanceKm(restaurant, address)
  const deliveryCovered = deliveryDistance != null && restaurant?.delivery_radius_km != null && deliveryDistance <= Number(restaurant.delivery_radius_km)
  const paymentEnabled = payment === 'cash' ? restaurant?.accepts_cash !== false : restaurant?.accepts_manual_pix === true
  const canSubmit = count > 0 && paymentEnabled && name.trim().length >= 3 && digits(phone).length === 11 && (type === 'Retirada' || (addressIsComplete(address) && deliveryCovered))

  useEffect(() => { if (restaurant?.accepts_cash === false && restaurant?.accepts_manual_pix && payment === 'cash') setPayment('manual_pix') }, [restaurant?.accepts_cash, restaurant?.accepts_manual_pix, payment])

  useEffect(() => { sessionStorage.setItem(cartKey, JSON.stringify(cart)) }, [cart])
  useEffect(() => { sessionStorage.setItem(notesKey, JSON.stringify(notes)) }, [notes])
  useEffect(() => {
    if (!supabase || session?.localDemo || !user?.id) return
    let alive = true
    Promise.all([supabase.from('lusky_profiles').select('full_name,phone').eq('id', user.id).maybeSingle(), supabase.from('lusky_customer_addresses').select('*').order('created_at', { ascending: false })]).then(([profile, addresses]) => {
      if (!alive) return
      if (profile.data?.full_name) setName(profile.data.full_name)
      if (profile.data?.phone) setPhone(profile.data.phone)
      if (addresses.data) { setSavedAddresses(addresses.data); const primary = addresses.data.find(item => item.is_default); if (primary) setAddress({ ...emptyAddress, ...primary, pin_confirmed: !!primary.pin_confirmed_at }) }
    })
    return () => { alive = false }
  }, [user?.id, session?.localDemo])
  useEffect(() => {
    if (!active || active.status !== 'Saiu para entrega' || session?.localDemo || !supabase) { setHandoffCode(''); return }
    let alive = true
    supabase.rpc('lusky_customer_delivery_code', { p_order_number: Number(String(active.id).replace(/\D/g,'')) }).then(({ data }) => { if (alive) setHandoffCode(data || '') })
    return () => { alive = false }
  }, [active?.id, active?.status, session?.localDemo])
  useEffect(() => {
    if (!supabase || session?.localDemo || active?.delivery_latitude == null || active?.type !== 'Entrega') { setRoute(null); return }
    let alive = true
    setRouteError('')
    mapRequest(supabase, { action: 'route', order_number: Number(String(active.id).replace(/\D/g,'')) }).then(result => { if (alive) setRoute(result) }).catch(err => { if (alive) setRouteError(err.message) })
    return () => { alive = false }
  }, [active?.id, active?.delivery_latitude, active?.delivery_longitude, restaurant?.latitude, restaurant?.longitude])
  useEffect(() => {
    if (!supabase || session?.localDemo || !assignedDriver || active?.status !== 'Saiu para entrega') { setDriverLocation(null); return }
    let alive = true
    const load = async () => { const { data } = await supabase.from('lusky_driver_locations').select('*').eq('driver_id', assignedDriver.id).maybeSingle(); if (alive) setDriverLocation(data || null) }
    load()
    const channel = supabase.channel(`lusky-location-${assignedDriver.id}`).on('postgres_changes', { event: '*', schema:'public', table:'lusky_driver_locations', filter:`driver_id=eq.${assignedDriver.id}` }, load).subscribe(status => { if (status === 'SUBSCRIBED') load() })
    const refresh = setInterval(() => { setClock(Date.now()); load() }, 30000)
    return () => { alive = false; clearInterval(refresh); supabase.removeChannel(channel) }
  }, [assignedDriver?.id, active?.status])
  const positionAge = driverLocation?.observed_at ? clock - Date.parse(driverLocation.observed_at) : Infinity
  const freshPosition = positionAge < 120000 ? driverLocation : null

  const change = (id, amount) => setCart(current => ({ ...current, [id]: Math.max(0, (current[id] || 0) + amount) }))
  const saveAddress = async () => {
    if (!supabase || session?.localDemo || preview || !addressIsComplete(address)) return
    const payload = { user_id: user.id, label: address.label || 'Casa', zip_code: digits(address.zip_code), street: address.street, street_number: address.no_number ? '' : address.street_number, no_number: address.no_number, complement: address.complement, district: address.district, city: address.city, state: address.state, reference: address.reference, instructions: address.instructions, latitude: address.latitude, longitude: address.longitude, pin_confirmed_at: new Date().toISOString(), is_default: savedAddresses.length === 0 }
    if (address.id) delete payload.is_default
    const request = address.id ? supabase.from('lusky_customer_addresses').update(payload).eq('id',address.id) : supabase.from('lusky_customer_addresses').insert(payload)
    const { data, error: saveError } = await request.select().single()
    if (saveError) { setError('Não foi possível salvar o endereço. ' + saveError.message); return }
    setSavedAddresses(list => address.id ? list.map(item=>item.id===data.id?data:item) : [data, ...list]); setAddress({ ...emptyAddress, ...data, pin_confirmed:true }); setNotice('Endereço salvo na sua conta.')
  }
  const makeDefault = async item => { if(preview)return;const { data, error } = await supabase.rpc('lusky_set_default_address',{p_address_id:item.id});if(error||data!==true){setError('Não foi possível definir o endereço padrão.');return}setSavedAddresses(list=>list.map(address=>({...address,is_default:address.id===item.id})));setNotice('Endereço padrão atualizado.') }
  const removeAddress = async item => { if(preview)return;const { error } = await supabase.from('lusky_customer_addresses').delete().eq('id',item.id);if(error){setError('Não foi possível excluir o endereço.');return}setSavedAddresses(list=>list.filter(address=>address.id!==item.id));if(address.id===item.id)setAddress(emptyAddress);setNotice('Endereço excluído. Pedidos anteriores mantêm o endereço usado na época.') }
  const saveProfile = async () => {
    if (!supabase || session?.localDemo || preview) { setError('Este perfil não pode ser alterado na prévia ou demonstração.'); return }
    if (name.trim().length < 3 || digits(phone).length !== 11 || !email.includes('@')) { setError('Confira nome completo, celular com DDD e e-mail.'); return }
    setError('')
    const { error: profileError } = await supabase.from('lusky_profiles').update({ full_name:name.trim(), display_name:name.trim(), phone:digits(phone) }).eq('id', user.id)
    if (profileError) { setError('Não foi possível salvar o perfil: ' + profileError.message); return }
    if (email.trim().toLowerCase() !== user.email?.toLowerCase()) {
      const { error: emailError } = await supabase.auth.updateUser({ email:email.trim() })
      if (emailError) { setError('Perfil salvo, mas o e-mail não foi alterado: ' + emailError.message); return }
      setNotice('Perfil salvo. Confirme a mudança no novo e-mail.')
    } else setNotice('Perfil salvo na sua conta.')
  }
  const submit = async () => {
    if (busy || !canSubmit) return
    setBusy(true); setError(''); setNotice('')
    const result = await onPlaceOrder({ request_id: requestId, name: name.trim(), phone: digits(phone), type, address: type === 'Entrega' ? { ...address, zip_code: digits(address.zip_code) } : null, payment_method: payment, items: products.filter(product => cart[product.id]).map(product => ({ product_id: product.id, name: product.name, quantity: cart[product.id], note:notes[product.id]||'' })) })
    setBusy(false)
    if (!result?.ok) { setError(result?.error || 'Pedido não confirmado. Seu carrinho foi mantido.'); return }
    setCart({});setNotes({}); setRequestId(crypto.randomUUID()); setCartOpen(false)
    setSection('orders')
    setNotice(`Pedido ${result.id} confirmado. Acompanhe as etapas em Meus pedidos.`)
  }
  return <div className="portal customer-portal"><header className="portal-header"><div className="brand"><span className="brand-symbol"><UtensilsCrossed size={19}/></span><span className="brand-wordmark">lusky<span>food</span></span></div><nav aria-label="Menu do cliente"><button className={section==='menu'?'selected':''} onClick={()=>setSection('menu')}>Cardápio</button><button className={section==='orders'?'selected':''} onClick={()=>setSection('orders')}>Meus pedidos</button><button className={section==='account'?'selected':''} onClick={()=>setSection('account')}>Dados da conta</button></nav><div className="portal-account"><b>{name || user?.email}</b><button className="portal-account-link" onClick={()=>setSection('account')}><UserRound size={16}/>Minha conta</button><button className="portal-account-link portal-signout" onClick={onSignOut}><LogOut size={16}/>{preview?'Sair da prévia':'Sair'}</button></div></header>
    <main className="portal-main">{syncError&&<p className="checkout-error" role="alert">{syncError}</p>}{section==='menu'&&<><section className="customer-hero"><div className="customer-hero-copy"><h1>Comida que<br/>abraça <em>o dia.</em></h1><p>Escolha seu prato e acompanhe cada etapa do pedido.</p><button className="button button-yellow" onClick={()=>document.getElementById('menu-cliente')?.scrollIntoView({behavior:'smooth'})}>Ver cardápio <ArrowRight size={16}/></button></div><div className="customer-hero-food"><img src="/images/yakisoba.jpg" alt="Yakisoba da Lusky Food" /></div></section>
      <section className="customer-menu-section" id="menu-cliente"><div className="customer-section-heading"><div><h2>Qual vai ser hoje?</h2><p>Pratos disponíveis agora.</p></div></div><div className="customer-dish-grid">{products.filter(product => product.available).map(product => <article className="customer-dish" key={product.id}><div className="customer-dish-photo">{product.image_url && <img src={product.image_url} alt={product.name} loading="lazy"/>}<button className="dish-add" aria-label={`Adicionar ${product.name}`} onClick={() => change(product.id, 1)}><Plus size={20}/></button></div><div className="customer-dish-info"><div><h3>{product.name}</h3><b>{money(product.price)}</b></div><p>{product.description}</p>{cart[product.id] > 0 && <b>{cart[product.id]} no carrinho</b>}</div></article>)}</div></section>
      </>}{section==='orders'&&<section className="customer-tracking" id="acompanhar"><div className="tracking-heading"><h2>Meus pedidos</h2></div>{notice && <p role="status" className="checkout-success"><CheckCircle2 size={16}/>{notice}</p>}{active ? <div className="tracking-card"><div className="tracking-order-summary"><span className="order-ticket">{active.id}</span><div><b>{active.status}</b><small>{active.items?.map(item => `${item.quantity}× ${item.name}`).join(' · ')}</small><small>{money(active.total)} · {formatTime(active.created_at)}</small></div></div>
        {active.payment_method==='manual_pix'&&<div className="manual-pix-note"><b>{active.payment_status==='confirmed'?'Pix manual conferido pela equipe.':'Pix manual aguardando conferência da equipe.'}</b>{active.payment_status!=='confirmed'&&<p>{restaurant?.manual_pix_instructions}</p>}</div>}
        {active.type === 'Entrega' && <><Suspense fallback={<div className="map-unavailable">Abrindo mapa…</div>}><DeliveryMap restaurant={restaurant} destination={{ latitude: active.delivery_latitude, longitude: active.delivery_longitude }} rider={freshPosition||active.demo_position} route={route} /></Suspense><p className="map-state">{route ? `Rota planejada: ${(route.distance_m / 1000).toFixed(1)} km · cerca de ${Math.ceil(route.duration_s / 60)} min · calculada ${formatTime(route.calculated_at)}. Perfil carro, sem trânsito ao vivo.` : routeError || (active.delivery_latitude==null||restaurant?.latitude==null ? 'Origem ou destino sem pino confirmado.' : session?.localDemo ? 'Demonstração: linha reta entre os pinos; trajeto por vias não calculado.' : 'Aguardando cálculo da rota.')}</p><p className="map-state">{freshPosition ? `GPS observado ${formatTime(freshPosition.observed_at)} · precisão ${Math.round(freshPosition.accuracy_m)} m.` : driverLocation ? `Último GPS de ${formatTime(driverLocation.observed_at)} está desatualizado.` : active.demo_position ? 'Posição simulada do motoboy nesta demonstração.' : 'Motoboy ainda não compartilhou GPS.'}</p></>}
        {assignedDriver && <p><Bike size={15}/> Motoboy: {assignedDriver.full_name} · {assignedDriver.driver_code}</p>}{handoffCode && <div className="handoff-code"><b>Código para entregar ao motoboy na chegada: {handoffCode}</b></div>}</div> : <div className="tracking-empty"><ShoppingBag size={22}/><b>Seu próximo pedido aparece aqui.</b></div>}
        {ownOrders.length > 0 && <div className="order-history"><h3>Histórico</h3>{ownOrders.map(order => <HistoryEntry key={order.id} order={order}/>)}</div>}</section>}{section==='account'&&<section className="customer-profile panel" id="minha-conta"><h2>Minha conta</h2><p>Cliente · {user?.email}</p>{preview&&<p className="account-error">Prévia da experiência do cliente. Alterações da conta estão desativadas.</p>}{!preview&&!session?.localDemo&&digits(phone).length!==11&&<p className="account-error" role="status">Celular pendente nesta conta antiga. Informe seu número com DDD e salve para completar o perfil.</p>}<div className="settings-two"><label className="field-label">Nome completo<input autoComplete="name" value={name} onChange={event=>setName(event.target.value)} disabled={preview||session?.localDemo}/></label><label className="field-label">Celular com DDD · obrigatório<input inputMode="tel" autoComplete="tel" value={maskPhone(phone)} onChange={event=>setPhone(digits(event.target.value).slice(0,11))} disabled={preview||session?.localDemo}/></label></div><label className="field-label">E-mail<input type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} disabled={preview||session?.localDemo}/></label><button className="button button-dark" onClick={saveProfile} disabled={preview||session?.localDemo}>Salvar informações</button>{error&&<p className="checkout-error" role="alert">{error}</p>}<PasswordChangeForm disabled={preview||!!session?.localDemo}/><div className="saved-addresses"><h3>Endereços salvos</h3>{savedAddresses.length?savedAddresses.map(item=><div key={item.id}><b>{item.label}{item.is_default?' · padrão':''}</b><span>{item.street}, {item.street_number||'s/n'} · {item.city}/{item.state}</span><div><button className="text-button" onClick={()=>{setAddress({...emptyAddress,...item,pin_confirmed:!!item.pin_confirmed_at});setCartOpen(true);setType('Entrega')}}>Editar ou usar</button>{!item.is_default&&<button className="text-button" onClick={()=>makeDefault(item)}>Tornar padrão</button>}<button className="text-button" onClick={()=>removeAddress(item)}>Excluir</button></div></div>):<p>Nenhum endereço salvo.</p>}</div><div className="account-exit"><span>Encerre a sessão neste aparelho quando terminar.</span><button className="button button-secondary" onClick={onSignOut}><LogOut size={16}/>Sair da conta</button></div></section>}</main>
    {count > 0 && <button className="floating-cart" onClick={() => setCartOpen(true)}><ShoppingBag size={17}/><b>{count} itens · {money(subtotal)}</b><ArrowRight size={16}/></button>}
    {cartOpen && <div className="cart-scrim" onClick={() => !busy && setCartOpen(false)}><section className="cart-drawer" onClick={event => event.stopPropagation()}><div className="cart-head"><h2>Seu pedido</h2><button className="icon-button" aria-label="Fechar carrinho" disabled={busy} onClick={() => setCartOpen(false)}><X size={18}/></button></div>
      <div className="cart-items">{products.filter(product => cart[product.id]).map(product => <div className="cart-item" key={product.id}><b>{product.name}</b><span>{money(product.price)}</span><div className="qty-control"><button onClick={() => change(product.id,-1)}><Minus size={12}/></button><b>{cart[product.id]}</b><button onClick={() => change(product.id,1)}><Plus size={12}/></button></div><label className="cart-note">Observações para este prato<input maxLength={300} value={notes[product.id]||''} onChange={event=>setNotes(current=>({...current,[product.id]:event.target.value}))} placeholder="Ex.: sem cebola"/></label></div>)}</div>
      <div className="order-type-tabs"><button className={type === 'Entrega' ? 'selected' : ''} onClick={() => setType('Entrega')}>Entrega</button><button className={type === 'Retirada' ? 'selected' : ''} onClick={() => setType('Retirada')}>Retirada no balcão</button></div>
      <label className="field-label">Nome completo<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label><label className="field-label">Celular com DDD<input value={maskPhone(phone)} onChange={event => setPhone(digits(event.target.value).slice(0,11))} inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" /></label>
      {type === 'Entrega' && <><label className="field-label">Endereço salvo<select value={address.id||''} onChange={event => { const selected = savedAddresses.find(item => item.id === event.target.value); setAddress(selected ? { ...emptyAddress, ...selected, pin_confirmed: !!selected.pin_confirmed_at } : emptyAddress) }}><option value="">Preencher novo endereço</option>{savedAddresses.map(item => <option key={item.id} value={item.id}>{item.label} · {item.street}, {item.street_number || 's/n'}</option>)}</select></label><DeliveryAddress value={address} onChange={setAddress} restaurant={restaurant} client={supabase}/><button className="text-button" disabled={!addressIsComplete(address)} onClick={saveAddress}>{address.id?'Salvar alterações do endereço':'Salvar este endereço'}</button></>}
      <label className="field-label">Pagamento<select value={payment} onChange={event => setPayment(event.target.value)}>{restaurant?.accepts_cash !== false && <option value="cash">Na entrega ou retirada</option>}{restaurant?.accepts_manual_pix && <option value="manual_pix">Pix manual, sujeito à conferência</option>}</select></label>
      {payment==='manual_pix'&&<div className="manual-pix-note"><b>Pix manual, sem confirmação automática</b><p>{restaurant?.manual_pix_instructions}</p><small>A equipe confere o pagamento antes de iniciar o preparo.</small></div>}
      <div className="cart-total"><span>Pratos {money(subtotal)}{type === 'Entrega' && <> · entrega {money(fee)}</>}</span><b>{money(subtotal + fee)}</b></div>{error && <div className="checkout-error" role="alert">{error}</div>}<button className="button button-yellow cart-submit" disabled={!canSubmit || busy} onClick={submit}>{busy ? 'Confirmando pedido…' : 'Confirmar pedido'} <ArrowRight size={16}/></button></section></div>}
  </div>
}
