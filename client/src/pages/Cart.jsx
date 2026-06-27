import { Link } from 'react-router-dom'
import PublicLayout from '../components/PublicLayout'
import { useCart } from '../hooks/useCart'
import { fmtCOP } from '../lib/api'

export default function Cart() {
  const { cart, updateItem } = useCart()
  return (
    <PublicLayout>
      <main className="max-w-[1440px] mx-auto px-gutter py-xl min-h-screen">
        <h1 className="font-headline-xl text-headline-xl text-primary mb-xl">TU BOLSA</h1>
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
            <span className="material-symbols-outlined text-[64px] text-secondary">shopping_bag</span>
            <p className="font-label-caps text-secondary">TU BOLSA ESTÁ VACÍA</p>
            <Link to="/catalog" className="font-label-caps text-label-caps border-b border-primary pb-1">EXPLORAR CATÁLOGO</Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-xl">
            <div className="flex-grow space-y-lg">
              {cart.items.map(item => {
                const p = item.product
                const img = p?.images?.[0] || ''
                return (
                  <div key={item.productId + item.size} className="flex gap-md border-b border-primary/10 pb-lg">
                    <Link to={`/product/${p?.slug || item.productId}`} className="w-32 h-40 bg-surface-container flex-shrink-0 block">
                      {img ? <img src={img} alt={p?.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-surface-container-high" />}
                    </Link>
                    <div className="flex flex-col justify-between flex-grow">
                      <div>
                        <p className="font-body-md text-primary uppercase">{p?.name || item.productId}</p>
                        <p className="font-label-caps text-[10px] text-secondary">{(p?.color || '').toUpperCase()} / {item.size}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-primary">
                          <button onClick={() => updateItem(item.productId, item.size, item.quantity - 1)} className="px-3 py-2 hover:bg-primary hover:text-white transition-colors font-label-caps">−</button>
                          <span className="px-4 font-label-caps">{item.quantity}</span>
                          <button onClick={() => updateItem(item.productId, item.size, item.quantity + 1)} className="px-3 py-2 hover:bg-primary hover:text-white transition-colors font-label-caps">+</button>
                        </div>
                        <div className="flex items-center gap-sm">
                          <p className="font-label-caps text-primary">{p ? fmtCOP(p.price * item.quantity) : '—'}</p>
                          <button onClick={() => updateItem(item.productId, item.size, 0)} className="text-secondary hover:text-primary">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="lg:w-80 flex-shrink-0">
              <div className="border border-primary p-md space-y-md">
                <h2 className="font-label-caps text-label-caps">RESUMEN</h2>
                <div className="flex justify-between border-t border-primary/20 pt-md">
                  <span className="font-label-caps text-secondary">SUBTOTAL</span>
                  <span className="font-headline-lg text-headline-lg-mobile text-primary">{fmtCOP(cart.total)}</span>
                </div>
                <Link to="/" className="block w-full text-center bg-primary text-on-primary font-label-caps text-label-caps py-md hover:bg-white hover:text-primary border border-primary transition-all">
                  COMPLETAR PEDIDO
                </Link>
                <Link to="/catalog" className="block text-center font-label-caps text-label-caps text-secondary hover:text-primary transition-colors">
                  CONTINUAR COMPRANDO
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </PublicLayout>
  )
}
