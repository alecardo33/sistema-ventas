import { supabase } from '@/lib/supabaseClient'
import { supabaseAdminAuth } from '@/lib/supabaseAdminClient'
import type {
  Cliente,
  Proveedor,
  Categoria,
  Producto,
  Venta,
  VentaDetalle,
  PagoVenta,
  Cotizacion,
  Compra,
  EmpresaConfig,
  Role,
} from '@/types/database'

function must<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  return data as T
}

// ---------------------------------------------------------------------
// CLIENTES
// ---------------------------------------------------------------------
export async function listClientes(search = ''): Promise<Cliente[]> {
  let q = supabase.from('clientes').select('*').eq('is_active', true).order('nombre')
  if (search) q = q.ilike('nombre', `%${search}%`)
  const { data, error } = await q
  return must(data, error)
}

export async function createCliente(input: Partial<Cliente>, userId: string): Promise<Cliente> {
  const { data, error } = await supabase
    .from('clientes')
    .insert({ ...input, created_by: userId })
    .select()
    .single()
  return must(data, error)
}

export async function updateCliente(id: string, input: Partial<Cliente>): Promise<Cliente> {
  const { data, error } = await supabase.from('clientes').update(input).eq('id', id).select().single()
  return must(data, error)
}

export async function desactivarCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').update({ is_active: false }).eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------
// CATEGORIAS
// ---------------------------------------------------------------------
export async function listCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select('*').order('nombre')
  return must(data, error)
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  const { data, error } = await supabase.from('categorias').insert({ nombre }).select().single()
  return must(data, error)
}

// ---------------------------------------------------------------------
// PROVEEDORES
// ---------------------------------------------------------------------
export async function listProveedores(search = ''): Promise<Proveedor[]> {
  let q = supabase.from('proveedores').select('*').eq('is_active', true).order('nombre')
  if (search) q = q.ilike('nombre', `%${search}%`)
  const { data, error } = await q
  return must(data, error)
}

export async function createProveedor(input: Partial<Proveedor>): Promise<Proveedor> {
  const { data, error } = await supabase.from('proveedores').insert(input).select().single()
  return must(data, error)
}

export async function updateProveedor(id: string, input: Partial<Proveedor>): Promise<Proveedor> {
  const { data, error } = await supabase.from('proveedores').update(input).eq('id', id).select().single()
  return must(data, error)
}

// ---------------------------------------------------------------------
// PRODUCTOS
// ---------------------------------------------------------------------
export async function listProductos(search = ''): Promise<Producto[]> {
  let q = supabase.from('productos').select('*').eq('is_active', true).order('nombre')
  if (search) q = q.or(`nombre.ilike.%${search}%,codigo.ilike.%${search}%`)
  const { data, error } = await q
  return must(data, error)
}

export async function getProducto(id: string): Promise<Producto> {
  const { data, error } = await supabase.from('productos').select('*').eq('id', id).single()
  return must(data, error)
}

// Crea un producto "rápido" desde venta/compra: sin precios, marcado pendiente_precio.
export async function crearProductoRapido(input: { codigo: string; nombre: string; unidad: string }, userId: string): Promise<Producto> {
  const { data, error } = await supabase
    .from('productos')
    .insert({ ...input, pendiente_precio: true, created_by: userId })
    .select()
    .single()
  return must(data, error)
}

export async function createProducto(input: Partial<Producto>, userId: string): Promise<Producto> {
  const { data, error } = await supabase
    .from('productos')
    .insert({ ...input, pendiente_precio: false, created_by: userId })
    .select()
    .single()
  return must(data, error)
}

export async function updateProducto(id: string, input: Partial<Producto>): Promise<Producto> {
  const { data, error } = await supabase
    .from('productos')
    .update({ ...input, pendiente_precio: false })
    .eq('id', id)
    .select()
    .single()
  return must(data, error)
}

// ---------------------------------------------------------------------
// INVENTARIO / KARDEX
// ---------------------------------------------------------------------
export interface MovimientoInventario {
  id: string
  producto_id: string
  tipo: string
  entrada: number
  salida: number
  saldo: number
  documento_ref: string | null
  usuario_id: string
  created_at: string
}

