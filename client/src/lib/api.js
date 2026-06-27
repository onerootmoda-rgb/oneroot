const SESSION_KEY = 'or-session-id'

// UUID persistente por navegador para identificar el carrito de usuarios anónimos.
// No es autenticación — solo correlaciona el carrito en cart_items por sessionId.
function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, id) }
  return id
}

// Wrapper central de fetch: siempre incluye cookies (JWT admin) y el sessionId del carrito.
// Nunca pasar credentials:'include' manualmente en los llamadores — ya está aquí.
export async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-session-id': getSessionId(),
      ...(opts.headers || {}),
    },
  })
  return res
}

// Formato moneda colombiana: $ 89.900
export function fmtCOP(n) {
  return '$ ' + Math.round(n).toLocaleString('es-CO')
}
