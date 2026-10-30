import React, { useEffect, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CalendarDays,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3,
  CreditCard, Ellipsis, BarChart3, Flame, LayoutDashboard,
  ListFilter, Menu, MoreHorizontal, Plus, Search,
  Settings2, ShoppingBag, SlidersHorizontal, Sparkles, UtensilsCrossed, Wallet,
  X, CircleDollarSign, CheckCircle2, CircleAlert, EyeOff, Copy, FileCheck2,
  Minus, Tag, Users, Bike, Eye,
  MapPin, Navigation, PackageCheck, ClipboardCheck, Clock,
  UserPlus, Pencil, KeyRound, UserCheck, UserX, Trash2, ShieldCheck, UserRound, LogOut,
} from 'lucide-react'
import { supabase } from './supabase'
import CustomerPortalV2 from './CustomerPortal'
import RiderPortalV2 from './RiderPortal'
import AdminOrderModal from './AdminOrderModal'
import ProductEditor from './ProductEditor'
import RestaurantSettings from './RestaurantSettings'
import AccountSettings from './AccountSettings'
import { OverviewPage, OrdersPage as OpsOrdersPage, CustomersPage as OpsCustomersPage, ReportsPage as OpsReportsPage } from './OperationsPages'
import { digits, maskCpf, maskPhone } from './delivery'
import { validVehiclePlate } from './account'
import { demoDrivers, demoRestaurant, enrichDemoOrders } from './demoData'

const initialProducts = [
  { id: 'p-frango', name: 'Frango Xadrez', category: 'Pratos principais', price: 50, description: 'Frango suculento, legumes crocantes e molho especial, acompanhado de arroz.', icon: 'flame', image_url: '/images/frango-xadrez.jpg', color: 'peach', available: true, sold: 32 },
  { id: 'p-soba', name: 'Sobá', category: 'Pratos principais', price: 45, description: 'Macarrão dourado com carne, cebolinha e o sabor acolhedor do caldo da casa.', icon: 'bowl', image_url: '/images/soba.jpg', color: 'sage', available: true, sold: 24 },
  { id: 'p-yakisoba', name: 'Yakisoba', category: 'Pratos principais', price: 50, description: 'Carne macia e legumes frescos envolvidos no molho especial da casa.', icon: 'fork', image_url: '/images/yakisoba.jpg', color: 'cream', available: true, sold: 21 },
  { id: 'p-kibe', name: 'Kibe Cru', category: 'Pratos principais', price: 50, description: 'Kibe cru servido com hortelã, pão sírio, cebola, limão e acompanhamentos.', icon: 'sparkle', image_url: '/images/kibe-cru.jpg', color: 'butter', available: true, sold: 19 },
]

const legacyProductNames = ['Lusky Smash Burger','Bowl Miso Crispy','Truffle Parmesan Fries','Pasta al Limone','Tarta Basca','Limonada de Hibisco','Chicken Pesto Melt','Cookie de Chocolate']
const readProducts = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(productKey) || '[]')
    const keep = Array.isArray(stored) ? stored.filter(item => !legacyProductNames.includes(item.name)) : []
    const names = new Set(keep.map(item => item.name))
    return [...initialProducts.filter(item => !names.has(item.name)), ...keep]
  } catch { return initialProducts }
}
const readOrders = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(orderKey) || '[]')
    if (!Array.isArray(stored) || stored.some(order => order.items?.some(item => legacyProductNames.includes(item.name)))) return enrichDemoOrders(initialOrders)
    const samples = enrichDemoOrders(initialOrders)
    return [...stored.map(order => { const sample=samples.find(item=>item.id===order.id); return sample?{...sample,...order,created_at:sample.created_at,delivery_latitude:sample.delivery_latitude,delivery_longitude:sample.delivery_longitude,assigned_driver:sample.assigned_driver,localCustomer:sample.localCustomer,demo_position:sample.demo_position,address:sample.address}:order }), ...samples.filter(sample => !stored.some(order => order.id === sample.id))]
  } catch { return enrichDemoOrders(initialOrders) }
}

const initialOrders = [
  { id: 'LF-2841', name: 'Marina Costa', initials: 'MC', type: 'Retirada', items: [{ name: 'Frango Xadrez', quantity: 2 }], total: 100, status: 'Preparando', time: '12:42', ago: 'há 8 min', color: 'rose', address: 'Retirada no balcão', pickup_code: '4182', delivery_code: '—' },
  { id: 'LF-2840', name: 'Pedro Henrique', initials: 'PH', type: 'Entrega', items: [{ name: 'Sobá', quantity: 1 }], total: 53, status: 'Novo pedido', time: '12:38', ago: 'há 12 min', color: 'blue', address: 'Destino de exemplo · Capão Redondo', pickup_code: '6204', delivery_code: '7318' },
  { id: 'LF-2839', name: 'Camila Oliveira', initials: 'CO', type: 'Entrega', items: [{ name: 'Kibe Cru', quantity: 1 }], total: 58, status: 'Pronto', time: '12:31', ago: 'há 19 min', color: 'gold', address: 'Destino de exemplo · Jardim Ipê', pickup_code: '2851', delivery_code: '4926' },
  { id: 'LF-2838', name: 'Lucas Martins', initials: 'LM', type: 'Entrega', items: [{ name: 'Yakisoba', quantity: 1 }], total: 58, status: 'Saiu para entrega', time: '12:25', ago: 'há 25 min', color: 'green', address: 'Destino de exemplo · Vila das Belezas', pickup_code: '3075', delivery_code: '8541' },
  { id: 'LF-2837', name: 'Ana Beatriz', initials: 'AB', type: 'Entrega', items: [{ name: 'Frango Xadrez', quantity: 1 }], total: 58, status: 'Entregue', time: '12:14', ago: 'há 36 min', color: 'purple', address: 'Destino de exemplo · Parque Santo Antônio', pickup_code: '1659', delivery_code: '3852' },
]

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dishIcon = icon => ({ fork: UtensilsCrossed, bowl: CircleDollarSign, flame: Flame, sparkle: Sparkles, shopping: ShoppingBag })[icon] || UtensilsCrossed
const validCpf = value => { const digits=String(value||'').replace(/\D/g,'');if(digits.length!==11||/^([0-9])\1{10}$/.test(digits))return false;const check=length=>{let sum=0;for(let i=0;i<length;i++)sum+=Number(digits[i])*(length+1-i);const digit=(sum*10)%11;return(digit===10?0:digit)===Number(digits[length])};return check(9)&&check(10) }
const validRgFormat = value => /^[0-9A-Za-z.\-/ ]{5,18}$/.test(String(value||'').trim())&&String(value||'').replace(/[^0-9A-Za-z]/g,'').length>=5
function DishMark({ product, size = 22 }) { const Icon = dishIcon(product?.icon); return product?.image_url ? <img src={product.image_url} alt="" /> : product?.emoji ? <span>{product.emoji}</span> : <Icon size={size} strokeWidth={1.8} /> }
const orderKey = 'lusky-orders-v1'
const productKey = 'lusky-products-v1'
const demoRestaurantKey = 'lusky-demo-restaurant-v1'
const readDemoRestaurant = () => { try { return JSON.parse(localStorage.getItem(demoRestaurantKey)) || demoRestaurant } catch { return demoRestaurant } }
const readState = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback } }
const fetchAllOrders = async () => {
  const rows = []
  for (let start = 0; ; start += 500) {
    const result = await supabase.from('lusky_orders').select('*').order('created_at',{ascending:false}).order('id').range(start,start+499)
    if (result.error) return result
    rows.push(...result.data)
    if (result.data.length < 500) return { data: rows, error: null }
  }
}

const nav = [
  { section: 'PRINCIPAL', items: [{ id: 'Visão geral', icon: LayoutDashboard }, { id: 'Pedidos', icon: ShoppingBag }, { id: 'Cardápio', icon: UtensilsCrossed }, { id: 'Clientes', icon: Users }, { id: 'Motoboys', icon: Bike }] },
  { section: 'GESTÃO', items: [{ id: 'Relatórios', icon: BarChart3 }, { id: 'Usuários', icon: Users }, { id: 'Configurações', icon: Settings2 }, { id: 'Minha conta', icon: UserRound }] },
]

function Brand() {
  return <div className="brand"><span className="brand-symbol"><UtensilsCrossed size={19} strokeWidth={2.5} /></span><span className="brand-wordmark">lusky<span>food</span></span><span className="brand-dot">®</span></div>
}

function Sidebar({ page, setPage, mobileOpen, setMobileOpen, canManageUsers }) {
  return <><div className={`sidebar-scrim ${mobileOpen ? 'visible' : ''}`} onClick={() => setMobileOpen(false)} /><aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
    <div className="sidebar-top"><Brand /><button className="mobile-close icon-button" onClick={() => setMobileOpen(false)}><X size={17} /></button></div>
    <div className="branch-switch"><span className="branch-avatar"><span /></span><span className="branch-info"><b>Lusky Food</b><small>Operação do restaurante</small></span></div>
    <nav className="side-nav">{nav.map(group => <div className="nav-group" key={group.section}><div className="nav-heading">{group.section}</div>{group.items.filter(item => item.id !== 'Usuários' || canManageUsers).map(item => <button key={item.id} onClick={() => { setPage(item.id); setMobileOpen(false) }} className={`nav-item ${page === item.id ? 'active' : ''}`}><item.icon size={17} strokeWidth={1.8} /><span>{item.id}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}</button>)}</div>)}
    </nav>
    <div className="sidebar-bottom"><button className="nav-item" onClick={() => setPage('Relatórios')}><BarChart3 size={17}/> Ver desempenho</button></div>
  </aside></>
}

function Header({ page, setPage, setMobileOpen, onNewOrder, onSignOut }) {
  const titles = { 'Visão geral': ['Visão geral', 'Acompanhe o que está acontecendo no seu restaurante.'], Pedidos: ['Pedidos', 'Veja cada pedido e acompanhe o preparo em tempo real.'], Cardápio: ['Cardápio', 'Os sabores da casa, organizados em um só lugar.'], Clientes: ['Clientes', 'Conheça quem escolhe a Lusky Food.'], Motoboys: ['Motoboys', 'Confira os perfis da equipe de entrega.'], Usuários: ['Usuários', 'Crie contas e controle quem pode acessar o sistema.'], Relatórios: ['Relatórios', 'Os números que ajudam seu negócio a crescer.'], Configurações: ['Configurações', 'Tudo do seu restaurante, do seu jeito.'] }
  return <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" aria-label="Abrir menu" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Restaurante</span><ChevronRight size={13} /><b>{page}</b></div></div><div className="topbar-right"><button className="account-nav-button" onClick={() => setPage('Minha conta')}><UserRound size={16}/> Minha conta</button><button className="account-nav-button account-signout" onClick={onSignOut}><LogOut size={16}/> Sair</button></div></header>
}

function SectionHeading({ eyebrow, title, subtitle, action, actionText, secondary, onAction, onSecondary }) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div><div className="heading-actions">{secondary && <button className="button button-secondary" onClick={onSecondary}>{secondary.icon && <secondary.icon size={15} />}{secondary.text}</button>}{action && onAction && <button className="button button-dark" onClick={onAction}><Plus size={16}/>{actionText}</button>}</div></div>
}

