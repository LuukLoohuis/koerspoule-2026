import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user?.id && supabase),
    queryFn: async () => {
      if (!supabase || !user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, role, is_admin, created_at")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
