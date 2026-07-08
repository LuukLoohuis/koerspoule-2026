import { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureEvent, captureException } from "@/lib/posthog";

type Status = "loading" | "success" | "invalid" | "error";

export default function Uitschrijven() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token || !supabase) { setStatus("invalid"); return; }

    supabase.rpc("public_unsubscribe", { p_token: token }).then(({ data, error }) => {
      if (error) {
        captureException(error, {
          area: "unsubscribe",
        });
        setStatus("error");
        return;
      }
      const result = data as { success: boolean; email?: string; error?: string };
      if (result.success) {
        captureEvent("unsubscribe_completed", {
          unsubscribe_status: "success",
        });
        setEmail(result.email ?? null);
        setStatus("success");
      } else {
        setStatus("invalid");
      }
    });
  }, [searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-center">
          <span className="font-display text-2xl font-bold text-primary tracking-wide">KOERSPOULE</span>
        </div>

        {status === "loading" && (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{t("auth.unsubscribe.loading")}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
            <h1 className="font-display text-2xl font-bold">{t("auth.unsubscribe.successTitle")}</h1>
            <p className="text-muted-foreground">
              {email ? (
                <Trans i18nKey="auth.unsubscribe.successWithEmail" values={{ email }} />
              ) : (
                t("auth.unsubscribe.successNoEmail")
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("auth.unsubscribe.keepUsing")}
            </p>
            <Button asChild variant="outline">
              <Link to="/">{t("auth.unsubscribe.backHome")}</Link>
            </Button>
          </div>
        )}

        {status === "invalid" && (
          <div className="space-y-4">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="font-display text-2xl font-bold">{t("auth.unsubscribe.invalidTitle")}</h1>
            <p className="text-muted-foreground">
              {t("auth.unsubscribe.invalidDesc")}
            </p>
            <Button asChild variant="outline">
              <Link to="/">{t("auth.unsubscribe.backHome")}</Link>
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h1 className="font-display text-2xl font-bold">{t("auth.unsubscribe.errorTitle")}</h1>
            <p className="text-muted-foreground">
              <Trans
                i18nKey="auth.unsubscribe.errorDesc"
                components={{ mail: <a href="mailto:info@koerspoule.nl" className="underline" /> }}
              />
            </p>
            <Button asChild variant="outline">
              <Link to="/">{t("auth.unsubscribe.backHome")}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
