import { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import type { TFunction } from "i18next";
import { sendEmail, registratieHtml } from "@/lib/sendEmail";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Trophy, Mountain, Medal, Shirt, Star, Bike, Eye, EyeOff } from "lucide-react";
import koerspouleLogo from "@/assets/koerspoule-logo-2026.png";
import { useThema } from "@/contexts/ThemaContext";
import TruiBadge from "@/components/retro/TruiBadge";
import { supabase } from "@/lib/supabase";
import { captureEvent, captureException, identifyUser } from "@/lib/posthog";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`TIMEOUT: server reageert niet binnen ${Math.round(ms / 1000)}s`));
    }, ms);
    promise
      .then((v) => { clearTimeout(id); resolve(v); })
      .catch((e) => { clearTimeout(id); reject(e); });
  });
}

function formatError(error: unknown, t: TFunction): string {
  if (!(error instanceof Error)) return t("auth.login.errorUnknown");
  const msg = error.message;

  if (msg.startsWith("TIMEOUT"))
    return t("auth.login.errorTimeout");

  if (msg.toLowerCase().includes("email rate limit"))
    return t("auth.login.errorRateLimit");

  if (msg.toLowerCase().includes("invalid login credentials"))
    return t("auth.login.errorInvalidCredentials");

  if (msg.toLowerCase().includes("email not confirmed"))
    return t("auth.login.errorEmailNotConfirmed");

  if (msg.toLowerCase().includes("user already registered"))
    return t("auth.login.errorUserExists");

  if (msg.toLowerCase().includes("signup is disabled"))
    return t("auth.login.errorSignupDisabled");

  if (msg.toLowerCase().includes("password") && msg.toLowerCase().includes("characters"))
    return t("auth.login.errorPasswordLength");

  return msg;
}

const floatingBadges = [
  { icon: Trophy, label: "Maglia Rosa", color: "text-primary", delay: 0 },
  { icon: Mountain, label: "Bergtrui", color: "text-blue-500", delay: 0.2 },
  { icon: Medal, label: "Puntentrui", color: "text-purple-500", delay: 0.4 },
  { icon: Shirt, label: "Wit", color: "text-muted-foreground", delay: 0.6 },
  { icon: Star, label: "Tappa", color: "text-[hsl(var(--vintage-gold))]", delay: 0.8 },
  { icon: Bike, label: "Corsa", color: "text-accent", delay: 1.0 },
];

