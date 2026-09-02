import { useEffect, useState } from 'react'
import { listProveedores, createProveedor, updateProveedor } from '@/lib/api'
import type { Proveedor } from '@/types/database'
import { Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Spinner, Table } from '@/components/ui'

function ProveedorForm({ initial, onSave, onClose }: { initial?: Partial<Proveedor>; onSave: (d: Partial<Proveedor>) => Promise<void>; onClose: () => void }) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [nit, setNit] = useState(initial?.nit ?? '')
  const [telefono, setTelefono] = useState(initial?.telefono ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [direccion, setDireccion] = useState(initial?.direccion ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!nombre.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    setError(null)
    try {
      await onSave({ nombre: nombre.trim(), nit: nit || null, telefono: telefono || null, email: email || null, direccion: direccion || null })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial?.id ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Nombre / Razón social">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </Field>
        <Field label="NIT">
          <Input value={nit ?? ''} onChange={(e) => setNit(e.target.value)} />
        </Field>
        <Field label="Teléfono">
          <Input value={telefono ?? ''} onChange={(e) => setTelefono(e.target.value)} />
        </Field>
        <Field label="Correo">
          <Input type="email" value={email ?? ''} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Dirección">
          <Input value={direccion ?? ''} onChange={(e) => setDireccion(e.target.value)} />
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

export function ProveedorQuickCreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Proveedor) => void }) {
  return (
    <ProveedorForm
      onClose={onClose}
      onSave={async (data) => {
        const created = await createProveedor(data)
        onCreated(created)
      }}
    />
  )
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Proveedor | null>(null)

  async function load() {
    setLoading(true)
    setProveedores(await listProveedores(search))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div>
      <PageHeader title="Proveedores" actions={<Button onClick={() => setShowForm(true)}>+ Nuevo proveedor</Button>} />
      <Card className="mb-3">
        <Input placeholder="Buscar por nombre…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      {loading ? (
        <Spinner />
      ) : proveedores.length === 0 ? (
        <EmptyState text="No hay proveedores registrados." />
      ) : (
        <Table head={['Nombre', 'NIT', 'Teléfono', 'Correo', '']}>
          {proveedores.map((p) => (
            <tr key={p.id}>
              <td className="px-3 py-2">{p.nombre}</td>
              <td className="px-3 py-2">{p.nit ?? '—'}</td>
              <td className="px-3 py-2">{p.telefono ?? '—'}</td>
              <td className="px-3 py-2">{p.email ?? '—'}</td>
              <td className="px-3 py-2 text-right">
                <button className="text-slate-500 hover:text-slate-900 text-xs" onClick={() => setEditing(p)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {showForm && (
        <ProveedorForm
          onClose={() => setShowForm(false)}
          onSave={async (data) => {
            await createProveedor(data)
            setShowForm(false)
            load()
          }}
        />
      )}
      {editing && (
        <ProveedorForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            await updateProveedor(editing.id, data)
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}
