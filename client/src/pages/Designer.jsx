import { useState, useEffect, useRef, useCallback } from 'react'
import PublicLayout from '../components/PublicLayout'
import { apiFetch } from '../lib/api'
import { useToast } from '../components/Toast'

// ─────────────────────────────────────────────────────────────────
// Canvas editor: carga imágenes en refs para no re-cargarlas en
// cada render. El drag y el zoom escriben directo en stateRef para
// evitar re-renders de React durante la interacción (60fps).
// ─────────────────────────────────────────────────────────────────
function GarmentCanvas({ garmentUrl, designUrl, removeBg, canvasRef }) {
  const gImgRef = useRef(null)
  const dImgRef = useRef(null)
  const stateRef = useRef({ x: 300, y: 240, scale: 0.38, dragging: false, dx0: 0, dy0: 0 })
  const rafRef = useRef(null)

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    // Fondo blanco para que el composite guarde correctamente
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, W, H)

    const g = gImgRef.current
    if (g) ctx.drawImage(g, 0, 0, W, H)

    const d = dImgRef.current
    if (d) {
      const s = stateRef.current
      const dw = W * s.scale
      const dh = dw * (d.naturalHeight / d.naturalWidth)
      ctx.save()
      // multiply elimina fondos blancos fusionándolos con la prenda
      ctx.globalCompositeOperation = removeBg ? 'multiply' : 'source-over'
      ctx.drawImage(d, s.x - dw / 2, s.y - dh / 2, dw, dh)
      ctx.restore()
    }
  }

  // Cargar prenda
  useEffect(() => {
    if (!garmentUrl) return
    const img = new Image()
    img.onload = () => { gImgRef.current = img; redraw() }
    img.src = garmentUrl
  }, [garmentUrl])

  // Cargar diseño
  useEffect(() => {
    if (!designUrl) { dImgRef.current = null; redraw(); return }
    const img = new Image()
    img.onload = () => { dImgRef.current = img; redraw() }
    img.src = designUrl
  }, [designUrl])

  // Redibujar cuando cambia el modo de fondo
  useEffect(() => { redraw() }, [removeBg])

  // ── Utilidad: coordenadas del canvas normalizadas ───────────────
  function toCanvasPos(clientX, clientY) {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left) * (canvasRef.current.width  / rect.width),
      y: (clientY - rect.top)  * (canvasRef.current.height / rect.height),
    }
  }

  // ── Mouse ───────────────────────────────────────────────────────
  function onMouseDown(e) {
    const { x, y } = toCanvasPos(e.clientX, e.clientY)
    const s = stateRef.current
    stateRef.current = { ...s, dragging: true, dx0: x - s.x, dy0: y - s.y }
  }
  function onMouseMove(e) {
    if (!stateRef.current.dragging) return
    const { x, y } = toCanvasPos(e.clientX, e.clientY)
    stateRef.current.x = x - stateRef.current.dx0
    stateRef.current.y = y - stateRef.current.dy0
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(redraw)
  }
  function onMouseUp() { stateRef.current.dragging = false }

  // ── Touch ───────────────────────────────────────────────────────
  const lastTouchDist = useRef(null)
  function onTouchStart(e) {
    e.preventDefault()
    if (e.touches.length === 1) {
      const t = e.touches[0]
      onMouseDown({ clientX: t.clientX, clientY: t.clientY })
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.hypot(dx, dy)
    }
  }
  function onTouchMove(e) {
    e.preventDefault()
    if (e.touches.length === 1) {
      const t = e.touches[0]
      onMouseMove({ clientX: t.clientX, clientY: t.clientY })
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      if (lastTouchDist.current) {
        const ratio = dist / lastTouchDist.current
        stateRef.current.scale = Math.max(0.08, Math.min(1.5, stateRef.current.scale * ratio))
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(redraw)
      }
      lastTouchDist.current = dist
    }
  }
  function onTouchEnd() { onMouseUp(); lastTouchDist.current = null }

  // ── Scroll = zoom sobre el diseño ───────────────────────────────
  function onWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.04 : 0.04
    stateRef.current.scale = Math.max(0.08, Math.min(1.5, stateRef.current.scale + delta))
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(redraw)
  }

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={800}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ touchAction: 'none' }}
      className="w-full max-w-xs mx-auto border border-primary/20 bg-white cursor-move block"
    />
  )
}

