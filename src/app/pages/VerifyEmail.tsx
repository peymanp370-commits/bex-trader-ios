import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import logoImage from "../../assets/bex-brand-logo.png";

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const flow = location.state?.flow || "login";

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(flow === "register" ? "/register" : "/login", { replace: true });
    }, 2500);

    return () => clearTimeout(timer);
  }, [flow, navigate]);

  return (
    <div className="min-h-screen bg-[#050812] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <img
          src={logoImage}
          alt="BEX"
          className="mx-auto mb-4 h-[96px] w-[180px] object-contain object-center"
        />

        <h1 className="text-3xl font-bold mb-3">Verification Not Required</h1>

        <p className="text-gray-400 mb-6">
          This app now uses password-based login and registration.
        </p>

        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/30"
          >
            Go to Login
          </Link>

          <Link
            to="/register"
            className="block w-full bg-[#111a2a] border border-gray-700 text-white py-4 rounded-xl font-bold text-lg"
          >
            Go to Register
          </Link>
        </div>

        <p className="text-xs text-gray-500 text-center mt-8">
          Redirecting automatically...
        </p>
      </div>
    </div>
  );
}