"use client";

export default function ScannerBatteryBar({
  level,
  size = "md",
  showLabel = true,
}: {
  level?: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}) {
  if (level === undefined || level === null) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-3 rounded-sm border border-slate-600 relative">
          <div className="absolute right-[-3px] top-[3px] w-[2px] h-[6px] bg-slate-600 rounded-r-sm" />
        </div>
        {showLabel && <span className="text-xs text-slate-500">--</span>}
      </div>
    );
  }

  const getColor = (pct: number) => {
    if (pct > 50) return "bg-emerald-400";
    if (pct > 20) return "bg-amber-400";
    return "bg-red-400";
  };

  const w = size === "sm" ? "w-5 h-2.5" : "w-7 h-3.5";
  const nub = size === "sm" ? "w-[2px] h-[5px]" : "w-[2px] h-[7px]";

  return (
    <div className="flex items-center gap-1.5">
      <div className={`${w} rounded-sm border border-slate-500 relative overflow-hidden`}>
        <div
          className={`h-full ${getColor(level)} transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, level))}%` }}
        />
        <div className={`absolute right-[-3px] top-1/2 -translate-y-1/2 ${nub} bg-slate-500 rounded-r-sm`} />
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${level <= 20 ? "text-red-400" : "text-slate-400"}`}>
          {level}%
        </span>
      )}
    </div>
  );
}
