import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { listClientes, createCliente, updateCliente, desactivarCliente } from '@/lib/api'
import type { Cliente, TipoCliente } from '@/types/database'
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select, Spinner, Table } from '@/components/ui'

function ClienteForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Cliente>
  onSave: (data: Partial<Cliente>) => Promise<void>
  onClose: () => void
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [telefono, setTelefono] = useState(initial?.telefono ?? '')
  const [direccion, setDireccion] = useState(initial?.direccion ?? '')
  const [tipo, setTipo] = useState<TipoCliente>(initial?.tipo_cliente ?? 'minorista')
  const [limite, setLimite] = useState(initial?.limite_credito?.toString() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!nombre.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    setError(null)
    try {
      await onSave({
        nombre: nombre.trim(),
        telefono: telefono || null,
        direccion: direccion || null,
        tipo_cliente: tipo,
        limite_credito: limite ? Number(limite) : null,
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial?.id ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nombre">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </Field>
        <Field label="Teléfono">
          <Input value={telefono ?? ''} onChange={(e) => setTelefono(e.target.value)} />
        </Field>
        <Field label="Dirección">
          <Input value={direccion ?? ''} onChange={(e) => setDireccion(e.target.value)} />
        </Field>
        <Field label="Tipo de cliente">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCliente)}>
            <option value="minorista">Minorista</option>
            <option value="mayorista">Mayorista</option>
          </Select>
        </Field>
        <Field label="Límite de crédito (opcional)">
          <Input type="number" min={0} value={limite} onChange={(e) => setLimite(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// Reutilizable desde Nueva Venta / Nueva Cotización para crear cliente sin salir de la pantalla.
export function ClienteQuickCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Cliente) => void }) {
  const { profile } = useAuth()
  return (
    <ClienteForm
      onClose={onClose}
      onSave={async (data) => {
        const created = await createCliente(data, profile!.id)
        onCreated(created)
      }}
    />
  )
}

export default function ClientesPage() {
  const { profile } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Cliente | null>(null)
  const [toDeactivate, setToDeactivate] = useState<Cliente | null>(null)
  const puedeEditar = profile?.role === 'admin'

  async function load() {
    setLoading(true)
    setClientes(await listClientes(search))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div>
      <PageHeader title="Clientes" actions={<Button onClick={() => setShowForm(true)}>+ Nuevo cliente</Button>} />
      <Card className="mb-3">
        <Input placeholder="Buscar por nombre…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      {loading ? (
        <Spinner />
      ) : clientes.length === 0 ? (
        <EmptyState text="No hay clientes registrados." />
      ) : (
        <Table head={['Nombre', 'Tipo', 'Teléfono', 'Límite crédito', '']}>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td className="px-3 py-2">{c.nombre}</td>
              <td className="px-3 py-2">
                <Badge color={c.tipo_cliente === 'mayorista' ? 'blue' : 'slate'}>{c.tipo_cliente}</Badge>
              </td>
              <td className="px-3 py-2">{c.telefono ?? '—'}</td>
              <td className="px-3 py-2">{c.limite_credito ?? '—'}</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                {puedeEditar && (
                  <>
                    <button className="text-slate-500 hover:text-slate-900 text-xs mr-3" onClick={() => setEditing(c)}>
                      Editar
                    </button>
                    <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => setToDeactivate(c)}>
                      Desactivar
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {showForm && (
        <ClienteForm
          onClose={() => setShowForm(false)}
          onSave={async (data) => {
            await createCliente(data, profile!.id)
            setShowForm(false)
            load()
          }}
        />
      )}

      {editing && (
        <ClienteForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await updateCliente(editing.id, data)
            setEditing(null)
            load()
          }}
        />
      )}

      {toDeactivate && (
        <ConfirmModal
          title="Desactivar cliente"
          message={`¿Desactivar a "${toDeactivate.nombre}"? Ya no aparecerá disponible para nuevas ventas.`}
          danger
          confirmLabel="Desactivar"
          onClose={() => setToDeactivate(null)}
          onConfirm={async () => {
            await desactivarCliente(toDeactivate.id)
            setToDeactivate(null)
            load()
          }}
        />
      )}
    </div>
  )
}
