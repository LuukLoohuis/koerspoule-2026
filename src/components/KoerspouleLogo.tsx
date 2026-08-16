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
  const intrinsicSize = width == null && height == null ? { width: 480, height: 320 } : { width, height };

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
