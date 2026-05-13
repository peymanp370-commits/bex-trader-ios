import { Link } from "react-router-dom";
import { useState } from "react";
import { getLanguage, tr, markRTL } from "../utils/i18n";
import logoImage from "../../assets/bex-brand-logo.png";


 const AUTH_BASE = "https://auth.bextrader.com";

export function ForgotPassword() {
  const lang = getLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${AUTH_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: cleanEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || "Could not send reset email.");
        return;
      }

      setSuccess(
        data?.message ||
          "If your email exists in our system, a reset link has been sent."
      );
    } catch {
      setError("Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md" {...markRTL(lang)}>
        <div className="text-center mb-6">
          <img
            src={logoImage}
            alt="BEX"
            className="mx-auto mb-4 h-[96px] w-[180px] object-contain object-center"
          />
          <h1 className="text-3xl font-bold mb-2">{tr(lang, "Forgot Password", "فراموشی رمز عبور", "نسيت كلمة المرور")}</h1>
          <p className="text-gray-400">
            {tr(lang, "Enter your email and we’ll send you a reset link", "ایمیل خود را وارد کنید تا لینک بازیابی ارسال شود", "أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tr(lang, "Email Address", "آدرس ایمیل", "البريد الإلكتروني")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a2332] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
              placeholder={tr(lang, "Enter your email", "ایمیل خود را وارد کنید", "أدخل بريدك الإلكتروني")}
              autoComplete="email"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/40 transition-all disabled:opacity-50"
          >
            {loading ? tr(lang, "Sending...", "در حال ارسال...", "جارٍ الإرسال...") : tr(lang, "Send Reset Link", "ارسال لینک بازیابی", "إرسال رابط إعادة التعيين")}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-sm text-gray-400 hover:text-yellow-400 transition-colors"
            >
              {tr(lang, "Back to Login", "بازگشت به ورود", "العودة إلى تسجيل الدخول")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
