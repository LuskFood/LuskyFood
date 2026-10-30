import React, { useState } from 'react'
import { X } from 'lucide-react'

export default function ProductEditor({ product, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    id: product?.id || `p-${Date.now()}`,
    name: product?.name || '', category: product?.category || '', price: product?.price ?? '',
    description: product?.description || '', icon: product?.icon || 'fork',
    image_url: product?.image_url || '', color: product?.color || 'peach',
    available: product?.available ?? true, sold: product?.sold || 0,
  }))
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(product?.image_url || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const submit = async event => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const saved = await onSave({ ...form, price: Number(form.price), imageFile })
      if (saved) onClose()
      else setError('O prato não foi salvo. Confira a conexão e tente novamente.')
    } catch (cause) { setError(cause.message || 'Não foi possível salvar o prato.') }
    finally { setBusy(false) }
  }
  return <div className="modal-backdrop" onClick={() => !busy && onClose()}><form className="modal-card" onSubmit={submit} onClick={event => event.stopPropagation()}>
    <div className="modal-heading"><div><h2>{product ? 'Editar prato' : 'Adicionar prato'}</h2><p>Os dados só aparecem no cardápio depois da confirmação do banco.</p></div><button type="button" className="icon-button" disabled={busy} aria-label="Fechar" onClick={onClose}><X size={18}/></button></div>
    <label className="field-label">Nome do prato<input autoFocus required minLength={2} value={form.name} onChange={event => update('name', event.target.value)}/></label>
    <div className="settings-two"><label className="field-label">Categoria<input required value={form.category} onChange={event => update('category', event.target.value)}/></label><label className="field-label">Preço (R$)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={event => update('price', event.target.value)}/></label></div>
    <label className="field-label">Descrição<input value={form.description} onChange={event => update('description', event.target.value)}/></label>
    <label className="field-label">Foto do prato<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); setImageFile(file); setPreview(URL.createObjectURL(file)) } }}/></label>
    {preview && <img className="product-editor-preview" src={preview} alt="Prévia do prato"/>}
    <label className="address-check"><input type="checkbox" checked={form.available} onChange={event => update('available', event.target.checked)}/> Disponível no cardápio</label>
    {error && <p className="checkout-error" role="alert">{error}</p>}
    <div className="modal-footer"><button type="button" className="button button-secondary" disabled={busy} onClick={onClose}>Cancelar</button><button className="button button-dark" disabled={busy}>{busy ? 'Salvando…' : 'Salvar prato'}</button></div>
  </form></div>
}
