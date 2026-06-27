import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { useCart } from '../hooks/useCart'
import { apiFetch } from '../lib/api'
import ProductCard from '../components/ProductCard'
import { useToast } from '../components/Toast'

function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function HeroSection({ settings }) {
  const bgRef = useRef(null)
  const [bgLoaded, setBgLoaded] = useState(false)

  useEffect(() => {
    if (!settings?.heroBg) { setBgLoaded(true); return }
    const img = new Image()
    img.onload = () => setBgLoaded(true)
    img.src = settings.heroBg
  }, [settings?.heroBg])

  return (
    <section className="relative h-[90vh] w-full bg-surface-container overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div
          ref={bgRef}
          className={`w-full h-full bg-cover bg-center transition-all duration-700 hover:scale-105 ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={settings?.heroBg ? { backgroundImage: `url('${settings.heroBg}')` } : { backgroundColor: '#111' }}
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      <div className="relative z-10 h-full flex flex-col justify-center px-gutter max-w-[1440px] mx-auto">
        <div className="max-w-2xl">
          <p className="font-label-caps text-label-caps text-primary mb-sm tracking-[0.2em]">
            {settings?.heroBadge || 'ESTABLISHED MMXXIV'}
          </p>
          <h1 className="font-display-lg text-display-lg text-primary">
            {settings?.heroTitle
              ? settings.heroTitle.split('\n').map((l, i) => <span key={i}>{l}{i < settings.heroTitle.split('\n').length - 1 && <br />}</span>)
              : <><span>URBAN</span><br /><span>STRUCTURE</span></>}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-md max-w-md">
            {settings?.heroSubtitle || 'Redefining the metropolitan silhouette through architectural integrity and minimalist raw grit.'}
          </p>
        </div>
      </div>

      <div className="absolute bottom-lg right-gutter hidden md:flex flex-col items-center gap-sm">
        <span className="font-label-caps text-[10px] tracking-widest rotate-90 origin-bottom-right translate-y-[-20px]">SCROLL</span>
        <div className="w-[1px] h-20 bg-primary/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-primary animate-[scroll_2s_infinite]" />
        </div>
      </div>
    </section>
  )
}

function CollectionsGrid({ settings }) {
  const cols = settings?.collections || []
  if (!cols.length) return null

  const featured = cols.find(c => c.featured) || cols[0]
  const rest = cols.filter(c => c !== featured)

  return (
    <section className="py-xl px-gutter max-w-[1440px] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-lg gap-md">
        <div>
          <h2 className="font-headline-xl text-headline-xl text-primary">
            {settings?.collectionsTitle || 'COLLECTIONS'}
          </h2>
          <p className="font-body-md text-body-md text-secondary mt-xs">
            {settings?.collectionsSubtitle || 'Curated architectural staples.'}
          </p>
        </div>
        <Link to="/catalog" className="font-label-caps text-label-caps border-b border-primary pb-1 hover:opacity-60 transition-opacity">
          VER TODA LA COLECCIÓN
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-md min-h-[400px] md:h-[800px]">
        <Link to={featured.link || '/catalog'} className="md:col-span-7 relative group overflow-hidden bg-surface-container-high block">
          <div
            className="w-full h-[500px] md:h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url('${featured.image}')` }}
          />
          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors" />
          <div className="absolute bottom-lg left-lg">
            <h3 className="font-headline-lg text-headline-lg text-white mb-sm">{featured.name}</h3>
            <span className="bg-white text-primary font-label-caps text-label-caps px-md py-xs">EXPLORAR</span>
          </div>
        </Link>

        {rest.length > 0 && (
          <div className="md:col-span-5 flex flex-col gap-md">
            {rest.map(c => (
              <Link key={c.name} to={c.link || '/catalog'} className="h-1/2 relative group overflow-hidden bg-surface-container-high block">
                <div
                  className="w-full h-[400px] md:h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${c.image}')` }}
                />
                <div className="absolute bottom-md left-md">
                  <h3 className="font-headline-lg text-headline-lg-mobile text-white mb-xs">{c.name}</h3>
                  {c.label && <p className="font-label-caps text-label-caps text-white/80">{c.label}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}


export default function Home() {
  const toast = useToast()
  const [homeSettings, setHomeSettings] = useState(null)
  const [collectionsSettings, setCollectionsSettings] = useState(null)
  const [products, setProducts] = useState([])
  const { addItem } = useCart()
  const carouselRef = useRef(null)

  useEffect(() => {
    apiFetch('/api/settings/home').then(r => r.ok ? r.json() : null).then(setHomeSettings).catch(() => {})
    apiFetch('/api/settings/collections').then(r => r.ok ? r.json() : null).then(setCollectionsSettings).catch(() => {})
    apiFetch('/api/products?status=active').then(r => r.ok ? r.json() : null).then(d => setProducts((d?.products || []).slice(0, 5))).catch(() => {})
  }, [])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    function onWheel(e) { if (e.deltaY !== 0) { e.preventDefault(); el.scrollLeft += e.deltaY } }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [products])

  async function handleAddToCart(product) {
    const size = product.sizes?.[0] || 'M'
    await addItem(product.id, size, 1)
  }

  return (
    <PublicLayout>
      <HeroSection settings={homeSettings} />

      <CollectionsGrid settings={{ ...homeSettings, ...collectionsSettings }} />

      {/* New Arrivals */}
      <section className="bg-surface-container-lowest py-xl">
        <div className="px-gutter max-w-[1440px] mx-auto mb-lg flex justify-between items-center">
          <h2 className="font-label-caps text-label-caps tracking-widest text-primary">
            {homeSettings?.arrivalsTitle || 'NOVEDADES'}
          </h2>
          <Link to="/catalog" className="font-label-caps text-label-caps border-b border-primary pb-1 hover:opacity-60 transition-opacity">VER TODO</Link>
        </div>
        <div
          ref={carouselRef}
          className="flex gap-md overflow-x-auto px-gutter pb-md"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.length === 0
            ? <div className="min-w-[300px] flex items-center justify-center text-secondary font-label-caps text-label-caps py-xl">CARGANDO...</div>
            : products.map(p => <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />)}
        </div>
      </section>

      {/* IA Designer CTA */}
      <section className="py-xl px-gutter bg-surface-container-lowest border-t border-primary/10">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center gap-xl">
          <div className="flex-1">
            <p className="font-label-caps text-label-caps text-secondary tracking-[0.2em] mb-sm">DISEÑO PERSONALIZADO</p>
            <h2 className="font-headline-xl text-headline-xl text-primary mb-md">CREA TU PRENDA CON IA</h2>
            <p className="font-body-lg text-body-lg text-secondary mb-lg max-w-lg">
              Describe tu visión y nuestra IA genera el diseño. Luego lo producimos a tu medida.
            </p>
            <Link
              to="/personalizar"
              className="inline-block bg-primary text-on-primary font-label-caps text-label-caps px-lg py-md hover:bg-white hover:text-primary border border-primary transition-all"
            >
              EMPEZAR A DISEÑAR
            </Link>
          </div>
          <div className="flex-shrink-0 w-full md:w-80 h-64 bg-surface-container border border-primary/20 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-[64px] text-secondary">draw</span>
              <p className="font-label-caps text-label-caps text-secondary mt-sm">GENERADOR IA</p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-xl bg-primary text-on-primary">
        <div className="px-gutter max-w-4xl mx-auto text-center">
          <h2 className="font-headline-xl text-headline-xl mb-md">ÚNETE AL REGISTRO PERMANENTE</h2>
          <p className="font-body-lg text-body-lg text-white/70 mb-lg">
            Drops exclusivos, acceso al archivo y esencia arquitectónica. Sin ruido, solo lo esencial.
          </p>
          <form
            className="flex flex-col md:flex-row gap-0"
            onSubmit={e => { e.preventDefault(); toast('¡Gracias por suscribirte!', 'success') }}
          >
            <input
              type="email"
              required
              placeholder="CORREO ELECTRÓNICO"
              className="flex-grow bg-transparent border border-white text-white font-label-caps text-label-caps px-md py-sm focus:ring-0 focus:border-white placeholder:text-white/40 focus:outline-none"
            />
            <button type="submit" className="bg-white text-primary font-label-caps text-label-caps px-lg py-sm hover:bg-surface-container-highest transition-colors">
              SUSCRIBIRSE
            </button>
          </form>
        </div>
      </section>

      <style>{`@keyframes scroll { 0% { transform: translateY(-100%); } 100% { transform: translateY(200%); } }`}</style>
    </PublicLayout>
  )
}
