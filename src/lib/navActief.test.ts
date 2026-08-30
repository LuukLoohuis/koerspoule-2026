import { describe, expect, it } from "vitest";
import { navIsActief } from "@/lib/navActief";

const KRANT = { to: "/karavaan", tab: "karavaan" };
const VOLGWAGEN = { to: "/mijn-peloton", tab: "team" };
const SUBPOULE = { to: "/mijn-peloton", tab: "subpoules" };
const HORS = { to: "/mijn-peloton", tab: "hors" };
const UITSLAGEN = { to: "/uitslagen" };

describe("navIsActief", () => {
  it("zet de Krant aan op /karavaan zonder tab", () => {
    expect(navIsActief(KRANT, "/karavaan", null)).toBe(true);
    expect(navIsActief(SUBPOULE, "/karavaan", null)).toBe(false);
  });

  it("volgt de tab als je vanaf de Krant doorspringt", () => {
    // Dit ging mis: het pad blijft /karavaan, dus de balk bleef op Krant staan
    // terwijl de subpoule in beeld kwam.
    expect(navIsActief(SUBPOULE, "/karavaan", "subpoules")).toBe(true);
    expect(navIsActief(KRANT, "/karavaan", "subpoules")).toBe(false);
  });

  it("werkt net zo vanaf /mijn-peloton", () => {
    expect(navIsActief(VOLGWAGEN, "/mijn-peloton", "team")).toBe(true);
    expect(navIsActief(HORS, "/mijn-peloton", "hors")).toBe(true);
    expect(navIsActief(SUBPOULE, "/mijn-peloton", "hors")).toBe(false);
  });

  it("zet de Krant aan op /mijn-peloton zonder tab", () => {
    // De pagina opent daar ook op de Krant; de balk hoort dat te volgen.
    expect(navIsActief(KRANT, "/mijn-peloton", null)).toBe(true);
    expect(navIsActief(VOLGWAGEN, "/mijn-peloton", null)).toBe(false);
  });

  it("laat een eigen route op het pad afgaan", () => {
    expect(navIsActief(UITSLAGEN, "/uitslagen", null)).toBe(true);
    expect(navIsActief(UITSLAGEN, "/uitslagen/etappe/3", null)).toBe(true);
    expect(navIsActief(UITSLAGEN, "/karavaan", null)).toBe(false);
  });

  it("houdt een tab-knop uit op een heel andere pagina", () => {
    expect(navIsActief(SUBPOULE, "/uitslagen", "subpoules")).toBe(false);
  });
});
