export default function Legal() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="font-serif text-4xl md:text-5xl font-bold mb-8 text-foreground">
        Juridische Informatie
      </h1>

      <div className="space-y-12 font-sans text-foreground/90 leading-relaxed">
        {/* Privacyverklaring */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4 text-foreground" id="privacy">
            🔒 Privacyverklaring
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              Koerspoule respecteert de privacy van alle gebruikers en draagt er zorg voor dat
              de persoonlijke informatie die je ons verschaft vertrouwelijk wordt behandeld.
            </p>
            <p><strong>Welke gegevens verzamelen wij?</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Naam en e-mailadres (bij registratie)</li>
              <li>Ploegnaam en teamkeuzes</li>
              <li>Technische gegevens zoals IP-adres en browsertype (voor statistieken)</li>
            </ul>
            <p><strong>Waarvoor gebruiken wij deze gegevens?</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Het aanbieden en verbeteren van de Koerspoule-dienst</li>
              <li>Communicatie over je account en het spel</li>
              <li>Het bijhouden van scores en klassementen</li>
            </ul>
            <p>
              Wij delen jouw gegevens niet met derden, tenzij dit wettelijk verplicht is.
              Je hebt te allen tijde het recht om je gegevens in te zien, te corrigeren of te
              laten verwijderen. Neem hiervoor contact op via{" "}
              <a href="mailto:koerspoule@gmail.com" className="underline hover:text-foreground transition-colors">
                koerspoule@gmail.com
              </a>.
            </p>
          </div>
        </section>

        <div className="vintage-divider" />

        {/* Cookiebeleid */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4 text-foreground" id="cookies">
            🍪 Cookiebeleid
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              Koerspoule maakt gebruik van cookies om de website goed te laten functioneren
              en om je ervaring te verbeteren.
            </p>
            <p><strong>Welke cookies gebruiken wij?</strong></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Functionele cookies:</strong> noodzakelijk voor de werking van de site
                (bijv. inlogstatus, sessie-informatie).
              </li>
              <li>
                <strong>Analytische cookies:</strong> om anoniem inzicht te krijgen in het
                gebruik van de website (bijv. paginabezoeken).
              </li>
            </ul>
            <p>
              Wij plaatsen geen tracking- of marketingcookies. Je kunt cookies blokkeren via
              je browserinstellingen, maar dit kan de werking van de site beïnvloeden.
            </p>
          </div>
        </section>

        <div className="vintage-divider" />

        {/* Algemene Voorwaarden */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4 text-foreground" id="voorwaarden">
            📜 Algemene Voorwaarden
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              Door deel te nemen aan Koerspoule ga je akkoord met de volgende voorwaarden:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Koerspoule is een gratis spel zonder winstoogmerk. Er zijn geen financiële
                verplichtingen verbonden aan deelname.
              </li>
              <li>
                Deelnemers zijn zelf verantwoordelijk voor het samenstellen van hun team
                vóór de aangegeven deadline.
              </li>
              <li>
                De organisatie behoudt zich het recht voor om spelregels aan te passen
                gedurende het seizoen, mits dit tijdig wordt gecommuniceerd.
              </li>
              <li>
                Koerspoule is niet aansprakelijk voor eventuele technische storingen of
                het verlies van gegevens.
              </li>
              <li>
                Ongepast gedrag in de chat of richting andere deelnemers kan leiden tot
                uitsluiting.
              </li>
            </ol>
          </div>
        </section>

        <div className="vintage-divider" />

        {/* AVG / GDPR */}
        <section>
          <h2 className="font-serif text-2xl font-bold mb-4 text-foreground" id="avg">
            🇪🇺 AVG / GDPR
          </h2>
          <div className="space-y-3 text-sm">
            <p>
              Koerspoule handelt in overeenstemming met de Algemene Verordening
              Gegevensbescherming (AVG/GDPR). Dit betekent:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Wij verwerken alleen gegevens die noodzakelijk zijn voor het spel.</li>
              <li>Je gegevens worden veilig opgeslagen en niet langer bewaard dan nodig.</li>
              <li>
                Je hebt recht op inzage, correctie, overdracht en verwijdering van je
                persoonsgegevens.
              </li>
              <li>Formulieren verzamelen enkel de minimaal benodigde informatie.</li>
              <li>Wij maken geen gebruik van tracking voor advertentiedoeleinden.</li>
            </ul>
            <p>
              Voor vragen of verzoeken met betrekking tot je gegevens kun je contact opnemen
              via{" "}
              <a href="mailto:koerspoule@gmail.com" className="underline hover:text-foreground transition-colors">
                koerspoule@gmail.com
              </a>.
            </p>
          </div>
        </section>
      </div>

      <div className="vintage-divider mt-12 mb-6" />
      <p className="text-xs text-muted-foreground text-center font-sans">
        Laatst bijgewerkt: maart 2026
      </p>
    </div>
  );
}
