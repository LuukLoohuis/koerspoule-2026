import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { KeyRound } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    // Supabase parses the recovery token from the URL hash automatically
    // and emits a PASSWORD_RECOVERY event. We also check for an existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasRecoverySession(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < 6) {
      toast({ title: "Wachtwoord te kort", description: "Minimaal 6 tekens.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Wachtwoorden komen niet overeen", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Wachtwoord bijgewerkt 🎉", description: "Je bent nu ingelogd." });
      navigate("/", { replace: true });
    } catch (err) {
      toast({
        title: "Bijwerken mislukt",
        description: err instanceof Error ? err.message : "Onbekende fout",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md retro-border bg-card p-6 relative"
      >
        <div className="absolute -top-3 -left-3 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
          <KeyRound size={14} />
        </div>
        <h1 className="font-display text-2xl font-bold mb-1 text-center">Nieuw wachtwoord</h1>
        <p className="text-muted-foreground font-serif italic text-sm text-center mb-5">
          Kies een nieuw wachtwoord voor je Koerspoule-account.
        </p>

        {!hasRecoverySession ? (
          <p className="text-sm text-muted-foreground text-center">
            Open deze pagina via de resetlink uit je e-mail. Geen geldige sessie gevonden.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password" className="font-serif">Nieuw wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                minLength={6}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm" className="font-serif">Bevestig wachtwoord</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full retro-border-primary font-bold text-base h-11 tracking-wide"
            >
              {isSubmitting ? "Bezig..." : "🔒 Wachtwoord opslaan"}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
