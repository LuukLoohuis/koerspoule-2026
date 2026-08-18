/**
 * Veeggedrag van de tabcarrousel, met Benchmark als concrete zaak.
 *
 * Benchmark had `data-swipe-carousel-ignore` op het hele paneel staan. Dat
 * schakelt de veegbeweging uit voor alles wat je daar aanraakt, dus je kwam er
 * wel in maar niet meer uit — en Benchmark is het laatste tabje. Het attribuut
 * hoort op de horizontale chiprijen zelf.
 *
 * De tests draaien in de reduced-motion-tak: die commit synchroon op touchend,
 * zonder rAF, timers of flushSync. Dat is dezelfde beslissing (welke buur, en
 * of het gebaar telt), alleen zonder animatie eromheen.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SwipeCarousel from "./SwipeCarousel";

const KEYS = ["superteam", "benchmark"];

/** Eén vinger van (x0,y0) naar (x1,y1) over het gegeven element. */
function veeg(doel: Element, x0: number, y0: number, x1: number, y1: number) {
  const punt = (x: number, y: number) => [{ clientX: x, clientY: y }];
  fireEvent.touchStart(doel, { touches: punt(x0, y0), targetTouches: punt(x0, y0) });
  // Twee bewegingen: de eerste breekt de as-vergrendeling, de tweede legt af.
  fireEvent.touchMove(doel, { touches: punt(x0 + (x1 - x0) / 2, y0 + (y1 - y0) / 2) });
  fireEvent.touchMove(doel, { touches: punt(x1, y1) });
  fireEvent.touchEnd(doel, { changedTouches: punt(x1, y1) });
}

function toonBenchmark(onChange: () => void) {
  render(
    <SwipeCarousel
      keys={KEYS}
      activeKey="benchmark"
      onChange={onChange}
      renderTab={(k) =>
        k === "benchmark" ? (
          <div data-testid="benchmark">
            {/* Zoals in BenchmarkTab: de chiprij is uitgesloten, het paneel niet. */}
            <div data-testid="chips" data-swipe-carousel-ignore>
              <button type="button">Alle deelnemers</button>
            </div>
            <p data-testid="paneel">Jouw ploeg naast die van iemand anders</p>
          </div>
        ) : (
          <div data-testid="superteam">The Emirates</div>
        )
      }
    />,
  );
}

describe("SwipeCarousel", () => {
  beforeEach(() => {
    // Reduced-motion: touchend beslist meteen, geen animatiepad.
    window.matchMedia = ((query: string) => ({
      matches: query.includes("reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => vi.restoreAllMocks());

  it("veegt vanuit het Benchmark-paneel terug naar het vorige onderdeel", () => {
    const onChange = vi.fn();
    toonBenchmark(onChange);

    // Naar rechts vegen = terug naar de vorige tab (The Emirates).
    veeg(screen.getByTestId("paneel"), 40, 200, 160, 206);

    expect(onChange).toHaveBeenCalledWith("superteam");
  });

  it("laat de chiprij zijn eigen gebaar houden", () => {
    const onChange = vi.fn();
    toonBenchmark(onChange);

    veeg(screen.getByTestId("chips"), 40, 200, 160, 206);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("kaapt een verticale scroll niet", () => {
    const onChange = vi.fn();
    toonBenchmark(onChange);

    // Grotendeels omlaag, met wat horizontale ruis: de pagina hoort te scrollen.
    veeg(screen.getByTestId("paneel"), 100, 100, 130, 300);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("negeert een veeg die te kort is om bedoeld te zijn", () => {
    const onChange = vi.fn();
    toonBenchmark(onChange);

    veeg(screen.getByTestId("paneel"), 100, 200, 130, 202);

    expect(onChange).not.toHaveBeenCalled();
  });
});