function StatCard({ icon: Icon, label, value, change, positive = true, note, tone = 'green', progress }) {
  return <article className="stat-card"><div className="stat-top"><span className={`stat-icon ${tone}`}><Icon size={17} strokeWidth={1.9} /></span><span className={`stat-change ${positive ? 'up' : 'down'}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change}</span></div><div className="stat-number">{value}</div><div className="stat-label">{label}</div>{progress != null ? <div className="stat-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{note}</small></div> : <div className="stat-note">{note}</div>}</article>
}

function Status({ status }) {
  const cls = status === 'Novo pedido' ? 'new' : status === 'Preparando' ? 'preparing' : status === 'Pronto' ? 'ready' : status === 'Saiu para entrega' ? 'delivery' : 'done'
  return <span className={`status-pill ${cls}`}><i />{status}</span>
}

function OrderRow({ order, onStatus, compact = false }) {
  const color = `av-${order.color || 'rose'}`
  const next = { 'Novo pedido': 'Preparando', 'Preparando': 'Pronto', ...(order.type === 'Entrega' ? {} : { 'Pronto': 'Entregue' }) }
  return <div className="order-row"><div className="order-person"><span className={`customer-avatar ${color}`}>{order.initials || (order.name || 'LF').split(' ').map(x => x[0]).slice(0,2).join('')}</span><div><b>{order.name}</b><small>#{String(order.id).replace('LF-', '')} <span>·</span> {order.type}</small></div></div><div className="order-summary"><b>{order.items.map(item => `${item.quantity}× ${item.name}`).join(', ')}</b><small>{money(order.total)} <span>·</span> {order.time}</small></div><Status status={order.status} />{onStatus && next[order.status] && <button className="row-action" onClick={() => onStatus(order.id, next[order.status])}>{next[order.status] ? 'Avançar' : 'Concluir'} <ArrowRight size={13} /></button>}{!compact && <button className="icon-button row-more"><MoreHorizontal size={17} /></button>}</div>
}

function KitchenCode({ order }) {
  const [code,setCode]=useState('')
  const [error,setError]=useState('')
  if(order.type!=='Entrega'||order.status!=='Pronto')return null
  const reveal=async()=>{
    if(!supabase){setCode(order.pickup_code||'Código disponível somente no sistema conectado.');return}
    const {data,error:callError}=await supabase.rpc('lusky_kitchen_pickup_code',{p_order_number:Number(String(order.id).replace(/\D/g,''))})
    if(callError||!data){setError('Não foi possível consultar o código da cozinha.');return}
    setCode(data)
  }
  return <div className="kitchen-code"><button className="text-button" onClick={reveal}>Código da cozinha</button>{code&&<strong>{code}</strong>}{error&&<small role="alert">{error}</small>}</div>
}

function SalesChart() {
  const bars = [44, 62, 52, 76, 57, 82, 68, 95, 66, 75, 56, 91, 72, 58, 87, 65, 78, 54, 92, 73, 61, 80, 70, 97]
  const labels = ['08h', '10h', '12h', '14h', '16h', '18h', '20h']
  return <div className="chart-wrap"><div className="chart-y"><span>R$ 2.000</span><span>R$ 1.500</span><span>R$ 1.000</span><span>R$ 500</span><span>R$ 0</span></div><div className="chart-main"><div className="chart-grid"><i /><i /><i /><i /><i /></div><div className="chart-bars">{bars.map((h, i) => <div key={i} className={`chart-bar ${i === 17 ? 'highlight' : ''}`} style={{ height: `${h}%` }} title={money(h * 18)} />)}</div><div className="chart-x">{labels.map(x => <span key={x}>{x}</span>)}</div></div></div>
}

function Dashboard({ orders, products, setPage, onStatus, onNewOrder }) {
  const sales = orders.filter(o => o.status !== 'Novo pedido').reduce((sum, item) => sum + Number(item.total), 0) + 1840
  const activeOrders = orders.filter(o => !['Entregue', 'Cancelado'].includes(o.status))
  return <>
    <SectionHeading eyebrow="TERÇA-FEIRA, 28 DE OUTUBRO" title="Seu dia está com tudo, Rafael 👋" subtitle="Aqui está o resumo da sua operação até agora." actionText="Novo pedido" action onAction={onNewOrder} />
    <div className="stats-grid">
      <StatCard icon={CircleDollarSign} label="Vendas de hoje" value={money(sales)} change="18,6%" note="vs. ontem no mesmo horário" tone="green" />
      <StatCard icon={ShoppingBag} label="Pedidos recebidos" value={orders.length + 38} change="12,4%" note="vs. ontem no mesmo horário" tone="purple" />
      <StatCard icon={Wallet} label="Ticket médio" value={money((sales / Math.max(orders.length + 38, 1)))} change="4,2%" note="vs. média dos últimos 7 dias" tone="orange" />
      <StatCard icon={Flame} label="Meta diária" value="78%" change="+8,2%" note="Faltam R$ 1.320 para a meta" tone="blue" progress={78} />
    </div>
    <div className="dashboard-grid"><section className="panel sales-panel"><div className="panel-heading"><div><div className="panel-title">Visão de vendas <span className="live-tag"><i /> AO VIVO</span></div><small>O movimento de hoje, hora a hora</small></div><button className="select-button">Hoje <ChevronDown size={14} /></button></div><div className="chart-summary"><b>{money(sales)}</b><span className="stat-change up"><ArrowUpRight size={13} /> 18,6%</span><small>em relação a ontem</small></div><SalesChart /><div className="chart-legend"><span><i className="legend-dot" /> Hoje</span><span><i className="legend-dot faint" /> Dia anterior</span></div></section>
      <section className="panel popular-panel"><div className="panel-heading"><div><div className="panel-title">Queridinhos da casa <Sparkles size={15} className="sparkle" /></div><small>Os mais pedidos de hoje</small></div><button className="icon-button"><MoreHorizontal size={18} /></button></div><div className="popular-list">{products.slice().sort((a,b) => b.sold-a.sold).slice(0,4).map((product, i) => <div className="popular-row" key={product.id}><span className={`popular-emoji ${product.color}`}><DishMark product={product} size={18}/></span><div className="popular-info"><b>{product.name}</b><small>{product.sold} pedidos <span>·</span> {money(product.price)}</small></div><span className={`popular-rank rank-${i+1}`}>0{i+1}</span></div>)}</div><button className="panel-link" onClick={() => setPage('Cardápio')}>Ver cardápio completo <ArrowRight size={14} /></button></section></div>
    <section className="panel recent-panel"><div className="panel-heading"><div><div className="panel-title">Pedidos recentes <span className="count-tag">{activeOrders.length} em andamento</span></div><small>Não deixe nenhum pedido esperando</small></div><button className="text-button" onClick={() => setPage('Pedidos')}>Ver todos os pedidos <ArrowRight size={14} /></button></div><div className="orders-list">{orders.slice(0,4).map(order => <OrderRow key={order.id} order={order} onStatus={onStatus} />)}</div></section>
    <div className="dashboard-foot"><span><span className="pulse-dot" /> Atualizado agora</span><span>Seus dados são atualizados em tempo real</span></div>
  </>
}

function OrdersPage({ orders, onStatus, onNewOrder, drivers=[], onAssignDriver }) {
  const [filter, setFilter] = useState('Todos os pedidos')
  const [query, setQuery] = useState('')
  const filtered = orders.filter(order => (filter === 'Todos os pedidos' || order.status === filter) && `${order.name} ${order.id} ${order.type}`.toLowerCase().includes(query.toLowerCase()))
  return <><SectionHeading eyebrow="SUA COZINHA EM TEMPO REAL" title="Central de pedidos" subtitle="Cada pedido, do primeiro clique até a porta do cliente." actionText="Novo pedido" action onAction={onNewOrder} /><div className="order-metrics"><div><span className="metric-icon mint"><ShoppingBag size={16}/></span><span><b>{orders.filter(o => !['Entregue','Cancelado'].includes(o.status)).length}</b><small>Em andamento</small></span></div><div><span className="metric-icon lavender"><Clock3 size={16}/></span><span><b>18 <small>min</small></b><small>Tempo médio hoje</small></span></div><div><span className="metric-icon butter"><CheckCircle2 size={16}/></span><span><b>{orders.filter(o => o.status === 'Entregue').length + 31}</b><small>Concluídos hoje</small></span></div><div className="orders-peak"><span className="pulse-dot"/> Horário de pico <b>12h–14h</b></div></div>
    <section className="panel orders-panel"><div className="orders-toolbar"><div className="tabs">{['Todos os pedidos','Novo pedido','Preparando','Pronto'].map(tab => <button className={filter===tab?'selected':''} key={tab} onClick={()=>setFilter(tab)}>{tab}{tab==='Todos os pedidos'&&<span>{orders.length}</span>}</button>)}</div><div className="toolbar-actions"><label className="inline-search"><Search size={15}/><input placeholder="Buscar pedido" value={query} onChange={e=>setQuery(e.target.value)}/></label><button className="filter-button"><SlidersHorizontal size={15}/> Filtros</button></div></div><div className="orders-table-head"><span>CLIENTE / PEDIDO</span><span>RESUMO DO PEDIDO</span><span>STATUS</span><span></span></div><div className="orders-list">{filtered.map(order=><div className="order-workflow-row" key={order.id}><OrderRow order={order} onStatus={onStatus}/><KitchenCode order={order}/>{order.type==='Entrega'&&!['Entregue','Cancelado'].includes(order.status)&&<label className="order-driver-select"><Bike size={14}/><span>Motoboy</span><select value={order.assigned_driver||''} onChange={e=>onAssignDriver?.(order,e.target.value||null)} disabled={!drivers.some(driver=>driver.document_valid)}><option value="">{drivers.length?'Atribuir entrega':'Cadastre e valide um motoboy'}</option>{drivers.filter(driver=>driver.active&&driver.document_valid).map(driver=><option value={driver.id} key={driver.id}>{driver.full_name} · {driver.driver_code}</option>)}</select>{order.assigned_driver&&<small>{drivers.find(driver=>driver.id===order.assigned_driver)?.driver_code}</small>}</label>}</div>)}</div>{!filtered.length&&<div className="empty-state"><ShoppingBag size={28}/><b>Nenhum pedido por aqui</b><span>Tente trocar o filtro ou faça um novo pedido.</span></div>}<div className="table-footer"><span>Mostrando <b>{filtered.length}</b> de <b>{orders.length}</b> pedidos</span><div><button className="pagination-button" disabled><ChevronLeft size={15}/></button><button className="pagination-button active">1</button><button className="pagination-button">2</button><button className="pagination-button">3</button><button className="pagination-button"><ChevronRight size={15}/></button></div></div></section></>
}

function ProductCard({ product, onToggle, onEdit, canEdit }) {
  return <article className={`product-card ${!product.available?'unavailable':''}`}><div className={`product-art ${product.color} ${product.image_url?'has-photo':''}`}>{product.image_url?<img src={product.image_url} alt={product.name} loading="lazy"/>:<span className="product-icon-fallback"><DishMark product={product} size={34}/></span>}<span className="product-category">{product.category}</span>{canEdit&&<button className="product-menu" onClick={() => onEdit(product)} aria-label={`Editar ${product.name}`}><MoreHorizontal size={18}/></button>}</div><div className="product-details"><div className="product-title"><b>{product.name}</b><span className="product-availability"><i className={product.available?'':'off'}/>{product.available?'Disponível':'Pausado'}</span></div><p>{product.description}</p><div className="product-bottom"><b>{money(product.price)}</b><div className="product-sold"><ShoppingBag size={13}/>{product.sold} pedidos</div>{canEdit&&<button className={`toggle-switch ${product.available?'on':''}`} onClick={() => onToggle(product.id)} aria-label="Alternar disponibilidade"><i/></button>}</div></div></article>
}

function MenuPage({ products, onChange, onAdd, canEdit, onPreview }) {
  const [category, setCategory] = useState('Todos')
  const categories=['Todos',...new Set(products.map(p=>p.category))]
  const visible = products.filter(p => category === 'Todos' || p.category === category)
  return <><SectionHeading title="O cardápio da casa" subtitle="Quatro pratos para pedir hoje. Você pode ampliar essa seleção quando quiser." secondary={{icon:Eye,text:'Prévia do cliente'}} onSecondary={onPreview} actionText="Adicionar prato" action onAction={canEdit?onAdd:null}/><div className="menu-summary"><div><span className="summary-icon"><UtensilsCrossed size={17}/></span><div><b>{products.length} pratos</b><small>no cardápio</small></div></div><span className="summary-divider"/><div><span className="tiny-available"/><b>{products.filter(p=>p.available).length} disponíveis</b></div><span className="summary-hint"><Sparkles size={14}/> Feito com carinho, servido quentinho</span></div><div className="menu-toolbar"><div className="category-tabs">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={category===c?'selected':''}>{c}</button>)}</div><span className="menu-image-hint">Fotos naturais • ícones disponíveis ao cadastrar</span></div><div className="product-grid">{visible.map(p=><ProductCard key={p.id} product={p} canEdit={canEdit} onToggle={id=>{const item=products.find(x=>x.id===id);onChange({...item,available:!item.available})}} onEdit={onAdd}/>)}</div></>
}

function CustomerPortal({ products, orders, drivers=[], session, onPlaceOrder, onSignOut }) {
  const [cart,setCart]=useState({})
  const [cartOpen,setCartOpen]=useState(false)
  const [address,setAddress]=useState('')
  const [notice,setNotice]=useState('')
  const user=session?.user
  const customerName=user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Cliente Lusky'
  const ownOrders=orders.filter(order=>order.created_by===user?.id||order.localCustomer===user?.email)
  const active=ownOrders.find(order=>!['Entregue','Cancelado'].includes(order.status))
  const assignedDriver=drivers.find(driver=>driver.id===active?.assigned_driver)
  const [handoffCode,setHandoffCode]=useState('')
  useEffect(()=>{let live=true;const getCode=async()=>{if(!active||active.status!=='Saiu para entrega')return;if(active.delivery_code){setHandoffCode(active.delivery_code);return}if(supabase&&!session?.localDemo){const {data}=await supabase.rpc('lusky_customer_delivery_code',{p_order_number:Number(String(active.id).replace(/\D/g,''))});if(live)setHandoffCode(data||'')}};getCode();return()=>{live=false}},[active?.id,active?.status,active?.delivery_code,session?.localDemo])
  const count=Object.values(cart).reduce((a,b)=>a+b,0)
  const total=products.reduce((sum,p)=>sum+p.price*(cart[p.id]||0),0)
  const change=(id,delta)=>setCart(current=>({...current,[id]:Math.max(0,(current[id]||0)+delta)}))
  const submit=async()=>{if(!count||!address.trim())return;await onPlaceOrder({name:customerName,type:'Entrega',address:address.trim(),items:products.filter(p=>cart[p.id]).map(p=>({name:p.name,product_id:p.id,quantity:cart[p.id]})),total,status:'Novo pedido',time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),pickup_code:'',delivery_code:'',localCustomer:user?.email});setCart({});setAddress('');setCartOpen(false);setNotice('Pedido recebido pela cozinha. Acompanhe as etapas aqui.');setTimeout(()=>setNotice(''),4500)}
  return <div className="portal customer-portal"><header className="portal-header"><Brand/><nav><a href="#menu-cliente">Cardápio</a><a href="#acompanhar">Meus pedidos {ownOrders.length>0&&<i>{ownOrders.length}</i>}</a></nav><div className="portal-account"><span className="customer-avatar av-gold">{customerName.slice(0,1).toUpperCase()}</span><span><b>{customerName}</b><small>Cliente Lusky</small></span><button className="text-button" onClick={onSignOut}>Sair</button></div></header><main className="portal-main"><section className="customer-hero"><div className="customer-hero-copy"><span className="brand-stamp"><Sparkles size={14}/> FEITO NA HORA</span><h1>Comida que<br/>abraça <em>o dia.</em></h1><p>Seu próximo prato favorito está a poucos cliques de chegar quentinho.</p><a className="button button-yellow" href="#menu-cliente">Escolher meu prato <ArrowRight size={16}/></a><span className="hero-note"><i/> Ingredientes frescos, preparo cuidadoso</span></div><div className="customer-hero-food"><img src="/images/yakisoba.jpg" alt="Yakisoba preparado pela Lusky Food"/><span className="hero-food-tag"><Flame size={14}/> Mais pedido da casa</span><div className="hero-food-price"><small>HOJE NA LUSKY</small><b>R$ 50</b></div></div><div className="hero-scribble" aria-hidden="true">feito com<br/>carinho <span>♥</span></div></section>
    <section className="customer-menu-section" id="menu-cliente"><div className="customer-section-heading"><div><span className="section-kicker">CARDÁPIO DA CASA</span><h2>Qual vai ser hoje?</h2><p>Quatro receitas especiais, preparadas com carinho.</p></div><span className="menu-count">{products.filter(p=>p.available).length} pratos disponíveis</span></div><div className="customer-dish-grid">{products.filter(p=>p.available).map((p,i)=><article className="customer-dish" key={p.id} style={{'--dish-i':i}}><div className="customer-dish-photo">{p.image_url?<img src={p.image_url} alt={p.name} loading="lazy"/>:<div className={`customer-dish-placeholder ${p.color}`}><DishMark product={p} size={44}/></div>}<span className="dish-index">0{i+1}</span><button onClick={()=>change(p.id,1)} aria-label={`Adicionar ${p.name} ao pedido`} className="dish-add"><Plus size={20}/></button></div><div className="customer-dish-info"><div><h3>{p.name}</h3><b>{money(p.price)}</b></div><p>{p.description}</p><div className="dish-order-line"><span><i/> Preparado na hora</span>{cart[p.id]>0&&<b>{cart[p.id]} no pedido</b>}</div></div></article>)}</div></section>
    <section className="customer-tracking" id="acompanhar"><div className="tracking-heading"><div><span className="section-kicker">DA COZINHA ATÉ VOCÊ</span><h2>Acompanhe seu pedido</h2></div><span className="tracking-live"><i/> ATUALIZAÇÃO DO PEDIDO</span></div>{active?<div className="tracking-card"><div className="tracking-order-summary"><span className="order-ticket"><span> PEDIDO </span><b>{active.id}</b></span><div><span className={`status-pill ${active.status==='Novo pedido'?'new':active.status==='Preparando'?'preparing':active.status==='Pronto'?'ready':'delivery'}`}><i/>{active.status}</span><b>{active.items.map(x=>`${x.quantity}× ${x.name}`).join(' · ')}</b><small>{money(active.total)} · recebido às {active.time}</small></div><span className="eta-badge"><Clock size={15}/><b>Em andamento</b></span></div><div className="tracking-steps">{[['Novo pedido','Pedido recebido'],['Preparando','Em produção'],['Saiu para entrega','Em rota'],['Entregue','Na sua porta']].map(([id,label],i)=>{const stage=({ 'Novo pedido':0,Preparando:1,Pronto:1,'Saiu para entrega':2,Entregue:3})[active.status]??0;return <div className={`tracking-step ${i<=stage?'done':''} ${i===stage?'current':''}`} key={id}><span className="step-node">{i<stage?<Check size={13}/>:i+1}</span><span>{label}</span></div>})}</div><div className="tracking-map"><div className="map-street street-a"/><div className="map-street street-b"/><div className="map-street street-c"/><svg className="map-route" viewBox="0 0 620 140" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M40 97 C115 97 120 35 215 45 S330 120 397 86 S510 37 580 45"/></svg><span className="map-pin restaurant"><UtensilsCrossed size={16}/></span><span className="map-pin destination"><MapPin size={16}/></span><span className="map-route-label"><Navigation size={12}/> Rota da sua entrega</span><span className="map-disclaimer">Traçado ilustrativo · o rastreamento ao vivo depende da configuração do provedor de mapas</span></div>{assignedDriver&&<div className="assigned-driver-card"><span className="rider-avatar"><Bike size={18}/></span><span><small>MOTOBOY DA SUA ENTREGA</small><b>{assignedDriver.full_name}</b><span>{assignedDriver.vehicle_color} · {assignedDriver.vehicle_brand} {assignedDriver.vehicle_model} · {assignedDriver.vehicle_plate}</span></span><strong>{assignedDriver.driver_code}</strong></div>}{active.status==='Saiu para entrega'&&<div className="handoff-code"><span><PackageCheck size={17}/> Código para confirmar a entrega</span><b>{handoffCode||'— — — — — —'}</b><small>Mostre este código ao motoboy quando seu pedido chegar.</small></div>}</div>:<div className="tracking-empty"><span><ShoppingBag size={22}/></span><div><b>Seu próximo pedido aparece aqui</b><small>Escolha um prato e acompanhe cada etapa até a entrega.</small></div><a href="#menu-cliente">Ver cardápio <ArrowRight size={14}/></a></div>}</section></main><footer className="portal-footer"><Brand/><span>Feito com sabor e cuidado <span>♥</span> · Lusky Food</span></footer>{count>0&&<button className="floating-cart" onClick={()=>setCartOpen(true)}><span className="cart-count">{count}</span><ShoppingBag size={17}/><b>Ver meu pedido</b><span>{money(total)}</span><ArrowRight size={16}/></button>}{cartOpen&&<div className="cart-scrim" onClick={()=>setCartOpen(false)}><section className="cart-drawer" onClick={e=>e.stopPropagation()}><div className="cart-head"><div><span className="section-kicker">SUA ESCOLHA</span><h2>Seu pedido</h2></div><button className="icon-button" onClick={()=>setCartOpen(false)}><X size={18}/></button></div><div className="cart-items">{products.filter(p=>cart[p.id]).map(p=><div className="cart-item" key={p.id}><div className="cart-item-thumb">{p.image_url?<img src={p.image_url} alt=""/>:<DishMark product={p}/>}</div><div><b>{p.name}</b><small>{money(p.price)} cada</small></div><div className="qty-control"><button onClick={()=>change(p.id,-1)}><Minus size={12}/></button><b>{cart[p.id]}</b><button onClick={()=>change(p.id,1)}><Plus size={12}/></button></div></div>)}</div><label className="field-label">Endereço de entrega<input required value={address} onChange={e=>setAddress(e.target.value)} placeholder="Rua, número e bairro"/></label><div className="cart-total"><span>Total</span><b>{money(total)}</b></div><button className="button button-yellow cart-submit" disabled={!address.trim()} onClick={submit}>Enviar pedido para a cozinha <ArrowRight size={16}/></button><small className="cart-secure"><CheckCircle2 size={13}/> Você acompanha o andamento por aqui</small></section></div>}{notice&&<div className="toast"><CheckCircle2 size={17}/>{notice}</div>}</div>
}

function RiderPortal({ orders, onStatus, onSignOut, driverProfile }) {
  const deliveries=orders.filter(order=>order.type==='Entrega'&&!['Entregue','Cancelado'].includes(order.status)).slice().sort((a,b)=>(Number(a.route_order)||999)-(Number(b.route_order)||999)||Number(b.id.replace(/\D/g,''))-Number(a.id.replace(/\D/g,'')))
  const next=deliveries.find(order=>order.status==='Pronto'||order.status==='Saiu para entrega')||deliveries[0]
  const [codes,setCodes]=useState({})
  const [message,setMessage]=useState('')
  const finishMessage=(text)=>{setMessage(text);setTimeout(()=>setMessage(''),3500)}
  const confirmDelivery=async(order)=>{const code=(codes[order.id]||'').trim();if(!code){finishMessage('Digite o código que o cliente informou.');return}if(order.delivery_code&&code!==String(order.delivery_code)){finishMessage('Código incorreto. Confirme novamente com o cliente.');return}const ok=await onStatus(order.id,'Entregue',code);finishMessage(ok===false?'Código inválido ou entrega não está atribuída a você.':`Entrega ${order.id} finalizada.`)}
  const confirmPickup=async(order)=>{const ok=await onStatus(order.id,'Saiu para entrega',order.pickup_code);finishMessage(ok===false?'Confira o código de retirada e a atribuição da entrega.':'Retirada confirmada. Boa rota!')}
  return <div className="rider-portal"><header className="portal-header"><Brand/><span className="rider-shift"><i/> TURNO ATIVO <span>·</span> ROTA LUSKY</span><div className="portal-account"><span className="rider-avatar"><Bike size={17}/></span><span><b>{driverProfile?.full_name||'Motoboy Lusky'}</b><small>{driverProfile?.driver_code||'ID Lusky pendente'}</small></span><button className="text-button" onClick={onSignOut}>Sair</button></div></header><main className="rider-main"><section className="rider-welcome"><div><span className="section-kicker">SUA PRÓXIMA ROTA</span><h1>Entrega boa<br/>é entrega <em>tranquila.</em></h1><p>Confira a ordem das paradas e os códigos antes de sair.</p></div><div className="rider-route-count"><Navigation size={18}/><b>{deliveries.length}</b><span>paradas pendentes</span></div></section><div className="rider-layout"><section className="route-list"><div className="route-list-heading"><div><h2>Paradas da rota</h2><small>Sequência definida pela Lusky</small></div><span className="route-order-label"><ListFilter size={13}/> ORDEM</span></div>{deliveries.length?deliveries.map((order,i)=><article className={`route-stop ${order.id===next?.id?'next-stop':''}`} key={order.id}><div className="stop-number"><span>{String(i+1).padStart(2,'0')}</span><i/></div><div className="stop-content"><div className="stop-topline"><span className={`status-pill ${order.status==='Pronto'?'ready':order.status==='Saiu para entrega'?'delivery':order.status==='Preparando'?'preparing':'new'}`}><i/>{order.status}</span><span>{order.id}</span></div><h3>{order.name}</h3><p className="stop-address"><MapPin size={14}/>{order.address||'Endereço será confirmado'}</p><div className="stop-order-items"><ShoppingBag size={13}/>{order.items.map(x=>`${x.quantity}× ${x.name}`).join(' · ')}</div>{order.status==='Pronto'&&<div className="rider-code pickup"><span><ClipboardCheck size={15}/> Código de retirada <small>Informe à cozinha ao retirar</small></span><b>{order.pickup_code||'— — — —'}</b></div>}{order.status==='Saiu para entrega'&&<label className="rider-code delivery-code"><span><PackageCheck size={15}/> Código que o cliente fornecerá<input inputMode="numeric" maxLength={8} placeholder="Digite na hora da entrega" value={codes[order.id]||''} onChange={e=>setCodes(c=>({...c,[order.id]:e.target.value}))}/></span><button className="button button-yellow" onClick={()=>confirmDelivery(order)}>Confirmar entrega <Check size={15}/></button></label>}{order.status==='Pronto'&&<button className="button button-dark stop-action" onClick={()=>confirmPickup(order)}><Bike size={15}/> Confirmar retirada e iniciar rota</button>}</div></article>):<div className="route-empty"><PackageCheck size={24}/><b>Rota concluída</b><span>Quando houver nova entrega atribuída, ela aparecerá aqui.</span></div>}</section><aside className="rider-map-panel"><div className="route-map-art"><div className="map-street street-a"/><div className="map-street street-b"/><div className="map-street street-c"/><div className="map-street street-d"/><svg className="map-route rider-map-line" viewBox="0 0 360 340" preserveAspectRatio="none"><path pathLength="1" d="M38 272 C60 248 43 188 106 172 S134 229 189 206 S193 134 267 129 S285 81 320 65"/></svg>{deliveries.slice(0,4).map((d,i)=><span className={`map-stop-pin pin-${i}`} key={d.id}>{i+1}</span>)}<span className="map-home-pin"><UtensilsCrossed size={14}/></span><span className="map-label"><Navigation size={12}/> Ordem das paradas</span></div><div className="map-note"><MapPin size={16}/><span><b>Rota organizada pela Lusky</b><small>O mapa indica a sequência de entregas. Navegação GPS será conectada quando o provedor de mapas for configurado.</small></span></div>{next&&<div className="next-stop-card"><span>PRÓXIMA PARADA</span><b>{next.name}</b><small>{next.address||'Endereço do pedido'}</small><span className="next-stop-id">{next.id} · {next.status}</span></div>}</aside></div></main>{message&&<div className="toast"><CheckCircle2 size={17}/>{message}</div>}</div>
}

function CustomersPage() {
  const [search, setSearch] = useState('')
  const customers=[['MC','Marina Costa','marina@email.com','28 pedidos','R$ 1.284,60','Hoje, 12:42','rose'],['PH','Pedro Henrique','pedro@email.com','19 pedidos','R$ 932,40','Hoje, 12:38','blue'],['CO','Camila Oliveira','camila@email.com','16 pedidos','R$ 814,20','Hoje, 12:31','gold'],['LM','Lucas Martins','lucas@email.com','12 pedidos','R$ 638,80','Hoje, 12:25','green'],['AB','Ana Beatriz','ana@email.com','9 pedidos','R$ 492,50','Hoje, 12:14','purple'],['FN','Felipe Nunes','felipe@email.com','8 pedidos','R$ 410,00','Ontem, 20:16','blue']]
  const rows=customers.filter(row=>row.join(' ').toLowerCase().includes(search.toLowerCase()))
  return <><SectionHeading eyebrow="QUEM FAZ A CASA" title="Seus clientes" subtitle="Um bom relacionamento começa conhecendo cada pessoa."/><div className="stats-grid customer-stats"><StatCard icon={Users} label="Clientes cadastrados" value="1.284" change="8,4%" note="novos clientes este mês" tone="purple"/><StatCard icon={Activity} label="Clientes recorrentes" value="64,8%" change="5,2%" note="voltaram nos últimos 30 dias" tone="green"/><StatCard icon={CircleDollarSign} label="Gasto médio por cliente" value="R$ 68,40" change="3,1%" note="em pedidos concluídos" tone="orange"/><StatCard icon={Sparkles} label="Nível de satisfação" value="4,9/5" change="0,3%" note="média das avaliações" tone="blue"/></div><section className="panel customer-panel"><div className="panel-heading"><div><div className="panel-title">Mais recentes <span className="count-tag">1.284 no total</span></div><small>Seus clientes mais ativos aparecem primeiro</small></div><label className="inline-search"><Search size={15}/><input placeholder="Buscar cliente" value={search} onChange={e=>setSearch(e.target.value)}/></label></div><div className="customer-table-head"><span>CLIENTE</span><span>ATIVIDADE</span><span>TOTAL PEDIDO</span><span>ÚLTIMO PEDIDO</span></div>{rows.map(c=><div className="customer-row" key={c[0]}><div className="order-person"><span className={`customer-avatar av-${c[6]}`}>{c[0]}</span><div><b>{c[1]}</b><small>{c[2]}</small></div></div><b>{c[3]}</b><b>{c[4]}</b><span>{c[5]}</span></div>)}</section></>
}

function MotoboysPage({ drivers }) {
  const [copied,setCopied]=useState('')
  const copy=async code=>{try{await navigator.clipboard.writeText(code);setCopied(code);setTimeout(()=>setCopied(''),1800)}catch{setCopied('')}}
  return <><SectionHeading title="Equipe de entrega" subtitle="Identifique os motoboys, confira os documentos e os veículos cadastrados."/><div className="driver-summary"><span className="driver-summary-icon"><Bike size={19}/></span><span><b>{drivers.length}</b><small>motoboys cadastrados</small></span><p>O identificador acompanha cada pedido atribuído ao entregador.</p></div><section className="driver-directory">{drivers.length?drivers.map(driver=><article className="driver-directory-card" key={driver.id}><div className="driver-directory-head"><span className="rider-avatar"><Bike size={19}/></span><span><b>{driver.full_name}</b><small>{driver.active?'Disponível para entregas':'Inativo'}</small></span><button className="driver-code-copy" onClick={()=>copy(driver.driver_code)} aria-label={`Copiar identificador ${driver.driver_code}`}><span>{driver.driver_code}</span>{copied===driver.driver_code?<Check size={15}/>:<Copy size={15}/>}</button></div><div className="driver-details-grid"><span><small>VEÍCULO</small><b>{driver.vehicle_color} {driver.vehicle_brand} {driver.vehicle_model}</b></span><span><small>PLACA</small><b>{driver.vehicle_plate}</b></span><span><small>DOCUMENTO</small><b>{driver.document_type||'—'} · {driver.document_masked||'—'}</b><em className={driver.document_valid?'document-approved':'document-pending'}>{driver.document_valid?'Formato válido':'Verificar documento'}</em></span></div></article>):<div className="driver-empty"><Bike size={25}/><b>Nenhum motoboy cadastrado ainda</b><span>Quando alguém criar uma conta de motoboy, seu perfil e identificador aparecerão aqui.</span></div>}</section></>
}

const roleLabel = role => ({ customer: 'Cliente', motoboy: 'Motoboy', owner: 'Administrador', manager: 'Gerente', staff: 'Equipe' })[role] || 'Cliente'
const userInitials = name => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()

let demoManagedUsers = [
  { id:'demo-owner', full_name:'Lusky Food', email:'owner@luskyfood.local', phone:'11900000001', role:'owner', active:true },
  { id:'demo-marina', full_name:'Marina Costa', email:'marina@exemplo.local', phone:'11900000002', role:'customer', active:true },
  { id:'demo-rafael', full_name:'Rafael Almeida', email:'rafael@exemplo.local', phone:'11900000003', role:'motoboy', active:true, driver_code:'MB-001', vehicle_details:{vehicle_color:'Preta',vehicle_plate:'ABC1D23',vehicle_brand:'Honda',vehicle_model:'CG 160'} },
  { id:'demo-bruna', full_name:'Bruna Santos', email:'bruna@exemplo.local', phone:'11900000004', role:'motoboy', active:false, driver_code:'MB-002', vehicle_details:{vehicle_color:'Vermelha',vehicle_plate:'DEF4G56',vehicle_brand:'Yamaha',vehicle_model:'Factor 150'} },
].map(user => ({...user, created_at:new Date('2026-10-29T12:00:00Z').toISOString()}))
const demoAdminClient = { functions:{ invoke:async (_name,{body}) => {
  const user = demoManagedUsers.find(item => item.id === body.user_id)
  if (body.action === 'list') return {data:{users:demoManagedUsers.map(item => ({...item}))}}
  if (body.action === 'create') { demoManagedUsers = [...demoManagedUsers,{id:`demo-${crypto.randomUUID()}`,full_name:body.full_name,email:body.email,phone:body.phone,role:body.role,active:true,created_at:new Date().toISOString(),vehicle_details:body.role==='motoboy'?{vehicle_color:body.vehicle_color,vehicle_plate:body.vehicle_plate,vehicle_brand:body.vehicle_brand,vehicle_model:body.vehicle_model}:null}]; return {data:{ok:true}} }
  if (!user) return {data:{error:'Conta de demonstração não encontrada.'}}
  if (body.action === 'update') { demoManagedUsers = demoManagedUsers.map(item => item.id===user.id?{...item,full_name:body.full_name,email:body.email,phone:body.phone,role:body.role,vehicle_details:body.role==='motoboy'?body.vehicle:item.vehicle_details}:item); return {data:{ok:true,role_changed:body.role!==user.role}} }
  if (body.action === 'disable' || body.action === 'enable') { demoManagedUsers = demoManagedUsers.map(item => item.id===user.id?{...item,active:body.action==='enable'}:item); return {data:{ok:true}} }
  if (body.action === 'delete') { demoManagedUsers = demoManagedUsers.filter(item => item.id!==user.id); return {data:{ok:true}} }
  if (body.action === 'reset_password') return {data:{ok:true}}
  return {data:{error:'Ação indisponível na demonstração.'}}
} } }
function DemoUsersPage({ notify }) { return <AdminUsersPage client={demoAdminClient} currentUser={{id:'demo-owner'}} notify={message=>notify(`Demonstração: ${message}`)} demo/> }

function PasswordField({ id, label, value, onChange, shown, onToggle, placeholder, required = false }) {
  return <div className="field-label password-field"><label htmlFor={id}>{label}</label><div className="password-control"><input id={id} type={shown ? 'text' : 'password'} required={required} minLength={8} maxLength={128} autoComplete="new-password" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}/><button className="password-toggle" type="button" onClick={onToggle} aria-label={shown ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`} aria-pressed={shown}>{shown ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>
}

function AdminUsersPage({ client, currentUser, notify, demo = false }) {
  const [users, setUsers] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('todos')
  const [showInactive, setShowInactive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState('')
  const [modal, setModal] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const emptyForm = { full_name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'customer', document_type: 'CPF', document_number: '', vehicle_color: '', vehicle_plate: '', vehicle_brand: '', vehicle_model: '' }
  const [form, setForm] = useState(emptyForm)

  const call = async (action, payload = {}) => {
    const { data, error } = await client.functions.invoke('lusky-admin-users', { body: { action, ...payload } })
    if (error) {
      let message = error.message || 'Não foi possível concluir a ação.'
      try { const detail = await error.context?.json?.(); if (detail?.error) message = detail.error } catch {}
      throw new Error(message)
    }
    if (data?.error) throw new Error(data.error)
    return data
  }
  const load = async () => {
    setPageError('')
    setLoaded(false)
    try { const data = await call('list'); setUsers(data.users || []) }
    catch (error) { setPageError(error.message) }
    finally { setLoaded(true) }
  }
  useEffect(() => { load() }, [client])

  const visible = users.filter(user => {
    const matchFilter = filter === 'todos' || user.role === filter
    const text = `${user.full_name} ${user.email} ${user.driver_code || ''}`.toLowerCase()
    return matchFilter && (showInactive || user.active) && text.includes(query.toLowerCase())
  })
  const openCreate = () => { setForm(emptyForm); setModal({ mode: 'create' }) }
  const openEdit = user => {
    setForm({ ...emptyForm, full_name: user.full_name || '', email: user.email, phone:user.phone || '', role: user.role, ...(user.vehicle_details || {}) })
    setModal({ mode: 'edit', user })
  }
  const updateField = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const save = async event => {
    event.preventDefault()
    setPageError('')
    if (digits(form.phone).length !== 11) { setPageError('Informe um celular com DDD para esta conta.'); return }
    if (isDriver && !validVehiclePlate(form.vehicle_plate)) {
      setPageError('Placa inválida. Use o formato ABC1D23: três letras, um número, um caractere alfanumérico e dois números.')
      return
    }
    setBusy(true)
    try {
      if (modal.mode === 'create') {
        if (form.password !== form.confirmPassword) throw new Error('As senhas não coincidem.')
        const payload = { full_name: form.full_name, email: form.email, phone: digits(form.phone), password: form.password, role: form.role }
        if (form.role === 'motoboy') Object.assign(payload, {
          document_type: form.document_type,
          document_number: form.document_number,
          vehicle_color: form.vehicle_color,
          vehicle_plate: form.vehicle_plate.toUpperCase(),
          vehicle_brand: form.vehicle_brand,
          vehicle_model: form.vehicle_model,
        })
        await call('create', payload)
        notify(`Conta de ${roleLabel(form.role).toLowerCase()} criada.`)
      } else {
        if (form.password && form.password !== form.confirmPassword) throw new Error('As senhas não coincidem.')
        const result = await call('update', { user_id: modal.user.id, full_name: form.full_name, email: form.email, phone: digits(form.phone), role: form.role, password: form.password, document_type: form.document_type, document_number: form.document_number, vehicle: {
          vehicle_color: form.vehicle_color,
          vehicle_plate: form.vehicle_plate.toUpperCase(),
          vehicle_brand: form.vehicle_brand,
          vehicle_model: form.vehicle_model,
        } })
        notify(result.role_changed ? 'Conta atualizada. A pessoa precisa entrar novamente para receber as novas permissões.' : 'Dados da conta atualizados.')
      }
      setModal(null)
      await load()
    } catch (error) { setPageError(error.message) }
    finally { setBusy(false) }
  }

  const runUserAction = async (action, user) => {
    setBusy(true)
    setPageError('')
    try {
      await call(action, { user_id: user.id })
      notify(action === 'delete' ? 'Conta excluída.' : action === 'disable' ? 'Conta desativada.' : 'Conta habilitada.')
      await load()
    } catch (error) { setPageError(error.message) }
    finally { setBusy(false) }
  }

  const resetPassword = user => { setPasswordForm({ password: '', confirm: '' }); setPasswordVisible(false); setPasswordError(''); setModal({ mode: 'password', user }) }
  const savePassword = async event => {
    event.preventDefault()
    if (busy) return
    setPasswordError('')
    if (passwordForm.password.length < 8 || passwordForm.password.length > 128) { setPasswordError('Use uma senha entre 8 e 128 caracteres.'); return }
    if (passwordForm.password !== passwordForm.confirm) { setPasswordError('As senhas não coincidem.'); return }
    setBusy(true)
    try {
      await call('reset_password', { user_id: modal.user.id, password: passwordForm.password })
      setPasswordForm({ password: '', confirm: '' })
      setModal(null)
      notify('Senha redefinida. A pessoa poderá usar a nova senha no próximo acesso.')
    } catch (error) { setPasswordError(error.message) }
    finally { setBusy(false) }
  }
  const toggleActive = user => {
    const action = user.active ? 'disable' : 'enable'
    const message = user.active
      ? `Desativar a conta de ${user.email}? A pessoa não poderá iniciar novas sessões.`
      : `Habilitar novamente a conta de ${user.email}?`
    if (window.confirm(message)) runUserAction(action, user)
  }
  const deleteAccount = user => {
    if (window.confirm(`Excluir permanentemente ${user.email}? Esta ação não pode ser desfeita. Se houver pedidos, o sistema vai impedir a exclusão para preservar o histórico.`)) runUserAction('delete', user)
  }
  const isEdit = modal?.mode === 'edit'
  const isDriver = form.role === 'motoboy'
  const isOwner = form.role === 'owner'

  return <div className="admin-users-page">
    {demo && <div className="demo-data-note"><CircleHelp size={16}/><span>Prévia local: alterações nesta lista e redefinições de senha são simuladas. Entre como administrador real para gerenciar contas do Supabase.</span></div>}
    <div className="admin-users-heading"><div><h1>Usuários e colaboradores</h1><p>Edite perfis, controle o acesso e redefina senhas da equipe Lusky.</p></div><button className="button button-dark" onClick={openCreate}><UserPlus size={16}/> Novo usuário</button></div>
    <div className="user-management-summary"><span className="user-summary-mark"><ShieldCheck size={19}/></span><span><b>{users.length}</b><small>contas cadastradas</small></span><span className="user-summary-divider"/><span><b>{users.filter(user => user.active).length}</b><small>com acesso habilitado</small></span><p>Somente a conta administradora pode acessar esta área.</p></div>
    <section className="user-management-panel">
      <div className="user-list-toolbar"><div><h2>Contas do sistema</h2><span>{visible.length} {visible.length === 1 ? 'resultado' : 'resultados'}</span></div><label className="inline-search"><Search size={15}/><input aria-label="Buscar usuário" placeholder="Buscar por nome, e-mail ou ID" value={query} onChange={event => setQuery(event.target.value)}/></label><label className="inactive-filter"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)}/> Mostrar inativos</label><select aria-label="Filtrar por tipo de conta" value={filter} onChange={event => setFilter(event.target.value)}><option value="todos">Todos os tipos</option><option value="customer">Clientes</option><option value="motoboy">Motoboys</option><option value="owner">Administradores</option><option value="manager">Gerentes</option><option value="staff">Equipe</option></select></div>
      {pageError && <div className="user-management-error"><CircleAlert size={16}/><span>{pageError}</span><button onClick={() => load()}>Tentar novamente</button></div>}
      {!loaded && !pageError && <div className="user-list-loading"><span className="pulse-dot"/> Carregando contas...</div>}
      {loaded && !users.length && !pageError && <div className="user-list-empty"><Users size={24}/><b>Nenhuma conta encontrada</b><span>Crie a primeira conta usando o botão acima.</span></div>}
      {users.length > 0 && <>
        <div className="user-table-header"><span>USUÁRIO</span><span>PERFIL</span><span>ACESSO</span><span>CADASTRO</span><span>AÇÕES</span></div>
        <div className="admin-user-list">{visible.map(user => {
          const own = user.id === currentUser?.id
          return <article className="admin-user-row" key={user.id}>
            <div className="managed-user-identity"><span className={`managed-user-avatar ${user.role === 'owner' ? 'is-owner' : user.role === 'motoboy' ? 'is-driver' : ''}`}>{user.role === 'motoboy' ? <Bike size={16}/> : user.role === 'owner' ? <ShieldCheck size={16}/> : userInitials(user.full_name || user.email)}</span><span><b>{user.full_name || 'Sem nome'}</b><small>{user.email}{user.driver_code ? ` · ${user.driver_code}` : ''}</small></span>{own && <em>Sua conta</em>}</div>
            <span className={`managed-role role-${user.role}`}>{roleLabel(user.role)}</span>
            <span className={`managed-status ${user.active ? 'is-active' : 'is-disabled'}`}><i/>{user.active ? 'Habilitada' : 'Desativada'}</span>
            <span className="managed-date">{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
            <div className="managed-actions">
              <button title="Editar dados" aria-label={`Editar ${user.email}`} disabled={busy || own} onClick={() => openEdit(user)}><Pencil size={15}/></button>
              <button title="Definir nova senha" aria-label={`Definir nova senha de ${user.email}`} disabled={busy || own} onClick={() => resetPassword(user)}><KeyRound size={16}/></button>
              <button title={user.active ? 'Desativar conta' : 'Habilitar conta'} aria-label={`${user.active ? 'Desativar' : 'Habilitar'} ${user.email}`} disabled={busy || own || user.role === 'owner'} onClick={() => toggleActive(user)}>{user.active ? <UserX size={15}/> : <UserCheck size={15}/>}</button>
              <button className="delete-user-action" title="Excluir conta" aria-label={`Excluir ${user.email}`} disabled={busy || own || user.role === 'owner'} onClick={() => deleteAccount(user)}><Trash2 size={15}/></button>
            </div>
          </article>
        })}</div>
        {!visible.length && <div className="user-list-empty"><Users size={24}/><b>Nenhuma conta encontrada</b><span>Experimente outro termo ou tipo de usuário.</span></div>}
        <div className="user-list-footer"><span>{demo?'Contas de exemplo; nenhuma ação altera usuários reais.':'Contas e permissões são atualizadas no Supabase.'}</span><button onClick={load} disabled={busy}><Activity size={14}/> Atualizar lista</button></div>
      </>}
    </section>

    {modal && modal.mode !== 'password' && <div className="modal-backdrop" onClick={() => !busy && setModal(null)}><form className="modal-card admin-user-modal" onSubmit={save} onClick={event => event.stopPropagation()}>
      <div className="modal-heading"><div><span className="modal-icon"><UserPlus size={17}/></span><h2>{isEdit ? 'Editar conta' : 'Criar conta'}</h2><p>{isEdit ? 'Atualize os dados de acesso e perfil.' : 'A nova pessoa poderá entrar assim que a conta for criada.'}</p></div><button type="button" className="icon-button" disabled={busy} onClick={() => setModal(null)}><X size={18}/></button></div>
      <label className="field-label">Tipo de conta<select value={form.role} onChange={event => updateField('role', event.target.value)}><option value="customer">Cliente</option><option value="motoboy">Motoboy</option><option value="staff">Equipe</option><option value="manager">Gerente</option><option value="owner">Administrador</option></select></label>
      <label className="field-label">Nome completo<input autoFocus required minLength={3} maxLength={120} value={form.full_name} onChange={event => updateField('full_name', event.target.value)} placeholder="Nome e sobrenome"/></label>
      <label className="field-label">E-mail<input required type="email" value={form.email} onChange={event => updateField('email', event.target.value)} placeholder="pessoa@email.com"/></label>
      <label className="field-label">Celular com DDD<input required inputMode="tel" autoComplete="tel" value={maskPhone(form.phone)} onChange={event => updateField('phone', digits(event.target.value).slice(0,11))} placeholder="(11) 99999-9999"/></label>
      {!isEdit && <><label className="field-label">Senha inicial<input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={event => updateField('password', event.target.value)} placeholder="Mínimo de 8 caracteres"/></label><label className="field-label">Confirmar senha<input required type="password" minLength={8} autoComplete="new-password" value={form.confirmPassword} onChange={event => updateField('confirmPassword', event.target.value)} placeholder="Digite a senha novamente"/></label></>}
      {isEdit && <p className="managed-password-hint"><KeyRound size={14}/> Use a ação de chave na lista para definir uma nova senha.</p>}
      {isDriver && <div className="managed-driver-fields"><div className="managed-fields-title"><Bike size={15}/> Dados do motoboy</div><div className="settings-two"><label className="field-label">Documento<select value={form.document_type} onChange={event => updateField('document_type', event.target.value)}><option value="CPF">CPF</option><option value="RG">RG</option></select></label><label className="field-label">Número do {form.document_type}<input required={!isEdit || modal.user.role !== 'motoboy'} value={form.document_number} onChange={event => updateField('document_number', event.target.value)} placeholder={isEdit && modal.user.role === 'motoboy' ? 'Deixe vazio para manter' : form.document_type === 'CPF' ? '000.000.000-00' : 'Número do RG'}/></label></div><div className="settings-two"><label className="field-label">Cor<input required value={form.vehicle_color} onChange={event => updateField('vehicle_color', event.target.value)} placeholder="Ex.: Preta"/></label><label className="field-label">Placa<input required maxLength={7} value={form.vehicle_plate} onChange={event => updateField('vehicle_plate', event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="ABC1D23"/><small className={`managed-plate-hint ${form.vehicle_plate ? (validVehiclePlate(form.vehicle_plate) ? 'is-valid' : 'is-invalid') : ''}`}>ABC1D23 · 3 letras, número, caractere alfanumérico e 2 números</small></label></div><div className="settings-two"><label className="field-label">Marca<input required value={form.vehicle_brand} onChange={event => updateField('vehicle_brand', event.target.value)} placeholder="Ex.: Honda"/></label><label className="field-label">Modelo<input required value={form.vehicle_model} onChange={event => updateField('vehicle_model', event.target.value)} placeholder="Ex.: CG 160"/></label></div></div>}
      {isOwner && !isEdit && <div className="owner-create-note"><ShieldCheck size={15}/> Uma conta administradora terá controle sobre todo o sistema.</div>}
      {pageError && <div className="user-management-error"><CircleAlert size={15}/><span>{pageError}</span></div>}
      <div className="modal-footer"><button className="button button-secondary" type="button" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button className="button button-dark" type="submit" disabled={busy}>{busy ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar conta'} <ArrowRight size={15}/></button></div>
    </form></div>}

    {modal?.mode === 'password' && <div className="modal-backdrop" onClick={() => !busy && setModal(null)}><form className="modal-card reset-password-result" onSubmit={savePassword} onClick={event => event.stopPropagation()}><div className="modal-heading"><div><span className="modal-icon"><KeyRound size={17}/></span><h2>Definir nova senha</h2><p>Escolha manualmente a senha de {modal.user.full_name || modal.user.email}. A senha atual deixará de funcionar no próximo acesso.</p></div><button type="button" className="icon-button" disabled={busy} onClick={() => setModal(null)} aria-label="Fechar"><X size={18}/></button></div><div className="password-account"><span>Conta</span><b>{modal.user.email}</b></div><PasswordField id="admin-new-password" label="Nova senha" value={passwordForm.password} onChange={value => setPasswordForm(current => ({ ...current, password: value }))} shown={passwordVisible} onToggle={() => setPasswordVisible(value => !value)} placeholder="Mínimo de 8 caracteres" required/><PasswordField id="admin-confirm-password" label="Confirmar nova senha" value={passwordForm.confirm} onChange={value => setPasswordForm(current => ({ ...current, confirm: value }))} shown={passwordVisible} onToggle={() => setPasswordVisible(value => !value)} placeholder="Repita a nova senha" required/>{passwordError && <div className="user-management-error" role="alert"><CircleAlert size={15}/><span>{passwordError}</span></div>}<div className="modal-footer"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="button button-dark" disabled={busy || !passwordForm.password || !passwordForm.confirm}>{busy ? 'Salvando…' : 'Redefinir senha'} <ArrowRight size={15}/></button></div></form></div>}
  </div>
}

function ReportsPage({ products }) {
  const rows=products.slice().sort((a,b)=>(b.sold||0)-(a.sold||0)).map(product=>[product.name,product.sold||0,money((product.sold||0)*Number(product.price)),'—',product.color,product])
  return <><SectionHeading eyebrow="NÚMEROS QUE CONTAM HISTÓRIAS" title="Desempenho da casa" subtitle="Um retrato do seu negócio para tomar decisões melhores." secondary={{icon:CalendarDays,text:'Últimos 7 dias'}}/><div className="stats-grid report-stats"><StatCard icon={CircleDollarSign} label="Faturamento no período" value="R$ 18.642" change="18,6%" note="comparado aos 7 dias anteriores" tone="green"/><StatCard icon={ShoppingBag} label="Pedidos concluídos" value="286" change="12,4%" note="comparado aos 7 dias anteriores" tone="purple"/><StatCard icon={Wallet} label="Ticket médio" value="R$ 65,18" change="4,2%" note="comparado aos 7 dias anteriores" tone="orange"/><StatCard icon={Clock3} label="Tempo médio de preparo" value="18 min" change="2 min" positive note="mais rápido que a semana passada" tone="blue"/></div><section className="panel report-chart"><div className="panel-heading"><div><div className="panel-title">Vendas ao longo do dia</div><small>Período selecionado · 22 a 28 de outubro</small></div><span className="stat-change up"><ArrowUpRight size={13}/> 18,6% vs. semana passada</span></div><SalesChart/></section><section className="panel best-sellers"><div className="panel-heading"><div><div className="panel-title">O que mais sai da cozinha <Sparkles size={15} className="sparkle"/></div><small>Vendas registradas por prato</small></div><button className="text-button">Exportar CSV <ArrowRight size={14}/></button></div><div className="orders-list">{rows.map((r,i)=><div className="popular-row report-product" key={r[0]}><span className={`popular-emoji ${r[4]}`}><DishMark product={r[5]}/></span><span className="rank-num">0{i+1}</span><div className="popular-info"><b>{r[0]}</b><small>{r[1]} unidades · {r[3]}</small></div><b className="report-revenue">{r[2]}</b></div>)}</div></section></>
}

function SettingsPage() {
  const [active, setActive] = useState('Perfil do restaurante')
  const settings=['Perfil do restaurante','Horários de funcionamento','Taxas e entrega','Formas de pagamento','Notificações','Equipe e permissões']
  return <><SectionHeading eyebrow="DO SEU JEITO" title="Configurações" subtitle="Mantenha as informações do seu restaurante sempre atualizadas."/><div className="settings-layout"><nav className="settings-nav">{settings.map((item,i)=><button className={active===item?'selected':''} key={item} onClick={()=>setActive(item)}>{[UtensilsCrossed,Clock3,Bike,CreditCard,Bell,Users].map((Icon,n)=>n===i&&<Icon key={n} size={16}/>)}{item}<ChevronRight size={14}/></button>)}</nav><section className="panel settings-panel"><div className="panel-title">{active}</div><p>Essas informações ajudam seus clientes a encontrar e escolher a Lusky Food.</p><label className="field-label">Nome do restaurante<input defaultValue="Lusky Food"/></label><label className="field-label">Descrição<input defaultValue="Comida boa, feita com carinho e um toque especial."/></label><div className="settings-two"><label className="field-label">Telefone<input defaultValue="(11) 3456-7890"/></label><label className="field-label">WhatsApp<input defaultValue="(11) 99999-0000"/></label></div><label className="field-label">Endereço<input defaultValue="Rua dos Pinheiros, 420 · São Paulo, SP"/></label><div className="settings-actions"><span>Última alteração há 2 horas</span><button className="button button-dark" onClick={()=>window.alert('Informações salvas!')}>Salvar alterações</button></div></section></div></>
}

function ProductModal({ onClose, onSave, product }) {
  const [name,setName]=useState(product?.name||'')
  const [category,setCategory]=useState(product?.category||'Pratos principais')
  const [price,setPrice]=useState(product?.price||'')
  const [description,setDescription]=useState(product?.description||'')
  const [icon,setIcon]=useState(product?.icon||'fork')
  const [image,setImage]=useState(product?.image_url||'')
  const [imageFile,setImageFile]=useState(null)
  const icons=[['fork','Talheres'],['bowl','Prato'],['flame','Quente'],['sparkle','Especial'],['shopping','Porção']]
  return <div className="modal-backdrop" onClick={onClose}><form className="modal-card" onSubmit={e=>{e.preventDefault();onSave({...(product||{}),id:product?.id||`p-${Date.now()}`,name,category,price:Number(price),description,icon,image_url:image,imageFile,color:product?.color||'peach',available:product?.available??true,sold:product?.sold||0});onClose()}} onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><span className="modal-icon"><UtensilsCrossed size={17}/></span><h2>{product?'Editar prato':'Adicionar prato'}</h2><p>Uma foto da casa ou um ícone da plataforma.</p></div><button type="button" className="icon-button" onClick={onClose}><X size={18}/></button></div><label className="field-label">Nome do prato<input autoFocus required placeholder="Ex.: Escondidinho da casa" value={name} onChange={e=>setName(e.target.value)}/></label><div className="settings-two"><label className="field-label">Categoria<input required value={category} onChange={e=>setCategory(e.target.value)} placeholder="Pratos principais"/></label><label className="field-label">Preço (R$)<input required type="number" step="0.01" min="0" placeholder="0,00" value={price} onChange={e=>setPrice(e.target.value)}/></label></div><label className="field-label">Descrição<input placeholder="Conte o que deixa esse prato especial" value={description} onChange={e=>setDescription(e.target.value)}/></label><div className="dish-media-field"><div className="dish-media-heading"><span>Como aparece no cardápio</span><small>Escolha uma foto ou um ícone</small></div><label className="image-upload">{image?<img src={image} alt="Prévia do prato"/>:<span className="upload-placeholder"><Plus size={18}/><b>Adicionar foto</b><small>JPG, PNG ou WebP</small></span>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file){setImageFile(file);setImage(URL.createObjectURL(file))}}}/></label><span className="choice-divider">ou use um ícone</span><div className="icon-choice-grid">{icons.map(([key,label])=>{const Icon=dishIcon(key);return <button type="button" key={key} className={icon===key&&!imageFile?'selected':''} onClick={()=>{setIcon(key);setImageFile(null);setImage('')}}><Icon size={18}/><span>{label}</span></button>})}</div><button type="button" className="media-reset" onClick={()=>{setImageFile(null);setImage('')}}>Usar ícone em vez da foto</button></div><div className="modal-footer"><button className="button button-secondary" type="button" onClick={onClose}>Cancelar</button><button className="button button-dark" type="submit"><Check size={15}/>{product?'Salvar prato':'Adicionar ao cardápio'}</button></div></form></div>
}

function OrderModal({ products, onClose, onSave }) {
  const [customer,setCustomer]=useState('')
  const [type,setType]=useState('Retirada')
  const [cart,setCart]=useState({})
  const [search,setSearch]=useState('')
  const available=products.filter(p=>p.available && p.name.toLowerCase().includes(search.toLowerCase()))
  const total=products.reduce((s,p)=>s+p.price*(cart[p.id]||0),0)
  const setQty=(id,d)=>setCart(c=>({...c,[id]:Math.max(0,(c[id]||0)+d)}))
  return <div className="modal-backdrop" onClick={onClose}><div className="modal-card order-modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><span className="modal-icon"><ShoppingBag size={17}/></span><h2>Um pedido especial ✨</h2><p>Monte o pedido e deixe o resto com a cozinha.</p></div><button className="icon-button" onClick={onClose}><X size={18}/></button></div><label className="field-label">Nome do cliente<input autoFocus placeholder="Ex.: Marina Costa" value={customer} onChange={e=>setCustomer(e.target.value)}/></label><div className="order-type-tabs">{['Retirada','Entrega','Salão'].map(x=><button className={type===x?'selected':''} key={x} onClick={()=>setType(x)}>{x==='Retirada'?<ShoppingBag size={14}/>:x==='Entrega'?<Bike size={14}/>:<UtensilsCrossed size={14}/>} {x}</button>)}</div><label className="inline-search modal-search"><Search size={15}/><input placeholder="Buscar no cardápio" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="order-product-list">{available.map(p=><div className="order-product" key={p.id}><span className={`order-product-emoji ${p.color}`}><DishMark product={p} size={17}/></span><span><b>{p.name}</b><small>{money(p.price)}</small></span><div className="qty-control"><button onClick={()=>setQty(p.id,-1)} disabled={!cart[p.id]}><Minus size={12}/></button><b>{cart[p.id]||0}</b><button onClick={()=>setQty(p.id,1)}><Plus size={12}/></button></div></div>)}</div><div className="order-total"><span>Total do pedido</span><b>{money(total)}</b></div><button className="button button-dark order-submit" disabled={!customer.trim()||total===0} onClick={()=>onSave({id:`LF-${2842+Math.floor(Math.random()*50)}`,name:customer,initials:customer.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase(),type: type==='Salão'?'Salão · Mesa 01':type,items:products.filter(p=>cart[p.id]).map(p=>({name:p.name,quantity:cart[p.id]})),total,status:'Novo pedido',time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),ago:'agora',color:['rose','blue','gold','green','purple'][Math.floor(Math.random()*5)]})}><Plus size={16}/> Criar pedido <span>· {money(total)}</span></button></div></div>
}

function Toast({ message, close }) { useEffect(() => { if (!message) return; const id = setTimeout(close, 3200); return () => clearTimeout(id) }, [message, close]); return message ? <div className="toast"><CheckCircle2 size={17}/><span>{message}</span><button onClick={close}><X size={15}/></button></div> : null }

function SignIn({ onSignedIn }) {
  const [signup,setSignup]=useState(false)
  const [signupRole,setSignupRole]=useState('customer')
  const [fullName,setFullName]=useState('')
  const [signupPhone,setSignupPhone]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [confirmPassword,setConfirmPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [showConfirmPassword,setShowConfirmPassword]=useState(false)
  const [documentType,setDocumentType]=useState('CPF')
  const [documentNumber,setDocumentNumber]=useState('')
  const [vehicleColor,setVehicleColor]=useState('')
  const [vehiclePlate,setVehiclePlate]=useState('')
  const [vehicleBrand,setVehicleBrand]=useState('')
  const [vehicleModel,setVehicleModel]=useState('')
  const [error,setError]=useState('')
  const [info,setInfo]=useState('')
  const [busy,setBusy]=useState(false)
  const cpfOkay=validCpf(documentNumber)
  const rgOkay=validRgFormat(documentNumber)
  const documentOkay=documentType==='CPF'?cpfOkay:rgOkay
  const submit=async e=>{
    e.preventDefault();setError('')
    if(signup&&password!==confirmPassword){setError('As senhas não coincidem. Confira os dois campos.');return}
    if(signup&&digits(signupPhone).length!==11){setError('Informe celular com DDD, incluindo os 9 dígitos do número.');return}
    if(signup&&signupRole==='motoboy'&&!documentOkay){setError(documentType==='CPF'?'CPF inválido. Confira os números e os dígitos verificadores.':'Confira o formato do RG (5 a 14 letras ou números).');return}
    if(signup&&signupRole==='motoboy'&&!validVehiclePlate(vehiclePlate)){setError('Confira a placa: use o formato ABC1D23 (3 letras, 1 número, 1 caractere alfanumérico e 2 números).');return}
    setBusy(true)
    try{
      if(!supabase){setError('Configure o Supabase para criar uma conta.');return}
      if(signup){
        const metadata={full_name:fullName.trim(),account_type:signupRole,phone:digits(signupPhone)}
        if(signupRole==='motoboy')Object.assign(metadata,{document_type:documentType,document_number:documentNumber,vehicle_color:vehicleColor.trim(),vehicle_plate:vehiclePlate.trim().toUpperCase(),vehicle_brand:vehicleBrand.trim(),vehicle_model:vehicleModel.trim()})
        const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:metadata}})
        if(error){setError(error.message.includes('document')||error.message.includes('Documento')?'Não foi possível validar o documento. Confira os dados e tente novamente.':'Não foi possível criar a conta. Confira os campos ou tente entrar se já tiver cadastro.');return}
        if(data.session){const {data:refreshed}=await supabase.auth.refreshSession();onSignedIn(refreshed.session||data.session)}
        else setError('Cadastro recebido. Confirme seu e-mail para ativar a conta.')
        return
      }
      const localEmail=import.meta.env.DEV?import.meta.env.VITE_LOCAL_DEMO_EMAIL?.trim().toLowerCase():''
      const localHash=import.meta.env.DEV?import.meta.env.VITE_LOCAL_DEMO_PASSWORD_SHA256:''
      if(localEmail&&localHash&&email.trim().toLowerCase()===localEmail){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));const candidate=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');if(candidate===localHash){onSignedIn({localDemo:true,user:{email:localEmail,user_metadata:{full_name:'Lusky Food'},app_metadata:{role:'owner'}}});return}setError('A senha do acesso local está incorreta.');return}
      const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password})
      if(error)setError('Não conseguimos entrar com esses dados. Confira seu e-mail e sua senha.')
      else onSignedIn(data.session)
    }catch{setError('A conexão falhou. Confira sua internet e tente novamente.')}
    finally{setBusy(false)}
  }
  const demo=role=>onSignedIn({localDemo:true,user:{id:`demo-${role}`,email:`${role}@luskyfood.local`,user_metadata:{full_name:role==='customer'?'Cliente Lusky':role==='motoboy'?'Rafael · Entregador':'Lusky Food',account_type:role==='customer'?'customer':undefined},app_metadata:{role}}})
  const recover=async()=>{setError('');setInfo('');if(!email.includes('@')){setError('Informe seu e-mail para receber o link de recuperação.');return}if(!supabase){setError('Conecte o Supabase para recuperar o acesso.');return}const {error:resetError}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin});if(resetError)setError('Não foi possível enviar o link. Tente novamente.');else setInfo('Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.')}
  const passwordField=(label,value,setValue,visible,setVisible,autocomplete,confirmation=false)=><label className="field-label">{label}<span className="password-control"><input type={visible?'text':'password'} autoComplete={autocomplete} minLength={signup?8:undefined} required placeholder={confirmation?'Digite a senha novamente':signup?'Pelo menos 8 caracteres':'Sua senha'} value={value} onChange={e=>setValue(e.target.value)}/><button type="button" className="password-toggle" aria-label={visible?'Ocultar senha':'Mostrar senha'} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>
  return <div className="auth-page"><div className={`auth-card ${signup&&signupRole==='motoboy'?'driver-signup':''}`}><Brand/><div className="auth-welcome"><span className="auth-kicker">SABOR, PEDIDOS E ENTREGA</span><h1>{signup?signupRole==='motoboy'?<>Sua próxima rota<br/>começa <em>aqui.</em></>:<>Seu próximo prato<br/>começa <em>aqui.</em></>:<>A Lusky Food<br/>no seu <em>ritmo.</em></>}</h1><p>{signup?signupRole==='motoboy'?'Cadastre seu perfil para receber e organizar entregas.':'Crie sua conta para pedir e acompanhar até a sua porta.':'Entre para acompanhar seus pedidos ou cuidar da operação.'}</p></div><div className="auth-mode-tabs"><button className={!signup?'selected':''} onClick={()=>{setSignup(false);setError('')}}>Entrar</button><button className={signup&&signupRole==='customer'?'selected':''} onClick={()=>{setSignup(true);setSignupRole('customer');setError('')}}>Cliente</button><button className={signup&&signupRole==='motoboy'?'selected':''} onClick={()=>{setSignup(true);setSignupRole('motoboy');setError('')}}>Motoboy</button></div><form onSubmit={submit}>{signup&&<label className="field-label">Nome completo<input autoComplete="name" required minLength={3} placeholder="Nome e sobrenome" value={fullName} onChange={e=>setFullName(e.target.value)}/></label>}{signup&&<label className="field-label">Celular com DDD<input required inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={maskPhone(signupPhone)} onChange={e=>setSignupPhone(digits(e.target.value).slice(0,11))}/></label>}<label className="field-label">E-mail<input type="email" autoComplete="username" required placeholder="voce@email.com" value={email} onChange={e=>setEmail(e.target.value)}/></label>{signupRole==='motoboy'&&signup&&<><div className="signup-subheading"><FileCheck2 size={16}/><span>Documento e veículo</span></div><div className="document-row"><label className="field-label">Documento<select value={documentType} onChange={e=>{setDocumentType(e.target.value);setDocumentNumber('')}}><option value="CPF">CPF</option><option value="RG">RG</option></select></label><label className="field-label">Número do {documentType}<input required autoComplete="off" placeholder={documentType==='CPF'?'000.000.000-00':'Número do RG'} value={documentNumber} onChange={e=>setDocumentNumber(documentType==='CPF'?maskCpf(e.target.value):e.target.value.toUpperCase())}/></label></div><div className={`document-validation ${documentNumber?(documentOkay?'valid':'invalid'):''}`} aria-live="polite"><span/>{documentNumber?(documentOkay?documentType==='CPF'?'CPF válido pelo dígito verificador':'Formato de RG aceito':'Confira o número do documento'):documentType==='RG'?'O RG será verificado pelo formato; a autenticidade depende da conferência do documento.':'O CPF será conferido pelos dígitos verificadores.'}</div><div className="vehicle-grid"><label className="field-label">Cor<input required autoComplete="off" placeholder="Ex.: Preta" value={vehicleColor} onChange={e=>setVehicleColor(e.target.value)}/></label><label className="field-label">Placa<input required autoComplete="off" maxLength={7} placeholder="ABC1D23" value={vehiclePlate} onChange={e=>setVehiclePlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))}/></label><label className="field-label">Marca<input required autoComplete="off" placeholder="Ex.: Honda" value={vehicleBrand} onChange={e=>setVehicleBrand(e.target.value)}/></label><label className="field-label">Modelo<input required autoComplete="off" placeholder="Ex.: CG 160" value={vehicleModel} onChange={e=>setVehicleModel(e.target.value)}/></label></div></>}{passwordField('Senha',password,setPassword,showPassword,setShowPassword,signup?'new-password':'current-password')}{signup&&passwordField('Confirmar senha',confirmPassword,setConfirmPassword,showConfirmPassword,setShowConfirmPassword,'new-password',true)}{error&&<div className="auth-error"><CircleAlert size={15}/>{error}</div>}<button className="button button-dark auth-submit" disabled={busy}>{busy?'Aguarde…':signup?signupRole==='motoboy'?'Criar conta de motoboy':'Criar conta de cliente':'Entrar na Lusky Food'}<ArrowRight size={15}/></button></form>{!signup&&<button type="button" className="text-button" onClick={recover}>Esqueci minha senha</button>}{info&&<p className="address-hint" role="status">{info}</p>}<div className="auth-footer"><span className="pulse-dot"/> Seus pedidos ficam visíveis somente na sua conta</div>{import.meta.env.DEV&&<div className="local-role-demos"><small>AMBIENTE LOCAL · VISUALIZAR EXPERIÊNCIA</small><div><button onClick={()=>demo('owner')}>Admin</button><button onClick={()=>demo('customer')}>Cliente</button><button onClick={()=>demo('motoboy')}>Motoboy</button></div></div>}</div><div className="auth-decoration"><div className="auth-orbit orbit-one"/><div className="auth-orbit orbit-two"/><div className="auth-food"><img src="/images/frango-xadrez.jpg" alt="Prato da Lusky Food"/></div><span className="auth-sparkle spark-a">✳</span><span className="auth-sparkle spark-b">✦</span><span className="auth-caption">feito com sabor <span>♥</span></span></div></div>
}

