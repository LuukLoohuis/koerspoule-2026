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

// Nette defaults voor lege admin-tekstvelden. De grote titel valt NIET terug
// op de kicker-tekst (anders dubbel "Dagprijs van vandaag").
const DEF_KICKER = "Dagprijs van vandaag";
const DEF_SPONSOR_LABEL = "Trotse sponsor van Koerspoule";
const DEF_TITEL = "Win een dagprijs";

/**
 * Vaste decoratieve retro-wieler-illustratie (repo-asset, niet beheerbaar):
 * sepia bergen + Col du Tourmalet-bord + silhouet-renner met gouden helm. Sepia
 * inkt op transparant. Verborgen op mobiel als 't de leesbaarheid hindert.
 */
function RennersIllustratie() {
  return (
    <svg
      viewBox="0 0 170 80"
      className="hidden md:block h-[76px] w-auto select-none"
      aria-hidden
      role="presentation"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Zachte bergen achter */}
      <path d="M70 52 L96 18 L114 40 L130 24 L164 56 L164 64 L70 64 Z" fill="#2a2520" fillOpacity="0.08" />
      <path d="M70 52 L96 18 L114 40 L130 24 L164 56" stroke="#2a2520" strokeOpacity="0.35" strokeWidth="1.3" strokeLinejoin="round" />
      {/* Col-bord */}
      <g>
        <rect x="140" y="32" width="24" height="15" rx="2" fill="#fbf7eb" stroke="#2a2520" strokeWidth="1.2" />
        <line x1="144" y1="47" x2="144" y2="64" stroke="#2a2520" strokeWidth="1.4" />
        <text x="152" y="39" textAnchor="middle" fontSize="4.2" fontWeight="700" fill="#2a2520">COL DU</text>
        <text x="152" y="45" textAnchor="middle" fontSize="5.4" fontWeight="800" fill="#2a2520">2115</text>
      </g>
      {/* Wielen */}
      <g stroke="#2a2520" strokeWidth="2.4">
        <circle cx="40" cy="58" r="15" fill="#fbf7eb" />
        <circle cx="92" cy="58" r="15" fill="#fbf7eb" />
      </g>
      <g stroke={GOUD_DONKER} strokeWidth="1.2" strokeOpacity="0.95">
        <circle cx="40" cy="58" r="15" fill="none" />
        <circle cx="92" cy="58" r="15" fill="none" />
      </g>
      <circle cx="40" cy="58" r="2.4" fill={GOUD_DONKER} />
      <circle cx="92" cy="58" r="2.4" fill={GOUD_DONKER} />
      {/* Frame + renner — gevuld silhouet, leest scherp op klein formaat */}
      <path d="M40 58 L62 40 L92 58 L72 58 Z" fill="#2a2520" />
      <path d="M62 40 L55 24 L70 22 L66 30 L78 36 L70 40 Z" fill="#2a2520" />
      <circle cx="62" cy="17" r="6.5" fill="#2a2520" />
      <path d="M56 14 q7 -7 14 -1" stroke={GOUD} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <line x1="40" y1="58" x2="55" y2="24" stroke="#2a2520" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Rijke retro sponsor-dagprijs-banner bovenaan L'Équipe. Toont de dagprijs met
 * is_dagprijs_vandaag=true van de actieve game (max. één). Geen actieve dagprijs
 * = geen banner. Leest alleen publieke prijsvelden (RLS: prizes publiek leesbaar).
 *
 * Layout desktop (3 kolommen): LINKS dominant sponsorblok (logo + label-pill) |
 * MIDDEN kicker + echte prijstitel + gouden waarde-badge + subline | RECHTS
 * decoratieve illustratie + "Alle prijzen →". Mobiel: gestapeld, gecentreerd.
 */
export default function DagprijsBanner({ gameId }: { gameId?: string }) {
  const { data } = useQuery({
    queryKey: ["dagprijs-vandaag", gameId],
    enabled: Boolean(supabase && gameId),
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Dagprijs | null> => {
      if (!supabase || !gameId) return null;
      const { data, error } = await supabase
        .from("prizes")
        .select("titel, sponsor_naam, sponsor_logo_url, sponsor_url, banner_kicker, banner_sponsor_label, banner_waarde")
        .eq("game_id", gameId)
        .eq("is_dagprijs_vandaag", true)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return (data as Dagprijs) ?? null;
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
          className="w-[200px] max-h-[74px] object-contain rounded-lg bg-black p-1.5"
          loading="lazy"
        />
      ) : (
        <div className="w-[200px] h-[74px] rounded-lg bg-black flex items-center justify-center">
          <span className="text-3xl">🎁</span>
        </div>
      )}
      <span
        className="inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-center leading-tight max-w-[210px]"
        style={{ background: GOUD, color: INKT }}
      >
        {sponsorLabel}
      </span>
    </div>
  );

  return (
    <div
      className="relative grid grid-cols-1 md:grid-cols-[230px_1fr_auto] items-center gap-5 md:gap-6 overflow-hidden rounded-xl px-5 pb-5 pt-7 md:px-8 md:pb-5 md:pt-7 text-center md:text-left"
      style={{ background: "#fbf7eb", border: `2px solid ${GOUD}`, boxShadow: "0 8px 22px rgba(0,0,0,0.08)" }}
    >
      {/* Rode gestippelde lijn bovenrand */}
      <div
        className="pointer-events-none absolute left-6 right-6 top-3 h-2"
        style={{ backgroundImage: `radial-gradient(${ROOD} 2px, transparent 3px)`, backgroundSize: "16px 8px", backgroundRepeat: "repeat-x" }}
        aria-hidden
      />

      {/* LINKS — dominant sponsorblok (logo linkt naar sponsor indien bekend) */}
      <div
        className="flex justify-center md:pr-6 md:border-r"
        style={{ borderColor: "rgba(155,106,18,0.35)" }}
      >
        {data.sponsor_url ? (
          <a
            href={data.sponsor_url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            aria-label={`Bezoek de website van ${data.sponsor_naam || "de sponsor"}`}
            className="w-full transition-transform hover:-translate-y-px motion-reduce:transform-none focus:outline-none focus-visible:ring-2 rounded-lg"
            style={{ outlineColor: GOUD }}
          >
            {logoBlok}
          </a>
        ) : (
          logoBlok
        )}
      </div>

      {/* MIDDEN — kicker + echte prijstitel + waarde-badge + subline */}
      <div className="min-w-0">
        <p className="mb-1.5 text-[12px] font-black uppercase tracking-[0.18em]" style={{ color: "#b7831d" }}>
          {kicker}
        </p>
        <div className="flex items-center justify-center md:justify-start gap-4 flex-wrap">
          <h3 className="m-0 font-display font-black leading-[0.95] tracking-[-0.04em] text-[clamp(26px,3.4vw,44px)]" style={{ color: INKT }}>
            {titel}
          </h3>
          {waarde && (
            <span
              className="inline-flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full text-[21px] font-black"
              style={{ background: "linear-gradient(145deg,#e8b83c,#c7901c)", color: "#111", border: `3px solid ${GOUD_DONKER}`, boxShadow: `0 4px 0 ${GOUD_SCHADUW}` }}
            >
              {waarde}
            </span>
          )}
        </div>
        {data.sponsor_naam && (
          <p className="mt-2 text-[14px]" style={{ color: "#6f6b7d" }}>
            aangeboden door <strong className="font-bold" style={{ color: "#b7831d" }}>{data.sponsor_naam}</strong>
          </p>
        )}
      </div>

      {/* RECHTS — decoratieve illustratie + knop */}
      <div className="flex flex-col items-center md:items-end gap-3">
        <RennersIllustratie />
        <Link
          to="/prijzen"
          aria-label="Bekijk alle prijzen"
          className="inline-flex w-full md:w-auto items-center justify-center gap-1.5 rounded-md px-5 py-3 text-[13px] font-black uppercase tracking-[0.08em] whitespace-nowrap transition-transform hover:translate-y-px motion-reduce:transform-none focus:outline-none focus-visible:ring-2"
          style={{ background: GOUD, color: INKT, border: `2px solid ${GOUD_DONKER}`, boxShadow: `0 4px 0 ${GOUD_SCHADUW}`, outlineColor: GOUD }}
        >
          Alle prijzen <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
