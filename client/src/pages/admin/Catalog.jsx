import { useState, useEffect, useRef } from 'react'
import { apiFetch, fmtCOP } from '@/lib/api'
import { useToast } from '@/components/Toast'

const CATEGORIES = ['Camisetas', 'Hoodies', 'Pantalones', 'Accesorios', 'Oversize', 'Otro']
const ALL_SIZES   = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function newColor() {
  return { _id: Math.random().toString(36).slice(2), name: '', hex: '#1a1a1a', stock: {}, images: [] }
}

// ─── ColorCard ────────────────────────────────────────────────────────────────
function ColorCard({ color, sizes, productId, onChange, onDelete }) {
  const toast    = useToast()
  const fileRef  = useRef(null)
  const [uploading, setUploading] = useState(false)

  function setField(key, val) { onChange({ ...color, [key]: val }) }

  function setStock(size, val) {
    onChange({ ...color, stock: { ...color.stock, [size]: parseInt(val) || 0 } })
  }

  async function handleImageUpload(e) {
    if (!productId) return toast('Guarda el producto primero para subir fotos.', 'error')
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const currentCount = color.images?.length || 0
    if (currentCount + files.length > 2) return toast('Máximo 2 fotos por color.', 'error')
    setUploading(true)
    const fd = new FormData()
    files.forEach(f => fd.append('images', f))
    const res = await fetch(`/api/products/${productId}/images`, {
      method: 'POST', credentials: 'include', body: fd,
    }).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      const all = d.images || []
      const newUrls = all.slice(-(files.length))
      onChange({ ...color, images: [...(color.images || []), ...newUrls].slice(0, 2) })
      toast('Foto subida.', 'success')
    } else {
      toast('Error al subir foto.', 'error')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeImage(url) {
    onChange({ ...color, images: (color.images || []).filter(u => u !== url) })
  }

  return (
    <div className="border border-primary/40 p-md space-y-sm">
      {/* Header: color picker + name + hex + delete */}
      <div className="flex items-center gap-sm">
        <input
          type="color"
          value={color.hex || '#1a1a1a'}
          onChange={e => setField('hex', e.target.value)}
          className="w-8 h-8 border border-primary/30 cursor-pointer flex-shrink-0"
          title="Elegir color"
        />
        <input
          value={color.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="Nombre del color (ej: Negro, Blanco)"
          className="flex-1 border-b border-primary/30 px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent focus:border-primary"
        />
        <input
          value={color.hex || ''}
          onChange={e => setField('hex', e.target.value)}
          placeholder="#1a1a1a"
          className="w-20 border-b border-primary/30 px-xs py-xs font-mono text-[11px] focus:outline-none bg-transparent text-secondary"
        />
        <button
          type="button"
          onClick={onDelete}
          className="text-secondary hover:text-red-500 transition-colors ml-auto flex-shrink-0"
          title="Eliminar color"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>

      {/* Stock per size */}
      {sizes.length > 0 && (
        <div>
          <p className="font-label-caps text-[9px] text-secondary mb-xs">STOCK POR TALLA</p>
          <div className="flex flex-wrap gap-sm">
            {sizes.map(s => (
              <div key={s} className="flex flex-col items-center gap-xs">
                <span className="font-label-caps text-[9px] text-secondary">{s}</span>
                <input
                  type="number"
                  min="0"
                  value={color.stock?.[s] ?? 0}
                  onChange={e => setStock(s, e.target.value)}
                  className="w-12 border border-primary/30 text-center font-label-caps text-sm focus:outline-none bg-transparent py-xs focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-color images (max 2) */}
      <div>
        <p className="font-label-caps text-[9px] text-secondary mb-xs">
          FOTOS DE ESTE COLOR (MÁX. 2)
          {!productId && <span className="ml-xs opacity-50">— disponible al editar</span>}
        </p>
        <div className="flex items-center gap-sm flex-wrap">
          {(color.images || []).map(url => (
            <div key={url} className="relative group">
              <img src={url} alt="" className="w-16 h-20 object-cover border border-primary/20" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] px-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >✕</button>
            </div>
          ))}
          {(color.images?.length || 0) < 2 && productId && (
            <label className="w-16 h-20 border-2 border-dashed border-primary/20 hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-[20px] text-secondary">add_photo_alternate</span>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleImageUpload} />
            </label>
          )}
          {uploading && <span className="font-label-caps text-[9px] text-secondary animate-pulse">SUBIENDO...</span>}
        </div>
      </div>
    </div>
  )
}

// ─── CSVImport ────────────────────────────────────────────────────────────────
function CSVImport({ endpoint, onImported, onClose }) {
  const toast = useToast()
  const [file, setFile]         = useState(null)
  const [headers, setHeaders]   = useState([])
  const [preview, setPreview]   = useState([])
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
      const hdrs = parseLine(lines[0])
      setHeaders(hdrs)
      setPreview(lines.slice(1, 6).map(l => parseLine(l)))
    }
    reader.readAsText(f, 'UTF-8')
  }

  async function handleImport() {
    if (!file) return
    setImporting(true)
    const fd = new FormData()
    fd.append('csv', file)
    const res = await fetch(endpoint, { method: 'POST', credentials: 'include', body: fd }).catch(() => null)
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

  return (
    <div className="border border-primary p-md space-y-md max-w-3xl">
      <div className="flex justify-between items-center">
        <p className="font-label-caps text-label-caps">IMPORTAR CSV — PRODUCTOS</p>
        <button onClick={onClose} className="material-symbols-outlined text-secondary hover:text-primary">close</button>
      </div>

      <div className="bg-surface-container-low border border-primary/20 p-sm">
        <p className="font-label-caps text-[9px] text-secondary mb-xs">FORMATO ESPERADO (columnas obligatorias en negrita):</p>
        <code className="font-mono text-[10px] text-secondary">
          <strong>name</strong>,<strong>price</strong>,<strong>category</strong>,badge,description,<strong>color</strong>,hex,XS,S,M,L,XL,XXL
        </code>
        <p className="font-label-caps text-[9px] text-secondary mt-xs">
          Varias filas con el mismo <em>name</em> = un producto con múltiples colores.
        </p>
      </div>

      <div className="flex gap-sm items-center flex-wrap">
        <label className="font-label-caps text-[10px] border border-primary px-sm py-xs hover:bg-primary hover:text-on-primary transition-all cursor-pointer">
          SELECCIONAR ARCHIVO CSV
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
        </label>
        {file && <span className="font-label-caps text-[10px] text-secondary">{file.name}</span>}
        <button
          type="button"
          onClick={() => {
            const csv = [
              'name,price,category,badge,description,color,hex,XS,S,M,L,XL,XXL',
              '"Camiseta Ejemplo",89000,Camisetas,NEW,"Descripción del producto",Negro,#1a1a1a,0,5,3,2,0,0',
              '"Camiseta Ejemplo",89000,Camisetas,NEW,"Descripción del producto",Blanco,#ffffff,0,2,4,1,0,0',
            ].join('\n')
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
            a.download = 'plantilla-productos.csv'
            a.click()
          }}
          className="font-label-caps text-[10px] text-secondary hover:text-primary ml-auto"
        >
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
                  {headers.map(h => <th key={h} className="px-sm py-xs font-label-caps text-[9px] text-secondary whitespace-nowrap border-r border-primary/10 last:border-0">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-t border-primary/10">
                    {row.map((v, j) => <td key={j} className="px-sm py-xs font-body-md text-[11px] whitespace-nowrap max-w-[120px] truncate border-r border-primary/10 last:border-0">{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {file && (
        <div className="flex gap-sm">
          <button
            onClick={handleImport}
            disabled={importing}
            className="font-label-caps text-label-caps bg-primary text-on-primary px-lg py-xs hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40"
          >
            {importing ? 'IMPORTANDO...' : 'IMPORTAR'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── ProductForm ──────────────────────────────────────────────────────────────
function ProductForm({ initial, productId, onSave, onCancel }) {
  const toast = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState(() => {
    const existingColors = Array.isArray(initial.colors) && initial.colors.length > 0
      ? initial.colors.map(c => ({ ...c, _id: c._id || Math.random().toString(36).slice(2) }))
      : [{ ...newColor(), name: initial.color || '', stock: { ...(initial.stock || {}) }, images: (initial.images || []).slice(0, 2) }]

    return {
      name:        initial.name        || '',
      price:       initial.price       || '',
      category:    initial.category    || 'Camisetas',
      badge:       initial.badge       || '',
      description: initial.description || '',
      sizes:       initial.sizes       || ['S', 'M', 'L', 'XL'],
      colors:      existingColors,
    }
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function toggleSize(s) {
    setForm(f => {
      const sizes = f.sizes.includes(s)
        ? f.sizes.filter(x => x !== s)
        : [...f.sizes, s]
      const colors = f.colors.map(c => {
        const stock = { ...c.stock }
        if (!sizes.includes(s)) delete stock[s]
        else if (stock[s] === undefined) stock[s] = 0
        return { ...c, stock }
      })
      return { ...f, sizes, colors }
    })
  }

  function addColor() {
    const nc = newColor()
    form.sizes.forEach(s => { nc.stock[s] = 0 })
    setForm(f => ({ ...f, colors: [...f.colors, nc] }))
  }

  function updateColor(idx, updated) {
    setForm(f => { const colors = [...f.colors]; colors[idx] = updated; return { ...f, colors } })
  }

  function removeColor(idx) {
    setForm(f => ({ ...f, colors: f.colors.filter((_, i) => i !== idx) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.price || !form.category) {
      return toast('Nombre, precio y categoría son obligatorios.', 'error')
    }
    const validColors = form.colors.filter(c => c.name.trim())
    setSaving(true)
    await onSave({ ...form, price: parseFloat(form.price), colors: validColors })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="border border-primary p-md space-y-lg max-w-3xl">
      <p className="font-label-caps text-label-caps">
        {productId ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}
      </p>

      {/* Basic fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">NOMBRE *</label>
          <input
            required
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent"
          />
        </div>
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">PRECIO (COP) *</label>
          <input
            required
            type="number"
            min="0"
            value={form.price}
            onChange={e => set('price', e.target.value)}
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent"
          />
        </div>
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">CATEGORÍA *</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="w-full border-b border-primary px-xs py-xs font-label-caps text-label-caps focus:outline-none bg-transparent"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">BADGE (ej: NEW, SALE)</label>
          <input
            value={form.badge}
            onChange={e => set('badge', e.target.value)}
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent"
          />
        </div>
        <div className="md:col-span-2">
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">DESCRIPCIÓN</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className="w-full border border-primary/30 px-xs py-xs font-body-md text-sm focus:outline-none resize-none bg-transparent"
          />
        </div>
      </div>

      {/* Sizes */}
      <div>
        <label className="font-label-caps text-[10px] text-secondary block mb-sm">TALLAS DISPONIBLES</label>
        <div className="flex flex-wrap gap-sm">
          {ALL_SIZES.map(s => (
            <button
              type="button"
              key={s}
              onClick={() => toggleSize(s)}
              className={`font-label-caps text-label-caps w-10 h-10 border transition-all ${
                form.sizes.includes(s)
                  ? 'bg-primary text-on-primary border-primary'
                  : 'border-outline text-secondary hover:border-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="font-label-caps text-[9px] text-secondary mt-xs">El stock por talla se configura dentro de cada color.</p>
      </div>

      {/* Colors + stock + images */}
      <div>
        <div className="flex items-center justify-between mb-sm">
          <label className="font-label-caps text-[10px] text-secondary">COLORES — STOCK Y FOTOS POR COLOR</label>
          <button
            type="button"
            onClick={addColor}
            className="font-label-caps text-[10px] border border-primary px-sm py-xs hover:bg-primary hover:text-on-primary transition-all"
          >
            + AGREGAR COLOR
          </button>
        </div>
        {form.colors.length === 0 ? (
          <p className="font-label-caps text-[10px] text-secondary">Sin colores definidos.</p>
        ) : (
          <div className="space-y-sm">
            {form.colors.map((c, idx) => (
              <ColorCard
                key={c._id}
                color={c}
                sizes={form.sizes}
                productId={productId}
                onChange={updated => updateColor(idx, updated)}
                onDelete={() => removeColor(idx)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-sm pt-sm">
        <button
          type="submit"
          disabled={saving}
          className="font-label-caps text-label-caps bg-primary text-on-primary px-lg py-xs hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40"
        >
          {saving ? 'GUARDANDO...' : (productId ? 'GUARDAR CAMBIOS' : 'CREAR Y CONTINUAR')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-label-caps text-label-caps border border-primary px-lg py-xs hover:bg-primary hover:text-on-primary transition-all"
        >
          CANCELAR
        </button>
      </div>
    </form>
  )
}

// ─── ImageManager ─────────────────────────────────────────────────────────────
function ImageManager({ product, onDone }) {
  const toast   = useToast()
  const fileRef = useRef(null)
  const [images, setImages]     = useState(product.images || [])
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    const fd = new FormData()
    files.forEach(f => fd.append('images', f))
    const res = await fetch(`/api/products/${product.id}/images`, {
      method: 'POST', credentials: 'include', body: fd,
    }).catch(() => null)
    if (res?.ok) { const d = await res.json(); setImages(d.images || []); toast('Imágenes subidas.', 'success') }
    else toast('Error al subir.', 'error')
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(url) {
    const res = await apiFetch(`/api/products/${product.id}/images`, {
      method: 'DELETE', body: JSON.stringify({ imageUrl: url }),
    }).catch(() => null)
    if (res?.ok) { const d = await res.json(); setImages(d.images || []); toast('Imagen eliminada.', 'success') }
    else toast('Error al eliminar.', 'error')
  }

  return (
    <div className="border border-primary p-md space-y-md max-w-2xl">
      <div className="flex justify-between items-center">
        <p className="font-label-caps text-label-caps">FOTOS GENERALES — {product.name}</p>
        <button onClick={onDone} className="material-symbols-outlined text-secondary hover:text-primary">close</button>
      </div>
      <div className="flex flex-wrap gap-sm">
        {images.map(url => (
          <div key={url} className="relative group">
            <img src={url} alt="" className="w-24 h-32 object-cover border border-primary/20" />
            <button
              onClick={() => handleDelete(url)}
              className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >✕</button>
          </div>
        ))}
        <label className="w-24 h-32 border-2 border-dashed border-primary/30 hover:border-primary flex flex-col items-center justify-center cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-[32px] text-secondary">add_photo_alternate</span>
          <span className="font-label-caps text-[10px] text-secondary mt-xs">SUBIR</span>
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleUpload} />
        </label>
      </div>
      {uploading && <p className="font-label-caps text-[10px] text-secondary animate-pulse">SUBIENDO...</p>}
      <p className="font-label-caps text-[10px] text-secondary">PNG, JPG, WEBP — máx. 15MB</p>
    </div>
  )
}

// ─── AdminCatalog ─────────────────────────────────────────────────────────────
export default function AdminCatalog() {
  const toast = useToast()
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [panel, setPanel]         = useState(null)   // null | 'create' | 'import' | {...product}
  const [imagePanel, setImagePanel] = useState(null)

  async function load(q) {
    setLoading(true)
    const params = q ? `?search=${encodeURIComponent(q)}` : ''
    const res = await apiFetch(`/api/products${params}`).catch(() => null)
    if (res?.ok) { const d = await res.json(); setProducts(d.products || []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(data) {
    const res = await apiFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }).catch(() => null)
    if (res?.ok) {
      const newProduct = await res.json()
      toast('Producto creado. Ahora puedes subir fotos por color.', 'success')
      load()
      setPanel(newProduct)  // switch to edit so color images can be uploaded
    } else {
      const d = await res?.json().catch(() => ({}))
      toast(d?.error || 'Error al crear.', 'error')
    }
  }

  async function handleEdit(id, data) {
    const res = await apiFetch(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).catch(() => null)
    if (res?.ok) {
      const updated = await res.json()
      toast('Producto actualizado.', 'success')
      setPanel(updated)  // stay in edit with refreshed data
      load()
    } else {
      const d = await res?.json().catch(() => ({}))
      toast(d?.error || 'Error al actualizar.', 'error')
    }
  }

  async function handleDelete(product) {
    if (!window.confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return
    const res = await apiFetch(`/api/products/${product.id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) { toast('Producto eliminado.', 'success'); setPanel(null); load() }
    else toast('Error al eliminar.', 'error')
  }

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const isEditing = panel && panel !== 'create' && panel !== 'import'

  return (
    <div className="p-lg space-y-lg">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-sm">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">CATÁLOGO</h1>
          <p className="font-label-caps text-[10px] text-secondary mt-xs">{products.length} producto{products.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-sm flex-wrap">
          <a
            href="/api/products/export/excel"
            download
            className="font-label-caps text-label-caps border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all"
          >
            EXPORTAR EXCEL
          </a>
          <button
            onClick={() => { setPanel('import'); setImagePanel(null) }}
            className="font-label-caps text-label-caps border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all"
          >
            IMPORTAR CSV
          </button>
          <button
            onClick={() => { setPanel('create'); setImagePanel(null) }}
            className="font-label-caps text-label-caps bg-primary text-on-primary px-md py-xs hover:bg-white hover:text-primary border border-primary transition-all"
          >
            + NUEVO PRODUCTO
          </button>
        </div>
      </div>

      {/* CSV Import panel */}
      {panel === 'import' && (
        <CSVImport
          endpoint="/api/products/import-csv"
          onImported={() => load()}
          onClose={() => setPanel(null)}
        />
      )}

      {/* Create form */}
      {panel === 'create' && (
        <ProductForm
          initial={{ sizes: ['S', 'M', 'L', 'XL'], colors: [] }}
          productId={null}
          onSave={handleCreate}
          onCancel={() => setPanel(null)}
        />
      )}

      {/* Edit form */}
      {isEditing && !imagePanel && (
        <div className="space-y-sm">
          <ProductForm
            initial={panel}
            productId={panel.id}
            onSave={data => handleEdit(panel.id, data)}
            onCancel={() => setPanel(null)}
          />
          <button
            onClick={() => setPanel(null)}
            className="font-label-caps text-[10px] text-secondary hover:text-primary"
          >
            ← VOLVER AL CATÁLOGO
          </button>
        </div>
      )}

      {/* Image manager */}
      {imagePanel && (
        <ImageManager product={imagePanel} onDone={() => setImagePanel(null)} />
      )}

      {/* Search */}
      {!isEditing && (
        <div className="flex gap-sm">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') load(search) }}
            placeholder="BUSCAR POR NOMBRE O SKU..."
            className="border border-primary px-md py-xs font-label-caps text-label-caps text-sm focus:outline-none w-64"
          />
          <button onClick={() => load(search)} className="font-label-caps text-label-caps border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all">
            BUSCAR
          </button>
          {search && (
            <button onClick={() => { setSearch(''); load('') }} className="font-label-caps text-[10px] text-secondary hover:text-primary">
              LIMPIAR
            </button>
          )}
        </div>
      )}

      {/* Product table */}
      {!isEditing && (
        <div className="border border-primary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-md">
              <thead>
                <tr className="border-b border-primary font-label-caps text-[10px] text-secondary bg-surface-container-low">
                  {['IMAGEN', 'SKU', 'NOMBRE', 'CATEGORÍA', 'COLORES', 'PRECIO', 'STOCK', 'ESTADO', 'ACCIONES'].map(h => (
                    <th key={h} className="px-md py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {loading ? (
                  <tr><td colSpan={9} className="px-md py-lg text-center font-label-caps text-[10px] text-secondary">CARGANDO...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-md py-lg text-center font-label-caps text-[10px] text-secondary">SIN PRODUCTOS</td></tr>
                ) : filtered.map(p => {
                  const img = p.colors?.find(c => c.images?.[0])?.images[0] || p.images?.[0] || ''
                  return (
                    <tr key={p.id} className="hover:bg-surface-container transition-colors">
                      <td className="px-md py-3">
                        {img
                          ? <img src={img} alt={p.name} className="w-10 h-14 object-cover" />
                          : <div className="w-10 h-14 bg-surface-container-high flex items-center justify-center">
                              <span className="material-symbols-outlined text-[16px] text-secondary">image</span>
                            </div>
                        }
                      </td>
                      <td className="px-md py-3 font-label-caps text-[10px] text-secondary">{p.sku || '—'}</td>
                      <td className="px-md py-3 font-body-md text-sm max-w-[160px] truncate">{p.name}</td>
                      <td className="px-md py-3 font-label-caps text-[10px] text-secondary">{p.category || '—'}</td>
                      <td className="px-md py-3">
                        <div className="flex gap-xs flex-wrap">
                          {p.colors?.filter(c => c.name).map(c => (
                            <span
                              key={c.name}
                              title={c.name}
                              className="inline-block w-4 h-4 rounded-full border border-primary/20 flex-shrink-0"
                              style={{ backgroundColor: c.hex || '#ccc' }}
                            />
                          ))}
                          {(!p.colors?.length) && <span className="font-label-caps text-[10px] text-secondary">—</span>}
                        </div>
                      </td>
                      <td className="px-md py-3 font-label-caps text-sm whitespace-nowrap">{fmtCOP(p.price)}</td>
                      <td className="px-md py-3 font-label-caps text-sm">{p.totalStock ?? 0}</td>
                      <td className="px-md py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-label-caps ${
                          p.status === 'active'   ? 'bg-primary text-on-primary' :
                          p.status === 'sold-out' ? 'bg-red-100 text-red-700 border border-red-300' :
                          'border border-outline text-secondary'
                        }`}>
                          {p.status === 'active' ? 'ACTIVO' : p.status === 'sold-out' ? 'AGOTADO' : 'INACTIVO'}
                        </span>
                      </td>
                      <td className="px-md py-3">
                        <div className="flex gap-xs flex-wrap">
                          <button
                            onClick={() => { setPanel(p); setImagePanel(null) }}
                            className="font-label-caps text-[10px] border border-primary px-xs py-1 hover:bg-primary hover:text-on-primary transition-all"
                          >
                            EDITAR
                          </button>
                          <button
                            onClick={() => { setImagePanel(p); setPanel(null) }}
                            className="font-label-caps text-[10px] border border-primary px-xs py-1 hover:bg-primary hover:text-on-primary transition-all"
                          >
                            FOTOS ({p.images?.length ?? 0})
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="font-label-caps text-[10px] border border-red-400 text-red-500 px-xs py-1 hover:bg-red-500 hover:text-white transition-all"
                          >
                            ELIMINAR
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