function ResetPassword({ onDone }) {
  const [password,setPassword]=useState('')
  const [confirm,setConfirm]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const submit=async event=>{event.preventDefault();if(password.length<8||password!==confirm){setError('Use pelo menos 8 caracteres e confirme a mesma senha.');return}setBusy(true);const {error:updateError}=await supabase.auth.updateUser({password});setBusy(false);if(updateError){setError('Não foi possível alterar a senha. Abra novamente o link recebido por e-mail.');return}await supabase.auth.signOut();onDone()}
  return <div className="auth-page"><div className="auth-card"><Brand/><h1>Crie uma nova senha</h1><form onSubmit={submit}><label className="field-label">Nova senha<input type="password" minLength={8} required value={password} onChange={event=>setPassword(event.target.value)}/></label><label className="field-label">Repita a senha<input type="password" minLength={8} required value={confirm} onChange={event=>setConfirm(event.target.value)}/></label>{error&&<p className="auth-error" role="alert">{error}</p>}<button className="button button-dark" disabled={busy}>{busy?'Salvando…':'Salvar nova senha'}</button></form></div></div>
}

export default function App() {
  const [page,setPage]=useState('Visão geral')
  const [orders,setOrders]=useState(()=>supabase?[]:readOrders())
  const [products,setProducts]=useState(()=>supabase?[]:readProducts())
  const [drivers,setDrivers]=useState([])
  const [restaurant,setRestaurant]=useState(null)
  const [mobileOpen,setMobileOpen]=useState(false)
  const [orderModal,setOrderModal]=useState(false)
  const [productModal,setProductModal]=useState(null)
  const [toast,setToast]=useState('')
  const [session,setSession]=useState(null)
  const [previewRole,setPreviewRole]=useState(null)
  const [authChecked,setAuthChecked]=useState(!supabase)
  const [recovery,setRecovery]=useState(false)
  const [demoLoaded,setDemoLoaded]=useState(false)
  const [syncError,setSyncError]=useState('')
  const notify=message=>setToast(message)
  useEffect(()=>{
    if(!supabase)return
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setAuthChecked(true)})
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{setSession(next);setAuthChecked(true);if(event==='PASSWORD_RECOVERY')setRecovery(true)})
    return()=>subscription.unsubscribe()
  },[])
  useEffect(()=>{if(!supabase||(session?.localDemo&&demoLoaded))localStorage.setItem(orderKey,JSON.stringify(orders))},[orders,session?.localDemo,demoLoaded])
  useEffect(()=>{if(!supabase||(session?.localDemo&&demoLoaded))localStorage.setItem(productKey,JSON.stringify(products))},[products,session?.localDemo,demoLoaded])
  useEffect(()=>{
    if (!supabase||!session) { setDrivers([]);setDemoLoaded(false); return }
    if(session.localDemo){setOrders(readOrders());setProducts(readProducts());setDrivers(demoDrivers);setRestaurant(readDemoRestaurant());setSyncError('');setDemoLoaded(true);return}
    setDemoLoaded(false)
    let alive=true
    const load=async()=>{
      const [p,o,d,s]=await Promise.all([supabase.from('lusky_products').select('*').order('created_at'),fetchAllOrders(),supabase.from('lusky_motoboy_profiles').select('*').order('created_at',{ascending:false}),supabase.from('lusky_restaurant_settings').select('*').eq('id',1).maybeSingle()])
      if(!alive)return
      setSyncError([p.error,o.error,d.error,s.error].some(Boolean)?'Não foi possível atualizar todos os dados do banco. Verifique a conexão e recarregue a página.':'')
      if(!p.error&&p.data.length)setProducts(p.data.map(x=>({id:x.id,name:x.name,category:x.category,price:Number(x.price),description:x.description||'',emoji:x.emoji||'',icon:x.icon||'fork',image_url:x.image_url||'',color:x.color||'sage',available:x.available,sold:x.sold||0})))
      if(!o.error)setOrders(o.data.map(x=>({...x,db_id:x.id,id:`LF-${x.order_number}`,name:x.customer_name,initials:x.customer_name.split(' ').map(y=>y[0]).slice(0,2).join('').toUpperCase(),type:x.order_type,items:x.items||[],total:Number(x.total),time:new Date(x.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),ago:'',color:'green',address:x.delivery_address||'',pickup_code:'',delivery_code:''})))
      if(!s.error)setRestaurant(s.data)
      if(!d.error&&d.data){
        const currentRole=session.user?.app_metadata?.role||session.user?.user_metadata?.account_type
        const canReadDocuments=['owner','manager','staff','motoboy'].includes(currentRole)
        const withDocuments=canReadDocuments?await Promise.all(d.data.map(async driver=>{const {data}=await supabase.rpc('lusky_driver_document_status',{p_driver_id:driver.id});return {...driver,...(data?.[0]||{})}})):d.data
        if(alive)setDrivers(withDocuments)
      }
    }
    const safeLoad=()=>load().catch(()=>{if(alive)setSyncError('Não foi possível alcançar o banco. Verifique a conexão e recarregue a página.')})
    safeLoad()
    const channel=supabase.channel('lusky-live').on('postgres_changes',{event:'*',schema:'public',table:'lusky_orders'},safeLoad).subscribe(status=>{if(status==='SUBSCRIBED')safeLoad()})
    return()=>{alive=false;supabase.removeChannel(channel)}
  },[session?.user?.id,session?.localDemo])
  const saveOrder=async order=>{
    if(supabase&&!session?.localDemo){
      const {data,error}=await supabase.rpc('lusky_place_order',{p_request_id:order.request_id||crypto.randomUUID(),p_customer_name:order.name,p_customer_phone:order.phone||'',p_order_type:order.type,p_address:order.address||null,p_items:order.items.map(item=>({product_id:item.product_id||products.find(p=>p.name===item.name)?.id,quantity:item.quantity,note:item.note||''})),p_payment_method:order.payment_method||'cash'})
      if(error||!data){const message=error?.message||'Pedido não confirmado pelo banco.';notify(message);return {ok:false,error:message}}
      const saved={...data,db_id:data.id,id:`LF-${data.order_number}`,name:data.customer_name,type:data.order_type,items:data.items||[],total:Number(data.total),time:new Date(data.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),address:data.delivery_address||'',pickup_code:'',delivery_code:''}
      setOrders(list=>[saved,...list.filter(item=>item.id!==saved.id)]);setOrderModal(false);notify(`Pedido ${saved.id} confirmado.`);return {ok:true,id:saved.id}
    }
    const saved={...order,id:`LF-${Date.now()}`,created_by:session?.user?.id||null,status:'Novo pedido',created_at:new Date().toISOString(),total:order.items.reduce((sum,item)=>sum+(products.find(p=>p.id===item.product_id)?.price||0)*item.quantity,0),localCustomer:session?.user?.email}
    setOrders(list=>[saved,...list]);setOrderModal(false);notify('Pedido de demonstração criado neste navegador.');return {ok:true,id:saved.id}
  }
  const assignDriver=async(order,driverId)=>{if(supabase&&!session?.localDemo){const {data,error}=await supabase.rpc('lusky_assign_driver',{p_order_number:Number(String(order.id).replace(/\D/g,'')),p_driver_id:driverId,p_route_order:order.route_order||null});if(error||data!==true){notify(error?.message||'Não foi possível atribuir o motoboy.');return false}}setOrders(list=>list.map(item=>item.id===order.id?{...item,assigned_driver:driverId}:item));notify(driverId?'Motoboy atribuído.':'Atribuição removida.');return true}
  const saveRouteSequence=async(driverId,numbers)=>{if(!supabase||session?.localDemo)return false;const {data,error}=await supabase.rpc('lusky_set_route_sequence',{p_driver_id:driverId,p_order_numbers:numbers});if(error||data!==true){notify(error?.message||'Não foi possível salvar a sequência.');return false}setOrders(list=>list.map(item=>{const index=numbers.indexOf(Number(String(item.id).replace(/\D/g,'')));return index>=0?{...item,route_order:index+1}:item}));notify('Sequência da rota salva.');return true}
  const updateStatus=async(id,status,code)=>{const currentRole=session?.user?.app_metadata?.role||session?.user?.user_metadata?.account_type;if(supabase&&!session?.localDemo){const number=Number(String(id).replace(/\D/g,''));const call=currentRole==='motoboy'?supabase.rpc('lusky_confirm_handoff',{p_order_number:number,p_action:status==='Entregue'?'delivery':'pickup',p_code:code||''}):supabase.rpc('lusky_team_transition',{p_order_number:number,p_to_status:status,p_reason:''});const {data,error}=await call;if(error||data!==true){notify(error?.message||'Etapa não confirmada.');return false}}setOrders(list=>list.map(o=>o.id===id?{...o,status}:o));notify(`Pedido atualizado: ${status.toLowerCase()}.`);return true}
  const saveProduct = async product => {
    let next = { ...product }
    delete next.imageFile
    if (product.imageFile) {
      const bitmap = await createImageBitmap(product.imageFile)
      const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(bitmap.width * scale)
      canvas.height = Math.round(bitmap.height * scale)
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .82))
      if (!blob) { notify('Não foi possível preparar a foto.'); return false }
      if (supabase && !session?.localDemo) {
        const path = `${crypto.randomUUID()}.webp`
        const { error } = await supabase.storage.from('lusky-dishes').upload(path, blob, { contentType: 'image/webp', upsert: false })
        if (error) { notify('Não foi possível enviar a foto.'); return false }
        next.image_url = supabase.storage.from('lusky-dishes').getPublicUrl(path).data.publicUrl
      } else {
        next.image_url = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob) })
      }
    }
    if (supabase && !session?.localDemo) {
      const { data, error } = await supabase.from('lusky_products').upsert({
        ...(String(next.id).startsWith('p-') ? {} : { id: next.id }),
        name: next.name, category: next.category, price: next.price, description: next.description,
        emoji: next.emoji || '', icon: next.icon || 'fork', image_url: next.image_url || null,
        color: next.color, available: next.available, sold: next.sold,
      }).select().single()
      if (error || !data) { notify(error?.message || 'Prato não salvo no banco.'); return false }
      next = { ...next, id: data.id }
    }
    setProducts(list => list.some(item => item.id === next.id) ? list.map(item => item.id === next.id ? next : item) : [next, ...list])
    notify('Prato salvo no cardápio.')
    return true
  }
  if(supabase&&!authChecked)return <div className="auth-loading"><span className="pulse-dot"/> Conectando à Lusky Food…</div>
  if(recovery)return <ResetPassword onDone={()=>setRecovery(false)}/>
  if(supabase&&!session)return <SignIn onSignedIn={setSession}/>
  const role=previewRole||session?.user?.app_metadata?.role||session?.user?.user_metadata?.account_type||'owner'
  const canManage=!supabase||session?.localDemo||['owner','manager','staff'].includes(role)
  const canManageUsers=role==='owner'
  const openOrder=canManage?()=>setOrderModal(true):null
  const changeStatus=canManage?updateStatus:null
  if(role==='customer')return <CustomerPortalV2 products={products} orders={orders} drivers={drivers} restaurant={restaurant} session={session} syncError={syncError} preview={!!previewRole} onPlaceOrder={saveOrder} onSignOut={()=>previewRole?setPreviewRole(null):session?.localDemo?setSession(null):supabase?.auth.signOut()}/>
  if(role==='motoboy')return <RiderPortalV2 orders={orders} restaurant={restaurant} syncError={syncError} user={session?.user} demo={!!session?.localDemo} driverProfile={drivers.find(driver=>driver.id===session?.user?.id)} onDriverSaved={driver=>setDrivers(list=>list.map(item=>item.id===driver.id?{...item,...driver}:item))} onStatus={updateStatus} onSignOut={()=>session?.localDemo?setSession(null):supabase?.auth.signOut()}/>
  const content=page==='Visão geral'?<OverviewPage orders={orders} products={products} setPage={setPage} onNewOrder={openOrder}/>:page==='Pedidos'?<OpsOrdersPage orders={orders} drivers={drivers} restaurant={restaurant} onStatus={changeStatus} onAssignDriver={assignDriver} onSequence={saveRouteSequence} onNewOrder={openOrder} remote={!!supabase&&!session?.localDemo}/>:page==='Cardápio'?<MenuPage products={products} onChange={saveProduct} canEdit={canManage} onAdd={canManage?product=>setProductModal(product||{}):null} onPreview={()=>setPreviewRole('customer')}/>:page==='Clientes'?<OpsCustomersPage orders={orders}/>:page==='Motoboys'?<MotoboysPage drivers={drivers}/>:page==='Usuários'&&canManageUsers?(session?.localDemo?<DemoUsersPage notify={notify}/>:<AdminUsersPage client={supabase} currentUser={session.user} notify={notify}/>):page==='Relatórios'?<OpsReportsPage orders={orders}/>:page==='Minha conta'?<AccountSettings user={session?.user} role={role} demo={!!session?.localDemo} onSignOut={()=>session?.localDemo?setSession(null):supabase?.auth.signOut()}/>:<RestaurantSettings restaurant={restaurant} onSaved={value=>{setRestaurant(value);if(session?.localDemo)localStorage.setItem(demoRestaurantKey,JSON.stringify(value))}} demo={!!session?.localDemo}/>
  return <div className="app-shell"><Sidebar page={page} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} canManageUsers={canManageUsers}/><main className="main-area"><Header page={page} setPage={setPage} setMobileOpen={setMobileOpen} onNewOrder={()=>setOrderModal(true)} onSignOut={()=>session?.localDemo?setSession(null):supabase?.auth.signOut()}/><div className="content-area">{session?.localDemo&&<div className="demo-data-note"><CircleHelp size={15}/><span><b>Modo demonstração</b> · pedidos e indicadores exibidos são exemplos locais.</span></div>}{syncError&&<p className="checkout-error" role="alert">{syncError}</p>}{content}<footer className="app-footer"><Brand/><span>Feito com sabor e cuidado <span>♥</span> · © 2026 Lusky Food</span></footer></div></main>{orderModal&&<AdminOrderModal products={products} restaurant={restaurant} onClose={()=>setOrderModal(false)} onSave={saveOrder}/ >}{productModal!==null&&<ProductEditor product={productModal.id?productModal:null} onClose={()=>setProductModal(null)} onSave={saveProduct}/>}<Toast message={toast} close={()=>setToast('')}/></div>
}



