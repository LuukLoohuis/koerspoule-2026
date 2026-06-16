import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Env-vars hebben VOORRANG: op Vercel staan VITE_SUPABASE_URL + _ANON_KEY gezet
// (nieuwe Supabase). De fallback hieronder houdt de Lovable-build — die geen
// env-vars meekrijgt — TIJDELIJK in de lucht op het oude project. Zodra Lovable
// niet meer nodig is, mag de fallback eruit (zie git-history / docs/ENV.md).
// De anon-key is publiek (client-side) en veilig om in te bakken.
const FALLBACK_SUPABASE_URL = "https://ivbmlledoamqtzqpcvzl.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2Ym1sbGVkb2FtcXR6cXBjdnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NjgzODQsImV4cCI6MjA5MzE0NDM4NH0.-7GJRDAHcH0rweTsBrLFL5Ro_1MPAsj6Kq0paxUpVfc";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  FALLBACK_SUPABASE_ANON_KEY;

// Import:
//   import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
