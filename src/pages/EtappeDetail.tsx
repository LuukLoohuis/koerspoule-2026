import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mountain, MapPin, Ruler, TrendingUp, CalendarDays } from "lucide-react";
import { useTourStage } from "@/hooks/useTourStages";

export default function EtappeDetail() {
  const { t } = useTranslation();
  const { stageNumber } = useParams<{ stageNumber: string }>();
  const n = Number(stageNumber);
  const { data: stage, isLoading, isError } = useTourStage(Number.isNaN(n) ? undefined : n);

  if (isLoading) {
    return (
      <div className="container mx-auto px-5 py-8">
        <div className="max-w-3xl mx-auto animate-pulse motion-reduce:animate-none space-y-4">
          <div className="h-56 rounded-xl bg-foreground/10" />
          <div className="h-8 w-2/3 rounded bg-foreground/10" />
          <div className="h-4 w-1/2 rounded bg-foreground/10" />
        </div>
      </div>
    );
  }

  if (isError || !stage) {
    return (
      <div className="container mx-auto px-5 py-8 text-center">
        <p className="font-display text-xl font-bold mb-2">{t("common.etappes.notFoundTitle")}</p>
        <p className="text-sm text-muted-foreground mb-4">{t("common.etappes.notFoundBody")}</p>
        <Button asChild variant="outline"><Link to="/etappes">{t("common.etappes.allStages")}</Link></Button>
      </div>
    );
  }

  const meta: { icon: typeof MapPin; text: string }[] = [
    { icon: MapPin, text: `${stage.start_city} → ${stage.finish_city}` },
    ...(stage.distance ? [{ icon: Ruler, text: stage.distance }] : []),
    ...(stage.elevation ? [{ icon: TrendingUp, text: stage.elevation }] : []),
    ...(stage.stage_date ? [{ icon: CalendarDays, text: stage.stage_date }] : []),
  ];

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <article className="max-w-3xl mx-auto space-y-5">
        {/* Hero */}
        {stage.generated_image_url ? (
          <img
            src={stage.generated_image_url}
            alt={stage.title}
            className="block w-full h-auto rounded-xl border-2 border-border"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[16/9] rounded-xl border-2 border-dashed border-foreground/20 bg-card flex items-center justify-center">
            <Mountain className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{t("common.etappes.stageLabel", { n: stage.stage })}</p>
          <h1 className="font-display font-black text-3xl md:text-4xl leading-tight mt-1">{stage.title}</h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-muted-foreground">
            {meta.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <m.icon className="h-4 w-4 text-primary shrink-0" />
                {m.text}
              </span>
            ))}
            {stage.stage_type && (
              <Badge variant="outline" className="text-xs">{stage.stage_type}</Badge>
            )}
          </div>
        </div>

        {/* Profielbeeld */}
        {stage.profile_image_url && (
          <img
            src={stage.profile_image_url}
            alt={t("common.etappes.elevationAlt", { n: stage.stage })}
            className="block w-full h-auto rounded-lg border border-border"
            loading="lazy"
          />
        )}

        {/* Klimmen */}
        {stage.climbs.length > 0 && (
          <Card className="ornate-frame retro-border">
            <CardContent className="p-4">
              <h2 className="font-display text-lg font-bold mb-2 flex items-center gap-2">
                <Mountain className="h-4 w-4 text-primary" /> {t("common.etappes.climbs")}
              </h2>
              <ul className="space-y-1.5">
                {stage.climbs.map((c, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{c.name}</span>
                    {c.category ? <span className="text-muted-foreground"> ({c.category})</span> : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Beschrijving */}
        {stage.description && (
          <p className="font-serif text-foreground/90 leading-relaxed">{stage.description}</p>
        )}

        <Button asChild variant="outline"><Link to="/etappes">{t("common.etappes.allStages")}</Link></Button>
      </article>
    </div>
  );
}
