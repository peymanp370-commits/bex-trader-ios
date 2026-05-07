import { Link, useLocation } from "react-router-dom";
import { Home, BarChart3, LineChart, Crown, Settings, Wrench, UserRound } from "lucide-react";
import { tr } from "../utils/i18n";
import { useLangState } from "../store/useLang";

export function BottomNav() {
  const location = useLocation();
  const { lang } = useLangState();

  const navItems = [
    { to: "/app/home", label: tr(lang, "Home", "خانه", "الرئيسية"), icon: Home },
    { to: "/app/market", label: tr(lang, "Market", "بازار", "السوق"), icon: LineChart },
    { to: "/app/stats", label: tr(lang, "Stats", "آمار", "الإحصائيات"), icon: BarChart3 },
    { to: "/app/my-stats", label: tr(lang, "Account", "حساب", "الحساب"), icon: UserRound },
    { to: "/app/tools", label: tr(lang, "Tools", "ابزارها", "الأدوات"), icon: Wrench },
    { to: "/app/vip", label: "VIP", icon: Crown },
    { to: "/app/settings", label: tr(lang, "Settings", "تنظیمات", "الإعدادات"), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-[#0f1724]/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.to ||
            (item.to === "/app/home" && location.pathname === "/app") ||
            (item.to === "/app/my-stats" && location.pathname === "/app/account");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] transition sm:text-[11px] ${
                active ? "text-yellow-400" : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="mb-1 h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
