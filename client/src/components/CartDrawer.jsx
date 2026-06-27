import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { fmtCOP } from '../lib/api'
import CheckoutModal from './CheckoutModal'
import { useToast } from './Toast'

export default function CartDrawer({ open, onClose }) {
  const toast = useToast()
  const { cart, updateItem, clearCart } = useCart()
  const [checkout, setCheckout] = useState(false)

  function handleSuccess(orderId) {
    setCheckout(false)
    clearCart()
    onClose()
    toast(`¡Pedido confirmado! Ref: ${orderId} — Te contactaremos pronto.`, 'success')
  }

  return (
    <>
      <div className={`fixed inset-0 z-[100] transition-all duration-300 ${open ? 'visible' : 'invisible'}`}>
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-surface-container-lowest border-l border-primary transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center p-gutter border-b border-primary">
            <h2 className="font-headline-lg text-headline-lg-mobile text-primary">TU BOLSA</h2>
            <button onClick={onClose} className="material-symbols-outlined text-primary hover:opacity-60 transition-opacity">close</button>
          </div>

          <div className="flex-grow overflow-y-auto p-gutter flex flex-col gap-lg">
            {cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-xl gap-md text-center">
                <span className="material-symbols-outlined text-[48px] text-secondary">shopping_bag</span>
                <p className="font-label-caps text-secondary">TU BOLSA ESTÁ VACÍA</p>
                <Link to="/catalog" onClick={onClose} className="font-label-caps text-label-caps border-b border-primary pb-1 hover:opacity-60 transition-opacity">
                  EXPLORAR CATÁLOGO
                </Link>
              </div>
            ) : cart.items.map(item => {
              const p = item.product
              const img = p?.images?.[0] || ''
              return (
                <div key={item.productId + item.size} className="flex gap-md">
                  <Link to={`/product/${p?.slug || item.productId}`} onClick={onClose} className="w-24 h-32 bg-surface-container flex-shrink-0 block">
                    {img
                      ? <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${img}')` }} />
                      : <div className="w-full h-full bg-surface-container-high" />}
                  </Link>
                  <div className="flex flex-col justify-between py-xs flex-grow">
                    <div>
                      <Link to={`/product/${p?.slug || item.productId}`} onClick={onClose} className="font-body-md text-primary hover:opacity-70 transition-opacity">
                        {p ? p.name.toUpperCase() : 'PRODUCTO'}
                      </Link>
                      <p className="font-label-caps text-[10px] text-secondary mt-1">
                        {(p?.color || '').toUpperCase()} / {item.size}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-primary">
                        <button onClick={() => updateItem(item.productId, item.size, item.quantity - 1)} className="px-2 py-1 hover:bg-primary hover:text-white transition-colors font-label-caps">−</button>
                        <span className="px-3 font-label-caps">{item.quantity}</span>
                        <button onClick={() => updateItem(item.productId, item.size, item.quantity + 1)} className="px-2 py-1 hover:bg-primary hover:text-white transition-colors font-label-caps">+</button>
                      </div>
                      <div className="flex items-center gap-sm">
                        <p className="font-label-caps text-primary">{p ? fmtCOP(p.price * item.quantity) : '—'}</p>
                        <button onClick={() => updateItem(item.productId, item.size, 0)} className="text-secondary hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="p-gutter border-t border-primary bg-surface-container-low">
            <div className="flex justify-between mb-md">
              <span className="font-label-caps text-secondary">SUBTOTAL</span>
              <span className="font-headline-lg text-headline-lg-mobile text-primary">{fmtCOP(cart.total)}</span>
            </div>
            <button
              onClick={() => setCheckout(true)}
              disabled={cart.items.length === 0}
              className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-md hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40"
            >
              COMPLETAR PEDIDO
            </button>
            <p className="text-center font-label-caps text-[10px] text-secondary mt-sm">ENVÍO SE CALCULA AL CONFIRMAR</p>
          </div>
        </div>
      </div>

      {checkout && <CheckoutModal cart={cart} onClose={() => setCheckout(false)} onSuccess={handleSuccess} />}
    </>
  )
}
