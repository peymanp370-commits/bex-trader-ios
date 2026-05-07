import type { ReactNode } from "react";
import { ArrowLeft, Menu, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { Link } from "react-router-dom";
import bexLogoTransparent from "../../assets/bex-logo-transparent.png";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  darkMode: boolean;
  onToggleDark?: () => void;
  onMenuClick?: () => void;
  onBackClick?: () => void;
  showSettings?: boolean;
  showThemeToggle?: boolean;
  showUser?: boolean;
  userName?: string | null;
  badge?: ReactNode;
  rtl?: boolean;
};

export function AppHeader({
  title,
  subtitle,
  darkMode,
  onToggleDark,
  onMenuClick,
  onBackClick,
  showSettings = true,
  showThemeToggle = true,
  showUser = true,
  userName,
  badge,
  rtl = false,
}: AppHeaderProps) {
  const savedName =
    userName ||
    localStorage.getItem("userName") ||
    localStorage.getItem("name") ||
    localStorage.getItem("bex_user_name") ||
    "Trader";

  const iconButton = `${darkMode ? "hover:bg-[#1a2332] text-white" : "hover:bg-gray-100 text-gray-900"} p-2 rounded-xl transition-colors`;

  return (
    <header className={`${darkMode ? "bg-[#0f1623] border-gray-800" : "bg-white border-gray-200"} sticky top-0 z-20 border-b px-4 py-3`}>
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        {onBackClick ? (
          <button type="button" onClick={onBackClick} className={iconButton} aria-label="Back">
            <ArrowLeft className={`h-5 w-5 ${rtl ? "rotate-180" : ""}`} />
          </button>
        ) : onMenuClick ? (
          <button type="button" onClick={onMenuClick} className={iconButton} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
        ) : null}

        <img src={bexLogoTransparent} alt="BEX" className="h-14 w-16 shrink-0 object-contain" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-xl font-extrabold leading-tight sm:text-2xl">{title}</h1>
            {badge ? <div className="shrink-0">{badge}</div> : null}
          </div>
          <div className={`mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            {subtitle ? <span>{subtitle}</span> : null}
            {showUser ? (
              <span className="inline-flex items-center gap-1 font-semibold">
                <UserCircle className="h-3.5 w-3.5" /> {savedName}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {showThemeToggle && onToggleDark ? (
            <button type="button" onClick={onToggleDark} className={iconButton} aria-label="Toggle theme">
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
