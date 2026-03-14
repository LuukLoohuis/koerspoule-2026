import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import koerspouleLogo from "@/assets/koerspoule-logo.png";

export default function Login() {
  const { toast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: isRegister ? "Account aangemaakt! 🎉" : "Ingelogd! 🚴",
      description: "Dit is een demo — login werkt nog niet echt.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <img src={koerspouleLogo} alt="Koerspoule logo" className="h-24 mx-auto mb-2" />
          <h1 className="font-display text-3xl font-bold mb-2">
            {isRegister ? "Doe mee!" : "Welkom terug"}
          </h1>
          <p className="text-muted-foreground font-serif">
            {isRegister
              ? "Maak een account aan en stel je ploeg samen."
              : "Log in om je ploeg te bekijken."}
          </p>
        </div>

        <div className="retro-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jouw naam"
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw@email.nl"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full retro-border-primary font-bold">
              {isRegister ? "Account aanmaken" : "Inloggen"}
            </Button>
          </form>

          <div className="vintage-divider my-6" />

          <p className="text-center text-sm text-muted-foreground font-sans">
            {isRegister ? "Al een account?" : "Nog geen account?"}{" "}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-accent font-bold hover:underline"
            >
              {isRegister ? "Log in" : "Schrijf je in"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 font-sans">
          <Link to="/regels" className="hover:underline">
            Bekijk de spelregels →
          </Link>
        </p>
      </div>
    </div>
  );
}
