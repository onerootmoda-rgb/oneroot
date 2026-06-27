import { useNavigate } from 'react-router-dom'
import { fmtCOP } from '../lib/api'

export default function ProductCard({ product, onAddToCart }) {
  const navigate = useNavigate()
  const img = product.images?.[0] || ''
  const isSoldOut = product.status === 'sold-out'

  return (
    <div
      className="min-w-[300px] md:min-w-[380px] group cursor-pointer"
      onClick={() => navigate(`/product/${product.slug || product.id}`)}
    >
      <div className="aspect-[3/4] bg-surface-container relative overflow-hidden mb-sm">
        {img
          ? <div className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${img}')` }} />
          : <div className="w-full h-full bg-surface-container-high flex items-center justify-center"><span className="font-label-caps text-[10px] text-secondary">SIN IMAGEN</span></div>}
        {product.badge && (
          <div className="absolute top-sm left-sm bg-primary text-white font-label-caps text-[10px] px-xs py-1">{product.badge}</div>
        )}
        {isSoldOut && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <span className="font-label-caps text-label-caps text-primary">AGOTADO</span>
          </div>
        )}
        {!isSoldOut && (
          <button
            className="absolute bottom-0 left-0 w-full bg-primary text-white font-label-caps text-label-caps py-sm translate-y-full group-hover:translate-y-0 transition-transform duration-300"
            onClick={e => { e.stopPropagation(); onAddToCart(product) }}
          >
            AGREGAR — {fmtCOP(product.price)}
          </button>
        )}
      </div>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-body-md text-primary">{product.name}</p>
          <p className="font-label-caps text-[10px] text-secondary">{(product.color || '').toUpperCase()}</p>
        </div>
        <p className="font-label-caps text-label-caps text-primary">{fmtCOP(product.price)}</p>
      </div>
    </div>
  )
}
