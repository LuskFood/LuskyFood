import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeOrders } from '../src/analytics.js'

test('reports count all received orders but only delivered revenue and dishes', () => {
  const now = new Date('2026-10-30T15:00:00Z')
  const orders = [
    { created_at: '2026-10-30T14:00:00Z', status: 'Entregue', type: 'Entrega', total: 58, items: [{ name: 'Yakisoba', quantity: 1, unit_price: 50 }] },
    { created_at: '2026-10-30T13:00:00Z', status: 'Preparando', type: 'Retirada', total: 90, items: [{ name: 'Sobá', quantity: 2, unit_price: 45 }] },
    { created_at: '2026-10-20T13:00:00Z', status: 'Entregue', type: 'Entrega', total: 40, items: [{ name: 'Antigo', quantity: 1, unit_price: 40 }] },
  ]
  const result = summarizeOrders(orders, 7, now)
  assert.equal(result.period.length, 2)
  assert.equal(result.done.length, 1)
  assert.equal(result.revenue, 58)
  assert.equal(result.ticket, 58)
  assert.deepEqual(result.dishes.map(item => [item.name, item.quantity, item.revenue]), [['Yakisoba', 1, 50]])
  assert.equal(result.daily.at(-1).received, 2)
  assert.equal(result.daily.at(-1).delivered, 1)
})
