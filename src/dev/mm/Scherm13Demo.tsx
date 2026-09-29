/**
 * Testbank-demo voor scherm 13 (zie src/dev-meermarathon.tsx): de kop van een
 * Meermarathon-pagina op een schaatsfoto, met de naam van de fotograaf
 * rechtsonder. Nepdata, geen database.
 *
 * De koppen schakelen op de vensterbreedte (md:), niet op het kader: voor de
 * telefoonversie kijk je met een smal venster (telefoon-emulatie).
 */
import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import KopOpFoto from "@/components/meermarathon/KopOpFoto";
import { KOP_FOTO } from "@/lib/meermarathonFotos";
import { cn } from "@/lib/utils";

/** Zelfde opbouw en klassen als de kop in ResultsView. */
function UitslagenKop() {
  return (
    <div className="flex flex-col items-center text-center gap-2">
      <span className="overline-stamp">— Bulletin Officiel —</span>
      <h1 className="heading-oswald text-4xl md:text-5xl">Uitslagen &amp; Klassement</h1>
      <p className="text-muted-foreground font-serif italic">Meermarathon Mannen 2026-2027</p>
      <div className="mt-2 flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 retro-border bg-card text-xs font-sans">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <span>
            Bijgewerkt t/m <strong>Cup 3</strong> (14 nov)
          </span>
        </div>
      </div>
    </div>
  );
}

/** Zelfde opbouw en klassen als de kop in pages/MijnPeloton. */
function PelotonKop() {
  return (
    <div className="flex flex-col items-center text-center gap-1 md:gap-2">
      <span className="overline-stamp">— Bulletin du Peloton —</span>
      <h1 className="heading-oswald text-3xl md:text-5xl">Mijn Peloton</h1>
      <p className="hidden md:block text-muted-foreground font-serif italic max-w-md">
        Welkom terug, Marieke! Beheer je koersen en subpoules.
      </p>
    </div>
  );
}

/** `content-font`: op de site staat de kop binnen <main>, dus in Inter. */
function Kader({ titel, breed = false, children }: { titel: string; breed?: boolean; children: ReactNode }) {
  return (
    <figure className="m-0 space-y-2">
      <figcaption className="text-xs font-semibold text-muted-foreground">{titel}</figcaption>
      <div className="max-w-full overflow-x-auto">
        <div
          className={cn(
            "content-font shrink-0 rounded-lg border border-dashed border-border bg-background",
            breed ? "w-[1160px] px-5 py-6" : "w-[390px] px-3 py-4",
          )}
        >
          {children}
        </div>
      </div>
    </figure>
  );
}

export default function Scherm13Demo() {
  return (
    <div className="space-y-10">
      <Kader titel="Desktop · Uitslagen (ook bij het totaal): het peloton voor de bergen" breed>
        <KopOpFoto foto={KOP_FOTO.uitslagen}>
          <UitslagenKop />
        </KopOpFoto>
      </Kader>
      <Kader titel="Desktop · Mijn Peloton: het peloton voor de stad, in de mist" breed>
        <KopOpFoto foto={KOP_FOTO.peloton}>
          <PelotonKop />
        </KopOpFoto>
      </Kader>
      <div className="flex flex-wrap items-start gap-6">
        <Kader titel="Smal kader · Uitslagen">
          <KopOpFoto foto={KOP_FOTO.uitslagen}>
            <UitslagenKop />
          </KopOpFoto>
        </Kader>
        <Kader titel="Smal kader · Mijn Peloton">
          <KopOpFoto foto={KOP_FOTO.peloton}>
            <PelotonKop />
          </KopOpFoto>
        </Kader>
      </div>
    </div>
  );
}
