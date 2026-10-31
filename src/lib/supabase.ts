import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  '';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('tu-proyecto') &&
    !supabaseUrl.includes('your-project')
  );
};

// Fallback dummy URL so createClient does not crash if env vars are missing during early dev
const validUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Initiates Google OAuth Sign-In flow with Supabase
 */
export const signInWithGoogle = async () => {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: new Error('CONFIG_NEEDED: Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env'),
    };
  }

  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
};

/**
 * Signs in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) {
    return {
      data: null,
      error: new Error('CONFIG_NEEDED: Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env'),
    };
  }

  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

/**
 * Inicia sesión exclusivamente con DNI (8 dígitos) y contraseña.
 * Conecta con la cuenta canónica interna: [DNI]@socio.trankilandia.pe
 * Si es el primer ingreso del socio (contraseña = DNI) y su cuenta auth aún no existe,
 * intenta registrarla/aprovisionarla automáticamente.
 */
export const signInWithDni = async (dni: string, password: string) => {
  const cleanDni = dni.trim().replace(/\D/g, '');
  if (cleanDni.length !== 8) {
    return {
      data: null,
      error: new Error('El DNI debe tener exactamente 8 dígitos numéricos.'),
    };
  }

  const canonicalEmail = `${cleanDni}@socio.trankilandia.pe`;

  if (!isSupabaseConfigured()) {
    return {
      data: {
        user: {
          id: `mock-${cleanDni}`,
          email: canonicalEmail,
          user_metadata: { dni: cleanDni, role: 'cliente' },
        } as any,
        session: {} as any,
      },
      error: null,
    };
  }

  // 1. Intentar inicio de sesión tradicional
  let res = await supabase.auth.signInWithPassword({
    email: canonicalEmail,
    password,
  });

  // 2. Si falló y es su primer ingreso con contraseña = DNI
  if (res.error && password === cleanDni) {
    try {
      const signUpRes = await supabase.auth.signUp({
        email: canonicalEmail,
        password: cleanDni,
        options: {
          data: {
            dni: cleanDni,
            role: 'cliente',
          },
        },
      });

      if (!signUpRes.error && signUpRes.data.session) {
        return signUpRes;
      }

      // Reintentar login si el signUp lo provisionó
      if (!signUpRes.error && signUpRes.data.user) {
        res = await supabase.auth.signInWithPassword({
          email: canonicalEmail,
          password: cleanDni,
        });
      }
    } catch {}
  }

  return res;
};

/**
 * Closes current active session
 */
export const signOut = async () => {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }
  return await supabase.auth.signOut();
};
