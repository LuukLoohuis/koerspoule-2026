/**
 * Mijn Meermarathon — bovenaan de Krant: per game (Vrouwen, Mannen) waar je
 * staat en wat je nu moet doen. Dit is de dunne container met de data; de
 * weergave staat in MijnMeermarathonOverzicht.
 */
import { useSelectedGame } from "@/context/SelectedGameContext";
import { useMeermarathonSeizoen } from "@/hooks/useMeermarathonSeizoen";
import { MijnMeermarathonLaden, MijnMeermarathonOverzicht } from "@/components/meermarathon/MijnMeermarathonOverzicht";

export default function MijnMeermarathon({
  onNaarVolgwagen,
  onRondkijken,
}: {
  /** Kies deze game en ga naar de Volgwagen. */
  onNaarVolgwagen: (gameId: string) => void;
  /** Kies deze game en ga naar zijn Uitslagen ("Eerst rondkijken", "Bekijk het klassement"). */
  onRondkijken?: (gameId: string) => void;
}) {
  const { selectedGame } = useSelectedGame();
  const { seizoen, statussen, isLoading, error } = useMeermarathonSeizoen();

  if (seizoen.length === 0) return null;
  if (isLoading) return <MijnMeermarathonLaden />;
  if (error) {
    // Het IJsjournaal eronder werkt los hiervan; één rustige regel volstaat.
    return (
      <p className="mb-8 text-sm text-muted-foreground">
        Je Meermarathon-overzicht is nu niet te laden. Probeer het straks opnieuw.
      </p>
    );
  }
  if (statussen.length === 0) return null;

  return (
    <MijnMeermarathonOverzicht
      statussen={statussen}
      gekozenGameId={selectedGame?.id ?? null}
      nu={new Date()}
      onNaarVolgwagen={onNaarVolgwagen}
      onRondkijken={onRondkijken}
    />
  );
}
