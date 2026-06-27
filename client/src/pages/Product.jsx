import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { useCart } from '../hooks/useCart'
import { apiFetch, fmtCOP } from '../lib/api'

export default function Product() {
  const { slug } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState(null)
  const [mainImg, setMainImg] = useState(0)
  const [adding, setAdding] = useState(false)
  const [addedMsg, setAddedMsg] = useState('')
  const { addItem } = useCart()

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    apiFetch(`/api/products/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(p => { setProduct(p); if (p?.sizes?.length) setSelectedSize(p.sizes[0]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  async function handleAdd() {
    if (!selectedSize || !product) return
    setAdding(true)
    const ok = await addItem(product.id, selectedSize, 1)
    setAdding(false)
    if (ok) { setAddedMsg('¡AGREGADO!'); setTimeout(() => setAddedMsg(''), 1500) }
  }

  if (loading) return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-label-caps text-label-caps text-secondary animate-pulse">CARGANDO...</span>
      </div>
    </PublicLayout>
  )

  if (!product) return (
    <PublicLayout>
      <div className="min-h-screen flex flex-col items-center justify-center gap-md">
        <p className="font-label-caps text-label-caps text-secondary">PRODUCTO NO ENCONTRADO</p>
        <Link to="/catalog" className="font-label-caps text-label-caps border-b border-primary pb-1">VOLVER AL CATÁLOGO</Link>
      </div>
    </PublicLayout>
  )

  const images = product.images || []
  const stock = product.stock || {}
  const isSoldOut = product.status === 'sold-out'
  const selectedSizeStock = selectedSize ? (stock[selectedSize] || 0) : 0

  return (
    <PublicLayout>
      <main className="pt-xl md:pt-[120px] max-w-[1440px] mx-auto px-gutter mb-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
          {/* Image gallery */}
          <div className="lg:col-span-7 space-y-md">
            <div className="relative group overflow-hidden bg-surface-container">
              {images.length > 0
                ? <img src={images[mainImg]} alt={product.name} className="w-full aspect-[3/4] object-cover hover:scale-105 transition-transform duration-700" />
                : <div className="w-full aspect-[3/4] bg-surface-container-high" />}
              {product.badge && (
                <div className="absolute top-md left-md">
                  <span className="bg-primary text-on-primary font-label-caps text-label-caps px-sm py-xs">{product.badge}</span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-xs">
                {images.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setMainImg(i)}
                    className={`cursor-pointer border-2 ${i === mainImg ? 'border-primary' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full aspect-square object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="lg:col-span-5 sticky top-[140px] space-y-lg">
            <header className="space-y-sm">
              <p className="font-label-caps text-label-caps text-secondary">{(product.category || '').toUpperCase()}</p>
              <h2 className="font-headline-xl text-headline-xl text-primary leading-tight">{product.name.toUpperCase()}</h2>
              <p className="font-label-caps text-headline-lg text-primary">{fmtCOP(product.price)}</p>
            </header>

            {product.description && (
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-prose">{product.description}</p>
            )}

            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-xs">
                {product.tags.map(t => (
                  <span key={t} className="font-label-caps text-[10px] border border-outline-variant px-xs py-1">{t}</span>
                ))}
              </div>
            )}

            {/* Size selector */}
            <div className="space-y-sm">
              <div className="flex justify-between items-center">
                <label className="font-label-caps text-label-caps">SELECCIONA TALLA</label>
                {selectedSize && <span className="font-label-caps text-[10px] text-secondary">{selectedSizeStock > 0 ? `${selectedSizeStock} DISPONIBLES` : 'AGOTADO'}</span>}
              </div>
              <div className="grid grid-cols-4 gap-xs">
                {(product.sizes || []).map(s => {
                  const inStock = (stock[s] || 0) > 0
                  const active = selectedSize === s
                  return (
                    <button
                      key={s}
                      onClick={() => inStock && setSelectedSize(s)}
                      disabled={!inStock}
                      className={`py-sm font-label-caps text-label-caps transition-all duration-200 ${
                        active ? 'bg-primary text-on-primary' :
                        inStock ? 'border border-primary hover:bg-primary hover:text-on-primary' :
                        'border border-outline-variant text-outline-variant cursor-not-allowed'
                      }`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-sm pt-md">
              <button
                onClick={handleAdd}
                disabled={isSoldOut || !selectedSize || selectedSizeStock === 0 || adding}
                className="w-full bg-primary text-on-primary py-md font-label-caps text-label-caps hover:bg-white hover:text-primary border border-primary transition-all duration-300 flex justify-center items-center gap-sm disabled:opacity-40"
              >
                {addedMsg || (adding ? 'AGREGANDO...' : isSoldOut ? 'AGOTADO' : 'AÑADIR AL CARRITO')}
                {!addedMsg && !adding && <span className="material-symbols-outlined text-[18px]">shopping_cart</span>}
              </button>
            </div>

            {/* Accordions */}
            <div className="pt-lg space-y-md border-t border-surface-container">
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none py-sm">
                  <span className="font-label-caps text-label-caps">ENVÍO Y DEVOLUCIONES</span>
                  <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <div className="pb-sm font-body-md text-secondary text-sm">
                  Envío en todo el país. Devoluciones aceptadas dentro de los 14 días en condición original.
                </div>
              </details>
              <details className="group border-t border-surface-container">
                <summary className="flex justify-between items-center cursor-pointer list-none py-sm">
                  <span className="font-label-caps text-label-caps">SOSTENIBILIDAD</span>
                  <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <div className="pb-sm font-body-md text-secondary text-sm">
                  Producimos en tiradas limitadas para minimizar el desperdicio. Usamos algodón orgánico 100% certificado GOTS y empaques reciclados.
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* More products */}
        <section className="mt-xl pt-xl border-t-2 border-primary">
          <div className="flex justify-between items-end mb-lg">
            <h3 className="font-headline-lg text-headline-lg tracking-tighter">VER MÁS</h3>
            <Link to="/catalog" className="font-label-caps text-label-caps border-b border-primary pb-1 hover:opacity-60 transition-opacity">VER TODO</Link>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}
