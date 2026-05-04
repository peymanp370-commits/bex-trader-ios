import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function Layout() {
  const location = useLocation();

  const hideNavRoutes = ["/app/chart"];
  const shouldHideNav = hideNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#0a0e1a] pb-20">
      <Outlet />
      {!shouldHideNav && <BottomNav />}
    </div>
  );
}