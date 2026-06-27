/**
 * /<slug> en /subpoule/<slug> — nette, deelbare subpoule-link.
 *
 *  - NIET ingelogd → uitnodigingspagina met de subpoule-naam (alleen naam via
 *    subpoule_invite_by_slug, géén code/privédata) + knoppen om een account te
 *    maken of in te loggen. returnTo bewaart de subpoule-bestemming.
 *  - INGELOGD → resolve_subpoule_by_slug (SECURITY DEFINER) → join-flow met de
 *    code VOORGEVULD (/mijn-peloton?tab=subpoules&join=<code>); geen stille
 *    auto-join, de gebruiker bevestigt zelf.
 *  - niet gevonden → nette "niet gevonden"-state.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import { Trophy, UserPlus, LogIn } from "lucide-react";

export default function SubpouleBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);
  const [invite, setInvite] = useState<{ id: string; name: string } | null>(null);

  const norm = slugify(slug ?? "");
  const returnTo = `/${norm}`;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;

    (async () => {
      if (!supabase) { if (!cancelled) setNotFound(true); return; }

      if (user) {
        // Ingelogd → resolve incl. code → join-flow met code voorgevuld.
        const { data, error } = await supabase.rpc("resolve_subpoule_by_slug", { p_slug: norm });
        if (cancelled) return;
        const row = (Array.isArray(data) ? data[0] : data) as
          | { id: string; name: string; code: string; game_id: string } | undefined;
        if (error || !row) { setNotFound(true); return; }
        const params = new URLSearchParams({ tab: "subpoules" });
        if (row.code) params.set("join", row.code);
        navigate(`/mijn-peloton?${params.toString()}`, { replace: true });
        return;
      }

      // Niet ingelogd → alleen de naam ophalen voor de uitnodiging.
      const { data, error } = await supabase.rpc("subpoule_invite_by_slug", { p_slug: norm });
      if (cancelled) return;
      const row = (Array.isArray(data) ? data[0] : data) as { id: string; name: string } | undefined;
      if (error || !row) { setNotFound(true); return; }
      setInvite(row);
    })();

    return () => { cancelled = true; };
  }, [norm, user, loading, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="retro-border bg-card p-8 text-center max-w-md w-full space-y-4">
        <Trophy className="h-9 w-9 text-[hsl(var(--vintage-gold))] mx-auto" />

        {notFound ? (
          <>
            <h1 className="font-display text-xl font-bold">Subpoule niet gevonden</h1>
            <p className="text-sm text-muted-foreground">
              Deze link bestaat niet (meer). Controleer de URL of vraag je organisator om een nieuwe.
            </p>
            <Link
              to="/mijn-peloton?tab=subpoules"
              className="inline-flex items-center justify-center mt-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-bold text-sm border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:brightness-105 transition-all"
            >
              Naar mijn subpoules
            </Link>
          </>
        ) : invite ? (
          <>
            <div className="overline-stamp" style={{ color: "hsl(var(--vintage-gold))" }}>Je bent uitgenodigd</div>
            <h1 className="font-display text-2xl font-bold leading-tight">{invite.name}</h1>
            <p className="text-sm text-muted-foreground font-serif">
              Doe mee met deze subpoule en strijd mee om de gele trui. Maak gratis een account aan —
              daarna kom je meteen bij <strong>{invite.name}</strong> uit.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                to={`/login?register=1&returnTo=${encodeURIComponent(returnTo)}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground font-bold text-sm border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:brightness-105 transition-all"
              >
                <UserPlus className="h-4 w-4" /> Maak gratis een account om mee te doen
              </Link>
              <Link
                to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogIn className="h-4 w-4" /> Al een account? Log in
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold">Uitnodiging laden…</h1>
            <p className="text-sm text-muted-foreground font-mono animate-pulse motion-reduce:animate-none">Even laden…</p>
          </>
        )}
      </div>
    </div>
  );
}
