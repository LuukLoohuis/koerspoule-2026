type SearchableParticipant = {
  display_name: string | null;
  team_name: string | null;
};

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("nl-NL")
    .trim();
}

/** Zoekt flexibel op alle woorden uit deelnemersnaam en ploegnaam samen. */
export function matchesParticipantSearch(participant: SearchableParticipant, query: string): boolean {
  const tokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = normalizeSearchText(`${participant.display_name ?? ""} ${participant.team_name ?? ""}`);
  return tokens.every((token) => haystack.includes(token));
}
