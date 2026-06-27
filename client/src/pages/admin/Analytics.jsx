import { useState, useEffect } from 'react'
import { apiFetch, fmtCOP } from '@/lib/api'

function KPI({ label, value, sub }) {
  return (
    <div className="border border-primary p-md">
      <p className="font-label-caps text-[10px] text-secondary mb-xs">{label}</p>
      <p className="font-headline-lg text-headline-lg text-primary leading-tight">{value}</p>
      {sub && <p className="font-label-caps text-[10px] text-secondary mt-xs">{sub}</p>}
    </div>
  )
}

function fmtDuration(secs) {
  if (!secs) return '0s'
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(7)
  const [costs, setCosts] = useState([])
  const [savingCosts, setSavingCosts] = useState(false)

  async function load() {
    setData(null)
    const res = await apiFetch(`/api/analytics/summary?days=${days}`).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setData(d)
      setCosts(d.costs?.length ? d.costs : [])
    }
  }

  useEffect(() => { load() }, [days])

  async function saveCosts() {
    setSavingCosts(true)
    await apiFetch('/api/analytics/costs', {
      method: 'PUT',
      body: JSON.stringify({ costs }),
    }).catch(() => {})
    setSavingCosts(false)
  }

  return (
    <div className="p-lg space-y-lg">
      <div className="flex justify-between items-center flex-wrap gap-sm">
        <h1 className="font-headline-lg text-headline-lg text-primary">ANALÍTICA</h1>
        <div className="flex gap-xs">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`font-label-caps text-label-caps px-md py-xs border transition-all ${
                days === d ? 'bg-primary text-on-primary border-primary' : 'border-outline text-secondary hover:border-primary hover:text-primary'
              }`}>
              {d}D
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO DATOS...</p>
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
            <KPI label="VISTAS TOTALES"     value={data.totalViews}     sub={`últimos ${days} días`} />
            <KPI label="VISITANTES ÚNICOS"  value={data.uniqueVisitors} sub={`${data.newVisitors} nuevos`} />
            <KPI label="VISITANTES RECURRENTES" value={data.returningVisitors ?? 0} />
            <KPI label="DURACIÓN PROMEDIO"  value={fmtDuration(data.avgDuration)} />
          </div>

          {/* Eventos de producto */}
          <div>
            <h2 className="font-label-caps text-label-caps mb-md">EVENTOS DE PRODUCTO</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
              <KPI label="VISTAS PRODUCTO"   value={data.productViews   ?? 0} />
              <KPI label="AÑADIR AL CARRITO" value={data.addToCarts     ?? 0} sub={`${data.uniqueCart ?? 0} visitantes únicos`} />
              <KPI label="CLICS WHATSAPP"    value={data.whatsappClicks ?? 0} />
              <KPI label="TASA INTERÉS"      value={data.totalViews > 0 ? `${Math.round((data.addToCarts ?? 0) / data.totalViews * 100)}%` : '0%'} sub="vistas → carrito" />
            </div>
          </div>

          {/* Tráfico por día */}
          {data.byDay?.length > 0 && (
            <div>
              <h2 className="font-label-caps text-label-caps mb-md">TRÁFICO POR DÍA</h2>
              <div className="border border-primary overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body-md">
                    <thead>
                      <tr className="border-b border-primary font-label-caps text-[10px] text-secondary bg-surface-container-low">
                        <th className="px-md py-3">DÍA</th>
                        <th className="px-md py-3">VISTAS</th>
                        <th className="px-md py-3">VISITANTES</th>
                        <th className="px-md py-3 w-1/2">BARRA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10">
                      {(() => {
                        const maxV = Math.max(...data.byDay.map(d => d.views), 1)
                        return data.byDay.map(d => (
                          <tr key={d.day} className="hover:bg-surface-container">
                            <td className="px-md py-3 font-label-caps text-[10px] whitespace-nowrap">{d.day}</td>
                            <td className="px-md py-3 font-label-caps text-sm">{d.views}</td>
                            <td className="px-md py-3 font-label-caps text-sm text-secondary">{d.visitors}</td>
                            <td className="px-md py-3">
                              <div className="h-3 bg-primary/10 rounded-none">
                                <div className="h-3 bg-primary transition-all" style={{ width: `${(d.views / maxV) * 100}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Páginas más vistas */}
          {data.topPages?.length > 0 && (
            <div>
              <h2 className="font-label-caps text-label-caps mb-md">PÁGINAS MÁS VISTAS</h2>
              <div className="border border-primary overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body-md">
                    <thead>
                      <tr className="border-b border-primary font-label-caps text-[10px] text-secondary bg-surface-container-low">
                        {['PÁGINA', 'VISTAS', 'VISITANTES', 'TIEMPO PROMEDIO'].map(h => (
                          <th key={h} className="px-md py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10">
                      {data.topPages.map(p => (
                        <tr key={p.page} className="hover:bg-surface-container">
                          <td className="px-md py-3 font-body-md text-sm">{p.page || '/'}</td>
                          <td className="px-md py-3 font-label-caps text-sm">{p.views}</td>
                          <td className="px-md py-3 font-label-caps text-sm text-secondary">{p.visitors}</td>
                          <td className="px-md py-3 font-label-caps text-sm text-secondary">{fmtDuration(p.avgDuration)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Fuentes de tráfico */}
          {data.sources?.length > 0 && (
            <div>
              <h2 className="font-label-caps text-label-caps mb-md">FUENTES DE TRÁFICO</h2>
              <div className="border border-primary overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body-md">
                    <thead>
                      <tr className="border-b border-primary font-label-caps text-[10px] text-secondary bg-surface-container-low">
                        {['FUENTE', 'VISITAS', 'VISITANTES', 'CPC (COP)', 'COSTO EST.'].map(h => (
                          <th key={h} className="px-md py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10">
                      {data.sources.map(s => {
                        const costRow = costs.find(c => c.source === s.source)
                        const cpc = costRow?.cpc || 0
                        const est = cpc * s.visits
                        return (
                          <tr key={s.source} className="hover:bg-surface-container">
                            <td className="px-md py-3 font-label-caps text-sm">{s.source || 'Directo'}</td>
                            <td className="px-md py-3 font-label-caps text-sm">{s.visits}</td>
                            <td className="px-md py-3 font-label-caps text-sm text-secondary">{s.visitors}</td>
                            <td className="px-md py-3">
                              <input
                                type="number"
                                min="0"
                                value={costRow?.cpc ?? 0}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0
                                  setCosts(cs => {
                                    const existing = cs.find(c => c.source === s.source)
                                    if (existing) return cs.map(c => c.source === s.source ? { ...c, cpc: val } : c)
                                    return [...cs, { source: s.source, cpc: val }]
                                  })
                                }}
                                className="w-24 border-b border-primary px-xs py-1 font-label-caps text-sm focus:outline-none bg-transparent"
                              />
                            </td>
                            <td className="px-md py-3 font-label-caps text-sm text-secondary">{est > 0 ? fmtCOP(est) : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-md py-sm border-t border-primary/20">
                  <button onClick={saveCosts} disabled={savingCosts}
                    className="font-label-caps text-[10px] border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40">
                    {savingCosts ? 'GUARDANDO...' : 'GUARDAR CPC'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
