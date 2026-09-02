-- =====================================================================
-- SISTEMA DE VENTAS — SQL COMPLETO PARA SUPABASE
-- Ejecutar UNA SOLA VEZ en el SQL Editor de Supabase, en orden.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONES
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'vendedor' check (role in ('admin','vendedor','contabilidad')),
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists empresa_config (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default '',
  logo_url text,
  direccion text,
  telefono text,
  nit text,
  moneda text not null default 'BOB',
  updated_at timestamptz not null default now()
);

create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  telefono text,
  tipo_cliente text not null default 'minorista' check (tipo_cliente in ('mayorista','minorista')),
  limite_credito numeric(12,2),
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  telefono text,
  email text,
  nit text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  categoria_id uuid references categorias(id),
  unidad text not null default 'unidad',
  precio_compra numeric(12,2) not null default 0,
  precio_mayorista numeric(12,2),
  precio_minorista numeric(12,2),
  stock numeric(12,2) not null default 0,
  stock_minimo numeric(12,2) not null default 0,
  is_active boolean not null default true,
  pendiente_precio boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists cotizaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  fecha timestamptz not null default now(),
  estado text not null default 'vigente' check (estado in ('vigente','convertida','vencida','anulada')),
  total numeric(12,2) not null default 0,
  venta_id uuid,
  created_by uuid references profiles(id)
);

create table if not exists cotizacion_detalles (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references cotizaciones(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad numeric(12,2) not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

create table if not exists ventas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id),
  fecha timestamptz not null default now(),
  tipo_venta text not null default 'contado' check (tipo_venta in ('contado','credito')),
  metodo_pago text check (metodo_pago in ('efectivo','qr')),
  estado text not null default 'pagada' check (estado in ('pagada','pendiente','parcial','anulada')),
  total numeric(12,2) not null default 0,
  saldo_pendiente numeric(12,2) not null default 0,
  usuario_id uuid not null references profiles(id),
  anulado_por uuid references profiles(id),
  anulado_at timestamptz,
  created_at timestamptz not null default now()
);

alter table cotizaciones
  add constraint cotizaciones_venta_id_fkey foreign key (venta_id) references ventas(id);

create table if not exists venta_detalles (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad numeric(12,2) not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

create table if not exists pagos_venta (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  fecha timestamptz not null default now(),
  monto numeric(12,2) not null check (monto > 0),
  metodo_pago text not null check (metodo_pago in ('efectivo','qr')),
  usuario_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists compras (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id),
  fecha timestamptz not null default now(),
  numero_documento text,
  estado text not null default 'activa' check (estado in ('activa','anulada')),
  total numeric(12,2) not null default 0,
  usuario_id uuid not null references profiles(id),
  anulado_por uuid references profiles(id),
  anulado_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists compra_detalles (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references compras(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad numeric(12,2) not null check (cantidad > 0),
  precio_compra numeric(12,2) not null,
  subtotal numeric(12,2) not null
);

create table if not exists movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id),
  tipo text not null check (tipo in ('compra','venta','ajuste','anulacion_compra','anulacion_venta')),
  entrada numeric(12,2) not null default 0,
  salida numeric(12,2) not null default 0,
  saldo numeric(12,2) not null,
  documento_ref uuid,
  usuario_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso','egreso')),
  origen text not null check (origen in ('venta','compra','pago_credito','anulacion','manual')),
  documento_ref uuid,
  concepto text not null default '',
  monto numeric(12,2) not null check (monto >= 0),
  usuario_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. ÍNDICES
-- ---------------------------------------------------------------------
create index if not exists idx_ventas_cliente on ventas(cliente_id);
create index if not exists idx_ventas_fecha on ventas(fecha);
create index if not exists idx_compras_proveedor on compras(proveedor_id);
create index if not exists idx_mov_inv_producto_fecha on movimientos_inventario(producto_id, created_at);
create index if not exists idx_mov_caja_fecha on movimientos_caja(created_at);
create index if not exists idx_productos_codigo on productos(codigo);

-- ---------------------------------------------------------------------
-- 3. TRIGGER: crear profile automáticamente al registrar un usuario
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'vendedor');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. FUNCIÓN AUXILIAR: rol del usuario autenticado actual
-- ---------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table profiles enable row level security;
alter table empresa_config enable row level security;
alter table categorias enable row level security;
alter table clientes enable row level security;
alter table proveedores enable row level security;
alter table productos enable row level security;
alter table cotizaciones enable row level security;
alter table cotizacion_detalles enable row level security;
alter table ventas enable row level security;
alter table venta_detalles enable row level security;
alter table pagos_venta enable row level security;
alter table compras enable row level security;
alter table compra_detalles enable row level security;
alter table movimientos_inventario enable row level security;
alter table movimientos_caja enable row level security;

-- PROFILES ------------------------------------------------------------
create policy "profiles_select_authenticated" on profiles
  for select using (auth.uid() is not null);

create policy "profiles_update_self_no_role_change" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));

