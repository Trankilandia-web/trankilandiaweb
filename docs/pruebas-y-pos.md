# Pruebas aisladas y consistencia POS

`npm test` ejecuta únicamente `src/tests/unit`. Vacía las variables Supabase e intercepta `fetch`, XHR y WebSocket antes de importar los módulos. Las pruebas que simulan servicios deben declarar su mock de transporte explícitamente. Se eliminaron las credenciales de producción incorporadas en el código y las antiguas restauraciones de datos remotos desde los tests.

La integración HTTP se ejecuta deliberadamente con `npx vitest run --config vitest.integration.config.ts`. Requiere una instalación **desechable de Supabase local** con el esquema y las migraciones aplicadas, y estas variables exclusivas para pruebas:

- `TEST_SUPABASE_URL`, por ejemplo `http://127.0.0.1:54321`.
- `TEST_SUPABASE_ANON_KEY`, de esa instancia local.
- `TEST_SUPABASE_SERVICE_ROLE_KEY`, de esa instancia local, para preparar y limpiar fixtures sintéticos.

La configuración rechaza hosts remotos antes de ejecutar tests. La suite crea una cuenta y un socio ficticios y los elimina al finalizar. No utiliza el padrón ni las claves de la aplicación. La clave de servicio nunca se incorpora a Vite ni a una compilación de la app.

`src/tests/integration/posConsistency.sql` verifica la RPC POS en una base PostgreSQL desechable con `schema_production.sql` y `migration_pos_consistency.sql`: idempotencia, total neto, fecha original, validación de stock, rollback y autorización. Se validó además `migration_security_consistency.sql` dos veces, y las restricciones de PIN, perfiles, roles y archivo, en PostgreSQL 17 temporal sobre loopback. No se aplicaron migraciones remotas.

## Antes de habilitar el POS en el servidor

Aplicar, tras revisión y respaldo, `supabase/migration_pos_consistency.sql` junto con el hardening descrito en `docs/auth-server-setup.md`. La nueva aplicación requiere `registrar_venta_pos_v2`; una RPC faltante produce un error visible y conserva el carrito.

Cada operación nueva persiste su UUID, ticket, fecha, cotización y descuento antes del request. Un corte de transporte conserva el cobro pendiente en este equipo; un rechazo SQL no crea una venta offline. Las respuestas ambiguas conservan el mismo ticket y muestran un error: el reintento usa el mismo UUID para evitar duplicar cobros o stock. El servidor calcula precios, registra el ingreso neto y descuenta existencias dentro de una única transacción.

Las ventas de la cola antigua sin `request_version: 2` permanecen disponibles para conciliación manual. No se reproducen automáticamente, porque versiones anteriores podían haber descontado stock remoto antes de encolarlas. Una cotización offline cuyo precio cambió también requiere revisión; nunca se cambia silenciosamente el importe cobrado.
