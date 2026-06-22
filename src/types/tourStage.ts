// Rijke TdF-etappe-kaart uit de touretappe-scraper (tabel: tour_stage_cards).
// Los van de game-`stages` (game_id/scoring) — dit is de marketing/etappe-data.

export type Climb = {
  name: string;
  category?: string;
  elevation?: string;
  gradient?: string;
  length?: string;
};

export type Stage = {
  stage: number;
  title: string;
  distance: string;
  elevation: string;
  start_city: string;
  finish_city: string;
  stage_date: string | null;
  description: string;
  source_url: string;
  climbs: Climb[];
  stage_type: "Flat" | "Hilly" | "Mountain" | "Time Trial" | "Summit Finish" | "Cobbles" | null;
  visual_theme: string;
  key_elements: string[];
  atmosphere: string;
  notable_climbs: string[];
  lighting_condition: string;
  profile_description: string;
  image_prompt: string;
  generated_image_path: string | null;
  profile_image_path: string | null;
  generated_image_url: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
};
