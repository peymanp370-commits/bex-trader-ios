import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../utils/api";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const params = new URLSearchParams(location.search);
      const hasOAuthSignal = params.get("auth") === "success" || !!params.get("provider");
      const attempts = hasOAuthSignal ? 5 : 2;

      try {
        for (let i = 0; i < attempts; i += 1) {
          const result = await getCurrentUser();

          if (!mounted) return;

          if (result?.ok && result.user) {
            const displayName =
              [result.user.first_name, result.user.last_name]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              result.user.first_name ||
              result.user.username ||
              result.user.email ||
              "Trader";

            localStorage.setItem(
              "userTimezone",
              result.user.timezone ||
                Intl.DateTimeFormat().resolvedOptions().timeZone ||
                "America/Toronto"
            );
            localStorage.setItem("userCountry", result.user.country || "Unknown");
            localStorage.setItem("userFirstName", result.user.first_name || "");
            localStorage.setItem("userLastName", result.user.last_name || "");
            localStorage.setItem("userEmail", result.user.email || "");
            localStorage.setItem("userName", displayName);
            localStorage.setItem("userPlan", result.user.plan || "VIP");

            setAuthorized(true);
            return;
          }

          if (i < attempts - 1) {
            await delay(350 + i * 300);
          }
        }

        setAuthorized(false);
      } catch {
        if (!mounted) return;
        setAuthorized(false);
      } finally {
        if (mounted) setLoading(false);
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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
