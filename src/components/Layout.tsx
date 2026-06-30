import { Link, useLocation, useNavigate } from "react-router-dom";
import koerspouleLogo from "@/assets/koerspoule-logo-2026.png";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SteunKopgroepPill } from "@/components/SteunKopgroep";
import CookieBanner from "@/components/CookieBanner";
import RouteSeo from "@/components/RouteSeo";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useThema } from "@/contexts/ThemaContext";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import { useVisibleSponsors } from "@/hooks/useSponsors";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/team-samenstellen", label: "Stel je team samen" },
  { to: "/uitslagen", label: "Uitslagen" },
  { to: "/mijn-peloton", label: "Mijn Peloton" },
  { to: "/regels", label: "Koersreglement" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role } = useAuth();
  const { thema } = useThema();
  const { data: sponsors = [] } = useVisibleSponsors();
  const { data: currentGame } = useCurrentGame();
  const isLoggedIn = Boolean(user);

  // "Prijzen" alleen in de nav als de actieve game 'm zichtbaar heeft gezet.
  const visibleNav = currentGame?.prizes_visible
    ? [...navItems.slice(0, 4), { to: "/prijzen", label: "Prijzen" }, ...navItems.slice(4)]
    : navItems;

  // Kleur-tokens worden nu door ThemaProvider gezet (vervangt useAccentColor).

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <RouteSeo />

      {/* Header — newspaper masthead */}
      <header className="bg-card border-b border-border/70">
        {/* Race accent line */}
        <div className="race-rule" />

        {/* Masthead row: logo + support + auth */}
        <div className="container mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img
                  alt="Koerspoule logo"
                  width={256}
                  height={170}
                  decoding="async"
                  className="h-12 w-auto"
                  src={koerspouleLogo}
                />
              </Link>
              <SteunKopgroepPill />
            </div>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-2">
              {isLoggedIn ? (
                <button
                  data-testid="logout-btn-desktop"
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-medium border border-foreground/30 rounded hover:bg-secondary transition-colors"
                >
                  Uitloggen
                </button>
              ) : (
                <Link
                  data-testid="login-link-desktop"
                  to="/login"
                  className="px-3 py-1.5 text-xs font-medium border border-foreground/30 rounded hover:bg-secondary transition-colors"
                >
                  Inloggen
                </Link>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1.5 -mr-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Menu sluiten" : "Menu openen"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Tour de France — L'Équipe-poster band (alleen bij geel thema) */}
        {thema.key === "geel" && (
          <div className="tdf-poster-band">
            <div className="container mx-auto px-5">
              <div className="tdf-poster-band__inner">
                <span className="tdf-poster-band__title heading-oswald">{thema.koers}</span>
                <span className="tdf-poster-band__stamp overline-stamp">{thema.krant} · MMXXVI</span>
              </div>
            </div>
          </div>
        )}

        {/* Desktop nav strip */}
        <div className="hidden md:block border-t border-border/40 bg-background/40">
          <div className="container mx-auto px-5">
            <nav className="flex items-center gap-1.5">
              {visibleNav.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "nav-link-editorial",
                      isActive && "active"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border/40 bg-background px-4 pb-4 pt-3 flex flex-wrap gap-2">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn("nav-link-editorial", location.pathname === item.to && "active")}
              >
                {item.label}
              </Link>
            ))}
            <div className="w-full border-t border-border/40 pt-2 mt-1 flex">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="nav-link-editorial"
                >
                  Uitloggen
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="nav-link-editorial"
                >
                  Inloggen
                </Link>
              )}
            </div>
          </nav>
        )}

        {/* Maillot-accent: bolletjes-band onder de masthead (per thema) */}
        <div className="bolletjes-rule" aria-hidden />
      </header>

      {/* Main content — alle pagina's behalve de voorpagina krijgen één
          leesbaar font (Inter) via .content-font; de voorpagina (/) houdt
          haar eigen editorial typografie. */}
      <main className={cn("flex-1", location.pathname !== "/" && "content-font")}>
        <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
      </main>
      <BottomNav />

      {/* Footer */}
      <footer className="gradient-border-top bg-card py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-5">
        <div className="container mx-auto px-5">
          <div className="bolletjes-rule max-w-xs mx-auto mb-3" aria-hidden />
          <div className="vintage-ornament max-w-sm mx-auto mb-4">
            <span className="vintage-ornament-symbol">{thema.key === "geel" ? "✲" : thema.key === "rood" ? "☀" : "⚜"}</span>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="font-serif italic">"{thema.homepage_subtitel}" — Koerspoule, uit liefde voor de koers.</p>
            <p className="font-sans">
              Materiaalpech? Mail naar{" "}
              <a href="mailto:koerspoule@gmail.com" className="underline hover:text-foreground transition-colors">
                koerspoule@gmail.com
              </a>
            </p>
            <div className="flex items-center gap-3 font-sans flex-wrap justify-center">
              <Link to="/tour-de-france-poule-2026" className="underline hover:text-foreground transition-colors">Tour de France poule 2026</Link>
              <span>·</span>
              <Link to="/tour-de-france-wielerspel-2026" className="underline hover:text-foreground transition-colors">Tour de France wielerspel 2026</Link>
              <span>·</span>
              <button onClick={() => navigate("/juridisch")} className="underline hover:text-foreground transition-colors">Privacybeleid</button>
              <span>·</span>
              <button onClick={() => navigate("/actievoorwaarden")} className="underline hover:text-foreground transition-colors">Actievoorwaarden</button>
              <span>·</span>
              {role === "admin" && (
                <>
                  <Link to="/admin" className="underline hover:text-foreground transition-colors">Admin</Link>
                  <span>·</span>
                </>
              )}
              {sponsors.map((s) => {
                const inhoud = s.logo_url ? (
                  <img src={s.logo_url} alt={s.naam} loading="lazy" className="h-5 w-auto max-w-[96px] object-contain align-middle" />
                ) : (
                  <span className="underline hover:text-foreground transition-colors">{s.naam}</span>
                );
                return (
                  <span key={s.id} className="inline-flex items-center gap-3">
                    {s.link_url ? (
                      <a href={s.link_url} target="_blank" rel="noopener noreferrer nofollow sponsored" aria-label={`Bezoek de website van ${s.naam}`} className="inline-flex items-center hover:opacity-80 transition-opacity">{inhoud}</a>
                    ) : (
                      inhoud
                    )}
                    <span>·</span>
                  </span>
                );
              })}
              <span>© 2026 Koerspoule</span>
            </div>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </div>
  );
}
