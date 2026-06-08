import { useEffect, useState, type ReactNode } from "react";
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

type PlanKey = "FREE" | "BASIC" | "PRO" | "VIP_AUTO" | "LIFETIME";

type PlanInfo = {
  key: PlanKey;
  label: string;
  rank: number;
};

const PLAN_RANK: Record<PlanKey, number> = {
  FREE: 1,
  BASIC: 2,
  PRO: 3,
  VIP_AUTO: 4,
  LIFETIME: 5,
};

function cleanName(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "Apple User";
  if (raw.includes("@")) return raw.split("@")[0] || "Apple User";
  return raw;
}

function readJsonNameCandidates(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") return [];

    return [
      parsed.userName,
      parsed.name,
      parsed.fullName,
      parsed.displayName,
      parsed.email,
      parsed.username,
      parsed?.profile && typeof parsed.profile === "object"
        ? (parsed.profile as Record<string, unknown>).name
        : null,
      parsed?.profile && typeof parsed.profile === "object"
        ? (parsed.profile as Record<string, unknown>).email
        : null,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readStoredName() {
  try {
    const direct =
      localStorage.getItem("userName") ||
      localStorage.getItem("name") ||
      localStorage.getItem("bex_user_name") ||
      localStorage.getItem("bex_user_email") ||
      localStorage.getItem("email") ||
      localStorage.getItem("user_email") ||
      localStorage.getItem("bex_email") ||
      "";

    if (direct) return direct;

    const jsonKeys = [
      "user",
      "bex_user",
      "auth_user",
      "profile",
      "bex_profile",
      "currentUser",
      "bex_current_user",
    ];

    return jsonKeys.flatMap(readJsonNameCandidates)[0] || "";
  } catch {
    return "";
  }
}


type StoredIdentity = {
  id: string;
  email: string;
};

function readJsonObject(storageKey: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readCurrentStoredIdentity(): StoredIdentity {
  const jsonKeys = ["user", "bex_user", "auth_user", "currentUser", "bex_current_user", "session", "bex_session"];
  for (const key of jsonKeys) {
    const obj = readJsonObject(key);
    const nestedUser = obj?.user && typeof obj.user === "object" ? (obj.user as Record<string, unknown>) : null;
    const candidate = nestedUser || obj;
    const id = String(candidate?.id || candidate?.user_id || candidate?.userId || "").trim();
    const email = String(candidate?.email || candidate?.user_email || candidate?.username || "").trim().toLowerCase();
    if (id || email) return { id, email };
  }

  const email = String(
    localStorage.getItem("bex_user_email") ||
    localStorage.getItem("userEmail") ||
    localStorage.getItem("email") ||
    localStorage.getItem("user_email") ||
    ""
  ).trim().toLowerCase();
  return { id: "", email };
}

function readCurrentUserPlanCandidates(): PlanInfo[] {
  const jsonKeys = ["user", "bex_user", "auth_user", "currentUser", "bex_current_user"];
  const candidates: PlanInfo[] = [];

  for (const key of jsonKeys) {
    const obj = readJsonObject(key);
    if (!obj) continue;
    const nestedUser = obj.user && typeof obj.user === "object" ? (obj.user as Record<string, unknown>) : null;
    const source = nestedUser || obj;
    const userPlan = normalizePlan(source.plan || source.subscription_plan || source.activePlan || source.entitlement || source.tier);
    if (userPlan) candidates.push(userPlan);
  }

  return candidates;
}

function planScopeMatchesCurrentUser(identity: StoredIdentity): boolean {
  const scopedUserId = String(localStorage.getItem("bex_plan_scope_user_id") || "").trim();
  const scopedEmail = String(localStorage.getItem("bex_plan_scope_email") || "").trim().toLowerCase();

  if (!scopedUserId && !scopedEmail) return !identity.id && !identity.email;
  if (identity.id && scopedUserId && identity.id === scopedUserId) return true;
  if (identity.email && scopedEmail && identity.email === scopedEmail) return true;
  return false;
}

function normalizePlan(value: unknown): PlanInfo | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const compact = raw
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

  let key: PlanKey | null = null;

  if (/LIFETIME|LIFE_TIME|VIP_LIFETIME/.test(compact)) key = "LIFETIME";
  else if (/VIP|VIP_AUTO|AUTO_TRADING|AUTO_TRADE/.test(compact)) key = "VIP_AUTO";
  else if (/PRO/.test(compact)) key = "PRO";
  else if (/BASIC/.test(compact)) key = "BASIC";
  else if (/FREE|TRIAL|NONE/.test(compact)) key = "FREE";

  if (!key) return null;

  return {
    key,
    label: key === "VIP_AUTO" ? "VIP AUTO" : key,
    rank: PLAN_RANK[key],
  };
}

function readJsonPlanCandidates(storageKey: string): PlanInfo[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") return [];

    const candidates = [
      parsed.plan,
      parsed.userPlan,
      parsed.activePlan,
      parsed.subscription,
      parsed.subscriptionPlan,
      parsed.tier,
      parsed.role,
      parsed.entitlement,
      parsed?.billing && typeof parsed.billing === "object"
        ? (parsed.billing as Record<string, unknown>).plan
        : null,
      parsed?.billing && typeof parsed.billing === "object"
        ? (parsed.billing as Record<string, unknown>).tier
        : null,
    ];

    return candidates.map(normalizePlan).filter(Boolean) as PlanInfo[];
  } catch {
    return [];
  }
}

function readStoredPlan(): PlanInfo {
  try {
    const identity = readCurrentStoredIdentity();
    const userPlanCandidates = readCurrentUserPlanCandidates();
    const currentUserPlan = userPlanCandidates.sort((a, b) => b.rank - a.rank)[0] || null;

    const planKeys = [
      "userPlan",
      "bex_user_plan",
      "activePlan",
      "bex_active_plan",
      "subscription_plan",
      "bex_subscription_plan",
      "entitlement",
      "bex_entitlement",
      "plan",
      "bex_plan",
      "subscription",
      "bex_subscription",
      "tier",
      "bex_tier",
      "serverPlan",
      "displayPlan",
    ];

    const scopedPlanAllowed = planScopeMatchesCurrentUser(identity);
    const directCandidates = scopedPlanAllowed
      ? (planKeys.map((key) => normalizePlan(localStorage.getItem(key))).filter(Boolean) as PlanInfo[])
      : [];

    const best = [...userPlanCandidates, ...directCandidates].sort((a, b) => b.rank - a.rank)[0];

    if (best) return best;
    if (currentUserPlan) return currentUserPlan;
    return { key: "FREE", label: "FREE", rank: PLAN_RANK.FREE };
  } catch {
    return { key: "FREE", label: "FREE", rank: PLAN_RANK.FREE };
  }
}

function getPlanBadgeClass(planKey: PlanKey, darkMode: boolean) {
  const base = "shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ring-1";

  switch (planKey) {
    case "VIP_AUTO":
      return `${base} bg-[#f5b301] text-[#111827] ring-[#f5b301]/45 shadow-[0_0_12px_rgba(245,179,1,0.22)]`;
    case "LIFETIME":
      return `${base} bg-purple-500/90 text-white ring-purple-300/35`;
    case "PRO":
      return `${base} bg-blue-500/90 text-white ring-blue-300/35`;
    case "BASIC":
      return `${base} ${darkMode ? "bg-slate-500/80 text-white ring-white/15" : "bg-slate-200 text-slate-800 ring-slate-300"}`;
    case "FREE":
    default:
      return `${base} ${darkMode ? "bg-white/10 text-gray-200 ring-white/10" : "bg-gray-100 text-gray-700 ring-gray-200"}`;
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
  badge: _badge,
  rtl = false,
  showBack = false,
  backTo,
  showPlan = true,
}: AppHeaderProps) {
  const navigate = useNavigate();
  const darkMode = typeof darkModeProp === "boolean" ? darkModeProp : readDarkMode(true);
  const [headerVersion, setHeaderVersion] = useState(0);

  useEffect(() => {
    const refreshHeader = () => setHeaderVersion((v) => v + 1);
    window.addEventListener("storage", refreshHeader);
    window.addEventListener("bexPlanChanged", refreshHeader);
    window.addEventListener("themeChange", refreshHeader);
    window.addEventListener("focus", refreshHeader);
    return () => {
      window.removeEventListener("storage", refreshHeader);
      window.removeEventListener("bexPlanChanged", refreshHeader);
      window.removeEventListener("themeChange", refreshHeader);
      window.removeEventListener("focus", refreshHeader);
    };
  }, []);

  const savedName = cleanName(userName || readStoredName());
  const plan = readStoredPlan();
  void headerVersion;
  // Force a consistent account identity line on every app header.
  // Settings was passing showUser={false}, which hid the name and left only the plan badge.
  // Keep the prop for compatibility, but never hide the identity line when this shared header is used.
  const effectiveShowUser = true;
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
      className={`${darkMode ? "bg-[#0f1623] border-gray-900/60 text-white" : "bg-white border-gray-100 text-gray-950"} sticky top-0 z-40 overflow-visible border-b px-4 pb-3`}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.75rem)" }}
    >
      <div className="mx-auto grid min-h-[92px] max-w-7xl grid-cols-[34px_118px_minmax(145px,1fr)_78px] items-center gap-2 overflow-visible sm:grid-cols-[40px_142px_minmax(0,1fr)_88px]">
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
          className="h-[74px] w-[118px] shrink-0 object-contain object-center sm:h-[84px] sm:w-[142px]"
        />

        <div className="min-w-0 overflow-visible">
          <div className="flex min-w-0 items-center gap-1.5 overflow-visible">
            <h1
              className="min-w-0 whitespace-nowrap font-extrabold leading-none tracking-[-0.035em]"
              style={{ fontSize: "clamp(1.45rem, 6.4vw, 2rem)" }}
            >
              {title}
            </h1>
            {/* Page-level badge is intentionally hidden here to avoid duplicate plan badges.
                Active plan is rendered once below from the normalized localStorage/account plan. */}
          </div>

          {effectiveShowUser || showPlan ? (
            <div className={`mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 overflow-visible text-[12px] font-semibold leading-none ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              {effectiveShowUser ? (
                <Link to="/app/account" className="inline-flex min-w-0 max-w-[150px] items-center gap-1 truncate hover:underline sm:max-w-[180px]">
                  <UserCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{savedName}</span>
                </Link>
              ) : null}
              {showPlan ? <span className={getPlanBadgeClass(plan.key, darkMode)}>{plan.label}</span> : null}
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
