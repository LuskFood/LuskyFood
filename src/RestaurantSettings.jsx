import React, { lazy, Suspense, useEffect, useState } from 'react'
import { digits, lookupCep, mapRequest, maskCep } from './delivery'
import { supabase } from './supabase'

const PinPicker = lazy(() => import('./DeliveryMap').then(module => ({ default: module.PinPicker })))

export default function RestaurantSettings({ restaurant, onSaved }) {
  const [form,setForm]=useState(null)
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{if(restaurant)setForm(restaurant)},[restaurant])
  if(!form)return <div className="panel settings-panel">Configurações operacionais disponíveis após entrar no sistema conectado.</div>
  const update=(key,value)=>setForm(current=>({...current,[key]:value,...(['street','street_number','district','city','state','zip_code'].includes(key)?{latitude:null,longitude:null}:{})}))
  const fetchCep=async()=>{setMessage('Consultando CEP…');try{const result=await lookupCep(form.zip_code);setForm(current=>({...current,street:current.street||result.street,district:current.district||result.district,city:current.city||result.city,state:current.state||result.state}));setMessage('Confira o endereço e informe o número.') }catch(error){setMessage(error.message)}}
  const locate=async()=>{setMessage('Localizando restaurante…');try{const result=await mapRequest(supabase,{action:'geocode',text:`${form.street}, ${form.street_number}, ${form.district}, ${form.city}, ${form.state}, Brasil, ${digits(form.zip_code)}`});setForm(current=>({...current,...result.point}));setMessage('Confira o pino e ajuste no mapa se necessário.')}catch(error){setMessage(error.message)}}
  const save=async()=>{
    if(!supabase){setMessage('Conecte o Supabase para salvar a operação real.');return}
    if(!form.name?.trim()||digits(form.zip_code).length!==8||!form.street?.trim()||!form.street_number?.trim()||!form.city?.trim()||!form.state?.trim()||form.latitude==null||form.longitude==null){setMessage('Preencha endereço completo e confirme a posição do restaurante.');return}
    if(!form.accepts_cash&&!form.accepts_manual_pix){setMessage('Ative pelo menos uma forma de pagamento antes de salvar.');return}
    setBusy(true);setMessage('Salvando…')
    const payload={name:form.name.trim(),zip_code:digits(form.zip_code),street:form.street.trim(),street_number:form.street_number.trim(),district:form.district.trim(),city:form.city.trim(),state:form.state.trim().toUpperCase(),latitude:Number(form.latitude),longitude:Number(form.longitude),delivery_radius_km:Number(form.delivery_radius_km),delivery_fee:Number(form.delivery_fee),accepts_cash:!!form.accepts_cash,accepts_manual_pix:!!form.accepts_manual_pix,updated_at:new Date().toISOString()}
    const {data,error}=await supabase.from('lusky_restaurant_settings').update(payload).eq('id',1).select().single()
    setBusy(false)
    if(error){setMessage('Não foi possível salvar: '+error.message);return}
    onSaved(data);setMessage('Configuração salva no banco.')
  }
  return <><div className="section-heading"><h1>Configurações do restaurante</h1></div><section className="panel settings-panel"><p>Defina a origem das entregas, área atendida e taxa. A distância de cobertura usa linha reta; o trajeto usa a rota estimada do provedor.</p>
    <label className="field-label">Nome<input value={form.name||''} onChange={event=>update('name',event.target.value)}/></label>
    <div className="settings-two"><label className="field-label">CEP<input inputMode="numeric" value={maskCep(form.zip_code)} onChange={event=>update('zip_code',digits(event.target.value).slice(0,8))}/></label><button className="button button-secondary" onClick={fetchCep} disabled={digits(form.zip_code).length!==8}>Buscar CEP</button></div>
    <label className="field-label">Rua<input value={form.street||''} onChange={event=>update('street',event.target.value)}/></label><div className="settings-two"><label className="field-label">Número<input value={form.street_number||''} onChange={event=>update('street_number',event.target.value)}/></label><label className="field-label">Bairro<input value={form.district||''} onChange={event=>update('district',event.target.value)}/></label></div><div className="settings-two"><label className="field-label">Cidade<input value={form.city||''} onChange={event=>update('city',event.target.value)}/></label><label className="field-label">UF<input maxLength={2} value={form.state||''} onChange={event=>update('state',event.target.value.toUpperCase().replace(/[^A-Z]/g,''))}/></label></div>
    <button className="button button-secondary" onClick={locate} disabled={!supabase||!form.street||!form.street_number||!form.city||!form.state}>Localizar no mapa</button>{form.latitude!=null&&form.longitude!=null&&<Suspense fallback={<div className="map-unavailable">Abrindo mapa…</div>}><PinPicker point={form} onPick={point=>setForm(current=>({...current,...point}))}/></Suspense>}
    <div className="settings-two"><label className="field-label">Raio de entrega em km<input type="number" min="0.1" max="100" step="0.1" value={form.delivery_radius_km||''} onChange={event=>update('delivery_radius_km',event.target.value)}/></label><label className="field-label">Taxa de entrega em R$<input type="number" min="0" step="0.01" value={form.delivery_fee??''} onChange={event=>update('delivery_fee',event.target.value)}/></label></div>
    <label className="address-check"><input type="checkbox" checked={!!form.accepts_cash} onChange={event=>update('accepts_cash',event.target.checked)}/> Pagamento na entrega ou retirada</label><label className="address-check"><input type="checkbox" checked={!!form.accepts_manual_pix} onChange={event=>update('accepts_manual_pix',event.target.checked)}/> Pix manual com conferência da equipe</label>
    {message&&<p role="status" className="address-hint">{message}</p>}<button className="button button-dark" disabled={busy} onClick={save}>{busy?'Salvando…':'Salvar configurações'}</button>
  </section></>
}
