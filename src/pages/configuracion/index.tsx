import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  getEmpresaConfig,
  guardarEmpresaConfig,
  subirLogo,
  listUsuarios,
  crearUsuario,
  actualizarUsuario,
  listClientes,
  listProveedores,
  listProductos,
  listVentas,
  listCompras,
  listMovimientosCaja,
  type UsuarioProfile,
} from '@/lib/api'
import type { EmpresaConfig, Role } from '@/types/database'
import { Badge, Button, Card, ErrorText, Field, Input, PageHeader, Select, Spinner } from '@/components/ui'

// ---------------------------------------------------------------------
// EMPRESA
// ---------------------------------------------------------------------
export function EmpresaPage() {
  const [config, setConfig] = useState<Partial<EmpresaConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    getEmpresaConfig().then((c) => {
      if (c) setConfig(c)
      setLoading(false)
    })
  }, [])

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    setOk(false)
    try {
      const saved = await guardarEmpresaConfig(config)
      setConfig(saved)
      setOk(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogo(file: File) {
    try {
      const url = await subirLogo(file)
      setConfig((prev) => ({ ...prev, logo_url: url }))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-lg">
      <PageHeader title="Datos de la empresa" />
      <Card className="space-y-3">
        <Field label="Nombre de la empresa">
          <Input value={config.nombre ?? ''} onChange={(e) => setConfig({ ...config, nombre: e.target.value })} />
        </Field>
        <Field label="NIT">
          <Input value={config.nit ?? ''} onChange={(e) => setConfig({ ...config, nit: e.target.value })} />
        </Field>
        <Field label="Dirección">
          <Input value={config.direccion ?? ''} onChange={(e) => setConfig({ ...config, direccion: e.target.value })} />
        </Field>
        <Field label="Teléfono">
          <Input value={config.telefono ?? ''} onChange={(e) => setConfig({ ...config, telefono: e.target.value })} />
        </Field>
        <Field label="Moneda (código ISO, ej. BOB, USD)">
          <Input value={config.moneda ?? 'BOB'} onChange={(e) => setConfig({ ...config, moneda: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Logo">
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleLogo(e.target.files[0])} />
          {config.logo_url && <img src={config.logo_url} alt="Logo" className="h-16 mt-2 rounded" />}
        </Field>
        <ErrorText>{error}</ErrorText>
        {ok && <p className="text-sm text-green-600">Guardado correctamente.</p>}
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------
// USUARIOS
// ---------------------------------------------------------------------
export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioProfile[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setUsuarios(await listUsuarios())
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  async function cambiarRol(id: string, role: Role) {
    await actualizarUsuario(id, { role })
    load()
  }
  async function toggleActivo(id: string, is_active: boolean) {
    await actualizarUsuario(id, { is_active })
    load()
  }

  return (
    <div>
      <PageHeader
        title="Usuarios"
        actions={
          <Link to="/configuracion/usuarios/nuevo">
            <Button>+ Nuevo usuario</Button>
          </Link>
        }
      />
      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <Card key={u.id} className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-medium">{u.full_name}</p>
                <p className="text-xs text-slate-500">{u.is_active ? <Badge color="green">activo</Badge> : <Badge color="red">inactivo</Badge>}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={u.role} onChange={(e) => cambiarRol(u.id, e.target.value as Role)}>
                  <option value="admin">Admin</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="contabilidad">Contabilidad</option>
                </Select>
                <Button variant="secondary" onClick={() => toggleActivo(u.id, !u.is_active)}>
                  {u.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export function NuevoUsuarioPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('vendedor')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  async function handleSubmit() {
    if (!email || !password || !fullName) return setError('Completa todos los campos.')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    setSaving(true)
    setError(null)
    try {
      await crearUsuario({ email, password, full_name: fullName, role })
      setOk(true)
      setEmail('')
      setPassword('')
      setFullName('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md">
      <PageHeader title="Nuevo usuario" />
      <Card className="space-y-3">
        <Field label="Nombre completo">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Correo">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contraseña temporal">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Rol">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="vendedor">Vendedor</option>
            <option value="contabilidad">Contabilidad</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <ErrorText>{error}</ErrorText>
        {ok && <p className="text-sm text-green-600">Usuario creado correctamente.</p>}
        <Button onClick={handleSubmit} disabled={saving} className="w-full">
          {saving ? 'Creando…' : 'Crear usuario'}
        </Button>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------
// RESPALDO (exportación a Excel)
// ---------------------------------------------------------------------
export function RespaldoPage() {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      const XLSX = await import('xlsx')
      const [clientes, proveedores, productos, ventas, compras, caja] = await Promise.all([
        listClientes(),
        listProveedores(),
        listProductos(),
        listVentas({}),
        listCompras({}),
        listMovimientosCaja(),
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientes), 'Clientes')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(proveedores), 'Proveedores')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productos), 'Productos')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ventas.map(({ clientes: _c, ...v }) => v)), 'Ventas')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compras.map(({ proveedores: _p, ...c }) => c)), 'Compras')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(caja), 'Caja')
      XLSX.writeFile(wb, `respaldo-sistema-ventas-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-md">
      <PageHeader title="Respaldo" />
      <Card className="space-y-3">
        <p className="text-sm text-slate-600">
          Genera un archivo Excel con clientes, proveedores, productos, ventas, compras y movimientos de caja. No incluye
          usuarios ni contraseñas.
        </p>
        <ErrorText>{error}</ErrorText>
        <Button onClick={handleExport} disabled={exporting} className="w-full">
          {exporting ? 'Generando…' : 'Descargar respaldo (.xlsx)'}
        </Button>
      </Card>
    </div>
  )
}
