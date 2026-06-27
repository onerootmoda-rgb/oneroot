import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

const NAV = [
  { to: '/admin',            label: 'DASHBOARD',   icon: 'dashboard',       exact: true },
  { to: '/admin/orders',     label: 'PEDIDOS',      icon: 'package_2' },
  { to: '/admin/customers',  label: 'CLIENTES',     icon: 'group' },
  { to: '/admin/catalog',    label: 'CATÁLOGO',     icon: 'inventory_2' },
  { to: '/admin/inventory',  label: 'INVENTARIO',   icon: 'warehouse' },
  { to: '/admin/collections',label: 'COLECCIONES',  icon: 'layers' },
  { to: '/admin/designs',    label: 'DISEÑOS',      icon: 'design_services' },
  { to: '/admin/analytics',  label: 'ANALÍTICA',    icon: 'bar_chart' },
  { to: '/admin/users',      label: 'USUARIOS',     icon: 'manage_accounts' },
  { to: '/admin/home-editor',label: 'HOME EDITOR',  icon: 'edit' },
]

export default function AdminLayout() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface-container-lowest border-r border-primary flex flex-col">
        <div className="px-gutter py-lg border-b border-primary">
          <h1 className="font-headline-lg text-headline-lg tracking-tighter text-primary">ONE ROOT</h1>
          <p className="font-label-caps text-[10px] text-secondary mt-xs">TERMINAL ADMIN</p>
        </div>

        <nav className="flex-grow px-sm py-md space-y-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-sm px-sm py-xs font-label-caps text-label-caps transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-on-primary translate-x-1'
                    : 'text-secondary hover:text-primary hover:bg-surface-container'
                }`
              }
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-sm py-md border-t border-primary">
          {admin && (
            <p className="font-label-caps text-[10px] text-secondary px-sm mb-xs truncate">{admin.email}</p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-sm px-sm py-xs font-label-caps text-label-caps text-secondary hover:text-primary transition-colors w-full"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            CERRAR SESIÓN
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-grow overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
