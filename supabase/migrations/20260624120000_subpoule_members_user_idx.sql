-- RLS-perf: veel policies/subqueries filteren op subpoule_members.user_id
-- (is_subpoule_member, chat/poll/member/woonplaats). De bestaande unique-index
-- (subpoule_id, user_id) is met subpoule_id leidend niet bruikbaar voor
-- `where user_id = auth.uid()`. Aparte index → directe lookup. Idempotent.
create index if not exists subpoule_members_user_idx
  on public.subpoule_members (user_id);
