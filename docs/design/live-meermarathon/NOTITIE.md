# Notitie bij dit pakket

Designreferentie voor de **live meermarathon-tracker**: rijders op een
schematische 400 m-baan, gegroepeerd naar de echte koerssituatie (uitlopers,
kopgroep, peloton, achterblijvers), met een virtuele uitslag die meerekent wat
jouw ploeg op dat moment scoort.

## Dit is een herontwerp, geen nieuwbouw

De repo heeft dit al, en dat is belangrijk om te weten voor je begint:

| Wat | Waar | Regels |
| --- | --- | --- |
| Baanweergave | `src/components/meermarathon/LiveRink.tsx` | 161 |
| Het tabblad zelf | `src/components/meermarathon/LiveTab.tsx` | 435 |
| Groepen en punten | `src/lib/liveMarathon.ts` (+ tests) | 405 |
| Ophalen van de feed | `supabase/functions/livemarathon-sync/` | — |
| Testdata | `src/test/fixtures/livemarathon-haaksbergen.json` | — |

De README zegt dat de bron "not yet connected" is en dat het prototype op
mockdata draait met een simulatielus. In deze repo is die koppeling er wél:
livemarathon-sync haalt de stand van livemarathon.schaatsen.nl op. De
simulatielus uit het prototype hoort dus nergens terecht te komen -- de README
zegt dat zelf ook.

Wat hier telt is de **vormgeving**: KPI-strook, baankaart, groepsindeling en de
virtuele uitslag. Niet de datalaag.

## support.js zit er bewust niet bij

De README schrijft "do not port it", en dat klopt: dat bestand haalt React,
ReactDOM en Babel van unpkg.com en voert daarna via new Function de
componentcode uit het HTML-bestand uit. Netjes vastgezet met SRI-hashes, maar
code die bij het openen scripts ophaalt en uitvoert hoort niet in een repo.

Gevolg: live-meermarathon.dc.html opent niet zelfstandig in een browser. Gebruik
daarvoor de oorspronkelijke zip, waar support.js naast staat.

reference-bestaande-volgwagen.png is een schermafdruk van de huidige Volgwagen,
meegeleverd als vergelijkingsmateriaal.
