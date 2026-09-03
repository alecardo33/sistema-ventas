import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  listCotizaciones,
  crearCotizacion,
  getCotizacion,
  convertirCotizacionAVenta,
  anularCotizacion,
  listClientes,
  listProductos,
  type ItemCarrito,
  type CotizacionConDetalle,
} from '@/lib/api'
import type { Cliente, Producto, Cotizacion } from '@/types/database'
import { formatDate, formatDateTime, formatMoney } from '@/utils/format'
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner, Table } from '@/components/ui'
import { ClienteQuickCreateModal } from '@/pages/clientes'
import { ProductoQuickCreateModal } from '@/pages/productos'

function estadoColor(estado: string): 'green' | 'red' | 'blue' {
  if (estado === 'convertida') return 'green'
  if (estado === 'anulada' || estado === 'vencida') return 'red'
  return 'blue'
}

export function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<(Cotizacion & { clientes: { nombre: string } })[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setCotizaciones(await listCotizaciones())
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        actions={
          <Link to="/cotizaciones/nueva">
            <Button>+ Nueva cotización</Button>
          </Link>
        }
      />
      {loading ? (
        <Spinner />
      ) : cotizaciones.length === 0 ? (
        <EmptyState text="No hay cotizaciones registradas." />
      ) : (
        <Table head={['Fecha', 'Cliente', 'Total', 'Estado', '']}>
          {cotizaciones.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2">{formatDate(c.fecha)}</td>
              <td className="px-3 py-2">{c.clientes?.nombre}</td>
              <td className="px-3 py-2">{formatMoney(c.total)}</td>
              <td className="px-3 py-2">
                <Badge color={estadoColor(c.estado)}>{c.estado}</Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <Link to={`/cotizaciones/${c.id}`} className="text-slate-500 hover:text-slate-900 text-xs">
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

export function NuevaCotizacionPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [clienteId, setClienteId] = useState('')
  const [buscarProducto, setBuscarProducto] = useState('')
  const [items, setItems] = useState<(ItemCarrito & { nombre: string })[]>([])
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [showProductoModal, setShowProductoModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([listClientes(), listProductos()]).then(([cs, ps]) => {
      setClientes(cs)
      setProductos(ps)
    })
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
    if (p.pendiente_precio) return setError(`"${p.nombre}" está pendiente de precio.`)
    setItems((prev) => {
      const existente = prev.find((i) => i.producto_id === p.id)
      if (existente) return prev.map((i) => (i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      return [...prev, { producto_id: p.id, cantidad: 1, precio_unitario: precioPara(p), nombre: p.nombre }]
    })
    setBuscarProducto('')
  }

  const total = items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0)

  async function handleConfirmar() {
    if (!clienteId) return setError('Selecciona un cliente.')
    if (items.length === 0) return setError('Agrega al menos un producto.')
    setSaving(true)
    setError(null)
    try {
      const cot = await crearCotizacion({ cliente_id: clienteId, items, created_by: profile!.id })
      navigate(`/cotizaciones/${cot.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Nueva cotización" />
      <Card>
        <Field label="Cliente">
          <div className="flex gap-2">
            <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="flex-1">
              <option value="">Selecciona un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
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
        <Field label="Buscar producto">
          <div className="flex gap-2">
            <Input value={buscarProducto} onChange={(e) => setBuscarProducto(e.target.value)} />
            <Button type="button" variant="secondary" onClick={() => setShowProductoModal(true)}>
              + Nuevo
            </Button>
          </div>
        </Field>
        {productosFiltrados.length > 0 && (
          <div className="border rounded-lg divide-y">
            {productosFiltrados.map((p) => (
              <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex justify-between" onClick={() => agregarProducto(p)}>
                <span>{p.nombre}</span>
                <span className="text-slate-500">{formatMoney(precioPara(p))}</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        {items.length === 0 ? (
          <EmptyState text="Sin productos agregados." />
        ) : (
          <Table head={['Producto', 'Cantidad', 'P. Unitario', 'Subtotal']}>
            {items.map((i) => (
              <tr key={i.producto_id}>
                <td className="px-3 py-2">{i.nombre}</td>
                <td className="px-3 py-2">{i.cantidad}</td>
                <td className="px-3 py-2">{formatMoney(i.precio_unitario)}</td>
                <td className="px-3 py-2">{formatMoney(i.cantidad * i.precio_unitario)}</td>
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
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end">
          <Button onClick={handleConfirmar} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cotización'}
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

export function CotizacionDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [cot, setCot] = useState<CotizacionConDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConvertir, setShowConvertir] = useState(false)
  const [tipoVenta, setTipoVenta] = useState<'contado' | 'credito'>('contado')
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'qr'>('efectivo')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    if (id) setCot(await getCotizacion(id))
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <Spinner />
  if (!cot) return <EmptyState text="Cotización no encontrada." />

  const puedeConvertir = cot.estado === 'vigente'

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Cotización ${cot.id.slice(0, 8)}`}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimir
            </Button>
            {puedeConvertir && <Button onClick={() => setShowConvertir(true)}>Convertir a venta</Button>}
            {puedeConvertir && (
              <Button
                variant="danger"
                onClick={async () => {
                  await anularCotizacion(cot.id)
                  load()
                }}
              >
                Anular
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <div className="flex justify-between mb-3">
          <div>
            <p className="font-semibold">{cot.clientes?.nombre}</p>
            <p className="text-xs text-slate-500">{formatDateTime(cot.fecha)}</p>
          </div>
          <Badge color={estadoColor(cot.estado)}>{cot.estado}</Badge>
        </div>
        <Table head={['Producto', 'Cantidad', 'P. Unitario', 'Subtotal']}>
          {cot.cotizacion_detalles.map((d) => (
            <tr key={d.id}>
              <td className="px-3 py-2">{d.productos.nombre}</td>
              <td className="px-3 py-2">{d.cantidad}</td>
              <td className="px-3 py-2">{formatMoney(d.precio_unitario)}</td>
              <td className="px-3 py-2">{formatMoney(d.subtotal)}</td>
            </tr>
          ))}
        </Table>
        <div className="flex justify-end mt-3 font-semibold">Total: {formatMoney(cot.total)}</div>
      </Card>

      {showConvertir && (
        <ConfirmModal
          title="Convertir a venta"
          message="Se generará una venta con estos mismos productos y precios."
          confirmLabel="Confirmar"
          onClose={() => setShowConvertir(false)}
          extra={
            <div className="space-y-2">
              <Select value={tipoVenta} onChange={(e) => setTipoVenta(e.target.value as 'contado' | 'credito')}>
                <option value="contado">Contado</option>
                <option value="credito">Crédito</option>
              </Select>
              {tipoVenta === 'contado' && (
                <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value as 'efectivo' | 'qr')}>
                  <option value="efectivo">Efectivo</option>
                  <option value="qr">QR</option>
                </Select>
              )}
            </div>
          }
          onConfirm={async () => {
            try {
              const venta = await convertirCotizacionAVenta(cot.id, {
                tipo_venta: tipoVenta,
                metodo_pago: tipoVenta === 'credito' ? null : metodoPago,
                usuario_id: profile!.id,
              })
              navigate(`/ventas/${venta.id}`)
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
