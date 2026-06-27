import { useState } from 'react'
import { fmtCOP, apiFetch } from '../lib/api'
import { useToast } from './Toast'

export default function CheckoutModal({ cart, onClose, onSuccess }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!form.name.trim() || !form.phone.trim()) { toast('Nombre y teléfono son obligatorios.', 'error'); return }
    setLoading(true)
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: form.name,
          customerPhone: form.phone,
          customerAddress: form.address,
          notes: form.notes,
        }),
      })
      const d = await res.json()
      if (d.ok) {
        onSuccess(d.orderId)
      } else {
        toast(d.error || 'Error al procesar el pedido.', 'error')
      }
    } catch { toast('Error de conexión. Intenta de nuevo.', 'error') }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md border border-primary">
        <div className="flex justify-between items-center px-md py-sm border-b border-primary">
          <h2 className="font-headline-lg text-lg font-black tracking-tighter">CONFIRMAR PEDIDO</h2>
          <button onClick={onClose} className="material-symbols-outlined text-secondary hover:text-primary">close</button>
        </div>
        <div className="p-md space-y-sm">
          <div className="border border-primary/20 p-sm space-y-xs max-h-36 overflow-y-auto">
            {cart.items.map(item => (
              <div key={item.productId + item.size} className="flex justify-between text-sm font-body-md">
                <span>{item.product?.name || item.productId} ({item.size}) ×{item.quantity}</span>
                <span>{item.product ? fmtCOP(item.product.price * item.quantity) : ''}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between font-black pt-xs border-t border-primary/20">
            <span className="font-label-caps text-label-caps text-secondary self-center">TOTAL</span>
            <span className="text-xl">{fmtCOP(cart.total)}</span>
          </div>
          <div className="pt-sm space-y-sm">
            {[
              { id: 'name', label: 'NOMBRE *', type: 'text', placeholder: 'Tu nombre completo' },
              { id: 'phone', label: 'TELÉFONO *', type: 'tel', placeholder: 'Número de contacto' },
              { id: 'address', label: 'DIRECCIÓN (opcional)', type: 'text', placeholder: 'Ciudad, barrio...' },
            ].map(f => (
              <div key={f.id}>
                <label className="font-label-caps text-[10px] text-secondary block mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.id]}
                  onChange={e => setForm(p => ({ ...p, [f.id]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full border border-primary px-sm py-xs text-sm font-body-md focus:outline-none"
                />
              </div>
            ))}
            <div>
              <label className="font-label-caps text-[10px] text-secondary block mb-1">NOTAS (opcional)</label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Color preferido, instrucciones..."
                className="w-full border border-primary px-sm py-xs text-sm font-body-md focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>
        <div className="px-md pb-md">
          <button
            onClick={submit}
            disabled={loading}
            className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-sm hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-50"
          >
            {loading ? 'ENVIANDO...' : 'CONFIRMAR PEDIDO'}
          </button>
        </div>
      </div>
    </div>
  )
}
