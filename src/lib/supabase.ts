// Re-export the auto-generated Lovable Cloud client so existing imports
// (`@/lib/supabase`) keep working across the codebase.
import { supabase as cloudClient } from "@/integrations/supabase/client";

export const supabase = cloudClient;
export const hasSupabaseConfig = true;

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL ?? "",
  hasAnonKey: true,
  looksPlaceholder: false,
};
