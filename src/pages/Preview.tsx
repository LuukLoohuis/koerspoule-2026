import { lazy, Suspense } from "react";

const FeaturePreview = lazy(() => import("@/components/FeaturePreview"));
const HorsCategoriePreview = lazy(() => import("@/components/HorsCategoriePreview"));

export default function Preview() {
  return (
    <div>
      <Suspense
        fallback={
          <div className="container mx-auto px-5 py-10 text-center text-muted-foreground font-serif italic text-sm">
            Voorbeelden laden…
          </div>
        }
      >
        <FeaturePreview />
      </Suspense>

      <Suspense fallback={null}>
        <HorsCategoriePreview />
      </Suspense>
    </div>
  );
}
