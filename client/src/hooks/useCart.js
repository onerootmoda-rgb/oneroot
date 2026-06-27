import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'

export function useCart() {
  const [cart, setCart] = useState({ items: [], total: 0, itemCount: 0 })

  const fetchCart = useCallback(async () => {
    const res = await apiFetch('/api/cart').catch(() => null)
    if (res?.ok) setCart(await res.json())
  }, [])

  useEffect(() => { fetchCart() }, [fetchCart])

  async function addItem(productId, size, quantity = 1) {
    const res = await apiFetch('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId, size, quantity }),
    }).catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      setCart(data)
      return true
    }
    return false
  }

  // quantity <= 0 removes the item (backend handles it)
  async function updateItem(productId, size, quantity) {
    const res = await apiFetch(`/api/cart/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ size, quantity }),
    }).catch(() => null)
    if (res?.ok) setCart(await res.json())
  }

  async function clearCart() {
    const res = await apiFetch('/api/cart', { method: 'DELETE' }).catch(() => null)
    if (res?.ok) setCart(await res.json())
  }

  return { cart, addItem, updateItem, clearCart, refetch: fetchCart }
}
