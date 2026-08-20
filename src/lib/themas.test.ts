import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deriveThemaKey, THEMAS } from "@/lib/themas";

describe("centrale game-branding", () => {
  it.each([
    ["tdf", "geel", "/koerspoule-tour.svg", "/favicon-tour.png"],
    ["tour", "geel", "/koerspoule-tour.svg", "/favicon-tour.png"],
    ["femmes", "geel", "/koerspoule-tour.svg", "/favicon-tour.png"],
    ["giro", "roze", "/koerspoule-giro.svg", "/favicon-giro.png"],
    ["vuelta", "rood", "/koerspoule-vuelta.png", "/favicon-vuelta.png"],
    ["meermarathon", "winter", "/koerspoule-meermarathon.png", "/favicon-meermarathon.png"],
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
    expect(THEMAS.roze.kleuren.primair).toBe("#E6446D");
    expect(THEMAS.rood.kleuren.primair).toBe("#E30613");
  });

  // Vuelta staat hier niet meer bij: dat logo is een PNG geworden.
  it.each(["tour", "giro"])("houdt het %s-logo op exact hetzelfde canvas", (race) => {
    const svg = readFileSync(`${process.cwd()}/public/koerspoule-${race}.svg`, "utf8");
    expect(svg).toContain('viewBox="0 0 480 320"');
    expect(svg).toContain('width="480" height="320"');
  });

  it.each(["tour", "giro"])("maakt het %s-logo zelfvoorzienend voor img-rendering", (race) => {
    const svg = readFileSync(`${process.cwd()}/public/koerspoule-${race}.svg`, "utf8");
    expect(svg).toContain('href="data:image/png;base64,');
    expect(svg).not.toContain('href="koerspoule-logo-2026.png"');
  });

  it.each(["tour", "giro", "vuelta", "meermarathon"])("levert een vierkante koersbadge als favicon voor %s", (race) => {
    const png = readFileSync(`${process.cwd()}/public/favicon-${race}.png`);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    // IHDR: breedte/hoogte staan als big-endian uint32 op offset 16 resp. 20.
    const breedte = png.readUInt32BE(16);
    expect(breedte).toBe(png.readUInt32BE(20));
    // Groot genoeg voor een iOS-beginschermicoon, klein genoeg om op elke
    // paginalading mee te sturen -- vandaar palet-PNG in plaats van volledige
    // kleur, dat scheelt hier een factor vijf.
    expect(breedte).toBeGreaterThanOrEqual(180);
    expect(png.length).toBeLessThan(40 * 1024);
  });

  it("houdt de primaire Giro-roze kleur vast", () => {
    // De badge is nu een raster, dus de kleur staat niet meer in het bestand.
    // Het thema-token bewaken blijft wel zinnig: daar hangt de hele site aan.
    expect(THEMAS.roze.kleuren.primair).toBe("#E6446D");
  });

  it("levert winterbranding als eigen assets", () => {
    // Het schaatslogo is een raster-illustratie met transparante achtergrond;
    // de favicon blijft vector zodat 'ie ook op 16px scherp is.
    const logo = readFileSync(`${process.cwd()}/public${THEMAS.winter.logo}`);
    expect(logo.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    // IHDR: breedte/hoogte staan als big-endian uint32 op offset 16 resp. 20.
    expect(logo.readUInt32BE(16) / logo.readUInt32BE(20)).toBeCloseTo(1.5, 2);

    // De winterfavicon is de schaatsbadge, geen wielerbadge -- Meermarathon is
    // de enige game die niet op de fiets zit.
    const favicon = readFileSync(`${process.cwd()}/public${THEMAS.winter.favicon}`);
    expect(THEMAS.winter.favicon).toBe("/favicon-meermarathon.png");
    expect(favicon.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });

  it("levert het Vuelta-schild als transparante PNG", () => {
    // Ook een raster-illustratie, net als het schaatslogo. De transparantie is
    // wat telt: het logo staat op perkament, niet op wit.
    const logo = readFileSync(`${process.cwd()}/public${THEMAS.rood.logo}`);
    expect(logo.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    // IHDR: breedte/hoogte op offset 16 resp. 20, kleurtype op offset 25.
    // Type 3 is palet; met een tRNS-blok houdt dat een alfakanaal.
    expect(logo.readUInt32BE(16) / logo.readUInt32BE(20)).toBeCloseTo(1.14, 2);
    expect(logo.includes(Buffer.from("tRNS", "ascii"))).toBe(true);
  });
});
