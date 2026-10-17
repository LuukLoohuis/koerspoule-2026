// Bewaakt wat de live-tab uit echte velden opbouwt: de titel, de vier cijfers,
// de groepskaarten met hun gat tot het peloton, en "niet gestart" voor wie van
// jou niet in de uitslag van de bron staat.
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import LiveTab from "./LiveTab";
import { buildGroups, type LiveRider, type PointsSchema } from "@/lib/liveMarathon";
import type { LiveRace } from "@/hooks/useLiveRace";

const SCHEMA: PointsSchema = new Map(
  [50, 40, 32, 26, 22, 20, 18, 16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((p, i) => [i + 1, p]),
);

/** Veld zoals in het ontwerp: 1 uitloper, 7 kop (+6,4 s), 21 peloton, 10 achter (−11 s). */
function rijders(): LiveRider[] {
  const groepen = [
    { n: 1, ronden: 53, tijd: 20_000 },
    { n: 7, ronden: 52, tijd: 100_000 },
    { n: 21, ronden: 52, tijd: 106_400 },
    { n: 10, ronden: 52, tijd: 117_400 },
  ];
  const uit: LiveRider[] = [];
  for (const g of groepen)
    for (let k = 0; k < g.n; k += 1) {
      const nr = String(uit.length + 1).padStart(2, "0");
      uit.push({
        beennummer: nr,
        naam: `Rijder ${nr}`,
        aantalRonden: g.ronden,
        tijdSort: g.tijd + k * 300,
        meter: 100,
      } as LiveRider);
    }
  return uit;
}

function race(syncedAt = new Date().toISOString()): LiveRace {
  const r = rijders();
  return {
    stageId: "s3",
    stageNumber: 3,
    stageName: null,
    ijsType: "kunstijs",
    syncedAt,
    tracks: [
      {
        trackId: "Thialf",
        label: null,
        categorie: null,
        state: { totaalRonden: 80, rondeLengte: 400, rondenTeGaan: 28, maxRonden: 52 } as LiveRace["tracks"][number]["state"],
        riders: r,
        groups: buildGroups(r),
        premies: [],
        riderIdByBeennummer: new Map(r.map((x) => [x.beennummer, `id-${x.beennummer}`])),
        syncedAt,
      },
    ],
  };
}

// P4, P13, P17 en P31: samen 26 + 8 + 4 + 0 = 38 punten, zoals in het ontwerp.
const MIJN = ["id-04", "id-13", "id-17", "id-31", "id-weg"];

function renderTab(extra: Partial<Parameters<typeof LiveTab>[0]> = {}) {
  return render(
    <LiveTab
      race={race()}
      mineRiderIds={new Set(MIJN)}
      pointsSchema={SCHEMA}
      categorie="vrouwen"
      wedstrijdType="cup"
      mijnRijders={[
        { id: "id-04", naam: "Rijder 04" },
        { id: "id-weg", naam: "Jildou Terpstra" },
      ]}
      {...extra}
    />,
  );
}

describe("LiveTab", () => {
  it("noemt de wedstrijd en de categorie van de game", () => {
    renderTab();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Cup 3 — Vrouwen");
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });

  it("laat de categorie weg als die onbekend is", () => {
    renderTab({ categorie: null });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/^Cup 3$/);
  });

  it("toont punten, rijders in koers, ronde en te gaan", () => {
    renderTab();
    const tegels = screen.getAllByRole("definition").map((d) => d.textContent?.replace(/\s+/g, " ").trim());
    expect(tegels[0]).toBe("38pt");
    expect(tegels[1]).toBe("4van 5");
    expect(tegels[2]).toBe("52/ 80");
    expect(tegels[3]).toMatch(/^28ronden/);
  });

  it("zet per groep het gat tot het peloton en hoeveel van jou erin zitten", () => {
    renderTab();
    const baan = screen.getByRole("region", { name: "Op de baan" });
    const kaarten = within(baan).getAllByRole("button", { expanded: false }).filter((b) => /rijder/.test(b.textContent ?? ""));
    const tekst = kaarten.map((k) => k.textContent);
    expect(tekst[0]).toMatch(/Uitloper \+1.*1rijder · \+1 ronde/);
    expect(tekst[1]).toMatch(/Kopgroep.*7rijders · \+6,4 s.*1 van jou/);
    expect(tekst[2]).toMatch(/Peloton.*21rijders · referentie.*2 van jou/);
    expect(tekst[3]).toMatch(/Achterblijvers.*10rijders · −11 s.*1 van jou/);
  });

  it("klapt een groep open met de namen erin", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: /^Kopgroep/ }));
    expect(screen.getByRole("button", { name: /^Kopgroep/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Kopgroep · 7 rijders/)).toBeInTheDocument();
  });

  it("zet wie niet in de uitslag staat onderaan als niet gestart", () => {
    renderTab();
    const kaart = screen.getByRole("region", { name: "Mijn rijders" });
    fireEvent.click(within(kaart).getByRole("button", { name: /^Mijn rijders/ }));
    const regels = within(kaart).getAllByRole("listitem");
    expect(regels).toHaveLength(5);
    expect(regels[0]).toHaveTextContent(/Rijder 04.*Kopgroep.*P4.*26/);
    expect(regels[4]).toHaveTextContent(/Jildou Terpstra.*Niet gestart/);
    expect(within(kaart).getByText(/schaal 50-40-32-26-22-20…1 voor plek 1 t\/m 20/)).toBeInTheDocument();
  });

  it("telt een zwaardere wedstrijd mee in de voorlopige punten", () => {
    renderTab({ weging: 2 });
    const tegels = screen.getAllByRole("definition").map((d) => d.textContent?.replace(/\s+/g, " ").trim());
    expect(tegels[0]).toBe("76pt");
    const kaart = screen.getByRole("region", { name: "Mijn rijders" });
    fireEvent.click(within(kaart).getByRole("button", { name: /^Mijn rijders/ }));
    expect(within(kaart).getAllByRole("listitem")[0]).toHaveTextContent(/Rijder 04.*P4.*52/);
    // De schaal blijft die van de game; de factor staat erachter.
    expect(within(kaart).getByText(/schaal 50-40-32-26-22-20…1 voor plek 1 t\/m 20\. Deze wedstrijd telt dubbel\./)).toBeInTheDocument();
    // De virtuele uitslag weegt ook: plek 1 levert 100 op.
    const uitslag = screen.getByRole("region", { name: "Virtuele uitslag" });
    expect(within(uitslag).getAllByRole("listitem")[0]).toHaveTextContent(/100/);
  });

  it("zet de virtuele uitslag bovenaan, vóór je eigen rijders en de baan", () => {
    renderTab();
    const uitslag = screen.getByRole("region", { name: "Virtuele uitslag" });
    const mijn = screen.getByRole("region", { name: "Mijn rijders" });
    const baan = screen.getByRole("region", { name: "Op de baan" });
    expect(uitslag.compareDocumentPosition(mijn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mijn.compareDocumentPosition(baan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const regels = within(uitslag).getAllByRole("listitem");
    expect(regels).toHaveLength(5);
    // De uitloper leidt; wie een ronde achter ligt, staat zo genoteerd.
    expect(regels[0]).toHaveTextContent(/Rijder 01.*leider.*50 pt/);
    expect(regels[1]).toHaveTextContent(/Rijder 02.*\+1 ronde.*40 pt/);
  });

  it("klapt mijn rijders dicht met een samenvatting, en open op verzoek", () => {
    renderTab();
    const kaart = screen.getByRole("region", { name: "Mijn rijders" });
    const knop = within(kaart).getByRole("button", { name: /^Mijn rijders/ });
    expect(knop).toHaveAttribute("aria-expanded", "false");
    expect(knop).toHaveTextContent(/4 van 5 in koers · beste P4 Rijder 04/);
    expect(knop).toHaveTextContent(/38\s*pt/);
    expect(within(kaart).queryAllByRole("listitem")).toHaveLength(0);
    fireEvent.click(knop);
    expect(knop).toHaveAttribute("aria-expanded", "true");
    expect(within(kaart).getAllByRole("listitem")).toHaveLength(5);
  });

  it("toont de snelste ronde, met je eigen rijder gemarkeerd", () => {
    const r = race();
    r.tracks[0].state = {
      ...r.tracks[0].state!,
      snelsteRondeTijd: "26.851",
      snelsteRondeSnelheid: "53,6km/u",
      snelsteRondeNaam: "Rijder 13",
      snelsteRondeBeennummer: "13",
      snelsteRondeNr: 41,
      gemRondeTijd: "32.968",
      gemRondeSnelheid: "43,7km/u",
    };
    renderTab({ race: r });
    const kaart = screen.getByRole("region", { name: "Snelste ronde" });
    expect(kaart).toHaveTextContent(/ronde 41/);
    expect(kaart).toHaveTextContent(/Rijder 13 \(jouw rijder\)/);
    expect(kaart).toHaveTextContent(/van jou/);
    expect(kaart).toHaveTextContent(/26,851 s/);
    expect(kaart).toHaveTextContent(/53,6 km\/u/);
    expect(kaart).toHaveTextContent(/Gemiddelde ronde 32,968 s · 43,7 km\/u/);
  });

  it("laat de snelste ronde weg zolang de bron die niet kent", () => {
    renderTab();
    expect(screen.queryByRole("region", { name: "Snelste ronde" })).toBeNull();
  });

  it("laat zien hoe lang geleden de stand is bijgewerkt", () => {
    renderTab({ race: race(new Date(Date.now() - 12_000).toISOString()) });
    expect(screen.getByText(/bijgewerkt 1[23] s geleden/)).toBeInTheDocument();
  });

  it("meldt een stilgevallen feed als onderbroken", () => {
    renderTab({ race: race(new Date(Date.now() - 10 * 60_000).toISOString()) });
    expect(screen.getByText("ONDERBROKEN")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/kunnen achterlopen/);
  });

  it("legt rustig uit dat er niets live is", () => {
    renderTab({ race: null });
    expect(screen.getByText("Nog geen wedstrijd live")).toBeInTheDocument();
  });
});
