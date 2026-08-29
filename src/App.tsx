import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RoleRoute from '@/routes/RoleRoute'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import ModuloPendiente from '@/pages/ModuloPendiente'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Rutas que requieren sesión iniciada */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Ventas — admin y vendedor */}
          <Route element={<RoleRoute allowed={['admin', 'vendedor']} />}>
            <Route path="/ventas" element={<ModuloPendiente titulo="Ventas" />} />
            <Route path="/ventas/nueva" element={<ModuloPendiente titulo="Nueva venta" />} />
            <Route path="/ventas/:id" element={<ModuloPendiente titulo="Detalle de venta" />} />
            <Route path="/ventas/:id/pagos" element={<ModuloPendiente titulo="Pagos de venta" />} />
          </Route>

          {/* Cotizaciones — todos los roles autenticados */}
          <Route path="/cotizaciones" element={<ModuloPendiente titulo="Cotizaciones" />} />
          <Route path="/cotizaciones/nueva" element={<ModuloPendiente titulo="Nueva cotización" />} />
          <Route path="/cotizaciones/:id" element={<ModuloPendiente titulo="Detalle de cotización" />} />

          {/* Clientes — todos los roles autenticados */}
          <Route path="/clientes" element={<ModuloPendiente titulo="Clientes" />} />
          <Route path="/clientes/nuevo" element={<ModuloPendiente titulo="Nuevo cliente" />} />
          <Route path="/clientes/:id" element={<ModuloPendiente titulo="Detalle de cliente" />} />
          <Route path="/clientes/:id/cuenta" element={<ModuloPendiente titulo="Cuenta del cliente" />} />

          {/* Productos — todos los roles autenticados */}
          <Route path="/productos" element={<ModuloPendiente titulo="Productos" />} />
          <Route path="/productos/nuevo" element={<ModuloPendiente titulo="Nuevo producto" />} />
          <Route path="/productos/:id" element={<ModuloPendiente titulo="Detalle de producto" />} />

          {/* Compras — admin y contabilidad */}
          <Route element={<RoleRoute allowed={['admin', 'contabilidad']} />}>
            <Route path="/compras" element={<ModuloPendiente titulo="Compras" />} />
            <Route path="/compras/nueva" element={<ModuloPendiente titulo="Nueva compra" />} />
            <Route path="/compras/:id" element={<ModuloPendiente titulo="Detalle de compra" />} />
            <Route path="/proveedores" element={<ModuloPendiente titulo="Proveedores" />} />
            <Route path="/proveedores/nuevo" element={<ModuloPendiente titulo="Nuevo proveedor" />} />
            <Route path="/proveedores/:id" element={<ModuloPendiente titulo="Detalle de proveedor" />} />
            <Route path="/inventario" element={<ModuloPendiente titulo="Inventario" />} />
            <Route path="/inventario/kardex" element={<ModuloPendiente titulo="Kardex" />} />
            <Route path="/inventario/kardex/:productoId" element={<ModuloPendiente titulo="Kardex de producto" />} />
            <Route path="/inventario/ajuste" element={<ModuloPendiente titulo="Ajuste de inventario" />} />
            <Route path="/caja" element={<ModuloPendiente titulo="Caja" />} />
            <Route path="/caja/movimientos" element={<ModuloPendiente titulo="Movimientos de caja" />} />
            <Route path="/caja/nuevo-ingreso" element={<ModuloPendiente titulo="Nuevo ingreso" />} />
            <Route path="/caja/nuevo-egreso" element={<ModuloPendiente titulo="Nuevo egreso" />} />
            <Route path="/reportes" element={<ModuloPendiente titulo="Reportes" />} />
            <Route path="/reportes/ventas" element={<ModuloPendiente titulo="Reporte de ventas" />} />
            <Route path="/reportes/ingresos" element={<ModuloPendiente titulo="Reporte de ingresos" />} />
            <Route path="/reportes/egresos" element={<ModuloPendiente titulo="Reporte de egresos" />} />
            <Route path="/reportes/inventario" element={<ModuloPendiente titulo="Reporte de inventario" />} />
            <Route path="/reportes/kardex" element={<ModuloPendiente titulo="Reporte de kardex" />} />
            <Route path="/reportes/cuentas-por-cobrar" element={<ModuloPendiente titulo="Cuentas por cobrar" />} />
          </Route>

          {/* Configuración, usuarios y anulaciones — solo admin */}
          <Route element={<RoleRoute allowed={['admin']} />}>
            <Route path="/ventas/:id/anular" element={<ModuloPendiente titulo="Anular venta" />} />
            <Route path="/compras/:id/anular" element={<ModuloPendiente titulo="Anular compra" />} />
            <Route path="/configuracion/empresa" element={<ModuloPendiente titulo="Configuración de empresa" />} />
            <Route path="/configuracion/usuarios" element={<ModuloPendiente titulo="Usuarios" />} />
            <Route path="/configuracion/usuarios/nuevo" element={<ModuloPendiente titulo="Nuevo usuario" />} />
            <Route path="/configuracion/respaldo" element={<ModuloPendiente titulo="Respaldo y restauración" />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
