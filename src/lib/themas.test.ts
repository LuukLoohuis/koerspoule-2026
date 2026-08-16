import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveThemaKey, THEMAS } from "@/lib/themas";

describe("centrale game-branding", () => {
  it.each([
    ["tdf", "geel", "/koerspoule-tour.svg", "/favicon-tour.svg"],
    ["tour", "geel", "/koerspoule-tour.svg", "/favicon-tour.svg"],
    ["femmes", "geel", "/koerspoule-tour.svg", "/favicon-tour.svg"],
    ["giro", "roze", "/koerspoule-giro.svg", "/favicon-giro.svg"],
    ["vuelta", "rood", "/koerspoule-vuelta.svg", "/favicon-vuelta.svg"],
  ] as const)("koppelt %s aan thema %s en de juiste branding", (gameType, key, logo, favicon) => {
    const resolved = deriveThemaKey(null, gameType);
    expect(resolved).toBe(key);
    expect(THEMAS[resolved].logo).toBe(logo);
    expect(THEMAS[resolved].favicon).toBe(favicon);
  });

  it("geeft een expliciete game-theme voorrang op het game_type", () => {
    expect(deriveThemaKey("rood", "giro")).toBe("rood");
  });

  it("houdt site-accent en logo-opdracht op dezelfde racekleuren", () => {
    expect(THEMAS.geel.kleuren.primair).toBe("#FFC300");
    expect(THEMAS.roze.kleuren.primair).toBe("#FF69B4");
    expect(THEMAS.rood.kleuren.primair).toBe("#E30613");
  });

  it.each(["tour", "giro", "vuelta"])("houdt het %s-logo op exact hetzelfde canvas", (race) => {
    const svg = readFileSync(`${process.cwd()}/public/koerspoule-${race}.svg`, "utf8");
    expect(svg).toContain('viewBox="0 0 480 320"');
    expect(svg).toContain('width="480" height="320"');
  });

  it.each(["tour", "giro", "vuelta"])("maakt het %s-logo zelfvoorzienend voor img-rendering", (race) => {
    const svg = readFileSync(`${process.cwd()}/public/koerspoule-${race}.svg`, "utf8");
    expect(svg).toContain('href="data:image/png;base64,');
    expect(svg).not.toContain('href="koerspoule-logo-2026.png"');
  });

  it.each(["tour", "giro", "vuelta"])("behoudt de zelfvoorzienende fiets-favicon voor %s", (race) => {
    const svg = readFileSync(`${process.cwd()}/public/favicon-${race}.svg`, "utf8");
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(svg).toContain('href="data:image/png;base64,');
  });

  it("gebruikt voor Spanje een ingekaderde rood-geel-rood vlag met een dubbelbrede gele baan", () => {
    const svg = readFileSync(`${process.cwd()}/public/koerspoule-vuelta.svg`, "utf8");
    expect(svg).toContain('fill="#111318" stroke="#050608"');
    expect(svg).toContain('height="13" fill="url(#flag-red)"');
    expect(svg).toContain('height="26" fill="url(#flag-yellow)"');
    expect(svg).toContain('height="14" fill="url(#flag-red)"');
  });
});
