interface Props {
  /** "light" = dark text on light bg (default). "dark" = light text on dark bg. */
  variant?: "light" | "dark";
  className?: string;
}

// Small "Powered by" line + the Government of Barbados wordmark. Rendered
// at the bottom of patient-facing and staff-facing pages so the GovTech
// origin is consistently surfaced.
export function PoweredBy({ variant = "light", className = "" }: Props) {
  const textColor = variant === "dark" ? "text-slate-400" : "text-slate-500";
  // The SVG uses fill="currentColor"; setting the wrapper's text color
  // doesn't propagate through an <img>, so we use a CSS filter to flip
  // it white on the dark display screen.
  const logoStyle = variant === "dark" ? { filter: "brightness(0) invert(1)" } : undefined;
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <span className={`text-xs uppercase tracking-wider ${textColor}`}>
        Powered by
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/govbb-logo.svg"
        alt="GovTech Barbados"
        className="h-4 w-auto"
        style={logoStyle}
      />
    </div>
  );
}
