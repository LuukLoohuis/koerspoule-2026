import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppRole = "user" | "admin";

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole;
};

async function ensureProfile(user: User) {
  if (!supabase) return;
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: user.user_metadata?.display_name ?? user.email ?? "Gebruiker",
      role: "user",
      is_admin: false,
    },
    { onConflict: "id" }
  );
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    role: "user",
  });

  useEffect(() => {
    if (!supabase) {
      setState({ user: null, session: null, loading: false, role: "user" });
      return;
    }

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const user = session?.user ?? null;
      let role: AppRole = "user";

      if (user) {
        await ensureProfile(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_admin")
          .eq("id", user.id)
          .maybeSingle();
        role = profile?.role === "admin" || profile?.is_admin ? "admin" : "user";
      }

      setState({ user, session, loading: false, role });
    };

    load();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      let role: AppRole = "user";
      if (user) {
        await ensureProfile(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_admin")
          .eq("id", user.id)
          .maybeSingle();
        role = profile?.role === "admin" || profile?.is_admin ? "admin" : "user";
      }
      setState({ user, session, loading: false, role });
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return state;
}
