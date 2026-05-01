import { useMemo, useRef, useState, useEffect } from "react";
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

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = useMemo(() => riders.find((r) => r.id === value) ?? null, [riders, value]);
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = riders.filter((r) => r.id !== value && !excludeSet.has(r.id));
    if (!q) return base.slice(0, 8);
    return base
      .filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          String(r.start_number ?? "").includes(q) ||
          (r.teamName ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [search, riders, value, excludeSet]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-2 text-sm">
        <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
          #{selected.start_number ?? "—"}
        </span>
        <span className="font-medium truncate">{selected.name}</span>
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
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-72 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onChange(r.id);
                setSearch("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                #{r.start_number ?? "—"}
              </span>
              <span className="font-medium">{r.name}</span>
              {r.teamName && (
                <span className="ml-auto text-xs text-muted-foreground">{r.teamName}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && search.trim() && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          Geen renners gevonden.
        </div>
      )}
    </div>
  );
}
