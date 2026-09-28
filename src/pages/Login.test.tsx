// De truien boven het inlogformulier volgen het thema: bij de wielerkoersen
// vier, bij de Meermarathon alleen de oranje leiderstrui en de witte trui.
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ThemaKey } from "@/lib/themas";
import Login from "./Login";

const staat = vi.hoisted(() => ({ key: "roze" as ThemaKey }));

vi.mock("react-i18next", async () => {
  const { maakT } = await import("@/test/i18nMock");
  return { useTranslation: () => ({ t: maakT(), i18n: { language: "nl" } }), Trans: () => null };
});
vi.mock("@/contexts/ThemaContext", async () => {
  const { THEMAS } = await import("@/lib/themas");
  return { useThema: () => ({ thema: THEMAS[staat.key], key: staat.key }) };
});
vi.mock("@/lib/supabase", () => ({ supabase: null }));
vi.mock("@/lib/posthog", () => ({ captureEvent: vi.fn(), captureException: vi.fn(), identifyUser: vi.fn() }));
vi.mock("@/lib/sendEmail", () => ({ sendEmail: vi.fn(), registratieHtml: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/KoerspouleLogo", () => ({ default: () => null }));

function truien(key: ThemaKey) {
  staat.key = key;
  const { container } = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  return [...container.querySelectorAll(".jersey-badge")].map((b) => b.getAttribute("title"));
}

describe("Login", () => {
  it("Meermarathon: alleen de leiderstrui en de witte trui", () => {
    expect(truien("winter")).toEqual(["Leiderstrui", "Witte trui"]);
  });

  it("Giro: de vier truien van de koers", () => {
    expect(truien("roze")).toEqual(["Maglia Rosa", "Maglia Ciclamino", "Maglia Azzurra", "Maglia Bianca"]);
  });
});
