import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { roadRoutePoints, validMapPoint } from './delivery'

const tileUrl = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const icon = (symbol, color) => L.divIcon({ className: 'lusky-map-marker', html: `<span style="background:${color}">${symbol}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] })
const kitchenIcon = icon('⌂', '#ffc21a')
const destinationIcon = icon('●', '#f0472b')
const riderIcon = icon('➤', '#15120f')

function MapFocus({ points }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 16)
    if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 16 })
  }, [map, JSON.stringify(points)])
  return null
}

function PickClick({ onPick }) {
  useMapEvents({ click: event => onPick({ latitude: event.latlng.lat, longitude: event.latlng.lng }) })
  return null
}

export function PinPicker({ point, onPick }) {
  if (point?.latitude == null || point?.longitude == null) return <div className="map-unavailable">Busque o endereço completo para posicionar o pino.</div>
  const center = [Number(point.latitude), Number(point.longitude)]
  if (!center.every(Number.isFinite)) return <div className="map-unavailable">Busque o endereço completo para posicionar o pino.</div>
  return <div className="delivery-map"><MapContainer center={center} zoom={16} scrollWheelZoom={false} className="leaflet-canvas">
    <TileLayer url={tileUrl} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
    <MapFocus points={[center]} /><PickClick onPick={onPick} />
    <Marker position={center} icon={destinationIcon} />
  </MapContainer></div>
}

export default function DeliveryMap({ restaurant, destination, rider, route, routeLabel = 'Retirada → entrega' }) {
  const points = [restaurant, destination, rider].filter(validMapPoint).map(point => [Number(point.latitude), Number(point.longitude)])
  if (!points.length) return <div className="map-unavailable">Este pedido ainda não tem pinos confirmados. Configure a retirada no ADM e confirme o destino no cadastro do pedido.</div>
  const line = roadRoutePoints(route?.geometry)
  const publicRoute = route?.profile?.startsWith('osrm-')
  return <div className="delivery-map"><MapContainer center={points[0]} zoom={14} scrollWheelZoom={false} className="leaflet-canvas">
    <TileLayer url={tileUrl} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
    <MapFocus points={[...points, ...line]} />
    {validMapPoint(restaurant) && <Marker position={[Number(restaurant.latitude), Number(restaurant.longitude)]} icon={kitchenIcon} />}
    {validMapPoint(destination) && <Marker position={[Number(destination.latitude), Number(destination.longitude)]} icon={destinationIcon} />}
    {validMapPoint(rider) && <Marker position={[Number(rider.latitude), Number(rider.longitude)]} icon={riderIcon} />}
    {line.length > 1 && <><Polyline positions={line} pathOptions={{ color: '#15120f', weight: 9, opacity: .9 }} /><Polyline positions={line} pathOptions={{ color: '#ffc21a', weight: 5, opacity: 1, dashArray: '12 10' }} /></>}
  </MapContainer><div className="map-legend">{line.length>1?<><span className="map-legend-dash"/> {routeLabel} · rota pelas vias{publicRoute&&<small className="map-route-provider">Perfil carro · trajeto mais rápido estimado</small>}</>:'Rota pelas vias indisponível; os pinos continuam visíveis.'}{publicRoute&&<small className="map-route-provider"><a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer">Roteamento FOSSGIS/OSRM</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Corrigir mapa</a></small>}</div></div>
}

