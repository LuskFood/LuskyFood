export const digits = value => String(value || '').replace(/\D/g, '')
export const maskCep = value => digits(value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
export const maskPhone = value => digits(value).slice(0, 11).replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
export const maskCpf = value => digits(value).slice(0, 11).replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})(\d{1,2})$/, '$1-$2')

export const emptyAddress = { label: 'Casa', zip_code: '', street: '', street_number: '', no_number: false, complement: '', district: '', city: '', state: '', reference: '', instructions: '', latitude: null, longitude: null, pin_confirmed: false }

const locationFields = new Set(['street', 'street_number', 'no_number', 'district', 'city', 'state', 'zip_code'])

export const addressLocationKey = address => JSON.stringify([...locationFields].map(field => address?.[field] ?? null))

export function validMapPoint(point) {
  return point?.latitude !== null && point?.latitude !== undefined && point?.latitude !== '' &&
    point?.longitude !== null && point?.longitude !== undefined && point?.longitude !== '' &&
    Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude)) &&
    Math.abs(Number(point.latitude)) <= 90 && Math.abs(Number(point.longitude)) <= 180
}

// GeoJSON uses longitude, latitude; Leaflet expects latitude, longitude.
export function roadRoutePoints(geometry) {
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) return []
  if (!geometry.coordinates.every(point => Array.isArray(point) && point.length >= 2 &&
    typeof point[0] === 'number' && typeof point[1] === 'number' &&
    Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)) return []
  return geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude])
}

export function validRoadRoute(route) {
  return roadRoutePoints(route?.geometry).length >= 2 && Number.isFinite(route?.distance_m) && route.distance_m >= 0 && Number.isFinite(route?.duration_s) && route.duration_s >= 0
}

export function updateAddressField(address, field, value) {
  if (address[field] === value) return address
  const next = { ...address, [field]: value }
  return locationFields.has(field)
    ? { ...next, latitude: null, longitude: null, pin_confirmed: false }
    : next
}

export function addressIsComplete(address) {
  return Boolean(digits(address.zip_code).length === 8 && address.street.trim().length >= 2 &&
    (address.no_number || address.street_number.trim()) && address.district.trim() &&
    address.city.trim().length >= 2 && /^[A-Z]{2}$/.test(address.state) &&
    validMapPoint(address) && address.pin_confirmed)
}

export function distanceKm(a, b) {
  if (!validMapPoint(a) || !validMapPoint(b)) return null
  const rad = value => Number(value) * Math.PI / 180
  const dLat = rad(Number(b.latitude) - Number(a.latitude))
  const dLon = rad(Number(b.longitude) - Number(a.longitude))
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

let publicRoadQueue = Promise.resolve()
let nextPublicRoadRequestAt = 0
const publicRoadCache = new Map()

// Demo pins are synthetic. Query only the two coordinates needed for their road geometry.
export function requestDemoRoadRoute(origin, destination) {
  if (!validMapPoint(origin) || !validMapPoint(destination)) return Promise.reject(new Error('Confirme os pinos de retirada e entrega para calcular a rota.'))
  const start = [Number(origin.longitude), Number(origin.latitude)]
  const end = [Number(destination.longitude), Number(destination.latitude)]
  const key = `${start.join(',')};${end.join(',')}`
  const cached = publicRoadCache.get(key)
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.value)
  const task = publicRoadQueue.then(async () => {
    const wait = Math.max(0, nextPublicRoadRequestAt - Date.now())
    if (wait) await new Promise(resolve => setTimeout(resolve, wait))
    nextPublicRoadRequestAt = Date.now() + 1_000
    const points = `${start.join(',')};${end.join(',')}`
    const url = `https://routing.openstreetmap.de/routed-car/route/v1/driving/${points}?overview=full&geometries=geojson&steps=false`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8_000)
    try {
      const response = await fetch(url, { headers:{ Accept:'application/json' }, signal:controller.signal })
      if (!response.ok) throw new Error('O FOSSGIS/OSRM não conseguiu calcular esta rota. Tente novamente em instantes.')
      const data = await response.json()
      const route = data.routes?.[0]
      const value = { geometry:route?.geometry, distance_m:route?.distance, duration_s:route?.duration, calculated_at:new Date().toISOString(), profile:'osrm-car-fastest-demo' }
      if (data.code !== 'Ok' || !validRoadRoute(value)) throw new Error('O FOSSGIS/OSRM não encontrou uma rota pelas ruas entre estes pinos.')
      if (publicRoadCache.size > 100) publicRoadCache.clear()
      publicRoadCache.set(key, { value, expires:Date.now() + 600_000 })
      return value
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('O cálculo da rota demorou a responder. Tente novamente.')
      if (error instanceof TypeError) throw new Error('Não foi possível acessar o FOSSGIS/OSRM deste navegador. Verifique a conexão e tente novamente.')
      throw error
    } finally { clearTimeout(timeout) }
  })
  publicRoadQueue = task.then(() => undefined, () => undefined)
  return task
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
  let response
  try { response = await client.functions.invoke('lusky-maps', { body }) }
  catch { throw new Error('Serviço de mapa indisponível. Verifique sua conexão e tente novamente.') }
  const { data, error } = response
  if (error) {
    let message = 'Serviço de mapa indisponível. Tente novamente.'
    try { const detail = await error.context?.json?.(); if (detail?.error) message = detail.error } catch { /* network failure */ }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

