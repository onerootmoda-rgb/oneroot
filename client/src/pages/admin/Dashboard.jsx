import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch, fmtCOP } from '@/lib/api'
import { fmtDate, STATUS_BADGE, STATUS_LABEL } from '@/lib/utils'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    apiFetch('/api/orders/stats').then(r => r.ok ? r.json() : null).then(setStats).catch(() => {})
    apiFetch('/api/orders/recent').then(r => r.ok ? r.json() : null).then(d => setOrders(d?.orders || [])).catch(() => {})
  }, [])

  return (
    <div className="p-lg space-y-lg">
      <div className="flex justify-between items-center">
        <h1 className="font-headline-lg text-headline-lg text-primary">DASHBOARD</h1>
        <p className="font-label-caps text-[10px] text-secondary">{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        {[
          { label: 'INGRESOS TOTALES', value: stats ? fmtCOP(stats.totalRevenue || 0) : '—', sub: stats ? `este mes: ${fmtCOP(stats.monthRevenue || 0)}` : '' },
          { label: 'PEDIDOS TOTALES', value: stats?.totalOrders ?? '—', sub: stats?.pending > 0 ? `${stats.pending} pendiente${stats.pending !== 1 ? 's' : ''}` : '' },
          { label: 'PEDIDOS ESTE MES', value: stats?.monthOrders ?? '—', sub: `completados: ${stats?.completed ?? 0}` },
          { label: 'TICKET PROMEDIO', value: stats ? fmtCOP(stats.avgOrder || 0) : '—', sub: `productos activos: ${stats?.activeProducts ?? 0}` },
        ].map((kpi, i) => (
          <div key={i} className="border border-primary p-md">
            <p className="font-label-caps text-[10px] text-secondary mb-xs">{kpi.label}</p>
            <h3 className="font-headline-lg text-headline-lg text-primary leading-tight">{kpi.value}</h3>
            {kpi.sub && <p className="font-label-caps text-[10px] text-secondary mt-xs">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        {[
          { label: 'PENDIENTES', value: stats?.pending ?? '—' },
          { label: 'EN PROCESO', value: stats?.processing ?? '—' },
          { label: 'COMPLETADOS', value: stats?.completed ?? '—' },
          { label: 'CANCELADOS', value: stats?.cancelled ?? '—' },
        ].map((s, i) => (
          <div key={i} className="border border-primary p-md text-center">
            <p className="font-label-caps text-[10px] text-secondary mb-xs">{s.label}</p>
            <h3 className="font-headline-lg text-headline-lg">{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="border border-primary overflow-hidden">
        <div className="px-md py-sm bg-surface border-b border-primary flex justify-between items-center">
          <h4 className="font-label-caps text-label-caps">PEDIDOS RECIENTES</h4>
          <Link to="/admin/orders" className="font-label-caps text-[10px] underline hover:no-underline">VER TODOS</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md">
            <thead>
              <tr className="border-b border-primary font-label-caps text-[10px] text-secondary bg-surface-container-low">
                {['PEDIDO','CLIENTE','FECHA','ESTADO','TOTAL'].map(h => (
                  <th key={h} className="px-md py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="px-md py-lg text-center font-label-caps text-[10px] text-secondary">
                  {stats === null ? 'CARGANDO...' : 'SIN PEDIDOS AÚN'}
                </td></tr>
              ) : orders.map(o => (
                <tr key={o.id} className="hover:bg-surface-container transition-colors cursor-pointer" onClick={() => navigate('/admin/orders')}>
                  <td className="px-md py-4 font-label-caps text-[11px]">{o.id}</td>
                  <td className="px-md py-4 text-[14px]">{o.customerName || '—'}</td>
                  <td className="px-md py-4 font-label-caps text-[10px] text-secondary">{fmtDate(o.createdAt)}</td>
                  <td className="px-md py-4">
                    <span className={`px-2 py-0.5 text-[10px] font-label-caps ${STATUS_BADGE[o.status] || 'border border-primary'}`}>
                      {STATUS_LABEL[o.status] || (o.status || '').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-md py-4 font-label-caps">{fmtCOP(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
