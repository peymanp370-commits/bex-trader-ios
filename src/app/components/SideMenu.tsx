import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, LineChart, BarChart3, Crown, Settings, X, UserRound, Shield, FileText, Lock, LogOut } from "lucide-react";
import { tr } from "../utils/i18n";
import { useLangState } from "../store/useLang";
import { clearLocalAuthState, logout } from "../utils/api";

type SideMenuProps = { open: boolean; onClose: () => void };

export function SideMenu({ open, onClose }: SideMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLangState();

  const menuItems = [
    { to: "/app/home", label: tr(lang, "Home", "خانه", "الرئيسية"), icon: Home },
    { to: "/app/market", label: tr(lang, "Market", "بازار", "السوق"), icon: LineChart },
    { to: "/app/stats", label: tr(lang, "BEX Public Stats", "آمار عمومی BEX", "إحصاءات BEX العامة"), icon: BarChart3 },
    { to: "/app/my-stats", label: tr(lang, "Account", "حساب", "الحساب"), icon: UserRound },
    { to: "/app/vip-auto", label: tr(lang, "VIP Auto Trading", "ترید خودکار VIP", "تداول VIP الآلي"), icon: Crown },
    { to: "/app/vip", label: tr(lang, "Plans", "پلن‌ها", "الخطط"), icon: Crown },
    { to: "/app/admin", label: tr(lang, "Admin", "مدیریت", "الإدارة"), icon: Shield },
    { to: "/app/settings", label: tr(lang, "Settings", "تنظیمات", "الإعدادات"), icon: Settings },
    { to: "/app/terms", label: tr(lang, "Terms", "قوانین", "الشروط"), icon: FileText },
    { to: "/app/privacy", label: tr(lang, "Privacy", "حریم خصوصی", "الخصوصية"), icon: Lock },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearLocalAuthState();
      onClose();
      navigate("/login?logged_out=1", { replace: true });
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close menu overlay" />
      <aside className="relative z-10 h-full w-72 max-w-[85vw] border-r border-gray-800 bg-[#0f1724] p-4 text-white shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold">{tr(lang, "Menu", "منو", "القائمة")}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to === "/app/home" && location.pathname === "/app");
            return (
              <Link key={item.to} to={item.to} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${active ? "bg-yellow-500/10 text-yellow-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}>
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-red-300 transition hover:bg-red-500/10 hover:text-red-200">
            <LogOut className="h-5 w-5" />
            <span>{tr(lang, "Logout", "خروج", "تسجيل الخروج")}</span>
          </button>
        </nav>
      </aside>
    </div>
  );
}
