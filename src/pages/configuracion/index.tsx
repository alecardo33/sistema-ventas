import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
      // Fusiona la respuesta del backend manteniendo el estado previo
      setConfig((prev) => ({ ...prev, ...saved }))
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
    const data = await listUsuarios()
    setUsuarios(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  // Cambiar rol con actualización optimista inmediata en la UI
  async function cambiarRol(id: string, role: Role) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role } : u))
    )
    try {
      await actualizarUsuario(id, { role })
    } catch (e) {
      alert('Error al actualizar el rol: ' + (e as Error).message)
      await load() // Revertir en caso de fallar la API
    }
  }

  // Activar/Desactivar con actualización optimista inmediata en la UI
  async function toggleActivo(id: string, is_active: boolean) {
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_active } : u))
    )
    try {
      await actualizarUsuario(id, { is_active })
    } catch (e) {
      alert('Error al cambiar el estado: ' + (e as Error).message)
      await load() // Revertir en caso de fallar la API
    }
  }

  // Restablecer/Cambiar contraseña
  async function cambiarPassword(id: string, nombre: string) {
    const nuevaPassword = window.prompt(`Ingresa la nueva contraseña para "${nombre}":`)
    if (!nuevaPassword) return

    if (nuevaPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    try {
      await actualizarUsuario(id, { password: nuevaPassword } as Partial<UsuarioProfile>)
      alert('Contraseña actualizada correctamente.')
    } catch (e) {
      alert('Error al actualizar la contraseña: ' + (e as Error).message)
    }
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
                {u.email && <p className="text-sm text-slate-500">{u.email}</p>}
                <div className="mt-1">
                  {u.is_active ? <Badge color="green">activo</Badge> : <Badge color="red">inactivo</Badge>}
                </div>
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
                <Button variant="secondary" onClick={() => cambiarPassword(u.id, u.full_name)}>
                  Clave
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------
// NUEVO USUARIO
// ---------------------------------------------------------------------
export function NuevoUsuarioPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('vendedor')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!email || !password || !fullName) return setError('Completa todos los campos.')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    setSaving(true)
    setError(null)
    try {
      await crearUsuario({ email, password, full_name: fullName, role })
      // Redirige al listado de usuarios tras guardar exitosamente
      navigate('/configuracion/usuarios')
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
        <Button onClick={handleSubmit} disabled={saving} className="w-full">
          {saving ? 'Creando…' : 'Crear usuario'}
        </Button>
      </Card>
    </div>
  )
}
// Actualización forzada del sistema