# Koerspoule 2026

Fantasy wieler-app voor Giro / Tour de France / Vuelta. Selecteer renners, scoor punten op echte koersuitslagen, strijd in subpoules.

## Stack

- **Vite** + React + TypeScript + Tailwind + shadcn/ui
- **Supabase** (Postgres + Auth + RLS) als backend
- **Vercel** voor hosting

## Lokaal opzetten

```bash
yarn install --ignore-engines
cp .env.example .env
# Vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in
yarn dev
```

App draait op `http://localhost:3000`.

## Supabase setup

### 1. Basisschema (eenmalig)
Open Supabase SQL Editor en voer uit (in deze volgorde):

1. `supabase/schema.sql` — kern: users, games, riders, picks, stages, points
2. `supabase/migrations/20260201_admin_v3.sql` — admin v3 uitbreidingen (game_type, classifications, max_picks, RPCs, admin overview)

### 2. Maak jezelf admin

Eenmalig na je eerste login:

```sql
insert into public.user_roles(user_id, role)
select id, 'admin' from auth.users where email = 'jouw-email@adres.nl'
on conflict (user_id, role) do nothing;
```

Vanaf dat moment kun je via de admin-pagina zelf andere admins toevoegen.

## Admin Dashboard (`/admin`)

Tabs:
- **Dashboard** — stats: gebruikers, teams, etappes verwerkt, top 5 teams
- **Games** — Giro/TdF/Vuelta + jaartal aanmaken, status (draft/open/locked/live/finished)
- **Categorieën** — categorieën met `max_picks` per categorie (1=enkel, n=meerdere keuzes)
- **Startlijst** — PDF-import (ProCyclingStats formaat) of handmatig renners + categorieën koppelen
- **Etappes** — etappes aanmaken (handmatig of bulk 21 voor een Grand Tour)
- **Uitslagen** — top 20 invoeren per klassement (Etappe / GC / KOM / Points / Youth) per etappe
- **Berekening** — standaard puntentabellen laden, etappe of game herberekenen
- **Gebruikers** — admin-rechten toekennen/intrekken

Alle admin-acties zijn beveiligd via Supabase RLS + `is_admin()` security definer functies.

## Deployment

Vercel:
1. Push deze repo naar GitHub
2. Import in Vercel
3. Zet environment vars `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings
4. Deploy

## Scripts

| Script | Doel |
|---|---|
| `yarn dev` | Dev server (port 3000, host 0.0.0.0) |
| `yarn start` | Alias voor `yarn dev` |
| `yarn build` | Productiebuild naar `dist/` |
| `yarn preview` | Lokaal previewen van productiebuild |
| `yarn lint` | ESLint over alle bestanden |
| `yarn test` | Vitest run |

## Mappenstructuur

```
src/
├── components/
│   ├── admin/        # Admin v3 tab-componenten
│   ├── ui/           # shadcn/ui primitives
│   └── ...
├── hooks/            # useAuth, useCategories, etc.
├── lib/              # supabase client, PDF parsing
├── pages/            # routes (Index, Login, AdminV3, ...)
└── data/             # mock/seed data

supabase/
├── schema.sql                         # kern-schema
├── migrations/
│   └── 20260201_admin_v3.sql          # admin v3 uitbreidingen
└── seeds/                             # voorbeeld-startlijsten
```
