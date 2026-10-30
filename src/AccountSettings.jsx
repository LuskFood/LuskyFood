import React, { useEffect, useState } from 'react'
import { Bike, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { digits, maskPhone } from './delivery'
import { supabase } from './supabase'
import { normalizeVehiclePlate, validVehiclePlate } from './account'

const vehicleFields = ['vehicle_color', 'vehicle_plate', 'vehicle_brand', 'vehicle_model']
const roleName = { owner:'Proprietário', manager:'Gerência', staff:'Equipe', customer:'Cliente', motoboy:'Motoboy' }

export function PasswordChangeForm({ disabled = false }) {
  const [password,setPassword] = useState('')
  const [confirm,setConfirm] = useState('')
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')
  const save = async event => {
    event.preventDefault()
    setError('');setMessage('')
    if (disabled || !supabase) { setError('A senha só pode ser alterada na conta conectada.'); return }
    if (password.length < 8) { setError('Use pelo menos 8 caracteres.'); return }
    if (password !== confirm) { setError('As senhas digitadas não são iguais.'); return }
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) { setError('Não foi possível alterar a senha: ' + updateError.message); return }
    setPassword('');setConfirm('');setMessage('Senha alterada na sua conta.')
  }
  return <form className="account-section" onSubmit={save}>
    <div className="account-section-heading"><ShieldCheck size={19}/><div><h3>Alterar senha</h3><p>Use uma senha nova com pelo menos 8 caracteres.</p></div></div>
    <div className="settings-two"><label className="field-label">Nova senha<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={event=>setPassword(event.target.value)} disabled={disabled||busy}/></label><label className="field-label">Confirmar nova senha<input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={event=>setConfirm(event.target.value)} disabled={disabled||busy}/></label></div>
    {error&&<p className="account-error" role="alert">{error}</p>}{message&&<p className="account-success" role="status">{message}</p>}
    <button className="button button-secondary" disabled={disabled||busy||!password||!confirm}>{busy?'Salvando…':'Atualizar senha'}</button>
  </form>
}

