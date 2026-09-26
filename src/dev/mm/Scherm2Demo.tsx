/**
 * Testbank-demo voor scherm 2, Ploeg samenstellen (zie src/dev-meermarathon.tsx).
 * Nepdata, geen database. De bouwers zijn bespeelbaar: kiezen, wisselen,
 * bevestigen en aanpassen werken op lokale staat, zodat je elke overgang kunt
 * zien. Mobiel tikken opent de echte lade.
 */
import { useState, type ReactNode } from "react";
import { Koersbalk, type KoersbalkItem } from "@/components/meermarathon/Koersbalk";
import {
  PloegSamenstellen,
  PloegSamenstellenGesloten,
  PloegSamenstellenLaden,
  type PloegSamenstellenGeslotenProps,
} from "@/components/meermarathon/PloegSamenstellen";
import { KandidatenLijst } from "@/components/meermarathon/PloegSamenstellenKiezer";
import {
  jokersNa,
  kandidaten,
  pickActies,
  type KiesDoel,
  type PsCategorie,
  type PsRijder,
} from "@/lib/ploegSamenstellen";

// Vaste deadline zoals in het ontwerp: vrijdag 13 november 2026, 23:59.
const DEADLINE = new Date(2026, 10, 13, 23, 59);

const r = (id: string, naam: string, ploeg: string, nummer: number | null): PsRijder => ({ id, naam, ploeg, nummer });

// Placeholders uit het ontwerp; de echte namen komen uit de database.
const CATEGORIEEN: PsCategorie[] = [
  {
    id: "c1",
    naam: "Toppers",
    max: 1,
    rijders: [
      r("sjoerd", "Sjoerd de Vries", "Team Noordelijk IJs", 1),
      r("bart", "Bart Hoekstra", "Ploeg Friesland", 2),
      r("jorrit", "Jorrit Bergsma", "Schaatsteam West", 3),
    ],
  },
  {
    id: "c2",
    naam: "Sprinters",
    max: 1,
    rijders: [
      r("gerben", "Gerben Postma", "Ploeg Friesland", 11),
      r("ruud", "Ruud Mulder", "IJsclub Oost", 12),
      r("arjen", "Arjen de Boer", "Team Noordelijk IJs", 13),
    ],
  },
  {
    id: "c3",
    naam: "Natuurijs",
    max: 1,
    rijders: [
      r("wouter", "Wouter Kramer", "Schaatsteam West", 21),
      r("klaas", "Klaas Wiersma", "Ploeg Friesland", 22),
    ],
  },
  {
    id: "c4",
    naam: "Vechters",
    max: 1,
    rijders: [
      r("hessel", "Hessel Visser", "Schaatsteam West", 31),
      r("thijs", "Thijs Bakker", "Team Noordelijk IJs", 32),
      r("jelle", "Jelle Smit", "Ploeg Friesland", 33),
      r("marco", "Marco Dekker", "IJsclub Oost", 34),
      r("niels", "Niels Brouwer", "Schaatsteam West", 35),
    ],
  },
  {
    id: "c5",
    naam: "Talent",
    max: 1,
    rijders: [
      r("sem", "Sem Kuipers", "IJsclub Oost", 41),
      r("daan", "Daan Veenstra", "Ploeg Friesland", 42),
      r("finn", "Finn Jansen", "Team Noordelijk IJs", 43),
    ],
  },
];

const JOKERPOOL: PsRijder[] = [
  r("pieter", "Pieter Holwerda", "IJsclub Oost", 51),
  r("rik", "Rik Zwart", "Schaatsteam West", 52),
  r("tom", "Tom de Graaf", "Ploeg Friesland", null),
];

const DRIE: [string, string[]][] = [
  ["c1", ["sjoerd"]],
  ["c2", ["gerben"]],
  ["c3", ["wouter"]],
];
const VIJF: [string, string[]][] = [...DRIE, ["c4", ["hessel"]], ["c5", ["daan"]]];

const BALK: KoersbalkItem[] = [
  { id: "v", label: "Vrouwen", categorie: "vrouwen", seizoen: "26/27", pil: { tekst: "Ingeschreven", soort: "ingeschreven" } },
  { id: "m", label: "Mannen", categorie: "mannen", seizoen: "26/27", pil: { tekst: "Ploeg 3/5", soort: "let-op" } },
];

