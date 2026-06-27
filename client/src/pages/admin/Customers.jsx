import { useState, useEffect } from 'react'
import { apiFetch, fmtCOP } from '@/lib/api'
import { fmtDate } from '@/lib/utils'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [cities, setCities]       = useState([])
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })
  const [expanded, setExpanded]   = useState(null)
  const [detail, setDetail]       = useState({})

  async function load(page = 1) {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 50 })
    if (search.trim())  params.set('q', search.trim())
    if (cityFilter)     params.set('city', cityFilter)
    const res = await apiFetch(`/api/customers?${params}`).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setCustomers(d.customers || [])
      setPagination(d.pagination || { page: 1, total: 0, pages: 1 })
      if (d.cities?.length) setCities(d.cities)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [cityFilter])

  async function loadDetail(customer) {
    if (detail[customer.id]) return
    const res = await apiFetch(`/api/customers/${customer.id}`).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setDetail(prev => ({ ...prev, [customer.id]: d.orders || [] }))
    }
  }

  function handleExpand(customer) {
    if (expanded === customer.id) { setExpanded(null); return }
    setExpanded(customer.id)
    loadDetail(customer)
  }

  function handleSearch(e) {
    e.preventDefault()
    load(1)
  }

  return (
    <div className="p-lg space-y-lg">
      <div className="flex justify-between items-center flex-wrap gap-sm">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">CLIENTES</h1>
          <p className="font-label-caps text-[10px] text-secondary mt-xs">
            {pagination.total} cliente{pagination.total !== 1 ? 's' : ''} registrado{pagination.total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-md flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-xs">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="BUSCAR POR NOMBRE, TELÉFONO O EMAIL..."
            className="border border-primary px-md py-xs font-label-caps text-label-caps text-sm focus:outline-none w-72"
          />
          <button type="submit" className="font-label-caps text-label-caps border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all">
            BUSCAR
          </button>
          {(search || cityFilter) && (
            <button type="button" onClick={() => { setSearch(''); setCityFilter(''); }}
              className="font-label-caps text-[10px] text-secondary hover:text-primary px-sm">
              LIMPIAR
            </button>
          )}
        </form>

        {cities.length > 0 && (
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)}
            className="border border-primary px-md py-xs font-label-caps text-label-caps text-sm focus:outline-none bg-transparent">
            <option value="">TODAS LAS CIUDADES</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Tabla */}
      <div className="border border-primary overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md">
            <thead>
              <tr className="border-b border-primary font-label-caps text-[10px] text-secondary bg-surface-container-low">
                {['', 'NOMBRE', 'TELÉFONO', 'EMAIL', 'CIUDAD', 'PEDIDOS', 'TOTAL GASTADO', 'ÚLTIMO PEDIDO'].map(h => (
                  <th key={h} className="px-md py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-md py-lg text-center font-label-caps text-[10px] text-secondary">CARGANDO...</td></tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-md py-xl text-center">
                    <span className="material-symbols-outlined text-[48px] text-secondary block mb-sm">group</span>
                    <p className="font-label-caps text-label-caps text-secondary">SIN CLIENTES AÚN</p>
                    <p className="font-body-md text-body-md text-secondary text-sm mt-xs">Se registran automáticamente cuando completan su primer pedido</p>
                  </td>
                </tr>
              ) : customers.map(c => (
                <>
                  <tr key={c.id}
                    className={`border-b border-primary/10 hover:bg-surface-container cursor-pointer transition-colors ${expanded === c.id ? 'bg-surface-container' : ''}`}
                    onClick={() => handleExpand(c)}
                  >
                    <td className="px-md py-4">
                      <span className={`material-symbols-outlined text-[16px] text-secondary transition-transform ${expanded === c.id ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </td>
                    <td className="px-md py-4 font-body-md text-sm font-medium">{c.name}</td>
                    <td className="px-md py-4">
                      <a href={`tel:${c.phone}`} className="font-label-caps text-[11px] hover:underline" onClick={e => e.stopPropagation()}>
                        {c.phone}
                      </a>
                    </td>
                    <td className="px-md py-4 font-label-caps text-[10px] text-secondary">{c.email || '—'}</td>
                    <td className="px-md py-4 font-label-caps text-[10px] text-secondary">{c.city || '—'}</td>
                    <td className="px-md py-4 text-center">
                      <span className="inline-block bg-primary text-on-primary font-label-caps text-[10px] w-6 h-6 flex items-center justify-center rounded-full">
                        {c.totalOrders}
                      </span>
                    </td>
                    <td className="px-md py-4 font-label-caps text-sm">{fmtCOP(c.totalSpent)}</td>
                    <td className="px-md py-4 font-label-caps text-[10px] text-secondary whitespace-nowrap">
                      {c.lastOrderAt ? fmtDate(c.lastOrderAt) : '—'}
                    </td>
                  </tr>

                  {/* Detalle expandido */}
                  {expanded === c.id && (
                    <tr key={c.id + '-detail'} className="border-b border-primary/10 bg-surface-container-low">
                      <td colSpan={8} className="px-lg py-md">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">

                          {/* Info de contacto */}
                          <div>
                            <p className="font-label-caps text-[10px] text-secondary mb-sm">DATOS DE CONTACTO</p>
                            <div className="space-y-xs font-body-md text-sm">
                              <p><span className="font-label-caps text-[10px] text-secondary">DIRECCIÓN: </span>{c.address || '—'}</p>
                              {c.barrio && <p><span className="font-label-caps text-[10px] text-secondary">BARRIO: </span>{c.barrio}</p>}
                              <p><span className="font-label-caps text-[10px] text-secondary">CIUDAD: </span>{c.city || '—'}</p>
                              <p><span className="font-label-caps text-[10px] text-secondary">CLIENTE DESDE: </span>{fmtDate(c.firstOrderAt || c.createdAt)}</p>
                            </div>
                            <div className="flex gap-xs mt-md">
                              <a href={`https://wa.me/57${c.phone.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                                className="font-label-caps text-[10px] border border-primary px-xs py-1 hover:bg-primary hover:text-on-primary transition-all">
                                WHATSAPP
                              </a>
                              {c.email && (
                                <a href={`mailto:${c.email}`}
                                  className="font-label-caps text-[10px] border border-primary px-xs py-1 hover:bg-primary hover:text-on-primary transition-all">
                                  EMAIL
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Resumen */}
                          <div>
                            <p className="font-label-caps text-[10px] text-secondary mb-sm">RESUMEN</p>
                            <div className="grid grid-cols-2 gap-sm">
                              {[
                                { label: 'PEDIDOS TOTALES', value: c.totalOrders },
                                { label: 'TOTAL GASTADO',   value: fmtCOP(c.totalSpent) },
                                { label: 'TICKET PROMEDIO', value: c.totalOrders > 0 ? fmtCOP(c.totalSpent / c.totalOrders) : '—' },
                              ].map(s => (
                                <div key={s.label} className="border border-primary/20 p-sm">
                                  <p className="font-label-caps text-[9px] text-secondary">{s.label}</p>
                                  <p className="font-headline-lg text-lg text-primary mt-xs">{s.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Historial de pedidos */}
                          <div className="md:col-span-1">
                            <p className="font-label-caps text-[10px] text-secondary mb-sm">HISTORIAL DE PEDIDOS</p>
                            {!detail[c.id] ? (
                              <p className="font-label-caps text-[10px] text-secondary animate-pulse">CARGANDO...</p>
                            ) : detail[c.id].length === 0 ? (
                              <p className="font-label-caps text-[10px] text-secondary">SIN PEDIDOS</p>
                            ) : (
                              <div className="space-y-xs max-h-48 overflow-y-auto pr-sm">
                                {detail[c.id].map(o => (
                                  <div key={o.id} className="flex items-center justify-between border border-primary/20 px-sm py-xs">
                                    <div>
                                      <p className="font-label-caps text-[10px]">{o.id}</p>
                                      <p className="font-label-caps text-[9px] text-secondary">{fmtDate(o.createdAt)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-label-caps text-[10px]">{fmtCOP(o.total)}</p>
                                      <span className={`font-label-caps text-[9px] px-1 ${
                                        o.status === 'completed' ? 'text-green-700' :
                                        o.status === 'cancelled' ? 'text-red-500' :
                                        'text-secondary'
                                      }`}>{o.status?.toUpperCase()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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

        {/* Paginación */}
        {pagination.pages > 1 && (
          <div className="px-md py-sm border-t border-primary/20 flex gap-sm items-center">
            <button disabled={pagination.page === 1} onClick={() => load(pagination.page - 1)}
              className="font-label-caps text-[10px] border border-primary px-sm py-xs hover:bg-primary hover:text-on-primary transition-all disabled:opacity-30">
              ← ANTERIOR
            </button>
            <span className="font-label-caps text-[10px] text-secondary">
              {pagination.page} / {pagination.pages} — {pagination.total} clientes
            </span>
            <button disabled={pagination.page === pagination.pages} onClick={() => load(pagination.page + 1)}
              className="font-label-caps text-[10px] border border-primary px-sm py-xs hover:bg-primary hover:text-on-primary transition-all disabled:opacity-30">
              SIGUIENTE →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
