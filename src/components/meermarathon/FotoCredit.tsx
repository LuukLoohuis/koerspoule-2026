/**
 * Naamsvermelding op een schaatsfoto: een cameraatje met de naam van de
 * fotograaf, rechtsonder in de hoek. Een tik opent haar site.
 *
 * Het donkere vlakje houdt de naam leesbaar, of er nu nachtlucht of sneeuw
 * achter staat.
 */
import { Camera } from "lucide-react";
import type { Fotograaf } from "@/lib/meermarathonFotos";
import { cn } from "@/lib/utils";

export default function FotoCredit({ fotograaf, className }: { fotograaf: Fotograaf; className?: string }) {
  return (
    <a
      href={fotograaf.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Foto: ${fotograaf.naam} (opent in een nieuw venster)`}
      className={cn(
        "absolute bottom-1 right-1.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-px",
        "font-inter text-[10px] font-medium leading-[14px] text-white no-underline",
        "outline-hidden transition-colors hover:bg-black/80",
        "focus-visible:ring-2 focus-visible:ring-white",
        className,
      )}
    >
      <Camera aria-hidden className="size-3 shrink-0" strokeWidth={2} />
      {fotograaf.naam}
    </a>
  );
}
