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
      viewBox="0 0 170 80"
      className="hidden md:block h-[72px] w-auto select-none"
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
      <g stroke="#c58c19" strokeWidth="1.1" strokeOpacity="0.9">
        <circle cx="40" cy="58" r="15" fill="none" />
        <circle cx="92" cy="58" r="15" fill="none" />
      </g>
      <circle cx="40" cy="58" r="2.4" fill="#c58c19" />
      <circle cx="92" cy="58" r="2.4" fill="#c58c19" />
      {/* Frame + renner — gevuld silhouet, leest scherp op klein formaat */}
      <path
        d="M40 58 L62 40 L92 58 L72 58 Z"
        fill="#2a2520"
      />
      <path
        d="M62 40 L55 24 L70 22 L66 30 L78 36 L70 40 Z"
        fill="#2a2520"
      />
      <circle cx="62" cy="17" r="6.5" fill="#2a2520" />
      <path d="M56 14 q7 -7 14 -1" stroke="#e0ac2d" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <line x1="40" y1="58" x2="55" y2="24" stroke="#2a2520" strokeWidth="2.6" strokeLinecap="round" />
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
    <div className="flex flex-col items-center gap-2">
      {logo ? (
        <img
          src={logo}
          alt={data.sponsor_naam ?? "sponsor"}
          className="w-[150px] max-h-[56px] object-contain rounded-md bg-black"
          loading="lazy"
        />
      ) : (
        <div className="w-[150px] h-[56px] rounded-md bg-black flex items-center justify-center">
          <span className="text-2xl">🎁</span>
        </div>
      )}
      <span className="inline-flex items-center justify-center rounded-full bg-[#e0ac2d] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#171717] text-center leading-tight">
        {sponsorLabel}
      </span>
    </div>
  );

  return (
    <div className="relative grid grid-cols-1 md:grid-cols-[190px_1fr_auto] items-center gap-4 md:gap-6 overflow-hidden rounded-xl border-2 border-[#d7a84a] bg-[#fbf7eb] px-5 pb-4 pt-6 md:px-7 md:pb-4 md:pt-5 shadow-[0_8px_22px_rgba(0,0,0,0.08)]">
      {/* Rode stippellijn bovenrand */}
      <div
        className="pointer-events-none absolute left-4 right-4 top-2 h-2"
        style={{ backgroundImage: "radial-gradient(#cf3b35 3px, transparent 3px)", backgroundSize: "16px 8px", backgroundRepeat: "repeat-x" }}
        aria-hidden
      />

      {/* LINKS — sponsorlogo + label (logo linkt naar sponsor indien bekend) */}
      <div className="flex justify-center md:block md:pr-5 md:border-r md:border-[rgba(180,130,40,0.45)]">
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
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b98319]">{kicker}</p>
        <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
          <h3 className="m-0 font-display font-black leading-[0.95] tracking-[-0.03em] text-[#191919] text-[clamp(20px,2.4vw,32px)]">
            {titel}
          </h3>
          {waarde && (
            <span
              className="inline-flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full border-[3px] border-[#9c6d10] text-[17px] font-black text-[#111]"
              style={{ background: "linear-gradient(145deg,#e7b83f,#c58c19)", boxShadow: "0 3px 0 #8f620f" }}
            >
              {waarde}
            </span>
          )}
        </div>
        {data.sponsor_naam && (
          <p className="mt-1.5 text-[13px] text-[#6d6b7e]">
            aangeboden door <strong className="font-bold text-[#b98319]">{data.sponsor_naam}</strong>
          </p>
        )}
      </div>

      {/* RECHTS — vaste illustratie + knop */}
      <div className="flex flex-col items-center md:items-end gap-2.5">
        <RennersIllustratie />
        <Link
          to="/prijzen"
          aria-label="Bekijk alle prijzen"
          className="inline-flex w-full md:w-auto items-center justify-center gap-1.5 rounded-lg border-2 border-[#9c6d10] bg-[#e0ac2d] px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.08em] text-[#171717] whitespace-nowrap transition-transform hover:translate-y-px motion-reduce:transform-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a84a]"
          style={{ boxShadow: "0 3px 0 #8f620f" }}
        >
          Alle prijzen <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
