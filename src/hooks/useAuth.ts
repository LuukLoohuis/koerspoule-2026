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

function raceFallback<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch(() => { clearTimeout(timer); resolve(fallback); });
  });
}

async function fetchRole(userId: string): Promise<AppRole> {
  if (!supabase) return "user";
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return "user";
  return (data as { is_admin?: boolean }).is_admin ? "admin" : "user";
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

    let mounted = true;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        const user = session?.user ?? null;

        if (mounted) {
          setState({ user, session, loading: false, role: "user" });
        }

        if (user && mounted) {
          const role = await raceFallback(fetchRole(user.id), 4000, "user" as AppRole);
          if (mounted) setState((prev) => ({ ...prev, role }));
        }
      } catch {
        if (mounted) {
          setState({ user: null, session: null, loading: false, role: "user" });
        }
      }
    };

    load();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null;

        if (mounted) {
          setState({ user, session, loading: false, role: "user" });
        }

        if (user && mounted) {
          const role = await raceFallback(fetchRole(user.id), 4000, "user" as AppRole);
          if (mounted) setState((prev) => ({ ...prev, role }));
        }
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}
