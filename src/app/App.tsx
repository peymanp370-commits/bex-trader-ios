import { Outlet } from "react-router-dom";
import { I18nRuntime } from "./components/I18nRuntime";

export function App() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0a0e1a]">
      <I18nRuntime />
      <Outlet />
    </div>
  );
}
