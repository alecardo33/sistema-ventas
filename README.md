# Sistema de Ventas — Base del proyecto (Paso 1 de implementación)

Stack: React + TypeScript + Vite + React Router + Supabase + Netlify. PWA instalable para Android.

## Qué incluye este paso

- Estructura completa de carpetas (`src/lib`, `types`, `hooks`, `routes`, `components`, `pages`).
- Cliente de Supabase principal (`src/lib/supabaseClient.ts`).
- Segundo cliente de Supabase exclusivo para creación de usuarios desde el panel admin, con `persistSession: false` (`src/lib/supabaseAdminClient.ts`).
- Autenticación completa: `AuthProvider`/`useAuth`, login funcional contra Supabase Auth.
- Enrutamiento completo de la Fase 2 (todas las rutas acordadas), protegido por sesión (`ProtectedRoute`) y por rol (`RoleRoute`).
- Layout con sidebar dinámico según el rol del usuario (desktop y menú móvil para Android).
- SQL completo (`supabase/schema.sql`): tablas, relaciones, índices, trigger de `profiles`, función `current_role()` y políticas RLS para todo el modelo, incluyendo créditos, anulaciones y cotizaciones.
- `netlify.toml` y `public/_redirects` para que el ruteo de React Router funcione al refrescar cualquier URL.
- PWA configurada (`vite-plugin-pwa`) para instalación en Android.
- `.env.example` y `.gitignore` ya preparados.

## Pendiente (próximos pasos, uno por uno)

Cada módulo se implementará por separado en los siguientes mensajes:

1. Módulo Clientes (CRUD + crear cliente desde venta).
2. Módulo Productos (CRUD + crear producto desde venta/compra + reglas de precio).
3. Módulo Ventas (carrito, contado/crédito, pagos, nota de venta imprimible, anulación).
4. Módulo Cotizaciones (crear, convertir a venta).
5. Módulo Compras + Proveedores (incluye anulación).
6. Inventario + Kardex.
7. Caja (ingresos/egresos, ligados a ventas/compras/pagos).
8. Reportes (ventas, ingresos, egresos, inventario, kardex, cuentas por cobrar).
9. Configuración de empresa (logo vía Storage, moneda, datos fiscales del comprobante).
10. Panel de Administrador: creación de usuarios (segundo cliente + `signUp`), edición de roles.
11. Respaldo/restauración a Excel.

## Configuración inicial en Supabase (pasos manuales únicos)

1. Crear el proyecto en Supabase.
2. Ejecutar **una sola vez** todo el contenido de `supabase/schema.sql` en el SQL Editor.
3. Crear el bucket de Storage `company-assets` (público para lectura del logo).
4. Crear el primer usuario administrador manualmente: `Authentication → Add user`.
5. Ejecutar una sola vez:
   ```sql
   update public.profiles set role = 'admin' where id = '<uuid-del-usuario-creado>';
   ```
6. Copiar la URL del proyecto y la `anon key` a un archivo `.env` (basado en `.env.example`) y configurarlas también como variables de entorno en Netlify.

## Despliegue

Conecta el repositorio a Netlify (build command `npm run build`, publish directory `dist`). Todo el testing funcional se hace en la URL pública de Netlify, no localmente.
