import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { initAds } from "@/lib/adsense";

// v2: bestaande bezoekers die de oude banner al accepteerden opnieuw informeren
// (advertenties via Google AdSense zijn toegevoegd).
const STORAGE_KEY = "koers-cookies-accepted-v2";

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Laad AdSense + Google's Funding Choices CMP. De CMP toont de
    // advertentie-toestemmingsmelding aan EU-bezoekers en houdt gepersonaliseerde
    // advertentiecookies tegen tot toestemming — los van deze functionele banner.
    initAds();
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="container mx-auto max-w-2xl bg-card border-2 border-foreground rounded-lg p-5 shadow-lg">
        <h3 className="font-serif text-lg font-bold mb-1">{t("shell.cookie.title")}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          <Trans
            i18nKey="shell.cookie.body"
            components={{
              strong: <strong />,
              cookieLink: (
                <Link to="/juridisch#cookies" className="underline hover:text-foreground transition-colors" />
              ),
            }}
          />
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button onClick={close} size="sm">{t("shell.cookie.accept")}</Button>
        </div>
      </div>
    </div>
  );
}
