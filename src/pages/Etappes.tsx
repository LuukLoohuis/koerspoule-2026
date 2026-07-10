import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mountain, ChevronRight } from "lucide-react";
import { useTourStages } from "@/hooks/useTourStages";

export default function Etappes() {
  const { t } = useTranslation();
  const { data: stages = [], isLoading } = useTourStages();

  return (
    <div className="container mx-auto px-5 py-6 md:py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display font-black text-3xl md:text-4xl mb-1">{t("common.etappes.title")}</h1>
        <p className="text-muted-foreground font-serif italic mb-5">{t("common.etappes.subtitle")}</p>

        {isLoading ? (
          <div className="space-y-3 animate-pulse motion-reduce:animate-none">
            {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-foreground/10" />)}
          </div>
        ) : stages.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t("common.etappes.empty")}</p>
        ) : (
          <div className="space-y-3">
            {stages.map((s) => (
              <Link key={s.stage} to={`/etappes/${s.stage}`} className="block group">
                <Card className="ornate-frame retro-border transition-shadow group-hover:shadow-[3px_3px_0_hsl(var(--foreground))]">
                  <CardContent className="p-3 md:p-4 flex items-center gap-3">
                    {s.generated_image_url ? (
                      <img src={s.generated_image_url} alt="" loading="lazy" className="h-14 w-24 object-cover rounded border border-border shrink-0" />
                    ) : (
                      <div className="h-14 w-24 rounded border border-dashed border-foreground/20 bg-secondary/30 flex items-center justify-center shrink-0">
                        <Mountain className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{t("common.etappes.stageLabel", { n: s.stage })}</span>
                        {s.stage_type && <Badge variant="outline" className="text-[10px]">{s.stage_type}</Badge>}
                      </div>
                      <p className="font-display font-bold truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.start_city} → {s.finish_city}{s.distance ? ` · ${s.distance}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
