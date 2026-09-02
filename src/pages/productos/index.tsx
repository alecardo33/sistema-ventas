import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { listProductos, createProducto, updateProducto, crearProductoRapido, listCategorias, crearCategoria } from '@/lib/api'
import type { Producto, Categoria } from '@/types/database'
import { formatMoney } from '@/utils/format'
import { Badge, Button, Card, ErrorText, Field, Input, Modal, PageHeader, Select, Spinner, Table, EmptyState } from '@/components/ui'

function ProductoForm({ initial, onSave, onClose }: { initial?: Partial<Producto>; onSave: (d: Partial<Producto>) => Promise<void>; onClose: () => void }) {
  const [codigo, setCodigo] = useState(initial?.codigo ?? '')
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [unidad, setUnidad] = useState(initial?.unidad ?? 'unidad')
  const [categoriaId, setCategoriaId] = useState(initial?.categoria_id ?? '')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [precioCompra, setPrecioCompra] = useState(initial?.precio_compra?.toString() ?? '0')
  const [precioMayorista, setPrecioMayorista] = useState(initial?.precio_mayorista?.toString() ?? '')
  const [precioMinorista, setPrecioMinorista] = useState(initial?.precio_minorista?.toString() ?? '')
  const [stockMinimo, setStockMinimo] = useState(initial?.stock_minimo?.toString() ?? '0')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listCategorias().then(setCategorias)
  }, [])

  async function handleAddCategoria() {
    if (!nuevaCategoria.trim()) return
    const c = await crearCategoria(nuevaCategoria.trim())
    setCategorias((prev) => [...prev, c])
    setCategoriaId(c.id)
    setNuevaCategoria('')
  }

  async function handleSubmit() {
    if (!codigo.trim() || !nombre.trim()) return setError('Código y nombre son obligatorios.')
    if (!precioMayorista || !precioMinorista) return setError('Debes definir ambos precios de venta.')
    setSaving(true)
    setError(null)
    try {
      await onSave({
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        unidad,
        categoria_id: categoriaId || null,
        precio_compra: Number(precioCompra) || 0,
        precio_mayorista: Number(precioMayorista),
        precio_minorista: Number(precioMinorista),
        stock_minimo: Number(stockMinimo) || 0,
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial?.id ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} wide>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Código (SKU)">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        </Field>
        <Field label="Nombre">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Unidad de medida">
          <Input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="unidad, caja, kg…" />
        </Field>
        <Field label="Categoría">
          <div className="flex gap-2">
            <Select value={categoriaId ?? ''} onChange={(e) => setCategoriaId(e.target.value)} className="flex-1">
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 mt-1">
            <Input placeholder="Nueva categoría…" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} />
            <Button type="button" variant="secondary" onClick={handleAddCategoria}>
              Agregar
            </Button>
          </div>
        </Field>
        <Field label="Precio de compra">
          <Input type="number" min={0} value={precioCompra} onChange={(e) => setPrecioCompra(e.target.value)} />
        </Field>
        <Field label="Stock mínimo (alerta)">
          <Input type="number" min={0} value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} />
        </Field>
        <Field label="Precio mayorista">
          <Input type="number" min={0} value={precioMayorista} onChange={(e) => setPrecioMayorista(e.target.value)} />
        </Field>
        <Field label="Precio minorista">
          <Input type="number" min={0} value={precioMinorista} onChange={(e) => setPrecioMinorista(e.target.value)} />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2 pt-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </Modal>
  )
}

// Reutilizable desde Nueva Venta / Nueva Compra: crea el producto sin precios,
// marcado "pendiente_precio" — el vendedor no puede fijar precios.
export function ProductoQuickCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Producto) => void }) {
  const { profile } = useAuth()
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('unidad')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!codigo.trim() || !nombre.trim()) return setError('Código y nombre son obligatorios.')
    setSaving(true)
    setError(null)
    try {
      const p = await crearProductoRapido({ codigo: codigo.trim(), nombre: nombre.trim(), unidad }, profile!.id)
      onCreated(p)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Nuevo producto rápido" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
          Este producto quedará pendiente de precio — un Administrador debe completar los precios antes de poder venderlo con normalidad.
        </p>
        <Field label="Código (SKU)">
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus />
        </Field>
        <Field label="Nombre">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Unidad de medida">
          <Input value={unidad} onChange={(e) => setUnidad(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creando…' : 'Crear'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function ProductosPage() {
  const { profile } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const puedeEditar = profile?.role === 'admin'

  async function load() {
    setLoading(true)
    setProductos(await listProductos(search))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div>
      <PageHeader title="Productos" actions={puedeEditar && <Button onClick={() => setShowForm(true)}>+ Nuevo producto</Button>} />
      <Card className="mb-3">
        <Input placeholder="Buscar por nombre o código…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      {loading ? (
        <Spinner />
      ) : productos.length === 0 ? (
        <EmptyState text="No hay productos registrados." />
      ) : (
        <Table head={['Código', 'Nombre', 'Stock', 'P. Mayorista', 'P. Minorista', '']}>
          {productos.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2 font-mono text-xs">{p.codigo}</td>
              <td className="px-3 py-2">
                {p.nombre}{' '}
                {p.pendiente_precio && (
                  <Badge color="amber">pendiente de precio</Badge>
                )}
              </td>
              <td className="px-3 py-2">
                {p.stock} {p.stock <= p.stock_minimo && <Badge color="red">stock bajo</Badge>}
              </td>
              <td className="px-3 py-2">{p.precio_mayorista != null ? formatMoney(p.precio_mayorista) : '—'}</td>
              <td className="px-3 py-2">{p.precio_minorista != null ? formatMoney(p.precio_minorista) : '—'}</td>
              <td className="px-3 py-2 text-right">
                {puedeEditar && (
                  <button className="text-slate-500 hover:text-slate-900 text-xs" onClick={() => setEditing(p)}>
                    Editar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {showForm && (
        <ProductoForm
          onClose={() => setShowForm(false)}
          onSave={async (data) => {
            await createProducto(data, profile!.id)
            setShowForm(false)
            load()
          }}
        />
      )}

      {editing && (
        <ProductoForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await updateProducto(editing.id, data)
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}
