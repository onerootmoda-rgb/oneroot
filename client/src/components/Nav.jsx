import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../hooks/useCart'

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('or-theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('or-theme', dark ? 'dark' : 'light')
  }, [dark])
  return [dark, setDark]
}

export default function Nav({ onCartOpen }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { cart } = useCart()
  const [dark, setDark] = useDarkMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  const links = [
    { to: '/', label: 'INICIO' },
    { to: '/catalog', label: 'CATÁLOGO' },
    { to: '/about', label: 'NOSOTROS' },
    { to: '/personalizar', label: 'CREA TU DISEÑO' },
  ]

  function handleSearch(e) {
    e.preventDefault()
    if (searchVal.trim()) {
      setSearchOpen(false)
      setSearchVal('')
      navigate('/catalog?search=' + encodeURIComponent(searchVal.trim()))
    }
  }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-primary/10">
        <div className="max-w-[1440px] mx-auto px-gutter flex items-center justify-between h-16">
          <div className="flex items-center gap-xl">
            <Link to="/" className="font-headline-lg text-headline-lg tracking-tighter text-primary">
              ONE ROOT
            </Link>
            <div className="hidden md:flex gap-md font-body-md text-body-md">
              {links.map(l => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={pathname === l.to
                    ? 'text-primary border-b-2 border-primary pb-1'
                    : 'text-secondary hover:text-primary transition-colors duration-200'}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-md">
            <button onClick={() => setSearchOpen(true)} className="material-symbols-outlined text-primary">search</button>

            <button onClick={onCartOpen} className="relative">
              <span className="material-symbols-outlined text-primary">shopping_bag</span>
              {cart.itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-label-caps w-4 h-4 flex items-center justify-center rounded-full">
                  {cart.itemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setDark(d => !d)}
              className="material-symbols-outlined text-primary"
              aria-label="Cambiar tema"
            >
              {dark ? 'light_mode' : 'dark_mode'}
            </button>

            <Link to="/admin/login" className="material-symbols-outlined text-primary hidden md:inline">person</Link>

            <button
              className="md:hidden material-symbols-outlined text-primary"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? 'close' : 'menu'}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-primary/10 px-gutter py-md flex flex-col">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className="font-label-caps text-label-caps text-secondary hover:text-primary transition-colors py-md border-b border-primary/20"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-24 px-gutter">
          <form onSubmit={handleSearch} className="w-full max-w-lg bg-surface p-md flex gap-sm">
            <input
              autoFocus
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="BUSCAR PRODUCTOS..."
              className="flex-1 bg-transparent border-b border-primary font-body-md text-body-md py-xs focus:outline-none"
            />
            <button type="submit" className="material-symbols-outlined text-primary">search</button>
            <button type="button" onClick={() => setSearchOpen(false)} className="material-symbols-outlined text-secondary">close</button>
          </form>
        </div>
      )}
    </>
  )
}
