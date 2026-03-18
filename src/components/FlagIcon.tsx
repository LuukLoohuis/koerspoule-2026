import { cn } from "@/lib/utils";

const flags: Record<string, React.ReactNode> = {
  IT: (
    <svg viewBox="0 0 640 480" className="w-full h-full">
      <rect width="213.3" height="480" fill="#009246" />
      <rect x="213.3" width="213.4" height="480" fill="#fff" />
      <rect x="426.7" width="213.3" height="480" fill="#CE2B37" />
    </svg>
  ),
  FR: (
    <svg viewBox="0 0 640 480" className="w-full h-full">
      <rect width="213.3" height="480" fill="#002395" />
      <rect x="213.3" width="213.4" height="480" fill="#fff" />
      <rect x="426.7" width="213.3" height="480" fill="#ED2939" />
    </svg>
  ),
  ES: (
    <svg viewBox="0 0 640 480" className="w-full h-full">
      <rect width="640" height="480" fill="#AA151B" />
      <rect y="120" width="640" height="240" fill="#F1BF00" />
    </svg>
  ),
};

type FlagIconProps = {
  country: "IT" | "FR" | "ES";
  className?: string;
};

export default function FlagIcon({ country, className }: FlagIconProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-5 h-4 rounded-sm overflow-hidden border border-border shrink-0",
        className
      )}
    >
      {flags[country]}
    </span>
  );
}
