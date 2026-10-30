import React, { useState } from 'react'
import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import DeliveryAddress from './DeliveryAddress'
import { addressIsComplete, digits, distanceKm, emptyAddress, maskPhone } from './delivery'
import { supabase } from './supabase'

const money = value => Number(value || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })

export default function AdminOrderModal({ products, restaurant, onClose, onSave }) {
  const [name,setName]=useState('')
  const [phone,setPhone]=useState('')
  const [type,setType]=useState('Retirada')
  const [address,setAddress]=useState(emptyAddress)
  const [cart,setCart]=useState({})
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [requestId,setRequestId]=useState(() => crypto.randomUUID())
  const [payment,setPayment]=useState(() => restaurant?.accepts_cash === false && restaurant?.accepts_manual_pix ? 'manual_pix' : 'cash')
  const subtotal=products.reduce((sum,product)=>sum+Number(product.price)*(cart[product.id]||0),0)
  const fee=type==='Entrega'?Number(restaurant?.delivery_fee||0):0
  const distance=distanceKm(restaurant,address)
  const covered=distance!=null&&restaurant?.delivery_radius_km!=null&&distance<=Number(restaurant.delivery_radius_km)
  const paymentEnabled=payment==='cash'?restaurant?.accepts_cash!==false:restaurant?.accepts_manual_pix===true
  const canSubmit=name.trim().length>=3 && subtotal>0 && paymentEnabled && (type!=='Entrega'||(digits(phone).length===11&&addressIsComplete(address)&&covered))
  const change=(id,amount)=>setCart(current=>({...current,[id]:Math.max(0,(current[id]||0)+amount)}))
  const submit=async()=>{
    if(busy||!canSubmit)return
    setBusy(true);setError('')
    const result=await onSave({request_id:requestId,name:name.trim(),phone:digits(phone),type,address:type==='Entrega'?{...address,zip_code:digits(address.zip_code)}:null,payment_method:payment,items:products.filter(product=>cart[product.id]).map(product=>({product_id:product.id,quantity:cart[product.id]}))})
    setBusy(false)
    if(!result?.ok)setError(result?.error||'Pedido não confirmado. Confira os dados e tente novamente.')
    else setRequestId(crypto.randomUUID())
  }
  return <div className="modal-backdrop" onClick={() => !busy && onClose()}><section className="modal-card order-modal" onClick={event=>event.stopPropagation()}><div className="modal-heading"><div><ShoppingBag size={18}/><h2>Novo pedido</h2></div><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Fechar"><X size={18}/></button></div>
    <label className="field-label">Nome do cliente<input autoFocus value={name} onChange={event=>setName(event.target.value)} placeholder="Nome completo"/></label><div className="order-type-tabs">{['Retirada','Entrega','Salão'].map(option=><button key={option} className={type===option?'selected':''} onClick={()=>setType(option)}>{option}</button>)}</div>
    {type==='Entrega'&&<><p className="manual-pix-note">Pedidos de entrega criados pela equipe não ficam vinculados automaticamente à conta do cliente; por enquanto, peça ao cliente que faça o pedido na própria conta para receber o código de entrega.</p><label className="field-label">Celular com DDD<input value={maskPhone(phone)} onChange={event=>setPhone(digits(event.target.value).slice(0,11))} inputMode="tel" placeholder="(11) 99999-9999"/></label><DeliveryAddress value={address} onChange={setAddress} restaurant={restaurant} client={supabase}/></>}
    <div className="order-product-list">{products.filter(product=>product.available).map(product=><div className="order-product" key={product.id}><span><b>{product.name}</b><small>{money(product.price)}</small></span><div className="qty-control"><button onClick={()=>change(product.id,-1)} disabled={!cart[product.id]}><Minus size={12}/></button><b>{cart[product.id]||0}</b><button onClick={()=>change(product.id,1)}><Plus size={12}/></button></div></div>)}</div>
    <label className="field-label">Pagamento<select value={payment} onChange={event=>setPayment(event.target.value)}>{restaurant?.accepts_cash!==false&&<option value="cash">Na entrega ou retirada</option>}{restaurant?.accepts_manual_pix&&<option value="manual_pix">Pix manual, sujeito à conferência</option>}</select></label>
    {payment==='manual_pix'&&<div className="manual-pix-note"><b>Informe ao cliente como fazer o Pix</b><p>{restaurant?.manual_pix_instructions}</p><small>O preparo só começa após a equipe conferir e confirmar o pagamento no pedido.</small></div>}
    <div className="order-total"><span>Pratos {money(subtotal)}{type==='Entrega'&&` · entrega ${money(fee)}`}</span><b>{money(subtotal+fee)}</b></div>{error&&<p className="checkout-error" role="alert">{error}</p>}<button className="button button-dark order-submit" disabled={!canSubmit||busy} onClick={submit}>{busy?'Confirmando…':'Criar pedido'}</button>
  </section></div>
}
