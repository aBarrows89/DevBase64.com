"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/auth-context";
import { useTheme } from "@/app/theme-context";
import { useAppearance } from "@/app/appearance-context";

interface DesktopIcon {
  id: string;
  label: string;
  href: string;
  icon: string;
  x: number;
  y: number;
}

interface OpenWindow {
  id: string;
  label: string;
  href: string;
  minimized: boolean;
  maximized: boolean;
}

const DEFAULT_ICONS: Omit<DesktopIcon, "x" | "y">[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: "🏠" },
  { id: "messages", label: "Messages", href: "/messages", icon: "💬" },
  { id: "email", label: "Email", href: "/email", icon: "📧" },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: "📅" },
  { id: "meetings", label: "Meetings", href: "/meetings", icon: "🎥" },
  { id: "dochub", label: "Doc Hub", href: "/documents", icon: "📁" },
  { id: "personnel", label: "Personnel", href: "/personnel", icon: "👥" },
  { id: "projects", label: "Projects", href: "/projects", icon: "📋" },
  { id: "shifts", label: "Shifts", href: "/shifts", icon: "⏰" },
  { id: "timeclock", label: "Time Clock", href: "/time-clock", icon: "🕐" },
  { id: "reports", label: "Reports", href: "/reports", icon: "📊" },
  { id: "payroll", label: "Payroll", href: "/payroll", icon: "💰" },
  { id: "equipment", label: "Equipment", href: "/equipment", icon: "🔧" },
  { id: "settings", label: "Settings", href: "/settings", icon: "⚙️" },
  { id: "notifications", label: "Alerts", href: "/notifications", icon: "🔔" },
  { id: "dailylog", label: "Daily Log", href: "/daily-log", icon: "📝" },
  { id: "users", label: "Users", href: "/users", icon: "👤" },
  { id: "jobs", label: "Jobs", href: "/jobs", icon: "💼" },
];

function layoutIcons(): DesktopIcon[] {
  const cols = 2;
  const spacingX = 100;
  const spacingY = 100;
  return DEFAULT_ICONS.map((icon, i) => ({
    ...icon,
    x: 30 + (i % cols) * spacingX,
    y: 30 + Math.floor(i / cols) * spacingY,
  }));
}

