// Re-export de Supabase-client zodat bestaande imports (`@/lib/supabase`)
// blijven werken. Config wordt uitsluitend uit env-vars afgeleid — geen
// hardcoded project-verwijzing. Zie docs/ENV.md.
import { supabase as cloudClient } from "@/integrations/supabase/client";

export const supabase = cloudClient;

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseConfig = Boolean(url && anonKey);

export const supabaseConfig = {
  url,
  hasAnonKey: Boolean(anonKey),
  looksPlaceholder: false,
};
