// Service-role client (bypasses RLS). Node.js runtime only, NOT Edge Runtime.
// Do NOT import from middleware or any file middleware imports.
// Use for admin ops (generateLink, cron writes) — keep SUPABASE_SERVICE_KEY server-side only.

import { createClient as createServiceClientBase } from '@supabase/supabase-js';

function sanitizeEnv(v: string | undefined): string {
  if (!v) return '';
  // Strip wrapping quotes AND trailing quote artifacts (some Vercel env values
  // were set with embedded extra " at the end — ".trim()" alone doesn't fix it).
  let out = v.trim();
  while (out.startsWith('"') || out.startsWith("'")) out = out.slice(1);
  while (out.endsWith('"') || out.endsWith("'")) out = out.slice(0, -1);
  return out.trim();
}

export function createServiceClient() {
  const url = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = sanitizeEnv(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  return createServiceClientBase(url, key, {
    auth: { persistSession: false },
    global: {
      // Next.js 14 caches fetch() by default in route handlers; Supabase JS uses fetch().
      // no-store forces fresh DB reads from route handlers.
      fetch: (url: string | URL | Request, init?: RequestInit) =>
        fetch(url, { ...init, cache: 'no-store' }),
    },
  });
}
