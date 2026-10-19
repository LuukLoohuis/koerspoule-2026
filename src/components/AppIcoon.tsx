import { cn } from "@/lib/utils";

/**
 * Het app-icoon zoals het op je beginscherm komt te staan (public/icon-192.png,
 * zelfde bron als het manifest). Herkenbaar in de hint, het menu en de uitleg.
 */
export default function AppIcoon({ className }: { className?: string }) {
  return (
    <img
      src="/icon-192.png"
      alt=""
      aria-hidden
      width={192}
      height={192}
      decoding="async"
      className={cn("shrink-0 select-none", className)}
    />
  );
}
