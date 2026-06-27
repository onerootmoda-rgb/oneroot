import { useState, useEffect, useRef } from 'react'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'

export default function Collections() {
  const toast  = useToast()
  const [data, setData]     = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState(null)
  const fileRefs = useRef([])

  useEffect(() => {
    apiFetch('/api/settings/collections')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    const res = await apiFetch('/api/settings/collections', {
      method: 'PUT',
      body: JSON.stringify(data),
    }).catch(() => null)
    setSaving(false)
    if (res?.ok) toast('Colecciones guardadas.', 'success')
    else toast('Error al guardar.', 'error')
  }

  const cols = data?.collections || []

  function updateCol(i, field, val) {
    const next = [...cols]
    next[i] = { ...next[i], [field]: val }
    setData({ ...data, collections: next })
  }

  async function uploadImage(i, e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingIdx(i)
    const fd = new FormData()
    fd.append('image', file)
    const res = await fetch('/api/settings/collection-image', {
      method: 'POST', credentials: 'include', body: fd,
    }).catch(() => null)
    const d = await res?.json().catch(() => ({}))
    if (res?.ok && d.url) {
      updateCol(i, 'image', d.url)
      toast('Imagen subida. Guarda para aplicar.', 'success')
    } else {
      toast(d?.error || 'Error al subir imagen.', 'error')
    }
    setUploadingIdx(null)
    if (fileRefs.current[i]) fileRefs.current[i].value = ''
  }

  return (
    <div className="p-lg space-y-lg">
      <div className="flex justify-between items-center flex-wrap gap-sm">
        <h1 className="font-headline-lg text-headline-lg text-primary">COLECCIONES</h1>
        <button
          onClick={save}
          disabled={saving}
          className="font-label-caps text-label-caps border border-primary px-md py-xs hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40"
        >
          {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
        </button>
      </div>

      {!data ? (
        <p className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO...</p>
      ) : (
        <div className="space-y-md">
          {cols.map((c, i) => (
            <div key={i} className="border border-primary p-md space-y-md">
              <div className="flex items-center justify-between">
                <p className="font-label-caps text-label-caps">COLECCIÓN {i + 1}</p>
                <label className="flex items-center gap-xs font-label-caps text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!c.featured}
                    onChange={e => updateCol(i, 'featured', e.target.checked)}
                  />
                  DESTACADA
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {/* Nombre */}
                <div>
                  <label className="font-label-caps text-[10px] text-secondary block mb-1">NOMBRE</label>
                  <input
                    value={c.name || ''}
                    onChange={e => updateCol(i, 'name', e.target.value)}
                    className="w-full border border-primary px-sm py-xs font-body-md text-sm focus:outline-none bg-transparent"
                  />
                </div>

                {/* Etiqueta */}
                <div>
                  <label className="font-label-caps text-[10px] text-secondary block mb-1">ETIQUETA (OPCIONAL)</label>
                  <input
                    value={c.label || ''}
                    onChange={e => updateCol(i, 'label', e.target.value)}
                    className="w-full border border-primary px-sm py-xs font-body-md text-sm focus:outline-none bg-transparent"
                  />
                </div>

                {/* Enlace */}
                <div className="md:col-span-2">
                  <label className="font-label-caps text-[10px] text-secondary block mb-1">ENLACE</label>
                  <input
                    value={c.link || ''}
                    onChange={e => updateCol(i, 'link', e.target.value)}
                    className="w-full border border-primary px-sm py-xs font-body-md text-sm focus:outline-none bg-transparent"
                  />
                </div>

                {/* Imagen */}
                <div className="md:col-span-2">
                  <label className="font-label-caps text-[10px] text-secondary block mb-1">IMAGEN</label>
                  <div className="flex gap-sm items-start flex-wrap">
                    {/* Preview */}
                    {c.image && (
                      <img
                        src={c.image}
                        alt={c.name}
                        className="w-24 h-24 object-cover border border-primary/20 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 space-y-xs">
                      {/* Upload button */}
                      <label className={`inline-flex items-center gap-xs font-label-caps text-[10px] border border-primary px-sm py-xs transition-all cursor-pointer ${uploadingIdx === i ? 'opacity-40' : 'hover:bg-primary hover:text-on-primary'}`}>
                        <span className="material-symbols-outlined text-[14px]">upload</span>
                        {uploadingIdx === i ? 'SUBIENDO...' : 'SUBIR IMAGEN'}
                        <input
                          ref={el => fileRefs.current[i] = el}
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploadingIdx === i}
                          onChange={e => uploadImage(i, e)}
                        />
                      </label>
                      <p className="font-label-caps text-[9px] text-secondary">PNG, JPG, WEBP — máx. 15MB</p>
                      {/* URL manual */}
                      <input
                        value={c.image || ''}
                        onChange={e => updateCol(i, 'image', e.target.value)}
                        placeholder="O pegar URL directamente"
                        className="w-full border border-primary/30 px-sm py-xs font-body-md text-[11px] focus:outline-none bg-transparent focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
