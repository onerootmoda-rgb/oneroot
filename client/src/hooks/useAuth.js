import { createContext, useContext, useState, useEffect, createElement } from 'react'
import { apiFetch } from '../lib/api'

const AuthCtx = createContext(null)

// AuthProvider vive en main.jsx (raíz del árbol) para que el fetch a /api/auth/me
// ocurra una sola vez por sesión. Sin esto, ProtectedRoute y AdminLayout llamarían
// useAuth() de forma independiente, generando dos peticiones redundantes.
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(data => { setAdmin(data); setLoading(false) })
  }, [])

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    setAdmin(null)
  }

  // loginAs: llamado por Login.jsx tras login exitoso para no necesitar re-fetch
  function loginAs(adminData) { setAdmin(adminData) }

  return createElement(AuthCtx.Provider, { value: { admin, loading, logout, loginAs } }, children)
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
