import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import { fmtDate } from '@/lib/utils'
import { useToast } from '@/components/Toast'

// ── Subcomponente: gestión de plantillas de prendas ──────────────
function GarmentsTab() {
  const toast = useToast()
  const [garments, setGarments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const frontRef = useRef(null)
  const backRef  = useRef(null)

  async function load() {
    const res = await apiFetch('/api/design/garments').catch(() => null)
    if (res?.ok) { const d = await res.json(); setGarments(d.garments || []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleUpload(e) {
    e.preventDefault()
    const front = frontRef.current?.files?.[0]
    if (!front) return toast('La imagen frontal es obligatoria.', 'error')
    setUploading(true)
    const form = new FormData()
    form.append('name', name || 'Prenda')
    form.append('front', front)
    const back = backRef.current?.files?.[0]
    if (back) form.append('back', back)

    const res = await fetch('/api/design/garments', {
      method: 'POST', credentials: 'include', body: form,
    }).catch(() => null)

    if (res?.ok) {
      toast('Prenda subida.', 'success')
      setName('')
      if (frontRef.current) frontRef.current.value = ''
      if (backRef.current) backRef.current.value = ''
      load()
    } else {
      const d = await res?.json().catch(() => ({}))
      toast(d?.error || 'Error al subir.', 'error')
    }
    setUploading(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta plantilla?')) return
    const res = await apiFetch(`/api/design/garments/${id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) { toast('Prenda eliminada.', 'success'); load() }
    else toast('Error al eliminar.', 'error')
  }

  return (
    <div className="space-y-lg">
      {/* Formulario subir */}
      <form onSubmit={handleUpload} className="border border-primary p-md space-y-md max-w-xl">
        <p className="font-label-caps text-label-caps">SUBIR PLANTILLA DE PRENDA</p>
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">NOMBRE DE LA PRENDA</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Camiseta Blanca Oversize"
            className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent" />
        </div>
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">IMAGEN FRONTAL *</label>
          <input ref={frontRef} type="file" accept="image/*"
            className="font-label-caps text-[10px] text-secondary file:mr-sm file:font-label-caps file:text-[10px] file:border file:border-primary file:px-sm file:py-xs file:bg-transparent file:hover:bg-primary file:hover:text-on-primary file:transition-all file:cursor-pointer" />
          <p className="font-label-caps text-[10px] text-secondary mt-xs">PNG con fondo transparente o blanco · Recomendado: 600×800px</p>
        </div>
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">IMAGEN TRASERA (opcional)</label>
          <input ref={backRef} type="file" accept="image/*"
            className="font-label-caps text-[10px] text-secondary file:mr-sm file:font-label-caps file:text-[10px] file:border file:border-primary file:px-sm file:py-xs file:bg-transparent file:hover:bg-primary file:hover:text-on-primary file:transition-all file:cursor-pointer" />
        </div>
        <button type="submit" disabled={uploading}
          className="font-label-caps text-label-caps bg-primary text-on-primary px-lg py-xs hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40">
          {uploading ? 'SUBIENDO...' : 'SUBIR PRENDA'}
        </button>
      </form>

      {/* Listado */}
      {loading ? (
        <p className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO...</p>
      ) : garments.length === 0 ? (
        <div className="text-center py-xl border-2 border-dashed border-primary/20">
          <span className="material-symbols-outlined text-[48px] text-secondary block mb-sm">checkroom</span>
          <p className="font-label-caps text-label-caps text-secondary">SIN PLANTILLAS — SUBE LA PRIMERA</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-md">
          {garments.map(g => (
            <div key={g.id} className="border border-primary group relative">
              <div className="aspect-[3/4] overflow-hidden bg-surface-container">
                <img src={g.imageUrl} alt={g.name} className="w-full h-full object-contain" />
              </div>
              {g.backImageUrl && (
                <div className="absolute top-0 left-0 bg-primary/80 px-xs py-0.5">
                  <span className="font-label-caps text-[8px] text-on-primary">F+T</span>
                </div>
              )}
              <div className="p-sm flex justify-between items-center">
                <p className="font-label-caps text-[10px] truncate">{g.name}</p>
                <button onClick={() => handleDelete(g.id)}
                  className="font-label-caps text-[10px] text-red-500 hover:text-red-700 transition-colors ml-xs">
                  ✕
                </button>
              </div>
              <p className="px-sm pb-xs font-label-caps text-[8px] text-secondary">{fmtDate(g.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Subcomponente: catálogo de diseños ──────────────────────────
function CatalogTab() {
  const toast = useToast()
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('General')
  const fileRef = useRef(null)

  async function load() {
    const res = await apiFetch('/api/design/catalog').catch(() => null)
    if (res?.ok) { const d = await res.json(); setDesigns(d.designs || []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleUpload(e) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return toast('Selecciona una imagen.', 'error')
    setUploading(true)
    const form = new FormData()
    form.append('image', file)
    form.append('name', name || 'Diseño')
    form.append('category', category)

    const res = await fetch('/api/design/catalog', {
      method: 'POST', credentials: 'include', body: form,
    }).catch(() => null)

    if (res?.ok) {
      toast('Diseño añadido al catálogo.', 'success')
      setName('')
      if (fileRef.current) fileRef.current.value = ''
      load()
    } else {
      const d = await res?.json().catch(() => ({}))
      toast(d?.error || 'Error al subir.', 'error')
    }
    setUploading(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este diseño del catálogo?')) return
    const res = await apiFetch(`/api/design/catalog/${id}`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) { toast('Diseño eliminado.', 'success'); load() }
    else toast('Error al eliminar.', 'error')
  }

  return (
    <div className="space-y-lg">
      {/* Formulario subir */}
      <form onSubmit={handleUpload} className="border border-primary p-md space-y-md max-w-xl">
        <p className="font-label-caps text-label-caps">AGREGAR DISEÑO AL CATÁLOGO</p>
        <div className="grid grid-cols-2 gap-md">
          <div>
            <label className="font-label-caps text-[10px] text-secondary block mb-xs">NOMBRE</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del diseño"
              className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent" />
          </div>
          <div>
            <label className="font-label-caps text-[10px] text-secondary block mb-xs">CATEGORÍA</label>
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="General"
              className="w-full border-b border-primary px-xs py-xs font-body-md text-sm focus:outline-none bg-transparent" />
          </div>
        </div>
        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">IMAGEN *</label>
          <input ref={fileRef} type="file" accept="image/*"
            className="font-label-caps text-[10px] text-secondary file:mr-sm file:font-label-caps file:text-[10px] file:border file:border-primary file:px-sm file:py-xs file:bg-transparent file:hover:bg-primary file:hover:text-on-primary file:transition-all file:cursor-pointer" />
          <p className="font-label-caps text-[10px] text-secondary mt-xs">PNG con fondo blanco o transparente recomendado</p>
        </div>
        <button type="submit" disabled={uploading}
          className="font-label-caps text-label-caps bg-primary text-on-primary px-lg py-xs hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40">
          {uploading ? 'SUBIENDO...' : 'AGREGAR AL CATÁLOGO'}
        </button>
      </form>

      {/* Listado */}
      {loading ? (
        <p className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO...</p>
      ) : designs.length === 0 ? (
        <div className="text-center py-xl border-2 border-dashed border-primary/20">
          <span className="material-symbols-outlined text-[48px] text-secondary block mb-sm">palette</span>
          <p className="font-label-caps text-label-caps text-secondary">SIN DISEÑOS EN EL CATÁLOGO</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-sm">
          {designs.map(d => (
            <div key={d.id} className="border border-primary group relative">
              <div className="aspect-square overflow-hidden bg-surface-container">
                <img src={d.imageUrl} alt={d.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-xs flex justify-between items-center">
                <p className="font-label-caps text-[9px] truncate">{d.name}</p>
                <button onClick={() => handleDelete(d.id)} className="font-label-caps text-[10px] text-red-500 hover:text-red-700 ml-xs">✕</button>
              </div>
              <p className="px-xs pb-xs font-label-caps text-[8px] text-secondary">{d.category}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Subcomponente: diseños generados/guardados ──────────────────
function CompositeTab() {
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/design/list')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDesigns(d?.designs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO...</p>

  if (!designs.length) return (
    <div className="text-center py-xl border-2 border-dashed border-primary/20">
      <span className="material-symbols-outlined text-[48px] text-secondary block mb-sm">draw</span>
      <p className="font-label-caps text-label-caps text-secondary">SIN DISEÑOS PERSONALIZADOS AÚN</p>
      <p className="font-body-md text-body-md text-secondary text-sm mt-xs">Aparecerán aquí cuando los clientes guarden sus diseños en /personalizar</p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
      {designs.map(d => (
        <div key={d.id} className="border border-primary overflow-hidden">
          {d.imageUrl && (
            <img src={d.imageUrl} alt="Diseño personalizado" className="w-full aspect-square object-cover" />
          )}
          <div className="p-sm">
            <p className="font-label-caps text-[10px] text-secondary">{fmtDate(d.createdAt)}</p>
            {d.prompt && <p className="font-body-md text-sm mt-1 truncate text-secondary">{d.prompt}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Panel principal ─────────────────────────────────────────────
export default function Designs() {
  const [tab, setTab] = useState('garments')

  const TABS = [
    { id: 'garments', label: 'PRENDAS BASE',      icon: 'checkroom' },
    { id: 'catalog',  label: 'CATÁLOGO DISEÑOS',  icon: 'palette' },
    { id: 'saved',    label: 'DISEÑOS GUARDADOS', icon: 'draw' },
  ]

  return (
    <div className="p-lg space-y-lg">
      <h1 className="font-headline-lg text-headline-lg text-primary">DISEÑOS</h1>

      <div className="flex border-b border-primary/20">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs font-label-caps text-label-caps px-md py-sm transition-colors border-b-2 ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'
            }`}>
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'garments' && <GarmentsTab />}
      {tab === 'catalog'  && <CatalogTab />}
      {tab === 'saved'    && <CompositeTab />}
    </div>
  )
}
