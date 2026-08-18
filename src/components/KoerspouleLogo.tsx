import type { ImgHTMLAttributes } from "react";
import { useThema } from "@/contexts/ThemaContext";

export type KoerspouleLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src">;
export type RaceKey = "giro" | "tdf" | "vuelta" | "femmes" | "meermarathon";

/**
 * Het enige Koerspoule-logo voor de client-app.
 *
 * De asset komt uit dezelfde centrale game-/themaconfiguratie als de overige
 * accentkleuren. Een wissel in SelectedGameContext werkt daardoor zonder
 * pagina-refresh door in iedere instantie van dit component.
 */
export default function KoerspouleLogo({
  alt = "Koerspoule logo",
  width,
  height,
  decoding = "async",
  ...props
}: KoerspouleLogoProps) {
  const { thema } = useThema();
  // Reserveer de ruimte in de verhouding van dít logo. Stond hier vast op
  // 480x320, waardoor de koptekst sprong zodra een logo met een andere vorm
  // binnen was — het Vuelta-schild is bijna vierkant.
  const intrinsicSize =
    width == null && height == null
      ? { width: Math.round(320 * thema.logoVerhouding), height: 320 }
      : { width, height };

  return (
    <img
      {...props}
      {...intrinsicSize}
      src={thema.logo}
      alt={alt}
      decoding={decoding}
    />
  );
}
