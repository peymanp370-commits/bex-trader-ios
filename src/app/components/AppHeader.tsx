import type { ReactNode } from "react";
import { ArrowLeft, Menu, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import bexLogoTransparent from "../../assets/bex-brand-logo.png";

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
      className={`${darkMode ? "bg-[#0f1623] border-gray-900/60 text-white" : "bg-white border-gray-100 text-gray-950"} sticky top-0 z-40 border-b px-4 pb-3 overflow-hidden`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.65rem)" }}
    >
      <div className="mx-auto grid min-h-[90px] max-w-7xl grid-cols-[38px_134px_minmax(0,1fr)_86px] items-center gap-2 overflow-hidden sm:grid-cols-[44px_150px_minmax(0,1fr)_96px]">
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
            <div className="w-9 shrink-0" />
          )}
        </div>

        <img
          src={bexLogoTransparent}
          alt="BEX Trader"
          className="h-[74px] w-[134px] shrink-0 object-contain object-center sm:h-[82px] sm:w-[150px]"
        />

        <div className="min-w-0 overflow-hidden">
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <h1 className="min-w-0 truncate text-[30px] font-extrabold leading-none tracking-[-0.02em] sm:text-4xl">{title}</h1>
            {badge ? <div className="hidden shrink-0 sm:block">{badge}</div> : null}
          </div>
          <div className={`mt-2 flex min-w-0 items-center gap-x-2 overflow-hidden text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            {subtitle ? <span className="hidden max-w-[110px] truncate sm:inline">{subtitle}</span> : null}
            {showUser && savedName ? (
              <Link to="/app/account" className="inline-flex min-w-0 items-center gap-1 truncate font-semibold hover:underline">
                <UserCircle className="h-4 w-4 shrink-0" /> <span className="truncate">{savedName}</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5 overflow-hidden">
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
