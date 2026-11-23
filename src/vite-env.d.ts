/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  electronAPI?: {
    isElectron?: boolean;
    platform?: string;
    duckBackgroundAudio?: (level: number) => Promise<{ ok: boolean; output?: string; error?: string }>;
    unduckBackgroundAudio?: () => Promise<{ ok: boolean; output?: string; error?: string }>;
  };
}
