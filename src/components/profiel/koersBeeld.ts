/**
 * Het beeldmerk van een koers voor het profiel: het racerondje en de
 * algemeen-trui, dezelfde plaatjes als in het Palmares-paneel. Tour Femmes
 * deelt die van de Tour. Een onbekende koers heeft er geen: dan valt de
 * aanroeper terug op de vlag (KoersIcoon).
 */
import roundelGiro from "@/assets/palmares-roundel-giro.png";
import roundelMeermarathon from "@/assets/palmares-roundel-meermarathon.webp";
import roundelTour from "@/assets/palmares-roundel-tour.png";
import roundelVuelta from "@/assets/palmares-roundel-vuelta.png";
import truiGiro from "@/assets/trui-giro-algemeen.png";
import truiMeermarathon from "@/assets/trui-meermarathon-algemeen.png";
import truiTour from "@/assets/trui-tour-algemeen.png";
import truiVuelta from "@/assets/trui-vuelta-algemeen.png";
import { isMeermarathonGame } from "@/lib/gameTypes";

export type KoersBeeld = { rondje: string; trui: string };

export function koersBeeld(type: string | null | undefined): KoersBeeld | null {
  const k = String(type ?? "").toLowerCase();
  if (isMeermarathonGame(k)) return { rondje: roundelMeermarathon, trui: truiMeermarathon };
  if (k === "giro") return { rondje: roundelGiro, trui: truiGiro };
  if (k === "vuelta" || k === "vta") return { rondje: roundelVuelta, trui: truiVuelta };
  if (k === "tour" || k === "tdf" || k === "femmes") return { rondje: roundelTour, trui: truiTour };
  return null;
}
