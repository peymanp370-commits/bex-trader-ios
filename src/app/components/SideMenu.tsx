import { Link, useLocation } from "react-router-dom";
import { Home, LineChart, BarChart3, Crown, Settings, X, UserRound, Shield, FileText, Lock } from "lucide-react";

type SideMenuProps = { open: boolean; onClose: () => void };

const menuItems = [
  { to: "/app/home", label: "Home", icon: Home },
  { to: "/app/market", label: "Market", icon: LineChart },
  { to: "/app/stats", label: "BEX Public Stats", icon: BarChart3 },
  { to: "/app/my-stats", label: "My Stats", icon: UserRound },
  { to: "/app/vip-auto", label: "VIP Auto Trading", icon: Crown },
  { to: "/app/vip", label: "Plans", icon: Crown },
  { to: "/app/admin", label: "Admin", icon: Shield },
  { to: "/app/settings", label: "Settings", icon: Settings },
  { to: "/app/terms", label: "Terms", icon: FileText },
  { to: "/app/privacy", label: "Privacy", icon: Lock },
];

export function SideMenu({ open, onClose }: SideMenuProps) {
  const location = useLocation();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close menu overlay" />
      <aside className="relative z-10 h-full w-72 max-w-[85vw] border-r border-gray-800 bg-[#0f1724] p-4 text-white shadow-2xl">
        <div className="mb-6 flex items-center justify-between"><h2 className="text-lg font-bold">Menu</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white" aria-label="Close menu"><X className="h-5 w-5" /></button></div>
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to || (item.to === "/app/home" && location.pathname === "/app");
            return <Link key={item.to} to={item.to} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${active ? "bg-yellow-500/10 text-yellow-400" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}><Icon className="h-5 w-5" /><span>{item.label}</span></Link>;
          })}
        </nav>
      </aside>
    </div>
  );
}
