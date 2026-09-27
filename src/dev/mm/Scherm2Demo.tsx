/**
 * Testbank-demo voor scherm 2, Ploeg samenstellen (zie src/dev-meermarathon.tsx).
 * Nepdata, geen database. De vrouwen en de mannen staan samen op één scherm.
 * De bouwers zijn bespeelbaar: meedoen, kiezen, wisselen, bevestigen en
 * aanpassen werken op lokale staat, zodat je elke overgang kunt zien. Mobiel
 * tikken opent de echte lade.
 */
import { useState, type ReactNode } from "react";
import { Pelotonbalk, type PelotonItem } from "@/components/meermarathon/Pelotonbalk";
import {
  PloegSamenstellen,
  PloegSamenstellenGesloten,
  PloegSamenstellenLaden,
  type PloegSamenstellenGeslotenProps,
  type PsPeloton,
} from "@/components/meermarathon/PloegSamenstellen";
import { KandidatenLijst } from "@/components/meermarathon/PloegSamenstellenKiezer";
import {
  kandidaten,
  pickActies,
  telling,
  type KiesDoel,
  type PsCategorie,
  type PsRijder,
  type PsVoorspellingen,
  type SluitReden,
} from "@/lib/ploegSamenstellen";

// Vaste deadline zoals in het ontwerp: vrijdag 13 november 2026, 23:59.
const DEADLINE = new Date(2026, 10, 13, 23, 59);

const r = (id: string, naam: string, ploeg: string, nummer: number | null): PsRijder => ({ id, naam, ploeg, nummer });

// Verzonnen namen; de echte komen uit de database.
const MANNEN: PsCategorie[] = [
  {
    id: "m1",
    naam: "Toppers",
    max: 1,
    rijders: [
      r("sjoerd", "Sjoerd de Vries", "Team Noordelijk IJs", 1),
      r("bart", "Bart Hoekstra", "Ploeg Friesland", 2),
      r("jorrit", "Jorrit Bosma", "Schaatsteam West", 3),
    ],
  },
  {
    id: "m2",
    naam: "Sprinters",
    max: 1,
    rijders: [
      r("gerben", "Gerben Postma", "Ploeg Friesland", 11),
      r("ruud", "Ruud Mulder", "IJsclub Oost", 12),
      r("arjen", "Arjen de Boer", "Team Noordelijk IJs", 13),
    ],
  },
  {
    id: "m3",
    naam: "Natuurijs",
    max: 1,
    rijders: [
      r("wouter", "Wouter Kramer", "Schaatsteam West", 21),
      r("klaas", "Klaas Wiersma", "Ploeg Friesland", 22),
    ],
  },
  {
    id: "m4",
    naam: "Vechters",
    max: 1,
    rijders: [
      r("hessel", "Hessel Visser", "Schaatsteam West", 31),
      r("thijs", "Thijs Bakker", "Team Noordelijk IJs", 32),
      r("jelle", "Jelle Smit", "Ploeg Friesland", 33),
      r("marco", "Marco Dekker", "IJsclub Oost", 34),
    ],
  },
  {
    id: "m5",
    naam: "Talent",
    max: 1,
    rijders: [
      r("sem", "Sem Kuipers", "IJsclub Oost", 41),
      r("daan", "Daan Veenstra", "Ploeg Friesland", 42),
      r("finn", "Finn Jansen", "Team Noordelijk IJs", 43),
    ],
  },
];

const VROUWEN: PsCategorie[] = [
  {
    id: "v1",
    naam: "Toppers",
    max: 1,
    rijders: [
      r("anouk", "Anouk Visser", "Team Noordelijk IJs", 101),
      r("femke", "Femke Hoekstra", "Ploeg Friesland", 102),
      r("lotte", "Lotte de Jong", "Schaatsteam West", 103),
    ],
  },
  {
    id: "v2",
    naam: "Sprinters",
    max: 1,
    rijders: [
      r("iris", "Iris Postma", "Ploeg Friesland", 111),
      r("marit", "Marit Kramer", "IJsclub Oost", 112),
    ],
  },
  {
    id: "v3",
    naam: "Natuurijs",
    max: 1,
    rijders: [
      r("nynke", "Nynke Wiersma", "Ploeg Friesland", 121),
      r("jildou", "Jildou Smit", "Schaatsteam West", 122),
    ],
  },
  {
    id: "v4",
    naam: "Vechters",
    max: 1,
    rijders: [
      r("sanne", "Sanne Bakker", "Team Noordelijk IJs", 131),
      r("rixt", "Rixt Brouwer", "Schaatsteam West", 132),
      r("tessa", "Tessa Mulder", "IJsclub Oost", 133),
    ],
  },
  {
    id: "v5",
    naam: "Talent",
    max: 1,
    rijders: [
      r("ymkje", "Ymkje de Boer", "IJsclub Oost", 141),
      r("sietske", "Sietske Veenstra", "Ploeg Friesland", 142),
    ],
  },
];

