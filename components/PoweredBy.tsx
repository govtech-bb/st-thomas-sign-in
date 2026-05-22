interface Props {
  /** "light" = dark text on light bg (default). "dark" = light text on dark bg. */
  variant?: "light" | "dark";
  className?: string;
}

// "Powered by GovTech Barbados" line rendered at the bottom of every
// user-facing surface. Text only -- no wordmark or emblem.
export function PoweredBy({ variant = "light", className = "" }: Props) {
  const captionColor = variant === "dark" ? "text-slate-400" : "text-slate-500";
  const brandColor = variant === "dark" ? "text-slate-100" : "text-slate-700";
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <span className={`text-xs uppercase tracking-wider ${captionColor}`}>
        Powered by
      </span>
      <span className={`text-sm font-bold tracking-tight ${brandColor}`}>
        GovTech Barbados
      </span>
    </div>
  );
}
