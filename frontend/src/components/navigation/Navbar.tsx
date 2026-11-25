"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Sparkles,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Rocket,
  Menu,
  X,
  Bug,
  Zap,
  Settings,
  LogIn,
  LogOut,
  UserRound,
} from "lucide-react";
import { sfx } from "@/lib/audio-sfx";
import { useTheme } from "@/lib/theme-provider";
import { useAuth } from "@/lib/auth";

interface NavbarProps {
  onOpenBatchScan?: () => void;
}

// onOpenBatchScan is accepted for API compatibility; the batch scan button lives on the pipelines page.
export function Navbar(_props: NavbarProps) {  // eslint-disable-line @typescript-eslint/no-unused-vars
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, guest, ready, logout } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [utcTime, setUtcTime] = useState("");

  // Smooth Sliding Gold Bar Tracker
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const linkRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({});

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update sliding gold bar position whenever pathname or hovered link changes
  useEffect(() => {
    const updateBar = () => {
      const targetHref = hoveredHref || pathname;
      const activeEl = linkRefs.current[targetHref];
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft + 12,
          width: Math.max(16, activeEl.offsetWidth - 24),
          opacity: 1,
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };
    updateBar();
    window.addEventListener("resize", updateBar);
    return () => window.removeEventListener("resize", updateBar);
  }, [pathname, hoveredHref]);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    sfx.enabled = nextState;
    setSoundEnabled(nextState);
    if (nextState) sfx.playSuccess();
  };

  const handleThemeChange = () => {
    sfx.playClick(1200);
    toggleTheme();
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Pipelines", href: "/pipelines", badge: "2 Projects" },
    { label: "SHAP Engine", href: "/shap", badge: "XAI" },
    { label: "About", href: "/about" },
    { label: "Settings", href: "/settings" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <nav className="glass-royal-deck sticky top-0 z-50 px-4 md:px-8 py-3 transition-all duration-300 border-b border-amber-600/20 dark:border-amber-400/15">
      <div className="max-w-[1780px] mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Insignia & Title */}
        <Link
          href="/"
          onClick={() => sfx.playBlip()}
          className="flex items-center gap-3 group focus:outline-none"
        >
          <div className="relative">
            <div className="flex size-10 items-center justify-center rounded-xl border border-[#B48A28]/40 dark:border-[#D4AF37]/40 bg-gradient-to-br from-[#FAF9F6] via-[#F1F5F9] to-[#DDD6FE]/30 dark:from-[#0F1322] dark:via-[#1E2761]/40 dark:to-[#5C1D42]/30 text-[#1E1B4B] dark:text-[#E2E8F0] shadow-[0_0_15px_rgba(180,138,40,0.15)] dark:shadow-[0_0_20px_rgba(212,175,55,0.2)] group-hover:scale-105 group-hover:border-[#B48A28] dark:group-hover:border-[#D4AF37] transition-all duration-300">
              <Compass className="size-5 text-[#B48A28] dark:text-[#D4AF37] group-hover:rotate-45 transition-transform duration-500" />
            </div>
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-black tracking-wider text-[#1E1B4B] dark:text-[#F8FAFC]">
                ASTRÆA
              </span>
              <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border border-[#B48A28]/30 dark:border-[#D4AF37]/30 bg-[#DDD6FE]/30 dark:bg-[#1E2761]/40 text-[#1E1B4B] dark:text-[#E2E8F0] flex items-center gap-1 shadow-sm">
                <Sparkles className="size-2.5 text-[#B48A28] dark:text-[#D4AF37]" /> OBSERVATORY
              </span>
            </div>
            <div className="font-mono text-[10px] text-slate-500 dark:text-[#94A3B8] hidden xl:flex whitespace-nowrap items-center gap-1.5">
              <span className="text-[#3B82F6] dark:text-[#A5F3FC]">SPHEREx Q3</span>
              <span className="opacity-40">&bull;</span>
              <span>TESS FFI</span>
              <span className="opacity-40">&bull;</span>
              <span className="text-[#6D28D9] dark:text-[#E2E8F0]">{utcTime}</span>
            </div>
          </div>
        </Link>

        {/* Desktop Main Navigation (4 to 6 links max) with Fluid Sliding Gold Bar */}
        <div
          onMouseLeave={() => setHoveredHref(null)}
          className="relative hidden md:flex items-center gap-1 lg:gap-2 p-1 rounded-2xl bg-slate-200/40 dark:bg-[#0B0E17]/60 border border-slate-300/40 dark:border-slate-800/60 backdrop-blur-md"
        >
          {/* THE SINGLE SLIDING GOLD BAR (Smooth Glide Animation) */}
          <span
            className="absolute bottom-1 h-[2.5px] bg-gradient-to-r from-[#B48A28] via-[#FDE047] to-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,1)] rounded-full pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-10"
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
            }}
          />

          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                ref={(el) => {
                  linkRefs.current[link.href] = el;
                }}
                onMouseEnter={() => setHoveredHref(link.href)}
                onClick={() => sfx.playClick(900)}
                className={`interactive-press relative px-3.5 py-1.5 rounded-xl text-xs font-serif font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[#DDD6FE]/70 dark:bg-[#1E2761]/90 text-[#1E1B4B] dark:text-[#F8FAFC] border border-[#B48A28]/50 dark:border-[#D4AF37]/50 shadow-[0_0_15px_rgba(180,138,40,0.2)] dark:shadow-[0_0_18px_rgba(212,175,55,0.2)]"
                    : "text-slate-600 dark:text-[#CBD5E1] hover:text-[#1E1B4B] dark:hover:text-[#F8FAFC] hover:bg-slate-200/60 dark:hover:bg-[#1E2761]/40 border border-transparent hover:border-[#B48A28]/20 dark:hover:border-[#D4AF37]/20"
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive
                        ? "bg-[#3B82F6]/20 dark:bg-[#408EC6]/30 text-[#1E1B4B] dark:text-[#A5F3FC]"
                        : "bg-slate-200 dark:bg-[#1E2761]/40 text-slate-600 dark:text-[#94A3B8]"
                    }`}
                  >
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Controls: HUD Audio, Theme Switcher & Standout CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Tactical Audio HUD Button */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Tactile Audio HUD Active" : "Tactile Audio HUD Muted"}
            className={`interactive-press hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono transition-all duration-200 ${
              soundEnabled
                ? "border-[#B48A28] dark:border-[#D4AF37] bg-[#DDD6FE]/50 dark:bg-[#1E2761]/80 text-[#1E1B4B] dark:text-[#F8FAFC] shadow-[0_0_14px_rgba(180,138,40,0.3)] dark:shadow-[0_0_16px_rgba(212,175,55,0.3)]"
                : "border-slate-300 dark:border-slate-800 bg-[#F1F5F9]/80 dark:bg-[#0D111E]/80 text-slate-500 dark:text-[#94A3B8] hover:border-[#B48A28]/40 dark:hover:border-[#D4AF37]/40 hover:text-[#1E1B4B] dark:hover:text-[#F8FAFC] hover:shadow-[0_0_10px_rgba(212,175,55,0.15)]"
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="size-3.5 text-[#B48A28] dark:text-[#D4AF37] animate-pulse" />
            ) : (
              <VolumeX className="size-3.5" />
            )}
            <span className="hidden xl:inline">HUD</span>
          </button>

          {/* 4-State Theme Switcher: JUNGO ✦ → URJA ⚡ → Dark 🌙 → Light ☀️ */}
          <button
            onClick={handleThemeChange}
            title={
              theme === "jungo"
                ? "Switch to URJA MODE ⚡ (Daylight Solar Energy)"
                : theme === "urja"
                ? "Switch to Dark Void Mode"
                : theme === "dark"
                ? "Switch to Celestial Light Mode"
                : "Switch to JUNGO MODE ✦ (Glowing Insect)"
            }
            className={`interactive-press relative flex items-center justify-center rounded-xl border transition-all duration-300 overflow-hidden ${
              theme === "jungo"
                ? "px-2.5 py-1.5 gap-1.5 border-[#D4AF37]/60 bg-[#0F1322]/90 hover:border-[#D4AF37] hover:shadow-[0_0_18px_rgba(212,175,55,0.5)] text-[#F8FAFC]"
                : theme === "urja"
                ? "px-2.5 py-1.5 gap-1.5 border-[#C59B27]/70 bg-[#FAF8F5]/95 hover:border-[#C59B27] hover:shadow-[0_0_18px_rgba(197,155,39,0.4)] text-[#11162B]"
                : "size-9 border-[#B48A28]/30 dark:border-[#D4AF37]/30 bg-[#F1F5F9]/80 dark:bg-[#0F1322]/80 hover:border-[#B48A28] dark:hover:border-[#D4AF37] hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] text-[#1E1B4B] dark:text-[#F8FAFC]"
            }`}
          >
            {theme === "jungo" ? (
              <>
                <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#D4AF37]/25 via-[#A5F3FC]/10 to-transparent animate-pulse" />
                <Bug className="size-4 text-[#A5F3FC] relative drop-shadow-[0_0_6px_rgba(165,243,252,0.9)] transition-transform hover:scale-110 duration-300" />
                <span className="jungo-badge relative hidden xl:inline">JUNGO</span>
              </>
            ) : theme === "urja" ? (
              <>
                <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#C59B27]/20 via-amber-400/10 to-transparent animate-pulse" />
                <Zap className="size-4 text-[#C59B27] relative drop-shadow-[0_0_8px_rgba(197,155,39,0.9)] transition-transform hover:scale-125 duration-300" />
                <span className="urja-badge relative hidden xl:inline">URJA ⚡</span>
              </>
            ) : theme === "dark" ? (
              <Moon className="size-4 text-[#93C5FD] transition-transform hover:-rotate-12 duration-500" />
            ) : (
              <Sun className="size-4 text-amber-500 transition-transform hover:rotate-90 duration-500" />
            )}
          </button>

          {/* Settings Shortcut Button */}
          <Link
            href="/settings"
            onClick={() => sfx.playClick(850)}
            title="Observatory Settings & Controls"
            className={`interactive-press hidden sm:flex items-center justify-center size-9 rounded-xl border transition-all duration-300 ${
              pathname === "/settings"
                ? "border-[#B48A28] dark:border-[#D4AF37] bg-[#DDD6FE]/70 dark:bg-[#1E2761]/90 text-[#1E1B4B] dark:text-[#F8FAFC] shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                : "border-slate-300 dark:border-slate-800 bg-[#F1F5F9]/80 dark:bg-[#0D111E]/80 text-slate-500 dark:text-[#94A3B8] hover:border-[#B48A28]/40 dark:hover:border-[#D4AF37]/40 hover:text-[#1E1B4B] dark:hover:text-[#F8FAFC]"
            }`}
          >
            <Settings className="size-4 hover:rotate-90 transition-transform duration-500" />
          </Link>

          {/* Auth: sign in / user chip */}
          {ready && (user ? (
            <button
              onClick={() => { sfx.playClick(800); logout(); }}
              title="Sign out"
              className="interactive-press hidden sm:flex whitespace-nowrap items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[#F1F5F9]/80 dark:bg-[#0D111E]/80 px-2.5 py-1.5 text-[11px] font-mono text-slate-700 dark:text-[#CBD5E1] hover:border-[#D4AF37]/60"
            >
              <UserRound className="size-3.5 text-[#B48A28] dark:text-[#D4AF37]" />
              <span className="max-w-[90px] truncate">{user.name}</span>
              <LogOut className="size-3.5 opacity-60" />
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => sfx.playClick(800)}
              className="interactive-press hidden sm:flex whitespace-nowrap items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[#F1F5F9]/80 dark:bg-[#0D111E]/80 px-2.5 py-1.5 text-[11px] font-mono text-slate-700 dark:text-[#CBD5E1] hover:border-[#D4AF37]/60"
            >
              <LogIn className="size-3.5" /> {guest ? "GUEST · SIGN IN" : "SIGN IN"}
            </Link>
          ))}

          {/* Standout Primary Action Button (Far Right) */}
          <Link
            href="/pipelines"
            onClick={() => sfx.playSelect()}
            className="sheen-sweep interactive-press interactive-glow-cyan relative hidden lg:flex whitespace-nowrap items-center gap-2 rounded-xl border border-[#B48A28]/60 dark:border-[#D4AF37]/60 bg-gradient-to-r from-[#1E1B4B] via-[#2E4A9E] to-[#4F46E5] dark:from-[#2E4A9E] dark:via-[#5C1D42] dark:to-[#7A2048] text-white font-serif text-xs font-bold tracking-wider px-4 py-2 shadow-[0_0_20px_rgba(46,74,158,0.35)] dark:shadow-[0_0_24px_rgba(212,175,55,0.3)] transition-all duration-200"
          >
            <Rocket className="size-3.5 text-[#A5F3FC]" />
            <span>LAUNCH CONSOLE</span>
          </Link>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center size-9 rounded-xl border border-slate-300 dark:border-slate-800 bg-[#F1F5F9] dark:bg-[#0D111E] text-slate-700 dark:text-[#CBD5E1]"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2 font-serif text-sm">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  sfx.playClick();
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-xl flex items-center justify-between ${
                  isActive
                    ? "bg-[#DDD6FE]/60 dark:bg-[#1E2761]/70 text-[#1E1B4B] dark:text-[#F8FAFC] font-bold"
                    : "text-slate-600 dark:text-[#CBD5E1]"
                }`}
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-[#1E2761] text-slate-700 dark:text-[#A5F3FC]">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href={user ? "/pipelines" : "/login"}
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2 rounded-xl text-slate-600 dark:text-[#CBD5E1] flex items-center gap-2"
          >
            <LogIn className="size-4" /> {user ? user.name : "Sign in / Sign up"}
          </Link>
          {user && (
            <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="px-3 py-2 rounded-xl text-left text-slate-600 dark:text-[#CBD5E1] flex items-center gap-2">
              <LogOut className="size-4" /> Sign out
            </button>
          )}
          <Link
            href="/pipelines"
            onClick={() => {
              sfx.playSelect();
              setMobileMenuOpen(false);
            }}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2E4A9E] to-[#4F46E5] text-white py-2.5 font-bold shadow-md"
          >
            <Rocket className="size-4 text-[#A5F3FC]" />
            <span>LAUNCH OBSERVATORY CONSOLE</span>
          </Link>
        </div>
      )}
    </nav>
  );
}
