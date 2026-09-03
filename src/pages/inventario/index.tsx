import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { listInventario, getKardex, crearAjusteInventario, getProducto, listProductos, type MovimientoInventario } from '@/lib/api'
import type { Producto } from '@/types/database'
import { formatDateTime } from '@/utils/format'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, PageHeader, Select, Spinner, Table, Textarea } from '@/components/ui'

export function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [soloAlerta, setSoloAlerta] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setProductos(await listInventario(soloAlerta))
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soloAlerta])

  return (
    <div>
      <PageHeader
        title="Inventario"
        actions={
          <Link to="/inventario/ajuste">
            <Button>+ Ajuste manual</Button>
          </Link>
        }
      />
      <Card className="mb-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={soloAlerta} onChange={(e) => setSoloAlerta(e.target.checked)} />
          Mostrar solo productos con stock bajo
        </label>
      </Card>
      {loading ? (
        <Spinner />
      ) : productos.length === 0 ? (
        <EmptyState text="No hay productos que mostrar." />
      ) : (
        <Table head={['Código', 'Producto', 'Stock', 'Stock mínimo', '']}>
          {productos.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 font-mono text-xs">{p.codigo}</td>
              <td className="px-3 py-2">{p.nombre}</td>
              <td className="px-3 py-2">
                {p.stock} {p.stock <= p.stock_minimo && <Badge color="red">bajo</Badge>}
              </td>
              <td className="px-3 py-2">{p.stock_minimo}</td>
              <td className="px-3 py-2 text-right">
                <Link to={`/inventario/kardex/${p.id}`} className="text-slate-500 hover:text-slate-900 text-xs">
                  Kardex
                </Link>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  )
}

// /inventario/kardex sin producto: selector.
export function KardexSelectorPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    listProductos(search).then(setProductos)
  }, [search])

  return (
    <div>
      <PageHeader title="Kardex" />
      <Card className="mb-3">
        <Input placeholder="Buscar producto…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>
      <Table head={['Código', 'Producto', 'Stock actual', '']}>
        {productos.map((p) => (
          <tr key={p.id}>
            <td className="px-3 py-2 font-mono text-xs">{p.codigo}</td>
            <td className="px-3 py-2">{p.nombre}</td>
            <td className="px-3 py-2">{p.stock}</td>
            <td className="px-3 py-2 text-right">
              <button className="text-slate-500 hover:text-slate-900 text-xs" onClick={() => navigate(`/inventario/kardex/${p.id}`)}>
                Ver kardex
              </button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  )
}

export function KardexPage() {
  const { productoId } = useParams<{ productoId: string }>()
  const [producto, setProducto] = useState<Producto | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productoId) return
    setLoading(true)
    Promise.all([getProducto(productoId), getKardex(productoId)]).then(([p, m]) => {
      setProducto(p)
      setMovimientos(m)
      setLoading(false)
    })
  }, [productoId])

  if (loading) return <Spinner />
  if (!producto) return <EmptyState text="Producto no encontrado." />

  return (
    <div>
      <PageHeader title={`Kardex — ${producto.nombre}`} actions={<Button variant="secondary" onClick={() => window.print()} className="print:hidden">Imprimir</Button>} />
      <Card className="mb-3 text-sm text-slate-600">
        Código: <span className="font-mono">{producto.codigo}</span> · Stock actual: <strong>{producto.stock}</strong>
      </Card>
      {movimientos.length === 0 ? (
        <EmptyState text="Sin movimientos registrados." />
      ) : (
        <Table head={['Fecha', 'Tipo', 'Entrada', 'Salida', 'Saldo']}>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(m.created_at)}</td>
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

export function AjusteInventarioPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [productos, setProductos] = useState<Producto[]>([])
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada')
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listProductos().then(setProductos)
  }, [])

  async function handleSubmit() {
    if (!productoId) return setError('Selecciona un producto.')
    if (!cantidad || Number(cantidad) <= 0) return setError('Ingresa una cantidad válida.')
    if (!nota.trim()) return setError('Describe el motivo del ajuste.')
    setSaving(true)
    setError(null)
    try {
      const delta = tipo === 'entrada' ? Number(cantidad) : -Number(cantidad)
      await crearAjusteInventario({ producto_id: productoId, cantidad: delta, nota, usuario_id: profile!.id })
      navigate(`/inventario/kardex/${productoId}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md">
      <PageHeader title="Ajuste manual de inventario" />
      <Card className="space-y-3">
        <Field label="Producto">
          <Select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            <option value="">Selecciona…</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} (stock: {p.stock})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo de ajuste">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as 'entrada' | 'salida')}>
            <option value="entrada">Entrada (sumar stock)</option>
            <option value="salida">Salida (restar stock)</option>
          </Select>
        </Field>
        <Field label="Cantidad">
          <Input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </Field>
        <Field label="Motivo">
          <Textarea value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: mermas, conteo físico, etc." />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button onClick={handleSubmit} disabled={saving} className="w-full">
          {saving ? 'Guardando…' : 'Registrar ajuste'}
        </Button>
      </Card>
    </div>
  )
}
