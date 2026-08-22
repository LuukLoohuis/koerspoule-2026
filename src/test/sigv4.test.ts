// Toetst de SigV4-ondertekening aan de officiële AWS-testvector ("get-vanilla"
// uit de aws-sig-v4-test-suite). Die vector heeft een vastgelegde
// eindhandtekening, dus dit is geen zelfbevestigende test: als onze
// canonieke-verzoekopbouw of de sleutelafleiding afwijkt, valt hij om.
import { describe, it, expect } from "vitest";
import { sigV4Headers, signingKey, amzDatum } from "../../mail-worker/src/sigv4";

const ACCESS = "AKIDEXAMPLE";
const SECRET = "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY";

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");

describe("SigV4", () => {
  it("reproduceert de AWS-vector get-vanilla", async () => {
    const h = await sigV4Headers({
      method: "GET",
      path: "/",
      headers: { host: "example.amazonaws.com" },
      body: "",
      region: "us-east-1",
      service: "service",
      accessKeyId: ACCESS,
      secretAccessKey: SECRET,
      amzDate: "20150830T123600Z",
    });
    expect(h.Authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, " +
      "SignedHeaders=host;x-amz-date, " +
      "Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31",
    );
  });

  it("bindt de tekensleutel aan datum, regio en dienst", async () => {
    const basis = await signingKey(SECRET, "20150830", "us-east-1", "service");
    expect(basis).toHaveLength(32);
    // Deterministisch: zelfde invoer -> zelfde sleutel.
    expect(hex(await signingKey(SECRET, "20150830", "us-east-1", "service"))).toBe(hex(basis));
    // En elke schakel telt mee; anders zou een sleutel van gisteren of van een
    // andere regio blijven werken.
    for (const afwijkend of [
      await signingKey(SECRET, "20150831", "us-east-1", "service"),
      await signingKey(SECRET, "20150830", "eu-north-1", "service"),
      await signingKey(SECRET, "20150830", "us-east-1", "ses"),
      await signingKey(`${SECRET}x`, "20150830", "us-east-1", "service"),
    ]) {
      expect(hex(afwijkend)).not.toBe(hex(basis));
    }
  });

  it("sorteert headers canoniek, ongeacht invoervolgorde", async () => {
    const maak = (headers: Record<string, string>) => sigV4Headers({
      method: "POST", path: "/v2/email/outbound-emails", headers, body: "{}",
      region: "eu-north-1", service: "ses", accessKeyId: ACCESS, secretAccessKey: SECRET,
      amzDate: "20260822T123600Z",
    });
    const a = await maak({ "content-type": "application/json", host: "email.eu-north-1.amazonaws.com" });
    const b = await maak({ host: "email.eu-north-1.amazonaws.com", "content-type": "application/json" });
    expect(a.Authorization).toBe(b.Authorization);
    expect(a.Authorization).toContain("SignedHeaders=content-type;host;x-amz-date");
  });

  it("tekent de body mee -- andere inhoud geeft een andere handtekening", async () => {
    const maak = (body: string) => sigV4Headers({
      method: "POST", path: "/v2/email/outbound-emails",
      headers: { host: "email.eu-north-1.amazonaws.com", "content-type": "application/json" },
      body, region: "eu-north-1", service: "ses", accessKeyId: ACCESS, secretAccessKey: SECRET,
      amzDate: "20260822T123600Z",
    });
    const a = await maak('{"to":"a@b.nl"}');
    const b = await maak('{"to":"c@d.nl"}');
    expect(a.Authorization).not.toBe(b.Authorization);
  });

  it("neemt het sessietoken mee in de ondertekening", async () => {
    const h = await sigV4Headers({
      method: "POST", path: "/", headers: { host: "x.amazonaws.com" }, body: "",
      region: "eu-north-1", service: "ses", accessKeyId: ACCESS, secretAccessKey: SECRET,
      amzDate: "20260822T123600Z", sessionToken: "TOKEN123",
    });
    expect(h["x-amz-security-token"]).toBe("TOKEN123");
    expect(h.Authorization).toContain("x-amz-security-token");
  });

  it("amzDatum levert het basic ISO-formaat", () => {
    expect(amzDatum(new Date("2026-08-22T12:36:00.123Z"))).toBe("20260822T123600Z");
  });
});
