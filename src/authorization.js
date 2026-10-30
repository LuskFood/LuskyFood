// App metadata is controlled by the authentication backend; user metadata is editable.
export function applicationRole(session, configured, allowDemo = false) {
  if (!configured) return allowDemo ? 'owner' : null
  if (!session) return null
  const role = session.user?.app_metadata?.role || 'customer'
  return ['owner', 'manager', 'staff', 'customer', 'motoboy'].includes(role) ? role : null
}
