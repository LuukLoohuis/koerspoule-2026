import { useCallback, useEffect, useState } from "react";

/**
 * De subpoule die je bekijkt, gedeeld door de Krant en de Volgwagen.
 *
 * Elk scherm had zijn eigen keuze: de Krant onthield de laatste, de Volgwagen
 * begon steeds bij de eerste. Wie in de Krant "Kantoor" koos, zag in de
 * Volgwagen de stand van een andere subpoule, met een ander getal.
 *
 * De sleutel is die van de Krant, zodat een eerder gemaakte keuze blijft staan.
 */
const SLEUTEL = "karavaan:lastSubpouleId";
const GEWIJZIGD = "kp:subpoule-gekozen";

function leesOpgeslagen(): string | null {
  try {
    return localStorage.getItem(SLEUTEL);
  } catch {
    return null;
  }
}

export function useGekozenSubpoule(
  subpoules: Array<{ id: string; name: string }>,
): [string | null, (id: string) => void] {
  const [opgeslagen, setOpgeslagen] = useState<string | null>(leesOpgeslagen);

  // Twee schermen kunnen tegelijk gemount zijn (desktop, carrousel). Een keuze
  // in het ene moet het andere meteen bijwerken, ook in een ander tabblad.
  useEffect(() => {
    const bijwerken = () => setOpgeslagen(leesOpgeslagen());
    const opStorage = (e: StorageEvent) => {
      if (e.key === SLEUTEL) bijwerken();
    };
    window.addEventListener(GEWIJZIGD, bijwerken);
    window.addEventListener("storage", opStorage);
    return () => {
      window.removeEventListener(GEWIJZIGD, bijwerken);
      window.removeEventListener("storage", opStorage);
    };
  }, []);

  const kies = useCallback((id: string) => {
    try {
      localStorage.setItem(SLEUTEL, id);
    } catch {
      /* geen opslag: de keuze geldt dan alleen voor dit scherm */
    }
    setOpgeslagen(id);
    window.dispatchEvent(new Event(GEWIJZIGD));
  }, []);

  // Geen (geldige) keuze? Dan de eerste op alfabet, zoals de Krant altijd deed.
  const geldig = opgeslagen && subpoules.some((s) => s.id === opgeslagen) ? opgeslagen : null;
  const standaard = subpoules.length
    ? [...subpoules].sort((a, b) => a.name.localeCompare(b.name))[0].id
    : null;

  return [geldig ?? standaard, kies];
}
