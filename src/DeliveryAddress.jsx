import { lazy, Suspense, useEffect, useState } from 'react'
import { addressIsComplete, digits, distanceKm, lookupCep, mapRequest, maskCep } from './delivery'

const PinPicker = lazy(() => import('./DeliveryMap').then(module => ({ default: module.PinPicker })))

export default function DeliveryAddress({ value, onChange, restaurant, client }) {
  const [cepState, setCepState] = useState('')
  const [mapState, setMapState] = useState('')
  const [busy, setBusy] = useState(false)
  const update = (field, text) => onChange(current => ({ ...current, [field]: text, ...(['street','street_number','no_number','district','city','state','zip_code'].includes(field) ? { pin_confirmed: false } : {}) }))

  useEffect(() => {
    if (digits(value.zip_code).length !== 8) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setCepState('Buscando CEP…')
      try {
        const result = await lookupCep(value.zip_code, controller.signal)
        onChange(current => ({ ...current,
          street: current.street || result.street,
          district: current.district || result.district,
          city: current.city || result.city,
          state: current.state || result.state,
        }))
        setCepState('CEP consultado. Informe o número e confira os demais campos.')
      } catch (error) { if (!controller.signal.aborted) setCepState(error.message) }
    }, 400)
    return () => { clearTimeout(timer); controller.abort() }
  }, [digits(value.zip_code)])

  const locate = async () => {
    const complete = digits(value.zip_code).length === 8 && value.street.trim() && (value.no_number || value.street_number.trim()) && value.city.trim() && value.state.trim()
    if (!complete) { setMapState('Preencha CEP, rua, número, cidade e UF antes de localizar.'); return }
    setBusy(true); setMapState('Localizando o endereço completo…')
    try {
      const text = `${value.street}, ${value.no_number ? 's/n' : value.street_number}, ${value.district}, ${value.city}, ${value.state}, Brasil, ${digits(value.zip_code)}`
      const result = await mapRequest(client, { action: 'geocode', text })
      if (!result.point) throw new Error('Endereço não encontrado. Confira os campos e tente novamente.')
      onChange(current => ({ ...current, ...result.point, pin_confirmed: false }))
      setMapState('Confira o pino. Toque no mapa para ajustá-lo e depois confirme.')
    } catch (error) { setMapState(error.message) }
    finally { setBusy(false) }
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
    <button type="button" className="button button-secondary" disabled={busy || !client} onClick={locate}>{busy ? 'Localizando…' : 'Localizar endereço no mapa'}</button>
    {mapState && <p className="address-hint" role="status">{mapState}</p>}
    {(value.latitude != null && value.longitude != null) && <><Suspense fallback={<div className="map-unavailable">Abrindo mapa…</div>}><PinPicker point={value} onPick={point => onChange(current => ({ ...current, ...point, pin_confirmed: false }))} /></Suspense>
      <div className="address-confirm"><span>{covered ? `Dentro da área atendida · ${distance.toFixed(1)} km em linha reta` : 'Fora da área atendida ou restaurante sem localização configurada'}</span><button type="button" className="button button-dark" disabled={!covered} onClick={() => { onChange(current => ({ ...current, pin_confirmed: true })); setMapState('Pino confirmado para este pedido.') }}>{value.pin_confirmed ? 'Pino confirmado' : 'Confirmar pino'}</button></div></>}
    {!addressIsComplete(value) && <small className="address-hint">O endereço completo e o pino confirmado são necessários para entrega.</small>}
  </div>
}
