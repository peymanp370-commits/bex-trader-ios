import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { HeyBexAssistant } from "./HeyBexAssistant";

export function Layout() {
  const location = useLocation();

  const hideNavRoutes = ["/app/chart"];
  const shouldHideNav = hideNavRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#0a0e1a] pb-20">
      <Outlet />
      <HeyBexAssistant compact={shouldHideNav} />
      {!shouldHideNav && <BottomNav />}
    </div>
  );
}
