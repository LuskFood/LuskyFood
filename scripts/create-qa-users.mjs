import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente local. A chave service role nunca deve ser VITE_ nem ir para o navegador.')
  process.exit(1)
}

const adminPassword = process.env.QA_ADMIN_PASSWORD
if (!adminPassword || adminPassword.length < 8) {
  console.error('Defina QA_ADMIN_PASSWORD (mínimo 8 caracteres) com a senha do usuário administrativo que você solicitou.')
  process.exit(1)
}

const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const credentials = [
  { email: 'luskyfood1@gmail.com', password: adminPassword, role: 'owner', metadata: { full_name: 'Lusky Food', account_type: 'owner' } },
  { email: 'qa.cliente@luskyfood.dev', password: randomBytes(18).toString('base64url'), role: 'customer', metadata: { full_name: 'Cliente QA Lusky', account_type: 'customer' } },
  { email: 'qa.motoboy@luskyfood.dev', password: randomBytes(18).toString('base64url'), role: 'motoboy', metadata: {
    full_name: 'Motoboy QA Lusky', account_type: 'motoboy', document_type: 'CPF', document_number: '529.982.247-25',
    vehicle_color: 'Preto', vehicle_plate: 'BRA2E19', vehicle_brand: 'Honda', vehicle_model: 'CG 160'
  } }
]

async function findUser(email) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const user = data.users.find(item => item.email?.toLowerCase() === email.toLowerCase())
    if (user) return user
    if (data.users.length < 1000) return null
  }
  throw new Error('A busca excedeu 20 páginas de usuários; interrompida por segurança.')
}

for (const item of credentials) {
  const existing = await findUser(item.email)
  const payload = {
    email: item.email,
    password: item.password,
    email_confirm: true,
    user_metadata: item.metadata,
    app_metadata: { ...(existing?.app_metadata || {}), role: item.role }
  }
  const result = existing
    ? await client.auth.admin.updateUserById(existing.id, payload)
    : await client.auth.admin.createUser(payload)
  if (result.error) throw new Error(`${item.email}: ${result.error.message}`)
}

console.log('Contas QA criadas/atualizadas. Guarde estas senhas agora; as duas últimas são novas a cada execução:')
for (const { email, password, role } of credentials) console.log(`${role}\t${email}\t${password}`)
