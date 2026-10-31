-- ==============================================================================
-- ASIGNAR PRIVILEGIOS DE ADMINISTRADOR A MARISOL FLORES
-- Archivo: supabase/migration_add_admin_marisol.sql
-- Ejecutar en el SQL Editor de Supabase (https://app.supabase.com)
-- ==============================================================================

-- 1. Si Marisol Flores ya tiene una cuenta creada en auth.users, actualizar su perfil a 'admin'
INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role,
  membership_status,
  updated_at
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', 'Marisol Flores'),
  'admin',
  'activo',
  now()
FROM auth.users
WHERE lower(email) = 'marisolflores@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin',
  updated_at = now();

-- 2. Asegurar que ante cualquier nuevo inicio de sesión o registro con este correo, el rol sea 'admin'
CREATE OR REPLACE FUNCTION public.handle_admin_marisol_flores()
RETURNS trigger AS $$
BEGIN
  IF lower(NEW.email) = 'marisolflores@gmail.com' THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      membership_status,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', 'Marisol Flores'),
      'admin',
      'activo',
      now()
    )
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_admin_marisol_flores ON auth.users;
CREATE TRIGGER trg_admin_marisol_flores
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_admin_marisol_flores();
