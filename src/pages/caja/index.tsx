import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { listMovimientosCaja, crearMovimientoCajaManual, saldoCaja, type MovimientoCaja } from '@/lib/api'
import { formatDateTime, formatMoney, todayISO, daysAgoISO } from '@/utils/format'
import { Badge, Button, Card, EmptyState, ErrorText, Field, Input, Modal, PageHeader, Select, Spinner, Table, Textarea } from '@/components/ui'

function MovimientoManualModal({ tipo, onClose, onSaved }: { tipo: 'ingreso' | 'egreso'; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth()
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!concepto.trim()) return setError('Describe el concepto.')
    if (!monto || Number(monto) <= 0) return setError('Ingresa un monto válido.')
    setSaving(true)
    setError(null)
    try {
      await crearMovimientoCajaManual({ tipo, concepto: concepto.trim(), monto: Number(monto), usuario_id: profile!.id })
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={tipo === 'ingreso' ? 'Nuevo ingreso de caja' : 'Nuevo egreso de caja'} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Concepto">
          <Textarea value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        </Field>
        <Field label="Monto">
          <Input type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function CajaPage() {
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([])
  const [saldo, setSaldo] = useState(0)
  const [desde, setDesde] = useState(daysAgoISO(30))
  const [hasta, setHasta] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'ingreso' | 'egreso' | null>(null)

  async function load() {
    setLoading(true)
    const [movs, s] = await Promise.all([listMovimientosCaja(desde, hasta), saldoCaja()])
    setMovimientos(movs)
    setSaldo(s)
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta])

  return (
    <div>
      <PageHeader
        title="Caja"
        actions={
          <>
            <Button variant="secondary" onClick={() => setModal('ingreso')}>
              + Ingreso
            </Button>
            <Button variant="danger" onClick={() => setModal('egreso')}>
              + Egreso
            </Button>
          </>
        }
      />

      <Card className="mb-3">
        <p className="text-sm text-slate-500">Saldo actual de caja</p>
        <p className="text-2xl font-semibold">{formatMoney(saldo)}</p>
      </Card>

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
      ) : movimientos.length === 0 ? (
        <EmptyState text="Sin movimientos en este rango." />
      ) : (
        <Table head={['Fecha', 'Tipo', 'Origen', 'Concepto', 'Monto']}>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(m.created_at)}</td>
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

      {modal && (
        <MovimientoManualModal
          tipo={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            load()
          }}
        />
      )}
    </div>
  )
}
