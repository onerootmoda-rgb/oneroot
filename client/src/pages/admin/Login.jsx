import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { loginAs } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      const d = await res.json()
      if (res.ok) {
        // Actualiza el contexto de auth directamente (evita re-fetch a /api/auth/me)
        loginAs(d.admin)
        navigate('/admin')
      } else {
        setError(d.error || 'Credenciales incorrectas.')
      }
    } catch { setError('Error de conexión.') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-sm md:p-lg bg-surface relative">
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="mb-xl">
        <img alt="ONE ROOT Logo" className="h-16 md:h-20 w-auto opacity-90 hover:opacity-100 transition-opacity" src="/logo/screen.png" onError={e => e.target.style.display = 'none'} />
      </div>

      <div className="w-full max-w-[440px] bg-white p-lg md:p-xl shadow-[0_0_0_1px_#000] relative z-10 hover:-translate-y-1 transition-transform duration-300">
        <div className="mb-xl">
          <h1 className="font-headline-lg text-headline-lg uppercase tracking-tight text-primary">Terminal Access</h1>
          <p className="font-label-caps text-label-caps text-secondary mt-xs">Authentication Required for Entry</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-xl">
          <div>
            <label className="block font-label-caps text-label-caps mb-xs text-secondary" htmlFor="email">Admin Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@oneroot.co"
              className="w-full border-b border-primary bg-transparent font-body-md text-body-md py-xs focus:outline-none focus:border-b-2 transition-all"
            />
          </div>

          <div>
            <label className="block font-label-caps text-label-caps mb-xs text-secondary" htmlFor="password">Passcode</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border-b border-primary bg-transparent font-body-md text-body-md py-xs focus:outline-none focus:border-b-2 transition-all"
            />
          </div>

          {error && <p className="font-label-caps text-label-caps text-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-md hover:bg-white hover:text-primary border border-primary transition-all disabled:opacity-40"
          >
            {loading ? 'VERIFICANDO...' : 'ACCEDER AL SISTEMA'}
          </button>
        </form>

        <p className="font-label-caps text-[10px] text-secondary text-center mt-xl">SISTEMA INTERNO — SOLO PERSONAL AUTORIZADO</p>
      </div>
    </div>
  )
}
