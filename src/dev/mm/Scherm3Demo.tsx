/**
 * Testbank-demo voor scherm 3, Volgwagen › Mijn ploeg (zie src/dev-meermarathon.tsx).
 * Nepdata, geen database: alleen de presentatiecomponenten, met een vaste
 * klok zodat de aftelling altijd hetzelfde laat zien als het ontwerp.
 */
import { useState, type ReactNode } from "react";
import VolgwagenPloeg, {
  VolgwagenPloegInrichting,
  VolgwagenPloegUitnodiging,
  type VolgwagenPloegProps,
} from "@/components/meermarathon/VolgwagenPloeg";
import { bouwAftelling, bouwPloegRijen, volgendeKaart, type PloegRijder } from "@/lib/meermarathonVolgwagen";
import type { MmWedstrijd } from "@/lib/meermarathonSeizoen";

// wo 11 nov 2026, 17:18: dan staat de aftelling op 2 dagen, 06 uur, 41 min.
const NU = new Date(2026, 10, 11, 17, 18);
const DEADLINE = new Date(2026, 10, 13, 23, 59);

const wedstrijd = (over: Partial<MmWedstrijd>): MmWedstrijd => ({
  id: `w${over.stage_number ?? 1}`,
  game_id: "demo-v",
  stage_number: 1,
  name: null,
  date: null,
  status: null,
  is_gc: false,
  results_status: null,
  ijs_type: "kunstijs",
  wedstrijd_type: "cup",
  aantal_rondes: 80,
  distance_km: null,
  ...over,
});

const CUP3 = wedstrijd({ stage_number: 3, date: "2026-11-14" });
const GP6 = wedstrijd({ stage_number: 6, date: "2026-11-21", ijs_type: "natuurijs", wedstrijd_type: "grandprix", aantal_rondes: null, distance_km: 60 });

const CATEGORIEEN = [
  { id: "top", name: "Toppers", max_picks: 1 },
  { id: "spr", name: "Sprinters", max_picks: 1 },
  { id: "nat", name: "Natuurijs", max_picks: 1 },
  { id: "vec", name: "Vechters", max_picks: 1 },
  { id: "tal", name: "Talent", max_picks: 1 },
];

const RIJDERS = new Map<string, PloegRijder>([
  ["r1", { name: "Lotte Bosma", team: "Team Noordelijk IJs" }],
  ["r2", { name: "Iris Kooistra", team: "Ploeg Friesland" }],
  ["r3", { name: "Jildou Terpstra", team: "Schaatsteam West" }],
  ["r4", { name: "Esmee Wijnia", team: "Schaatsteam West" }],
  ["r5", { name: "Noor Visser", team: "Team Noordelijk IJs" }],
]);
const PUNTEN = new Map([["r1", 54], ["r2", 38], ["r3", 0], ["r4", 32], ["r5", 22]]);

const alleVijf = CATEGORIEEN.map((c, i) => ({ category_id: c.id, rider_id: `r${i + 1}` }));

const BASIS: VolgwagenPloegProps = {
  gameId: "demo-v",
  label: "Vrouwen",
  categorie: "vrouwen",
  fase: "ingeschreven",
  ploegnaam: "De Klapschaatsers",
  ploegleider: "Luuk",
  klassement: { rank: 12, totaal: 1204 },
  punten: 146,
  subpoule: { id: "sp", naam: "De IJsvogels", rank: 2, totaal: 9 },
  rijen: bouwPloegRijen({ categorieen: CATEGORIEEN, picks: alleVijf, rijders: RIJDERS, punten: PUNTEN }),
  gekozen: 5,
  vereist: 5,
  volgende: volgendeKaart({ volgende: CUP3, wedstrijden: [CUP3] }),
  aftelling: bouwAftelling({ nu: NU, deadline: DEADLINE, wijzigbaar: true, wedstrijdDatum: CUP3.date }),
  deadline: DEADLINE,
  wijzigbaar: true,
};

function Frame({ titel, breedte, children }: { titel: string; breedte: number; children: ReactNode }) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {titel} · {breedte}px
      </figcaption>
      <div className="overflow-x-auto">
        <div style={{ width: breedte }} className="rounded-lg border border-dashed border-border bg-background px-3 pt-3">
          {children}
        </div>
      </div>
    </figure>
  );
}

/** Ploegnaam wijzigen werkt in de demo, maar alleen in het geheugen. */
function MetNaam(props: VolgwagenPloegProps) {
  const [naam, setNaam] = useState(props.ploegnaam);
  return (
    <VolgwagenPloeg
      {...props}
      ploegnaam={naam}
      onPloegnaam={async (n) => {
        setNaam(n.trim() || null);
        return true;
      }}
    />
  );
}

/** Zit je in meer dan één subpoule, dan kies je welke je in de Volgwagen ziet. */
function MeerdereSubpoules() {
  const opties = [
    { id: "sp", naam: "De IJsvogels", rank: 2, totaal: 9 },
    { id: "werk", naam: "Kantoor Noord", rank: 5, totaal: 14 },
  ];
  const [gekozen, setGekozen] = useState("sp");
  const sub = opties.find((o) => o.id === gekozen) ?? opties[0];
  return (
    <VolgwagenPloeg
      {...BASIS}
      subpoule={sub}
      subpouleKeuze={{ opties: opties.map(({ id, naam }) => ({ id, naam })), onKies: setGekozen }}
    />
  );
}

