CREATE OR REPLACE FUNCTION public.slugify(p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
  select coalesce(
    nullif(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            translate(
              replace(lower(coalesce(p_text, '')), 'ß', 'ss'),
              'áàâäãåçćčéèêëēěėęíìîïīįıñńňóòôöõøōőśšúùûüūůűýÿžźżğďł',
              'aaaaaaccceeeeeeeeiiiiiiinnnoooooooossuuuuuuuyyzzzgdl'
            ),
            '[^a-z0-9]+', '-', 'g'
          ),
          '-{2,}', '-', 'g'
        ),
        '(^-|-$)', '', 'g'
      ),
    ''),
    'subpoule'
  );
$function$;