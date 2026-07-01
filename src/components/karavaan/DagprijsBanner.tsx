import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ChevronRight } from "lucide-react";

type Dagprijs = {
  titel: string | null;
  sponsor_naam: string | null;
  sponsor_logo_url: string | null;
  sponsor_url: string | null;
  banner_kicker: string | null;
  banner_sponsor_label: string | null;
  banner_waarde: string | null;
};

// Retro-wieler kleuren (Tour de France / Koerspoule).
const GOUD = "#dfad32";
const GOUD_DONKER = "#9b6a12";
const GOUD_SCHADUW = "#8a5d0f";
const ROOD = "#d3483d";
const INKT = "#171717";
const CREME = "#fbf7eb";

// Vaste decoratieve achtergrond (repo-asset, niet beheerbaar). Renners/bergen in
// de rechterhelft; links faden we naar crème zodat tekst leesbaar blijft.
// Aanbevolen export: ~1600×360px, renners rechter ⅓, links uitgefade naar crème.
const BANNER_BG = "/img/dagprijs-banner-bg.png";

// Nette defaults voor lege admin-tekstvelden. De grote titel valt NIET terug
// op de kicker-tekst (anders dubbel "Dagprijs van vandaag").
const DEF_KICKER = "Dagprijs van vandaag";
const DEF_SPONSOR_LABEL = "Trotse sponsor van Koerspoule";
const DEF_TITEL = "Win een dagprijs";

/**
 * Rijke retro sponsor-dagprijs-banner bovenaan L'Équipe. Toont de dagprijs met
 * is_dagprijs_vandaag=true van de actieve game (max. één). Geen actieve dagprijs
 * = geen banner. Leest alleen publieke prijsvelden (RLS: prizes publiek leesbaar).
 *
 * Layout desktop: vaste renners-achtergrond rechts + 2 kolommen content:
 * LINKS dominant sponsorblok (logo + label-pill) | MIDDEN kicker + echte
 * prijstitel + gouden waarde-badge + subline + "Alle prijzen →".
 * Mobiel: geen achtergrond, gestapeld en gecentreerd.
 */
