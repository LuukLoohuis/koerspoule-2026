/**
 * Meermarathon: hoe een wedstrijd heet op plekken die alleen een ritnummer
 * kennen, zoals het race-dossier dat onder een rijder in de Volgwagen
 * openklapt. Zonder provider blijft het "Etappe 3" met het terreinicoon, zoals
 * bij de wielergames.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { WedstrijdType } from "@/lib/gameTypes";

export type WedstrijdLabel = { label: string; soort: WedstrijdType };

const WedstrijdLabelsContext = createContext<ReadonlyMap<number, WedstrijdLabel> | null>(null);

export function WedstrijdLabelsProvider({
  labels,
  children,
}: {
  /** stage_number → "Cup 3" en de soort; null bij een wielergame. */
  labels: ReadonlyMap<number, WedstrijdLabel> | null;
  children: ReactNode;
}) {
  return <WedstrijdLabelsContext.Provider value={labels}>{children}</WedstrijdLabelsContext.Provider>;
}

export function useWedstrijdLabels(): ReadonlyMap<number, WedstrijdLabel> | null {
  return useContext(WedstrijdLabelsContext);
}
