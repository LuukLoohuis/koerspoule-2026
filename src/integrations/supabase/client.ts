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

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
