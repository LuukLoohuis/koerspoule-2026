-- Poll bewerken (vraag/opties/deadline) door de maker of een admin. Idempotent.
-- Wijzigen van de opties reset bestaande stemmen (indices kunnen niet meer kloppen).
create or replace function public.edit_chat_poll(
  p_poll_id uuid, p_question text, p_options jsonb, p_deadline timestamptz
) returns void
language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_old_options jsonb; v_count int; v_msg uuid;
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  select created_by, options, message_id into v_owner, v_old_options, v_msg
    from public.chat_polls where id = p_poll_id;
  if v_owner is null then raise exception 'Poll niet gevonden'; end if;
  if v_owner <> auth.uid() and not public.is_admin() then raise exception 'Niet toegestaan'; end if;
  if p_question is null or length(trim(p_question)) < 3 then raise exception 'Vraag te kort'; end if;
  if length(p_question) > 200 then raise exception 'Vraag te lang'; end if;
  if jsonb_typeof(p_options) <> 'array' then raise exception 'Opties moeten een lijst zijn'; end if;
  v_count := jsonb_array_length(p_options);
  if v_count < 2 or v_count > 6 then raise exception 'Tussen 2 en 6 opties'; end if;

  if p_options <> v_old_options then
    delete from public.chat_poll_votes where poll_id = p_poll_id;
  end if;

  update public.chat_polls
     set question = trim(p_question), options = p_options, deadline = p_deadline
   where id = p_poll_id;
  update public.chat_messages set edited_at = now() where id = v_msg;
end $$;

grant execute on function public.edit_chat_poll(uuid, text, jsonb, timestamptz) to authenticated;
