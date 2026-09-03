// Tipos principales del dominio. Se irán ampliando módulo por módulo.

export type Role = 'admin' | 'vendedor' | 'contabilidad'

export interface Profile {
  id: string
  full_name: string
  email?: string 
  role: Role
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TipoCliente = 'mayorista' | 'minorista'

export interface Cliente {
  id: string
  nombre: string
  direccion: string | null
  telefono: string | null
  tipo_cliente: TipoCliente
  limite_credito: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface Proveedor {
  id: string
  nombre: string
  direccion: string | null
  telefono: string | null
  email: string | null
  nit: string | null
  is_active: boolean
  created_at: string
}

export interface Categoria {
  id: string
  nombre: string
}

export interface Producto {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  categoria_id: string | null
  unidad: string
  precio_compra: number
  precio_mayorista: number | null
  precio_minorista: number | null
  stock: number
  stock_minimo: number
  is_active: boolean
  pendiente_precio: boolean
  created_by: string | null
  created_at: string
}

export type EstadoVenta = 'pagada' | 'pendiente' | 'parcial' | 'anulada'
export type TipoVenta = 'contado' | 'credito'
export type MetodoPago = 'efectivo' | 'qr'

export interface Venta {
  id: string
  cliente_id: string
  fecha: string
  tipo_venta: TipoVenta
  metodo_pago: MetodoPago | null
  estado: EstadoVenta
  total: number
  saldo_pendiente: number
  usuario_id: string
  anulado_por: string | null
  anulado_at: string | null
  created_at: string
}

export interface VentaDetalle {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface PagoVenta {
  id: string
  venta_id: string
  fecha: string
  monto: number
  metodo_pago: MetodoPago
  usuario_id: string
  created_at: string
}

export type EstadoCotizacion = 'vigente' | 'convertida' | 'vencida' | 'anulada'

export interface Cotizacion {
  id: string
  cliente_id: string
  fecha: string
  estado: EstadoCotizacion
  total: number
  venta_id: string | null
  created_by: string
}

export type EstadoCompra = 'activa' | 'anulada'

export interface Compra {
  id: string
  proveedor_id: string
  fecha: string
  numero_documento: string | null
  estado: EstadoCompra
  total: number
  usuario_id: string
  anulado_por: string | null
  anulado_at: string | null
  created_at: string
}

export interface EmpresaConfig {
  id: string
  nombre: string
  logo_url: string | null
  direccion: string | null
  telefono: string | null
  nit: string | null
  moneda: string
  updated_at: string
}
