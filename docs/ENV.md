# Environment variables

De Supabase-client (`src/integrations/supabase/client.ts`) leest **uitsluitend** uit env-vars.
Er is geen hardcoded fallback meer; ontbreken ze, dan crasht de app vroeg met een duidelijke
console-fout (i.p.v. stil terug te vallen op een oud project).

## Vereist

| Variabele | Waar te vinden | Voorbeeld |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` / `public` key | `eyJhbGciOi...` |

> De `anon`-key is bedoeld om client-side te gebruiken; gebruik **nooit** de `service_role`-key
> in de frontend.

## Lokaal (`.env.local`)

Maak in de projectroot een `.env.local` (staat in `.gitignore`, niet committen):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Daarna `yarn dev` (Vite leest `VITE_`-prefixed vars in tijdens build/dev).

## Vercel

Project → **Settings → Environment Variables** → voeg beide toe voor
**Production** (en eventueel Preview/Development):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Redeploy na wijziging — Vite bakt env-vars in tijdens de build, dus een nieuwe build is nodig.
