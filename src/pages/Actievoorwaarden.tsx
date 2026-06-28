import { Link } from "react-router-dom";

export default function Actievoorwaarden() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2 text-foreground">
        Actievoorwaarden Koerspoule
      </h1>
      <p className="text-xs text-muted-foreground font-sans mb-8">Laatst bijgewerkt: 28 juni 2026</p>

      <div className="space-y-10 font-sans text-foreground/90 leading-relaxed text-sm">
        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">1. Organisatie</h2>
          <p>
            Deze actievoorwaarden zijn van toepassing op de prijzen en prijsacties van Koerspoule,
            aangeboden via koerspoule.nl. Koerspoule wordt geëxploiteerd door Koerspoule B.V.,
            gevestigd te Utrecht. Door deel te nemen aan een poule waaraan prijzen verbonden zijn,
            ga je akkoord met deze voorwaarden.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">2. Deelname</h2>
          <p>
            Deelname staat open voor iedereen met een geldig Koerspoule-account. Deelnemers onder de
            16 jaar hebben toestemming van een ouder of voogd nodig. Medewerkers van Koerspoule B.V.
            en betrokken partijen bij de organisatie zijn uitgesloten van het winnen van prijzen. Per
            persoon kan met één account worden deelgenomen; meervoudige accounts om de winkansen te
            vergroten zijn niet toegestaan.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">3. De prijzen</h2>
          <p>
            De te winnen prijzen worden per spel (game) en eventueel per subpoule vermeld op de
            Prijzen-pagina. Prijzen kunnen bestaan uit onder meer een klassementsprijs, dagprijzen en
            ereplaatsen, en worden deels mogelijk gemaakt door sponsoren. De getoonde prijzen gelden
            zolang de betreffende actie loopt; Koerspoule behoudt zich het recht voor een prijs te
            vervangen door een gelijkwaardig alternatief indien een prijs onverhoopt niet leverbaar
            is.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">4. Bepaling van de winnaars</h2>
          <p>
            Winnaars worden bepaald op basis van de eindstand en de daguitslagen zoals berekend in de
            poule, volgens het koersreglement. De uitslag van Koerspoule is bindend. Over de uitslag
            kan niet worden gecorrespondeerd, behoudens aantoonbare fouten in de puntentelling.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">5. Bekendmaking en uitkering</h2>
          <p>
            Winnaars worden na afloop van de betreffende periode bekendgemaakt en ontvangen bericht
            via het e-mailadres dat aan hun account is gekoppeld. Een winnaar dient binnen 30 dagen na
            bericht te reageren om zijn prijs te claimen; reageert een winnaar niet binnen die
            termijn, dan vervalt de aanspraak op de prijs. Prijzen zijn persoonlijk en niet
            overdraagbaar of inwisselbaar voor contant geld, tenzij anders vermeld.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">6. Persoonsgegevens</h2>
          <p>
            Voor het uitkeren van een prijs kan Koerspoule aanvullende gegevens van de winnaar
            opvragen (zoals naam en adres). Deze gegevens worden uitsluitend gebruikt voor het
            toekennen en versturen van de prijs en worden verwerkt conform ons{" "}
            <Link to="/juridisch" className="underline hover:text-foreground transition-colors">
              Privacybeleid
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">7. Aansprakelijkheid</h2>
          <p>
            Koerspoule is niet aansprakelijk voor schade die voortvloeit uit deelname, uit het niet
            kunnen uitkeren van een prijs door omstandigheden buiten haar macht, of uit het gebruik
            van een prijs. Sponsoren zijn verantwoordelijk voor de door hen beschikbaar gestelde
            prijzen.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-3 text-foreground">8. Slotbepalingen</h2>
          <p>
            Koerspoule behoudt zich het recht voor deze voorwaarden te wijzigen, en een actie te
            beëindigen of aan te passen, zonder opgaaf van reden. In gevallen waarin deze voorwaarden
            niet voorzien, beslist Koerspoule. Op deze voorwaarden is Nederlands recht van toepassing.
          </p>
        </section>
      </div>

      <div className="vintage-divider mt-12 mb-6" />
      <p className="text-sm text-muted-foreground text-center font-sans">
        Vragen over de prijzen of deze voorwaarden? Neem contact op via{" "}
        <a href="mailto:koerspoule@gmail.com" className="underline hover:text-foreground transition-colors">
          koerspoule@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
