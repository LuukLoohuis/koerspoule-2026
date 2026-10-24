import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ddpFetch, type DdpOptions, type DdpSub } from "../../supabase/functions/_shared/ddp";

/** Nep-WebSocket: de test speelt livemarathon.schaatsen.nl, ddpFetch de client. */
class NepSocket {
  static laatste: NepSocket | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  verzonden: Record<string, unknown>[] = [];
  dicht = false;

  constructor(public url: string) {
    NepSocket.laatste = this;
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string) {
    this.verzonden.push(JSON.parse(data));
  }

  close() {
    this.dicht = true;
  }

  stuur(bericht: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(bericht) });
  }
}

/** Start een fetch tot en met de handdruk; meet hoe lang hij loopt. */
async function start(subs: DdpSub[], opties: DdpOptions) {
  let duur: number | null = null;
  const begin = Date.now();
  const belofte = ddpFetch(subs, opties).then((r) => {
    duur = Date.now() - begin;
    return r;
  });
  await vi.advanceTimersByTimeAsync(0);
  const bron = NepSocket.laatste!;
  bron.stuur({ msg: "connected", session: "test" });
  return { bron, belofte, duur: () => duur };
}

/** De klok van de bron die tijdens een race elke 200 ms doortikt. */
function tikDoor(bron: NepSocket) {
  let n = 0;
  return setInterval(() => {
    n++;
    bron.stuur({ msg: "changed", collection: "races", id: "Amsterdam", fields: { RaceTime: `7:${String(n).padStart(2, "0")}` } });
  }, 200);
}

describe("ddpFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", NepSocket);
    NepSocket.laatste = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("stopt kort na de beginstand, ook als de bron blijft doortikken", async () => {
    const { bron, belofte, duur } = await start(
      [{ name: "races.inTrack" }, { name: "stand.inTrack" }],
      { quietMs: 1000, maxMs: 20000 },
    );
    bron.stuur({ msg: "added", collection: "races", id: "Amsterdam", fields: { RaceTime: "7:00" } });
    for (let i = 0; i < 3; i++) {
      bron.stuur({ msg: "added", collection: "stand", id: `r${i}`, fields: { Naam: `Rijder ${i}` } });
    }
    bron.stuur({ msg: "ready", subs: ["s0", "s1"] });
    const tik = tikDoor(bron);

    await vi.advanceTimersByTimeAsync(3000);
    clearInterval(tik);
    const r = await belofte;

    expect(bron.verzonden.filter((m) => m.msg === "sub").map((m) => m.id)).toEqual(["s0", "s1"]);
    expect(duur()).toBeLessThan(2000);
    expect(r.ready).toBe(true);
    expect(Object.keys(r.collections.stand)).toHaveLength(3);
    // Wijzigingen tijdens het wachten zijn meegenomen.
    expect(r.collections.races.Amsterdam.RaceTime).not.toBe("7:00");
    expect(bron.dicht).toBe(true);
  });

  it("wacht op documenten die pas na ready binnenkomen", async () => {
    const { bron, belofte } = await start([{ name: "stand.inTrack" }], { quietMs: 1000, maxMs: 20000 });
    bron.stuur({ msg: "ready", subs: ["s0"] });
    await vi.advanceTimersByTimeAsync(600);
    for (let i = 0; i < 25; i++) {
      bron.stuur({ msg: "added", collection: "stand", id: `r${i}`, fields: { Naam: `Rijder ${i}` } });
    }

    await vi.advanceTimersByTimeAsync(3000);
    const r = await belofte;

    expect(Object.keys(r.collections.stand)).toHaveLength(25);
  });

  it("telt een geweigerd abonnement als klaar", async () => {
    const { bron, belofte, duur } = await start(
      [{ name: "races.inTrack" }, { name: "bestaat.niet" }],
      { quietMs: 1000, maxMs: 20000 },
    );
    bron.stuur({ msg: "added", collection: "races", id: "Amsterdam", fields: {} });
    bron.stuur({ msg: "ready", subs: ["s0"] });
    bron.stuur({ msg: "nosub", id: "s1" });
    const tik = tikDoor(bron);

    await vi.advanceTimersByTimeAsync(3000);
    clearInterval(tik);
    await belofte;

    expect(duur()).toBeLessThan(2000);
  });

  it("houdt de bovengrens aan als de bron nooit klaar meldt en blijft praten", async () => {
    const { bron, belofte, duur } = await start([{ name: "stand.inTrack" }], { quietMs: 1000, maxMs: 5000 });
    const tik = tikDoor(bron);

    await vi.advanceTimersByTimeAsync(6000);
    clearInterval(tik);
    const r = await belofte;

    expect(duur()).toBeGreaterThanOrEqual(5000);
    expect(duur()).toBeLessThan(5600);
    expect(r.ready).toBe(false);
  });

  it("stopt als de bron helemaal stil valt, ook zonder ready", async () => {
    const { bron, belofte, duur } = await start([{ name: "stand.inTrack" }], { quietMs: 1000, maxMs: 20000 });
    bron.stuur({ msg: "added", collection: "stand", id: "r0", fields: { Naam: "Rijder 0" } });

    await vi.advanceTimersByTimeAsync(3000);
    const r = await belofte;

    expect(duur()).toBeLessThan(2000);
    expect(Object.keys(r.collections.stand)).toHaveLength(1);
  });
});
