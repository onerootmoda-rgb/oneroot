import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const toast = useCallback((message, type = 'info') => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-md right-md z-[300] flex flex-col gap-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              px-md py-sm font-label-caps text-label-caps max-w-xs shadow-lg animate-slide-up pointer-events-auto
              ${t.type === 'error'   ? 'bg-error text-on-error' :
                t.type === 'success' ? 'bg-primary text-on-primary' :
                                       'bg-surface-container border border-primary text-primary'}
            `}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
