interface Props {
  count: number;
}

export default function UnreadDivider({ count }: Props) {
  return (
    <div className="relative px-3 py-1">
      <div className="absolute inset-x-0 top-1/2 h-px bg-primary/40" />
      <div className="relative inline-flex items-center justify-center mx-auto w-full">
        <span className="bg-primary text-primary-foreground text-[10px] font-display font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
          {count} nieuw{count === 1 ? "" : "e"} bericht{count === 1 ? "" : "en"}
        </span>
      </div>
    </div>
  );
}