export default function AccountSettings({ user, role, driverProfile, onDriverSaved, onSignOut, demo = false }) {
  const [name,setName] = useState(user?.user_metadata?.full_name || driverProfile?.full_name || '')
  const [phone,setPhone] = useState('')
  const [email,setEmail] = useState(user?.email || '')
  const [vehicle,setVehicle] = useState({ vehicle_color:'',vehicle_plate:'',vehicle_brand:'',vehicle_model:'' })
  const [busy,setBusy] = useState(false)
  const [loading,setLoading] = useState(!demo)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const isRider = role === 'motoboy'

  useEffect(()=>{
    if (!user?.id) return
    if (demo || !supabase) { setName(driverProfile?.full_name || user.user_metadata?.full_name || '');setLoading(false);return }
    let alive = true
    Promise.all([
      supabase.from('lusky_profiles').select('full_name,phone').eq('id',user.id).maybeSingle(),
      isRider ? supabase.from('lusky_motoboy_profiles').select('full_name,vehicle_color,vehicle_plate,vehicle_brand,vehicle_model').eq('id',user.id).maybeSingle() : Promise.resolve({data:null,error:null}),
    ]).then(([profile,rider])=>{
      if (!alive) return
      setLoading(false)
      if (profile.error || rider.error) { setError('Não foi possível carregar todos os dados da conta.'); return }
      setName(rider.data?.full_name || profile.data?.full_name || user.user_metadata?.full_name || '')
      setPhone(profile.data?.phone || '')
      setEmail(user.email || '')
      if (rider.data) setVehicle(Object.fromEntries(vehicleFields.map(field=>[field,rider.data[field] || ''])))
    }).catch(()=>{if(alive){setLoading(false);setError('Não foi possível carregar os dados da conta.')}})
    return()=>{alive=false}
  },[user?.id,isRider,demo])

  const save = async event => {
    event.preventDefault()
    setError('');setMessage('')
    if (demo || !supabase) { setError('A conta de demonstração não salva alterações.'); return }
    const cleanName = name.trim()
    const cleanPhone = digits(phone)
    if (cleanName.length < 3 || cleanName.length > 120) { setError('Informe seu nome completo, de 3 a 120 caracteres.'); return }
    if (cleanPhone && cleanPhone.length !== 11) { setError('Confira o celular com DDD ou deixe o campo vazio.'); return }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError('Informe um e-mail válido.'); return }
    const cleanVehicle = Object.fromEntries(vehicleFields.map(field=>[field,String(vehicle[field] || '').trim()]))
    cleanVehicle.vehicle_plate = normalizeVehiclePlate(cleanVehicle.vehicle_plate)
    if (isRider && (cleanVehicle.vehicle_color.length < 2 || cleanVehicle.vehicle_brand.length < 2 || !cleanVehicle.vehicle_model || !validVehiclePlate(cleanVehicle.vehicle_plate))) {
      setError('Confira cor, marca, modelo e placa no formato ABC1D23.');return
    }
    setBusy(true)
    const { error: profileError } = await supabase.from('lusky_profiles').update({ full_name:cleanName, display_name:cleanName, phone:cleanPhone }).eq('id',user.id)
    if (profileError) { setBusy(false);setError('Não foi possível salvar os dados pessoais: '+profileError.message);return }
    if (isRider) {
      const { data, error: vehicleError } = await supabase.from('lusky_motoboy_profiles').update({ full_name:cleanName, ...cleanVehicle }).eq('id',user.id).select('id,full_name,vehicle_color,vehicle_plate,vehicle_brand,vehicle_model').single()
      if (vehicleError) { setBusy(false);setError('Dados pessoais salvos, mas o veículo não foi atualizado: '+vehicleError.message);return }
      setVehicle(Object.fromEntries(vehicleFields.map(field=>[field,data[field]])))
      onDriverSaved?.(data)
    }
    if (email.trim().toLowerCase() !== user.email?.toLowerCase()) {
      const { error: emailError } = await supabase.auth.updateUser({ email:email.trim() })
      if (emailError) { setBusy(false);setError('Dados salvos, mas o e-mail não foi alterado: '+emailError.message);return }
      setMessage('Dados salvos. Confirme a mudança pelo e-mail enviado.')
    } else setMessage('Informações da conta salvas.')
    setBusy(false)
  }

  return <section className="account-page" id="minha-conta">
    <div className="section-heading"><div><h1>Minha conta</h1><p>Veja e atualize as informações da conta conectada.</p></div></div>
    <div className="account-card panel"><div className="account-identity"><span className="account-avatar"><UserRound size={24}/></span><div><b>{name || user?.email || 'Usuário'}</b><span>{email}</span><small>{roleName[role] || 'Equipe'}{isRider&&driverProfile?.driver_code?` · ${driverProfile.driver_code}`:''}</small></div></div>
      {loading?<p role="status">Carregando conta…</p>:<><form className="account-section" onSubmit={save}>
        <div className="account-section-heading"><UserRound size={19}/><div><h3>Dados pessoais</h3><p>As mudanças salvas aparecem na sua conta.</p></div></div>
        <div className="settings-two"><label className="field-label">Nome completo<input autoComplete="name" maxLength={120} value={name} onChange={event=>setName(event.target.value)} disabled={busy||demo}/></label><label className="field-label">Celular com DDD<input inputMode="tel" autoComplete="tel" value={maskPhone(phone)} onChange={event=>setPhone(digits(event.target.value).slice(0,11))} disabled={busy||demo}/></label></div>
        <label className="field-label">E-mail da conta<input type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} disabled={busy||demo}/></label>
        {isRider&&<div className="account-vehicle"><div className="account-section-heading"><Bike size={19}/><div><h3>Meu veículo</h3><p>Atualize os dados quando trocar de moto ou placa.</p></div></div><div className="settings-two"><label className="field-label">Cor<input value={vehicle.vehicle_color} onChange={event=>setVehicle(current=>({...current,vehicle_color:event.target.value}))} disabled={busy||demo}/></label><label className="field-label">Placa<input maxLength={7} value={vehicle.vehicle_plate} onChange={event=>setVehicle(current=>({...current,vehicle_plate:event.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'')}))} disabled={busy||demo} placeholder="ABC1D23"/></label></div><div className="settings-two"><label className="field-label">Marca<input value={vehicle.vehicle_brand} onChange={event=>setVehicle(current=>({...current,vehicle_brand:event.target.value}))} disabled={busy||demo}/></label><label className="field-label">Modelo<input value={vehicle.vehicle_model} onChange={event=>setVehicle(current=>({...current,vehicle_model:event.target.value}))} disabled={busy||demo}/></label></div></div>}
        {error&&<p className="account-error" role="alert">{error}</p>}{message&&<p className="account-success" role="status">{message}</p>}
        <button className="button button-dark" disabled={busy||demo}>{busy?'Salvando…':'Salvar informações'}</button>
      </form><PasswordChangeForm disabled={demo}/></>}
      <div className="account-exit"><span>Terminou por aqui? Encerre a sessão neste aparelho.</span><button className="button button-secondary" type="button" onClick={onSignOut}><LogOut size={16}/> Sair da conta</button></div>
    </div>
  </section>
}
