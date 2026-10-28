import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
 * Closes current active session
 */
export const signOut = async () => {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }
  return await supabase.auth.signOut();
};
