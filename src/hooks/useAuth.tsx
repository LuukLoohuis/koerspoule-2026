import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AppRole = "user" | "admin";

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole;
};

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  role: "user",
};

const AuthContext = createContext<AuthState>(initialState);

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

  // 1) Primair: user_roles (v3 schema)
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleRow) return "admin";

  return "user";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const mountedRef = useRef(true);
  // Cache role per user.id — voorkomt extra user_roles SELECTs bij elke
  // onAuthStateChange (TOKEN_REFRESHED, USER_UPDATED, etc).
  const roleCacheRef = useRef<Map<string, AppRole>>(new Map());

  useEffect(() => {
    mountedRef.current = true;

    if (!supabase) {
      setState({ user: null, session: null, loading: false, role: "user" });
      return () => { mountedRef.current = false; };
    }

    const sb = supabase;

    const resolveAuthFor = async (session: Session | null) => {
      const user = session?.user ?? null;
      let role: AppRole = "user";
      if (user) {
        const cached = roleCacheRef.current.get(user.id);
        if (cached) {
          role = cached;
        } else {
          role = await raceFallback(fetchRole(user.id), 5000, "user" as AppRole);
          roleCacheRef.current.set(user.id, role);
        }
      }
      if (mountedRef.current) {
        setState({ user, session, loading: false, role });
      }
    };

    // Eerste laad: getSession dan role ophalen
    sb.auth.getSession().then(({ data }) => resolveAuthFor(data.session)).catch(() => {
      if (mountedRef.current) {
        setState({ user: null, session: null, loading: false, role: "user" });
      }
    });

    // Subscribe op auth changes — cache zorgt dat we user_roles niet opnieuw
    // bevragen bij token-refresh of andere niet-relevante events.
    const { data: subscription } = sb.auth.onAuthStateChange((event, session) => {
      // Wis cache bij logout zodat een volgende inlog vers ophaalt
      if (event === "SIGNED_OUT") roleCacheRef.current.clear();
      resolveAuthFor(session);
    });

    return () => {
      mountedRef.current = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
