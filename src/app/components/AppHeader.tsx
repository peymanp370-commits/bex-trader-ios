import type { ReactNode } from "react";
import { ArrowLeft, Menu, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import bexLogoTransparent from "../../assets/bex-logo-transparent.png";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  darkMode?: boolean;
  onToggleDark?: () => void;
  onMenuClick?: () => void;
  onBackClick?: () => void;
  showSettings?: boolean;
  showThemeToggle?: boolean;
  showUser?: boolean;
  userName?: string | null;
  badge?: ReactNode;
  rtl?: boolean;
  mode?: string;
  showBack?: boolean;
  backTo?: string;
  showPlan?: boolean;
};

function readStoredName() {
  try {
    return (
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      localStorage.getItem("bex_user_name") ||
      ""
    );
  } catch {
    return "";
  }
}

function readDarkMode(fallback = true) {
  try {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function toggleStoredDarkMode(current: boolean) {
  const next = !current;
  try {
    localStorage.setItem("darkMode", JSON.stringify(next));
    window.dispatchEvent(new Event("themeChange"));
  } catch {}
  return next;
}

function normalizeTitle(title: string) {
  const t = String(title || "").trim();
  if (!t) return "BEX";
  if (/^bex\s+public\s+stats$/i.test(t)) return "Stats";
  if (/^vip\s+plans$/i.test(t)) return "VIP";
  if (/^trading\s+tools$/i.test(t)) return "Tools";
  if (/^bex\s+ai$/i.test(t)) return "Settings";
  return t;
}

function compactSubtitle(value?: string) {
  const s = String(value || "").trim();
  if (!s) return "";
  if (/public system performance/i.test(s)) return "Public performance";
  if (/fast calculators/i.test(s)) return "Risk calculators";
  if (/live market data/i.test(s)) return "Live market";
  if (/gold trader|bex ai gold trader/i.test(s)) return "BEX Trader";
  if (/personal/i.test(s) && /trading/i.test(s)) return "My MT5 stats";
  return s;
}

export function AppHeader({
  title,
  subtitle,
  darkMode: darkModeProp,
  onToggleDark,
  onMenuClick,
  onBackClick,
  showSettings = true,
  showThemeToggle = true,
  showUser = true,
  userName,
  badge,
  rtl = false,
  showBack = false,
  backTo,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettingsPage = location.pathname.includes("/settings");
  const darkMode = typeof darkModeProp === "boolean" ? darkModeProp : readDarkMode(true);
  const savedName = userName || readStoredName();
  const displayTitle = normalizeTitle(title);
  const displaySubtitle = compactSubtitle(subtitle);
  const iconButton = `${darkMode ? "hover:bg-[#1a2332] text-white" : "hover:bg-gray-100 text-gray-900"} flex h-9 w-9 items-center justify-center rounded-xl transition-colors`;

  const doBack = () => {
    if (onBackClick) return onBackClick();
    if (backTo) return navigate(backTo);
    return navigate(-1);
  };

  const doTheme = () => {
    if (onToggleDark) return onToggleDark();
    toggleStoredDarkMode(darkMode);
  };

  return (
    <header
      className={`${darkMode ? "bg-[#0f1623] border-gray-900/60 text-white" : "bg-white border-gray-100 text-gray-950"} sticky top-0 z-40 w-full max-w-[100vw] overflow-hidden border-b px-4 pb-3`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <div className="mx-auto grid min-h-[76px] w-full max-w-7xl grid-cols-[38px_102px_minmax(0,1fr)_76px] items-center gap-x-2 sm:grid-cols-[42px_128px_minmax(0,1fr)_84px] sm:gap-x-3">
        <div className="flex h-full items-center justify-center">
          {showBack || onBackClick || backTo ? (
            <button type="button" onClick={doBack} className={iconButton} aria-label="Back">
              <ArrowLeft className={`h-5 w-5 ${rtl ? "rotate-180" : ""}`} />
            </button>
          ) : onMenuClick ? (
            <button type="button" onClick={onMenuClick} className={iconButton} aria-label="Menu">
              <Menu className="h-5 w-5" />
            </button>
          ) : (
            <div className="h-9 w-9 shrink-0" />
          )}
        </div>

        <div className="flex min-w-0 items-center justify-start overflow-visible">
          <img
            src={bexLogoTransparent}
            alt="BEX Trader"
            className="h-[68px] w-[102px] shrink-0 object-contain object-left sm:h-[78px] sm:w-[128px]"
            draggable={false}
          />
        </div>

        <div className="min-w-0 overflow-hidden px-1">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <h1 className="min-w-0 truncate text-[28px] font-extrabold leading-none tracking-[-0.02em] sm:text-[32px]">
              {displayTitle}
            </h1>
            {badge ? <div className="hidden shrink-0 min-[430px]:block">{badge}</div> : null}
          </div>
          <div className={`mt-2 flex min-w-0 items-center gap-2 overflow-hidden text-[13px] font-semibold sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            {displaySubtitle ? <span className="hidden min-w-0 truncate min-[430px]:inline">{displaySubtitle}</span> : null}
            {showUser && savedName ? (
              <Link to="/app/account" className="inline-flex min-w-0 items-center gap-1 overflow-hidden hover:underline">
                <UserCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{savedName}</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1">
          {showThemeToggle && !isSettingsPage ? (
            <button type="button" onClick={doTheme} className={iconButton} aria-label="Toggle theme">
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          ) : null}
          {showSettings ? (
            <Link to="/app/settings" className={iconButton} aria-label="Settings">
              <Settings className="h-5 w-5" />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