export default function DesktopShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { setAppearance } = useAppearance();
  const isDark = theme === "dark";

  const [icons, setIcons] = useState<DesktopIcon[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("desktop-icon-positions");
      if (saved) {
        try {
          const positions = JSON.parse(saved) as Record<string, { x: number; y: number }>;
          return layoutIcons().map(icon => {
            const pos = positions[icon.id];
            return pos ? { ...icon, x: pos.x, y: pos.y } : icon;
          });
        } catch {}
      }
    }
    return layoutIcons();
  });
  const [activeWindow, setActiveWindow] = useState<OpenWindow | null>(null);
  const [clock, setClock] = useState("");
  const [showStartMenu, setShowStartMenu] = useState(false);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);

  // Wallpaper state — persisted per user
  const WALLPAPERS = [
    { id: "default-dark", label: "Default Dark", type: "gradient" as const, value: "bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950" },
    { id: "default-light", label: "Default Light", type: "gradient" as const, value: "bg-gradient-to-br from-sky-200 via-blue-100 to-teal-100" },
    { id: "midnight", label: "Midnight", type: "gradient" as const, value: "bg-gradient-to-br from-gray-950 via-blue-950 to-violet-950" },
    { id: "ocean", label: "Ocean", type: "gradient" as const, value: "bg-gradient-to-br from-cyan-900 via-blue-900 to-slate-900" },
    { id: "sunset", label: "Sunset", type: "gradient" as const, value: "bg-gradient-to-br from-orange-900 via-rose-900 to-purple-950" },
    { id: "forest", label: "Forest", type: "gradient" as const, value: "bg-gradient-to-br from-emerald-950 via-green-900 to-teal-950" },
    { id: "aurora", label: "Aurora", type: "gradient" as const, value: "bg-gradient-to-br from-violet-950 via-fuchsia-900 to-cyan-900" },
    { id: "storm", label: "Storm", type: "gradient" as const, value: "bg-gradient-to-br from-slate-950 via-zinc-900 to-neutral-900" },
    { id: "dawn", label: "Dawn", type: "gradient" as const, value: "bg-gradient-to-br from-amber-100 via-rose-100 to-sky-200" },
    { id: "arctic", label: "Arctic", type: "gradient" as const, value: "bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100" },
    { id: "sand", label: "Sand", type: "gradient" as const, value: "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100" },
    { id: "custom", label: "Custom Image", type: "custom" as const, value: "" },
  ];

  const [wallpaperId, setWallpaperIdState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("desktop-wallpaper") || (isDark ? "default-dark" : "default-light");
    }
    return isDark ? "default-dark" : "default-light";
  });
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("desktop-wallpaper-custom") || "";
    return "";
  });

  const setWallpaper = (id: string, customUrl?: string) => {
    setWallpaperIdState(id);
    localStorage.setItem("desktop-wallpaper", id);
    if (customUrl !== undefined) {
      setCustomWallpaperUrl(customUrl);
      localStorage.setItem("desktop-wallpaper-custom", customUrl);
    }
  };

  const currentWallpaper = WALLPAPERS.find(w => w.id === wallpaperId) || WALLPAPERS[0];
  const wallpaperStyle: React.CSSProperties = wallpaperId === "custom" && customWallpaperUrl
    ? { backgroundImage: `url(${customWallpaperUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};
  const [draggingIcon, setDraggingIcon] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [windowPos, setWindowPos] = useState({ x: 180, y: 40 });
  const [windowSize, setWindowSize] = useState({ w: 0, h: 0 });
  const [draggingWindow, setDraggingWindow] = useState(false);
  const [windowDragOffset, setWindowDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<string | null>(null); // "e"|"s"|"se" etc
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 });

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Sync active window with pathname
  useEffect(() => {
    if (pathname === "/" && !activeWindow) return; // on desktop, no window
    if (activeWindow && activeWindow.href === pathname) return; // already synced
    // If we navigated via browser, find matching icon
    const icon = DEFAULT_ICONS.find(i => i.href === pathname);
    if (icon && pathname !== "/") {
      setActiveWindow(prev => prev ? { ...prev, href: pathname, label: icon.label, id: icon.id } : {
        id: icon.id, label: icon.label, href: pathname, minimized: false, maximized: false,
      });
    }
  }, [pathname]);

  // Calculate window size based on viewport
  useEffect(() => {
    const update = () => {
      setWindowSize({
        w: Math.min(window.innerWidth - 220, 1100),
        h: window.innerHeight - 100,
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const openApp = useCallback((icon: Omit<DesktopIcon, "x" | "y">) => {
    setShowStartMenu(false);
    setActiveWindow({
      id: icon.id,
      label: icon.label,
      href: icon.href,
      minimized: false,
      maximized: false,
    });
    router.push(icon.href);
  }, [router]);

  const closeWindow = useCallback(() => {
    setActiveWindow(null);
    router.push("/");
  }, [router]);

  const minimizeWindow = useCallback(() => {
    setActiveWindow(prev => prev ? { ...prev, minimized: true } : null);
  }, []);

  const restoreWindow = useCallback(() => {
    setActiveWindow(prev => prev ? { ...prev, minimized: false } : null);
  }, []);

  const toggleMaximize = useCallback(() => {
    setActiveWindow(prev => prev ? { ...prev, maximized: !prev.maximized } : null);
  }, []);

  // Icon drag
  const handleIconMouseDown = (e: React.MouseEvent, iconId: string) => {
    const icon = icons.find(i => i.id === iconId);
    if (!icon) return;
    setDraggingIcon(iconId);
    setDragOffset({ x: e.clientX - icon.x, y: e.clientY - icon.y });
  };

  // Window title bar drag
  const handleWindowMouseDown = (e: React.MouseEvent) => {
    if (activeWindow?.maximized) return;
    setDraggingWindow(true);
    setWindowDragOffset({ x: e.clientX - windowPos.x, y: e.clientY - windowPos.y });
  };

  const handleResizeStart = (e: React.MouseEvent, edge: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(edge);
    setResizeStart({ x: e.clientX, y: e.clientY, w: windowSize.w, h: windowSize.h, px: windowPos.x, py: windowPos.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingIcon) {
        setIcons(prev => prev.map(i =>
          i.id === draggingIcon ? { ...i, x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y } : i
        ));
      }
      if (draggingWindow) {
        setWindowPos({ x: e.clientX - windowDragOffset.x, y: e.clientY - windowDragOffset.y });
      }
      if (resizing) {
        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;
        const minW = 400;
        const minH = 300;

        if (resizing.includes("e")) {
          setWindowSize(prev => ({ ...prev, w: Math.max(minW, resizeStart.w + dx) }));
        }
        if (resizing.includes("w")) {
          const newW = Math.max(minW, resizeStart.w - dx);
          setWindowSize(prev => ({ ...prev, w: newW }));
          setWindowPos(prev => ({ ...prev, x: resizeStart.px + (resizeStart.w - newW) }));
        }
        if (resizing.includes("s")) {
          setWindowSize(prev => ({ ...prev, h: Math.max(minH, resizeStart.h + dy) }));
        }
        if (resizing.includes("n")) {
          const newH = Math.max(minH, resizeStart.h - dy);
          setWindowSize(prev => ({ ...prev, h: newH }));
          setWindowPos(prev => ({ ...prev, y: resizeStart.py + (resizeStart.h - newH) }));
        }
      }
    };
    const handleMouseUp = () => {
      if (draggingIcon) {
        setIcons(prev => {
          const positions: Record<string, { x: number; y: number }> = {};
          prev.forEach(i => { positions[i.id] = { x: i.x, y: i.y }; });
          localStorage.setItem("desktop-icon-positions", JSON.stringify(positions));
          return prev;
        });
      }
      setDraggingIcon(null);
      setDraggingWindow(false);
      setResizing(null);
    };
    if (draggingIcon || draggingWindow || resizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingIcon, draggingWindow, resizing, dragOffset, windowDragOffset, resizeStart]);

  const showWindow = activeWindow && !activeWindow.minimized;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden select-none">
      {/* Desktop area */}
      <div
        className={`flex-1 relative overflow-hidden ${wallpaperId !== "custom" ? currentWallpaper.value : ""}`}
        style={wallpaperStyle}
        onClick={() => { setShowStartMenu(false); setShowWallpaperPicker(false); }}
        onContextMenu={(e) => {
          // Only show wallpaper picker if clicking the desktop itself (not an icon/window)
          if (e.target === e.currentTarget) {
            e.preventDefault();
            setShowWallpaperPicker(true);
            setShowStartMenu(false);
          }
        }}
      >
        {/* Desktop Icons */}
        {icons.map((icon) => (
          <div
            key={icon.id}
            onMouseDown={(e) => handleIconMouseDown(e, icon.id)}
            onDoubleClick={() => openApp(icon)}
            className="absolute flex flex-col items-center gap-1 cursor-pointer group"
            style={{ left: icon.x, top: icon.y, width: 80 }}
          >
            <div className={`text-4xl p-2 rounded-xl transition-all group-hover:scale-110 ${
              isDark ? "group-hover:bg-white/10" : "group-hover:bg-black/10"
            }`}>
              {icon.icon}
            </div>
            <span className={`text-[11px] text-center font-medium leading-tight px-1 py-0.5 rounded ${
              isDark
                ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                : "text-gray-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"
            }`}>
              {icon.label}
            </span>
          </div>
        ))}

        {/* Single active window */}
        {showWindow && (
          <div
            className={`absolute flex flex-col rounded-xl overflow-hidden shadow-2xl border ${
              isDark ? "border-slate-600 shadow-black/50" : "border-gray-300 shadow-gray-400/30"
            }`}
            style={activeWindow.maximized ? {
              left: 0, top: 0, width: "100%", height: "100%",
            } : {
              left: windowPos.x, top: windowPos.y,
              width: windowSize.w, height: windowSize.h,
            }}
          >
            {/* Title bar */}
            <div
              onMouseDown={handleWindowMouseDown}
              onDoubleClick={toggleMaximize}
              className={`flex-shrink-0 flex items-center h-9 px-3 gap-2 ${
                draggingWindow ? "cursor-grabbing" : "cursor-grab"
              } ${isDark ? "bg-slate-700" : "bg-gray-200"}`}
            >
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); closeWindow(); }}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); minimizeWindow(); }}
                  className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
                  className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                />
              </div>
              <span className={`flex-1 text-center text-xs font-medium truncate ${
                isDark ? "text-slate-300" : "text-gray-700"
              }`}>
                {activeWindow.label}
              </span>
              <div className="w-12" />
            </div>

            {/* Page content */}
            <div className={`flex-1 overflow-auto ${isDark ? "bg-slate-900" : "bg-white"}`}>
              {children}
            </div>

            {/* Resize handles — only when not maximized */}
            {!activeWindow.maximized && (
              <>
                {/* Edges */}
                <div onMouseDown={(e) => handleResizeStart(e, "n")} className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" />
                <div onMouseDown={(e) => handleResizeStart(e, "s")} className="absolute bottom-0 left-2 right-2 h-1 cursor-s-resize" />
                <div onMouseDown={(e) => handleResizeStart(e, "w")} className="absolute top-2 bottom-2 left-0 w-1 cursor-w-resize" />
                <div onMouseDown={(e) => handleResizeStart(e, "e")} className="absolute top-2 bottom-2 right-0 w-1 cursor-e-resize" />
                {/* Corners */}
                <div onMouseDown={(e) => handleResizeStart(e, "nw")} className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize" />
                <div onMouseDown={(e) => handleResizeStart(e, "ne")} className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize" />
                <div onMouseDown={(e) => handleResizeStart(e, "sw")} className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize" />
                <div onMouseDown={(e) => handleResizeStart(e, "se")} className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" />
              </>
            )}
          </div>
        )}

        {/* Wallpaper Picker (right-click desktop) */}
        {showWallpaperPicker && (
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 rounded-xl border shadow-2xl overflow-hidden z-50 ${
              isDark ? "bg-slate-800/95 border-slate-600 backdrop-blur-xl" : "bg-white/95 border-gray-200 backdrop-blur-xl"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-gray-100"}`}>
              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Desktop Wallpaper</p>
              <button
                onClick={() => setShowWallpaperPicker(false)}
                className={`p-1 rounded-lg ${isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-gray-100 text-gray-500"}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-4 gap-2 mb-3">
                {WALLPAPERS.filter(w => w.type === "gradient").map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => { setWallpaper(wp.id); setShowWallpaperPicker(false); }}
                    className={`aspect-video rounded-lg border-2 transition-all overflow-hidden ${
                      wallpaperId === wp.id
                        ? "border-cyan-500 ring-2 ring-cyan-500/30 scale-105"
                        : isDark ? "border-slate-600 hover:border-slate-500" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-full h-full ${wp.value}`} />
                  </button>
                ))}
              </div>
              <p className={`text-[10px] text-center mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {WALLPAPERS.find(w => w.id === wallpaperId)?.label || ""}
              </p>

              {/* Custom URL input */}
              <div className={`border-t pt-3 ${isDark ? "border-slate-700" : "border-gray-100"}`}>
                <label className={`text-xs font-medium mb-1.5 block ${isDark ? "text-slate-400" : "text-gray-600"}`}>Custom Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customWallpaperUrl}
                    onChange={(e) => setCustomWallpaperUrl(e.target.value)}
                    placeholder="https://example.com/wallpaper.jpg"
                    className={`flex-1 px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 ${
                      isDark
                        ? "bg-slate-900/50 border-slate-600 text-white placeholder-slate-500 focus:ring-cyan-500/50"
                        : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-blue-500/50"
                    }`}
                  />
                  <button
                    onClick={() => {
                      if (customWallpaperUrl.trim()) {
                        setWallpaper("custom", customWallpaperUrl.trim());
                        setShowWallpaperPicker(false);
                      }
                    }}
                    disabled={!customWallpaperUrl.trim()}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40 ${
                      isDark ? "bg-cyan-500 text-white hover:bg-cyan-600" : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start Menu */}
        {showStartMenu && (
          <div
            className={`absolute bottom-12 left-2 w-72 rounded-xl border shadow-2xl overflow-hidden z-50 ${
              isDark ? "bg-slate-800/95 border-slate-600 backdrop-blur-xl" : "bg-white/95 border-gray-200 backdrop-blur-xl"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`px-4 py-3 border-b ${isDark ? "border-slate-700" : "border-gray-100"}`}>
              <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                {user?.name || "IE Central"}
              </p>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>{user?.email}</p>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {DEFAULT_ICONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openApp(item)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    isDark ? "text-slate-300 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <div className={`px-3 py-2 border-t flex gap-1 ${isDark ? "border-slate-700" : "border-gray-100"}`}>
              <button
                onClick={() => { setAppearance("modern"); setShowStartMenu(false); }}
                className={`flex-1 text-center px-2 py-1.5 text-xs rounded-lg transition-colors ${
                  isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                Modern
              </button>
              <button
                onClick={() => { setAppearance("jmk"); setShowStartMenu(false); }}
                className={`flex-1 text-center px-2 py-1.5 text-xs rounded-lg transition-colors ${
                  isDark ? "text-green-500 hover:bg-green-900/20" : "text-green-700 hover:bg-green-50"
                }`}
              >
                JMK Terminal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Taskbar */}
      <div className={`flex-shrink-0 h-11 flex items-center px-2 gap-1 border-t ${
        isDark
          ? "bg-slate-800/90 border-slate-700 backdrop-blur-xl"
          : "bg-white/90 border-gray-200 backdrop-blur-xl"
      }`}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowStartMenu(prev => !prev); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            showStartMenu
              ? isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-blue-100 text-blue-700"
              : isDark ? "text-slate-300 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          IE
        </button>

        <div className={`w-px h-6 mx-1 ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />

        {/* Active window in taskbar */}
        {activeWindow && (
          <button
            onClick={() => activeWindow.minimized ? restoreWindow() : minimizeWindow()}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium truncate max-w-[200px] transition-colors ${
              activeWindow.minimized
                ? isDark ? "text-slate-500 hover:bg-slate-700" : "text-gray-400 hover:bg-gray-100"
                : isDark ? "bg-slate-600 text-white" : "bg-blue-100 text-blue-800"
            }`}
          >
            {activeWindow.label}
          </button>
        )}

        <div className="flex-1" />

        <div className={`flex items-center gap-2 px-2 text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          <span>{clock}</span>
        </div>
      </div>
    </div>
  );
}
