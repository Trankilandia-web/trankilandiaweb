# Revisión de interfaz y consistencia

Se conserva la identidad negra y amarilla de Trankilandia. Se simplifican navegación, portada, contacto, formularios y modales, con controles táctiles, foco de teclado, estados de error y vistas estrechas.

## Verificación local

- `npm test`: 31 archivos y 188 pruebas aprobadas, con transporte externo bloqueado.
- `npm run test:e2e`: cinco flujos aprobados en Chromium, sin acceso a servicios remotos: navegación pública, acceso y conservación del formulario, solicitud de cortesía, móvil de 360 px y cuenta del personal.
- `npm run electron:build`: compilación web y empaquetado Windows x64 completados. Instalador: `dist-electron/Trankilandia Hub Setup 1.0.0.exe`. No se configuró un certificado de firma.
- El paquete de escritorio contiene los mismos 18 archivos JavaScript de la compilación final. Se comprobó que el padrón privado no forme parte de los bundles web ni del paquete de escritorio.
- Revisión visual real en navegador: portada, login, recepción y administración, a 360/390 px y escritorio de 1280 px. Las capturas de paneles usan datos ficticios.
- SQL en PostgreSQL 17 temporal: permisos/PIN, transacciones POS, archivo y autoedición de perfil, inscripción y cobro atómicos, reintentos, colisiones, rollback y migraciones repetidas. La instancia de pruebas se detuvo.
- Revisión independiente de autenticación, caja y alta de socios; corregidos los casos de respuesta perdida, renovación de sesión y datos del reintento.

## Activación en el servidor

Las migraciones no se aplicaron a producción. Sobre el esquema existente, aplicar primero `migration_security_consistency.sql` y después `migration_pos_consistency.sql` y `migration_enrollment_consistency.sql`. Revisar la configuración de cuentas y vínculos de identidad en [auth-server-setup.md](auth-server-setup.md).

Las operaciones nuevas requieren las RPC corregidas. Ante una migración ausente o un rechazo del servidor, se muestra un error y se conservan los datos, sin simular un guardado exitoso. Las colas de ventas antiguas requieren conciliación: [pruebas-y-pos.md](pruebas-y-pos.md).

## Alcance de las comprobaciones

No se validaron físicamente instalación, lector, micrófono, impresora ni salida Bluetooth. El audio utiliza el dispositivo predeterminado del sistema. La documentación para tarifas preferenciales se revisa presencialmente; se retiró la carga local que aparentaba una validación digital. Las solicitudes de cortesía y vinculación de cuentas requieren confirmación real de recepción.
