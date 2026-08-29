import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types/database'

interface RoleRouteProps {
  allowed: Role[]
}

// Restringe rutas a ciertos roles (ej: solo admin en /configuracion/usuarios).
// Igual que ProtectedRoute, esto es solo la capa de UI: la protección real
// de datos vive en las políticas RLS de cada tabla en Supabase.
export default function RoleRoute({ allowed }: RoleRouteProps) {
  const { profile, loading } = useAuth()

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>
  if (!profile) return <Navigate to="/login" replace />
  if (!allowed.includes(profile.role)) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
