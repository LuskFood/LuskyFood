import React, { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { addressIsComplete, addressLocationKey, digits, distanceKm, lookupCep, mapRequest, maskCep, updateAddressField, validMapPoint } from './delivery'

const PinPicker = lazy(() => import('./DeliveryMap').then(module => ({ default: module.PinPicker })))

export default function DeliveryAddress({ value, onChange, restaurant, client }) {
  const [cepState, setCepState] = useState('')
  const [mapState, setMapState] = useState('')
  const [busy, setBusy] = useState(false)
  const [manualNeedsPick,setManualNeedsPick] = useState(false)
  const pointEditRef = useRef(0)
  const locationKeyRef = useRef(addressLocationKey(value))
  locationKeyRef.current = addressLocationKey(value)
  const update = (field, text) => { if (['street','street_number','no_number','district','city','state','zip_code'].includes(field)) { pointEditRef.current++; setManualNeedsPick(false) } onChange(current => updateAddressField(current, field, text)) }

  useEffect(() => {
    if (digits(value.zip_code).length !== 8) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setCepState('Buscando CEP…')
      try {
        const result = await lookupCep(value.zip_code, controller.signal)
        if (controller.signal.aborted) return
        onChange(current => ({ ...current,
          ...Object.fromEntries(['street','district','city','state'].filter(field => !current[field] && result[field]).map(field => [field,result[field]])),
          ...(['street','district','city','state'].some(field => !current[field] && result[field]) ? { latitude:null, longitude:null, pin_confirmed:false } : {}),
        }))
        setCepState('CEP consultado. Informe o número e confira os demais campos.')
      } catch (error) { if (!controller.signal.aborted) setCepState(error.message) }
    }, 400)
    return () => { clearTimeout(timer); controller.abort() }
  }, [digits(value.zip_code)])

  const hasAddressText = digits(value.zip_code).length === 8 && value.street.trim() && (value.no_number || value.street_number.trim()) && value.district.trim() && value.city.trim() && value.state.trim()
  const locate = async () => {
    if (!hasAddressText) { setMapState('Preencha CEP, rua, número, bairro, cidade e UF antes de localizar.'); return }
    setBusy(true); setMapState('Localizando o endereço completo…')
    const requestedLocationKey = addressLocationKey(value)
    const requestedPointVersion = pointEditRef.current
    try {
      const text = `${value.street}, ${value.no_number ? 's/n' : value.street_number}, ${value.district}, ${value.city}, ${value.state}, Brasil, ${digits(value.zip_code)}`
      const result = await mapRequest(client, { action: 'geocode', text })
      if (locationKeyRef.current !== requestedLocationKey || pointEditRef.current !== requestedPointVersion) { setMapState('O ponto mudou durante a busca. Localize novamente se necessário.'); return }
      if (!result.point) throw new Error('Endereço não encontrado. Confira os campos e tente novamente.')
      onChange(current => addressLocationKey(current) === requestedLocationKey ? { ...current, ...result.point, pin_confirmed: false } : current)
      setManualNeedsPick(false)
      setMapState('Confira o pino. Toque no mapa para ajustá-lo e depois confirme.')
    } catch (error) { setMapState(error.message) }
    finally { setBusy(false) }
  }
  const startManualPick = () => {
    if (!hasAddressText || !validMapPoint(restaurant)) { setMapState('Preencha o endereço e peça à equipe para configurar o pino do restaurante.'); return }
    pointEditRef.current++
    onChange(current => ({ ...current, latitude: Number(restaurant.latitude), longitude: Number(restaurant.longitude), pin_confirmed: false }))
    setManualNeedsPick(true)
    setMapState('Arraste o mapa até sua rua e toque no ponto exato da entrega. O pino inicial é o restaurante.')
  }
  const distance = distanceKm(restaurant, value)
  const covered = distance != null && restaurant?.delivery_radius_km != null && distance <= Number(restaurant.delivery_radius_km)
  return <div className="delivery-address-fields">
    <div className="settings-two"><label className="field-label">CEP<input inputMode="numeric" autoComplete="postal-code" value={maskCep(value.zip_code)} onChange={event => update('zip_code', digits(event.target.value).slice(0,8))} placeholder="00000-000" /></label><label className="field-label">Apelido<input value={value.label} onChange={event => update('label', event.target.value)} placeholder="Casa ou Trabalho" /></label></div>
    {cepState && <small role="status" className="address-hint">{cepState}</small>}
    <label className="field-label">Rua ou avenida<input value={value.street} onChange={event => update('street', event.target.value)} autoComplete="address-line1" /></label>
    <div className="settings-two"><label className="field-label">Número<input value={value.street_number} disabled={value.no_number} onChange={event => update('street_number', event.target.value)} placeholder="Número da casa" /></label><label className="address-check"><input type="checkbox" checked={value.no_number} onChange={event => update('no_number', event.target.checked)} /> Sem número</label></div>
    <div className="settings-two"><label className="field-label">Complemento<input value={value.complement} onChange={event => update('complement', event.target.value)} placeholder="Apto, bloco…" /></label><label className="field-label">Bairro<input value={value.district} onChange={event => update('district', event.target.value)} /></label></div>
    <div className="settings-two"><label className="field-label">Cidade<input value={value.city} onChange={event => update('city', event.target.value)} /></label><label className="field-label">UF<input maxLength={2} value={value.state} onChange={event => update('state', event.target.value.toUpperCase().replace(/[^A-Z]/g,''))} /></label></div>
    <div className="settings-two"><label className="field-label">Ponto de referência<input value={value.reference} onChange={event => update('reference', event.target.value)} /></label><label className="field-label">Instruções de entrega<input value={value.instructions} onChange={event => update('instructions', event.target.value)} /></label></div>
    <div className="address-map-actions"><button type="button" className="button button-secondary" disabled={busy || !client} onClick={locate}>{busy ? 'Localizando…' : 'Localizar endereço no mapa'}</button><button type="button" className="button button-secondary" disabled={!validMapPoint(restaurant) || !hasAddressText} onClick={startManualPick}>Marcar destino manualmente</button></div>
    {mapState && <p className="address-hint" role="status">{mapState}</p>}
    {validMapPoint(value) && <><Suspense fallback={<div className="map-unavailable">Abrindo mapa…</div>}><PinPicker point={value} onPick={point => { pointEditRef.current++; onChange(current => ({ ...current, ...point, pin_confirmed: false })); setManualNeedsPick(false) }} /></Suspense>
      <div className="address-confirm"><span>{covered ? `Dentro da área atendida · ${distance.toFixed(1)} km em linha reta` : 'Fora da área atendida ou restaurante sem localização configurada'}</span><button type="button" className="button button-dark" disabled={!covered || manualNeedsPick} onClick={() => { onChange(current => ({ ...current, pin_confirmed: true })); setMapState('Pino confirmado para este pedido.') }}>{value.pin_confirmed ? 'Pino confirmado' : 'Confirmar pino'}</button></div></>}
    {!addressIsComplete(value) && <small className="address-hint">O endereço completo e o pino confirmado são necessários para entrega.</small>}
  </div>
}
