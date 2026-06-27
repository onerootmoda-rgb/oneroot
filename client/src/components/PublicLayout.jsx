import { useState } from 'react'
import Nav from './Nav'
import Footer from './Footer'
import CartDrawer from './CartDrawer'

export default function PublicLayout({ children }) {
  const [cartOpen, setCartOpen] = useState(false)
  return (
    <div className="min-h-screen flex flex-col">
      <Nav onCartOpen={() => setCartOpen(true)} />
      <main className="flex-grow">{children}</main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}
