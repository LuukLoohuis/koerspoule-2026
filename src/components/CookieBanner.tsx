import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { initAds } from "@/lib/adsense";

// v2: bestaande bezoekers die de oude banner al accepteerden opnieuw informeren
// (advertenties via Google AdSense zijn toegevoegd).
const STORAGE_KEY = "koers-cookies-accepted-v2";

export default function CookieBanner() {
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
        <h3 className="font-serif text-lg font-bold mb-1">Koers Cookies 🍪</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Voor de werking van de site gebruiken we <strong>functionele cookies</strong>. We tonen
          ook advertenties via <strong>Google AdSense</strong>; je toestemming voor
          advertentiecookies regel je in het aparte Google-venster. Meer info in ons{" "}
          <Link to="/juridisch#cookies" className="underline hover:text-foreground transition-colors">
            cookiebeleid
          </Link>
          .
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button onClick={close} size="sm">Begrepen!</Button>
        </div>
      </div>
    </div>
  );
}
