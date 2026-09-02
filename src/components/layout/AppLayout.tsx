import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types/database'

interface MenuItem {
  label: string
  to: string
  roles: Role[]
}

const MENU: MenuItem[] = [
  { label: 'Dashboard', to: '/dashboard', roles: ['admin', 'vendedor', 'contabilidad'] },
  { label: 'Ventas', to: '/ventas', roles: ['admin', 'vendedor'] },
  { label: 'Cotizaciones', to: '/cotizaciones', roles: ['admin', 'vendedor', 'contabilidad'] },
  { label: 'Clientes', to: '/clientes', roles: ['admin', 'vendedor', 'contabilidad'] },
  { label: 'Productos', to: '/productos', roles: ['admin', 'vendedor', 'contabilidad'] },
  { label: 'Compras', to: '/compras', roles: ['admin', 'contabilidad'] },
  { label: 'Proveedores', to: '/proveedores', roles: ['admin', 'contabilidad'] },
  { label: 'Inventario', to: '/inventario', roles: ['admin', 'contabilidad'] },
  { label: 'Kardex', to: '/inventario/kardex', roles: ['admin', 'contabilidad'] },
  { label: 'Caja', to: '/caja', roles: ['admin', 'contabilidad'] },
  { label: 'Reportes', to: '/reportes', roles: ['admin', 'contabilidad'] },
  { label: 'Configuración', to: '/configuracion/empresa', roles: ['admin'] },
  { label: 'Usuarios', to: '/configuracion/usuarios', roles: ['admin'] },
  { label: 'Respaldo', to: '/configuracion/respaldo', roles: ['admin'] },
]

export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = MENU.filter((item) => profile && item.roles.includes(profile.role))

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar - escritorio */}
      <aside className="hidden md:flex md:flex-col w-60 bg-slate-900 text-slate-100 shrink-0 print:hidden">
        <div className="px-4 py-4 font-semibold border-b border-slate-800">Sistema de Ventas</div>
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm ${
                  isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Menú móvil (Android/PWA) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-slate-100 overflow-y-auto">
            <div className="px-4 py-4 font-semibold border-b border-slate-800">Menú</div>
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 text-sm ${
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-300'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 print:hidden">
          <button
            className="md:hidden text-slate-600 text-xl leading-none"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            ☰
          </button>
          <div className="text-sm text-slate-500 truncate">
            {profile?.full_name} · <span className="capitalize">{profile?.role}</span>
          </div>
          <button onClick={signOut} className="text-sm text-slate-600 hover:text-slate-900">
            Salir
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
