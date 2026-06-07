import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

/**
 * Cached `is_admin` check — draait 1× per ingelogde sessie.
 * Voorkomt RPC-storm op de DB. Invalideer bij logout via queryKey ['isAdmin'].
 */
export function useIsAdmin() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["isAdmin", userId],
    queryFn: async () => {
      if (!supabase) return false;
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return Boolean(data);
    },
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  return { isAdmin: Boolean(data), isLoading };
}
