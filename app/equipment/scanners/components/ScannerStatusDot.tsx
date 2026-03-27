"use client";

export type ScannerHealth = "online" | "warning" | "offline" | "unprovisioned";

export function getScannerHealth(scanner: {
  isOnline?: boolean;
  mdmStatus?: string;
  lastSeen?: number;
  batteryLevel?: number;
}): ScannerHealth {
  if (scanner.mdmStatus !== "provisioned") return "unprovisioned";
  if (!scanner.isOnline) return "offline";
  const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
  if (
    (scanner.lastSeen && scanner.lastSeen < twoHoursAgo) ||
    (scanner.batteryLevel !== undefined && scanner.batteryLevel < 20)
  ) {
    return "warning";
  }
  return "online";
}

const healthStyles: Record<ScannerHealth, { dot: string; ring: string; label: string }> = {
  online: {
    dot: "bg-emerald-400",
    ring: "bg-emerald-400/30",
    label: "Online",
  },
  warning: {
    dot: "bg-amber-400",
    ring: "bg-amber-400/30",
    label: "Attention",
  },
  offline: {
    dot: "bg-slate-400",
    ring: "bg-slate-400/20",
    label: "Offline",
  },
  unprovisioned: {
    dot: "bg-slate-500",
    ring: "bg-transparent",
    label: "Not Provisioned",
  },
};

export default function ScannerStatusDot({
  health,
  size = "md",
  showLabel = false,
}: {
  health: ScannerHealth;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const style = healthStyles[health];
  const sizes = {
    sm: { dot: "w-2 h-2", ring: "w-4 h-4" },
    md: { dot: "w-2.5 h-2.5", ring: "w-5 h-5" },
    lg: { dot: "w-3 h-3", ring: "w-6 h-6" },
  };
  const s = sizes[size];

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center justify-center">
        {health === "online" && (
          <span
            className={`absolute ${s.ring} rounded-full ${style.ring} animate-ping`}
          />
        )}
        <span className={`relative ${s.dot} rounded-full ${style.dot}`} />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-400">{style.label}</span>
      )}
    </div>
  );
}
