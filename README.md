# Sistema de Ventas — Proyecto completo (todos los módulos)

Stack: React + TypeScript + Vite + React Router + Supabase + Netlify. PWA instalable para Android.

## Qué incluye este paquete

Todos los módulos están implementados y conectados en `App.tsx`:

- **Clientes**: alta/edición (edición solo Admin), creación rápida desde Venta/Cotización.
- **Productos**: alta/edición completa (solo Admin fija precios), creación rápida "pendiente de precio" desde Venta/Compra, categorías.
- **Proveedores**: alta/edición (Admin y Contabilidad).
- **Ventas**: carrito con precio automático según tipo de cliente (mayorista/minorista), contado (efectivo/QR) o crédito, nota de venta imprimible, anulación (solo Admin, revierte stock y caja), registro de abonos a crédito (Admin/Contabilidad).
- **Cotizaciones**: carrito igual a Ventas, conversión a venta, anulación.
- **Compras**: carrito con precio de compra editable (actualiza el costeo del producto), anulación (solo Admin).
- **Inventario**: listado con alerta de stock bajo, kardex por producto, ajustes manuales con motivo.
- **Caja**: saldo actual, movimientos filtrables por fecha, ingresos/egresos manuales.
- **Reportes**: ventas, ingresos/egresos, inventario actual, kardex por producto, cuentas por cobrar — todos imprimibles.
- **Configuración**: datos de la empresa (con logo vía Supabase Storage), gestión de usuarios (crear/activar/cambiar rol), respaldo a Excel (.xlsx).

## ⚠️ Paso obligatorio antes de usar esta versión

Este paquete agrega **3 funciones SQL nuevas** al final de `supabase/schema.sql` (sección "6. FUNCIONES RPC ADICIONALES"), necesarias para que Ventas/Compras/Inventario funcionen correctamente respetando los roles:

- `registrar_movimiento_inventario` — permite que Vendedores descuenten stock al vender (sin poder editar el producto directamente, que sigue restringido a Admin).
- `actualizar_precio_compra` — permite que Admin/Contabilidad actualicen el costo del producto al comprar.
- `registrar_pago_venta` — permite que Admin/Contabilidad registren abonos a crédito.

**Si tu base de datos ya tenía el `schema.sql` anterior ejecutado**, solo necesitas correr la sección nueva (puedes copiar desde el comentario `-- 6. FUNCIONES RPC ADICIONALES` hasta el final del archivo) en el SQL Editor de Supabase. Si es una base nueva, corre el archivo completo una sola vez.

## Otros pasos manuales (sin cambios respecto al paso anterior)

1. Bucket de Storage `company-assets` (público para lectura del logo), si aún no existe.
2. Primer usuario Administrador creado manualmente en `Authentication → Add user`, con:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid-del-usuario>';
   ```
3. Variables de entorno (`.env` local y en Netlify): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Este zip **no incluye tu `.env` real** (por seguridad) — usa el que ya tienes localmente, o `.env.example` como plantilla.

## Simplificaciones conocidas (léelas antes de probar en producción)

- Las operaciones de venta/compra (descontar stock, mover caja, etc.) se hacen como varias llamadas secuenciales desde el cliente, no como una transacción SQL atómica — es una limitación aceptada al no usar backend propio ni Edge Functions. En el uso normal (un usuario a la vez) no debería causar problemas; en alta concurrencia podría dejar un paso a medias si la conexión se corta a mitad de una operación.
- El respaldo a Excel exporta clientes, proveedores, productos, ventas, compras y caja; no incluye aún una función de **importación** (restauración) — quedó pendiente para un siguiente paso si la necesitas.
- El campo "moneda" de la configuración de empresa se guarda, pero el formato de moneda en pantalla (`Bs`, símbolo boliviano) está fijo en el código; cambiarlo dinámicamente según ese campo es un ajuste menor pendiente.
- No se implementó "editar cliente/producto desde su propia página de detalle" con URL propia — la edición se hace por modal desde el listado.

## Despliegue

Conecta el repositorio a Netlify (build command `npm run build`, publish directory `dist`) o sube este proyecto directamente. Corre `npm install` (esta versión agrega la dependencia `xlsx` para el respaldo) y luego `npm run build` para verificar que compila antes de desplegar.
