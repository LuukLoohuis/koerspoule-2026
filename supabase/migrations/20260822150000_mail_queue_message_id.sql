-- Slaat het MessageId op dat Amazon SES per verstuurde mail teruggeeft.
--
-- Zonder dit is een bouncemelding niet te koppelen aan de mail die hem
-- veroorzaakte: je weet dan wel dát een adres stukliep, maar niet in welke
-- campagne. Met het MessageId erbij is dat een directe match op de melding
-- die ses-webhook binnenkrijgt.
--
-- Bewust nullable en zonder default: rijen van voor deze migratie hebben geen
-- MessageId, en dat hoort ook zo.
alter table public.mail_queue
  add column if not exists provider_message_id text;

comment on column public.mail_queue.provider_message_id is
  'MessageId van de mailprovider (Amazon SES). Leeg voor mails van voor 2026-08-22.';

-- Alleen nuttig om vanuit een bouncemelding terug te zoeken, dus een partiele
-- index: de lege waarden hoeven er niet in.
create index if not exists mail_queue_provider_message_id_idx
  on public.mail_queue (provider_message_id)
  where provider_message_id is not null;

notify pgrst, 'reload schema';