create policy "profiles_admin_all" on profiles
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- EMPRESA_CONFIG --------------------------------------------------------
create policy "empresa_config_select_authenticated" on empresa_config
  for select using (auth.uid() is not null);

create policy "empresa_config_admin_write" on empresa_config
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- CATEGORIAS ------------------------------------------------------------
create policy "categorias_select_authenticated" on categorias
  for select using (auth.uid() is not null);
create policy "categorias_write_admin_contabilidad" on categorias
  for all using (public.current_role() in ('admin','contabilidad'))
  with check (public.current_role() in ('admin','contabilidad'));

-- CLIENTES ------------------------------------------------------------
create policy "clientes_select_authenticated" on clientes
  for select using (auth.uid() is not null);
create policy "clientes_insert_authenticated" on clientes
  for insert with check (auth.uid() is not null);
create policy "clientes_update_admin" on clientes
  for update using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- PROVEEDORES -----------------------------------------------------------
create policy "proveedores_select_authenticated" on proveedores
  for select using (auth.uid() is not null);
create policy "proveedores_write_admin_contabilidad" on proveedores
  for all using (public.current_role() in ('admin','contabilidad'))
  with check (public.current_role() in ('admin','contabilidad'));

-- PRODUCTOS ------------------------------------------------------------
create policy "productos_select_authenticated" on productos
  for select using (auth.uid() is not null);

create policy "productos_insert_authenticated" on productos
  for insert with check (auth.uid() is not null);

-- Solo admin puede modificar precios / datos existentes de un producto.
create policy "productos_update_admin" on productos
  for update using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- COTIZACIONES ----------------------------------------------------------
create policy "cotizaciones_select_authenticated" on cotizaciones
  for select using (auth.uid() is not null);
create policy "cotizaciones_insert_authenticated" on cotizaciones
  for insert with check (auth.uid() is not null and created_by = auth.uid());
create policy "cotizaciones_update_owner_or_admin" on cotizaciones
  for update using (created_by = auth.uid() or public.current_role() = 'admin');

create policy "cotizacion_detalles_select_authenticated" on cotizacion_detalles
  for select using (auth.uid() is not null);
create policy "cotizacion_detalles_insert_authenticated" on cotizacion_detalles
  for insert with check (auth.uid() is not null);

-- VENTAS ------------------------------------------------------------
-- Todos los autenticados pueden ver ventas (reportes); el filtrado de
-- "solo sus ventas" para vendedores, si se requiere, se aplica en la
-- consulta desde el frontend además de esta política base.
create policy "ventas_select_authenticated" on ventas
  for select using (auth.uid() is not null);

create policy "ventas_insert_authenticated" on ventas
  for insert with check (auth.uid() is not null and usuario_id = auth.uid());

-- Un vendedor NO puede modificar una venta ya registrada (ni la suya).
-- Solo el Administrador puede actualizar ventas (incluida la anulación).
create policy "ventas_update_admin_only" on ventas
  for update using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "venta_detalles_select_authenticated" on venta_detalles
  for select using (auth.uid() is not null);
create policy "venta_detalles_insert_authenticated" on venta_detalles
  for insert with check (auth.uid() is not null);
-- El detalle de una venta no se edita directamente una vez creado;
-- las anulaciones se manejan a nivel de "ventas.estado" + movimientos.

-- PAGOS_VENTA (abonos a crédito) ----------------------------------------
create policy "pagos_venta_select_authenticated" on pagos_venta
  for select using (auth.uid() is not null);
create policy "pagos_venta_insert_authenticated" on pagos_venta
  for insert with check (auth.uid() is not null and usuario_id = auth.uid());

-- COMPRAS ------------------------------------------------------------
create policy "compras_select_admin_contabilidad" on compras
  for select using (public.current_role() in ('admin','contabilidad'));
create policy "compras_insert_admin_contabilidad" on compras
  for insert with check (public.current_role() in ('admin','contabilidad') and usuario_id = auth.uid());
-- Solo el Administrador anula/edita una compra ya registrada.
create policy "compras_update_admin_only" on compras
  for update using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

create policy "compra_detalles_select_admin_contabilidad" on compra_detalles
  for select using (public.current_role() in ('admin','contabilidad'));
create policy "compra_detalles_insert_admin_contabilidad" on compra_detalles
  for insert with check (public.current_role() in ('admin','contabilidad'));

