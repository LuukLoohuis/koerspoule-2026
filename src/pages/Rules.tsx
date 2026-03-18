import { pointsTable, classificationPoints, riderCategories } from "@/data/riders";

export default function Rules() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Speluitleg & Reglement
          </h1>
          <p className="text-muted-foreground font-serif italic">
            "De jury, bestaande uit J.W.M. Broos, heeft gelijk. Zo niet, dan toch."
          </p>
          <div className="vintage-divider max-w-xs mx-auto mt-4" />
        </div>

        {/* Rules */}
        <section className="retro-border bg-card p-6 mb-6">
          <h2 className="font-display text-2xl font-bold mb-4">📜 Het Reglement</h2>
          <ol className="space-y-3 font-sans text-sm">
            {[
              "De jury, bestaande uit J.W.M. Broos, heeft gelijk.",
              "Zo niet, dan toch.",
              "€5 inleg, winner takes all.",
              "De inschrijving dient binnen te zijn om 12:00 uur op 5 juli.",
              "Vul je team in via de Team Samenstellen pagina.",
              "Beter geen scriptjes.",
              "Als iemand uit de Tour stapt, pech voor jou :(",
            ].map((rule, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* How to play */}
        <section className="retro-border bg-card p-6 mb-6">
          <h2 className="font-display text-2xl font-bold mb-4">🚴 Hoe speel je mee?</h2>
          <div className="space-y-4 font-sans text-sm">
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">Stap 1 — Maak een account aan</h3>
              <p className="text-muted-foreground">Registreer je met een e-mailadres en kies een gebruikersnaam.</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">Stap 2 — Stel je ploeg samen</h3>
              <p className="text-muted-foreground">
                Kies uit {riderCategories.length} categorieën telkens 1 renner. 
                Voeg 2 jokers toe (vrije keuze buiten de categorieën).
                <br />
                Jokers moeten unieke renners zijn en mogen niet voorkomen in de categorieën of gekozen categorie-renners.
              </p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">Stap 3 — Voorspel de klassementen</h3>
              <p className="text-muted-foreground">
                Voorspel het podium van het eindklassement + winnaar puntentrui, bergtrui en jongerentrui.
              </p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-md">
              <h3 className="font-bold mb-1">Stap 4 — Daag je vrienden uit</h3>
              <p className="text-muted-foreground">
                Maak een subpoule aan of voer een code in om een bestaande poule te joinen.
              </p>
            </div>
          </div>
        </section>

        {/* Points */}
        <section className="retro-border bg-card p-6 mb-6">
          <h2 className="font-display text-2xl font-bold mb-4">📊 Puntentelling</h2>

          <h3 className="font-display text-lg font-bold mb-3">Per etappe</h3>
          <div className="retro-border bg-background p-4 mb-6">
            <div className="grid grid-cols-4 md:grid-cols-5 gap-2 text-sm font-sans">
              {Object.entries(pointsTable).map(([pos, pts]) => (
                <div key={pos} className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-mono text-xs w-5 text-right">{pos}.</span>
                  <span className="font-bold text-accent">{pts}</span>
                </div>
              ))}
            </div>
          </div>

          <h3 className="font-display text-lg font-bold mb-3">Klassementsvoorspellingen</h3>
          <div className="space-y-2 font-sans text-sm">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>Goede plek + goede renner</span>
              <span className="font-bold text-accent">{classificationPoints.correctPositionCorrectRider} pt</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>Goede renner, verkeerde plek</span>
              <span className="font-bold text-accent">{classificationPoints.correctRiderWrongPosition} pt</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <span>Juiste winnaar trui (bolletjes/groen/wit)</span>
              <span className="font-bold text-accent">{classificationPoints.correctJerseyWinner} pt</span>
            </div>
          </div>
        </section>

        {/* Categories overview */}
        <section className="retro-border bg-card p-6">
          <h2 className="font-display text-2xl font-bold mb-4">📋 Categorieën</h2>
          <p className="text-sm text-muted-foreground mb-4 font-sans">
            Kies 1 renner per categorie + 2 vrije jokers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {riderCategories.map((cat) => (
              <div key={cat.id} className="p-3 bg-secondary/30 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                  <span className="jersey-badge bg-primary text-primary-foreground text-xs">
                    #{cat.id}
                  </span>
                  <span className="font-bold text-sm font-sans">{cat.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {cat.riders.map((r) => r.name).join(" • ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
