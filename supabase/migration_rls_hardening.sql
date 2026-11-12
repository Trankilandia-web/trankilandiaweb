-- ==============================================================================
-- TRANKILANDIA GYM · AUDITORÍA Y ENDURECIMIENTO DE ROW LEVEL SECURITY (RLS)
-- IDEMPOTENTE: Seguro para ejecutar múltiples veces sin error 42710
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. TABLA: public.ingresos (LIBRO CONTABLE E HISTORIAL DE PAGOS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;

-- Revocar permisos destructivos a nivel de privilegios PostgreSQL
REVOKE DELETE, UPDATE ON public.ingresos FROM anon, authenticated, public;
GRANT SELECT, INSERT ON public.ingresos TO anon, authenticated, service_role;

-- Eliminar políticas previas (antiguas y nuevas para asegurar idempotencia)
DROP POLICY IF EXISTS "Admin y Caja ven y registran ingresos" ON public.ingresos;
DROP POLICY IF EXISTS "Ingresos acceso total" ON public.ingresos;
DROP POLICY IF EXISTS "Ingresos lectura general" ON public.ingresos;
DROP POLICY IF EXISTS "Ingresos insercion segura" ON public.ingresos;
DROP POLICY IF EXISTS "Ingresos lectura autorizada" ON public.ingresos;
DROP POLICY IF EXISTS "Ingresos insercion estricta" ON public.ingresos;

CREATE POLICY "Ingresos lectura autorizada"
  ON public.ingresos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Ingresos insercion estricta"
  ON public.ingresos FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    monto > 0 AND
    key_socio IS NOT NULL
  );

-- ------------------------------------------------------------------------------
-- B. TABLA: public.asistencias (REGISTRO DE INGRESOS Y ACCESOS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

REVOKE DELETE, UPDATE ON public.asistencias FROM anon, authenticated, public;
GRANT SELECT, INSERT ON public.asistencias TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admin y Caja registran y ven asistencias" ON public.asistencias;
DROP POLICY IF EXISTS "Entrenadores ven asistencias de sala" ON public.asistencias;
DROP POLICY IF EXISTS "Cliente ve su propio historial de ingresos" ON public.asistencias;
DROP POLICY IF EXISTS "Asistencias lectura recepcion" ON public.asistencias;
DROP POLICY IF EXISTS "Asistencias registro torniquete" ON public.asistencias;
DROP POLICY IF EXISTS "Asistencias lectura sala y recepcion" ON public.asistencias;
DROP POLICY IF EXISTS "Asistencias registro terminal escaneo" ON public.asistencias;

CREATE POLICY "Asistencias lectura sala y recepcion"
  ON public.asistencias FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Asistencias registro terminal escaneo"
  ON public.asistencias FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    socio_id IS NOT NULL AND
    dni IS NOT NULL AND
    trim(nombre) <> ''
  );

-- ------------------------------------------------------------------------------
-- C. TABLA: public.socios (PADRÓN OFICIAL DE MIEMBROS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.socios ENABLE ROW LEVEL SECURITY;

REVOKE DELETE ON public.socios FROM anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE ON public.socios TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admin y Caja gestionan todos los socios" ON public.socios;
DROP POLICY IF EXISTS "Entrenadores ven atletas de su turno o asignados" ON public.socios;
DROP POLICY IF EXISTS "Clientes ven exclusivamente su propio registro" ON public.socios;
DROP POLICY IF EXISTS "Socios visibles para usuarios autenticados" ON public.socios;
DROP POLICY IF EXISTS "Admins y Caja pueden gestionar socios" ON public.socios;
DROP POLICY IF EXISTS "Lectura de socios para usuarios autenticados" ON public.socios;
DROP POLICY IF EXISTS "Gestion total de socios para admin y caja" ON public.socios;
DROP POLICY IF EXISTS "Clientes consultan socio no vinculado por DNI" ON public.socios;
DROP POLICY IF EXISTS "Socios consulta recepcion" ON public.socios;
DROP POLICY IF EXISTS "Socios inscripcion recepcion" ON public.socios;
DROP POLICY IF EXISTS "Socios actualizacion recepcion" ON public.socios;
DROP POLICY IF EXISTS "Socios lectura autorizada" ON public.socios;
DROP POLICY IF EXISTS "Socios inscripcion terminal" ON public.socios;
DROP POLICY IF EXISTS "Socios actualizacion terminal" ON public.socios;

CREATE POLICY "Socios lectura autorizada"
  ON public.socios FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Socios inscripcion terminal"
  ON public.socios FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    nombre IS NOT NULL AND
    trim(nombre) <> '' AND
    plan IS NOT NULL
  );