// Rijders op de startlijst die in geen categorie staan: niet te kiezen voor
// je ploeg, wel als klassementswinnaar in de pronostiek.
const START_M: PsRijder[] = [...MANNEN.flatMap((c) => c.rijders), r("pieter", "Pieter Holwerda", "IJsclub Oost", 51)];
const START_V: PsRijder[] = [...VROUWEN.flatMap((c) => c.rijders), r("janna", "Janna Kuipers", "IJsclub Oost", 151)];

const M_DRIE: [string, string[]][] = [
  ["m1", ["sjoerd"]],
  ["m2", ["gerben"]],
  ["m3", ["wouter"]],
];
const M_VIJF: [string, string[]][] = [...M_DRIE, ["m4", ["hessel"]], ["m5", ["daan"]]];
const V_DRIE: [string, string[]][] = [
  ["v1", ["anouk"]],
  ["v2", ["iris"]],
  ["v3", ["nynke"]],
];
const V_VIJF: [string, string[]][] = [...V_DRIE, ["v4", ["sanne"]], ["v5", ["ymkje"]]];

// ── Bespeelbare bouwer ────────────────────────────────────────────────────

/** Hoe een peloton begint. Zonder start rijd je er (nog) niet mee. */
type PelotonStart = {
  gekozen?: [string, string[]][];
  naam?: string;
  ingediend?: boolean;
  heropend?: boolean;
  voorspeld?: Partial<PsVoorspellingen>;
  gesloten?: SluitReden;
};

type Staat = {
  meedoen: boolean;
  gekozen: Map<string, string[]>;
  naam: string;
  bewaard: string;
  ingediend: boolean;
  heropend: boolean;
  voorspeld: PsVoorspellingen;
};

function beginStaat(start: PelotonStart | undefined): Staat {
  return {
    meedoen: Boolean(start && !start.gesloten),
    gekozen: new Map(start?.gekozen ?? []),
    naam: start?.naam ?? "",
    bewaard: start?.naam ?? "",
    ingediend: start?.ingediend ?? false,
    heropend: start?.heropend ?? false,
    voorspeld: { cup: null, grandprix: null, ...start?.voorspeld },
  };
}

const PELOTONS = [
  { id: "v", label: "Vrouwen", categorie: "vrouwen" as const, cats: VROUWEN, start: START_V },
  { id: "m", label: "Mannen", categorie: "mannen" as const, cats: MANNEN, start: START_M },
];

