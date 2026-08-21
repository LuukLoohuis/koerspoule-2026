import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

/** Twee letters uit de naam; genoeg om een poule te herkennen in een bolletje. */
function initialen(naam: string): string {
  const woorden = naam.trim().split(/\s+/).filter((w) => /\p{L}|\p{N}/u.test(w));
  if (woorden.length === 0) return "?";
  if (woorden.length === 1) return woorden[0].slice(0, 2).toUpperCase();
  return (woorden[0][0] + woorden[1][0]).toUpperCase();
}

/**
 * Subpoule kiezen vanuit de standbalk van de Krant.
 *
 * Zit links in die balk als knop; het menu opent eronder. Vanaf zes poules komt
 * er een zoekveld bij -- daaronder is scrollen sneller dan typen, en een leeg
 * zoekveld in een lijst van drie is alleen maar ruis.
 */
export default function SubpouleKiezer({
  subpoules,
  selectedId,
  onSelect,
}: {
  subpoules: Array<{ id: string; name: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const huidig = subpoules.find((s) => s.id === selectedId) ?? null;
  const kanWisselen = subpoules.length > 1;
  const metZoek = subpoules.length >= 6;

  if (subpoules.length === 0) return null;

  const knop = (
    <span
      className={cn(
        "flex h-full min-w-[150px] items-center gap-2.5 px-3 py-2.5 text-left transition-colors sm:min-w-[168px]",
        kanWisselen && "cursor-pointer hover:bg-secondary/70",
      )}
    >
      <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-semibold text-background">
        {huidig ? initialen(huidig.name) : "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block max-w-[112px] truncate text-[12.5px] font-semibold leading-tight">
          {huidig?.name ?? t("karavaan.switcher.placeholder")}
        </span>
        <span className="mt-0.5 block text-[9.5px] font-medium text-muted-foreground">
          {t("karavaan.voorpagina.jouwSubpoule")}
        </span>
      </span>
      {kanWisselen && (
        <ChevronDown
          aria-hidden
          className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      )}
    </span>
  );

  // Eén subpoule: geen menu, alleen de naam. Een dropdown met één keuze is een
  // knop die niets doet.
  if (!kanWisselen) return knop;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={t("karavaan.switcher.aria")}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))]"
        >
          {knop}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          "w-[248px] overflow-hidden rounded-2xl border-0 p-1",
          // Matglas zoals een systeemmenu; valt terug op een dekkend vlak waar
          // backdrop-filter niet werkt.
          "bg-popover/85 backdrop-blur-xl supports-[not(backdrop-filter:blur(0))]:bg-popover",
          "shadow-[0_2px_6px_rgba(0,0,0,0.07),0_18px_34px_-18px_rgba(0,0,0,0.4)] ring-1 ring-border/70",
        )}
      >
        <Command>
          <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {t("karavaan.switcher.label")}
          </p>
          {metZoek && (
            <div className="flex items-center gap-2 px-1.5 pb-1">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <CommandInput
                placeholder={t("karavaan.switcher.searchPlaceholder")}
                className="h-8 border-0 p-0 text-[13.5px] focus:ring-0"
              />
            </div>
          )}
          <CommandList className="max-h-[264px]">
            <CommandEmpty className="px-3 py-4 text-center text-[13px] text-muted-foreground">
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
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-[13.5px]"
                >
                  <span
                    className={cn(
                      "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                      s.id === selectedId ? "bg-foreground text-background" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {initialen(s.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {s.id === selectedId && <Check className="h-4 w-4 shrink-0 text-[hsl(var(--vintage-gold))]" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
