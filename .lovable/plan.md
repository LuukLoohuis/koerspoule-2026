# Plan: Koerscafé herbouw

Volledige rebuild van de subpoule-chat met realtime, mentions, ongelezen-tracking, deelbaarheid en interactieve elementen. Aangepast op huidige stack (React + Vite + Supabase, géén Next.js/Redis/Socket.IO — Supabase Realtime vervangt websockets).

## Wat je krijgt

**Kernchat**
- Realtime berichten via Supabase Realtime (geen polling meer)
- Initialen-avatar met deterministische kleur per gebruiker
- Bewerken & verwijderen van eigen berichten (verwijderd = "Dit bericht is verwijderd")
- Emoji-picker in input
- Auto-scroll naar nieuwste bericht, behalve als gebruiker omhoog leest → "↓ nieuwe berichten" knop
- Sticky input, mobile-first chatbubbles, dark-mode compatibel, vintage-styling behouden

**@mentions**
- Typ `@` → autocomplete dropdown met subpoule-leden
- Mentions visueel gemarkeerd (primary kleur badge) in renderbericht
- In-app notificatiebadge voor genoemde gebruiker
- Klik op mention scrollt/highlight (geen profielpagina aanwezig, dus dat houden we bij naam-tooltip)

**Ongelezen & notificaties**
- Per-user `last_read_at` per subpoule
- Badge in Mijn Peloton → tab "Subpoules" en in subpoule-kaart
- "Nieuwe berichten"-divider in chat boven het eerste ongelezen bericht
- Toast bij binnenkomend bericht in andere subpoule waar je lid van bent

**WhatsApp delen + deeplink**
- Deelknop in chatheader → opent `https://wa.me/?text=...` met link naar `/mijn-peloton?tab=subpoules&subpoule=<id>&view=koerscafe`
- Deeplink wordt opgevangen in MijnPeloton: opent juiste subpoule + tab
- Niet-ingelogde bezoeker → redirect naar `/login` met `?redirect=<originele-url>`, na login automatisch terug

**Emoji reactions**
- Reactie-knop (👍 ❤️ 🔥 😂 🚴) onder elk bericht
- Aantal + wie staat in tooltip
- Eigen reactie togglebaar

**Polls & voorspellingen**
- Eigenaar of elk lid kan poll posten in chat ("Wie wint vandaag?" + 2-6 opties + optionele deadline)
- Realtime stemresultaten als voortgangsbalken
- Auto-sluiten op deadline (client-side check + RLS-blocked insert na deadline)
- Eigen stem zichtbaar gemarkeerd

## Technische details

### Database (nieuwe migratie)

**`chat_messages` uitbreiden**
- `edited_at TIMESTAMPTZ NULL`
- `deleted_at TIMESTAMPTZ NULL`
- `mentions UUID[] NULL` (lijst van getagde user_ids)
- Index op `(subpoule_id, created_at DESC)`

**Nieuwe tabellen** (allen RLS: alleen subpoule-leden)
- `chat_read_states (subpoule_id, user_id, last_read_at)` — PK (subpoule_id, user_id)
- `chat_message_reactions (id, message_id, user_id, emoji, created_at)` — uniek (message_id, user_id, emoji)
- `chat_polls (id, subpoule_id, message_id, question, options JSONB, deadline TIMESTAMPTZ, created_by, created_at)`
- `chat_poll_votes (poll_id, user_id, option_index, created_at)` — PK (poll_id, user_id)

**RPC's**
- `update_chat_read_state(p_subpoule_id, p_last_read_at)` — upsert
- `subpoule_unread_counts(p_game_id)` → returns `(subpoule_id, unread_count)` voor huidige user
- `edit_chat_message(p_message_id, p_body)` — alleen auteur, zet `edited_at`
- `soft_delete_chat_message(p_message_id)` — alleen auteur of admin
- `cast_poll_vote(p_poll_id, p_option_index)` — blokkeer na deadline

**Realtime publication**
- `ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages, chat_message_reactions, chat_poll_votes`

### Frontend componenten

**Vervangen**
- `src/components/PelotonChat.tsx` → volledig herschrijven (realtime subscribe i.p.v. polling)

**Nieuw**
- `src/components/koerscafe/ChatMessage.tsx` — bubble + avatar + edit/delete/react menu
- `src/components/koerscafe/ChatInput.tsx` — sticky input + emoji-picker + @mention autocomplete
- `src/components/koerscafe/MentionDropdown.tsx`
- `src/components/koerscafe/MessageReactions.tsx`
- `src/components/koerscafe/PollCard.tsx` + `PollComposer.tsx`
- `src/components/koerscafe/UnreadDivider.tsx`
- `src/components/koerscafe/Avatar.tsx` (initialen + HSL kleur uit user_id hash)
- `src/components/koerscafe/ShareButton.tsx` (WhatsApp deeplink)
- `src/hooks/useChatRealtime.ts` — Supabase channel subscribe per subpoule
- `src/hooks/useUnreadCounts.ts` — game-wide badge data
- `src/hooks/useReadState.ts` — markeer als gelezen on mount/visibility

**Aanpassen**
- `src/pages/MijnPeloton.tsx` — query params lezen (`subpoule`, `view`), badges in subpoule-tab, toast subscriber voor andere subpoules
- `src/pages/Login.tsx` — `?redirect=` opslaan en na login navigeren
- `src/components/SubpouleManager.tsx` — unread-badge per subpoule-kaart
- Emoji-picker: gebruik lichtgewicht `emoji-mart` of simpele eigen grid (kies bij implementatie de lichtste)

### Beveiliging
- RLS op alle nieuwe tabellen: alleen leden van de subpoule (via bestaande `is_subpoule_member`)
- XSS: bericht body altijd via React text-rendering (geen `dangerouslySetInnerHTML`); mentions via parser die alleen `@displayname` matched op bekende user_ids
- Rate limit: simpele client-debounce + DB-constraint (max 1 bericht/seconde via trigger optioneel)
- Lengte: body max 2000 chars (al aanwezig), poll-vraag max 200, optie max 80

### Out of scope (bewust)
- Avatar-uploads, Gravatar
- Web push / e-mail notificaties
- Typing indicators, online presence, pinned messages, image uploads, chat search
- Profielpagina bij mention-klik (bestaat niet in app)

## Bestandsoverzicht

```text
supabase/migrations/<ts>_koerscafe_rebuild.sql      [nieuw]
src/components/PelotonChat.tsx                       [herschrijven]
src/components/koerscafe/                            [nieuwe map, 9 files]
src/hooks/useChatRealtime.ts                         [nieuw]
src/hooks/useUnreadCounts.ts                         [nieuw]
src/hooks/useReadState.ts                            [nieuw]
src/pages/MijnPeloton.tsx                            [aanpassen: deeplink + badges]
src/pages/Login.tsx                                  [aanpassen: redirect param]
src/components/SubpouleManager.tsx                   [aanpassen: unread badge]
```

## Aanpak in stappen
1. Migratie: kolommen toevoegen, nieuwe tabellen + RLS + RPC's + realtime publication
2. Realtime chathook + nieuwe message-componenten (kern werkt)
3. Read-state + badges + divider
4. @mentions met autocomplete
5. WhatsApp delen + deeplink + login-redirect
6. Emoji reactions
7. Polls (composer + card + voting)
8. Mobile polish + dark mode check