/** Veilige bestemming na login: alleen interne paden, anders /karavaan. */
function safeReturnTo(rt: string | null): string {
  return rt && rt.startsWith("/") && !rt.startsWith("//") ? rt : "/karavaan";
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { thema } = useThema();
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(() => searchParams.get("register") === "1");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  // Na een succesvolle signup (zonder directe sessie): toon het bevestigingsscherm
  // i.p.v. een toast + redirect. null = normale form-modus.
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!supabase || !signupEmail || resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.resend({ type: "signup", email: signupEmail }),
        15000,
      );
      if (error) throw error;
      toast({ title: t("auth.login.resendSuccessTitle"), description: t("auth.login.resendSuccessDesc", { email: signupEmail }) });
      setResendCooldown(30);
    } catch (error) {
      toast({ title: t("auth.login.sendFailedTitle"), description: formatError(error, t), variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!supabase) return;
    const target = email.trim();
    if (!target) {
      toast({
        title: t("auth.login.fillEmailTitle"),
        description: t("auth.login.fillEmailDesc"),
        variant: "destructive",
      });
      return;
    }
    setIsSendingReset(true);
    try {
      // Always send users to the live site for password reset, so the link
      // never goes through lovable.dev's auth-bridge (which requires login there).
      const host = window.location.hostname;
      const resetOrigin =
        host === "localhost" || host.endsWith("lovableproject.com") || host.endsWith("lovable.app")
          ? "https://koerspoule.nl"
          : window.location.origin;
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(target, {
          redirectTo: `${resetOrigin}/reset-password`,
        }),
        15000,
      );
      if (error) throw error;
      captureEvent("password_reset_requested", {
        has_email_input: true,
        reset_origin: resetOrigin,
      });
      toast({
        title: t("auth.login.resetSentTitle"),
        description: t("auth.login.resetSentDesc", { email: target }),
      });
    } catch (error) {
      toast({
        title: t("auth.login.sendFailedTitle"),
        description: formatError(error, t),
        variant: "destructive",
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabase) {
      toast({
        title: t("auth.login.supabaseMissingTitle"),
        description: t("auth.login.supabaseMissingDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(isRegister ? t("auth.login.statusRegistering") : t("auth.login.statusLoggingIn"));

    try {
      if (isRegister) {
        // Behoud returnTo (bv. een subpoule-link) door de e-mailbevestiging heen:
        // de bevestigingslink stuurt de gebruiker terug naar die bestemming.
        const rt = safeReturnTo(searchParams.get("returnTo"));
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}${rt}` },
          }),
          15000
        );
        if (error) throw error;

        if (data.user) {
          identifyUser(data.user.id, {
            email,
            display_name: name.trim() || email,
          });
          captureEvent("user_signed_up", {
            signup_method: "email",
            has_session: Boolean(data.session),
            return_to: rt,
          });
          supabase
            .from("profiles")
            .upsert(
              { id: data.user.id, display_name: name.trim() || email },
              { onConflict: "id" }
            )
            .then(() => {});
        }

        sendEmail(email, "Welkom bij Koerspoule! 🌹", registratieHtml(name.trim() || email));

        if (data.session) {
          // E-mailbevestiging staat uit → meteen ingelogd.
          toast({ title: t("auth.login.accountCreatedTitle"), description: t("auth.login.accountCreatedDesc") });
          navigate(safeReturnTo(searchParams.get("returnTo")), { replace: true });
        } else {
          // Bevestiging vereist → eigen check-email-scherm, geen redirect/toast.
          setSignupEmail(email);
        }
      } else {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({ email, password }),
          15000
        );
        if (error) throw error;

        if (!data.session) {
          toast({
            title: t("auth.login.confirmNeededTitle"),
            description: t("auth.login.confirmNeededDesc"),
            variant: "destructive",
          });
          return;
        }

        identifyUser(data.user.id, {
          email,
        });
        captureEvent("user_logged_in", {
          login_method: "email",
          return_to: safeReturnTo(searchParams.get("returnTo")),
        });
        toast({
          title: t("auth.login.loggedInTitle"),
          description: t("auth.login.loggedInDesc"),
        });
        navigate(safeReturnTo(searchParams.get("returnTo")), { replace: true });
      }
    } catch (error) {
      captureException(error, {
        area: "login",
        mode: isRegister ? "register" : "login",
      });
      toast({
        title: t("auth.login.actionFailedTitle"),
        description: formatError(error, t),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-8 left-8 right-8 bottom-8 border-2 border-primary/10 rounded-lg" />
        <div className="absolute top-10 left-10 right-10 bottom-10 border border-primary/5 rounded-lg" />
      </div>

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
        <motion.div
          className="text-center mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <img
            src={koerspouleLogo}
            alt={t("auth.login.logoAlt")}
            className="h-20 mx-auto mb-2 drop-shadow-lg"
          />

          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/40" />
            <Star size={12} className="text-primary/50" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/40" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={signupEmail ? "check" : isRegister ? "register" : "login"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="font-display text-3xl font-bold mb-1 tracking-tight">
                {signupEmail
                  ? t("auth.login.checkEmailTitle")
                  : isRegister ? thema.login_meedoen : thema.login_welkom}
              </h1>
              <p className="text-muted-foreground font-serif italic text-sm">
                {signupEmail
                  ? t("auth.login.checkEmailSubtitle")
                  : isRegister
                    ? t("auth.login.registerSubtitle")
                    : t("auth.login.loginSubtitle")}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="retro-border bg-card p-5 relative"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="absolute -top-3 -left-3 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md">
            <Trophy size={14} />
          </div>
          <div className="absolute -top-3 -right-3 bg-accent text-accent-foreground rounded-full p-1.5 shadow-md">
            <Medal size={14} />
          </div>

          <div className="flex justify-center gap-2 mb-4">
            {(["algemeen", "punten", "berg", "jongeren"] as const).map((type) => {
              const trui = thema.truien[type];
              return (
                <span
                  key={type}
                  className="jersey-badge border border-border bg-secondary/50"
                  title={trui.naam}
                >
                  <TruiBadge type={type} formaat="klein" className="shrink-0" />
                </span>
              );
            })}
          </div>

          {signupEmail ? (
            <div className="space-y-4 text-center">
              <p className="font-serif text-sm text-muted-foreground">
                {t("auth.login.sentLinkTo")}
              </p>
              <p className="font-display font-bold text-base break-all">{signupEmail}</p>
              <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                <Trans i18nKey="auth.login.confirmInstruction" />
              </p>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  variant="outline"
                  className="w-full retro-border font-bold h-11"
                >
                  {resendCooldown > 0
                    ? t("auth.login.resendCountdown", { seconds: resendCooldown })
                    : isResending
                      ? t("auth.login.resending")
                      : t("auth.login.resendButton")}
                </Button>
              </motion.div>
              <button
                type="button"
                onClick={() => { setSignupEmail(null); setIsRegister(false); }}
                className="text-accent font-bold hover:underline transition-colors text-sm"
              >
                {t("auth.login.backToLogin")}
              </button>
            </div>
          ) : (
          <>
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
                    {t("auth.login.teamNameLabel")}
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("auth.login.teamNamePlaceholder")}
                    className="mt-1"
                    required
                  />
                </motion.div>
              )}
              <div>
                <Label htmlFor="email" className="font-serif">
                  {t("auth.login.emailLabel")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.login.emailPlaceholder")}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" className="font-serif">
                  {t("auth.login.passwordLabel")}
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--vintage-gold))] rounded-r-md"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full retro-border-primary font-bold text-base h-11 tracking-wide"
                >
                  {isSubmitting
                    ? statusMsg || t("auth.login.busy")
                    : isRegister
                      ? t("auth.login.registerButton")
                      : t("auth.login.loginButton")}
                </Button>
              </motion.div>
            </motion.form>
          </AnimatePresence>

          {!isRegister && (
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className="text-xs text-muted-foreground hover:text-accent hover:underline transition-colors font-sans disabled:opacity-50"
              >
                {isSendingReset ? t("auth.login.sendingReset") : t("auth.login.forgotPassword")}
              </button>
            </div>
          )}

          <div className="vintage-divider my-4" />

          <p className="text-center text-sm text-muted-foreground font-sans">
            {isRegister ? t("auth.login.haveAccount") : t("auth.login.noAccount")}{" "}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-accent font-bold hover:underline transition-colors"
            >
              {isRegister ? t("auth.login.switchToLogin") : t("auth.login.switchToRegister")}
            </button>
          </p>
          </>
          )}
        </motion.div>

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
            {t("auth.login.viewRules")}
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
