import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImage from "../../assets/bex-brand-logo.png";
import { LANGUAGE_OPTIONS, tr } from "../utils/i18n";
import { useLangState } from "../store/useLang";
import { enableBexPushNotifications, registerBexServiceWorker } from "../utils/push";
import { getCurrentUser } from "../utils/api";

async function hasActiveBexSession() {
  const result = await getCurrentUser();
  return !!result?.ok && !!result?.user;
}

export function Welcome() {
  const navigate = useNavigate();
  const { lang, setLang } = useLangState();
  const [notificationStatus, setNotificationStatus] = useState<string>("");

  const goNext = () => navigate("/age-verification");

  useEffect(() => {
    let alive = true;
    hasActiveBexSession().then((ok) => {
      if (alive && ok) navigate("/app", { replace: true });
    });
    return () => {
      alive = false;
    };
  }, [navigate]);

  const handleAllowNotifications = async () => {
    setNotificationStatus(tr(lang, "Activating notifications...", "در حال فعال‌سازی اعلان‌ها...", "جارٍ تفعيل الإشعارات..."));
    try {
      await registerBexServiceWorker();
      const result = await enableBexPushNotifications();

      if (result.ok) {
        setNotificationStatus(tr(lang, "Notifications activated successfully", "اعلان‌ها با موفقیت فعال شد", "تم تفعيل الإشعارات بنجاح"));
      } else {
        setNotificationStatus(tr(lang, "Notification setup failed. Check browser permission.", "فعال‌سازی اعلان ناموفق بود. اجازه مرورگر را چک کن.", "فشل تفعيل الإشعارات. تحقق من إذن المتصفح."));
        console.warn("BEX push enable failed:", result.reason);
      }
    } catch (error) {
      console.error("Notification permission request failed:", error);
      setNotificationStatus(tr(lang, "Notification setup failed", "فعال‌سازی اعلان ناموفق بود", "فشل تفعيل الإشعارات"));
    } finally {
      window.setTimeout(goNext, 700);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_28%),linear-gradient(180deg,#050812_0%,#08101c_45%,#02040a_100%)] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-end">
          <div className="w-full max-w-[220px] text-left">
            <label className="mb-2 block text-xs font-semibold tracking-wider text-gray-400">
              {tr(lang, "Language", "زبان", "اللغة")}
            </label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full rounded-2xl border border-gray-700 bg-[#0b1220]/90 px-4 py-3 text-sm text-white outline-none"
            >
              {LANGUAGE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-8">
          <img src={logoImage} alt="BEX" className="mx-auto h-[116px] w-[210px] object-contain object-center" />
        </div>

        <h1 className="text-3xl font-bold mb-4">{tr(lang, "Stay Updated", "به‌روز بمان", "ابقَ على اطلاع")}</h1>
        <p className="text-gray-300 mb-2">
          {tr(lang, "Get instant notifications for premium trading signals and market alerts", "اعلان فوری برای سیگنال‌های ویژه و هشدارهای بازار دریافت کن", "احصل على إشعارات فورية لإشارات التداول المميزة وتنبيهات السوق")}
        </p>
        <p className="text-sm text-gray-400 mb-8">
          {tr(lang, "Never miss important trading opportunities", "هیچ فرصت مهم معاملاتی را از دست نده", "لا تفوّت فرص التداول المهمة")}
        </p>

        <div className="space-y-4">
          <button onClick={handleAllowNotifications} className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/40 transition-all">
            {tr(lang, "Allow Notifications", "اجازه اعلان‌ها", "السماح بالإشعارات")}
          </button>
          {notificationStatus ? <p className="text-xs text-yellow-300">{notificationStatus}</p> : null}
          <button onClick={goNext} className="w-full text-gray-400 py-3 rounded-xl font-medium hover:text-white transition-colors">
            {tr(lang, "Skip for now", "فعلاً رد کن", "تخطي الآن")}
          </button>
        </div>

        <div className="mt-8 space-y-3 text-left bg-[#0b1220]/90 rounded-[1.35rem] p-5 border backdrop-blur-md border-yellow-500/20">
          <p className="text-xs text-yellow-400 font-bold tracking-widest mb-3">
            {tr(lang, {
              en: "📬 YOU'LL RECEIVE:",
              fa: "📬 دریافت می‌کنی:",
              ar: "📬 ستتلقى:",
              es: "📬 RECIBIRÁS:",
              "pt-BR": "📬 VOCÊ RECEBERÁ:",
              hi: "📬 आपको मिलेगा:",
              tr: "📬 ALACAKSINIZ:",
              de: "📬 DU ERHÄLTST:",
              fr: "📬 VOUS RECEVREZ :",
              zh: "📬 你将收到：",
              ko: "📬 받게 됩니다:",
            })}
          </p>
          <div className="flex items-start gap-3"><span className="text-green-400">✓</span><p className="text-sm text-gray-300">{tr(lang, "Real-time trading signals", "سیگنال‌های لحظه‌ای", "إشارات تداول لحظية")}</p></div>
          <div className="flex items-start gap-3"><span className="text-green-400">✓</span><p className="text-sm text-gray-300">{tr(lang, "Market movement alerts", "هشدارهای حرکت بازار", "تنبيهات حركة السوق")}</p></div>
          <div className="flex items-start gap-3"><span className="text-green-400">✓</span><p className="text-sm text-gray-300">{tr(lang, "AI analysis updates", "به‌روزرسانی تحلیل هوش مصنوعی", "تحديثات تحليل الذكاء الاصطناعي")}</p></div>
        </div>
      </div>
    </div>
  );
}
