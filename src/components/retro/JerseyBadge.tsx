import { cn } from "@/lib/utils";

type JerseyColor = "yellow" | "polka" | "green" | "white";

const PALETTE: Record<JerseyColor, { fill: string; stroke: string; pattern?: string; label: string }> = {
  yellow: {
    fill: "hsl(var(--maillot-jaune))",
    stroke: "hsl(var(--maillot-jaune-dark))",
    label: "Leiderstrui",
  },
  polka: {
    fill: "hsl(var(--maillot-wit))",
    stroke: "hsl(var(--bolletjes-bright))",
    pattern: "polka",
    label: "Bergkoning",
  },
  green: {
    fill: "hsl(var(--maillot-groen))",
    stroke: "hsl(var(--maillot-groen) / 0.7)",
    label: "Sprintklassement",
  },
  white: {
    fill: "hsl(var(--maillot-wit))",
    stroke: "hsl(var(--ink) / 0.5)",
    label: "Jongerentrui",
  },
};

/**
 * Klein SVG-truitje — gebruik naast posities in klassementen.
 *
 * <JerseyBadge color="yellow" />
 * <JerseyBadge color="polka" size={14} />
 */
export default function JerseyBadge({
  color,
  size = 16,
  className,
  title,
}: {
  color: JerseyColor;
  size?: number;
  className?: string;
  title?: string;
}) {
  const meta = PALETTE[color];
  const patternId = `jersey-${color}-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title ?? meta.label}
      className={cn("inline-block shrink-0", className)}
    >
      <title>{title ?? meta.label}</title>
      <defs>
        {meta.pattern === "polka" && (
          <pattern id={patternId} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.3" fill={meta.stroke} />
          </pattern>
        )}
      </defs>
      {/* Trui-silhouet: lichaam + mouwen */}
      <path
        d="M6 4 L9 3 L10 5 L14 5 L15 3 L18 4 L20 8 L17 9 L17 20 L7 20 L7 9 L4 8 Z"
        fill={meta.pattern === "polka" ? `url(#${patternId})` : meta.fill}
        stroke={meta.stroke}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      {meta.pattern === "polka" && (
        <path
          d="M6 4 L9 3 L10 5 L14 5 L15 3 L18 4 L20 8 L17 9 L17 20 L7 20 L7 9 L4 8 Z"
          fill="none"
          stroke={meta.stroke}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