// Nota: el UPDATE directo de `productos` está restringido a Admin por RLS
// (solo Admin fija precios/datos del producto). Los movimientos de stock
// generados por ventas/compras/ajustes se hacen a través de la función
// `registrar_movimiento_inventario` (SQL, security definer) para que
// cualquier usuario autenticado pueda mover stock de forma controlada y
// siempre trazada en el kardex, sin poder tocar el resto del producto.
// Ver supabase/schema.sql, sección "FUNCIONES RPC".
async function registrarMovimientoInventario(
  producto_id: string,
  tipo: string,
  entrada: number,
  salida: number,
  documento_ref: string | null,
  usuario_id: string
): Promise<number> {
  const { data, error } = await supabase.rpc('registrar_movimiento_inventario', {
    p_producto_id: producto_id,
    p_tipo: tipo,
    p_entrada: entrada,
    p_salida: salida,
    p_documento_ref: documento_ref,
    p_usuario_id: usuario_id,
  })
  if (error) throw new Error(error.message)
  return data as number
}

export async function listInventario(soloAlerta = false): Promise<Producto[]> {
  const productos = await listProductos()
  return soloAlerta ? productos.filter((p) => p.stock <= p.stock_minimo) : productos
}

export async function getKardex(producto_id: string): Promise<MovimientoInventario[]> {
  const { data, error } = await supabase
    .from('movimientos_inventario')
    .select('*')
    .eq('producto_id', producto_id)
    .order('created_at', { ascending: false })
  return must(data, error)
}

export async function crearAjusteInventario(input: {
  producto_id: string
  cantidad: number // positivo = entrada, negativo = salida
  nota: string
  usuario_id: string
}): Promise<void> {
  const entrada = input.cantidad > 0 ? input.cantidad : 0
  const salida = input.cantidad < 0 ? Math.abs(input.cantidad) : 0
  await registrarMovimientoInventario(input.producto_id, 'ajuste', entrada, salida, null, input.usuario_id)
}

// ---------------------------------------------------------------------
// CAJA
// ---------------------------------------------------------------------
export interface MovimientoCaja {
  id: string
  tipo: 'ingreso' | 'egreso'
  origen: string
  documento_ref: string | null
  concepto: string
  monto: number
  usuario_id: string
  created_at: string
}

async function registrarMovimientoCaja(input: {
  tipo: 'ingreso' | 'egreso'
  origen: string
  documento_ref: string | null
  concepto: string
  monto: number
  usuario_id: string
}): Promise<void> {
  if (input.monto <= 0) return
  const { error } = await supabase.from('movimientos_caja').insert(input)
  if (error) throw new Error(error.message)
}

export async function listMovimientosCaja(desde?: string, hasta?: string): Promise<MovimientoCaja[]> {
  let q = supabase.from('movimientos_caja').select('*').order('created_at', { ascending: false })
  if (desde) q = q.gte('created_at', desde)
  if (hasta) q = q.lte('created_at', hasta + 'T23:59:59')
  const { data, error } = await q
  return must(data, error)
}

export async function crearMovimientoCajaManual(input: {
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: number
  usuario_id: string
}): Promise<void> {
  await registrarMovimientoCaja({ ...input, origen: 'manual', documento_ref: null })
}

export async function saldoCaja(): Promise<number> {
  const { data, error } = await supabase.from('movimientos_caja').select('tipo, monto')
  const rows = must(data, error) as { tipo: string; monto: number }[]
  return rows.reduce((acc, r) => acc + (r.tipo === 'ingreso' ? r.monto : -r.monto), 0)
}

// ---------------------------------------------------------------------
// VENTAS
// ---------------------------------------------------------------------
export interface ItemCarrito {
  producto_id: string
  cantidad: number
  precio_unitario: number
}

export interface VentaConDetalle extends Venta {
  venta_detalles: (VentaDetalle & { productos: { nombre: string; codigo: string } })[]
  clientes: { nombre: string }
  pagos_venta: PagoVenta[]
}

export async function listVentas(filters: { desde?: string; hasta?: string; estado?: string; usuario_id?: string } = {}): Promise<
  (Venta & { clientes: { nombre: string } })[]
> {
  let q = supabase.from('ventas').select('*, clientes(nombre)').order('created_at', { ascending: false })
  if (filters.desde) q = q.gte('created_at', filters.desde)
  if (filters.hasta) q = q.lte('created_at', filters.hasta + 'T23:59:59')
  if (filters.estado) q = q.eq('estado', filters.estado)
  if (filters.usuario_id) q = q.eq('usuario_id', filters.usuario_id)
  const { data, error } = await q
  return must(data, error)
}

export async function getVenta(id: string): Promise<VentaConDetalle> {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, clientes(nombre), venta_detalles(*, productos(nombre, codigo)), pagos_venta(*)')
    .eq('id', id)
    .single()
  return must(data, error) as unknown as VentaConDetalle
}

