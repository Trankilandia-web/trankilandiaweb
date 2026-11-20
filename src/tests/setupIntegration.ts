const localOrigin = new URL(import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321').origin;
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (url.origin !== localOrigin) throw new Error('TEST_TARGET_BLOCKED: integración no puede acceder a servicios remotos.');
  return realFetch(input, { ...init, redirect: 'error' });
}) as typeof fetch;
