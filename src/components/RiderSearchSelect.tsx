import { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

export type RiderOption = {
  id: string;
  name: string;
  start_number: number | null;
  teamName?: string;
};

type Props = {
  riders: RiderOption[];
  value: string;
  onChange: (id: string) => void;
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
};

export default function RiderSearchSelect({
  riders,
  value,
  onChange,
  excludeIds = [],
  placeholder = "Zoek renner op naam of startnummer...",
  disabled,
}: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Positie van het dropdown-menu (fixed, in een portal → nooit afgekapt door een
  // overflow-ouder zoals het jokerpaneel of de pronostiek-sectie eronder).
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const place = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, 288);
    // Binnen het scherm houden (rechts niet over de rand).
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 4, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onScrollResize = () => place();
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [open, place]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = useMemo(() => riders.find((r) => r.id === value) ?? null, [riders, value]);
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const results = useMemo(() => {
    // Reeds elders gekozen renners NIET verbergen, maar gedimd tonen met label
    // "(al gekozen)". Zo kan een renner nooit "verdwijnen" uit de zoeklijst —
    // je ziet meteen dat/waar hij al in de uitslag staat.
    const base = riders.filter((r) => r.id !== value);
    // Token-gebaseerd zoeken: elk getypt woord moet ergens voorkomen (naam,
    // rugnummer of ploeg), ongeacht volgorde. Zo matcht "Silva Guillermo" ook
    // "Guillermo Thomas Silva", en worden leestekens zoals de asterisk op
    // uitslagenbladen ("SILVA Guillermo Thomas*") genegeerd.
    const tokens = search
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ""))
      .filter(Boolean);
    if (tokens.length === 0) return base;
    return base.filter((r) => {
      const hay = `${r.name} ${r.start_number ?? ""} ${r.teamName ?? ""}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [search, riders, value, excludeSet]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-2 text-sm">
        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
          #{selected.start_number ?? "—"}
        </span>
        <span className="font-medium truncate text-slate-800">{selected.name}</span>
        {selected.teamName && (
          <span className="text-xs text-muted-foreground truncate">{selected.teamName}</span>
        )}
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto text-muted-foreground hover:text-destructive"
            aria-label="Verwijder selectie"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  const showList = open && results.length > 0;
  const showEmpty = open && Boolean(search.trim()) && results.length === 0;

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
      />
      {(showList || showEmpty) && pos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[60] rounded-md border bg-popover shadow-lg"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {showList && (
              <div className="max-h-72 overflow-y-auto">
                {results.map((r) => {
                  const used = excludeSet.has(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={used}
                      onClick={() => {
                        if (used) return;
                        onChange(r.id);
                        setSearch("");
                        setOpen(false);
                      }}
                      className={
                        used
                          ? "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs opacity-40 cursor-not-allowed"
                          : "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent"
                      }
                      title={used ? "Staat al ergens in deze uitslag" : undefined}
                    >
                      <Plus className="h-3 w-3 text-foreground shrink-0" />
                      <span className="text-[11px] text-foreground tabular-nums w-7 text-right shrink-0">
                        #{r.start_number ?? "—"}
                      </span>
                      <span className="font-medium text-foreground truncate flex-1 min-w-0">{r.name}</span>
                      {used && (
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground shrink-0">al gekozen</span>
                      )}
                      {!used && r.teamName && (
                        <span className="text-[10px] text-foreground truncate max-w-[45%] shrink-0">{r.teamName}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {showEmpty && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Geen renners gevonden.</div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
