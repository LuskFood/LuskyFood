const zonedDay = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
const zonedHour = value => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' }).format(new Date(value)))
const delivered = order => order.status === 'Entregue'
const amount = order => Number(order.total) || 0

export function summarizeOrders(orders, days = 7, now = new Date()) {
  const cutoff = now.getTime() - days * 86400000
  const period = orders.filter(order => order.created_at && Number.isFinite(Date.parse(order.created_at)) && (days === 0 || Date.parse(order.created_at) >= cutoff) && Date.parse(order.created_at) <= now.getTime())
  const done = period.filter(delivered)
  const dayKeys = Array.from({ length: days }, (_, index) => zonedDay(new Date(now.getTime() - (days - index - 1) * 86400000)))
  const daily = dayKeys.map(day => ({ day, revenue: 0, received: 0, delivered: 0 }))
  const byDay = new Map(daily.map(item => [item.day, item]))
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0, received: 0, delivered: 0 }))
  const dishes = new Map()
  const types = new Map()
  const statuses = new Map()
  for (const order of period) {
    const row = byDay.get(zonedDay(order.created_at))
    if (row) row.received++
    hourly[zonedHour(order.created_at)].received++
    types.set(order.type || 'Outro', (types.get(order.type || 'Outro') || 0) + 1)
    statuses.set(order.status || 'Outro', (statuses.get(order.status || 'Outro') || 0) + 1)
    if (!delivered(order)) continue
    if (row) { row.delivered++; row.revenue += amount(order) }
    hourly[zonedHour(order.created_at)].revenue += amount(order)
    hourly[zonedHour(order.created_at)].delivered++
    for (const item of order.items || []) {
      const key = String(item.name || 'Prato')
      const dish = dishes.get(key) || { name: key, quantity: 0, revenue: 0, priced: true }
      dish.quantity += Number(item.quantity) || 0
      if (item.unit_price == null) dish.priced = false
      else dish.revenue += Number(item.unit_price) * (Number(item.quantity) || 0)
      dishes.set(key, dish)
    }
  }
  const revenue = done.reduce((sum, order) => sum + amount(order), 0)
  return {
    period, done, revenue, ticket: done.length ? revenue / done.length : 0,
    daily, hourly,
    dishes: [...dishes.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)),
    types: [...types].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    statuses: [...statuses].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  }
}

// Calendar views keep every slot visible, including dates with no orders.
export function summarizeCalendar(orders, view = 'week', now = new Date()) {
  const currentDay = zonedDay(now)
  const currentYear = Number(currentDay.slice(0, 4))
  const firstYear = Math.min(currentYear, ...orders.map(order => Number(zonedDay(order.created_at || now).slice(0, 4))).filter(Number.isFinite))
  const keys = view === 'month'
    ? Array.from({ length: 12 }, (_, index) => `${currentYear}-${String(index + 1).padStart(2, '0')}`)
    : view === 'year'
      ? Array.from({ length: currentYear - firstYear + 1 }, (_, index) => String(firstYear + index))
      : Array.from({ length: 7 }, (_, index) => zonedDay(new Date(now.getTime() - (6 - index) * 86400000)))
  const keyFor = value => { const day = zonedDay(value); return view === 'month' ? day.slice(0, 7) : view === 'year' ? day.slice(0, 4) : day }
  const buckets = keys.map(key => ({ key, label: view === 'month' ? new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' }).format(new Date(`${key}-01T12:00:00Z`)).replace('.', '') : view === 'year' ? key : `${key.slice(8, 10)}/${key.slice(5, 7)}`, revenue: 0, received: 0, delivered: 0 }))
  const byKey = new Map(buckets.map(bucket => [bucket.key, bucket]))
  const period = orders.filter(order => order.created_at && Number.isFinite(Date.parse(order.created_at)) && Date.parse(order.created_at) <= now.getTime() && byKey.has(keyFor(order.created_at)))
  for (const order of period) {
    const bucket = byKey.get(keyFor(order.created_at))
    bucket.received++
    if (delivered(order)) { bucket.delivered++; bucket.revenue += amount(order) }
  }
  const base = summarizeOrders(period, 0, now)
  return { ...base, period, done: period.filter(delivered), buckets, revenue: buckets.reduce((sum, bucket) => sum + bucket.revenue, 0), ticket: base.ticket }
}
