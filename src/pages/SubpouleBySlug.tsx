/**
 * /subpoule/:slug — nette, deelbare subpoule-link.
 *
 * Normaliseert de inkomende slug (zelfde slugify als de DB), en:
 *  - niet ingelogd → /login?returnTo=/subpoule/<slug> (terug na login);
 *  - ingelogd → resolve_subpoule_by_slug (SECURITY DEFINER, omzeilt RLS) →
 *    redirect naar de bestaande deeplink /mijn-peloton?tab=subpoules&subpoule=<id>
 *    (incl. code, zodat een niet-lid via SubpouleManager kan joinen).
 *  - niet gevonden → nette "niet gevonden"-state.
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/slugify";
import { Trophy } from "lucide-react";

export default function SubpouleBySlug() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (loading) return;
    const norm = slugify(slug ?? "");

    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(`/${norm}`)}`, { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      if (!supabase) {
        if (!cancelled) setNotFound(true);
        return;
      }
      const { data, error } = await supabase.rpc("resolve_subpoule_by_slug", { p_slug: norm });
      if (cancelled) return;
      const row = (Array.isArray(data) ? data[0] : data) as
        | { id: string; name: string; code: string; game_id: string }
        | undefined;
      if (error || !row) {
        setNotFound(true);
        return;
      }
      const params = new URLSearchParams({ tab: "subpoules", subpoule: row.id });
      if (row.code) params.set("code", row.code);
      navigate(`/mijn-peloton?${params.toString()}`, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, user, loading, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="retro-border bg-card p-8 text-center max-w-md w-full space-y-3">
        <Trophy className="h-8 w-8 text-[hsl(var(--vintage-gold))] mx-auto" />
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
        ) : (
          <>
            <h1 className="font-display text-xl font-bold">Subpoule openen…</h1>
            <p className="text-sm text-muted-foreground font-mono animate-pulse">Even laden…</p>
          </>
        )}
      </div>
    </div>
  );
}
