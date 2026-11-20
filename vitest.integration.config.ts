import { defineConfig } from 'vitest/config';

// Integration is a separate, deliberate command and can only reach a local
// Supabase installation. Never infer a target from the app's .env file.
const url = process.env.TEST_SUPABASE_URL || '';
let target: URL;
try { target = new URL(url); } catch { throw new Error('Define TEST_SUPABASE_URL apuntando a Supabase local para ejecutar integración.'); }
if (target.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname)) {
  throw new Error('TEST_TARGET_BLOCKED: integración solo admite Supabase local (http://127.0.0.1:54321).');
}
if (!process.env.TEST_SUPABASE_ANON_KEY) throw new Error('Define TEST_SUPABASE_ANON_KEY para tu instancia local.');
if (!process.env.TEST_SUPABASE_SERVICE_ROLE_KEY) throw new Error('Define TEST_SUPABASE_SERVICE_ROLE_KEY local para crear y limpiar fixtures sintéticos.');

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/tests/setupIntegration.ts'],
    include: ['src/tests/integration/**/*.test.ts'],
    fileParallelism: false,
    env: {
      VITE_SUPABASE_URL: target.origin,
      VITE_SUPABASE_ANON_KEY: process.env.TEST_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_URL: '', SUPABASE_ANON_KEY: '',
    },
  },
});
