# Database-opzet — schone Supabase

Voor een **nieuw, leeg** Supabase-project. Zet de hele schema-structuur in één keer neer.

## 1. Schema draaien

1. Supabase → **SQL Editor** → **New query**.
2. Open [`supabase/_full_setup.sql`](../supabase/_full_setup.sql), kopieer **alles**, plak, **Run**.
   - Dit is `schema.sql` (basis) + alle migraties in chronologische volgorde, samengevoegd.
   - De editor stopt bij de eerste fout en toont de regel. Lukt een statement niet → stuur
     mij de melding, dan fix ik die migratie.
   - Veel statements zijn idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`), dus na een
     fix kun je opnieuw runnen.

## 2. Controleren

Run daarna:

```sql
select to_regclass('public.games')            as games_tabel,
       to_regprocedure('public.is_admin()')   as is_admin_functie,
       to_regclass('public.profiles')         as profiles_tabel,
       to_regclass('public.email_send_log')   as email_log;
```

Alles niet-`null` → schema staat. De `games_admin_write`-policy en `homepage_quote*`-kolommen
(de eerdere quote-fix) zitten er al in.

## 3. Jezelf admin maken

Log één keer in de app in (zodat je `auth.users`-record bestaat), dan:

```sql
-- via profiles (nieuwe model):
update public.profiles set is_admin = true, role = 'admin'
where id = (select id from auth.users where email = 'JOUW@EMAIL');

-- én via user_roles (oude model, door is_admin() gebruikt):
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'JOUW@EMAIL'
on conflict do nothing;
```

## Wat is bewust NIET meegenomen

**4 pg_cron e-mail-queue jobs** (de mail-verzend-automatisering). Die verwijzen naar de
edge-function-URL + vault-secret van het **oude** project. De e-mail-**tabellen** zitten er wél
in; alleen het automatisch versturen moet je opnieuw inrichten als je dat wilt:

- Edge functions deployen in het nieuwe project.
- `service_role`-key in Supabase Vault zetten.
- `cron.schedule(...)` opnieuw aanmaken met de **nieuwe** function-URL.

Vraag het als je dit nodig hebt; dan lever ik een apart cron-setup-script met placeholders.

## Data (optioneel)

Dit is alleen de **structuur**. Game-data importeren? Zie [`EXPORT-CHECKLIST.md`](EXPORT-CHECKLIST.md)
voor de CSV's + FK-veilige importvolgorde.
