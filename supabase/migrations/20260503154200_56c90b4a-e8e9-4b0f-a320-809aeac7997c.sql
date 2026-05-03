alter table public.chat_messages
  drop constraint if exists chat_body_max_len;
alter table public.chat_messages
  add constraint chat_body_max_len check (char_length(body) <= 2000);