// ─────────────────────────────────────────────────────────────────
// Paso 1 — Seleccionar prenda base
// ─────────────────────────────────────────────────────────────────
function StepGarment({ onSelect }) {
  const [garments, setGarments] = useState([])
  const [loading, setLoading] = useState(true)
  const [side, setSide] = useState({})

  useEffect(() => {
    apiFetch('/api/design/garments')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setGarments(d?.garments || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO PRENDAS...</p>

  if (!garments.length) return (
    <div className="text-center py-xl border-2 border-dashed border-primary/20 rounded-none">
      <span className="material-symbols-outlined text-[64px] text-secondary block mb-md">checkroom</span>
      <p className="font-label-caps text-label-caps text-secondary mb-xs">SIN PRENDAS BASE</p>
      <p className="font-body-md text-body-md text-secondary text-sm">El admin debe subir plantillas en Panel → Diseños</p>
    </div>
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-md">
      {garments.map(g => {
        const isFront = (side[g.id] ?? 'front') === 'front'
        const imgUrl  = isFront ? g.imageUrl : (g.backImageUrl || g.imageUrl)
        return (
          <div key={g.id} className="border border-primary/20 hover:border-primary transition-colors">
            <div
              className="aspect-[3/4] bg-surface-container overflow-hidden cursor-pointer"
              onClick={() => onSelect({ ...g, selectedSide: side[g.id] ?? 'front' })}
            >
              <img src={imgUrl} alt={g.name} className="w-full h-full object-contain" />
            </div>
            <div className="p-sm flex justify-between items-center">
              <p className="font-label-caps text-label-caps text-sm truncate">{g.name}</p>
              {g.backImageUrl && (
                <button
                  onClick={() => setSide(s => ({ ...s, [g.id]: isFront ? 'back' : 'front' }))}
                  className="font-label-caps text-[10px] text-secondary hover:text-primary transition-colors ml-xs"
                >
                  {isFront ? 'TRASERA' : 'FRONTAL'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Paso 2 — Fuente del diseño (catálogo / subir / IA)
// ─────────────────────────────────────────────────────────────────
function StepDesign({ onSelect }) {
  const toast = useToast()
  const [tab, setTab]         = useState('catalog')
  const [catalog, setCatalog] = useState([])
  const [loadingCat, setLoadingCat] = useState(true)
  const [prompt, setPrompt]   = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    apiFetch('/api/design/catalog')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setCatalog(d?.designs || []); setLoadingCat(false) })
      .catch(() => setLoadingCat(false))
  }, [])

  async function handleGenerate(e) {
    e.preventDefault()
    if (!prompt.trim()) return
    setGenerating(true)
    const res = await apiFetch('/api/design/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      onSelect(d.url)
    } else {
      const d = await res?.json().catch(() => ({}))
      toast(d?.error || 'Error al generar. Intenta de nuevo.', 'error')
    }
    setGenerating(false)
  }

  function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    onSelect(URL.createObjectURL(file))
  }

  const TABS = [
    { id: 'catalog', label: 'CATÁLOGO',      icon: 'grid_view' },
    { id: 'upload',  label: 'SUBIR IMAGEN',  icon: 'upload' },
    { id: 'ai',      label: 'GENERAR CON IA', icon: 'auto_awesome' },
  ]

  return (
    <div>
      <div className="flex border-b border-primary/20 mb-lg gap-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-xs font-label-caps text-label-caps px-md py-sm transition-colors ${
              tab === t.id ? 'border-b-2 border-primary text-primary' : 'text-secondary hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        loadingCat
          ? <p className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO...</p>
          : catalog.length === 0
            ? (
              <div className="text-center py-xl border-2 border-dashed border-primary/20">
                <span className="material-symbols-outlined text-[48px] text-secondary block mb-sm">palette</span>
                <p className="font-label-caps text-label-caps text-secondary">SIN DISEÑOS EN CATÁLOGO</p>
                <p className="font-body-md text-body-md text-secondary text-sm mt-xs">Usa IA o sube tu propia imagen</p>
              </div>
            )
            : (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-sm">
                {catalog.map(d => (
                  <button key={d.id} onClick={() => onSelect(d.imageUrl)}
                    className="aspect-square border border-primary/20 hover:border-primary transition-colors overflow-hidden"
                  >
                    <img src={d.imageUrl} alt={d.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )
      )}

      {tab === 'upload' && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 hover:border-primary transition-colors cursor-pointer p-xl gap-md">
          <span className="material-symbols-outlined text-[64px] text-secondary">upload_file</span>
          <p className="font-label-caps text-label-caps">SELECCIONAR IMAGEN</p>
          <p className="font-body-md text-body-md text-secondary text-sm text-center">
            PNG, JPG, WEBP — máx. 10 MB<br />
            <span className="text-xs">Tip: imágenes con fondo blanco funcionan mejor con "Quitar fondo"</span>
          </p>
          <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} />
        </label>
      )}

      {tab === 'ai' && (
        <form onSubmit={handleGenerate} className="space-y-md">
          <div>
            <label className="font-label-caps text-label-caps block mb-xs">DESCRIBE TU DISEÑO</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={4}
              placeholder="Ej: logo minimalista con raíces entrelazadas, estilo arquitectónico, sobre fondo blanco, blanco y negro..."
              className="w-full border border-primary px-md py-sm font-body-md text-body-md focus:outline-none resize-none"
            />
            <p className="font-label-caps text-[10px] text-secondary mt-xs">Tip: incluye "sobre fondo blanco" para mejor remoción de fondo</p>
          </div>
          <button type="submit" disabled={generating || !prompt.trim()}
            className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-md hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40"
          >
            {generating ? 'GENERANDO...' : 'GENERAR DISEÑO'}
          </button>
        </form>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Paso 3 — Editor canvas
// ─────────────────────────────────────────────────────────────────
function StepPreview({ garment, designUrl, onSave }) {
  const toast    = useToast()
  const canvasRef = useRef(null)
  const [removeBg, setRemoveBg] = useState(true)
  const [saving, setSaving]     = useState(false)

  const garmentUrl = garment.selectedSide === 'back' && garment.backImageUrl
    ? garment.backImageUrl
    : garment.imageUrl

  async function handleSave() {
    setSaving(true)
    canvasRef.current.toBlob(async blob => {
      const form = new FormData()
      form.append('image', blob, 'composite.png')
      try {
        const res = await fetch('/api/design/save-composite', {
          method: 'POST', credentials: 'include', body: form,
        })
        const d = await res.json()
        if (d.url) onSave(d.url)
        else toast('Error al guardar.', 'error')
      } catch { toast('Error de conexión.', 'error') }
      setSaving(false)
    }, 'image/png')
  }

  return (
    <div className="flex flex-col lg:flex-row gap-xl">
      {/* Canvas */}
      <div className="flex-1 min-w-0">
        <GarmentCanvas
          garmentUrl={garmentUrl}
          designUrl={designUrl}
          removeBg={removeBg}
          canvasRef={canvasRef}
        />
        <p className="font-label-caps text-[10px] text-secondary text-center mt-sm">
          ARRASTRA el diseño · SCROLL / PELLIZCA para cambiar tamaño
        </p>
      </div>

      {/* Controles */}
      <div className="w-full lg:w-56 space-y-lg flex-shrink-0">
        <div>
          <p className="font-label-caps text-label-caps mb-md">OPCIONES</p>

          <label className="flex items-center justify-between border border-primary/20 px-sm py-xs cursor-pointer hover:border-primary transition-colors">
            <span className="font-label-caps text-label-caps text-sm">QUITAR FONDO</span>
            <input
              type="checkbox"
              checked={removeBg}
              onChange={e => setRemoveBg(e.target.checked)}
              className="w-4 h-4 accent-black"
            />
          </label>
          <p className="font-label-caps text-[10px] text-secondary mt-xs">
            Elimina fondos blancos/claros fusionando el diseño con la prenda
          </p>
        </div>

        <div className="border-t border-primary/10 pt-lg space-y-sm">
          <p className="font-label-caps text-[10px] text-secondary">ATAJOS</p>
          <p className="font-body-md text-body-md text-secondary text-sm">🖱 Arrastra → mover</p>
          <p className="font-body-md text-body-md text-secondary text-sm">⚙ Scroll → zoom</p>
          <p className="font-body-md text-body-md text-secondary text-sm">👌 Pellizca → zoom (móvil)</p>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-md hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40"
        >
          {saving ? 'GUARDANDO...' : 'GUARDAR DISEÑO'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────
export default function Designer() {
  const [step, setStep]         = useState(1)
  const [garment, setGarment]   = useState(null)
  const [designUrl, setDesignUrl] = useState(null)
  const [savedUrl, setSavedUrl] = useState(null)

  const STEPS = ['PRENDA', 'DISEÑO', 'EDITOR', 'PEDIR']

  const waText = encodeURIComponent('Hola! Quiero pedir esta prenda personalizada de One Root Co.')
  const waUrl  = `https://wa.me/573118064799?text=${waText}`

  return (
    <PublicLayout>
      <main className="max-w-5xl mx-auto px-gutter py-xl min-h-screen">
        <header className="mb-lg">
          <h1 className="font-display-lg text-headline-xl text-primary mb-xs">CREA TU DISEÑO</h1>
          <p className="font-label-caps text-label-caps text-secondary tracking-[0.2em]">PERSONALIZA TU PRENDA — PASO {step} DE 4</p>
        </header>

        {/* Barra de progreso clicable */}
        <div className="flex mb-xl border border-primary/20">
          {STEPS.map((s, i) => (
            <button
              key={s}
              disabled={i + 1 > step}
              onClick={() => { if (i + 1 < step) setStep(i + 1) }}
              className={`flex-1 py-sm font-label-caps text-label-caps border-r border-primary/20 last:border-r-0 transition-colors ${
                i + 1 < step  ? 'bg-primary text-on-primary cursor-pointer hover:bg-primary/80' :
                i + 1 === step ? 'bg-primary/10 text-primary' :
                'text-secondary/40 cursor-not-allowed'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {step === 1 && (
          <section>
            <h2 className="font-label-caps text-label-caps mb-lg">SELECCIONA LA PRENDA BASE</h2>
            <StepGarment onSelect={g => { setGarment(g); setStep(2) }} />
          </section>
        )}

        {step === 2 && (
          <section>
            <div className="flex items-center gap-md mb-lg">
              <button onClick={() => setStep(1)} className="material-symbols-outlined text-secondary hover:text-primary transition-colors">arrow_back</button>
              <h2 className="font-label-caps text-label-caps">ELIGE O CREA TU DISEÑO</h2>
            </div>
            <StepDesign onSelect={url => { setDesignUrl(url); setStep(3) }} />
          </section>
        )}

        {step === 3 && garment && designUrl && (
          <section>
            <div className="flex items-center gap-md mb-lg">
              <button onClick={() => setStep(2)} className="material-symbols-outlined text-secondary hover:text-primary transition-colors">arrow_back</button>
              <h2 className="font-label-caps text-label-caps">AJUSTA TU DISEÑO</h2>
            </div>
            <StepPreview garment={garment} designUrl={designUrl} onSave={url => { setSavedUrl(url); setStep(4) }} />
          </section>
        )}

        {step === 4 && savedUrl && (
          <section className="text-center py-xl space-y-lg">
            <span className="material-symbols-outlined text-[64px] text-primary">check_circle</span>
            <h2 className="font-headline-lg text-headline-lg text-primary">¡DISEÑO LISTO!</h2>
            <div className="border border-primary max-w-xs mx-auto overflow-hidden">
              <img src={savedUrl} alt="Tu diseño final" className="w-full" />
            </div>
            <p className="font-body-md text-secondary max-w-md mx-auto">
              Envíanos este diseño por WhatsApp y lo producimos a tu medida.
            </p>
            <div className="flex flex-col sm:flex-row gap-md justify-center">
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-primary text-on-primary font-label-caps text-label-caps px-lg py-md hover:bg-white hover:text-primary border border-primary transition-all"
              >
                PEDIR POR WHATSAPP
              </a>
              <button
                onClick={() => { setStep(1); setGarment(null); setDesignUrl(null); setSavedUrl(null) }}
                className="font-label-caps text-label-caps border border-primary px-lg py-md hover:bg-primary hover:text-on-primary transition-all"
              >
                NUEVO DISEÑO
              </button>
            </div>
          </section>
        )}
      </main>
    </PublicLayout>
  )
}
