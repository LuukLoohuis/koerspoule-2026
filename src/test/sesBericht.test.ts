// Toetst de vorm van het SES v2-verzoek en de invoercontrole van de mail-worker.
import { describe, it, expect } from "vitest";
import { valideer, sesBody, sesHost, SES_PATH } from "../../mail-worker/src/ses";

const goed = { to: "renner@koerspoule.nl", subject: "Rit 3", html: "<p>hoi</p>" };
const cfg = { region: "eu-north-1", from: "Koerspoule <noreply@koerspoule.nl>" };

describe("valideer", () => {
  it("laat een normaal verzoek door", () => {
    expect(valideer(goed)).toEqual({ ok: true, verzoek: goed });
  });

  it.each([
    ["geen object", null],
    ["adres zonder @", { ...goed, to: "kapot" }],
    ["leeg onderwerp", { ...goed, subject: "" }],
    ["lege html", { ...goed, html: "" }],
    ["te lang onderwerp", { ...goed, subject: "x".repeat(301) }],
    ["te grote html", { ...goed, html: "x".repeat(200_001) }],
    ["listUnsubscribe van het verkeerde type", { ...goed, listUnsubscribe: 42 }],
  ])("weigert %s", (_naam, invoer) => {
    expect(valideer(invoer).ok).toBe(false);
  });

  it("weigert nieuwe regels in to en subject (headerinjectie)", () => {
    expect(valideer({ ...goed, subject: "Rit 3\r\nBcc: stiekem@elders.nl" }).ok).toBe(false);
    expect(valideer({ ...goed, to: "a@b.nl\nc@d.nl" }).ok).toBe(false);
  });
});

describe("sesBody", () => {
  it("bouwt Simple content met UTF-8", () => {
    const b = JSON.parse(sesBody(goed, cfg));
    expect(b.FromEmailAddress).toBe(cfg.from);
    expect(b.Destination.ToAddresses).toEqual([goed.to]);
    expect(b.Content.Simple.Subject).toEqual({ Data: "Rit 3", Charset: "UTF-8" });
    expect(b.Content.Simple.Body.Html).toEqual({ Data: "<p>hoi</p>", Charset: "UTF-8" });
  });

  it("laat optionele velden weg als ze niet gezet zijn", () => {
    const b = JSON.parse(sesBody(goed, cfg));
    expect(b.ReplyToAddresses).toBeUndefined();
    expect(b.ConfigurationSetName).toBeUndefined();
    expect(b.Content.Simple.Headers).toBeUndefined();
  });

  it("neemt reply-to en configuratieset mee als ze er wel zijn", () => {
    const b = JSON.parse(sesBody(goed, { ...cfg, replyTo: "info@koerspoule.nl", configurationSet: "koerspoule" }));
    expect(b.ReplyToAddresses).toEqual(["info@koerspoule.nl"]);
    expect(b.ConfigurationSetName).toBe("koerspoule");
  });

  it("zet List-Unsubscribe als URL tussen punthaken, zonder one-click", () => {
    const url = "https://koerspoule.nl/uitschrijven?token=abc";
    const b = JSON.parse(sesBody({ ...goed, listUnsubscribe: url }, cfg));
    expect(b.Content.Simple.Headers).toEqual([{ Name: "List-Unsubscribe", Value: `<${url}>` }]);
    // One-click vereist een POST-endpoint; onze uitschrijfpagina is dat niet.
    expect(JSON.stringify(b)).not.toContain("List-Unsubscribe-Post");
  });

  it("bewaart accenten in onderwerp en body", () => {
    const b = JSON.parse(sesBody({ ...goed, subject: "Vuelta a España — rit 3" }, cfg));
    expect(b.Content.Simple.Subject.Data).toBe("Vuelta a España — rit 3");
  });
});

describe("endpoint", () => {
  it("volgt het regionale SES-patroon", () => {
    expect(sesHost("eu-north-1")).toBe("email.eu-north-1.amazonaws.com");
    expect(SES_PATH).toBe("/v2/email/outbound-emails");
  });
});
