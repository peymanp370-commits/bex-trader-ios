import { ArrowLeft, CheckCircle, Crown, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getLanguage, tr } from "../utils/i18n";

const AUTH_BASE = import.meta.env.VITE_API_URL || "https://auth.bextrader.com";

type CheckoutState = "loading" | "redirecting" | "success" | "error" | "idle";

const PLAN_LABELS: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  vip_auto: "VIP Auto",
  lifetime: "Lifetime",
};

const PLAN_PRICES: Record<string, Record<string, string>> = {
  basic: { monthly: "$9.99/mo", yearly: "$79/year" },
  pro: { monthly: "$29/mo", yearly: "$249/year" },
  vip_auto: { monthly: "$49/mo", yearly: "$399/year" },
  lifetime: { lifetime: "$799 one-time" },
};

function normalizePlan(value: string | null) {
  const plan = String(value || "").trim().toLowerCase();
  if (["basic", "pro", "vip_auto", "lifetime"].includes(plan)) return plan;
  return "pro";
}

function normalizeBilling(value: string | null, plan: string) {
  if (plan === "lifetime") return "lifetime";
  return String(value || "").toLowerCase() === "yearly" ? "yearly" : "monthly";
}

export function Checkout() {
  const [params] = useSearchParams();
  const lang = getLanguage();
  const t = (dict: Record<string, string>) => tr(lang, dict);
  const tf = (en: string, fa: string) => t({ en, fa, ar: en, es: en, "pt-BR": en, hi: en, tr: en, de: en, fr: en, zh: en, ko: en });

  const plan = normalizePlan(params.get("plan"));
  const billing = normalizeBilling(params.get("billing"), plan);
  const success = params.get("success") === "1";

  const [state, setState] = useState<CheckoutState>(success ? "success" : "idle");
  const [error, setError] = useState<string>("");

  const planName = PLAN_LABELS[plan] || "Pro";
  const price = PLAN_PRICES[plan]?.[billing] || "";

  const title = useMemo(() => {
    if (success) return tf("Payment successful", "پرداخت موفق بود");
    return `${tf("Checkout", "پرداخت")} — ${planName}`;
  }, [success, planName]);

  async function startCheckout() {
    setState("loading");
    setError("");

    try {
      // Android Capacitor WebView may not reliably attach cross-domain cookies.
      // Native Google/Apple login stores the refresh token in localStorage.
      // Send it as Bearer too; the auth worker already accepts Authorization: Bearer <refresh_token>.
      const refreshToken =
        localStorage.getItem("bex_refresh_token") ||
        localStorage.getItem("refresh_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("auth_token") ||
        "";

      const res = await fetch(`${AUTH_BASE}/api/billing/create-checkout-session`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(refreshToken ? { Authorization: `Bearer ${refreshToken}` } : {}),
        },
        body: JSON.stringify({ plan, billing }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.checkout_url) {
        throw new Error(data?.message || data?.error || data?.code || "checkout_failed");
      }

      setState("redirecting");
      window.location.href = data.checkout_url;
    } catch (err: any) {
      setState("error");
      setError(err?.message || "Checkout failed");
    }
  }

  useEffect(() => {
    if (!success) startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white px-4 py-6">
      <div className="max-w-xl mx-auto">
        <Link to="/app/vip" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          {tf("Back to plans", "بازگشت به پلن‌ها")}
        </Link>

        <div className="rounded-3xl border border-yellow-500/30 bg-white/5 p-6 shadow-2xl shadow-yellow-500/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black">{title}</h1>
              <p className="text-slate-400 text-sm">BEX Trader Secure Checkout</p>
            </div>
          </div>

          <div className="rounded-2xl bg-black/30 border border-white/10 p-4 mb-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">{tf("Selected plan", "پلن انتخاب‌شده")}</span>
              <span className="font-bold">{planName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{tf("Price", "قیمت")}</span>
              <span className="font-black text-yellow-400">{price}</span>
            </div>
          </div>

          {state === "success" && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 mb-5">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <div>
                  <p className="font-bold text-emerald-300">{tf("Your payment was completed.", "پرداخت شما انجام شد.")}</p>
                  <p className="text-sm text-emerald-100/80">
                    {tf("Your plan will update automatically after payment confirmation.", "پلن شما بعد از تأیید پرداخت به‌صورت خودکار آپدیت می‌شود.")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(state === "loading" || state === "redirecting") && (
            <div className="rounded-2xl bg-blue-500/10 border border-blue-500/30 p-4 mb-5 flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-300" />
              <div>
                <p className="font-bold text-blue-200">
                  {state === "redirecting" ? tf("Redirecting to secure checkout...", "در حال انتقال به پرداخت امن...") : tf("Creating secure checkout...", "در حال ساخت پرداخت امن...")}
                </p>
                <p className="text-sm text-blue-100/70">{tf("Please do not close this page.", "لطفاً این صفحه را نبندید.")}</p>
              </div>
            </div>
          )}

          {state === "error" && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <XCircle className="w-6 h-6 text-red-400" />
                <div>
                  <p className="font-bold text-red-300">{tf("Checkout could not start", "پرداخت شروع نشد")}</p>
                  <p className="text-sm text-red-100/80">{error}</p>
                </div>
              </div>
              <button onClick={startCheckout} className="w-full rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold py-3">
                {tf("Try again", "دوباره تلاش کن")}
              </button>
            </div>
          )}

          {state === "success" ? (
            <div className="grid gap-3">
              <Link to="/app/vip-auto" className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-black py-3 text-center">
                {tf("Go to VIP Auto Trading", "رفتن به VIP Auto Trading")}
              </Link>
              <Link to="/app" className="w-full rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold py-3 text-center border border-white/10">
                {tf("Go to Dashboard", "رفتن به داشبورد")}
              </Link>
            </div>
          ) : (
            <button
              onClick={startCheckout}
              disabled={state === "loading" || state === "redirecting"}
              className="w-full rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-black py-3"
            >
              {tf("Continue to secure checkout", "ادامه به پرداخت امن")}
            </button>
          )}

          <div className="mt-5 flex items-start gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5" />
            <p>
              {tf(
                "Payments are processed by the checkout provider. VIP Auto Trading requires MT5 setup after purchase. Trading involves risk.",
                "پرداخت توسط سرویس پرداخت انجام می‌شود. VIP Auto Trading بعد از خرید نیاز به تنظیم MT5 دارد. معامله‌گری ریسک دارد."
              )}
            </p>
          </div>

          <div className="mt-4 text-center text-xs text-slate-500">
            {tf("By continuing, you agree to our", "با ادامه دادن، شما می‌پذیرید")} {" "}
            <Link to="/app/terms" className="text-yellow-300 hover:text-yellow-200 underline underline-offset-4">
              {tf("Terms of Service", "شرایط استفاده")}
            </Link>{" "}
            {tf("and", "و")} {" "}
            <Link to="/app/privacy" className="text-yellow-300 hover:text-yellow-200 underline underline-offset-4">
              {tf("Privacy Policy", "حریم خصوصی")}
            </Link>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
