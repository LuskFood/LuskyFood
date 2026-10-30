// A confirmação real acontece somente na RPC; falha de rede não altera o pedido local.
export async function confirmHandoffRequest(client, { orderNumber, action, driverId, code }) {
  if (!Number.isSafeInteger(orderNumber) || orderNumber < 1 || !['pickup', 'delivery'].includes(action)) {
    return { ok:false, message:'Dados da confirmação inválidos.' }
  }
  if (action === 'pickup' && !driverId) return { ok:false, message:'Confira o motoboy atribuído.' }
  if (action === 'delivery' && !/^\d{6}$/.test(String(code || ''))) return { ok:false, message:'Digite os seis números informados pelo cliente.' }
  try {
    const { data, error } = await client.rpc(
      action === 'pickup' ? 'lusky_team_confirm_pickup' : 'lusky_confirm_handoff',
      action === 'pickup' ? { p_order_number:orderNumber, p_driver_id:driverId } : { p_order_number:orderNumber, p_action:'delivery', p_code:code },
    )
    if (error) return { ok:false, message:/temporariamente bloqueado/i.test(error.message || '') ? 'Código temporariamente bloqueado. Tente mais tarde.' : 'Não foi possível confirmar. Confira o pedido e tente novamente.' }
    if (data !== true) return { ok:false, message:'Código incorreto ou etapa indisponível.' }
    return { ok:true }
  } catch {
    return { ok:false, message:'Falha de conexão. Atualize a tela e confira o estado do pedido antes de tentar novamente.' }
  }
}
