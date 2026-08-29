import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

// Bloquea el acceso a las rutas hijas si no hay sesión activa.
// La autorización real de datos siempre depende de RLS en Supabase;
// esto solo evita que se muestre la interfaz sin sesión.
export default function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando…</div>
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
