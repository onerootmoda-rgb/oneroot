import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { useCart } from '../hooks/useCart'
import { apiFetch, fmtCOP } from '../lib/api'

const CATEGORIES = ['Oversized Tees', 'Heavy Hoodies', 'Cargo Systems', 'Technical Outerwear']
const SIZES = ['S', 'M', 'L', 'XL']
const COLORS = [
  { label: 'Obsidian',    value: 'black',      bg: '#000000' },
  { label: 'Ghost Gray',  value: 'ghost gray',  bg: '#E2E2E2' },
  { label: 'Iron',        value: 'iron',        bg: '#4C4546' },
  { label: 'Stark White', value: 'white',       bg: '#FFFFFF' },
]

export default function Catalog() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState(null)
  const [size, setSize] = useState(null)
  const [adding, setAdding] = useState(null)
  const { addItem } = useCart()

  const searchQuery = searchParams.get('search') || ''
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (size) params.set('size', size)
    if (searchQuery) params.set('search', searchQuery)
    const res = await apiFetch(`/api/products?${params}`).catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setProducts(d.products || [])
    }
    setLoading(false)
  }, [category, size, searchQuery])

  useEffect(() => { load() }, [load])

  async function handleQuickAdd(product, e) {
    e.stopPropagation()
    setAdding(product.id)
    const sizes = product.sizes || []
    const stock = product.stock || {}
    const availSize = sizes.find(s => (stock[s] || 0) > 0)
    if (!availSize) { setAdding(null); return }
    await addItem(product.id, availSize, 1)
    setAdding(null)
  }

  return (
    <PublicLayout>
      <main className="pt-xl min-h-screen">
        <div className="max-w-[1440px] mx-auto px-gutter py-xl">
          <header className="mb-xl">
            <h1 className="font-display-lg text-headline-xl text-primary mb-xs">CATÁLOGO_01</h1>
            <p className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em]">
              {searchQuery ? `RESULTADOS PARA: ${searchQuery.toUpperCase()}` : 'Esenciales para el paisaje urbano arquitectónico'}
            </p>
          </header>

          <div className="flex flex-col md:flex-row gap-xl">
            {/* Sidebar */}
            <aside className="w-full md:w-64 flex-shrink-0 space-y-xl">
              <section>
                <h3 className="font-label-caps text-label-caps mb-md border-b border-outline pb-xs">CATEGORÍA</h3>
                <div className="flex flex-col gap-xs">
                  {CATEGORIES.map(c => (
                    <label key={c} className="flex items-center gap-xs cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={category === c}
                        onChange={() => setCategory(category === c ? null : c)}
                        className="border-primary text-primary focus:ring-0"
                      />
                      <span className="font-body-md text-body-md group-hover:pl-xs transition-all duration-200">{c}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-label-caps text-label-caps mb-md border-b border-outline pb-xs">TALLA</h3>
                <div className="grid grid-cols-4 gap-xs">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => setSize(size === s ? null : s)}
                      className={`border py-xs font-label-caps text-label-caps transition-colors ${size === s ? 'bg-primary text-on-primary border-primary' : 'border-outline hover:bg-primary hover:text-on-primary'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-label-caps text-label-caps mb-md border-b border-outline pb-xs">PALETA</h3>
                <div className="flex flex-wrap gap-sm">
                  {COLORS.map(c => (
                    <button
                      key={c.value}
                      title={c.label}
                      className="w-8 h-8 border border-outline-variant hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all"
                      style={{ backgroundColor: c.bg }}
                    />
                  ))}
                </div>
              </section>

              {(category || size) && (
                <button onClick={() => { setCategory(null); setSize(null) }} className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors underline">
                  LIMPIAR FILTROS
                </button>
              )}
            </aside>

            {/* Grid */}
            <div className="flex-grow">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-xl gap-x-md min-h-[500px]">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[3/4] bg-surface-container mb-md" />
                      <div className="h-4 bg-surface-container w-2/3 mb-2" />
                      <div className="h-3 bg-surface-container w-1/3" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="py-xl text-center font-label-caps text-label-caps text-secondary">
                  SIN RESULTADOS
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-xl gap-x-md">
                  {products.map(p => {
                    const img = p.images?.[0] || ''
                    const soldOut = p.status === 'sold-out'
                    const isAdding = adding === p.id
                    return (
                      <div
                        key={p.id}
                        className="group cursor-pointer"
                        onClick={() => navigate(`/product/${p.slug || p.id}`)}
                      >
                        <div className="relative aspect-[3/4] overflow-hidden bg-surface-container mb-md border border-transparent hover:border-primary transition-colors">
                          {img
                            ? <img src={img} alt={p.name} className="w-full h-full object-cover transition-all duration-500" loading="lazy" />
                            : <div className="w-full h-full bg-surface-container-high" />}
                          {p.badge && (
                            <div className="absolute top-sm left-sm">
                              <span className="bg-primary text-on-primary font-label-caps text-[10px] px-xs py-[2px]">{p.badge}</span>
                            </div>
                          )}
                          <div className="absolute bottom-sm left-sm right-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                            <button
                              disabled={soldOut || isAdding}
                              onClick={e => handleQuickAdd(p, e)}
                              className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-md hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-50"
                            >
                              {soldOut ? 'AGOTADO' : isAdding ? 'AGREGANDO...' : 'AGREGAR RÁPIDO'}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-body-lg text-body-lg uppercase font-medium">{p.name}</h4>
                            <p className="font-label-caps text-label-caps text-secondary">{p.color}</p>
                          </div>
                          <span className="font-label-caps text-body-md font-bold">{fmtCOP(p.price)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}
