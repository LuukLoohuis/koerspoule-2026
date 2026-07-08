import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Link2, MessageCircle, Share2, Copy, Check } from "lucide-react";

interface Props {
  subpouleId: string;
  subpouleName?: string;
}

export default function ShareButton({ subpouleId, subpouleName }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const buildLink = () => {
    const base =
      typeof window !== "undefined"
        ? `${window.location.origin}/mijn-peloton?tab=subpoules&subpoule=${subpouleId}&view=koerscafe`
        : `/mijn-peloton?tab=subpoules&subpoule=${subpouleId}&view=koerscafe`;
    return base;
  };

  const handleCopy = async () => {
    const link = buildLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: t("subpoule.koerscafe.share.linkCopiedTitle"),
        description: t("subpoule.koerscafe.share.linkCopiedDesc"),
      });
    } catch {
      toast({
        title: t("subpoule.koerscafe.share.copyFailedTitle"),
        description: t("subpoule.koerscafe.share.copyFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const handleWhatsApp = () => {
    const link = buildLink();
    const text = subpouleName
      ? t("subpoule.koerscafe.share.whatsappText", { name: subpouleName, link })
      : t("subpoule.koerscafe.share.whatsappTextGeneric", { link });
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  const handleNativeShare = async () => {
    const link = buildLink();
    const shareData = {
      title: "Koerscafé",
      text: subpouleName
        ? t("subpoule.koerscafe.share.nativeText", { name: subpouleName })
        : t("subpoule.koerscafe.share.nativeTextGeneric"),
      url: link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled share
      }
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          title={t("subpoule.koerscafe.share.shareTitle")}
        >
          <Share2 className="h-3.5 w-3.5" />
          {t("subpoule.koerscafe.share.share")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer gap-2">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? t("subpoule.koerscafe.share.copied") : t("subpoule.koerscafe.share.copyLink")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleWhatsApp} className="cursor-pointer gap-2">
          <svg viewBox="0 0 32 32" className="w-4 h-4" fill="currentColor" aria-hidden="true">
            <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.27 1.93.78 2.78.715 1.18 1.38 2.115 2.323 3.07 1.575 1.59 4.075 2.92 6.235 2.92.96 0 2.387-.32 2.95-1.075.21-.27.31-.665.31-.99 0-.43-.97-.45-.97-.85 0-.21-.215-.343-.43-.43z M16.027 5C9.94 5 5 9.94 5 16.027c0 2.085.585 4.13 1.7 5.91l-1.7 6.077 6.244-1.66c1.71.97 3.65 1.475 5.61 1.475 6.087 0 11.027-4.94 11.027-11.027C28.881 9.94 22.114 5 16.027 5z"/>
          </svg>
          {t("subpoule.koerscafe.share.viaWhatsapp")}
        </DropdownMenuItem>

        {canNativeShare && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer gap-2">
              <Share2 className="h-4 w-4" />
              {t("subpoule.koerscafe.share.viaApp")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
