import type { ReactNode } from "react";
import { ArrowLeft, Menu, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import bexTraderLogo from "../../assets/bex-trader-logo.png";

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
  logoClassName?: string;
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
  logoClassName = "",
}: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettingsPage = location.pathname.includes("/settings");
  const darkMode = typeof darkModeProp === "boolean" ? darkModeProp : readDarkMode(true);
  const savedName = userName || readStoredName();
  const iconButton = `${darkMode ? "hover:bg-[#1a2332] text-white" : "hover:bg-gray-100 text-gray-900"} p-2 rounded-xl transition-colors`;

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
      className={`${darkMode ? "bg-[#0f1623] border-gray-900/60 text-white" : "bg-white border-gray-100 text-gray-950"} sticky top-0 z-40 border-b px-4 pb-3`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 2.25rem)" }}
    >
      <div className="mx-auto grid min-h-[72px] max-w-7xl grid-cols-[36px_116px_minmax(0,1fr)_78px] items-center gap-2 sm:grid-cols-[44px_132px_minmax(0,1fr)_96px]">
        <div className="flex items-center justify-center">
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

        <img
          src={bexTraderLogo}
          alt="BEX Trader"
          className={`h-[64px] w-[116px] shrink-0 object-contain object-center sm:h-[72px] sm:w-[132px] ${logoClassName}`}
        />

        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <h1 className="min-w-0 truncate whitespace-nowrap text-[24px] font-extrabold leading-tight sm:text-[28px]">{title}</h1>
            {badge ? <div className="hidden shrink-0 min-[390px]:block">{badge}</div> : null}
          </div>
          <div className={`mt-0.5 flex min-w-0 items-center gap-x-2 overflow-hidden text-[13px] sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            {subtitle ? <span className="min-w-0 truncate whitespace-nowrap">{subtitle}</span> : null}
            {showUser && savedName ? (
              <Link to="/app/account" className="inline-flex min-w-0 shrink-0 items-center gap-1 font-semibold hover:underline">
                <UserCircle className="h-3.5 w-3.5 shrink-0" /> <span className="max-w-[96px] truncate">{savedName}</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1">
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
