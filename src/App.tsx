import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@/routes/ProtectedRoute'
import RoleRoute from '@/routes/RoleRoute'
import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'

import ClientesPage from '@/pages/clientes'
import ProductosPage from '@/pages/productos'
import ProveedoresPage from '@/pages/proveedores'
import { VentasPage, NuevaVentaPage, VentaDetallePage } from '@/pages/ventas'
import { CotizacionesPage, NuevaCotizacionPage, CotizacionDetallePage } from '@/pages/cotizaciones'
import { ComprasPage, NuevaCompraPage, CompraDetallePage } from '@/pages/compras'
import { InventarioPage, KardexSelectorPage, KardexPage, AjusteInventarioPage } from '@/pages/inventario'
import { CajaPage } from '@/pages/caja'
import {
  ReportesPage,
  ReporteVentasPage,
  ReporteCajaPage,
  ReporteInventarioPage,
  ReporteKardexPage,
  ReporteCuentasPorCobrarPage,
} from '@/pages/reportes'
import { EmpresaPage, UsuariosPage, NuevoUsuarioPage } from '@/pages/configuracion'

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
            <Route path="/ventas" element={<VentasPage />} />
            <Route path="/ventas/nueva" element={<NuevaVentaPage />} />
          </Route>
          {/* Detalle de venta — también visible para Contabilidad (registrar pagos) */}
          <Route element={<RoleRoute allowed={['admin', 'vendedor', 'contabilidad']} />}>
            <Route path="/ventas/:id" element={<VentaDetallePage />} />
          </Route>

          {/* Cotizaciones — todos los roles autenticados */}
          <Route path="/cotizaciones" element={<CotizacionesPage />} />
          <Route path="/cotizaciones/nueva" element={<NuevaCotizacionPage />} />
          <Route path="/cotizaciones/:id" element={<CotizacionDetallePage />} />

          {/* Clientes y Productos — todos los roles autenticados */}
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/productos" element={<ProductosPage />} />

          {/* Compras, Proveedores, Inventario, Caja, Reportes — admin y contabilidad */}
          <Route element={<RoleRoute allowed={['admin', 'contabilidad']} />}>
            <Route path="/compras" element={<ComprasPage />} />
            <Route path="/compras/nueva" element={<NuevaCompraPage />} />
            <Route path="/compras/:id" element={<CompraDetallePage />} />
            <Route path="/proveedores" element={<ProveedoresPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/inventario/kardex" element={<KardexSelectorPage />} />
            <Route path="/inventario/kardex/:productoId" element={<KardexPage />} />
            <Route path="/inventario/ajuste" element={<AjusteInventarioPage />} />
            <Route path="/caja" element={<CajaPage />} />
            <Route path="/caja/movimientos" element={<Navigate to="/caja" replace />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/reportes/ventas" element={<ReporteVentasPage />} />
            <Route path="/reportes/caja" element={<ReporteCajaPage />} />
            <Route path="/reportes/inventario" element={<ReporteInventarioPage />} />
            <Route path="/reportes/kardex" element={<ReporteKardexPage />} />
            <Route path="/reportes/cuentas-por-cobrar" element={<ReporteCuentasPorCobrarPage />} />
          </Route>

          {/* Configuración y usuarios — solo admin */}
          <Route element={<RoleRoute allowed={['admin']} />}>
            <Route path="/configuracion/empresa" element={<EmpresaPage />} />
            <Route path="/configuracion/usuarios" element={<UsuariosPage />} />
            <Route path="/configuracion/usuarios/nuevo" element={<NuevoUsuarioPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}