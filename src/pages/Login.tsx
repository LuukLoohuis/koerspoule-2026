import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Trophy, Mountain, Medal, Shirt, Star, Bike } from "lucide-react";
import koerspouleLogo from "@/assets/koerspoule-logo.png";

const floatingBadges = [
  { icon: Trophy, label: "Maglia Rosa", color: "text-primary", delay: 0 },
  { icon: Mountain, label: "Bergtrui", color: "text-blue-500", delay: 0.2 },
  { icon: Medal, label: "Puntentrui", color: "text-purple-500", delay: 0.4 },
  { icon: Shirt, label: "Wit", color: "text-muted-foreground", delay: 0.6 },
  { icon: Star, label: "Tappa", color: "text-[hsl(var(--vintage-gold))]", delay: 0.8 },
  { icon: Bike, label: "Corsa", color: "text-accent", delay: 1.0 },
];

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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Decorative vintage border lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-8 left-8 right-8 bottom-8 border-2 border-primary/10 rounded-lg" />
        <div className="absolute top-10 left-10 right-10 bottom-10 border border-primary/5 rounded-lg" />
      </div>

      {/* Floating Giro badges */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingBadges.map((badge, i) => {
          const Icon = badge.icon;
          return (
            <motion.div
              key={i}
              className={`absolute ${badge.color} opacity-10`}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.05, 0.15, 0.05],
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 6,
                delay: badge.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                top: `${15 + (i * 12) % 70}%`,
                left: i % 2 === 0 ? `${5 + i * 3}%` : undefined,
                right: i % 2 !== 0 ? `${5 + i * 3}%` : undefined,
              }}
            >
              <Icon size={40 + i * 6} strokeWidth={1} />
            </motion.div>
          );
        })}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header with vintage poster feel */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img
            src={koerspouleLogo}
            alt="Koerspoule logo"
            className="h-28 mx-auto mb-2 drop-shadow-lg"
          />

          {/* Vintage ornamental divider */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
            <Star size={12} className="text-primary/50" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isRegister ? "register" : "login"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-display text-3xl font-bold mb-1 tracking-tight">
                {isRegister ? "Doe mee aan de Corsa!" : "Bentornato!"}
              </h1>
              <p className="text-muted-foreground font-serif italic text-sm">
                {isRegister
                  ? "Schrijf je in en stel je droomploeg samen."
                  : "Log in en bekijk je peloton."}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Card with retro styling */}
        <motion.div
          className="retro-border bg-card p-6 relative"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Corner trophies */}
          <div className="absolute -top-3 -left-3 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
            <Trophy size={14} />
          </div>
          <div className="absolute -top-3 -right-3 bg-accent text-accent-foreground rounded-full p-1.5 shadow-md">
            <Medal size={14} />
          </div>

          {/* Giro badge strip */}
          <div className="flex justify-center gap-2 mb-5">
            {[
              { emoji: "🩷", label: "Rosa" },
              { emoji: "🔵", label: "Berg" },
              { emoji: "🟣", label: "Punten" },
              { emoji: "⚪", label: "Jongeren" },
            ].map((jersey) => (
              <span
                key={jersey.label}
                className="jersey-badge border border-border bg-secondary/50 text-secondary-foreground"
                title={jersey.label}
              >
                <span>{jersey.emoji}</span>
                <span className="text-[10px] font-medium">{jersey.label}</span>
              </span>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isRegister ? "register-form" : "login-form"}
              initial={{ opacity: 0, x: isRegister ? 30 : -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRegister ? -30 : 30 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {isRegister && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Label htmlFor="name" className="font-serif">
                    Naam
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jouw naam"
                    className="mt-1"
                    required
                  />
                </motion.div>
              )}
              <div>
                <Label htmlFor="email" className="font-serif">
                  E-mailadres
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jouw@email.nl"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" className="font-serif">
                  Wachtwoord
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  required
                />
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  className="w-full retro-border-primary font-bold text-base h-11 tracking-wide"
                >
                  {isRegister ? "🚴 Account aanmaken" : "🏁 Inloggen"}
                </Button>
              </motion.div>
            </motion.form>
          </AnimatePresence>

          <div className="vintage-divider my-5" />

          <p className="text-center text-sm text-muted-foreground font-sans">
            {isRegister ? "Al een account?" : "Nog geen account?"}{" "}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-accent font-bold hover:underline transition-colors"
            >
              {isRegister ? "Log in →" : "Schrijf je in →"}
            </button>
          </p>
        </motion.div>

        {/* Footer link */}
        <motion.p
          className="text-center text-xs text-muted-foreground mt-4 font-sans"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Link
            to="/regels"
            className="hover:underline hover:text-foreground transition-colors"
          >
            📜 Bekijk de spelregels →
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
