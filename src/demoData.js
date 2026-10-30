// Exemplos locais para explorar a interface. Nenhum destes pontos pertence a um pedido real.
export const demoRestaurant = {
  name: 'Lusky Food · demonstração', zip_code: '05797430', street: 'Rua Otusco',
  street_number: '196', district: 'Capão Redondo', city: 'São Paulo', state: 'SP',
  // Centro aproximado do CEP, usado somente na demonstração; confirme o número 196 no painel real.
  latitude: -23.65683, longitude: -46.77382, delivery_radius_km: 12,
  delivery_fee: 8, accepts_cash: true, accepts_manual_pix: false,
}

export const demoDrivers = [
  { id: 'demo-motoboy', full_name: 'Rafael Almeida', driver_code: 'MB-001', active: true, document_valid: true, vehicle_brand: 'Honda', vehicle_model: 'CG 160', vehicle_color: 'Preta', vehicle_plate: 'ABC1D23' },
  { id: 'demo-motoboy-2', full_name: 'Bruna Santos', driver_code: 'MB-002', active: true, document_valid: true, vehicle_brand: 'Yamaha', vehicle_model: 'Factor 150', vehicle_color: 'Vermelha', vehicle_plate: 'DEF4G56' },
]

const point = [
  null,
  [-23.6524, -46.7688],
  [-23.6617, -46.7678],
  [-23.6590, -46.7795],
  [-23.6458, -46.7812],
  [-23.6638, -46.7864],
]

export function enrichDemoOrders(orders) {
  const now = Date.now()
  return orders.map((order, index) => ({
    ...order,
    created_at: order.created_at || new Date(now - (index + 1) * 32 * 60000).toISOString(),
    customer_phone: order.customer_phone || `1190000000${index}`,
    delivery_latitude: order.delivery_latitude ?? point[index + 1]?.[0] ?? null,
    delivery_longitude: order.delivery_longitude ?? point[index + 1]?.[1] ?? null,
    assigned_driver: order.assigned_driver || (order.type === 'Entrega' && index < 4 ? (index === 2 ? demoDrivers[1] : demoDrivers[0]).id : null),
    localCustomer: order.localCustomer || (index === 3 ? 'customer@luskyfood.local' : null),
    demo_position: index === 3 ? { latitude: -23.6581, longitude: -46.7751, observed_at: new Date(now).toISOString(), accuracy_m: 25 } : null,
  }))
}
