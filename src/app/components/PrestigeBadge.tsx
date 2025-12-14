'use client';

import Image, { StaticImageData } from "next/image";
import prestige1 from "../../../public/prestige/prestige1.png";
import prestige2 from "../../../public/prestige/prestige2.png";
import prestige3 from "../../../public/prestige/prestige3.png";
import prestige4 from "../../../public/prestige/prestige4.png";
import prestige5 from "../../../public/prestige/prestige5.png";
import prestige6 from "../../../public/prestige/prestige6.png";
import prestige7 from "../../../public/prestige/prestige7.png";
import prestige8 from "../../../public/prestige/prestige8.png";
import prestige9 from "../../../public/prestige/prestige9.png";
import prestige10 from "../../../public/prestige/prestige10.png";
import prestigeMaster from "../../../public/prestige/prestigemaster.png";

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

const prestigeAssets: Record<number, StaticImageData> = {
  1: prestige1,
  2: prestige2,
  3: prestige3,
  4: prestige4,
  5: prestige5,
  6: prestige6,
  7: prestige7,
  8: prestige8,
  9: prestige9,
  10: prestige10,
};

function getPrestigeVisual(prestige: number | null, isMaster?: boolean) {
  const master = isMaster || (prestige !== null && prestige >= 11);
  if (master) {
    return {
      label: "Prestige Master",
      asset: prestigeMaster,
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
    asset: clampedPrestige > 0 ? prestigeAssets[clampedPrestige] : null,
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
        className={`relative flex items-center justify-center overflow-hidden rounded-lg border ${borderColor} ${bgColor} ${iconSize} shadow-inner`}
      >
        {asset ? (
          <Image
            src={asset}
            alt={label}
            fill
            sizes="48px"
            className="object-contain"
            priority
          />
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
