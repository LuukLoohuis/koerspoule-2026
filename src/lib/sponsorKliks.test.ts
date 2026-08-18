import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn(() => Promise.resolve({ error: null }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...(a as [])) } }));

import { logSponsorKlik, _resetKlikVenster } from "./sponsorKliks";

describe("logSponsorKlik", () => {
  beforeEach(() => {
    rpc.mockClear();
    _resetKlikVenster();
    vi.useRealTimers();
  });

  it("meldt een klik met bron, veld en plek", () => {
    logSponsorKlik("prijs", "prijs-1", "sponsor_url_2", "prijzenpagina");
    expect(rpc).toHaveBeenCalledWith("log_sponsor_klik", {
      p_bron: "prijs",
      p_bron_id: "prijs-1",
      p_veld: "sponsor_url_2",
      p_plek: "prijzenpagina",
    });
  });

  it("telt een dubbeltik op dezelfde link maar één keer", () => {
    logSponsorKlik("sponsor", "s-1", "link_url", "voorpagina");
    logSponsorKlik("sponsor", "s-1", "link_url", "voorpagina");
    logSponsorKlik("sponsor", "s-1", "link_url", "voorpagina");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("telt dezelfde link op een andere plek apart", () => {
    // Dagprijs-banner en prijzenpagina tonen dezelfde url; juist het verschil
    // tussen die twee is wat je wilt weten.
    logSponsorKlik("prijs", "p-1", "sponsor_url", "dagprijsbanner");
    logSponsorKlik("prijs", "p-1", "sponsor_url", "prijzenpagina");
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("telt de twee sponsorknoppen van één prijs apart", () => {
    logSponsorKlik("prijs", "p-1", "sponsor_url", "prijzenpagina");
    logSponsorKlik("prijs", "p-1", "sponsor_url_2", "prijzenpagina");
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("telt weer mee zodra de minuut voorbij is", () => {
    const nu = Date.now();
    const klok = vi.spyOn(Date, "now");
    klok.mockReturnValue(nu);
    logSponsorKlik("sponsor", "s-1", "link_url", "voorpagina");

    klok.mockReturnValue(nu + 59_000);
    logSponsorKlik("sponsor", "s-1", "link_url", "voorpagina");
    expect(rpc).toHaveBeenCalledTimes(1);

    klok.mockReturnValue(nu + 61_000);
    logSponsorKlik("sponsor", "s-1", "link_url", "voorpagina");
    expect(rpc).toHaveBeenCalledTimes(2);
    klok.mockRestore();
  });

  it("meldt niets zonder id", () => {
    logSponsorKlik("prijs", null, "sponsor_url", "prijzenpagina");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("laat de opslag niet volgroeien met oude sleutels", () => {
    const nu = Date.now();
    const klok = vi.spyOn(Date, "now");
    klok.mockReturnValue(nu);
    logSponsorKlik("sponsor", "s-1", "link_url", "voorpagina");
    klok.mockReturnValue(nu + 120_000);
    logSponsorKlik("sponsor", "s-2", "link_url", "voorpagina");

    const bewaard = JSON.parse(localStorage.getItem("kp_sponsor_kliks") ?? "{}");
    expect(Object.keys(bewaard)).toEqual(["sponsor:s-2:link_url:voorpagina"]);
    klok.mockRestore();
  });
});
