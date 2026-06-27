import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PromotedSubpoule = { name: string; code: string; promote_text: string | null };

/**
 * Wervings-subpoules voor de homepage. Publiek leesbaar via SECURITY DEFINER-RPC
 * die alleen naam/code/tekst teruggeeft (geen privédata; RLS op subpoules blijft).
 */
export function usePromotedSubpoules() {
  return useQuery({
    queryKey: ["promoted-subpoules"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PromotedSubpoule[]> => {
      if (!supabase) return [];
      const { data, error } = await supabase.rpc("get_promoted_subpoules");
      if (error) throw error;
      return (data ?? []) as PromotedSubpoule[];
    },
  });
}
