// De Resend-webhook staat open op internet (verify_jwt = false) en schrijft naar
// een append-only onderdrukkingslijst. De handtekeningcontrole is de enige poort
// en een onterechte blokkade is niet terug te draaien vanuit de app — beide
// redenen om dit vast te leggen in plaats van erop te vertrouwen.
import { describe, it, expect } from "vitest";
import {
  handtekeningKlopt,
  bepaalOnderdrukking,
  ontvangersUit,
  veiligGelijk,
} from "../../supabase/functions/_shared/webhook";

// Officiële testvector uit de Svix-documentatie.
const SECRET = "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";
const ID = "msg_p5jXN8AQM9LWM0D4loKWxJek";
const TS_SEC = "1614265330";
const BODY = '{"test": 2432232314}';
const SIG = "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=";
// Doe alsof "nu" vlak na de ondertekening ligt, anders slaat de replaycontrole toe.
const NU = Number(TS_SEC) * 1000;

const kop = (o: Partial<{ id: string; timestamp: string; signature: string }> = {}) => ({
  id: ID, timestamp: TS_SEC, signature: SIG, ...o,
});

describe("Svix-handtekening", () => {
  it("accepteert de officiële testvector", async () => {
    expect(await handtekeningKlopt(SECRET, kop(), BODY, NU)).toBe(true);
  });

  it("weigert een gewijzigde body", async () => {
    expect(await handtekeningKlopt(SECRET, kop(), '{"test": 9999999999}', NU)).toBe(false);
  });

  it("weigert een body die opnieuw is geserialiseerd", async () => {
    // JSON.stringify haalt de spatie na de dubbele punt weg. Daarom tekent de
    // functie de ruwe tekst; deze test bewaakt dat die keuze blijft staan.
    expect(await handtekeningKlopt(SECRET, kop(), JSON.stringify(JSON.parse(BODY)), NU)).toBe(false);
  });

  it("weigert een verkeerd secret", async () => {
    expect(await handtekeningKlopt("whsec_" + btoa("fout"), kop(), BODY, NU)).toBe(false);
  });

  it("weigert ontbrekende koppen", async () => {
    expect(await handtekeningKlopt(SECRET, kop({ signature: undefined as never }), BODY, NU)).toBe(false);
    expect(await handtekeningKlopt(SECRET, { id: null, timestamp: TS_SEC, signature: SIG }, BODY, NU)).toBe(false);
  });

  it("weigert een oude melding (replay)", async () => {
    expect(await handtekeningKlopt(SECRET, kop(), BODY, NU + 301_000)).toBe(false);
  });

  it("vindt de juiste handtekening tussen meerdere (sleutelrotatie)", async () => {
    const meerdere = `v1,${btoa("onzin")} ${SIG}`;
    expect(await handtekeningKlopt(SECRET, kop({ signature: meerdere }), BODY, NU)).toBe(true);
  });
});

describe("onderdrukkingsbeslissing", () => {
  it("onderdrukt spamklachten altijd", () => {
    expect(bepaalOnderdrukking("email.complained")).toBe("complaint");
  });

  it("onderdrukt alleen permanente bounces", () => {
    expect(bepaalOnderdrukking("email.bounced", "Permanent")).toBe("bounce");
    expect(bepaalOnderdrukking("email.bounced", "permanent")).toBe("bounce");
  });

  it("laat tijdelijke en onbekende bounces met rust", () => {
    // Volle mailbox of server even plat: dat adres werkt volgende week weer, en
    // de lijst is append-only dus een blokkade is definitief.
    expect(bepaalOnderdrukking("email.bounced", "Transient")).toBeNull();
    expect(bepaalOnderdrukking("email.bounced", "Undetermined")).toBeNull();
    expect(bepaalOnderdrukking("email.bounced", undefined)).toBeNull();
  });

  it("negeert meldingen die niets met bezorgbaarheid te maken hebben", () => {
    for (const t of ["email.sent", "email.delivered", "email.opened", "email.clicked"]) {
      expect(bepaalOnderdrukking(t, "Permanent")).toBeNull();
    }
  });
});

describe("ontvangers uit een melding", () => {
  it("normaliseert, ontdubbelt en accepteert zowel lijst als losse waarde", () => {
    expect(ontvangersUit(["  A@Example.COM ", "a@example.com", "b@x.nl"])).toEqual(["a@example.com", "b@x.nl"]);
    expect(ontvangersUit("Los@Adres.nl")).toEqual(["los@adres.nl"]);
  });

  it("laat rommel eruit", () => {
    expect(ontvangersUit(undefined)).toEqual([]);
    expect(ontvangersUit(["geen-adres", ""])).toEqual([]);
  });
});

describe("veiligGelijk", () => {
  it("vergelijkt op inhoud en lengte", () => {
    expect(veiligGelijk(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
    expect(veiligGelijk(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
    expect(veiligGelijk(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });
});
