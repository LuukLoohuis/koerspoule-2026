import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

/**
 * Werkende localStorage voor alle tests.
 *
 * De jsdom-omgeving hier levert er wel een object voor, maar zonder methoden:
 * `localStorage.getItem` is undefined. Code die netjes in een try/catch zit —
 * en dat is bij ons alles wat de opslag aanraakt — slikt die fout stil in, en
 * dan test je zonder het te merken een tak die nooit werkt.
 */
const opslag = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: {
    getItem: (k: string) => opslag.get(k) ?? null,
    setItem: (k: string, v: string) => void opslag.set(k, String(v)),
    removeItem: (k: string) => void opslag.delete(k),
    clear: () => opslag.clear(),
    key: (i: number) => Array.from(opslag.keys())[i] ?? null,
    get length() { return opslag.size; },
  },
});
