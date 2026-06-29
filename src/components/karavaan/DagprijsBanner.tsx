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

// Nette defaults voor lege admin-tekstvelden.
const DEF_KICKER = "Dagprijs van vandaag";
const DEF_SPONSOR_LABEL = "Trotse sponsor van Koerspoule";

/**
 * Vaste decoratieve wielrenners-illustratie (repo-asset, niet beheerbaar). Sepia
 * inkt op transparant; bergen + Col du Tourmalet-bord + peloton. Verborgen op
 * mobiel als 't de leesbaarheid hindert.
 */
function RennersIllustratie() {
  return (
    <svg
      viewBox="0 0 280 130"
      className="hidden md:block h-[120px] w-auto select-none"
      aria-hidden
      role="presentation"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="#2a2520" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
        {/* Bergen */}
        <path d="M150 60 L185 18 L210 44 L230 26 L272 70 L272 92 L150 92 Z" fill="#2a2520" fillOpacity="0.06" />
        <path d="M150 60 L185 18 L210 44 L230 26 L272 70" />
        <path d="M178 26 L172 36 M188 26 L194 36 M222 33 L228 42" strokeOpacity="0.5" />
        {/* Weg */}
        <path d="M150 110 L200 86 L272 96" stroke="#2a2520" strokeOpacity="0.4" strokeDasharray="2 4" />
        {/* Col du Tourmalet-bord */}
        <g>
          <rect x="244" y="40" width="30" height="20" rx="2" fill="#fbf7eb" />
          <rect x="244" y="40" width="30" height="20" rx="2" />
          <line x1="248" y1="60" x2="248" y2="78" strokeWidth="1.6" />
          <text x="259" y="48" textAnchor="middle" fontSize="5" fontWeight="700" fill="#2a2520" stroke="none">COL DU</text>
          <text x="259" y="56" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#2a2520" stroke="none">2115</text>
        </g>
        {/* Renner voor (groot) */}
        <g transform="translate(176,70)">
          <circle cx="14" cy="44" r="13" fill="#fbf7eb" />
          <circle cx="50" cy="44" r="13" fill="#fbf7eb" />
          <circle cx="14" cy="44" r="13" />
          <circle cx="50" cy="44" r="13" />
          <path d="M14 44 L30 30 L46 40 L50 44 M30 30 L24 18 M24 18 L33 16" />
          <circle cx="35" cy="13" r="4.5" fill="#e0ac2d" stroke="#2a2520" />
          <path d="M30 30 L18 22 M30 30 L40 24" />
        </g>
        {/* Renners achter (klein, vager) */}
        <g transform="translate(150,82) scale(0.7)" strokeOpacity="0.55">
          <circle cx="10" cy="40" r="10" fill="#fbf7eb" />
          <circle cx="40" cy="40" r="10" fill="#fbf7eb" />
          <circle cx="10" cy="40" r="10" />
          <circle cx="40" cy="40" r="10" />
          <path d="M10 40 L24 28 L38 38 M24 28 L20 18 M20 18 L28 17" />
          <circle cx="29" cy="14" r="3.5" stroke="#2a2520" fill="none" />
        </g>
      </g>
    </svg>
  );
}

/**
 * Rijke sponsor-dagprijs-banner bovenaan L'Équipe. Toont de dagprijs met
 * is_dagprijs_vandaag=true van de actieve game (max. één). Geen actieve dagprijs
 * = geen banner. Leest alleen publieke prijsvelden (RLS: prizes publiek leesbaar).
 *
 * Layout: LINKS sponsorlogo + label-pill | MIDDEN kicker + titel + waarde-badge +
 * subline | RECHTS vaste renners-illustratie + "Alle prijzen →".
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
  const titel = data.titel?.trim() || "Dagprijs van vandaag";
  const waarde = data.banner_waarde?.trim();
  const logo = data.sponsor_logo_url;

  const logoBlok = (
    <div className="flex flex-col items-center gap-2.5">
      {logo ? (
        <img
          src={logo}
          alt={data.sponsor_naam ?? "sponsor"}
          className="w-[170px] max-h-[78px] object-contain rounded-md bg-black"
          loading="lazy"
        />
      ) : (
        <div className="w-[170px] h-[78px] rounded-md bg-black flex items-center justify-center">
          <span className="text-3xl">🎁</span>
        </div>
      )}
      <span className="inline-flex items-center justify-center rounded-full bg-[#e0ac2d] px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#171717] text-center leading-tight">
        {sponsorLabel}
      </span>
    </div>
  );

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-[220px_1fr_auto] items-center gap-5 md:gap-6 overflow-hidden rounded-xl border-2 border-[#d7a84a] bg-[#fbf7eb] px-6 pb-6 pt-8 md:px-8 md:pb-7 md:pt-9 shadow-[0_8px_22px_rgba(0,0,0,0.08)]">
      {/* Rode stippellijn bovenrand */}
      <div
        className="pointer-events-none absolute left-4 right-4 top-2.5 h-2"
        style={{ backgroundImage: "radial-gradient(#cf3b35 3px, transparent 3px)", backgroundSize: "16px 8px", backgroundRepeat: "repeat-x" }}
        aria-hidden
      />

      {/* LINKS — sponsorlogo + label (logo linkt naar sponsor indien bekend) */}
      <div className="flex justify-center md:block md:pr-6 md:border-r md:border-[rgba(180,130,40,0.45)]">
        {data.sponsor_url ? (
          <a
            href={data.sponsor_url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            aria-label={`Bezoek de website van ${data.sponsor_naam || "de sponsor"}`}
            className="transition-transform hover:-translate-y-px motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a84a] rounded-md"
          >
            {logoBlok}
          </a>
        ) : (
          logoBlok
        )}
      </div>

      {/* MIDDEN — kicker + titel + waarde + subline */}
      <div className="min-w-0 text-center md:text-left">
        <p className="mb-1.5 text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#b98319]">{kicker}</p>
        <div className="flex items-center justify-center md:justify-start gap-3.5 flex-wrap">
          <h3 className="m-0 font-display font-black leading-none tracking-[-0.03em] text-[#191919] text-[clamp(24px,3vw,42px)]">
            {titel}
          </h3>
          {waarde && (
            <span
              className="inline-flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-full border-[3px] border-[#9c6d10] text-[22px] font-black text-[#111]"
              style={{ background: "linear-gradient(145deg,#e7b83f,#c58c19)", boxShadow: "0 4px 0 #8f620f" }}
            >
              {waarde}
            </span>
          )}
        </div>
        {data.sponsor_naam && (
          <p className="mt-2.5 text-[14px] text-[#6d6b7e]">
            aangeboden door <strong className="font-bold text-[#b98319]">{data.sponsor_naam}</strong>
          </p>
        )}
      </div>

      {/* RECHTS — vaste illustratie + knop */}
      <div className="flex flex-col items-center md:items-end gap-3">
        <RennersIllustratie />
        <Link
          to="/prijzen"
          aria-label="Bekijk alle prijzen"
          className="inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-lg border-2 border-[#9c6d10] bg-[#e0ac2d] px-5 py-3.5 text-[13px] font-black uppercase tracking-[0.08em] text-[#171717] whitespace-nowrap transition-transform hover:translate-y-px motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a84a]"
          style={{ boxShadow: "0 4px 0 #8f620f" }}
        >
          Alle prijzen <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