function DemoBalk({ pil }: { pil?: KoersbalkItem["pil"] }) {
  const [gekozen, setGekozen] = useState("m");
  const items = pil ? [BALK[0], { ...BALK[1], pil }] : BALK;
  return (
    <div className="pb-3">
      <Koersbalk items={items} selectedId={gekozen} onSelect={setGekozen} />
    </div>
  );
}

// ── Bespeelbare bouwer ────────────────────────────────────────────────────

type Start = {
  gekozen?: [string, string[]][];
  jokers?: string[] | null;
  naam?: string;
  ingediend?: boolean;
  heropend?: boolean;
  ingelogd?: boolean;
};

function DemoBouwer({ start }: { start: Start }) {
  const [gekozen, setGekozen] = useState(() => new Map(start.gekozen ?? []));
  const [jokerIds, setJokerIds] = useState<string[]>(start.jokers ?? []);
  const [naam, setNaam] = useState(start.naam ?? "");
  const [bewaard, setBewaard] = useState(start.naam ?? "");
  const [ingediend, setIngediend] = useState(start.ingediend ?? false);
  const [heropend, setHeropend] = useState(start.heropend ?? false);
  const ingelogd = start.ingelogd ?? true;

  const kies = (doel: KiesDoel, rijderId: string) => {
    // Net als in de app: uitgelogd kun je rondkijken, niet kiezen.
    if (!ingelogd) return;
    if (doel.soort === "joker") return setJokerIds(jokersNa(jokerIds, doel.plek, rijderId));
    const cat = CATEGORIEEN.find((c) => c.id === doel.categorieId)!;
    const inCat = gekozen.get(cat.id) ?? [];
    let ids = [...inCat];
    for (const a of pickActies({ max: cat.max, inCategorie: inCat, oud: inCat[doel.plek] ?? null, nieuw: rijderId })) {
      if (a.soort === "vervang") ids = [a.rijderId];
      else ids = ids.includes(a.rijderId) ? ids.filter((x) => x !== a.rijderId) : [...ids, a.rijderId];
    }
    setGekozen(new Map(gekozen).set(cat.id, ids));
  };

  const haalWeg = (doel: KiesDoel) => {
    if (doel.soort === "joker") return setJokerIds(jokersNa(jokerIds, doel.plek, null));
    const inCat = gekozen.get(doel.categorieId) ?? [];
    setGekozen(new Map(gekozen).set(doel.categorieId, inCat.filter((_, i) => i !== doel.plek)));
  };

  return (
    <PloegSamenstellen
      koersbalk={<DemoBalk />}
      gameNaam="Meermarathon Mannen"
      categorieen={CATEGORIEEN}
      gekozen={gekozen}
      jokers={start.jokers === null ? null : { pool: JOKERPOOL, gekozen: jokerIds, vermenigvuldiger: 2 }}
      ploegnaam={naam}
      ploegnaamBewaard={naam.trim() === bewaard.trim()}
      deadline={DEADLINE}
      ingelogd={ingelogd}
      ingediend={ingediend}
      heropend={heropend}
      bezig={null}
      volgwagenPad="/mijn-peloton?tab=team"
      actiebalk="inline"
      onPloegnaam={setNaam}
      onPloegnaamKlaar={() => setBewaard(naam)}
      onKies={kies}
      onHaalWeg={haalWeg}
      onOpslaan={() => setBewaard(naam)}
      onBevestigen={() => {
        setBewaard(naam);
        setIngediend(true);
        setHeropend(false);
      }}
      onAanpassen={() => {
        setIngediend(false);
        setHeropend(true);
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
  const rijen = kandidaten(CATEGORIEEN[3].rijders, { huidig: null, bezet: new Set(), zoek });
  return (
    <div className="flex h-full flex-col justify-end bg-foreground/60">
      <div className="flex max-h-[88%] flex-col rounded-t-[10px] border bg-background">
        <div aria-hidden className="mx-auto mt-4 h-2 w-[100px] shrink-0 rounded-full bg-muted" />
        <div className="px-4 pb-2 pt-3">
          <p className="heading-oswald m-0 text-[22px] text-foreground">Categorie 4 · Vechters</p>
          <p className="m-0 mt-1 text-sm text-muted-foreground">Kies één rijder.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          <KandidatenLijst
            rijen={rijen}
            totaal={CATEGORIEEN[3].rijders.length}
            zoek={zoek}
            onZoek={setZoek}
            actie={{ kiesbaar: true, bezig: false, huidigeNaam: null, onKies: () => {}, onHaalWeg: () => {} }}
          />
        </div>
      </div>
    </div>
  );
}

const GESLOTEN_BASIS: Omit<PloegSamenstellenGeslotenProps, "reden" | "eigen" | "alternatief"> = {
  gameNaam: "Meermarathon Mannen",
  label: "Mannen",
  volgwagenPad: "/mijn-peloton?tab=team",
  uitslagenPad: "/uitslagen",
  onAlternatief: () => {},
};

export default function Scherm2Demo() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-start gap-6">
        <Mobiel titel="02a · Mannen, ploeg 3/5">
          <DemoBouwer start={{ gekozen: DRIE, naam: "De Klapschaatsers", jokers: null }} />
        </Mobiel>
        <Mobiel titel="Lade: kiezen in een categorie" hoogte={640}>
          <LadeInhoud />
        </Mobiel>
        <Mobiel titel="Met jokers, 5/5 compleet">
          <DemoBouwer start={{ gekozen: VIJF, naam: "De Klapschaatsers", jokers: ["pieter"] }} />
        </Mobiel>
        <Mobiel titel="Ingeschreven">
          <DemoBouwer start={{ gekozen: VIJF, naam: "De Klapschaatsers", jokers: null, ingediend: true }} />
        </Mobiel>
        <Mobiel titel="Na Aanpassen: weer concept">
          <DemoBouwer start={{ gekozen: VIJF, naam: "De Klapschaatsers", jokers: null, heropend: true }} />
        </Mobiel>
        <Mobiel titel="Niet ingelogd">
          <DemoBouwer start={{ ingelogd: false, jokers: null }} />
        </Mobiel>
        <Mobiel titel="Gesloten, je doet mee" hoogte={620}>
          <PloegSamenstellenGesloten
            {...GESLOTEN_BASIS}
            koersbalk={<DemoBalk pil={{ tekst: "Ingeschreven", soort: "ingeschreven" }} />}
            reden="gesloten"
            eigen={{ fase: "ingeschreven", ploegnaam: "De Klapschaatsers" }}
            alternatief={null}
          />
        </Mobiel>
        <Mobiel titel="Gesloten, niet meegedaan · Vrouwen wel open" hoogte={620}>
          <PloegSamenstellenGesloten
            {...GESLOTEN_BASIS}
            koersbalk={<DemoBalk pil={{ tekst: "Meekijken", soort: "neutraal" }} />}
            reden="gesloten"
            eigen={{ fase: "niet-ingeschreven", ploegnaam: null }}
            alternatief={{ id: "v", label: "Vrouwen" }}
          />
        </Mobiel>
        <Mobiel titel="Nog niet open" hoogte={620}>
          <PloegSamenstellenGesloten
            {...GESLOTEN_BASIS}
            koersbalk={<DemoBalk pil={{ tekst: "Inschrijving open", soort: "open" }} />}
            reden="nog-niet-open"
            eigen={null}
            alternatief={null}
          />
        </Mobiel>
        <Mobiel titel="Laden" hoogte={620}>
          <PloegSamenstellenLaden koersbalk={<DemoBalk />} />
        </Mobiel>
      </div>

      <Desktop titel="02b · Desktop, Mannen 3/5">
        <DemoBouwer start={{ gekozen: DRIE, naam: "De Klapschaatsers", jokers: null }} />
      </Desktop>
      <Desktop titel="Desktop · met jokers">
        <DemoBouwer start={{ gekozen: DRIE, naam: "De Klapschaatsers", jokers: ["pieter"] }} />
      </Desktop>
      <Desktop titel="Desktop · ingeschreven">
        <DemoBouwer start={{ gekozen: VIJF, naam: "De Klapschaatsers", jokers: null, ingediend: true }} />
      </Desktop>
      <Desktop titel="Desktop · gesloten">
        <PloegSamenstellenGesloten
          {...GESLOTEN_BASIS}
          koersbalk={<DemoBalk />}
          reden="gesloten"
          eigen={{ fase: "onvolledig", ploegnaam: null }}
          alternatief={{ id: "v", label: "Vrouwen" }}
        />
      </Desktop>
    </div>
  );
}
