// @ts-nocheck
// Minimale DDP-client (Meteor) over een rauwe WebSocket.
//
// livemarathon.schaatsen.nl is een Meteor-app zonder REST-API: de HTML is een
// leeg omhulsel en alle data komt over DDP. Er is geen npm-client nodig — het
// protocol is een handvol JSON-berichten:
//
//   → {"msg":"connect","version":"1","support":["1","pre2","pre1"]}
//   ← {"msg":"connected","session":"…"}
//   → {"msg":"sub","id":"…","name":"stand.inTrack","params":[{"trackId":"…"}]}
//   ← {"msg":"added","collection":"stand","id":"…","fields":{…}}
//   ← {"msg":"ready","subs":["…"]}
//   ← {"msg":"ping"}  →  {"msg":"pong"}
//
// LET OP: `ready` betekent hier NIET dat alle documenten binnen zijn. Bij een
// meting op Haaksbergen kwamen beide `ready`-berichten vóór het merendeel van
// de 25 stand-documenten. Daarom wachten we op een stille periode in plaats van
// op `ready` — anders synchroniseer je een halve of lege stand.

export const DDP_URL = "wss://livemarathon.schaatsen.nl/websocket";

export type DdpSub = { name: string; params?: unknown[] };

export type DdpResult = {
  /** collectie → documentId → velden */
  collections: Record<string, Record<string, Record<string, unknown>>>;
  ready: boolean;
  messages: number;
};

export type DdpOptions = {
  url?: string;
  /** Stop zodra er zo lang niets meer binnenkomt. */
  quietMs?: number;
  /** Harde bovengrens, ook als de bron blijft praten. */
  maxMs?: number;
};

/**
 * Open één verbinding, neem de opgegeven abonnementen af en geef terug wat er
 * binnenkwam. De verbinding gaat daarna dicht: we houden 'm bewust niet open,
 * zodat een vastgelopen run nooit een socket laat hangen.
 */
export function ddpFetch(subs: DdpSub[], options: DdpOptions = {}): Promise<DdpResult> {
  const url = options.url ?? DDP_URL;
  const quietMs = options.quietMs ?? 1500;
  const maxMs = options.maxMs ?? 20000;

  return new Promise((resolve, reject) => {
    const collections: DdpResult["collections"] = {};
    let ready = false;
    let messages = 0;
    let lastMessage = Date.now();
    let settled = false;
    let ws: WebSocket;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      try { ws.close(); } catch { /* al dicht */ }
      resolve({ collections, ready, messages });
    };
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      clearInterval(timer);
      try { ws.close(); } catch { /* al dicht */ }
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const started = Date.now();
    const timer = setInterval(() => {
      if (settled) return;
      const now = Date.now();
      if (now - started > maxMs) return finish();
      // Pas afronden als er iets binnen was én het daarna stil bleef.
      if (messages > 0 && now - lastMessage > quietMs) finish();
    }, 250);

    try {
      ws = new WebSocket(url);
    } catch (err) {
      clearInterval(timer);
      return reject(err instanceof Error ? err : new Error(String(err)));
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ msg: "connect", version: "1", support: ["1", "pre2", "pre1"] }));
    };

    ws.onerror = () => fail(new Error("DDP-verbinding mislukt"));

    ws.onclose = () => {
      // Sluit de bron zelf af, dan is wat we hebben het resultaat.
      if (!settled) finish();
    };

    ws.onmessage = (event: MessageEvent) => {
      lastMessage = Date.now();
      messages++;
      let m: Record<string, unknown>;
      try {
        m = JSON.parse(String(event.data));
      } catch {
        return; // SockJS-achtige heartbeats e.d.
      }

      switch (m.msg) {
        case "connected":
          subs.forEach((sub, i) => {
            ws.send(JSON.stringify({
              msg: "sub",
              id: `s${i}`,
              name: sub.name,
              params: sub.params ?? [],
            }));
          });
          break;

        case "ping":
          ws.send(JSON.stringify(m.id ? { msg: "pong", id: m.id } : { msg: "pong" }));
          break;

        case "added":
        case "changed": {
          const col = String(m.collection ?? "");
          const id = String(m.id ?? "");
          if (!col || !id) break;
          const store = (collections[col] ??= {});
          store[id] = { ...(store[id] ?? {}), ...((m.fields as Record<string, unknown>) ?? {}) };
          // `cleared` hoort bij changed: die velden zijn verwijderd.
          for (const field of (m.cleared as string[] | undefined) ?? []) {
            delete store[id][field];
          }
          break;
        }

        case "removed": {
          const col = String(m.collection ?? "");
          const id = String(m.id ?? "");
          if (collections[col]) delete collections[col][id];
          break;
        }

        case "ready":
          ready = true;
          break;

        case "nosub":
          // Onbekende publicatie of geweigerd abonnement: geen reden om de
          // hele run te laten klappen, de rest kan gewoon doorlopen.
          break;
      }
    };
  });
}

/** Documenten van één collectie als lijst, met hun DDP-id erbij. */
export function docsOf(
  result: DdpResult,
  collection: string,
): { _id: string; [key: string]: unknown }[] {
  const store = result.collections[collection] ?? {};
  return Object.entries(store).map(([id, fields]) => ({ _id: id, ...fields }));
}