export default function Scherm3Demo() {
  const onvolledig = bouwPloegRijen({
    categorieen: CATEGORIEEN,
    picks: alleVijf.filter((_, i) => i === 0 || i === 1 || i === 4),
    rijders: RIJDERS,
    punten: null,
  });
  const vastMetAfmelding = bouwPloegRijen({
    categorieen: CATEGORIEEN,
    picks: alleVijf,
    rijders: new Map(RIJDERS).set("r3", { name: "Jildou Terpstra", team: "Schaatsteam West", is_vervallen: true }),
    punten: PUNTEN,
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start gap-8">
        <Frame titel="Ingeschreven, wissels nog open (03a)" breedte={390}>
          <MetNaam {...BASIS} />
        </Frame>

        <Frame titel="In twee subpoules: keuzelijst onder het cijfer" breedte={390}>
          <MeerdereSubpoules />
        </Frame>

        <Frame titel="Ploeg 3/5, voor het seizoen" breedte={390}>
          <MetNaam
            {...BASIS}
            fase="onvolledig"
            ploegnaam={null}
            klassement={null}
            punten={null}
            subpoule={{ id: "sp", naam: "De IJsvogels", rank: null, totaal: 9 }}
            rijen={onvolledig}
            gekozen={3}
          />
        </Frame>

        <Frame titel="Seizoen loopt: ploeg vast, geen subpoule, afmelding" breedte={390}>
          <VolgwagenPloeg
            {...BASIS}
            subpoule={null}
            rijen={vastMetAfmelding}
            wijzigbaar={false}
            deadline={null}
            volgende={volgendeKaart({ volgende: GP6, wedstrijden: [CUP3, GP6] })}
            aftelling={bouwAftelling({ nu: NU, deadline: null, wijzigbaar: false, wedstrijdDatum: GP6.date })}
          />
        </Frame>
      </div>

      <Frame titel="Ingeschreven, desktop (03b)" breedte={1200}>
        <MetNaam {...BASIS} />
      </Frame>

      <Frame titel="Smalle kolom naast de zijbalk van Mijn Peloton" breedte={900}>
        <MetNaam {...BASIS} />
      </Frame>

      <div className="flex flex-wrap items-start gap-8">
        <Frame titel="Wedstrijd vandaag, Mannen" breedte={390}>
          <VolgwagenPloeg
            {...BASIS}
            gameId="demo-m"
            label="Mannen"
            categorie="mannen"
            ploegnaam="Kluunploeg Oranje"
            wijzigbaar={false}
            deadline={null}
            volgende={volgendeKaart({ volgende: { ...CUP3, date: "2026-11-11", aantal_rondes: 125 }, wedstrijden: [CUP3] })}
            aftelling={bouwAftelling({ nu: NU, deadline: null, wijzigbaar: false, wedstrijdDatum: "2026-11-11" })}
          />
        </Frame>

        <Frame titel="Seizoen voorbij" breedte={390}>
          <VolgwagenPloeg
            {...BASIS}
            wijzigbaar={false}
            deadline={null}
            volgende={volgendeKaart({ volgende: null, wedstrijden: [CUP3] })}
            aftelling={{ soort: "geen" }}
          />
        </Frame>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <Frame titel="Nog geen ploeg, inschrijving open" breedte={390}>
          <VolgwagenPloegUitnodiging
            gameId="demo-m"
            label="Mannen"
            categorie="mannen"
            vereist={5}
            deadline={DEADLINE}
            wijzigbaar
            volgende={BASIS.volgende}
            aftelling={BASIS.aftelling}
          />
        </Frame>

        <Frame titel="Nog geen ploeg, inschrijving dicht" breedte={390}>
          <VolgwagenPloegUitnodiging
            gameId="demo-v"
            label="Vrouwen"
            categorie="vrouwen"
            vereist={5}
            deadline={null}
            wijzigbaar={false}
            volgende={volgendeKaart({ volgende: GP6, wedstrijden: [CUP3, GP6] })}
            aftelling={bouwAftelling({ nu: NU, deadline: null, wijzigbaar: false, wedstrijdDatum: GP6.date })}
          />
        </Frame>

        <Frame titel="Seizoen nog niet ingericht (beheerder)" breedte={390}>
          <VolgwagenPloegInrichting label="Vrouwen" beheerder />
        </Frame>
      </div>

      <Frame titel="Nog geen ploeg, desktop" breedte={1200}>
        <VolgwagenPloegUitnodiging
          gameId="demo-m"
          label="Mannen"
          categorie="mannen"
          vereist={5}
          deadline={DEADLINE}
          wijzigbaar
          volgende={volgendeKaart({ volgende: null, wedstrijden: [] })}
          aftelling={{ soort: "geen" }}
        />
      </Frame>
    </div>
  );
}
