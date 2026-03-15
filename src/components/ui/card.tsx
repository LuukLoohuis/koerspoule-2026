import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Card component met emoji-iconen voor:
 * 🔵 bergklassement
 * 🟣 puntenklassement
 * ⚪ jongerenklassement
 * 🥇 🥈 🥉 podium
 */

type ClassificationVariant = "blue" | "purple" | "white";
type PodiumVariant = "gold" | "silver" | "bronze";

function ClassificationEmoji({ variant, className }: { variant: ClassificationVariant; className?: string }) {
  const iconMap: Record<ClassificationVariant, string> = {
    blue: "🔵",
    purple: "🟣",
    white: "⚪",
  };

  const labelMap: Record<ClassificationVariant, string> = {
    blue: "Bergklassement",
    purple: "Puntenklassement",
    white: "Jongerenklassement",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700",
        className,
      )}
    >
      <span aria-hidden="true">{iconMap[variant]}</span>
      <span>{labelMap[variant]}</span>
    </span>
  );
}

function PodiumEmoji({ variant, className }: { variant: PodiumVariant; className?: string }) {
  const iconMap: Record<PodiumVariant, string> = {
    gold: "🥇",
    silver: "🥈",
    bronze: "🥉",
  };

  const labelMap: Record<PodiumVariant, string> = {
    gold: "1e plaats",
    silver: "2e plaats",
    bronze: "3e plaats",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700",
        className,
      )}
    >
      <span aria-hidden="true">{iconMap[variant]}</span>
      <span>{labelMap[variant]}</span>
    </span>
  );
}

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    classification?: ClassificationVariant;
    podium?: PodiumVariant;
  }
>(({ className, classification, podium, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-3 p-6", className)} {...props}>
    {(classification || podium) && (
      <div className="flex flex-wrap items-center gap-2">
        {classification && <ClassificationEmoji variant={classification} />}
        {podium && <PodiumEmoji variant={podium} />}
      </div>
    )}
    {children}
  </div>
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, ClassificationEmoji, PodiumEmoji };
