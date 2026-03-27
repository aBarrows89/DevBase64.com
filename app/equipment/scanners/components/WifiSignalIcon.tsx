"use client";

export default function WifiSignalIcon({
  signal,
  showLabel = false,
}: {
  signal?: number;
  showLabel?: boolean;
}) {
  // Signal in dBm: > -50 excellent, -50 to -60 good, -60 to -70 fair, < -70 poor
  const getStrength = (dbm: number): number => {
    if (dbm > -50) return 4;
    if (dbm > -60) return 3;
    if (dbm > -70) return 2;
    return 1;
  };

  const strength = signal !== undefined ? getStrength(signal) : 0;
  const label =
    strength === 0
      ? "--"
      : strength >= 4
        ? "Excellent"
        : strength >= 3
          ? "Good"
          : strength >= 2
            ? "Fair"
            : "Weak";

  const barColor = (index: number) =>
    index <= strength ? "bg-emerald-400" : "bg-slate-700";

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-end gap-[2px] h-4">
        <div className={`w-[3px] h-[25%] rounded-sm ${barColor(1)}`} />
        <div className={`w-[3px] h-[50%] rounded-sm ${barColor(2)}`} />
        <div className={`w-[3px] h-[75%] rounded-sm ${barColor(3)}`} />
        <div className={`w-[3px] h-[100%] rounded-sm ${barColor(4)}`} />
      </div>
      {showLabel && (
        <span className="text-xs text-slate-400">{label}</span>
      )}
    </div>
  );
}
