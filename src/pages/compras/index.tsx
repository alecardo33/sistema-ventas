import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { listCompras, crearCompra, getCompra, anularCompra, puedeEditarCompra, listProveedores, listProductos, type CompraConDetalle } from '@/lib/api'
import type { Proveedor, Producto, Compra } from '@/types/database'
import { formatDateTime, formatMoney, todayISO, daysAgoISO } from '@/utils/format'
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner, Table, Textarea } from '@/components/ui'
import { ProveedorQuickCreateModal } from '@/pages/proveedores'
import { ProductoQuickCreateModal } from '@/pages/productos'

export function ComprasPage() {
  const [compras, setCompras] = useState<(Compra & { proveedores: { nombre: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [desde, setDesde] = useState(daysAgoISO(30))
  const [hasta, setHasta] = useState(todayISO())

  async function load() {
    setLoading(true)
    setCompras(await listCompras({ desde, hasta }))
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta])

  return (
    <div>
      <PageHeader
        title="Compras"
        actions={
          <Link to="/compras/nueva">
            <Button>+ Nueva compra</Button>
          </Link>
        }
      />
      <Card className="mb-3 flex gap-3 flex-wrap items-end">
        <Field label="Desde">
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </Field>
        <Field label="Hasta">
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </Field>
      </Card>
      {loading ? (
        <Spinner />
      ) : compras.length === 0 ? (
        <EmptyState text="No hay compras en este rango." />
      ) : (
        <Table head={['Fecha', 'Proveedor', 'Documento', 'Total', 'Estado', '']}>
          {compras.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(c.created_at)}</td>
              <td className="px-3 py-2">{c.proveedores?.nombre}</td>
              <td className="px-3 py-2">{c.numero_documento ?? '—'}</td>
              <td className="px-3 py-2">{formatMoney(c.total)}</td>
              <td className="px-3 py-2">
                <Badge color={c.estado === 'anulada' ? 'red' : 'green'}>{c.estado}</Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <Link to={`/compras/${c.id}`} className="text-slate-500 hover:text-slate-900 text-xs">
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

interface PrellenadoCompra {
  proveedor_id: string
  numero_documento: string
  items: { producto_id: string; nombre: string; cantidad: number; precio_compra: number }[]
  glosa: string
}

export function NuevaCompraPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const prellenado = (location.state as { prellenado?: PrellenadoCompra } | null)?.prellenado

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [proveedorId, setProveedorId] = useState(prellenado?.proveedor_id ?? '')
  const [numeroDocumento, setNumeroDocumento] = useState(prellenado?.numero_documento ?? '')
  const [glosa, setGlosa] = useState(prellenado?.glosa ?? '')
  const [buscarProducto, setBuscarProducto] = useState('')
  const [items, setItems] = useState<{ producto_id: string; nombre: string; cantidad: number; precio_compra: number }[]>(
    prellenado?.items ?? []
  )
  const [showProveedorModal, setShowProveedorModal] = useState(false)
  const [showProductoModal, setShowProductoModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([listProveedores(), listProductos()]).then(([ps, prods]) => {
      setProveedores(ps)
      setProductos(prods)
    })
  }, [])

  const productosFiltrados = useMemo(() => {
    if (!buscarProducto) return []
    const q = buscarProducto.toLowerCase()
    return productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 8)
  }, [buscarProducto, productos])

  function agregarProducto(p: Producto) {
    setItems((prev) => {
      const existente = prev.find((i) => i.producto_id === p.id)
      if (existente) return prev.map((i) => (i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      return [...prev, { producto_id: p.id, nombre: p.nombre, cantidad: 1, precio_compra: p.precio_compra }]
    })
    setBuscarProducto('')
  }

  function actualizar(producto_id: string, field: 'cantidad' | 'precio_compra', value: number) {
    setItems((prev) => prev.map((i) => (i.producto_id === producto_id ? { ...i, [field]: value } : i)))
  }

  const total = items.reduce((acc, i) => acc + i.cantidad * i.precio_compra, 0)

  async function handleConfirmar() {
    if (!proveedorId) return setError('Selecciona un proveedor.')
    if (items.length === 0) return setError('Agrega al menos un producto.')
    setSaving(true)
    setError(null)
    try {
      const compra = await crearCompra({
        proveedor_id: proveedorId,
        numero_documento: numeroDocumento,
        items,
        usuario_id: profile!.id,
        glosa,
      })
      navigate(`/compras/${compra.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title={prellenado ? 'Nueva compra (corrección)' : 'Nueva compra'} />
      {prellenado && (
        <div className="rounded-lg bg-amber-50 text-amber-800 text-sm px-3 py-2">
          La compra original fue anulada. Revisa y corrige los datos antes de confirmar.
        </div>
      )}
      <Card className="grid sm:grid-cols-2 gap-3">
        <Field label="Proveedor">
          <div className="flex gap-2">
            <Select value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className="flex-1">
              <option value="">Selecciona un proveedor…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
            <Button type="button" variant="secondary" onClick={() => setShowProveedorModal(true)}>
              + Nuevo
            </Button>
          </div>
        </Field>
        <Field label="N° de documento (factura/recibo)">
          <Input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Glosa (opcional)">
            <Textarea placeholder="Ej: ajuste, nota interna…" value={glosa} onChange={(e) => setGlosa(e.target.value)} />
          </Field>
        </div>
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
              <button key={p.id} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50" onClick={() => agregarProducto(p)}>
                {p.nombre} <span className="text-slate-400 text-xs">({p.codigo})</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        {items.length === 0 ? (
          <EmptyState text="Sin productos agregados." />
        ) : (
          <Table head={['Producto', 'Cantidad', 'P. Compra', 'Subtotal']}>
            {items.map((i) => (
              <tr key={i.producto_id}>
                <td className="px-3 py-2">{i.nombre}</td>
                <td className="px-3 py-2 w-24">
                  <Input type="number" min={1} value={i.cantidad} onChange={(e) => actualizar(i.producto_id, 'cantidad', Number(e.target.value))} />
                </td>
                <td className="px-3 py-2 w-28">
                  <Input type="number" min={0} value={i.precio_compra} onChange={(e) => actualizar(i.producto_id, 'precio_compra', Number(e.target.value))} />
                </td>
                <td className="px-3 py-2">{formatMoney(i.cantidad * i.precio_compra)}</td>
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
            {saving ? 'Registrando…' : 'Confirmar compra'}
          </Button>
        </div>
      </Card>

      {showProveedorModal && (
        <ProveedorQuickCreateModal
          onClose={() => setShowProveedorModal(false)}
          onCreated={(p) => {
            setProveedores((prev) => [...prev, p])
            setProveedorId(p.id)
            setShowProveedorModal(false)
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

export function CompraDetallePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [compra, setCompra] = useState<CompraConDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAnular, setShowAnular] = useState(false)
  const [showEditar, setShowEditar] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [motivoEdicion, setMotivoEdicion] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    if (id) setCompra(await getCompra(id))
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <Spinner />
  if (!compra) return <EmptyState text="Compra no encontrada." />

  const puedeAnular = profile?.role === 'admin' && compra.estado !== 'anulada'
  const puedeEditar = profile ? puedeEditarCompra(compra, profile.role) : false

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Compra ${compra.id.slice(0, 8)}`}
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimir
            </Button>
            {puedeEditar && (
              <Button variant="secondary" onClick={() => setShowEditar(true)}>
                Editar
              </Button>
            )}
            {puedeAnular && (
              <Button variant="danger" onClick={() => setShowAnular(true)}>
                Anular compra
              </Button>
            )}
          </div>
        }
      />
      <Card>
        <div className="flex justify-between mb-3">
          <div>
            <p className="font-semibold">{compra.proveedores?.nombre}</p>
            <p className="text-xs text-slate-500">{formatDateTime(compra.created_at)} · Doc: {compra.numero_documento ?? '—'}</p>
          </div>
          <Badge color={compra.estado === 'anulada' ? 'red' : 'green'}>{compra.estado}</Badge>
        </div>
        {compra.glosa && <p className="text-sm text-slate-500 mb-3">Glosa: {compra.glosa}</p>}
        <Table head={['Producto', 'Cantidad', 'P. Compra', 'Subtotal']}>
          {compra.compra_detalles.map((d) => (
            <tr key={d.id}>
              <td className="px-3 py-2">{d.productos.nombre}</td>
              <td className="px-3 py-2">{d.cantidad}</td>
              <td className="px-3 py-2">{formatMoney(d.precio_compra)}</td>
              <td className="px-3 py-2">{formatMoney(d.subtotal)}</td>
            </tr>
          ))}
        </Table>
        <div className="flex justify-end mt-3 font-semibold">Total: {formatMoney(compra.total)}</div>
      </Card>

      {showEditar && (
        <ConfirmModal
          title="Editar compra"
          message="Esto anula la compra actual (revierte stock y caja) y abre un formulario nuevo con los mismos datos para que los corrijas. No se puede deshacer."
          danger
          confirmLabel="Anular y corregir"
          onClose={() => setShowEditar(false)}
          extra={<Textarea placeholder="Motivo de la corrección…" value={motivoEdicion} onChange={(e) => setMotivoEdicion(e.target.value)} />}
          onConfirm={async () => {
            try {
              await anularCompra(compra.id, motivoEdicion || 'Corrección', profile!.id)
              navigate('/compras/nueva', {
                state: {
                  prellenado: {
                    proveedor_id: compra.proveedor_id,
                    numero_documento: compra.numero_documento ?? '',
                    items: compra.compra_detalles.map((d) => ({
                      producto_id: d.producto_id,
                      nombre: d.productos.nombre,
                      cantidad: d.cantidad,
                      precio_compra: d.precio_compra,
                    })),
                    glosa: `Corrección de compra ${compra.id.slice(0, 8)}: ${motivoEdicion || 'sin detalle'}`,
                  },
                },
              })
            } catch (e) {
              setError((e as Error).message)
              setShowEditar(false)
            }
          }}
        />
      )}
      {showAnular && (
        <ConfirmModal
          title="Anular compra"
          message="Esta acción revierte el stock y la caja. No se puede deshacer."
          danger
          confirmLabel="Anular"
          onClose={() => setShowAnular(false)}
          extra={<Textarea placeholder="Motivo…" value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
          onConfirm={async () => {
            try {
              await anularCompra(compra.id, motivo, profile!.id)
              setShowAnular(false)
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
