import { useState, useEffect, useRef } from 'react'
import { apiFetch, fmtCOP } from '@/lib/api'
import { fmtDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'

const TALLAS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'TALLA ÚNICA']

// ─── CSVImport ────────────────────────────────────────────────────────────────
function CSVImport({ onImported, onClose }) {
  const toast = useToast()
  const [file, setFile]           = useState(null)
  const [headers, setHeaders]     = useState([])
  const [preview, setPreview]     = useState([])
  const [importing, setImporting] = useState(false)

  function parseLine(line) {
    const result = []
    let inQ = false, cur = ''
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
      else cur += ch
    }
    result.push(cur.trim())
    return result
  }

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = evt => {
      const lines = evt.target.result.replace(/^﻿/, '').trim().split(/\r?\n/)
      if (lines.length < 2) return
      setHeaders(parseLine(lines[0]))
      setPreview(lines.slice(1, 6).map(l => parseLine(l)))
    }
    reader.readAsText(f, 'UTF-8')
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    const fd = new FormData()
    fd.append('csv', file)
    const res = await fetch('/api/inventory/import-csv', { method: 'POST', credentials: 'include', body: fd }).catch(() => null)
    const d   = await res?.json().catch(() => ({}))
    if (res?.ok) {
      toast(`Importado: ${d.created || 0} nuevos, ${d.updated || 0} actualizados${d.errors ? `, ${d.errors} errores` : ''}.`, 'success')
      onImported()
      onClose()
    } else {
      toast(d?.error || 'Error al importar CSV.', 'error')
    }
    setImporting(false)
  }

  function downloadTemplate() {
    const csv = [
      'productSku,color,hex,tela,diseno,talla,stock,costo,sku',
      'OR-CAM-001,Negro,#1a1a1a,100% algodón,Liso,S,5,25000,OR-CAM-001-NEG-S',
      'OR-CAM-001,Negro,#1a1a1a,100% algodón,Liso,M,3,25000,OR-CAM-001-NEG-M',
      'OR-CAM-001,Blanco,#ffffff,100% algodón,Liso,S,2,25000,OR-CAM-001-BLA-S',
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'plantilla-inventario.csv'
    a.click()
  }

  return (
    <div className="border border-primary p-md space-y-md max-w-3xl">
      <div className="flex justify-between items-center">
        <p className="font-label-caps text-label-caps">IMPORTAR CSV — INVENTARIO</p>
        <button onClick={onClose} className="material-symbols-outlined text-secondary hover:text-primary">close</button>
      </div>

      <div className="bg-surface-container-low border border-primary/20 p-sm">
        <p className="font-label-caps text-[9px] text-secondary mb-xs">FORMATO ESPERADO:</p>
        <code className="font-mono text-[10px] text-secondary">
          <strong>productSku</strong>,<strong>color</strong>,hex,tela,diseno,<strong>talla</strong>,<strong>stock</strong>,costo,sku
        </code>
        <p className="font-label-caps text-[9px] text-secondary mt-xs">
          Usa el SKU del producto (columna SKU en Catálogo). Si el registro color+talla ya existe, actualiza el stock.
        </p>
      </div>

      <div className="flex gap-sm items-center flex-wrap">
        <label className="font-label-caps text-[10px] border border-primary px-sm py-xs hover:bg-primary hover:text-on-primary transition-all cursor-pointer">
          SELECCIONAR ARCHIVO CSV
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
        </label>
        {file && <span className="font-label-caps text-[10px] text-secondary">{file.name}</span>}
        <button type="button" onClick={downloadTemplate} className="font-label-caps text-[10px] text-secondary hover:text-primary ml-auto">
          ↓ PLANTILLA CSV
        </button>
      </div>

      {preview.length > 0 && (
        <div>
          <p className="font-label-caps text-[9px] text-secondary mb-xs">VISTA PREVIA (primeras 5 filas)</p>
          <div className="overflow-x-auto border border-primary/20">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  {headers.map(h => <th key={h} className="px-sm py-xs font-label-caps text-[9px] text-secondary whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t border-primary/10">
                    {row.map((v, j) => <td key={j} className="px-sm py-xs font-body-md text-[11px] whitespace-nowrap">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {file && (
        <button onClick={handleImport} disabled={importing}
          className="font-label-caps text-label-caps bg-primary text-on-primary px-lg py-xs hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40">
          {importing ? 'IMPORTANDO...' : 'IMPORTAR'}
        </button>
      )}
    </div>
  )
}

const EMPTY = {
  productId: '', color: '', colorHex: '#1a1a1a',
  tela: '', diseno: '', talla: 'M',
  stock: 0, costo: 0, sku: '',
}

function VariantForm({ initial, products, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.productId || !form.talla) return toast('Producto y talla son obligatorios.', 'error')
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border border-primary p-md space-y-md max-w-3xl">
      <p className="font-label-caps text-label-caps">{initial.id ? 'EDITAR VARIANTE' : 'NUEVA VARIANTE DE INVENTARIO'}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {/* Producto */}
        <div className="md:col-span-2">
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">PRODUCTO *</label>
          <select value={form.productId} onChange={e => set('productId', e.target.value)} required
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent">
            <option value="">-- Seleccionar --</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
          </select>
        </div>

        {/* Talla */}
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">TALLA *</label>
          <select value={form.talla} onChange={e => set('talla', e.target.value)}
            className="w-full border-b border-primary px-xs py-xs font-label-caps text-label-caps focus:outline-none bg-transparent">
            {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Color */}
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">COLOR</label>
          <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Ej: Negro, Blanco"
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent" />
        </div>

        {/* Color Hex */}
        <div className="flex items-end gap-sm">
          <div className="flex-1">
            <label className="font-label-caps text-[10px] text-secondary block mb-xs">HEX DEL COLOR</label>
            <input value={form.colorHex} onChange={e => set('colorHex', e.target.value)} placeholder="#1a1a1a"
              className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent font-mono" />
          </div>
          <input type="color" value={form.colorHex} onChange={e => set('colorHex', e.target.value)}
            className="w-10 h-8 border border-primary cursor-pointer mb-0.5" />
        </div>

        {/* Tela */}
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">TELA / MATERIAL</label>
          <input value={form.tela} onChange={e => set('tela', e.target.value)} placeholder="Ej: 100% algodón, Poliéster"
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent" />
        </div>

        {/* Diseño */}
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">DISEÑO / REFERENCIA</label>
          <input value={form.diseno} onChange={e => set('diseno', e.target.value)} placeholder="Ej: Liso, Logo bordado"
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent" />
        </div>

        {/* SKU */}
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">SKU VARIANTE</label>
          <input value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Ej: OR-CAM-001-NEG-M"
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent font-mono" />
        </div>

        {/* Stock */}
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">STOCK ACTUAL</label>
          <input type="number" min="0" value={form.stock} onChange={e => set('stock', parseInt(e.target.value) || 0)}
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent" />
        </div>

        {/* Costo */}
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">COSTO UNITARIO (COP)</label>
          <input type="number" min="0" value={form.costo} onChange={e => set('costo', parseFloat(e.target.value) || 0)}
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent" />
        </div>
      </div>

      <div className="flex gap-sm pt-sm">
        <button type="submit" disabled={saving}
          className="font-label-caps text-label-caps bg-primary text-on-primary px-lg py-xs hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40">
          {saving ? 'GUARDANDO...' : (initial.id ? 'GUARDAR CAMBIOS' : 'CREAR VARIANTE')}
        </button>
        <button type="button" onClick={onCancel}
          className="font-label-caps text-label-caps border border-primary px-lg py-xs hover:bg-primary hover:text-on-primary transition-all">
          CANCELAR
        </button>
      </div>
    </form>
  )
}

export default function Inventory() {
  const toast = useToast()
  const [inventory, setInventory] = useState([])
  const [totales, setTotales]     = useState({})
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [panel, setPanel]         = useState(null) // null | 'create' | { ...row }
  const [filterProduct, setFilterProduct] = useState('')
  const [editInline, setEditInline] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [showImport, setShowImport] = useState(false)

  async function load() {
    setLoading(true)
    const params = filterProduct ? `?productId=${filterProduct}` : ''
    const res = await apiFetch(`/api/inventory${params}`).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setInventory(d.inventory || [])
      setTotales(d.totales || {})
    }
    setLoading(false)
  }

  async function loadProducts() {
    const res = await apiFetch('/api/inventory/products').catch(() => null)
    if (res?.ok) { const d = await res.json(); setProducts(d.products || []) }
  }

  useEffect(() => { load(); loadProducts() }, [])
  useEffect(() => { load() }, [filterProduct])

  async function handleCreate(data) {
    const res = await apiFetch('/api/inventory', { method: 'POST', body: JSON.stringify(data) }).catch(() => null)
    if (res?.ok) { toast('Variante creada.', 'success'); setPanel(null); load() }
    else { const d = await res?.json().catch(() => ({})); toast(d?.error || 'Error al crear.', 'error') }
  }

  async function handleEdit(id, data) {
    const res = await apiFetch(`/api/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() => null)
    if (res?.ok) { toast('Actualizado.', 'success'); setPanel(null); load() }
    else { const d = await res?.json().catch(() => ({})); toast(d?.error || 'Error.', 'error') }
  }

  async function handleDelete(row) {
    if (!window.confirm(`¿Eliminar variante ${row.color} ${row.talla}?`)) return
    const res = await apiFetch(`/api/inventory/${row.id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) { toast('Variante eliminada.', 'success'); load() }
    else toast('Error al eliminar.', 'error')
  }

  // Edición rápida de stock inline
  async function saveInlineStock(row) {
    const newStock = parseInt(editValues[row.id] ?? row.stock) || 0
    await handleEdit(row.id, { ...row, stock: newStock })
    setEditInline(null)
  }

  // Exportar CSV
  function exportCSV() {
    const headers = ['Producto','Color','Tela','Diseño','Talla','SKU','Stock','Reservados','Vendidas','Disponible','Costo Unit','Precio Venta','Valor Inventario','Actualizado']
    const rows = inventory.map(r => [
      r.productName, r.color, r.tela, r.diseno, r.talla, r.sku,
      r.stock, r.reservados, r.vendidas, r.disponible,
      r.costo, r.precioVenta, r.valorInventario,
      r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('es-CO') : ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `inventario-one-root-${Date.now()}.csv`; a.click()
  }

  // Agrupar por producto para mejor UX
  const grouped = {}
  inventory.forEach(r => {
    if (!grouped[r.productName]) grouped[r.productName] = []
    grouped[r.productName].push(r)
  })

  return (
    <div className="p-lg space-y-lg">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-sm">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">INVENTARIO</h1>
          <p className="font-label-caps text-[10px] text-secondary mt-xs">
            {inventory.length} variante{inventory.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <button onClick={exportCSV}
            className="font-label-caps text-label-caps border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all">
            EXPORTAR CSV
          </button>
          <button onClick={() => { setShowImport(v => !v); setPanel(null) }}
            className="font-label-caps text-label-caps border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all">
            IMPORTAR CSV
          </button>
          <button onClick={() => { setPanel('create'); setShowImport(false) }}
            className="font-label-caps text-label-caps bg-primary text-on-primary px-md py-xs hover:bg-white hover:text-primary border border-primary transition-all">
            + NUEVA VARIANTE
          </button>
        </div>
      </div>

      {/* CSV Import panel */}
      {showImport && (
        <CSVImport onImported={load} onClose={() => setShowImport(false)} />
      )}

      {/* KPIs totales */}
      {!loading && inventory.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-gutter">
          {[
            { label: 'STOCK TOTAL',      value: totales.totalStock ?? 0 },
            { label: 'DISPONIBLE',       value: totales.totalDisponible ?? 0 },
            { label: 'RESERVADOS',       value: totales.totalReservados ?? 0 },
            { label: 'VENDIDAS',         value: totales.totalVendidas ?? 0 },
            { label: 'VALOR INVENTARIO', value: fmtCOP(totales.totalValorInventario ?? 0) },
          ].map(k => (
            <div key={k.label} className="border border-primary p-md">
              <p className="font-label-caps text-[9px] text-secondary mb-xs">{k.label}</p>
              <p className="font-headline-lg text-lg text-primary">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario crear/editar */}
      {panel === 'create' && (
        <VariantForm initial={EMPTY} products={products} onSave={handleCreate} onCancel={() => setPanel(null)} />
      )}
      {panel && panel !== 'create' && (
        <VariantForm initial={panel} products={products} onSave={data => handleEdit(panel.id, data)} onCancel={() => setPanel(null)} />
      )}

      {/* Filtro por producto */}
      <div className="flex gap-sm items-center">
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
          className="border border-primary px-md py-xs font-label-caps text-label-caps text-sm focus:outline-none bg-transparent">
          <option value="">TODOS LOS PRODUCTOS</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {filterProduct && (
          <button onClick={() => setFilterProduct('')} className="font-label-caps text-[10px] text-secondary hover:text-primary">
            LIMPIAR
          </button>
        )}
      </div>

      {/* Tabla principal */}
      {loading ? (
        <p className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO INVENTARIO...</p>
      ) : inventory.length === 0 ? (
        <div className="text-center py-xl border-2 border-dashed border-primary/20">
          <span className="material-symbols-outlined text-[64px] text-secondary block mb-sm">inventory_2</span>
          <p className="font-label-caps text-label-caps text-secondary mb-xs">SIN VARIANTES DE INVENTARIO</p>
          <p className="font-body-md text-body-md text-secondary text-sm mb-lg">Crea la primera variante usando el botón "+ NUEVA VARIANTE"</p>
          <button onClick={() => setPanel('create')}
            className="font-label-caps text-label-caps bg-primary text-on-primary px-lg py-sm hover:bg-white hover:text-primary border border-primary transition-all">
            + NUEVA VARIANTE
          </button>
        </div>
      ) : (
        <div className="border border-primary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-md text-sm">
              <thead>
                <tr className="border-b border-primary bg-surface-container-low">
                  {[
                    'PRODUCTO', 'COLOR', 'TELA', 'DISEÑO', 'TALLA', 'SKU',
                    'STOCK', 'RESERVADOS', 'VENDIDAS', 'DISPONIBLE',
                    'COSTO UNIT', 'PRECIO VENTA', 'VALOR INVENTARIO', 'ACTUALIZADO', 'ACCIONES'
                  ].map(h => (
                    <th key={h} className="px-sm py-3 font-label-caps text-[9px] text-secondary whitespace-nowrap font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {Object.entries(grouped).map(([productName, rows]) => (
                  rows.map((r, idx) => (
                    <tr key={r.id}
                      className={`hover:bg-surface-container transition-colors ${
                        r.disponible === 0 ? 'bg-red-50/40' :
                        r.disponible <= 3 ? 'bg-yellow-50/40' : ''
                      }`}
                    >
                      {/* Producto — solo muestra en la primera fila del grupo */}
                      <td className="px-sm py-3 font-body-md text-sm font-medium max-w-[140px]">
                        {idx === 0 ? (
                          <span className="block truncate" title={productName}>{productName}</span>
                        ) : (
                          <span className="text-secondary text-[10px]">↳</span>
                        )}
                      </td>

                      {/* Color */}
                      <td className="px-sm py-3">
                        <div className="flex items-center gap-xs">
                          {r.colorHex && (
                            <div className="w-4 h-4 rounded-full border border-primary/20 flex-shrink-0"
                              style={{ backgroundColor: r.colorHex }} />
                          )}
                          <span className="font-label-caps text-[10px]">{r.color || '—'}</span>
                        </div>
                      </td>

                      <td className="px-sm py-3 font-label-caps text-[10px] text-secondary">{r.tela || '—'}</td>
                      <td className="px-sm py-3 font-label-caps text-[10px] text-secondary">{r.diseno || '—'}</td>

                      {/* Talla */}
                      <td className="px-sm py-3">
                        <span className="font-label-caps text-[10px] border border-primary px-xs py-0.5">{r.talla}</span>
                      </td>

                      <td className="px-sm py-3 font-mono text-[10px] text-secondary">{r.sku || '—'}</td>

                      {/* Stock — editable inline */}
                      <td className="px-sm py-3">
                        {editInline === r.id ? (
                          <div className="flex items-center gap-xs">
                            <input
                              type="number" min="0"
                              value={editValues[r.id] ?? r.stock}
                              onChange={e => setEditValues(v => ({ ...v, [r.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveInlineStock(r); if (e.key === 'Escape') setEditInline(null) }}
                              className="w-14 border border-primary px-xs py-0.5 font-label-caps text-sm focus:outline-none text-center"
                              autoFocus
                            />
                            <button onClick={() => saveInlineStock(r)} className="material-symbols-outlined text-[14px] text-primary hover:text-on-primary">check</button>
                            <button onClick={() => setEditInline(null)} className="material-symbols-outlined text-[14px] text-secondary">close</button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditInline(r.id); setEditValues(v => ({ ...v, [r.id]: r.stock })) }}
                            className="font-label-caps text-sm hover:underline cursor-pointer group flex items-center gap-xs">
                            {r.stock}
                            <span className="material-symbols-outlined text-[12px] text-secondary opacity-0 group-hover:opacity-100">edit</span>
                          </button>
                        )}
                      </td>

                      {/* Reservados */}
                      <td className="px-sm py-3">
                        <span className={`font-label-caps text-sm ${r.reservados > 0 ? 'text-primary font-bold' : 'text-secondary'}`}>
                          {r.reservados}
                        </span>
                      </td>

                      {/* Vendidas */}
                      <td className="px-sm py-3">
                        <span className="font-label-caps text-sm text-secondary">{r.vendidas}</span>
                      </td>

                      {/* Disponible */}
                      <td className="px-sm py-3">
                        <span className={`font-label-caps text-sm font-bold ${
                          r.disponible === 0 ? 'text-red-500' :
                          r.disponible <= 3  ? 'text-yellow-600' :
                          'text-primary'
                        }`}>
                          {r.disponible}
                          {r.disponible === 0 && <span className="ml-xs text-[9px] border border-red-400 px-0.5">AGOTADO</span>}
                          {r.disponible > 0 && r.disponible <= 3 && <span className="ml-xs text-[9px] border border-yellow-500 px-0.5">BAJO</span>}
                        </span>
                      </td>

                      <td className="px-sm py-3 font-label-caps text-[10px] text-secondary">{fmtCOP(r.costo)}</td>
                      <td className="px-sm py-3 font-label-caps text-[10px]">{fmtCOP(r.precioVenta)}</td>
                      <td className="px-sm py-3 font-label-caps text-[10px]">{fmtCOP(r.valorInventario)}</td>
                      <td className="px-sm py-3 font-label-caps text-[9px] text-secondary whitespace-nowrap">
                        {r.updatedAt ? new Date(r.updatedAt).toLocaleDateString('es-CO') : '—'}
                      </td>

                      {/* Acciones */}
                      <td className="px-sm py-3">
                        <div className="flex gap-xs">
                          <button onClick={() => { setPanel(r) }}
                            className="font-label-caps text-[9px] border border-primary px-xs py-0.5 hover:bg-primary hover:text-on-primary transition-all">
                            EDITAR
                          </button>
                          <button onClick={() => handleDelete(r)}
                            className="font-label-caps text-[9px] border border-red-400 text-red-500 px-xs py-0.5 hover:bg-red-500 hover:text-white transition-all">
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>

              {/* Fila de totales */}
              <tfoot>
                <tr className="border-t-2 border-primary bg-surface-container-low">
                  <td colSpan={6} className="px-sm py-3 font-label-caps text-[10px] text-secondary">TOTALES</td>
                  <td className="px-sm py-3 font-label-caps text-sm font-bold">{totales.totalStock ?? 0}</td>
                  <td className="px-sm py-3 font-label-caps text-sm font-bold">{totales.totalReservados ?? 0}</td>
                  <td className="px-sm py-3 font-label-caps text-sm font-bold">{totales.totalVendidas ?? 0}</td>
                  <td className="px-sm py-3 font-label-caps text-sm font-bold">{totales.totalDisponible ?? 0}</td>
                  <td className="px-sm py-3"></td>
                  <td className="px-sm py-3"></td>
                  <td className="px-sm py-3 font-label-caps text-sm font-bold">{fmtCOP(totales.totalValorInventario ?? 0)}</td>
                  <td colSpan={2} className="px-sm py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
