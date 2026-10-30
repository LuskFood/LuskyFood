export const digits = value => String(value || '').replace(/\D/g, '')
export const maskCep = value => digits(value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
export const maskPhone = value => digits(value).slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
export const maskCpf = value => digits(value).slice(0, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, '$1-$2')

export const emptyAddress = { label: 'Casa', zip_code: '', street: '', street_number: '', no_number: false, complement: '', district: '', city: '', state: '', reference: '', instructions: '', latitude: null, longitude: null, pin_confirmed: false }

export function addressIsComplete(address) {
  return Boolean(digits(address.zip_code).length === 8 && address.street.trim().length >= 2 &&
    (address.no_number || address.street_number.trim()) && address.district.trim() &&
    address.city.trim().length >= 2 && /^[A-Z]{2}$/.test(address.state) &&
    address.latitude != null && address.longitude != null &&
    Number.isFinite(Number(address.latitude)) && Number.isFinite(Number(address.longitude)) && address.pin_confirmed)
}

export function distanceKm(a, b) {
  if (![a?.latitude, a?.longitude, b?.latitude, b?.longitude].every(value => value !== null && value !== undefined && Number.isFinite(Number(value)))) return null
  const rad = value => Number(value) * Math.PI / 180
  const dLat = rad(Number(b.latitude) - Number(a.latitude))
  const dLon = rad(Number(b.longitude) - Number(a.longitude))
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export async function lookupCep(value, signal) {
  const cep = digits(value)
  if (cep.length !== 8) throw new Error('Digite os 8 números do CEP.')
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal })
  if (!response.ok) throw new Error('O serviço de CEP está indisponível. Preencha o endereço manualmente.')
  const data = await response.json()
  if (data.erro) throw new Error('CEP não encontrado. Confira os números ou preencha manualmente.')
  return { street: data.logradouro || '', district: data.bairro || '', city: data.localidade || '', state: data.uf || '' }
}

export async function mapRequest(client, body) {
  const { data, error } = await client.functions.invoke('lusky-maps', { body })
  if (error) {
    let message = 'Serviço de mapa indisponível. Tente novamente.'
    try { const detail = await error.context?.json?.(); if (detail?.error) message = detail.error } catch { /* network failure */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}
