'use client';

type PrestigeBadgeProps = {
  prestige: number | null;
  isMaster?: boolean;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
};

const sizeClasses: Record<NonNullable<PrestigeBadgeProps["size"]>, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
};

function getPrestigeVisual(prestige: number | null, isMaster?: boolean) {
  const master = isMaster || (prestige !== null && prestige >= 11);
  if (master) {
    return {
      label: "Prestige Master",
      asset: "/prestige/prestigemaster.png",
      master: true,
    };
  }

  if (prestige === null || Number.isNaN(prestige)) {
    return {
      label: "Prestige not set",
      asset: null,
      master: false,
    };
  }

  const clampedPrestige = Math.min(10, Math.max(0, prestige));
  return {
    label: `Prestige ${clampedPrestige}`,
    asset: clampedPrestige > 0 ? `/prestige/prestige${clampedPrestige}.png` : null,
    master: false,
  };
}

export function PrestigeBadge({
  prestige,
  isMaster = false,
  size = "md",
  showLabel = true,
  className = "",
}: PrestigeBadgeProps) {
  const { label, asset, master } = getPrestigeVisual(prestige, isMaster);
  const iconSize = sizeClasses[size];
  const borderColor = master ? "border-cod-orange/60" : "border-cod-blue/40";
  const bgColor = master ? "bg-cod-orange/15" : "bg-cod-blue/10";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex items-center justify-center rounded-lg border ${borderColor} ${bgColor} ${iconSize} shadow-inner`}
      >
        {asset ? (
          <img src={asset} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs font-semibold text-white/60">—</span>
        )}
      </div>
      {showLabel && (
        <div className="flex flex-col leading-tight">
          <span className="text-xs text-white/60">Prestige</span>
          <span className={`text-sm font-semibold ${master ? "text-cod-orange" : "text-white"}`}>
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
