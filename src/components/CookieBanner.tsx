import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("koers-cookies-accepted")) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("koers-cookies-accepted", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4">
      <div className="container mx-auto max-w-2xl bg-card border-2 border-foreground rounded-lg p-5 shadow-lg">
        <h3 className="font-serif text-lg font-bold mb-1">Koers Cookies 🍪</h3>
        <p className="text-sm text-muted-foreground mb-1">
          Wij gebruiken Koers Cookies 🍪
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Deze website maakt uitsluitend gebruik van <strong>functionele cookies</strong>. 
          Ze zijn nodig om de site goed te laten werken — geen tracking, geen advertenties.
        </p>
        <div className="flex items-center justify-between gap-4">
          <Link to="/juridisch" className="text-sm underline text-muted-foreground hover:text-foreground transition-colors">
            Cookiebeleid
          </Link>
          <Button onClick={accept} size="sm">Begrepen!</Button>
        </div>
      </div>
    </div>
  );
}