function DemoBouwer({
  vrouwen,
  mannen,
  ingelogd = true,
}: {
  vrouwen?: PelotonStart;
  mannen?: PelotonStart;
  ingelogd?: boolean;
}) {
  const starts = { v: vrouwen, m: mannen };
  const [staat, setStaat] = useState<Record<string, Staat>>(() => ({ v: beginStaat(vrouwen), m: beginStaat(mannen) }));
  const [bezig, setBezig] = useState<"opslaan" | "bevestigen" | null>(null);
  const zet = (id: string, f: (s: Staat) => Partial<Staat>) => setStaat((oud) => ({ ...oud, [id]: { ...oud[id], ...f(oud[id]) } }));

  const pelotons: PsPeloton[] = PELOTONS.map((p) => {
    const s = staat[p.id];
    const basis = { id: p.id, label: p.label, categorie: p.categorie };
    const gesloten = starts[p.id as "v" | "m"]?.gesloten;
    if (gesloten) return { ...basis, stand: "gesloten", reden: gesloten, fase: null };
    if (!s.meedoen) {
      return {
        ...basis,
        stand: "uitnodiging",
        info: "Ploeg van vijf rijders · 9 wedstrijden · vanaf 31 okt",
        onMeedoen: () => zet(p.id, () => ({ meedoen: true })),
      };
    }
    const kies = (doel: KiesDoel, rijderId: string) => {
      // Net als in de app: uitgelogd kun je rondkijken, niet kiezen.
      if (!ingelogd) return;
      if (doel.soort === "voorspelling") return zet(p.id, (x) => ({ voorspeld: { ...x.voorspeld, [doel.klassement]: rijderId } }));
      const cat = p.cats.find((c) => c.id === doel.categorieId)!;
      zet(p.id, (x) => {
        const inCat = x.gekozen.get(cat.id) ?? [];
        let ids = [...inCat];
        for (const a of pickActies({ max: cat.max, inCategorie: inCat, oud: inCat[doel.plek] ?? null, nieuw: rijderId })) {
          if (a.soort === "vervang") ids = [a.rijderId];
          else ids = ids.includes(a.rijderId) ? ids.filter((y) => y !== a.rijderId) : [...ids, a.rijderId];
        }
        return { gekozen: new Map(x.gekozen).set(cat.id, ids) };
      });
    };
    return {
      ...basis,
      stand: "bouwen",
      bouw: {
        categorieen: p.cats,
        gekozen: s.gekozen,
        pronostiek: { rijders: p.start, gekozen: s.voorspeld, wijzigbaar: ingelogd },
        ploegnaam: s.naam,
        ploegnaamBewaard: s.naam.trim() === s.bewaard.trim(),
        ingediend: s.ingediend,
        heropend: s.heropend,
        bezig: null,
        onPloegnaam: (naam) => zet(p.id, () => ({ naam })),
        onPloegnaamKlaar: () => zet(p.id, (x) => ({ bewaard: x.naam })),
        onKies: kies,
        onHaalWeg: (doel) => {
          if (doel.soort === "voorspelling") return zet(p.id, (x) => ({ voorspeld: { ...x.voorspeld, [doel.klassement]: null } }));
          zet(p.id, (x) => ({
            gekozen: new Map(x.gekozen).set(
              doel.categorieId,
              (x.gekozen.get(doel.categorieId) ?? []).filter((_, i) => i !== doel.plek),
            ),
          }));
        },
        onAanpassen: () => zet(p.id, () => ({ ingediend: false, heropend: true })),
        onNietMeedoen: () => zet(p.id, () => ({ meedoen: false })),
      },
    };
  });

  return (
    <PloegSamenstellen
      gameNaam="Meermarathon 2026-2027"
      pelotons={pelotons}
      deadline={DEADLINE}
      ingelogd={ingelogd}
      bezig={bezig}
      volgwagenPad="/mijn-peloton?tab=team"
      actiebalk="inline"
      onOpslaan={() => {
        for (const p of PELOTONS) zet(p.id, (x) => ({ bewaard: x.naam }));
      }}
      onBevestigen={() => {
        setBezig("bevestigen");
        for (const p of PELOTONS) {
          zet(p.id, (x) =>
            x.meedoen && !x.ingediend && telling(p.cats, x.gekozen).compleet
              ? { ingediend: true, heropend: false, bewaard: x.naam }
              : {},
          );
        }
        setBezig(null);
      }}
      onInloggen={() => {}}
    />
  );
}

// ── Kaders ────────────────────────────────────────────────────────────────

function Bijschrift({ children }: { children: ReactNode }) {
  return <figcaption className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</figcaption>;
}

/** 390px breed en scrollbaar; de actiebalk plakt onderin het kader. */
function Mobiel({ titel, hoogte = 860, children }: { titel: string; hoogte?: number; children: ReactNode }) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <Bijschrift>{titel}</Bijschrift>
      <div
        className="w-[390px] overflow-y-auto rounded-[14px] border border-border bg-background px-3 pt-1"
        style={{ height: hoogte }}
      >
        {children}
      </div>
    </figure>
  );
}

/** 1280px breed met 40px marge: de inhoud krijgt de 1200px uit het ontwerp. */
function Desktop({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <figure className="m-0 flex flex-col gap-2">
      <Bijschrift>{titel}</Bijschrift>
      <div className="overflow-x-auto rounded-[14px] border border-border">
        <div className="w-[1280px] bg-background px-10 pb-4 pt-7">{children}</div>
      </div>
    </figure>
  );
}

function LadeInhoud() {
  const [zoek, setZoek] = useState("");
  const rijen = kandidaten(MANNEN[3].rijders, { huidig: null, bezet: new Set(), zoek });
  return (
    <div className="flex h-full flex-col justify-end bg-foreground/60">
      <div className="flex max-h-[88%] flex-col rounded-t-[10px] border bg-background">
        <div aria-hidden className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-muted" />
        <div className="px-4 pb-2 pt-3">
          <p className="heading-oswald m-0 text-[22px] text-foreground">Mannen · Categorie 4 · Vechters</p>
          <p className="m-0 mt-1 text-sm text-muted-foreground">Kies één rijder.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <KandidatenLijst
            rijen={rijen}
            totaal={MANNEN[3].rijders.length}
            zoek={zoek}
            onZoek={setZoek}
            actie={{ kiesbaar: true, bezig: false, huidigeNaam: null, onKies: () => {}, onHaalWeg: () => {} }}
          />
        </div>
      </div>
    </div>
  );
}

const BALK: PelotonItem[] = [
  { id: "v", label: "Vrouwen", categorie: "vrouwen", soort: "meekijken", regel: "Meekijken" },
  { id: "m", label: "Mannen", categorie: "mannen", soort: "meedoen", regel: "48e van 986" },
];

function DemoBalk() {
  const [gekozen, setGekozen] = useState("m");
  return (
    <div className="pb-3">
      <Pelotonbalk seizoen={"’26-’27"} items={BALK} selectedId={gekozen} onSelect={setGekozen} />
    </div>
  );
}

