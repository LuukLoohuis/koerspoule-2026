-- mark_subpoule_read wierp een EXCEPTION als auth.uid() NULL was. Die functie
-- wordt bij elke chat-open/-sluit aangeroepen (PelotonChat, ook bij auth-events
-- als de client-user-ref wisselt). Zonder geldige JWT (anon "rondkijken" of een
-- korte token-refresh-race) faalde de call → de transactie rolde terug. Dat
-- veroorzaakte een berg rolled-back transactions (+ WAL-ruis) op een verder
-- kleine database.
--
-- Fix: niet meer RAISEn maar stil RETURNen wanneer er geen ingelogde gebruiker
-- is. Dan committeert de transactie zonder write i.p.v. een rollback. Gedrag
-- voor ingelogde gebruikers blijft identiek (upsert van de leesstatus).

CREATE OR REPLACE FUNCTION public.mark_subpoule_read(p_subpoule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN; -- geen ingelogde gebruiker: no-op i.p.v. exception (voorkomt rollback)
  END IF;
  INSERT INTO public.chat_read_states (subpoule_id, user_id, last_read_at, updated_at)
  VALUES (p_subpoule_id, auth.uid(), now(), now())
  ON CONFLICT (subpoule_id, user_id)
  DO UPDATE SET last_read_at = now(), updated_at = now();
END $$;
