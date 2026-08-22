-- Herstel: etappe_verslagen kreeg RLS-policies maar geen table-grants.
--
-- Twee verschillende sloten, en ik had er maar één gezet. RLS bepaalt WELKE
-- rijen een rol mag zien of wijzigen; GRANT bepaalt of die rol de tabel
-- überhaupt mag aanraken. Zonder grant faalt het al daarvoor, met
-- "permission denied for table etappe_verslagen" -- een andere melding dan de
-- RLS-fout ("violates row-level security policy"), en juist dat verschil wees
-- de oorzaak aan.
--
-- Lezen mag iedereen: het verslag staat voor alle deelnemers in de krant.
-- Schrijven staat open voor authenticated, waarna de bestaande policy
-- etappe_verslag_admin_write het tot admins beperkt. De edge function schrijft
-- met service_role en gaat sowieso langs RLS heen.

grant select on public.etappe_verslagen to anon, authenticated;
grant insert, update, delete on public.etappe_verslagen to authenticated;
grant all on public.etappe_verslagen to service_role;

notify pgrst, 'reload schema';