const GESLOTEN_BASIS: Omit<PloegSamenstellenGeslotenProps, "reden" | "eigen"> = {
  gameNaam: "Meermarathon Mannen",
  label: "Mannen",
  volgwagenPad: "/mijn-peloton?tab=team",
  uitslagenPad: "/uitslagen",
};

export default function Scherm2Demo() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-start gap-6">
        <Mobiel titel="02a · Nieuw: nog nergens mee">
          <DemoBouwer />
        </Mobiel>
        <Mobiel titel="Vrouwen 3/5 · mannen niet (niet verplicht)" hoogte={1000}>
          <DemoBouwer vrouwen={{ gekozen: V_DRIE, naam: "De Klapschaatsers" }} />
        </Mobiel>
        <Mobiel titel="Allebei: vrouwen 5/5, mannen 3/5" hoogte={1000}>
          <DemoBouwer
            vrouwen={{ gekozen: V_VIJF, naam: "De Klapschaatsers" }}
            mannen={{ gekozen: M_DRIE, naam: "De Klapschaatsers" }}
          />
        </Mobiel>
        <Mobiel titel="Allebei compleet: één knop bevestigt beide" hoogte={1000}>
          <DemoBouwer
            vrouwen={{ gekozen: V_VIJF, naam: "De Klapschaatsers" }}
            mannen={{ gekozen: M_VIJF, naam: "De Klapschaatsers", voorspeld: { cup: "gerben" } }}
          />
        </Mobiel>
        <Mobiel titel="Vrouwen ingeschreven · mannen erbij" hoogte={1000}>
          <DemoBouwer vrouwen={{ gekozen: V_VIJF, naam: "De Klapschaatsers", ingediend: true }} mannen={{}} />
        </Mobiel>
        <Mobiel titel="Allebei ingeschreven">
          <DemoBouwer
            vrouwen={{ gekozen: V_VIJF, naam: "De Klapschaatsers", ingediend: true }}
            mannen={{ gekozen: M_VIJF, naam: "De Klapschaatsers", ingediend: true }}
          />
        </Mobiel>
        <Mobiel titel="Na Aanpassen: vrouwen weer concept" hoogte={1000}>
          <DemoBouwer
            vrouwen={{ gekozen: V_VIJF, naam: "De Klapschaatsers", heropend: true }}
            mannen={{ gekozen: M_VIJF, naam: "De Klapschaatsers", ingediend: true }}
          />
        </Mobiel>
        <Mobiel titel="Mannen gesloten, vrouwen open" hoogte={1000}>
          <DemoBouwer vrouwen={{ gekozen: V_DRIE }} mannen={{ gesloten: "gesloten" }} />
        </Mobiel>
        <Mobiel titel="Niet ingelogd">
          <DemoBouwer vrouwen={{}} ingelogd={false} />
        </Mobiel>
        <Mobiel titel="Lade: kiezen in een categorie" hoogte={640}>
          <LadeInhoud />
        </Mobiel>
        <Mobiel titel="Alles gesloten, je doet mee" hoogte={620}>
          <PloegSamenstellenGesloten
            {...GESLOTEN_BASIS}
            pelotonbalk={<DemoBalk />}
            reden="gesloten"
            eigen={{ fase: "ingeschreven", ploegnaam: "De Klapschaatsers" }}
          />
        </Mobiel>
        <Mobiel titel="Nog niet open" hoogte={620}>
          <PloegSamenstellenGesloten {...GESLOTEN_BASIS} pelotonbalk={<DemoBalk />} reden="nog-niet-open" eigen={null} />
        </Mobiel>
        <Mobiel titel="Laden" hoogte={620}>
          <PloegSamenstellenLaden />
        </Mobiel>
      </div>

      <Desktop titel="02b · Desktop, vrouwen 3/5 · mannen niet">
        <DemoBouwer vrouwen={{ gekozen: V_DRIE, naam: "De Klapschaatsers" }} />
      </Desktop>
      <Desktop titel="Desktop · allebei: vrouwen 5/5, mannen 3/5">
        <DemoBouwer
          vrouwen={{ gekozen: V_VIJF, naam: "De Klapschaatsers" }}
          mannen={{ gekozen: M_DRIE, naam: "De Klapschaatsers" }}
        />
      </Desktop>
      <Desktop titel="Desktop · nieuw: nog nergens mee">
        <DemoBouwer />
      </Desktop>
      <Desktop titel="Desktop · allebei ingeschreven">
        <DemoBouwer
          vrouwen={{ gekozen: V_VIJF, naam: "De Klapschaatsers", ingediend: true }}
          mannen={{ gekozen: M_VIJF, naam: "De Klapschaatsers", ingediend: true }}
        />
      </Desktop>
    </div>
  );
}
