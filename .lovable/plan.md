## Probleem

`https://koerspoule.nl` en `https://www.koerspoule.nl` tonen een leeg scherm. DNS, SSL en hosting zijn in orde (HTTP 200, `index.html` wordt geleverd, het Lovable‑badge laadt). De React‑app crasht direct bij het opstarten met:

```
Uncaught Error: supabaseUrl is required.
   at createClient (...)
```

In `src/integrations/supabase/client.ts` worden `VITE_SUPABASE_URL` en `VITE_SUPABASE_PUBLISHABLE_KEY` rechtstreeks aan `createClient` doorgegeven. In de huidige **gepubliceerde** bundel zijn deze leeg, waardoor de hele module faalt vóórdat `createRoot()` wordt aangeroepen — vandaar volledig wit scherm, geen routing, geen netwerk‑calls.

In de preview werk je als ingelogde Lovable‑gebruiker via de auth‑bridge, dus daar valt het ook op (preview is leeg/niet doorgaand) maar minder duidelijk.

## Oplossing in twee stappen

### 1. Robuuste Supabase‑client (codefix)

Voorkom dat één ontbrekende env‑variabele de hele app down brengt.

- `src/integrations/supabase/client.ts`
  - Hardcode fallback naar de bekende projectwaarden (publieke anon key + URL van dit project) zoals Lovable Cloud normaal doet:
    - `SUPABASE_URL` = `https://ivbmlledoamqtzqpcvzl.supabase.co`
    - `SUPABASE_PUBLISHABLE_KEY` = de bestaande anon key uit het project
  - Logica: `import.meta.env.VITE_SUPABASE_URL ?? "<fallback>"` zodat preview én publish altijd werken.
- `src/lib/supabase.ts`
  - Zelfde fallback toepassen (deze gebruikt nu `?? ""`, wat ook tot een crash leidt).
- `src/pages/Login.tsx` (regel 77)
  - De waarschuwing over ontbrekende env‑vars laten staan, maar niet meer als blokkerende error gebruiken.

Resultaat: zelfs als de publish‑pipeline ooit weer geen env‑vars meegeeft, blijft de site werken (anon key is publiek en mag in de codebase staan).

### 2. Opnieuw publiceren

Frontend‑changes vereisen handmatig op **Publish → Update** klikken. Na de codefix moet jij dat eenmalig doen, daarna verschijnt de site weer normaal op `koerspoule.nl`, `www.koerspoule.nl` en `koerspoule.lovable.app`.

## Verificatie

Na publish controleer ik via de browser tool:
- `https://koerspoule.nl` rendert het normale Koerspoule‑scherm (geen wit vlak).
- Geen `supabaseUrl is required` meer in de console.
- Login‑pagina toont en Supabase‑calls slagen.

## Wat ik niet ga doen

- Geen DNS‑ of domeinwijzigingen — die zijn correct.
- Geen wijziging aan `src/integrations/supabase/types.ts` of de `.env` (auto‑gegenereerd).
- Geen aanpassing aan publish‑visibility (staat al op public).
