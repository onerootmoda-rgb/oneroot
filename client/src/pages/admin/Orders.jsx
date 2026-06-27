import { useState, useEffect } from 'react'
import { apiFetch, fmtCOP } from '@/lib/api'
import { fmtDate, STATUS_LABEL, ORDER_STATUSES } from '@/lib/utils'
import { useToast } from '@/components/Toast'

export default function Orders() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [notes, setNotes] = useState({})
  const [saving, setSaving] = useState(null)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== 'all') params.set('status', filter)
    if (search.trim()) params.set('q', search.trim())
    const res = await apiFetch(`/api/orders?${params}`).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setOrders(d.orders || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  function handleSearch(e) {
    e.preventDefault()
    load()
  }

  async function updateStatus(id, status) {
    setSaving(id)
    const orderNotes = notes[id] ?? (orders.find(o => o.id === id)?.notes || '')
    const res = await apiFetch(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes: orderNotes }),
    }).catch(() => null)
    if (res?.ok) {
      toast('Estado actualizado.', 'success')
      load()
    } else {
      toast('Error al actualizar estado.', 'error')
    }
    setSaving(null)
  }

  async function saveNotes(id) {
    setSaving(id + '-notes')
    const currentOrder = orders.find(o => o.id === id)
    const res = await apiFetch(`/api/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: currentOrder.status, notes: notes[id] ?? '' }),
    }).catch(() => null)
    if (res?.ok) toast('Notas guardadas.', 'success')
    else toast('Error al guardar notas.', 'error')
    setSaving(null)
  }

  const STATUS_FLOW = { pending: 'processing', processing: 'completed' }

  return (
    <div className="p-lg space-y-lg">
      <h1 className="font-headline-lg text-headline-lg text-primary">PEDIDOS</h1>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col md:flex-row gap-md items-start md:items-center flex-wrap">
        <div className="flex gap-sm flex-wrap">
          {ORDER_STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`font-label-caps text-label-caps px-md py-xs border transition-all ${
                filter === s ? 'bg-primary text-on-primary border-primary' : 'border-outline text-secondary hover:border-primary hover:text-primary'
              }`}>
              {s === 'all' ? 'TODOS' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex gap-xs ml-auto">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="BUSCAR POR NOMBRE O ID..."
            className="border border-primary px-md py-xs font-label-caps text-label-caps text-sm focus:outline-none w-56"
          />
          <button type="submit" className="font-label-caps text-label-caps border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all">
            BUSCAR
          </button>
        </form>
      </div>

      {/* Tabla */}
      <div className="border border-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md">
            <thead>
              <tr className="border-b border-primary font-label-caps text-[10px] text-secondary bg-surface-container-low">
                {['', 'ID', 'CLIENTE', 'CIUDAD', 'FECHA', 'ESTADO', 'TOTAL', 'ACCIÓN'].map(h => (
                  <th key={h} className="px-md py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-md py-lg text-center font-label-caps text-[10px] text-secondary">CARGANDO...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={8} className="px-md py-lg text-center font-label-caps text-[10px] text-secondary">SIN PEDIDOS</td></tr>
              ) : orders.map(o => (
                <>
                  <tr key={o.id}
                    className={`border-b border-primary/10 hover:bg-surface-container cursor-pointer transition-colors ${expanded === o.id ? 'bg-surface-container' : ''}`}
                    onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  >
                    <td className="px-md py-4">
                      <span className={`material-symbols-outlined text-[16px] text-secondary transition-transform ${expanded === o.id ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </td>
                    <td className="px-md py-4 font-label-caps text-[11px]">{o.id}</td>
                    <td className="px-md py-4 text-sm">{o.customerName || '—'}</td>
                    <td className="px-md py-4 font-label-caps text-[10px] text-secondary">{o.customerCity || '—'}</td>
                    <td className="px-md py-4 font-label-caps text-[10px] text-secondary whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    <td className="px-md py-4">
                      <span className={`px-2 py-0.5 text-[10px] font-label-caps ${
                        o.status === 'pending'    ? 'bg-primary text-on-primary' :
                        o.status === 'cancelled'  ? 'border border-red-400 text-red-500' :
                        o.status === 'completed'  ? 'bg-green-100 text-green-800 border border-green-300' :
                        'border border-primary text-secondary'
                      }`}>
                        {STATUS_LABEL[o.status] || o.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-md py-4 font-label-caps">{fmtCOP(o.total)}</td>
                    <td className="px-md py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-xs">
                        {STATUS_FLOW[o.status] && (
                          <button
                            disabled={saving === o.id}
                            onClick={() => updateStatus(o.id, STATUS_FLOW[o.status])}
                            className="font-label-caps text-[10px] border border-primary px-xs py-1 hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
                          >
                            AVANZAR
                          </button>
                        )}
                        {o.status !== 'cancelled' && o.status !== 'completed' && (
                          <button
                            disabled={saving === o.id}
                            onClick={() => updateStatus(o.id, 'cancelled')}
                            className="font-label-caps text-[10px] border border-red-400 text-red-500 px-xs py-1 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40"
                          >
                            CANCELAR
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Fila expandida con detalle completo */}
                  {expanded === o.id && (
                    <tr key={o.id + '-detail'} className="bg-surface-container-low border-b border-primary/10">
                      <td colSpan={8} className="px-lg py-md">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">

                          {/* Datos del cliente */}
                          <div>
                            <p className="font-label-caps text-[10px] text-secondary mb-sm">DATOS DEL CLIENTE</p>
                            <div className="space-y-xs font-body-md text-sm">
                              <p><span className="font-label-caps text-[10px] text-secondary">NOMBRE: </span>{o.customerName || '—'}</p>
                              <p><span className="font-label-caps text-[10px] text-secondary">TELÉFONO: </span>
                                <a href={`tel:${o.customerPhone}`} className="hover:underline">{o.customerPhone || '—'}</a>
                              </p>
                              {o.customerEmail && (
                                <p><span className="font-label-caps text-[10px] text-secondary">EMAIL: </span>
                                  <a href={`mailto:${o.customerEmail}`} className="hover:underline">{o.customerEmail}</a>
                                </p>
                              )}
                              <p><span className="font-label-caps text-[10px] text-secondary">DIRECCIÓN: </span>{o.customerAddress || '—'}</p>
                              {o.customerBarrio && (
                                <p><span className="font-label-caps text-[10px] text-secondary">BARRIO: </span>{o.customerBarrio}</p>
                              )}
                              <p><span className="font-label-caps text-[10px] text-secondary">CIUDAD: </span>{o.customerCity || '—'}</p>
                            </div>

                            <div className="flex gap-xs mt-md">
                              {o.customerPhone && (
                                <a href={`https://wa.me/57${o.customerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                  className="font-label-caps text-[10px] border border-primary px-xs py-1 hover:bg-primary hover:text-on-primary transition-all">
                                  WHATSAPP
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Productos */}
                          <div>
                            <p className="font-label-caps text-[10px] text-secondary mb-sm">PRODUCTOS</p>
                            <div className="space-y-sm">
                              {(o.items || []).map((item, idx) => (
                                <div key={idx} className="flex gap-sm items-center">
                                  {item.image && (
                                    <img src={item.image} alt={item.name} className="w-10 h-14 object-cover border border-primary/20" />
                                  )}
                                  <div>
                                    <p className="font-body-md text-sm">{item.name}</p>
                                    <p className="font-label-caps text-[10px] text-secondary">
                                      Talla {item.size} · {item.quantity}× · {fmtCOP(item.price)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <p className="font-label-caps text-label-caps border-t border-primary/20 pt-sm mt-sm">
                                TOTAL: {fmtCOP(o.total)}
                              </p>
                            </div>
                          </div>

                          {/* Notas y estado */}
                          <div>
                            <p className="font-label-caps text-[10px] text-secondary mb-sm">NOTAS INTERNAS</p>
                            <textarea
                              rows={4}
                              value={notes[o.id] ?? (o.notes || '')}
                              onChange={e => setNotes(n => ({ ...n, [o.id]: e.target.value }))}
                              placeholder="Agregar nota interna..."
                              className="w-full border border-primary/30 px-sm py-xs font-body-md text-sm focus:outline-none resize-none"
                            />
                            <button
                              disabled={saving === o.id + '-notes'}
                              onClick={() => saveNotes(o.id)}
                              className="mt-xs font-label-caps text-[10px] border border-primary px-sm py-1 hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
                            >
                              {saving === o.id + '-notes' ? 'GUARDANDO...' : 'GUARDAR NOTAS'}
                            </button>

                            <div className="mt-md">
                              <p className="font-label-caps text-[10px] text-secondary mb-xs">CAMBIAR ESTADO</p>
                              <div className="flex flex-wrap gap-xs">
                                {['pending', 'processing', 'completed', 'cancelled'].map(s => (
                                  <button key={s}
                                    disabled={o.status === s || saving === o.id}
                                    onClick={() => updateStatus(o.id, s)}
                                    className={`font-label-caps text-[10px] px-sm py-1 border transition-all disabled:opacity-30 ${
                                      o.status === s ? 'bg-primary text-on-primary border-primary' :
                                      s === 'cancelled' ? 'border-red-400 text-red-500 hover:bg-red-500 hover:text-white' :
                                      'border-outline text-secondary hover:border-primary hover:text-primary'
                                    }`}
                                  >
                                    {STATUS_LABEL[s]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
