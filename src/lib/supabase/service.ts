// Service-role client (bypasses RLS). Node.js runtime only, NOT Edge Runtime.
// Do NOT import from middleware or any file middleware imports.
// Use for admin ops (generateLink, cron writes) — keep SUPABASE_SERVICE_KEY server-side only.

import { createClient as createServiceClientBase } from '@supabase/supabase-js';

export function createServiceClient() {
  return createServiceClientBase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    {
      auth: { persistSession: false },
      global: {
        // Next.js 14 caches fetch() by default in route handlers; Supabase JS uses fetch().
        // no-store forces fresh DB reads from route handlers.
        fetch: (url: string | URL | Request, init?: RequestInit) =>
          fetch(url, { ...init, cache: 'no-store' }),
      },
    },
  );
}
