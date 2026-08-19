/**
 * MobielTabBalk — de subbalk op de telefoon. Moet door de ouder in md:hidden
 * gewikkeld worden; de webversie heeft zijn eigen balk (RetroTabs).
 *
 * Onderstreepte labels, dezelfde vorm als de segment-variant op de webversie:
 * niveau 1 is een object (de onderbalk), niveau 2 is typografie. Dat scheelt
 * ook hoogte — de balk met kader en gevulde pillen was 52px, dit is 38.
 *
 * Eén vorm voor elk aantal tabs. Hiervoor was het een uitgerekte pill tot en
 * met drie tabs en losse chips vanaf vier, waardoor de Volgwagen van vorm
 * wisselde zodra Live erbij kwam.
 *
 * De kleuren komen uit de themavariabelen. Ze stonden hier als vaste hexcodes
 * (#EDE8DF / #C8B89A / #7A6A5A), zodat de balk bij Meermarathon perkament bleef
 * terwijl de rest van de site ijsblauw werd.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useUitgelichtSubtab } from "@/components/Rondleiding";

export type MobielTab = {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

type Props = {
  tabs: MobielTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
};

export function MobielTabBalk({ tabs, active, onChange, className }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Zie RetroTabs: het besproken tabje komt boven de verduistering uit.
  const uitgelichtSub = useUitgelichtSubtab();

  // De actieve tab in beeld houden. Anders sta je na een veeg naar het laatste
  // onderdeel te kijken naar een balk die nog op het eerste staat.
  //
  // offsetLeft rekent vanaf de dichtstbijzijnde gepositioneerde ouder, dus de
  // rij moet zelf `relative` zijn — anders meet je tegen een willekeurige
  // ouder verderop en scrollt de balk naar een plek die nergens op slaat.
  useEffect(() => {
    const el = activeRef.current;
    const box = scrollRef.current;
    if (!el || !box) return;
    const links = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
    box.scrollTo({ left: Math.max(0, links), behavior: "smooth" });
  }, [active]);

  return (
    <div
      ref={scrollRef}
      role="tablist"
      className={cn(
        "relative flex w-full items-end gap-5 overflow-x-auto border-b border-border pr-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            ref={isActive ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.key)}
            className={cn(
              "relative flex flex-none items-center gap-1.5 whitespace-nowrap border-0 bg-transparent",
              // Het raakvlak blijft 44px hoog; alleen de zichtbare hoogte krimpt.
              "min-h-[38px] pb-2 pt-2.5 text-[13px] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? "font-bold text-foreground" : "font-semibold text-muted-foreground",
              tab.key === uitgelichtSub && "z-[71] rounded-md bg-card px-2 ring-2 ring-[hsl(var(--vintage-gold))]",
              tab.disabled && "cursor-not-allowed opacity-40",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            <span>{tab.label}</span>
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-t-full bg-primary"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
