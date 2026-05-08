import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../utils/api";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function saveBexUser(user: any) {
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.first_name ||
    user?.username ||
    user?.email ||
    "Trader";

  localStorage.setItem(
    "userTimezone",
    user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto"
  );
  localStorage.setItem("userCountry", user?.country || "Unknown");
  localStorage.setItem("userFirstName", user?.first_name || "");
  localStorage.setItem("userLastName", user?.last_name || "");
  localStorage.setItem("userEmail", user?.email || "");
  localStorage.setItem("userName", displayName);
  localStorage.setItem("userPlan", user?.plan || "free");
  window.dispatchEvent(new Event("storage"));
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      const hasReturnSignal =
        params.get("auth") === "success" ||
        !!params.get("provider") ||
        !!params.get("platform") ||
        params.get("success") === "1" ||
        params.get("cancelled") === "1";
      const attempts = hasReturnSignal ? 8 : 3;

      try {
        for (let i = 0; i < attempts; i += 1) {
          const result = await getCurrentUser();
          if (!mounted) return;

          if (result?.ok && result.user) {
            saveBexUser(result.user);
            setAuthorized(true);
            setLoading(false);
            return;
          }

          if (i < attempts - 1) await delay(350 + i * 250);
        }

        if (mounted) {
          setAuthorized(false);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setAuthorized(false);
          setLoading(false);
        }
      }
    }

    checkAuth();
    return () => {
      mounted = false;
    };
  }, [location.search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <>{children}</>;
}