export default function DagprijsBanner({ gameId }: { gameId?: string }) {
  const { data } = useQuery({
    queryKey: ["dagprijs-vandaag", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Dagprijs | null> => {
      if (!supabase || !gameId) return null;
      // RPC bepaalt welke banner: ingepland voor de etappe-van-vandaag, anders
      // terugval op is_dagprijs_vandaag, anders niets.
      const { data, error } = await supabase.rpc("get_dagprijs_banner", { p_game_id: gameId });
      if (error) return null;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as Dagprijs) ?? null;
    },
  });

  if (!data) return null;

  const kicker = data.banner_kicker?.trim() || DEF_KICKER;
  const sponsorLabel = data.banner_sponsor_label?.trim() || DEF_SPONSOR_LABEL;
  const titel = data.titel?.trim() || DEF_TITEL;
  const waarde = data.banner_waarde?.trim();
  const logo = data.sponsor_logo_url;

  // Dominant sponsorblok: groot logo op donkere kaart (leest ook met wit logo) +
  // gouden pill-label eronder.
  const logoBlok = (
    <div className="flex flex-col items-center gap-3 w-full">
      {logo ? (
        <img
          src={logo}
          alt={data.sponsor_naam ?? "sponsor"}
          className="w-[300px] max-h-[104px] object-contain rounded-lg bg-black p-2.5"
          loading="lazy"
        />
      ) : (
        <div className="w-[300px] h-[104px] rounded-lg bg-black flex items-center justify-center">
          <span className="text-5xl">🎁</span>
        </div>
      )}
      <span
        className="inline-flex items-center justify-center rounded-full px-3 py-1 text-[9.5px] font-black uppercase tracking-[0.08em] text-center leading-tight max-w-[200px] transition-all duration-200 group-hover:bg-[#c79a24] group-hover:shadow-[0_3px_10px_rgba(155,106,18,0.35)] group-hover:-translate-y-px motion-reduce:transform-none"
        style={{ background: GOUD, color: INKT }}
      >
        {sponsorLabel}
      </span>
    </div>
  );

  return (
    <div
      className="relative grid grid-cols-1 md:grid-cols-[340px_1fr] items-center gap-4 md:gap-8 overflow-hidden rounded-xl px-4 pb-3 pt-5 md:pl-12 md:pr-6 md:pb-4 md:pt-5 text-center md:text-left"
      style={{ background: CREME, border: `2px solid ${GOUD}`, boxShadow: "0 8px 22px rgba(0,0,0,0.08)" }}
    >
      {/* Vaste renners-achtergrond (rechts), alleen desktop */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none bg-no-repeat"
        style={{ backgroundImage: `url(${BANNER_BG})`, backgroundSize: "cover", backgroundPosition: "right center" }}
        aria-hidden
      />
      {/* Crème-fade over de linkerkant → tekst altijd leesbaar, ook met achtergrond */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${CREME} 28%, rgba(251,247,235,0.5) 50%, rgba(251,247,235,0) 70%)` }}
        aria-hidden
      />

      {/* Rode gestippelde lijn bovenrand */}
      <div
        className="pointer-events-none absolute left-5 right-5 top-2 h-2 z-10"
        style={{ backgroundImage: `radial-gradient(${ROOD} 2px, transparent 3px)`, backgroundSize: "16px 8px", backgroundRepeat: "repeat-x" }}
        aria-hidden
      />

      {/* LINKS — dominant sponsorblok (logo linkt naar sponsor indien bekend) */}
      <div
        className="relative z-10 flex justify-center md:pr-6 md:border-r"
        style={{ borderColor: "rgba(155,106,18,0.35)" }}
      >
        {data.sponsor_url ? (
          <a
            href={data.sponsor_url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            aria-label={`Bezoek de website van ${data.sponsor_naam || "de sponsor"}`}
            className="group w-full transition-transform hover:-translate-y-px motion-reduce:transform-none focus:outline-none focus-visible:ring-2 rounded-lg"
            style={{ outlineColor: GOUD }}
          >
            {logoBlok}
          </a>
        ) : (
          logoBlok
        )}
      </div>

      {/* MIDDEN — kicker + echte prijstitel + waarde-badge + subline + knop */}
      <div className="relative z-10 min-w-0">
        <p className="mb-1 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "#b7831d" }}>
          {kicker}
        </p>
        <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
          <h3 className="m-0 font-display font-black leading-[0.95] tracking-[-0.04em] text-[clamp(24px,3.2vw,40px)]" style={{ color: INKT }}>
            {titel}
          </h3>
          {waarde && (
            <span
              className="inline-flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full text-[17px] font-black"
              style={{ background: "linear-gradient(145deg,#e8b83c,#c7901c)", color: "#111", border: `3px solid ${GOUD_DONKER}`, boxShadow: `0 3px 0 ${GOUD_SCHADUW}` }}
            >
              {waarde}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-center md:justify-start gap-3 flex-wrap">
          {data.sponsor_naam && (
            <p className="text-[13px]" style={{ color: "#6f6b7d" }}>
              aangeboden door <strong className="font-bold" style={{ color: "#b7831d" }}>{data.sponsor_naam}</strong>
            </p>
          )}
          <Link
            to="/prijzen"
            aria-label="Bekijk alle prijzen"
            className="inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-[12px] font-black uppercase tracking-[0.08em] whitespace-nowrap transition-transform hover:translate-y-px motion-reduce:transform-none focus:outline-none focus-visible:ring-2"
            style={{ background: GOUD, color: INKT, border: `2px solid ${GOUD_DONKER}`, boxShadow: `0 3px 0 ${GOUD_SCHADUW}`, outlineColor: GOUD }}
          >
            Alle prijzen <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
