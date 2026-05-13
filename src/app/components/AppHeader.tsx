import type { ReactNode } from "react";
import { ArrowLeft, Menu, Moon, Settings, Sun, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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

function cleanName(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "Apple User";
  if (raw.includes("@")) return raw.split("@")[0] || "Apple User";
  return raw;
}

function readStoredName() {
  try {
    return (
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      localStorage.getItem("bex_user_name") ||
      localStorage.getItem("bex_user_email") ||
      localStorage.getItem("email") ||
      ""
    );
  } catch {
    return "";
  }
}

function readStoredPlan() {
  try {
    const raw =
      localStorage.getItem("plan") ||
      localStorage.getItem("bex_plan") ||
      localStorage.getItem("subscription") ||
      localStorage.getItem("bex_subscription") ||
      "FREE";

    const normalized = String(raw || "FREE")
      .replace(/^VIP_AUTO$/i, "VIP")
      .replace(/^BASIC$/i, "BASIC")
      .replace(/^PRO$/i, "PRO")
      .replace(/^FREE$/i, "FREE")
      .trim()
      .toUpperCase();

    return normalized || "FREE";
  } catch {
    return "FREE";
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
  showPlan = true,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const darkMode = typeof darkModeProp === "boolean" ? darkModeProp : readDarkMode(true);
  const savedName = cleanName(userName || readStoredName());
  const plan = readStoredPlan();
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
      className={`${darkMode ? "bg-[#0f1623] border-gray-900/60 text-white" : "bg-white border-gray-100 text-gray-950"} sticky top-0 z-40 overflow-hidden border-b px-4 pb-3`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.75rem)" }}
    >
      <div className="mx-auto grid min-h-[84px] max-w-7xl grid-cols-[34px_126px_minmax(0,1fr)_78px] items-center gap-2 overflow-hidden sm:grid-cols-[40px_142px_minmax(0,1fr)_88px]">
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

        <img
          src={bexLogoTransparent}
          alt="BEX Trader"
          className="h-[76px] w-[126px] shrink-0 object-contain object-center sm:h-[84px] sm:w-[142px]"
        />

        <div className="min-w-0 overflow-visible">
          <div className="flex min-w-0 items-center gap-1.5 overflow-visible">
            <h1
              className="min-w-0 whitespace-nowrap font-extrabold leading-none tracking-[-0.035em]"
              style={{ fontSize: "clamp(1.55rem, 7vw, 2rem)" }}
            >
              {title}
            </h1>
            {badge ? <div className="hidden shrink-0 sm:block">{badge}</div> : null}
          </div>

          {(showUser || showPlan) ? (
            <div className={`mt-2 flex min-w-0 items-center gap-1.5 overflow-hidden text-[12px] font-semibold leading-none ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {showUser ? (
                <Link to="/app/account" className="inline-flex min-w-0 max-w-[92px] items-center gap-1 truncate hover:underline sm:max-w-[130px]">
                  <UserCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{savedName}</span>
                </Link>
              ) : null}
              {showPlan ? (
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-gray-200 ring-1 ring-white/10">
                  {plan}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1 overflow-hidden">
          {showThemeToggle ? (
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