-- MOVIMIENTOS_INVENTARIO --------------------------------------------------
create policy "mov_inv_select_admin_contabilidad" on movimientos_inventario
  for select using (public.current_role() in ('admin','contabilidad'));
create policy "mov_inv_insert_authenticated" on movimientos_inventario
  for insert with check (auth.uid() is not null and usuario_id = auth.uid());

-- MOVIMIENTOS_CAJA --------------------------------------------------------
create policy "mov_caja_select_admin_contabilidad" on movimientos_caja
  for select using (public.current_role() in ('admin','contabilidad'));
create policy "mov_caja_insert_authenticated" on movimientos_caja
  for insert with check (auth.uid() is not null and usuario_id = auth.uid());
-- Solo admin puede revertir (insertar movimientos tipo "anulacion") datos
-- de otro usuario si fuera necesario; por ahora toda inserción exige
-- usuario_id = auth.uid(), y las anulaciones las ejecuta el propio admin.

-- =====================================================================
-- FIN DEL SCRIPT
-- Recuerda: el primer usuario Administrador se crea manualmente desde
-- Authentication → Add user en el Dashboard de Supabase, y luego debes
-- ejecutar manualmente, una sola vez:
--
--   update public.profiles set role = 'admin' where id = '<uuid-del-usuario>';
-- =====================================================================

-- =====================================================================
-- 6. FUNCIONES RPC ADICIONALES (Paso 2 de implementación)
-- ---------------------------------------------------------------------
-- La política "productos_update_admin" y "ventas_update_admin_only"
-- restringen el UPDATE directo de esas tablas solo a Admin (correcto:
-- así un vendedor nunca puede alterar precios ni ventas ya registradas).
-- Pero un Vendedor SÍ necesita poder descontar stock al vender, y
-- Contabilidad necesita poder actualizar el costo y registrar abonos a
-- crédito. Estas funciones "security definer" abren, de forma controlada
-- y siempre trazada, exactamente esas operaciones puntuales — sin usar
-- service_role ni backend propio.
-- Ejecutar UNA SOLA VEZ, después del script anterior.
-- =====================================================================

create or replace function public.registrar_movimiento_inventario(
  p_producto_id uuid,
  p_tipo text,
  p_entrada numeric,
  p_salida numeric,
  p_documento_ref uuid,
  p_usuario_id uuid
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nuevo_stock numeric;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_usuario_id <> auth.uid() then
    raise exception 'usuario_id debe coincidir con el usuario autenticado';
  end if;
  if p_tipo not in ('compra','venta','ajuste','anulacion_compra','anulacion_venta') then
    raise exception 'Tipo de movimiento inválido';
  end if;

  update productos
    set stock = stock + p_entrada - p_salida
    where id = p_producto_id
    returning stock into v_nuevo_stock;

  if v_nuevo_stock is null then
    raise exception 'Producto no encontrado';
  end if;

  insert into movimientos_inventario (producto_id, tipo, entrada, salida, saldo, documento_ref, usuario_id)
  values (p_producto_id, p_tipo, p_entrada, p_salida, v_nuevo_stock, p_documento_ref, p_usuario_id);

  return v_nuevo_stock;
end;
$$;

grant execute on function public.registrar_movimiento_inventario(uuid, text, numeric, numeric, uuid, uuid) to authenticated;

create or replace function public.actualizar_precio_compra(
  p_producto_id uuid,
  p_precio numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if public.current_role() not in ('admin','contabilidad') then
    raise exception 'No autorizado';
  end if;

  update productos set precio_compra = p_precio where id = p_producto_id;
end;
$$;

grant execute on function public.actualizar_precio_compra(uuid, numeric) to authenticated;

create or replace function public.registrar_pago_venta(
  p_venta_id uuid,
  p_monto numeric,
  p_metodo_pago text,
  p_usuario_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo numeric;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_usuario_id <> auth.uid() then
    raise exception 'usuario_id debe coincidir con el usuario autenticado';
  end if;
  if public.current_role() not in ('admin','contabilidad') then
    raise exception 'No autorizado';
  end if;
  if p_monto <= 0 then
    raise exception 'El monto debe ser mayor a 0';
  end if;

  insert into pagos_venta (venta_id, monto, metodo_pago, usuario_id)
  values (p_venta_id, p_monto, p_metodo_pago, p_usuario_id);

  update ventas
    set saldo_pendiente = greatest(0, saldo_pendiente - p_monto),
        estado = case when greatest(0, saldo_pendiente - p_monto) = 0 then 'pagada' else 'parcial' end
    where id = p_venta_id
    returning saldo_pendiente into v_saldo;

  if v_saldo is null then
    raise exception 'Venta no encontrada';
  end if;
end;
$$;

grant execute on function public.registrar_pago_venta(uuid, numeric, text, uuid) to authenticated;
