import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listVentas, listMovimientosCaja, listInventario, listCuentasPorCobrar, listProductos, getKardex, type MovimientoInventario } from '@/lib/api'
import type { Producto, Venta } from '@/types/database'
import { formatDate, formatDateTime, formatMoney, todayISO, daysAgoISO } from '@/utils/format'
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Spinner, Table } from '@/components/ui'

export function ReportesPage() {
  const reportes = [
    { to: '/reportes/ventas', title: 'Ventas', desc: 'Ventas por rango de fecha, con totales.' },
    { to: '/reportes/caja', title: 'Ingresos y egresos', desc: 'Flujo de caja detallado por rango.' },
    { to: '/reportes/inventario', title: 'Inventario actual', desc: 'Stock de todos los productos y alertas.' },
    { to: '/reportes/kardex', title: 'Kardex por producto', desc: 'Movimientos de un producto específico.' },
    { to: '/reportes/cuentas-por-cobrar', title: 'Cuentas por cobrar', desc: 'Ventas a crédito con saldo pendiente.' },
  ]
  return (
    <div>
      <PageHeader title="Reportes" />
      <div className="grid sm:grid-cols-2 gap-3">
        {reportes.map((r) => (
          <Link key={r.to} to={r.to}>
            <Card className="hover:border-slate-400 h-full">
              <p className="font-medium text-slate-800">{r.title}</p>
              <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

function DateRangeBar({ desde, hasta, setDesde, setHasta }: { desde: string; hasta: string; setDesde: (v: string) => void; setHasta: (v: string) => void }) {
  return (
    <Card className="mb-3 flex gap-3 flex-wrap items-end print:hidden">
      <Field label="Desde">
        <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
      </Field>
      <Field label="Hasta">
        <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </Field>
      <Button variant="secondary" onClick={() => window.print()}>
        Imprimir
      </Button>
    </Card>
  )
}

export function ReporteVentasPage() {
  const [desde, setDesde] = useState(daysAgoISO(30))
  const [hasta, setHasta] = useState(todayISO())
  const [ventas, setVentas] = useState<(Venta & { clientes: { nombre: string } })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listVentas({ desde, hasta }).then((v) => {
      setVentas(v)
      setLoading(false)
    })
  }, [desde, hasta])

  const validas = ventas.filter((v) => v.estado !== 'anulada')
  const total = validas.reduce((acc, v) => acc + v.total, 0)

  return (
    <div>
      <PageHeader title="Reporte de ventas" />
      <DateRangeBar desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
      <Card className="mb-3">
        <p className="text-sm text-slate-500">Total vendido (excluye anuladas)</p>
        <p className="text-2xl font-semibold">{formatMoney(total)}</p>
        <p className="text-xs text-slate-400">{validas.length} venta(s)</p>
      </Card>
      {loading ? (
        <Spinner />
      ) : ventas.length === 0 ? (
        <EmptyState text="Sin ventas en este rango." />
      ) : (
        <Table head={['Fecha', 'Cliente', 'Total', 'Estado']}>
          {ventas.map((v) => (
            <tr key={v.id}>
              <td className="px-3 py-2">{formatDateTime(v.created_at)}</td>
              <td className="px-3 py-2">{v.clientes?.nombre}</td>
              <td className="px-3 py-2">{formatMoney(v.total)}</td>
              <td className="px-3 py-2">
                <Badge color={v.estado === 'anulada' ? 'red' : 'green'}>{v.estado}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

export function ReporteCajaPage() {
  const [desde, setDesde] = useState(daysAgoISO(30))
  const [hasta, setHasta] = useState(todayISO())
  const [movimientos, setMovimientos] = useState<Awaited<ReturnType<typeof listMovimientosCaja>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listMovimientosCaja(desde, hasta).then((m) => {
      setMovimientos(m)
      setLoading(false)
    })
  }, [desde, hasta])

  const ingresos = movimientos.filter((m) => m.tipo === 'ingreso').reduce((acc, m) => acc + m.monto, 0)
  const egresos = movimientos.filter((m) => m.tipo === 'egreso').reduce((acc, m) => acc + m.monto, 0)

  return (
    <div>
      <PageHeader title="Reporte de ingresos y egresos" />
      <DateRangeBar desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <Card>
          <p className="text-sm text-slate-500">Ingresos</p>
          <p className="text-xl font-semibold text-green-700">{formatMoney(ingresos)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Egresos</p>
          <p className="text-xl font-semibold text-red-700">{formatMoney(egresos)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Neto</p>
          <p className="text-xl font-semibold">{formatMoney(ingresos - egresos)}</p>
        </Card>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <Table head={['Fecha', 'Tipo', 'Origen', 'Concepto', 'Monto']}>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td className="px-3 py-2">{formatDateTime(m.created_at)}</td>
              <td className="px-3 py-2">
                <Badge color={m.tipo === 'ingreso' ? 'green' : 'red'}>{m.tipo}</Badge>
              </td>
              <td className="px-3 py-2 capitalize">{m.origen.replace('_', ' ')}</td>
              <td className="px-3 py-2">{m.concepto}</td>
              <td className="px-3 py-2">{formatMoney(m.monto)}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

export function ReporteInventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listInventario().then((p) => {
      setProductos(p)
      setLoading(false)
    })
  }, [])

  return (
    <div>
      <PageHeader title="Reporte de inventario actual" actions={<Button variant="secondary" onClick={() => window.print()} className="print:hidden">Imprimir</Button>} />
      {loading ? (
        <Spinner />
      ) : (
        <Table head={['Código', 'Producto', 'Stock', 'Stock mínimo', 'Estado']}>
          {productos.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 font-mono text-xs">{p.codigo}</td>
              <td className="px-3 py-2">{p.nombre}</td>
              <td className="px-3 py-2">{p.stock}</td>
              <td className="px-3 py-2">{p.stock_minimo}</td>
              <td className="px-3 py-2">{p.stock <= p.stock_minimo ? <Badge color="red">bajo</Badge> : <Badge color="green">ok</Badge>}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

export function ReporteKardexPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoId, setProductoId] = useState('')
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])

  useEffect(() => {
    listProductos().then(setProductos)
  }, [])

  useEffect(() => {
    if (productoId) getKardex(productoId).then(setMovimientos)
    else setMovimientos([])
  }, [productoId])

  return (
    <div>
      <PageHeader title="Kardex por producto" actions={<Button variant="secondary" onClick={() => window.print()} className="print:hidden">Imprimir</Button>} />
      <Card className="mb-3 print:hidden">
        <Field label="Producto">
          <Select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            <option value="">Selecciona un producto…</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </Card>
      {!productoId ? (
        <EmptyState text="Selecciona un producto para ver su kardex." />
      ) : movimientos.length === 0 ? (
        <EmptyState text="Sin movimientos." />
      ) : (
        <Table head={['Fecha', 'Tipo', 'Entrada', 'Salida', 'Saldo']}>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td className="px-3 py-2">{formatDateTime(m.created_at)}</td>
              <td className="px-3 py-2 capitalize">{m.tipo.replace('_', ' ')}</td>
              <td className="px-3 py-2">{m.entrada > 0 ? m.entrada : '—'}</td>
              <td className="px-3 py-2">{m.salida > 0 ? m.salida : '—'}</td>
              <td className="px-3 py-2 font-medium">{m.saldo}</td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

export function ReporteCuentasPorCobrarPage() {
  const [ventas, setVentas] = useState<(Venta & { clientes: { nombre: string } })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listCuentasPorCobrar().then((v) => {
      setVentas(v)
      setLoading(false)
    })
  }, [])

  const total = ventas.reduce((acc, v) => acc + v.saldo_pendiente, 0)

  return (
    <div>
      <PageHeader title="Cuentas por cobrar" actions={<Button variant="secondary" onClick={() => window.print()} className="print:hidden">Imprimir</Button>} />
      <Card className="mb-3">
        <p className="text-sm text-slate-500">Total por cobrar</p>
        <p className="text-2xl font-semibold">{formatMoney(total)}</p>
      </Card>
      {loading ? (
        <Spinner />
      ) : ventas.length === 0 ? (
        <EmptyState text="No hay cuentas pendientes." />
      ) : (
        <Table head={['Fecha', 'Cliente', 'Total', 'Saldo pendiente', 'Estado']}>
          {ventas.map((v) => (
            <tr key={v.id}>
              <td className="px-3 py-2">{formatDate(v.created_at)}</td>
              <td className="px-3 py-2">{v.clientes?.nombre}</td>
              <td className="px-3 py-2">{formatMoney(v.total)}</td>
              <td className="px-3 py-2 font-medium">{formatMoney(v.saldo_pendiente)}</td>
              <td className="px-3 py-2">
                <Badge color="amber">{v.estado}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}
