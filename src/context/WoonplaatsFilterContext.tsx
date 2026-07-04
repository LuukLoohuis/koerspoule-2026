/**
 * WoonplaatsFilterContext — één gedeeld woonplaats-filter voor de panelen binnen
 * één subpoule (daguitslag, Stijgers & Dalers, heatmap). Waarde is "all" |
 * "none" (zonder woonplaats) | een exacte plaatsnaam.
 *
 * De Provider reset naar "all" zodra de subpoule wisselt. Buiten een Provider
 * geeft useWoonplaatsFilter() een veilige no-op-fallback terug, zodat losse
 * gebruik (bijv. demo-varianten) niet crasht.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MapPin, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WoonplaatsFilter = {
  value: string;
  setValue: (v: string) => void;
  clear: () => void;
};

const noop = () => {};
const FALLBACK: WoonplaatsFilter = { value: "all", setValue: noop, clear: noop };

const WoonplaatsFilterContext = createContext<WoonplaatsFilter | null>(null);

export function WoonplaatsFilterProvider({
  subpouleId,
  children,
}: {
  subpouleId?: string | null;
  children: ReactNode;
}) {
  const [value, setValue] = useState<string>("all");

  // Reset het filter zodra van subpoule gewisseld wordt.
  useEffect(() => {
    setValue("all");
  }, [subpouleId]);

  const ctx = useMemo<WoonplaatsFilter>(
    () => ({ value, setValue, clear: () => setValue("all") }),
    [value],
  );

  return <WoonplaatsFilterContext.Provider value={ctx}>{children}</WoonplaatsFilterContext.Provider>;
}

/** Veilig ook buiten een Provider (no-op fallback). */
export function useWoonplaatsFilter(): WoonplaatsFilter {
  return useContext(WoonplaatsFilterContext) ?? FALLBACK;
}

type MemberLike = { woonplaats?: string | null };

/**
 * Presentational filter-select, gebonden aan de context. Leidt de woonplaatsen
 * af uit `members`; toont een wisknop (X) zodra er gefilterd wordt. Rendert
 * niets bij minder dan 2 woonplaatsen.
 */
export function WoonplaatsFilterSelect({ members }: { members: MemberLike[] }) {
  const { value, setValue, clear } = useWoonplaatsFilter();

  const woonplaatsen = useMemo(() => {
    const s = new Set<string>();
    for (const m of members) { const w = m.woonplaats?.trim(); if (w) s.add(w); }
    return [...s].sort((a, b) => a.localeCompare(b, "nl"));
  }, [members]);

  const zonderWoonplaatsCount = useMemo(
    () => members.filter((m) => !m.woonplaats?.trim()).length,
    [members],
  );

  if (woonplaatsen.length < 2) return null;

  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/70 shrink-0">
        <MapPin className="h-3 w-3" /> Woonplaats
      </span>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger className="h-8 w-auto min-w-[180px] max-w-full text-xs">
          <SelectValue placeholder={`Alle woonplaatsen (${members.length})`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Alle woonplaatsen ({members.length})</SelectItem>
          {woonplaatsen.map((plaats) => (
            <SelectItem key={plaats} value={plaats} className="text-xs">
              {plaats} ({members.filter((m) => m.woonplaats?.trim() === plaats).length})
            </SelectItem>
          ))}
          {zonderWoonplaatsCount > 0 && (
            <SelectItem value="none" className="text-xs">Zonder woonplaats ({zonderWoonplaatsCount})</SelectItem>
          )}
        </SelectContent>
      </Select>
      {value !== "all" && (
        <button
          type="button"
          onClick={clear}
          aria-label="Filter wissen"
          className="inline-flex items-center justify-center h-8 w-8 shrink-0 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