export async function crearVenta(input: {
  cliente_id: string
  tipo_venta: 'contado' | 'credito'
  metodo_pago: 'efectivo' | 'qr' | null
  items: ItemCarrito[]
  usuario_id: string
}): Promise<Venta> {
  const total = input.items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0)
  const esCredito = input.tipo_venta === 'credito'

  const { data: venta, error } = await supabase
    .from('ventas')
    .insert({
      cliente_id: input.cliente_id,
      tipo_venta: input.tipo_venta,
      metodo_pago: esCredito ? null : input.metodo_pago,
      estado: esCredito ? 'pendiente' : 'pagada',
      total,
      saldo_pendiente: esCredito ? total : 0,
      usuario_id: input.usuario_id,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const detalles = input.items.map((i) => ({
    venta_id: venta.id,
    producto_id: i.producto_id,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: i.cantidad * i.precio_unitario,
  }))
  const { error: detError } = await supabase.from('venta_detalles').insert(detalles)
  if (detError) throw new Error(detError.message)

  for (const item of input.items) {
    await registrarMovimientoInventario(item.producto_id, 'venta', 0, item.cantidad, venta.id, input.usuario_id)
  }

  if (!esCredito) {
    await registrarMovimientoCaja({
      tipo: 'ingreso',
      origen: 'venta',
      documento_ref: venta.id,
      concepto: `Venta ${venta.id.slice(0, 8)}`,
      monto: total,
      usuario_id: input.usuario_id,
    })
  }

  return venta
}

export async function anularVenta(id: string, motivo: string, usuario_id: string): Promise<void> {
  const venta = await getVenta(id)
  if (venta.estado === 'anulada') return

  for (const det of venta.venta_detalles) {
    await registrarMovimientoInventario(det.producto_id, 'anulacion_venta', det.cantidad, 0, venta.id, usuario_id)
  }

  const montoPagado = venta.total - venta.saldo_pendiente
  if (montoPagado > 0) {
    await registrarMovimientoCaja({
      tipo: 'egreso',
      origen: 'anulacion',
      documento_ref: venta.id,
      concepto: `Anulación venta ${venta.id.slice(0, 8)}: ${motivo}`,
      monto: montoPagado,
      usuario_id,
    })
  }

  const { error } = await supabase
    .from('ventas')
    .update({ estado: 'anulada', anulado_por: usuario_id, anulado_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// Igual que con inventario: `ventas` solo puede ser UPDATE por Admin vía RLS
// (para que un vendedor nunca pueda tocar una venta ya registrada). Registrar
// un abono a crédito sí requiere modificar `saldo_pendiente`/`estado`, así
// que se hace vía la función RPC `registrar_pago_venta`, restringida a
// Admin/Contabilidad dentro de la propia función SQL.
export async function registrarPagoVenta(venta_id: string, monto: number, metodo_pago: 'efectivo' | 'qr', usuario_id: string): Promise<void> {
  const { error } = await supabase.rpc('registrar_pago_venta', {
    p_venta_id: venta_id,
    p_monto: monto,
    p_metodo_pago: metodo_pago,
    p_usuario_id: usuario_id,
  })
  if (error) throw new Error(error.message)

  await registrarMovimientoCaja({
    tipo: 'ingreso',
    origen: 'pago_credito',
    documento_ref: venta_id,
    concepto: `Abono venta ${venta_id.slice(0, 8)}`,
    monto,
    usuario_id,
  })
}

export async function listCuentasPorCobrar(): Promise<(Venta & { clientes: { nombre: string } })[]> {
  const { data, error } = await supabase
    .from('ventas')
    .select('*, clientes(nombre)')
    .gt('saldo_pendiente', 0)
    .neq('estado', 'anulada')
    .order('created_at', { ascending: false })
  return must(data, error)
}

// ---------------------------------------------------------------------
// COTIZACIONES
// ---------------------------------------------------------------------
export interface CotizacionConDetalle extends Cotizacion {
  clientes: { nombre: string }
  cotizacion_detalles: { id: string; producto_id: string; cantidad: number; precio_unitario: number; subtotal: number; productos: { nombre: string; codigo: string } }[]
}

export async function listCotizaciones(): Promise<(Cotizacion & { clientes: { nombre: string } })[]> {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('*, clientes(nombre)')
    .order('fecha', { ascending: false })
  return must(data, error)
}

export async function getCotizacion(id: string): Promise<CotizacionConDetalle> {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('*, clientes(nombre), cotizacion_detalles(*, productos(nombre, codigo))')
    .eq('id', id)
    .single()
  return must(data, error) as unknown as CotizacionConDetalle
}

export async function crearCotizacion(input: { cliente_id: string; items: ItemCarrito[]; created_by: string }): Promise<Cotizacion> {
  const total = input.items.reduce((acc, i) => acc + i.cantidad * i.precio_unitario, 0)
  const { data: cot, error } = await supabase
    .from('cotizaciones')
    .insert({ cliente_id: input.cliente_id, total, created_by: input.created_by })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const detalles = input.items.map((i) => ({
    cotizacion_id: cot.id,
    producto_id: i.producto_id,
    cantidad: i.cantidad,
    precio_unitario: i.precio_unitario,
    subtotal: i.cantidad * i.precio_unitario,
  }))
  const { error: detError } = await supabase.from('cotizacion_detalles').insert(detalles)
  if (detError) throw new Error(detError.message)

  return cot
}

export async function convertirCotizacionAVenta(
  cotizacion_id: string,
  opts: { tipo_venta: 'contado' | 'credito'; metodo_pago: 'efectivo' | 'qr' | null; usuario_id: string }
): Promise<Venta> {
  const cot = await getCotizacion(cotizacion_id)
  const items: ItemCarrito[] = cot.cotizacion_detalles.map((d) => ({
    producto_id: d.producto_id,
    cantidad: d.cantidad,
    precio_unitario: d.precio_unitario,
  }))
  const venta = await crearVenta({
    cliente_id: cot.cliente_id,
    tipo_venta: opts.tipo_venta,
    metodo_pago: opts.metodo_pago,
    items,
    usuario_id: opts.usuario_id,
  })
  const { error } = await supabase.from('cotizaciones').update({ estado: 'convertida', venta_id: venta.id }).eq('id', cotizacion_id)
  if (error) throw new Error(error.message)
  return venta
}

export async function anularCotizacion(id: string): Promise<void> {
  const { error } = await supabase.from('cotizaciones').update({ estado: 'anulada' }).eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------
// COMPRAS
// ---------------------------------------------------------------------
export interface CompraConDetalle extends Compra {
  proveedores: { nombre: string }
  compra_detalles: { id: string; producto_id: string; cantidad: number; precio_compra: number; subtotal: number; productos: { nombre: string; codigo: string } }[]
}

export async function listCompras(filters: { desde?: string; hasta?: string } = {}): Promise<(Compra & { proveedores: { nombre: string } })[]> {
  let q = supabase.from('compras').select('*, proveedores(nombre)').order('created_at', { ascending: false })
  if (filters.desde) q = q.gte('created_at', filters.desde)
  if (filters.hasta) q = q.lte('created_at', filters.hasta + 'T23:59:59')
  const { data, error } = await q
  return must(data, error)
}

export async function getCompra(id: string): Promise<CompraConDetalle> {
  const { data, error } = await supabase
    .from('compras')
    .select('*, proveedores(nombre), compra_detalles(*, productos(nombre, codigo))')
    .eq('id', id)
    .single()
  return must(data, error) as unknown as CompraConDetalle
}

export async function crearCompra(input: {
  proveedor_id: string
  numero_documento: string
  items: { producto_id: string; cantidad: number; precio_compra: number }[]
  usuario_id: string
}): Promise<Compra> {
  const total = input.items.reduce((acc, i) => acc + i.cantidad * i.precio_compra, 0)

  const { data: compra, error } = await supabase
    .from('compras')
    .insert({ proveedor_id: input.proveedor_id, numero_documento: input.numero_documento, total, usuario_id: input.usuario_id })
    .select()
    .single()
  if (error) throw new Error(error.message)

  const detalles = input.items.map((i) => ({
    compra_id: compra.id,
    producto_id: i.producto_id,
    cantidad: i.cantidad,
    precio_compra: i.precio_compra,
    subtotal: i.cantidad * i.precio_compra,
  }))
  const { error: detError } = await supabase.from('compra_detalles').insert(detalles)
  if (detError) throw new Error(detError.message)

  for (const item of input.items) {
    await registrarMovimientoInventario(item.producto_id, 'compra', item.cantidad, 0, compra.id, input.usuario_id)
    // Costeo por último precio de compra (RPC: ver nota en registrarMovimientoInventario)
    const { error: precioError } = await supabase.rpc('actualizar_precio_compra', {
      p_producto_id: item.producto_id,
      p_precio: item.precio_compra,
    })
    if (precioError) throw new Error(precioError.message)
  }

  await registrarMovimientoCaja({
    tipo: 'egreso',
    origen: 'compra',
    documento_ref: compra.id,
    concepto: `Compra ${compra.id.slice(0, 8)}`,
    monto: total,
    usuario_id: input.usuario_id,
  })

  return compra
}

export async function anularCompra(id: string, motivo: string, usuario_id: string): Promise<void> {
  const compra = await getCompra(id)
  if (compra.estado === 'anulada') return

  for (const det of compra.compra_detalles) {
    await registrarMovimientoInventario(det.producto_id, 'anulacion_compra', 0, det.cantidad, compra.id, usuario_id)
  }

  await registrarMovimientoCaja({
    tipo: 'ingreso',
    origen: 'anulacion',
    documento_ref: compra.id,
    concepto: `Anulación compra ${compra.id.slice(0, 8)}: ${motivo}`,
    monto: compra.total,
    usuario_id,
  })

  const { error } = await supabase
    .from('compras')
    .update({ estado: 'anulada', anulado_por: usuario_id, anulado_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------
// EMPRESA / CONFIGURACIÓN
// ---------------------------------------------------------------------
export async function getEmpresaConfig(): Promise<EmpresaConfig | null> {
  const { data, error } = await supabase.from('empresa_config').select('*').limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function guardarEmpresaConfig(input: Partial<EmpresaConfig>): Promise<EmpresaConfig> {
  const existing = await getEmpresaConfig()
  if (existing) {
    const { data, error } = await supabase.from('empresa_config').update(input).eq('id', existing.id).select().single()
    return must(data, error)
  }
  const { data, error } = await supabase.from('empresa_config').insert(input).select().single()
  return must(data, error)
}

export async function subirLogo(file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `logo-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('company-assets').upload(path, file, { upsert: true })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('company-assets').getPublicUrl(path)
  return data.publicUrl
}

// ---------------------------------------------------------------------
// USUARIOS (solo Admin)
// ---------------------------------------------------------------------
export interface UsuarioProfile {
  id: string
  full_name: string
  email?: string
  role: Role
  phone: string | null
  is_active: boolean
  created_at: string
}

export async function listUsuarios(): Promise<UsuarioProfile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('full_name')
  return must(data, error)
}

// Usa el cliente admin (persistSession:false) para no pisar la sesión del
// administrador logueado en el cliente principal.
export async function crearUsuario(input: { email: string; password: string; full_name: string; role: Role }): Promise<void> {
  const { data, error } = await supabaseAdminAuth.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.full_name } },
  })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('No se pudo crear el usuario.')

  // El trigger on_auth_user_created ya insertó la fila en profiles con rol 'vendedor'.
  // Actualizamos al rol solicitado.
  const { error: updError } = await supabase.from('profiles').update({ role: input.role, full_name: input.full_name }).eq('id', data.user.id)
  if (updError) throw new Error(updError.message)

  await supabaseAdminAuth.auth.signOut()
}

export async function actualizarUsuario(id: string, input: { full_name?: string; role?: Role; is_active?: boolean }): Promise<void> {
  const { error } = await supabase.from('profiles').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------
// REPORTES / DASHBOARD
// ---------------------------------------------------------------------
// `movimientos_caja` solo es legible por Admin/Contabilidad (RLS), así que
// un Vendedor recibe `saldoCaja: null` en vez de un 0 engañoso.
export async function resumenDashboard(hoy: string, role: Role) {
  const puedeVerCaja = role === 'admin' || role === 'contabilidad'
  const [ventasHoy, alertaStock, saldo, cuentasPorCobrar] = await Promise.all([
    listVentas({ desde: hoy, hasta: hoy }),
    listInventario(true),
    puedeVerCaja ? saldoCaja() : Promise.resolve(null),
    listCuentasPorCobrar(),
  ])
  const totalVentasHoy = ventasHoy.filter((v) => v.estado !== 'anulada').reduce((acc, v) => acc + v.total, 0)
  const totalPorCobrar = cuentasPorCobrar.reduce((acc, v) => acc + v.saldo_pendiente, 0)
  return {
    totalVentasHoy,
    cantidadVentasHoy: ventasHoy.length,
    productosStockBajo: alertaStock.length,
    saldoCaja: saldo,
    cuentasPorCobrar: cuentasPorCobrar.length,
    totalPorCobrar,
  }
}
