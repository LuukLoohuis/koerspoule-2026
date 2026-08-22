// Toetst de poortwachters en de onderdrukkingsbeslissing van de SES-webhook.
// suppressed_emails is append-only, dus onterecht blokkeren is niet terug te
// draaien: de "mag niet"-gevallen zijn hier belangrijker dan de "mag wel".
import { describe, it, expect } from "vitest";
import {
  certUrlVertrouwd,
  topicVertrouwd,
  bepaalOnderdrukking,
  ontvangersUit,
} from "../../supabase/functions/_shared/sns";

const TOPIC = "arn:aws:sns:eu-north-1:123456789012:koerspoule-mail-events";

describe("certUrlVertrouwd", () => {
  it("accepteert een echte SNS-host", () => {
    expect(certUrlVertrouwd("https://sns.eu-north-1.amazonaws.com/SimpleNotificationService-abc.pem")).toBe(true);
  });

  it.each([
    ["ontbrekend", undefined],
    ["geen URL", "zomaar tekst"],
    ["http in plaats van https", "http://sns.eu-north-1.amazonaws.com/c.pem"],
    ["vreemd domein", "https://sns.eu-north-1.amazonaws.com.kwaadaardig.nl/c.pem"],
    ["subdomeintruc", "https://kwaadaardig.nl/sns.eu-north-1.amazonaws.com/c.pem"],
    ["andere AWS-dienst", "https://s3.eu-north-1.amazonaws.com/c.pem"],
    ["gebruikersnaam in de URL", "https://sns.eu-north-1.amazonaws.com@kwaad.nl/c.pem"],
  ])("weigert %s", (_naam, url) => {
    expect(certUrlVertrouwd(url as string | undefined)).toBe(false);
  });
});

describe("topicVertrouwd", () => {
  it("accepteert alleen exact ons eigen topic", () => {
    expect(topicVertrouwd(TOPIC, TOPIC)).toBe(true);
    expect(topicVertrouwd(`${TOPIC}-anders`, TOPIC)).toBe(false);
    expect(topicVertrouwd(undefined, TOPIC)).toBe(false);
  });

  it("weigert alles als het verwachte topic niet geconfigureerd is", () => {
    expect(topicVertrouwd(TOPIC, undefined)).toBe(false);
    expect(topicVertrouwd(TOPIC, "")).toBe(false);
  });
});

describe("bepaalOnderdrukking", () => {
  it("onderdrukt een permanente bounce", () => {
    expect(bepaalOnderdrukking({ eventType: "Bounce", bounce: { bounceType: "Permanent" } })).toBe("bounce");
  });

  it("onderdrukt een klacht", () => {
    expect(bepaalOnderdrukking({ eventType: "Complaint", complaint: {} })).toBe("complaint");
  });

  it("laat een tijdelijke bounce met rust", () => {
    expect(bepaalOnderdrukking({ eventType: "Bounce", bounce: { bounceType: "Transient" } })).toBeNull();
  });

  it("laat een onbepaalde bounce met rust", () => {
    expect(bepaalOnderdrukking({ eventType: "Bounce", bounce: { bounceType: "Undetermined" } })).toBeNull();
  });

  it("negeert bezorg- en openmeldingen", () => {
    for (const eventType of ["Delivery", "Send", "Open", "Click", "DeliveryDelay", "Subscription"]) {
      expect(bepaalOnderdrukking({ eventType })).toBeNull();
    }
  });

  it("begrijpt ook notificationType, de vorm van rechtstreekse SNS-meldingen", () => {
    expect(bepaalOnderdrukking({ notificationType: "Complaint", complaint: {} })).toBe("complaint");
    expect(bepaalOnderdrukking({ notificationType: "Bounce", bounce: { bounceType: "Permanent" } })).toBe("bounce");
  });

  it("blokkeert niet bij een lege of onbekende melding", () => {
    expect(bepaalOnderdrukking({})).toBeNull();
    expect(bepaalOnderdrukking({ eventType: "Bounce" })).toBeNull();
  });
});

describe("ontvangersUit", () => {
  it("haalt gebouncede adressen op", () => {
    expect(ontvangersUit({
      bounce: { bouncedRecipients: [{ emailAddress: "A@Koerspoule.nl" }, { emailAddress: "b@x.nl" }] },
    })).toEqual(["a@koerspoule.nl", "b@x.nl"]);
  });

  it("haalt klagende adressen op", () => {
    expect(ontvangersUit({ complaint: { complainedRecipients: [{ emailAddress: " C@x.nl " }] } })).toEqual(["c@x.nl"]);
  });

  it("valt terug op mail.destination als de klager niet genoemd wordt", () => {
    expect(ontvangersUit({
      complaint: { complainedRecipients: [] },
      mail: { destination: ["d@x.nl"] },
    })).toEqual(["d@x.nl"]);
  });

  it("ontdubbelt en negeert wat geen adres is", () => {
    expect(ontvangersUit({
      bounce: { bouncedRecipients: [{ emailAddress: "a@x.nl" }, { emailAddress: "A@X.nl" }, { emailAddress: "kapot" }] },
    })).toEqual(["a@x.nl"]);
  });

  it("levert niets op bij een lege melding", () => {
    expect(ontvangersUit({})).toEqual([]);
  });
});
