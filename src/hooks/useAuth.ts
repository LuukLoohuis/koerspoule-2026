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

    const resolveRole = async (user: User | null): Promise<AppRole> => {
      if (!user) return "user";
      await ensureProfile(user);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const p = (profile ?? {}) as { role?: string; is_admin?: boolean };
      return p.role === "admin" || Boolean(p.is_admin) ? "admin" : "user";
    };

    const load = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        const user = session?.user ?? null;
        const role = await resolveRole(user);
        setState({ user, session, loading: false, role });
      } catch {
        setState({ user: null, session: null, loading: false, role: "user" });
      }
    };

    load();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const user = session?.user ?? null;
        const role = await resolveRole(user);
        setState({ user, session, loading: false, role });
      } catch {
        setState({ user: null, session: null, loading: false, role: "user" });
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return state;
}
