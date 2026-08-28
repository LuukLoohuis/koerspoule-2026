import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

/**
 * Subpoule kiezen op het tableau de bord in de Volgwagen.
 *
 * Zelfde gedrag als de kiezer in de Krant -- klikken, typen, kiezen -- maar in
 * de chroom van het bord: mono kapitalen op crème, amberkleurige ring. Een
 * gewone select liet je niet zoeken, en wie in vijftien subpoules zit scrolt
 * zich suf.
 *
 * Vanaf zes poules komt er een zoekveld bij, net als in de Krant: daaronder is
 * scrollen sneller dan typen.
 */
export const ZOEK_VANAF = 6;

export default function SubpouleKiezerBord({
  subpoules,
  selectedId,
  onSelect,
  ariaLabel,
}: {
  subpoules: Array<{ id: string; name: string }>;
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  ariaLabel: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const huidig = subpoules.find((s) => s.id === selectedId) ?? null;
  const metZoek = subpoules.length >= ZOEK_VANAF;

  if (subpoules.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "flex h-7 min-w-[140px] max-w-[220px] items-center gap-1.5 rounded-md px-2.5",
            "font-mono text-[10px] font-bold uppercase tracking-[0.14em]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D49A1A]",
          )}
          style={{
            background: "rgba(26,22,18,0.06)",
            color: "#0F0F10",
            boxShadow: "inset 0 0 0 1px rgba(26,22,18,0.22)",
          }}
        >
          <span className="min-w-0 flex-1 truncate text-left">
            {huidig?.name ?? "Subpoule"}
          </span>
          <ChevronDown
            className={cn("h-3.5 w-3.5 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[248px] overflow-hidden rounded-lg border border-[rgba(26,22,18,0.22)] p-1"
        style={{ background: "#F5EFE0" }}
      >
        <Command>
          {metZoek && (
            <div className="flex items-center gap-2 px-1.5 pb-1">
              <Search className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
              <CommandInput
                placeholder={t("karavaan.switcher.searchPlaceholder")}
                className="h-8 border-0 p-0 font-mono text-[11px] uppercase tracking-[0.1em] focus:ring-0"
              />
            </div>
          )}
          <CommandList className="max-h-[264px]">
            <CommandEmpty className="px-3 py-4 text-center font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
              {t("karavaan.switcher.empty")}
            </CommandEmpty>
            <CommandGroup className="p-0">
              {subpoules.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.name}
                  onSelect={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] aria-selected:bg-[rgba(26,22,18,0.08)]"
                >
                  <Check
                    className={cn("h-3.5 w-3.5 shrink-0", s.id === selectedId ? "opacity-100" : "opacity-0")}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
