# Configuración de cuentas y permisos

La aplicación requiere una sesión real de Supabase Auth. Las cuentas deben existir antes del ingreso. No se crean cuentas al conocer un DNI, no se concede administración por correo y no se restauran permisos desde el almacenamiento del navegador.

## Preparar el servidor

1. Respaldar y revisar los datos existentes en un entorno de pruebas. Sobre el esquema existente, aplicar primero `supabase/migration_security_consistency.sql`; después `supabase/migration_pos_consistency.sql` y `supabase/migration_enrollment_consistency.sql`. Las dos últimas dependen de los permisos de la primera. Esta entrega no ejecuta SQL remoto.
2. Revisar todas las cuentas con `profiles.role` distinto de `cliente`. Las migraciones antiguas permitían asignar privilegios por patrones de correo; la migración correctiva elimina esos mecanismos futuros, pero la legitimidad de los roles existentes requiere revisión de gerencia.
3. Crear o invitar las cuentas desde un backend de confianza o el panel de Supabase Auth. Verificar la identidad antes de asignar permisos. Los socios que usan DNI ingresan con una cuenta de correo interno `DNI@socio.trankilandia.pe`, con contraseña privada; el DNI nunca debe utilizarse como prueba de identidad o contraseña pública de aprovisionamiento.
4. Asignar `profiles.role` mediante el backend: `cliente`, `caja`, `entrenador` o `admin`. El navegador solo puede actualizar nombre y avatar de su perfil. Gerencia puede cambiar roles mediante la RPC `cambiar_rol_usuario`, que comprueba el rol de administrador en el servidor y evita retirar sus propios permisos.
5. Vincular cada socio a su cuenta con `socios.user_id = auth.users.id` después de comprobar titularidad. Las RPC antiguas de vinculación por DNI son exclusivas del backend (`service_role`). La clave de servicio nunca debe incluirse en Vite ni distribuirse en la aplicación.

## Vincular personal

Cada registro de `personal` debe tener un `auth_user_id` único que apunte al UUID exacto de su cuenta en Auth. La cuenta debe tener rol `admin` para personal `admin`, o `caja` para personal `cajero`.

Ejemplo para ejecutar únicamente en el servidor, sustituyendo ambos valores por identificadores previamente verificados:

```sql
begin;
update public.profiles
set role = 'caja', updated_at = now()
where id = '00000000-0000-0000-0000-000000000001';
update public.personal
set auth_user_id = '00000000-0000-0000-0000-000000000001', updated_at = now()
where id = 'staff-identificador-verificado';
commit;
```

Rotar los PIN heredados que figuraban en semillas antiguas antes de habilitar el acceso. Los PIN se almacenan exclusivamente como hashes bcrypt; no se devuelven al navegador. La verificación bloquea el perfil durante 15 minutos después de cinco errores y bloquea la fila durante cada comprobación para evitar carreras.

El acceso a la terminal comienza con correo y contraseña de una cuenta autorizada. El PIN confirma el perfil del turno dentro de esa misma identidad, sin emitir una sesión ficticia. Una cuenta sin vínculo queda bloqueada con un mensaje de configuración pendiente. Crear personal desde la interfaz crea el perfil; gerencia aún debe provisionar y vincular su cuenta Auth en el servidor.

Archivar un socio utiliza `archivar_socio_seguro`, exclusiva para administradores. Marca `socios.archivado_en` y oculta el registro de las consultas operativas mediante RLS, conservando asistencias, ventas, cuenta y libro contable. No se ejecutan borrados en cascada desde la aplicación.

Para cambiar de persona se cierra la sesión y se ingresa con la cuenta de la nueva persona. El selector de perfiles no puede elevar privilegios ni autorizar otro UUID mediante PIN. Los permisos de POS, cobros y renovaciones se comprueban también en el servidor mediante RLS.

## Contraseñas y comprobación

Cambiar una contraseña exige la clave actual y reautenticación de la misma identidad. La sesión existente debe corresponder al DNI solicitado. No se guardan claves en localStorage. Si se olvidó la contraseña, recepción debe usar un proceso de recuperación de Auth que compruebe titularidad; no basta con conocer el DNI.

La autoedición utiliza `actualizar_mi_socio`, que exige un `socios.user_id` propio y permite únicamente nombre, teléfono, correo de contacto, edad, género y observaciones. No modifica DNI, vínculo Auth, permisos, documentos ni datos financieros. Las cachés de perfil se actualizan después de recibir la fila confirmada del servidor.

Antes de publicar, comprobar en una base de pruebas: anónimo sin lectura del padrón ni escrituras, socio con lectura exclusiva de sus registros, caja con operaciones POS/cobros, administrador con permisos de gerencia, PIN incorrecto y conexión interrumpida sin acceso, y cambio de cuenta sin permisos residuales. La corrección local no sustituye aplicar y verificar la migración en el entorno de destino.
