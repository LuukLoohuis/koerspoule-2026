import { Link, useLocation, useNavigate } from "react-router-dom";
import koerspouleLogo from "@/assets/koerspoule-logo-2026.png";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Menu, X, Instagram } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/components/LanguageToggle";
import GameSwitcher from "@/components/GameSwitcher";
import { useSelectedGame } from "@/context/SelectedGameContext";
import { isVisibleToUser } from "@/lib/gameStatus";
import { useAllGames } from "@/hooks/useAllGames";
import { useMyEnteredGameIds } from "@/hooks/useMyEnteredGameIds";
import InschrijfBanner from "@/components/InschrijfBanner";
import { SteunKopgroepPill } from "@/components/SteunKopgroep";
import CookieBanner from "@/components/CookieBanner";
import RouteSeo from "@/components/RouteSeo";
import BottomNav from "@/components/BottomNav";
import ErrorBoundary from "@/components/ErrorBoundary";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useThema } from "@/contexts/ThemaContext";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import SponsorStrip from "@/components/SponsorStrip";

const INSTAGRAM_URL = "https://www.instagram.com/koerspoule/";

// Labels als i18n-sleutels; t() in de component (nav.<key>).
const navItems = [
  { to: "/", key: "nav.home" },
  { to: "/team-samenstellen", key: "nav.buildTeam" },
  { to: "/uitslagen", key: "nav.results" },
  { to: "/mijn-peloton", key: "nav.myPeloton" },
  { to: "/uitleg", key: "nav.explain" },
  { to: "/regels", key: "nav.rules" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role } = useAuth();
  const { thema } = useThema();
  const { data: currentGame } = useCurrentGame();
  const { t } = useTranslation();
  const isLoggedIn = Boolean(user);
  const isAdmin = role === "admin";

  // Gedeelde game-keuze (context). De kaartenrij-switcher staat één keer hier in
  // de shell; pagina's houden geen eigen game-state meer bij.
  const { games, selectedGame, setSelectedGameId } = useSelectedGame();
  const switchableGames = games.filter((g) => isVisibleToUser(g.status, isAdmin));

  // "Prijzen" alleen in de nav als de actieve game 'm zichtbaar heeft gezet.
  const visibleNav = currentGame?.prizes_visible
    ? [...navItems.slice(0, 4), { to: "/prijzen", key: "nav.prizes" }, ...navItems.slice(4)]
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

            {/* Rechter-groep: taal + Instagram (altijd zichtbaar) + auth
                (desktop) / hamburger (mobiel). De game-switcher staat als eigen
                rij onder de nav (niet hier). */}
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("shell.instagramAria")}
                title={t("shell.instagramTitle")}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-foreground/30 hover:bg-secondary transition-colors"
              >
                <Instagram className="h-[18px] w-[18px] text-foreground" />
              </a>

              {/* Desktop auth */}
              <div className="hidden md:flex items-center gap-2">
                {isLoggedIn ? (
                  <button
                    data-testid="logout-btn-desktop"
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-xs font-medium border border-foreground/30 rounded hover:bg-secondary transition-colors"
                  >
                    {t("shell.logout")}
                  </button>
                ) : (
                  <Link
                    data-testid="login-link-desktop"
                    to="/login"
                    className="px-3 py-1.5 text-xs font-medium border border-foreground/30 rounded hover:bg-secondary transition-colors"
                  >
                    {t("shell.login")}
                  </Link>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-1.5 -mr-1"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? t("shell.menuClose") : t("shell.menuOpen")}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
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
                    {t(item.key)}
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
                {t(item.key)}
              </Link>
            ))}
            <div className="w-full border-t border-border/40 pt-2 mt-1 flex">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="nav-link-editorial"
                >
                  {t("shell.logout")}
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="nav-link-editorial"
                >
                  {t("shell.login")}
                </Link>
              )}
            </div>
          </nav>
        )}

        {/* Maillot-accent: bolletjes-band onder de masthead (per thema) */}
        <div className="bolletjes-rule" aria-hidden />
      </header>

      {/* Game-switcher — één keer in de shell, direct onder de nav. Alleen bij
          >1 voor de deelnemer zichtbare game; bij één game verborgen. */}
      {switchableGames.length > 1 && (
        <GameSwitcher
          games={switchableGames}
          selectedId={selectedGame?.id ?? null}
          onSelect={setSelectedGameId}
          isAdmin={isAdmin}
        />
      )}

      {/* In-app "inschrijving open"-banner (deelnemers). Homepage (/) doet dit
          zelf via Index; hier voor ingelogde deelnemers op de app-pagina's, voor
          games die 'ie nog niet heeft ingevuld. Wegklikbaar per game. */}
      <InAppInschrijfBanners hidden={location.pathname === "/"} loggedIn={isLoggedIn} />

      {/* Main content — alle pagina's behalve de voorpagina krijgen één
          leesbaar font (Inter) via .content-font; de voorpagina (/) houdt
          haar eigen editorial typografie. */}
      <main className={cn("flex-1", location.pathname !== "/" && "content-font")}>
        <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
      </main>
      <BottomNav />

      {/* Sponsorstrook — subtiel, boven de footerbalk (alleen bij zichtbare sponsoren) */}
      <SponsorStrip />

      {/* Footer */}
      <footer className="gradient-border-top bg-card py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-5">
        <div className="container mx-auto px-5">
          <div className="bolletjes-rule max-w-xs mx-auto mb-3" aria-hidden />
          <div className="vintage-ornament max-w-sm mx-auto mb-4">
            <span className="vintage-ornament-symbol">{thema.key === "geel" ? "✲" : thema.key === "rood" ? "☀" : "⚜"}</span>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p className="font-serif italic">{t("shell.footer.tagline", { subtitle: thema.homepage_subtitel })}</p>
            <p className="font-sans">
              {t("shell.footer.mechanicalIssue")}{" "}
              <a href="mailto:koerspoule@gmail.com" className="underline hover:text-foreground transition-colors">
                koerspoule@gmail.com
              </a>
            </p>
            <div className="flex items-center gap-3 font-sans flex-wrap justify-center">
              <Link to="/tour-de-france-wielerspel-2026" className="underline hover:text-foreground transition-colors">{t("shell.footer.tdfLink")}</Link>
              <span>·</span>
              <button onClick={() => navigate("/juridisch")} className="underline hover:text-foreground transition-colors">{t("shell.footer.privacy")}</button>
              <span>·</span>
              <button onClick={() => navigate("/actievoorwaarden")} className="underline hover:text-foreground transition-colors">{t("shell.footer.actievoorwaarden")}</button>
              <span>·</span>
              {role === "admin" && (
                <>
                  <Link to="/admin" className="underline hover:text-foreground transition-colors">{t("shell.footer.admin")}</Link>
                  <span>·</span>
                </>
              )}
              <span>{t("shell.footer.copyright")}</span>
            </div>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </div>
  );
}

/**
 * In-app inschrijf-banners: voor ingelogde deelnemers, op app-pagina's (niet de
 * homepage — die doet 't zelf), voor games met de vlag aan die op
 * open_inschrijving staan én die de deelnemer nog niet heeft ingevuld.
 * Wegklikbaar per game (localStorage).
 */
function InAppInschrijfBanners({ hidden, loggedIn }: { hidden: boolean; loggedIn: boolean }) {
  const { data: allGames = [] } = useAllGames();
  const { data: entered } = useMyEnteredGameIds();
  if (hidden || !loggedIn) return null;
  const games = allGames.filter(
    (g) =>
      g.inschrijf_banner_visible &&
      String(g.status) === "open_inschrijving" &&
      !(entered?.has(g.id) ?? false),
  );
  if (games.length === 0) return null;
  return (
    <div className="container mx-auto px-5 pt-3 space-y-3">
      {games.map((g) => (
        <InschrijfBanner key={g.id} game={g} dismissable />
      ))}
    </div>
  );
}

