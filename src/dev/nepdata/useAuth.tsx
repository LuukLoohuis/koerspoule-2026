/**
 * Nep-inlog voor testbanken (zie vite.nepdata.config.ts): altijd ingelogd als
 * een gewone deelnemer. Zelfde exports als src/hooks/useAuth.tsx.
 */
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "user" | "admin";

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole;
};

export const NEP_GEBRUIKER_ID = "nep-deelnemer";

const STAAT: AuthState = {
  user: { id: NEP_GEBRUIKER_ID, email: "deelnemer@testbank.local" } as unknown as User,
  session: null,
  loading: false,
  role: "user",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth(): AuthState {
  return STAAT;
}
