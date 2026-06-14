import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { setAdConsent, loadAdSense, maybeLoadAdSense } from "@/lib/adsense";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Eerder al gekozen → banner verbergen; AdSense laden als toestemming gegeven was.
    if (localStorage.getItem("koers-cookies-accepted")) {
      maybeLoadAdSense();
    } else {
      setVisible(true);
    }
  }, []);

  const close = () => {
    localStorage.setItem("koers-cookies-accepted", "true");
    setVisible(false);
  };

  // Accepteer functionele + advertentiecookies → AdSense laden.
  const acceptAll = () => {
    setAdConsent("granted");
    loadAdSense();
    close();
  };

  // Alleen functionele cookies → géén advertentiescript.
  const onlyFunctional = () => {
    setAdConsent("denied");
    close();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="container mx-auto max-w-2xl bg-card border-2 border-foreground rounded-lg p-5 shadow-lg">
        <h3 className="font-serif text-lg font-bold mb-1">Koers Cookies 🍪</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Voor de werking van de site gebruiken we <strong>functionele cookies</strong>. Daarnaast
          tonen we advertenties via <strong>Google AdSense</strong>, die advertentiecookies plaatsen —
          die laden we <strong>alleen met jouw toestemming</strong>. Lees meer in ons{" "}
          <Link to="/juridisch#cookies" className="underline hover:text-foreground transition-colors">
            cookiebeleid
          </Link>
          .
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <Button onClick={onlyFunctional} size="sm" variant="outline">
            Alleen functioneel
          </Button>
          <Button onClick={acceptAll} size="sm">
            Accepteer alles
          </Button>
        </div>
      </div>
    </div>
  );
}