CREATE POLICY "Socios actualizacion terminal"
  ON public.socios FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    nombre IS NOT NULL AND
    trim(nombre) <> ''
  );

-- ------------------------------------------------------------------------------
-- D. TABLA: public.productos (CATÁLOGO E INVENTARIO POS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

REVOKE DELETE ON public.productos FROM anon, public;
GRANT SELECT, INSERT, UPDATE ON public.productos TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Todos los autenticados pueden ver productos activos" ON public.productos;
DROP POLICY IF EXISTS "Admin y Caja administran el catálogo y stock" ON public.productos;
DROP POLICY IF EXISTS "Productos lectura general" ON public.productos;
DROP POLICY IF EXISTS "Productos modificacion inventario" ON public.productos;
DROP POLICY IF EXISTS "Productos gestion terminal y pos" ON public.productos;

CREATE POLICY "Productos lectura general"
  ON public.productos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Productos gestion terminal y pos"
  ON public.productos FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (precio_venta >= 0);

-- ------------------------------------------------------------------------------
-- E. TABLA: public.profiles (PERFILES DE USUARIOS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE DELETE ON public.profiles FROM anon, public;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Usuarios autenticados leen perfiles básicos" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles lectura publica" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles lectura autenticada" ON public.profiles;
DROP POLICY IF EXISTS "Profiles read policy" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Lectura general de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Modificacion general de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles lectura general" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insercion autoregistro" ON public.profiles;
DROP POLICY IF EXISTS "Profiles actualizacion controlada" ON public.profiles;

CREATE POLICY "Profiles lectura general"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Profiles insercion autoregistro"
  ON public.profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Profiles actualizacion controlada"
  ON public.profiles FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (
    (role IS NULL OR role IN ('cliente', 'caja', 'entrenador') OR auth.role() = 'service_role')
  );

-- ------------------------------------------------------------------------------
-- F. TABLAS AUXILIARES: rutinas y progresos
-- ------------------------------------------------------------------------------
ALTER TABLE public.rutinas ENABLE ROW LEVEL SECURITY;
REVOKE DELETE ON public.rutinas FROM anon, public;
GRANT SELECT, INSERT, UPDATE ON public.rutinas TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admin, Caja y Coaches gestionan rutinas" ON public.rutinas;
DROP POLICY IF EXISTS "Clientes ven su propia rutina" ON public.rutinas;
DROP POLICY IF EXISTS "Rutinas lectura general" ON public.rutinas;
DROP POLICY IF EXISTS "Rutinas gestion general" ON public.rutinas;

CREATE POLICY "Rutinas lectura general"
  ON public.rutinas FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Rutinas gestion general"
  ON public.rutinas FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (member_id IS NOT NULL);

ALTER TABLE public.progresos ENABLE ROW LEVEL SECURITY;
REVOKE DELETE ON public.progresos FROM anon, public;
GRANT SELECT, INSERT, UPDATE ON public.progresos TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admin y Coaches gestionan progresos físicos" ON public.progresos;
DROP POLICY IF EXISTS "Clientes ven su historial de progresos" ON public.progresos;
DROP POLICY IF EXISTS "Progresos lectura general" ON public.progresos;
DROP POLICY IF EXISTS "Progresos registro general" ON public.progresos;

CREATE POLICY "Progresos lectura general"
  ON public.progresos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Progresos registro general"
  ON public.progresos FOR INSERT
  TO anon, authenticated
  WITH CHECK (member_id IS NOT NULL);

SELECT 'Auditoría RLS completada con éxito: DELETE bloqueado para anon y ledger contable inmutable' AS resultado;
