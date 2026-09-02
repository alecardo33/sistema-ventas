import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { resumenDashboard } from '@/lib/api'
import { formatMoney, todayISO } from '@/utils/format'
import { Card, Spinner } from '@/components/ui'

export default function Dashboard() {
  const { profile } = useAuth()
  const [resumen, setResumen] = useState<Awaited<ReturnType<typeof resumenDashboard>> | null>(null)

  useEffect(() => {
    if (profile) resumenDashboard(todayISO(), profile.role).then(setResumen)
  }, [profile])

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">Bienvenido, {profile?.full_name ?? '...'}</h1>

      {!resumen ? (
        <Spinner />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <p className="text-sm text-slate-500">Ventas de hoy</p>
            <p className="text-2xl font-semibold">{formatMoney(resumen.totalVentasHoy)}</p>
            <p className="text-xs text-slate-400">{resumen.cantidadVentasHoy} venta(s)</p>
          </Card>
          {resumen.saldoCaja !== null && (
            <Card>
              <p className="text-sm text-slate-500">Saldo de caja</p>
              <p className="text-2xl font-semibold">{formatMoney(resumen.saldoCaja)}</p>
            </Card>
          )}
          <Card>
            <p className="text-sm text-slate-500">Productos con stock bajo</p>
            <p className="text-2xl font-semibold">{resumen.productosStockBajo}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-500">Cuentas por cobrar</p>
            <p className="text-2xl font-semibold">{formatMoney(resumen.totalPorCobrar)}</p>
            <p className="text-xs text-slate-400">{resumen.cuentasPorCobrar} venta(s) a crédito</p>
          </Card>
        </div>
      )}
    </div>
  )
}
