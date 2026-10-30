import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

export default function DeliveryMap({ restaurant, destination, rider, route }) {
  const points = [restaurant, destination, rider].filter(point => point && point.latitude != null && point.longitude != null && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))).map(point => [Number(point.latitude), Number(point.longitude)])
  if (!points.length) return <div className="map-unavailable">Este pedido ainda não tem pinos confirmados. Configure a retirada no ADM e confirme o destino no cadastro do pedido.</div>
  const line = route?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || []
  const endpoints = [restaurant, destination].filter(point => point && Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))).map(point => [Number(point.latitude), Number(point.longitude)])
  return <div className="delivery-map"><MapContainer center={points[0]} zoom={14} scrollWheelZoom={false} className="leaflet-canvas">
    <TileLayer url={tileUrl} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
    <MapFocus points={points} />
    {restaurant && <Marker position={[restaurant.latitude, restaurant.longitude]} icon={kitchenIcon} />}
    {destination && <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon} />}
    {rider && <Marker position={[rider.latitude, rider.longitude]} icon={riderIcon} />}
    {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#f0472b', weight: 5 }} />}
    {endpoints.length === 2 && <Polyline positions={endpoints} pathOptions={{ color: '#17130d', weight: 4, opacity: .8, dashArray: '9 12' }} />}
  </MapContainer>{endpoints.length===2&&<div className="map-legend"><span className="map-legend-dash"/> Retirada → entrega · linha reta de referência{line.length>1&&' (rota por vias em laranja)'}</div>}</div>
}
