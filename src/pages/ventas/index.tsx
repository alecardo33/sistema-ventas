import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  listVentas,
  crearVenta,
  getVenta,
  anularVenta,
  registrarPagoVenta,
  listClientes,
  listProductos,
  getEmpresaConfig,
  type ItemCarrito,
  type VentaConDetalle,
} from '@/lib/api'
import type { Cliente, Producto, Venta, EmpresaConfig } from '@/types/database'
import { formatDateTime, formatMoney, todayISO, daysAgoISO } from '@/utils/format'
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner, Table, Textarea } from '@/components/ui'
import { ClienteQuickCreateModal } from '@/pages/clientes'
import { ProductoQuickCreateModal } from '@/pages/productos'

function estadoColor(estado: string): 'green' | 'red' | 'amber' | 'blue' {
  if (estado === 'pagada') return 'green'
  if (estado === 'anulada') return 'red'
  if (estado === 'parcial') return 'amber'
  return 'blue'
}

// ---------------------------------------------------------------------
// LISTADO
// ---------------------------------------------------------------------
export function VentasPage() {
  const { profile } = useAuth()
  const [ventas, setVentas] = useState<(Venta & { clientes: { nombre: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(daysAgoISO(30))
  const [hasta, setHasta] = useState(todayISO())
  const soloPropias = profile?.role === 'vendedor'

  async function load() {
    setLoading(true)
    setVentas(await listVentas({ desde, hasta, usuario_id: soloPropias ? profile?.id : undefined }))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta])

  return (
    <div>
      <PageHeader
        title="Ventas"
        actions={
          <Link to="/ventas/nueva">
            <Button>+ Nueva venta</Button>
          </Link>
        }
      />
      <Card className="mb-3 flex flex-wrap gap-3 items-end">
        <Field label="Desde">
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Field>
        <Field label="Hasta">
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Field>
      </Card>

      {loading ? (
        <Spinner />
      ) : ventas.length === 0 ? (
        <EmptyState text="No hay ventas en este rango de fechas." />
      ) : (
        <Table head={['Fecha', 'Cliente', 'Total', 'Saldo', 'Estado', '']}>
          {ventas.map((v) => (
            <tr key={v.id}>
              <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(v.created_at)}</td>
              <td className="px-3 py-2">{v.clientes?.nombre}</td>
              <td className="px-3 py-2">{formatMoney(v.total)}</td>
              <td className="px-3 py-2">{v.saldo_pendiente > 0 ? formatMoney(v.saldo_pendiente) : '—'}</td>
              <td className="px-3 py-2">
                <Badge color={estadoColor(v.estado)}>{v.estado}</Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <Link to={`/ventas/${v.id}`} className="text-slate-500 hover:text-slate-900 text-xs">
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// NUEVA VENTA (carrito)
// ---------------------------------------------------------------------
export function NuevaVentaPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [clienteId, setClienteId] = useState('')
  const [buscarProducto, setBuscarProducto] = useState('')
  const [items, setItems] = useState<(ItemCarrito & { nombre: string })[]>([])
  const [tipoVenta, setTipoVenta] = useState<'contado' | 'credito'>('contado')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'qr'>('efectivo')
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [showProductoModal, setShowProductoModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [cs, ps] = await Promise.all([listClientes(), listProductos()])
    setClientes(cs)
    setProductos(ps)
  }
  useEffect(() => {
    load()
  }, [])

  const cliente = clientes.find((c) => c.id === clienteId)

  const productosFiltrados = useMemo(() => {
    if (!buscarProducto) return []
    const q = buscarProducto.toLowerCase()
    return productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 8)
  }, [buscarProducto, productos])

  function precioPara(p: Producto) {
    const esMayorista = cliente?.tipo_cliente === 'mayorista'
    return (esMayorista ? p.precio_mayorista : p.precio_minorista) ?? 0
  }

  function agregarProducto(p: Producto) {
    if (p.pendiente_precio) {
      setError(`"${p.nombre}" está pendiente de precio y no puede venderse todavía.`)
      return
    }
    setItems((prev) => {
      const existente = prev.find((i) => i.producto_id === p.id)
      if (existente) {
        return prev.map((i) => (i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...prev, { producto_id: p.id, cantidad: 1, precio_unitario: precioPara(p), nombre: p.nombre }]
    })
    setBuscarProducto('')
  }

  function cambiarCantidad(producto_id: string, cantidad: number) {
    setItems((prev) => prev.map((i) => (i.producto_id === producto_id ? { ...i, cantidad } : i)))
  }

  function quitarItem(producto_id: string) {
    setItems((prev) => prev.filter((i) => i.producto_id !== producto_id))
  }

  const total = items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0)

  async function handleConfirmar() {
    if (!clienteId) return setError('Selecciona un cliente.')
    if (items.length === 0) return setError('Agrega al menos un producto.')
    setSaving(true)
    setError(null)
    try {
      const venta = await crearVenta({
        cliente_id: clienteId,
        tipo_venta: tipoVenta,
        metodo_pago: tipoVenta === 'credito' ? null : metodoPago,
        items,
        usuario_id: profile!.id,
      })
      navigate(`/ventas/${venta.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Nueva venta" />

      <Card className="space-y-2">
        <Field label="Cliente">
          <div className="flex gap-2">
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1">
              <option value="">Selecciona un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.tipo_cliente})
                </option>
              ))}
            </Select>
            <Button type="button" variant="secondary" onClick={() => setShowClienteModal(true)}>
              + Nuevo
            </Button>
          </div>
        </Field>
      </Card>

      <Card className="space-y-2">
        <Field label="Buscar producto (nombre o código)">
          <div className="flex gap-2">
            <Input value={buscarProducto} onChange={(e) => setBuscarProducto(e.target.value)} placeholder="Escribe para buscar…" />
            <Button type="button" variant="secondary" onClick={() => setShowProductoModal(true)}>
              + Nuevo
            </Button>
          </div>
        </Field>
        {productosFiltrados.length > 0 && (
          <div className="border rounded-lg divide-y">
            {productosFiltrados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => agregarProducto(p)}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex justify-between text-sm"
              >
                <span>
                  {p.nombre} <span className="text-slate-400 text-xs">({p.codigo})</span>
                </span>
                <span className="text-slate-500">{formatMoney(precioPara(p))}</span>
              </button>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <Table head={['Producto', 'Cantidad', 'P. Unitario', 'Subtotal', '']}>
            {items.map((i) => (
              <tr key={i.producto_id}>
                <td className="px-3 py-2">{i.nombre}</td>
                <td className="px-3 py-2 w-24">
                  <Input
                    type="number"
                    min={1}
                    value={i.cantidad}
                    onChange={(e) => cambiarCantidad(i.producto_id, Math.max(1, Number(e.target.value)))}
                  />
                </td>
                <td className="px-3 py-2">{formatMoney(i.precio_unitario)}</td>
                <td className="px-3 py-2">{formatMoney(i.cantidad * i.precio_unitario)}</td>
                <td className="px-3 py-2 text-right">
                  <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => quitarItem(i.producto_id)}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card className="space-y-3">
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatMoney(total)}</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Tipo de venta">
            <Select value={tipoVenta} onChange={(e) => setTipoVenta(e.target.value as 'contado' | 'credito')}>
              <option value="contado">Contado</option>
              <option value="credito">Crédito</option>
            </Select>
          </Field>
          {tipoVenta === 'contado' && (
            <Field label="Método de pago">
              <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as 'efectivo' | 'qr')}>
                <option value="efectivo">Efectivo</option>
                <option value="qr">QR</option>
              </Select>
            </Field>
          )}
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end">
          <Button onClick={handleConfirmar} disabled={saving}>
            {saving ? 'Registrando…' : 'Confirmar venta'}
          </Button>
        </div>
      </Card>

      {showClienteModal && (
        <ClienteQuickCreateModal
          onClose={() => setShowClienteModal(false)}
          onCreated={(c) => {
            setClientes((prev) => [...prev, c])
            setClienteId(c.id)
            setShowClienteModal(false)
          }}
        />
      )}
      {showProductoModal && (
        <ProductoQuickCreateModal
          onClose={() => setShowProductoModal(false)}
          onCreated={(p) => {
            setProductos((prev) => [...prev, p])
            setShowProductoModal(false)
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// DETALLE DE VENTA
// ---------------------------------------------------------------------
export function VentaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [venta, setVenta] = useState<VentaConDetalle | null>(null)
  const [empresa, setEmpresa] = useState<Partial<EmpresaConfig> | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAnular, setShowAnular] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [showPago, setShowPago] = useState(false)
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'qr'>('efectivo')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    if (id) setVenta(await getVenta(id))
    try {
      setEmpresa(await getEmpresaConfig())
    } catch {
      setEmpresa(null) // si falla, la nota simplemente no muestra el encabezado de empresa
    }
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <Spinner />
  if (!venta) return <EmptyState text="Venta no encontrada." />

  const puedeAnular = profile?.role === 'admin' && venta.estado !== 'anulada'
  const puedeRegistrarPago =
    (profile?.role === 'admin' || profile?.role === 'contabilidad') && venta.saldo_pendiente > 0 && venta.estado !== 'anulada'

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Venta ${venta.id.slice(0, 8)}`}
        actions={
          // print:hidden → estos botones nunca se imprimen, solo se ven en pantalla
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimir nota
            </Button>
            {puedeRegistrarPago && <Button onClick={() => setShowPago(true)}>Registrar pago</Button>}
            {puedeAnular && (
              <Button variant="danger" onClick={() => setShowAnular(true)}>
                Anular venta
              </Button>
            )}
          </div>
        }
      />

      <div id="nota-venta">
        <Card>
          {/* Encabezado de la empresa: logo, nombre, NIT, dirección, teléfono */}
          <div className="flex items-start justify-between gap-4 pb-3 mb-3 border-b">
            <div className="flex items-center gap-3">
              {empresa?.logo_url && (
                <img src={empresa.logo_url} alt="Logo" className="h-14 w-14 object-contain" />
              )}
              <div>
                <p className="font-bold text-base">{empresa?.nombre ?? 'Mi Empresa'}</p>
                {empresa?.nit && <p className="text-xs text-slate-500">NIT: {empresa.nit}</p>}
                {empresa?.direccion && <p className="text-xs text-slate-500">{empresa.direccion}</p>}
                {empresa?.telefono && <p className="text-xs text-slate-500">Tel: {empresa.telefono}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Nota de venta</p>
              <p className="text-xs text-slate-400">{venta.id.slice(0, 8)}</p>
            </div>
          </div>

          <div className="flex justify-between mb-3">
            <div>
              <p className="font-semibold">{venta.clientes?.nombre}</p>
              <p className="text-xs text-slate-500">{formatDateTime(venta.created_at)}</p>
            </div>
            <Badge color={estadoColor(venta.estado)}>{venta.estado}</Badge>
          </div>
          <Table head={['Producto', 'Cantidad', 'P. Unitario', 'Subtotal']}>
            {venta.venta_detalles.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2">
                  {d.productos.nombre} <span className="text-slate-400 text-xs">({d.productos.codigo})</span>
                </td>
                <td className="px-3 py-2">{d.cantidad}</td>
                <td className="px-3 py-2">{formatMoney(d.precio_unitario)}</td>
                <td className="px-3 py-2">{formatMoney(d.subtotal)}</td>
              </tr>
            ))}
          </Table>
          <div className="flex justify-end mt-3 text-sm space-y-1 flex-col items-end">
            <div>Total: <span className="font-semibold">{formatMoney(venta.total)}</span></div>
            {venta.tipo_venta === 'credito' && <div>Saldo pendiente: <span className="font-semibold">{formatMoney(venta.saldo_pendiente)}</span></div>}
            <div className="text-xs text-slate-400">Nota de venta sin validez fiscal.</div>
          </div>
        </Card>

        {venta.pagos_venta.length > 0 && (
          <Card className="mt-3">
            <p className="font-medium text-sm mb-2">Pagos registrados</p>
            <Table head={['Fecha', 'Monto', 'Método']}>
              {venta.pagos_venta.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{formatDateTime(p.created_at)}</td>
                  <td className="px-3 py-2">{formatMoney(p.monto)}</td>
                  <td className="px-3 py-2 capitalize">{p.metodo_pago}</td>
                </tr>
              ))}
            </Table>
          </Card>
        )}
      </div>

      {showAnular && (
        <ConfirmModal
          title="Anular venta"
          message="Esta acción revierte el stock y la caja. No se puede deshacer."
          danger
          confirmLabel="Anular"
          onClose={() => setShowAnular(false)}
          extra={<Textarea placeholder="Motivo de anulación…" value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          onConfirm={async () => {
            try {
              await anularVenta(venta.id, motivo, profile!.id)
              setShowAnular(false)
              load()
            } catch (e) {
              setError((e as Error).message)
            }
          }}
        />
      )}

      {showPago && (
        <ConfirmModal
          title="Registrar pago"
          message={`Saldo pendiente: ${formatMoney(venta.saldo_pendiente)}`}
          confirmLabel="Registrar"
          onClose={() => setShowPago(false)}
          extra={
            <div className="space-y-2">
              <Input type="number" min={1} max={venta.saldo_pendiente} placeholder="Monto" value={montoPago} onChange={(e) => setMontoPago(e.target.value)} />
              <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as 'efectivo' | 'qr')}>
                <option value="efectivo">Efectivo</option>
                <option value="qr">QR</option>
              </Select>
            </div>
          }
          onConfirm={async () => {
            try {
              await registrarPagoVenta(venta.id, Number(montoPago), metodoPago, profile!.id)
              setShowPago(false)
              setMontoPago('')
              load()
            } catch (e) {
              setError((e as Error).message)
            }
          }}
        />
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
