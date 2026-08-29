import { useAuth } from '@/hooks/useAuth'

export default function Dashboard() {
  const { profile } = useAuth()

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-semibold text-slate-800">
        Bienvenido, {profile?.full_name ?? '...'}
      </h1>
      <p className="text-sm text-slate-500">
        Este es el punto de partida del Dashboard. Los indicadores (ventas del día, caja,
        stock bajo, etc.) se agregarán en el siguiente paso, junto con el módulo de Ventas.
      </p>
    </div>
  )
}
