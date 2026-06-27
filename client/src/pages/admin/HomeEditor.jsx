import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'

const TEXT_FIELDS = [
  { key: 'heroBadge',           label: 'HERO BADGE',            type: 'text' },
  { key: 'heroTitle',           label: 'HERO TÍTULO',           type: 'textarea' },
  { key: 'heroSubtitle',        label: 'HERO SUBTÍTULO',        type: 'textarea' },
  { key: 'arrivalsTitle',       label: 'TÍTULO NOVEDADES',      type: 'text' },
  { key: 'collectionsTitle',    label: 'TÍTULO COLECCIONES',    type: 'text' },
  { key: 'collectionsSubtitle', label: 'SUBTÍTULO COLECCIONES', type: 'text' },
]

export default function HomeEditor() {
  const toast    = useToast()
  const heroRef  = useRef(null)
  const [settings, setSettings] = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    apiFetch('/api/settings/home')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setSettings(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    const res = await apiFetch('/api/settings/home', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }).catch(() => null)
    setSaving(false)
    if (res?.ok) toast('Guardado correctamente.', 'success')
    else toast('Error al guardar.', 'error')
  }

  async function uploadHero(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch('/api/settings/hero-image', {
      method: 'POST', credentials: 'include', body: fd,
    }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    if (res?.ok && d.url) {
      setSettings(s => ({ ...s, heroBg: d.url }))
      toast('Imagen hero subida.', 'success')
    } else {
      toast(d?.error || 'Error al subir imagen.', 'error')
    }
    setUploading(false)
    if (heroRef.current) heroRef.current.value = ''
  }

  if (loading) return <div className="p-lg font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO...</div>

  return (
    <div className="p-lg space-y-lg">
      <div className="flex justify-between items-center flex-wrap gap-sm">
        <h1 className="font-headline-lg text-headline-lg text-primary">HOME EDITOR</h1>
        <button
          onClick={save}
          disabled={saving}
          className="font-label-caps text-label-caps border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
        >
          {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
        </button>
      </div>

      {/* Hero background image */}
      <div className="border border-primary p-md space-y-sm">
        <p className="font-label-caps text-label-caps">IMAGEN DE FONDO HERO</p>

        {settings.heroBg && (
          <div
            className="h-40 bg-cover bg-center border border-primary/20"
            style={{ backgroundImage: `url('${settings.heroBg}')` }}
          />
        )}

        <div className="flex gap-sm items-center flex-wrap">
          <label className={`font-label-caps text-[10px] border border-primary px-sm py-xs transition-all cursor-pointer ${uploading ? 'opacity-40' : 'hover:bg-primary hover:text-on-primary'}`}>
            {uploading ? 'SUBIENDO...' : 'SUBIR IMAGEN'}
            <input ref={heroRef} type="file" accept="image/*" className="sr-only" onChange={uploadHero} disabled={uploading} />
          </label>
          <span className="font-label-caps text-[9px] text-secondary">PNG, JPG, WEBP — máx. 15MB — se convierte a WEBP optimizado</span>
        </div>

        <div>
          <label className="font-label-caps text-[10px] text-secondary block mb-xs">O PEGAR URL DIRECTAMENTE</label>
          <input
            type="text"
            value={settings.heroBg || ''}
            onChange={e => setSettings(s => ({ ...s, heroBg: e.target.value }))}
            placeholder="https://... o /uploads/settings/hero-xxx.webp"
            className="w-full border border-primary px-sm py-xs font-body-md text-sm focus:outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Text fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {TEXT_FIELDS.map(f => (
          <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
            <label className="font-label-caps text-[10px] text-secondary block mb-1">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea
                rows={3}
                value={settings[f.key] || ''}
                onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))}
                className="w-full border border-primary px-sm py-xs font-body-md text-sm focus:outline-none resize-none bg-transparent"
              />
            ) : (
              <input
                type="text"
                value={settings[f.key] || ''}
                onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))}
                className="w-full border border-primary px-sm py-xs font-body-md text-sm focus:outline-none bg-transparent"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
