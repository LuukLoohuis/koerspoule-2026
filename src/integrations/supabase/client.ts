import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase-client. Leest UITSLUITEND uit env-vars — geen hardcoded fallback naar
// een oud project. Zie docs/ENV.md voor de benodigde variabelen.
//
// Import:
//   import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// Primair VITE_SUPABASE_ANON_KEY; VITE_SUPABASE_PUBLISHABLE_KEY blijft als alias toegestaan.
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const missing = [
    !SUPABASE_URL && "VITE_SUPABASE_URL",
    !SUPABASE_ANON_KEY && "VITE_SUPABASE_ANON_KEY",
  ]
    .filter(Boolean)
    .join(", ");
  const msg =
    `[Supabase] Ontbrekende env-var(s): ${missing}. ` +
    `Zet ze in .env.local (lokaal) en in Vercel → Settings → Environment Variables. ` +
    `Zie docs/ENV.md.`;
  console.error(msg);
  throw new Error(msg);
}

// SSR/prerender (Node): geen window → géén localStorage. Een no-op storage +
// uitgeschakelde sessie-persistentie voorkomt dat de auth-client tijdens de
// prerender op localStorage probeert te lezen (anders crasht de build).
const isBrowser = typeof window !== "undefined";
const noopStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: isBrowser
    ? {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    : {
        storage: noopStorage,
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
});
