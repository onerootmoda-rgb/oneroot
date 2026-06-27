export const STATUS_BADGE = {
  pending:    'bg-primary text-on-primary',
  processing: 'border border-primary text-primary',
  completed:  'border border-primary text-secondary',
  cancelled:  'border border-error text-error',
}

export const STATUS_LABEL = {
  pending:    'PENDIENTE',
  processing: 'EN PROCESO',
  completed:  'COMPLETADO',
  cancelled:  'CANCELADO',
}

export const ORDER_STATUSES = ['all', 'pending', 'processing', 'completed', 'cancelled']

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: '2-digit',
  }).toUpperCase()
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase()
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  return `${date} ${time}`
}
