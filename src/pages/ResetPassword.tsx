import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { KeyRound } from "lucide-react";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    // Parse error from URL hash (e.g. #error=access_denied&error_code=otp_expired&...)
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const errCode = params.get("error_code");
    const errDesc = params.get("error_description");
    if (errCode || errDesc) {
      if (errCode === "otp_expired") {
        setLinkError(t("auth.reset.linkExpired"));
      } else {
        setLinkError(decodeURIComponent((errDesc || errCode || t("auth.reset.invalidLink")).replace(/\+/g, " ")));
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setLinkError(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasRecoverySession(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [t]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const target = resendEmail.trim();
    if (!target) {
      toast({ title: t("auth.reset.fillEmailTitle"), variant: "destructive" });
      return;
    }
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: t("auth.reset.sentTitle"),
        description: t("auth.reset.sentDesc", { email: target }),
      });
    } catch (err) {
      toast({
        title: t("auth.reset.sendFailedTitle"),
        description: err instanceof Error ? err.message : t("auth.reset.unknownError"),
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < 6) {
      toast({ title: t("auth.reset.tooShortTitle"), description: t("auth.reset.tooShortDesc"), variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: t("auth.reset.mismatchTitle"), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: t("auth.reset.updatedTitle"), description: t("auth.reset.updatedDesc") });
      navigate("/", { replace: true });
    } catch (err) {
      toast({
        title: t("auth.reset.updateFailedTitle"),
        description: err instanceof Error ? err.message : t("auth.reset.unknownError"),
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
        <h1 className="font-display text-2xl font-bold mb-1 text-center">{t("auth.reset.title")}</h1>
        <p className="text-muted-foreground font-serif italic text-sm text-center mb-5">
          {t("auth.reset.subtitle")}
        </p>

        {!hasRecoverySession ? (
          <div className="space-y-4">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive text-center">
              {linkError ?? t("auth.reset.noSession")}
            </div>
            <form onSubmit={handleResend} className="space-y-3">
              <div>
                <Label htmlFor="resend-email" className="font-serif">{t("auth.reset.emailLabel")}</Label>
                <Input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder={t("auth.reset.emailPlaceholder")}
                  className="mt-1"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isResending}
                className="w-full retro-border-primary font-bold text-base h-11 tracking-wide"
              >
                {isResending ? t("auth.reset.sending") : t("auth.reset.sendNewLink")}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {t("auth.reset.openWithinHour")}
              </p>
            </form>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password" className="font-serif">{t("auth.reset.newPasswordLabel")}</Label>
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
              <Label htmlFor="confirm" className="font-serif">{t("auth.reset.confirmPasswordLabel")}</Label>
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
              {isSubmitting ? t("auth.reset.busy") : t("auth.reset.saveButton")}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
