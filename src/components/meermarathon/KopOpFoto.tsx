/**
 * De kop van een Meermarathon-pagina op een schaatsfoto. Alleen bij de
 * Meermarathon; de wielerkoersen houden hun kop op papier.
 *
 * De tekst krijgt de nachtkleuren (.mm-balk-foto in
 * styles/meermarathon-thema.css), net als de uitslagenbalk: licht op de
 * gedimde foto, in licht én nacht leesbaar. Een lichte foto (`licht`) houdt
 * de inkt van het thema, op een witte waas.
 */
import type { ReactNode } from "react";
import FotoCredit from "@/components/meermarathon/FotoCredit";
import type { KopFoto } from "@/lib/meermarathonFotos";
import { cn } from "@/lib/utils";

export default function KopOpFoto({
  foto,
  children,
  className,
}: {
  foto: KopFoto;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-licht={foto.licht ? "" : undefined}
      className={cn("mm-kop-foto retro-border no-hover-lift relative overflow-hidden bg-card", className)}
    >
      <img
        src={foto.src}
        alt=""
        aria-hidden
        decoding="async"
        className="pointer-events-none absolute inset-0 size-full object-cover"
        style={{ objectPosition: foto.positie ?? "50% 60%" }}
      />
      <span aria-hidden className="mm-kop-waas pointer-events-none absolute inset-0" />
      {/* Onder de kop blijft een strook vrij: daar rijdt het peloton. */}
      <div
        className={cn(
          "relative px-4 pb-[72px] pt-5 text-card-foreground md:px-6 md:pb-[124px] md:pt-7",
          !foto.licht && "mm-balk-foto",
        )}
      >
        {children}
      </div>
      {foto.fotograaf && <FotoCredit fotograaf={foto.fotograaf} />}
    </div>
  );
}
