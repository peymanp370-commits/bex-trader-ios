import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function Layout() {
  const location = useLocation();

  const hideNavRoutes = ["/app/chart"];
  const shouldHideNav = hideNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0a0e1a] pb-20">
      <Outlet />
      {!shouldHideNav && <BottomNav />}
    </div>
  );
}