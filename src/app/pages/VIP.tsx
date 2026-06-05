import { Crown, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SideMenu } from "../components/SideMenu";
import { AppHeader } from "../components/AppHeader";
import { getLanguage, tr, formatNumber } from "../utils/i18n";
import {
  appleProductIdForPlan,
  getAppleActiveEntitlements,
  isNativeIOSApp,
  restoreApplePurchases,
  startAppleIapPurchase,
} from "../utils/appleIap";
import { restoreApplePurchaseWithServer, syncApplePurchaseWithServer } from "../utils/api";

export function VIP() {
  const [showMenu, setShowMenu] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });
  const navigate = useNavigate();
  const lang = getLanguage();

  const t = (dict: Record<string, string>) => tr(lang, dict);


  type BillingCycle = "monthly" | "yearly" | "lifetime";
  type PlanId = "basic" | "pro" | "vip" | "lifetime";
  type PlanMeta = { id: PlanId; name: string; cycle: BillingCycle; rank: number };
  type AppleEntitlementItem = {
    productId: string;
    transactionId?: string;
    originalTransactionId?: string;
    purchaseDateMs?: number;
    expirationDateMs?: number | null;
    isUpgraded?: boolean;
    signedTransactionInfo?: string;
  };

  const PLAN_META_BY_PRODUCT_ID: Record<string, PlanMeta> = {
    basic_monthly_v4: { id: "basic", name: "BASIC", cycle: "monthly", rank: 1 },
    basic_yearly_v4: { id: "basic", name: "BASIC", cycle: "yearly", rank: 1 },
    pro_monthly_v4: { id: "pro", name: "PRO", cycle: "monthly", rank: 2 },
    pro_yearly_v4: { id: "pro", name: "PRO", cycle: "yearly", rank: 2 },
    vip_monthly_v4: { id: "vip", name: "VIP", cycle: "monthly", rank: 3 },
    vip_yearly_v4: { id: "vip", name: "VIP", cycle: "yearly", rank: 3 },
    vip_lifetime: { id: "lifetime", name: "LIFETIME", cycle: "lifetime", rank: 4 },
  };

  const productMeta = (productId?: string | null) => {
    const key = String(productId || "").trim();
    return PLAN_META_BY_PRODUCT_ID[key] || null;
  };

  const selectedPlanLabel = (planName: string, cycle: BillingCycle) => {
    if (cycle === "lifetime") return `${planName} Lifetime`;
    return `${planName} ${cycle === "monthly" ? "Monthly" : "Yearly"}`;
  };

  const applyServerBillingState = (payload: any) => {
    const appPlan = String(payload?.app_plan || payload?.user?.plan || payload?.plan || "").trim();
    const displayPlan = String(payload?.display_plan || payload?.plan || appPlan || "").trim();
    const productId = String(payload?.product_id || "").trim();
    const billing = String(payload?.billing || "").trim();
    const transactionId = String(payload?.transaction_id || "").trim();

    if (displayPlan) localStorage.setItem("userPlan", displayPlan.toUpperCase());
    if (appPlan) localStorage.setItem("serverPlan", appPlan);
    if (productId) localStorage.setItem("appleProductId", productId);
    if (billing) localStorage.setItem("appleBillingCycle", billing);
    if (transactionId) localStorage.setItem("appleTransactionId", transactionId);
    window.dispatchEvent(new Event("storage"));
  };

  const normalizeAppleEntitlementItems = (payload: any): AppleEntitlementItem[] => {
    const direct = Array.isArray(payload?.entitlements) ? payload.entitlements : [];
    if (direct.length > 0) {
      return direct
        .map((item: any) => ({
          productId: String(item?.productId || item?.productID || "").trim(),
          transactionId: String(item?.transactionId || item?.transactionID || "").trim(),
          originalTransactionId: String(item?.originalTransactionId || item?.originalTransactionID || "").trim(),
          purchaseDateMs: Number(item?.purchaseDateMs || 0) || 0,
          expirationDateMs: item?.expirationDateMs == null ? null : Number(item.expirationDateMs),
          isUpgraded: item?.isUpgraded === true,
          signedTransactionInfo: String(item?.signedTransactionInfo || "").trim(),
        }))
        .filter((item: AppleEntitlementItem) => !!item.productId && !item.isUpgraded);
    }

    const ids = [
      ...(Array.isArray(payload?.productIds) ? payload.productIds : []),
      ...(Array.isArray(payload?.subscriptions) ? payload.subscriptions : []),
      ...(Array.isArray(payload?.restored) ? payload.restored : []),
    ];
    return Array.from(new Set(ids.map((id: any) => String(id || "").trim()).filter(Boolean))).map((productId) => ({ productId }));
  };

  const isRecentApplePurchase = (purchaseDateMs?: number | null) => {
    const ts = Number(purchaseDateMs || 0);
    if (!Number.isFinite(ts) || ts <= 0) return true;
    return Math.abs(Date.now() - ts) <= 5 * 60 * 1000;
  };

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem("darkMode");
      setDarkMode(saved ? JSON.parse(saved) : true);
    };
    window.addEventListener("themeChange", handleThemeChange as EventListener);
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("themeChange", handleThemeChange as EventListener);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);


  const isAndroidInstalledApp = () => {
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as any).standalone === true;

    return isAndroid && isStandalone;
  };

  const isIOSInstalledApp = () => isNativeIOSApp();

  const checkoutPlanId = (planId: string) => {
    // Stripe / web checkout IDs used by Checkout.tsx
    if (planId === "vip") return "vip_auto";
    if (planId === "lifetime") return "lifetime";
    if (planId === "basic") return "basic";
    return "pro";
  };

  const GOOGLE_PLAY_PRODUCT_IDS: Record<string, Record<"monthly" | "yearly", string>> = {
    basic: { monthly: "basic_monthly", yearly: "basic_yearly" },
    pro: { monthly: "pro_monthly", yearly: "pro_yearly_v2" },
    vip: { monthly: "vip_monthly", yearly: "vip_yearly" },
    lifetime: { monthly: "vip_lifetime", yearly: "vip_lifetime" },
  };

  const googlePlayProductId = (planId: string, cycle: "monthly" | "yearly") => {
    // These IDs must match Google Play Console exactly.
    // PRO monthly must always call pro_monthly. If Google Play still shows yearly price,
    // the pro_monthly product/base-plan price is wrong inside Play Console.
    return GOOGLE_PLAY_PRODUCT_IDS[planId]?.[cycle] || "";
  };

  const googleBillingDebug = (title: string, details: Record<string, unknown> = {}) => {
    const lines = [
      `DEBUG: ${title}`,
      `url=${window.location.href}`,
      `ua=${navigator.userAgent}`,
      `standalone=${window.matchMedia?.("(display-mode: standalone)")?.matches ? "yes" : "no"}`,
      ...Object.entries(details).map(([key, value]) => `${key}=${String(value)}`),
    ];

    alert(lines.join("\n"));
  };

  const startGooglePlayBilling = async (plan: (typeof plans)[0]) => {
    const productId = googlePlayProductId(plan.id, billingCycle);

    if (!productId) {
      googleBillingDebug("NO_PRODUCT_ID", { plan: plan.id, billingCycle });
      return;
    }

    const w = window as any;

    if (!("getDigitalGoodsService" in w)) {
      googleBillingDebug("NO_DIGITAL_GOODS_SERVICE", {
        productId,
        reason: "Android/TWA billing bridge is not exposed. Check app/build.gradle billing dependency, DelegationService, Manifest service, and install from Play.",
      });
      return;
    }

    if (!("PaymentRequest" in w)) {
      googleBillingDebug("NO_PAYMENT_REQUEST", {
        productId,
        reason: "PaymentRequest API is not available.",
      });
      return;
    }

    let service: any;
    try {
      service = await w.getDigitalGoodsService("https://play.google.com/billing");
    } catch (e: any) {
      googleBillingDebug("GET_SERVICE_FAILED", {
        productId,
        errorName: e?.name || "",
        errorMessage: e?.message || String(e),
      });
      return;
    }

    let itemDetails: any[] = [];
    try {
      itemDetails = await service.getDetails([productId]);
    } catch (e: any) {
      googleBillingDebug("GET_DETAILS_FAILED", {
        productId,
        errorName: e?.name || "",
        errorMessage: e?.message || String(e),
      });
      return;
    }

    if (!itemDetails || itemDetails.length === 0) {
      googleBillingDebug("GET_DETAILS_EMPTY", {
        productId,
        reason: "Product is not found/active/synced for this tester, country, or app install.",
      });
      return;
    }

    let response: any;
    try {
      const request = new w.PaymentRequest(
        [
          {
            supportedMethods: "https://play.google.com/billing",
            data: { sku: productId },
          },
        ],
        {
          total: {
            label: itemDetails[0]?.title || productId,
            amount: {
              currency: "USD",
              value: "0",
            },
          },
        }
      );

      response = await request.show();
    } catch (e: any) {
      const errorName = e?.name || "";
      const errorMessage = e?.message || String(e);

      // User cancelled/closed the Google Play purchase sheet.
      // This is normal; do not show an error alert.
      if (
        errorName === "AbortError" ||
        errorMessage.includes("RESULT_CANCELED") ||
        errorMessage.toLowerCase().includes("cancel")
      ) {
        return;
      }

      googleBillingDebug("PAYMENT_REQUEST_FAILED", {
        productId,
        title: itemDetails[0]?.title || "",
        errorName,
        errorMessage,
      });
      return;
    }

    try {
      await response.complete("success");
    } catch (e) {
      // Do not block entitlement flow for response.complete edge cases.
    }

    localStorage.setItem("userPlan", plan.name);
    localStorage.setItem("googlePlayProductId", productId);
    alert(subscribedMessage(plan.name));
    navigate("/app");
  };

  const startAppleInAppPurchase = async (plan: (typeof plans)[0]) => {
    const appleCycle: BillingCycle = plan.id === "lifetime" ? "lifetime" : billingCycle;
    const productId = appleProductIdForPlan(plan.id, appleCycle);

    if (!productId) {
      alert("Apple product id is missing for this plan.");
      return;
    }

    const expectedMeta = productMeta(productId);
    if (!expectedMeta) {
      alert("Apple product id is not mapped in the app.");
      return;
    }

    try {
      const result = await startAppleIapPurchase(productId);
      if (!result?.ok) {
        if (result?.reason === "user_cancelled") return;
        if (result?.reason === "pending") {
          alert("Apple purchase is pending approval. Your plan will activate after Apple confirms it.");
          return;
        }
        throw new Error(result?.message || result?.error || "Apple purchase failed");
      }

      const purchasedProductId = String(result.productId || "").trim();
      if (purchasedProductId !== productId) {
        alert(`Apple confirmed ${purchasedProductId || "another product"}, not ${productId}. Your plan was not changed.`);
        return;
      }

      if (!isRecentApplePurchase(result.purchaseDateMs)) {
        alert("Apple returned an older purchase record. Your plan was not changed. Please use Restore Purchases.");
        return;
      }

      const server = await syncApplePurchaseWithServer({
        source: "purchase",
        productId,
        transactionId: result.transactionId || "",
        originalTransactionId: result.originalTransactionId || "",
        purchaseDateMs: result.purchaseDateMs || Date.now(),
        expirationDateMs: result.expirationDateMs ?? null,
        signedTransactionInfo: result.signedTransactionInfo || "",
      });

      if (!server?.ok) {
        throw new Error(server?.message || "Apple purchase was not accepted by BEX billing server.");
      }

      applyServerBillingState(server);
      alert(subscribedMessage(selectedPlanLabel(expectedMeta.name, expectedMeta.cycle)));
      navigate("/app");
    } catch (e: any) {
      const rawMessage = String(e?.message || e?.error || e || "");
      const isProductConfigIssue =
        rawMessage.toLowerCase().includes("product not found") ||
        rawMessage.toLowerCase().includes("products not found") ||
        rawMessage.toLowerCase().includes("not found");

      if (isProductConfigIssue) {
        alert(
          "Apple subscriptions are not available yet for this build. Please check App Store Connect product IDs and subscription group."
        );
        return;
      }

      alert(`Apple purchase could not be completed. ${rawMessage || "Please try again."}`);
    }
  };

  const handleRestoreApplePurchases = async () => {
    try {
      const restored = await restoreApplePurchases();
      if (!restored?.ok) throw new Error((restored as any)?.message || (restored as any)?.error || "Restore failed");

      const active = await getAppleActiveEntitlements();
      const entitlements = [
        ...normalizeAppleEntitlementItems(active),
        ...normalizeAppleEntitlementItems(restored),
      ];

      if (!entitlements.length) {
        alert("No active Apple purchase was found for this Apple ID.");
        return;
      }

      const server = await restoreApplePurchaseWithServer({ entitlements });
      if (!server?.ok) {
        throw new Error(server?.message || "Restore was not accepted by BEX billing server.");
      }

      applyServerBillingState(server);
      alert(subscribedMessage(server.display_plan || server.plan || "Apple"));
      navigate("/app");
    } catch (e: any) {
      const rawMessage = String(e?.message || e?.error || e || "");
      alert(`Restore purchases could not be completed. ${rawMessage || "Please try again."}`);
    }
  };

  const startPlanCheckout = async (plan: (typeof plans)[0]) => {
    if (isAndroidInstalledApp()) {
      await startGooglePlayBilling(plan);
      return;
    }

    const checkoutBilling = plan.id === "lifetime" ? "lifetime" : billingCycle;

    if (isIOSInstalledApp()) {
      await startAppleInAppPurchase(plan);
      return;
    }

    // Web/Desktop/normal browser: Stripe checkout.
    navigate(`/app/checkout?platform=web&plan=${checkoutPlanId(plan.id)}&billing=${checkoutBilling}`);
  };

  const plans = [
    {
      id: "basic",
      name: "BASIC",
      icon: "🟢",
      monthlyPrice: 9.99,
      yearlyPrice: 79,
      color: "from-gray-600 to-gray-700",
      borderColor: "border-gray-600/30",
      features: [
        t({ en: "Limited signals (1-2 per day)", fa: "سیگنال محدود (۱ تا ۲ عدد در روز)", ar: "إشارات محدودة (1-2 يوميًا)", es: "Señales limitadas (1-2 por día)", "pt-BR": "Sinais limitados (1-2 por dia)", hi: "सीमित सिग्नल (दिन में 1-2)", tr: "Sınırlı sinyal (günde 1-2)", de: "Begrenzte Signale (1-2 pro Tag)", fr: "Signaux limités (1-2 par jour)", zh: "有限信号（每天1-2个）", ko: "제한된 신호 (하루 1-2개)" }),
        t({ en: "Basic market analysis", fa: "تحلیل پایه بازار", ar: "تحليل أساسي للسوق", es: "Análisis básico del mercado", "pt-BR": "Análise básica de mercado", hi: "बेसिक मार्केट विश्लेषण", tr: "Temel piyasa analizi", de: "Einfache Marktanalyse", fr: "Analyse de marché basique", zh: "基础市场分析", ko: "기본 시장 분석" }),
        t({ en: "Delayed notifications", fa: "اعلان‌های با تأخیر", ar: "إشعارات متأخرة", es: "Notificaciones con retraso", "pt-BR": "Notificações com atraso", hi: "देरी से नोटिफिकेशन", tr: "Gecikmeli bildirimler", de: "Verzögerte Benachrichtigungen", fr: "Notifications différées", zh: "延迟通知", ko: "지연 알림" }),
        t({ en: "Limited AI insights", fa: "تحلیل محدود هوش مصنوعی", ar: "رؤى ذكاء اصطناعي محدودة", es: "Información limitada de IA", "pt-BR": "Insights limitados de IA", hi: "सीमित AI इनसाइट", tr: "Sınırlı yapay zekâ içgörüleri", de: "Begrenzte KI-Einblicke", fr: "Aperçus IA limités", zh: "有限AI洞察", ko: "제한된 AI 인사이트" }),
        t({ en: "No advanced tools", fa: "بدون ابزارهای پیشرفته", ar: "بدون أدوات متقدمة", es: "Sin herramientas avanzadas", "pt-BR": "Sem ferramentas avançadas", hi: "कोई एडवांस टूल नहीं", tr: "Gelişmiş araç yok", de: "Keine erweiterten Tools", fr: "Pas d’outils avancés", zh: "无高级工具", ko: "고급 도구 없음" }),
        t({ en: "No performance tracking", fa: "بدون پیگیری عملکرد", ar: "بدون تتبع الأداء", es: "Sin seguimiento de rendimiento", "pt-BR": "Sem acompanhamento de desempenho", hi: "कोई प्रदर्शन ट्रैकिंग नहीं", tr: "Performans takibi yok", de: "Keine Performance-Verfolgung", fr: "Pas de suivi des performances", zh: "无表现追踪", ko: "성과 추적 없음" }),
      ],
      highlight: false,
    },
    {
      id: "pro",
      name: "PRO",
      icon: "⭐",
      monthlyPrice: 29,
      yearlyPrice: 249,
      color: "from-blue-600 to-blue-700",
      borderColor: "border-blue-500/40",
      features: [
        t({ en: "Full real-time trading signals", fa: "سیگنال‌های کامل و لحظه‌ای", ar: "إشارات تداول كاملة وفورية", es: "Señales de trading completas en tiempo real", "pt-BR": "Sinais completos de trading em tempo real", hi: "पूर्ण रियल-टाइम ट्रेडिंग सिग्नल", tr: "Tam gerçek zamanlı işlem sinyalleri", de: "Vollständige Echtzeit-Trading-Signale", fr: "Signaux de trading complets en temps réel", zh: "完整实时交易信号", ko: "전체 실시간 트레이딩 신호" }),
        t({ en: "AI-powered market analysis", fa: "تحلیل بازار با هوش مصنوعی", ar: "تحليل السوق بالذكاء الاصطناعي", es: "Análisis de mercado con IA", "pt-BR": "Análise de mercado com IA", hi: "AI आधारित मार्केट विश्लेषण", tr: "Yapay zekâ destekli piyasa analizi", de: "KI-gestützte Marktanalyse", fr: "Analyse de marché propulsée par l’IA", zh: "AI驱动的市场分析", ko: "AI 기반 시장 분석" }),
        t({ en: "Real-time notifications", fa: "اعلان‌های لحظه‌ای", ar: "إشعارات فورية", es: "Notificaciones en tiempo real", "pt-BR": "Notificações em tempo real", hi: "रियल-टाइम नोटिफिकेशन", tr: "Gerçek zamanlı bildirimler", de: "Echtzeit-Benachrichtigungen", fr: "Notifications en temps réel", zh: "实时通知", ko: "실시간 알림" }),
        t({ en: "Entry / SL / TP + full context", fa: "ورود / حد ضرر / حد سود + توضیح کامل", ar: "دخول / وقف خسارة / هدف + سياق كامل", es: "Entrada / SL / TP + contexto completo", "pt-BR": "Entrada / SL / TP + contexto completo", hi: "Entry / SL / TP + पूरा संदर्भ", tr: "Giriş / SL / TP + tam bağlam", de: "Einstieg / SL / TP + voller Kontext", fr: "Entrée / SL / TP + contexte complet", zh: "入场 / 止损 / 止盈 + 完整背景", ko: "진입 / SL / TP + 전체 컨텍스트" }),
        t({ en: "Basic performance tracking", fa: "پیگیری پایه عملکرد", ar: "تتبع أداء أساسي", es: "Seguimiento básico del rendimiento", "pt-BR": "Acompanhamento básico de desempenho", hi: "बेसिक प्रदर्शन ट्रैकिंग", tr: "Temel performans takibi", de: "Einfache Performance-Verfolgung", fr: "Suivi basique des performances", zh: "基础表现追踪", ko: "기본 성과 추적" }),
        t({ en: "Market board + AI context", fa: "تابلوی بازار + تحلیل هوش مصنوعی", ar: "لوحة السوق + سياق الذكاء الاصطناعي", es: "Panel de mercado + contexto IA", "pt-BR": "Painel de mercado + contexto de IA", hi: "मार्केट बोर्ड + AI संदर्भ", tr: "Piyasa paneli + AI bağlamı", de: "Market Board + KI-Kontext", fr: "Tableau de marché + contexte IA", zh: "市场面板 + AI背景", ko: "시장 보드 + AI 컨텍스트" }),
        t({ en: "Copy trade feature", fa: "قابلیت کپی سیگنال", ar: "ميزة نسخ الصفقة", es: "Función de copiar señal", "pt-BR": "Recurso de copiar sinal", hi: "कॉपी ट्रेड फीचर", tr: "Sinyal kopyalama özelliği", de: "Copy-Trade-Funktion", fr: "Fonction copie de signal", zh: "复制交易功能", ko: "카피 트레이드 기능" }),
      ],
      highlight: true,
    },
    {
      id: "vip",
      name: "VIP",
      icon: "👑",
      monthlyPrice: 49,
      yearlyPrice: 399,
      color: "from-yellow-600 to-orange-600",
      borderColor: "border-yellow-500/40",
      features: [
        t({ en: "Everything in PRO", fa: "همه امکانات PRO", ar: "كل ميزات PRO", es: "Todo lo de PRO", "pt-BR": "Tudo do PRO", hi: "PRO की सभी सुविधाएँ", tr: "PRO’daki her şey", de: "Alles aus PRO", fr: "Tout ce qui est dans PRO", zh: "包含PRO全部功能", ko: "PRO의 모든 기능" }),
        t({ en: "Priority signal access", fa: "دسترسی اولویت‌دار به سیگنال", ar: "وصول أولوية للإشارات", es: "Acceso prioritario a señales", "pt-BR": "Acesso prioritário aos sinais", hi: "प्राथमिकता सिग्नल एक्सेस", tr: "Öncelikli sinyal erişimi", de: "Priorisierter Signalzugang", fr: "Accès prioritaire aux signaux", zh: "优先信号访问", ko: "우선 신호 접근" }),
        t({ en: "Advanced chart tools", fa: "ابزارهای پیشرفته چارت", ar: "أدوات رسم بياني متقدمة", es: "Herramientas avanzadas de gráfico", "pt-BR": "Ferramentas avançadas de gráfico", hi: "एडवांस चार्ट टूल", tr: "Gelişmiş grafik araçları", de: "Erweiterte Chart-Tools", fr: "Outils graphiques avancés", zh: "高级图表工具", ko: "고급 차트 도구" }),
        t({ en: "Priority execution insights", fa: "تحلیل اولویت‌دار اجرای معامله", ar: "رؤى تنفيذ ذات أولوية", es: "Insights prioritarios de ejecución", "pt-BR": "Insights prioritários de execução", hi: "प्राथमिकता निष्पादन इनसाइट", tr: "Öncelikli işlem yürütme içgörüleri", de: "Priorisierte Ausführungs-Einblicke", fr: "Aperçus prioritaires d’exécution", zh: "优先执行洞察", ko: "우선 실행 인사이트" }),
        t({ en: "Full performance analytics", fa: "آنالیز کامل عملکرد", ar: "تحليلات أداء كاملة", es: "Analíticas completas de rendimiento", "pt-BR": "Análises completas de desempenho", hi: "पूर्ण प्रदर्शन एनालिटिक्स", tr: "Tam performans analitiği", de: "Vollständige Performance-Analysen", fr: "Analyses complètes des performances", zh: "完整表现分析", ko: "전체 성과 분석" }),
        t({ en: "Risk management tools", fa: "ابزارهای مدیریت ریسک", ar: "أدوات إدارة المخاطر", es: "Herramientas de gestión de riesgo", "pt-BR": "Ferramentas de gestão de risco", hi: "जोखिम प्रबंधन टूल", tr: "Risk yönetimi araçları", de: "Risikomanagement-Tools", fr: "Outils de gestion du risque", zh: "风险管理工具", ko: "리스크 관리 도구" }),
        t({ en: "Exclusive market insights", fa: "دیدگاه‌های اختصاصی بازار", ar: "رؤى سوق حصرية", es: "Insights exclusivos del mercado", "pt-BR": "Insights exclusivos de mercado", hi: "विशेष मार्केट इनसाइट", tr: "Özel piyasa içgörüleri", de: "Exklusive Markteinblicke", fr: "Aperçus exclusifs du marché", zh: "独家市场洞察", ko: "독점 시장 인사이트" }),
        t({ en: "1-on-1 consultation", fa: "مشاوره اختصاصی یک‌به‌یک", ar: "استشارة فردية", es: "Consulta 1 a 1", "pt-BR": "Consultoria 1 a 1", hi: "1-ऑन-1 सलाह", tr: "Bire bir danışmanlık", de: "1-zu-1 Beratung", fr: "Consultation individuelle", zh: "一对一咨询", ko: "1:1 상담" }),
      ],
      highlight: false,
    },

    {
      id: "lifetime",
      name: "LIFETIME",
      icon: "💎",
      monthlyPrice: 799,
      yearlyPrice: 799,
      oneTimePrice: 799,
      color: "from-purple-700 to-fuchsia-700",
      borderColor: "border-purple-400/40",
      features: [
        t({ en: "One-time lifetime access", fa: "دسترسی مادام‌العمر با یک پرداخت", ar: "وصول مدى الحياة بدفعة واحدة", es: "Acceso de por vida con un pago único", "pt-BR": "Acesso vitalício com pagamento único", hi: "एक बार भुगतान, लाइफटाइम एक्सेस", tr: "Tek ödeme ile ömür boyu erişim", de: "Lebenslanger Zugriff mit Einmalzahlung", fr: "Accès à vie avec paiement unique", zh: "一次性付款，终身访问", ko: "일회 결제로 평생 이용" }),
        t({ en: "Everything in VIP", fa: "همه امکانات VIP", ar: "كل ميزات VIP", es: "Todo lo de VIP", "pt-BR": "Tudo do VIP", hi: "VIP की सभी सुविधाएँ", tr: "VIP’deki her şey", de: "Alles aus VIP", fr: "Tout ce qui est dans VIP", zh: "包含VIP全部功能", ko: "VIP의 모든 기능" }),
        t({ en: "No monthly subscription", fa: "بدون پرداخت ماهانه", ar: "بدون اشتراك شهري", es: "Sin suscripción mensual", "pt-BR": "Sem assinatura mensal", hi: "कोई मासिक सदस्यता नहीं", tr: "Aylık abonelik yok", de: "Kein Monatsabo", fr: "Pas d’abonnement mensuel", zh: "无月度订阅", ko: "월 구독 없음" }),
        t({ en: "Priority lifetime member access", fa: "دسترسی اولویت‌دار عضو مادام‌العمر", ar: "وصول أولوية لعضو مدى الحياة", es: "Acceso prioritario para miembro lifetime", "pt-BR": "Acesso prioritário vitalício", hi: "लाइफटाइम मेंबर प्राथमिकता एक्सेस", tr: "Ömür boyu üye öncelikli erişim", de: "Priorisierter Lifetime-Zugang", fr: "Accès prioritaire membre à vie", zh: "终身会员优先访问", ko: "평생 회원 우선 접근" }),
        t({ en: "Future VIP upgrades included", fa: "آپدیت‌های آینده VIP شامل می‌شود", ar: "تشمل ترقيات VIP المستقبلية", es: "Incluye futuras mejoras VIP", "pt-BR": "Inclui futuros upgrades VIP", hi: "भविष्य के VIP अपग्रेड शामिल", tr: "Gelecekteki VIP yükseltmeleri dahil", de: "Künftige VIP-Upgrades inklusive", fr: "Mises à niveau VIP futures incluses", zh: "包含未来VIP升级", ko: "향후 VIP 업그레이드 포함" }),
      ],
      highlight: false,
    },
  ];

  const getSavings = (plan: (typeof plans)[0]) => {
    const monthlyTotal = plan.monthlyPrice * 12;
    const savings = ((monthlyTotal - plan.yearlyPrice) / monthlyTotal) * 100;
    return Math.round(savings);
  };

  const subscribedMessage = (planName: string) =>
    t({
      en: `Successfully subscribed to ${planName} plan!`,
      fa: `اشتراک پلن ${planName} با موفقیت فعال شد!`,
      ar: `تم الاشتراك في خطة ${planName} بنجاح!`,
      es: `¡Te suscribiste al plan ${planName} con éxito!`,
      "pt-BR": `Assinatura do plano ${planName} ativada com sucesso!`,
      hi: `${planName} प्लान सफलतापूर्वक सक्रिय हो गया!`,
      tr: `${planName} planı başarıyla etkinleştirildi!`,
      de: `${planName}-Plan erfolgreich aktiviert!`,
      fr: `Abonnement au plan ${planName} activé avec succès !`,
      zh: `${planName} 套餐已成功激活！`,
      ko: `${planName} 플랜이 성공적으로 활성화되었습니다!`,
    });

  return (
    <div className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden ${darkMode ? "bg-[#050812] text-white" : "bg-[#f6f4ee] text-gray-950"} pb-24`}>
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />
<AppHeader
        title="VIP"
        subtitle="Plans"
        darkMode={darkMode}
        onMenuClick={() => setShowMenu(true)}
        onToggleDark={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("darkMode", JSON.stringify(next)); window.dispatchEvent(new Event("themeChange")); }}
        showSettings={true}
        showThemeToggle={true}
      />

      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <div className={`${darkMode ? "border-yellow-500/20 bg-gradient-to-br from-[#111a2a]/95 via-[#08101c]/95 to-[#050812]/95 shadow-[0_0_45px_rgba(234,179,8,0.08)]" : "border-yellow-500/20 bg-white/90 shadow-xl"} relative overflow-hidden rounded-[1.65rem] border p-5 backdrop-blur-md`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(59,130,246,0.12),transparent_26%)]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border border-yellow-400/20 bg-yellow-400/5 blur-sm" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]" /> BEX AI DESK
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">VIP Auto Desk</h2>
              <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} mt-1 text-sm`}>Premium automation, priority signals and execution access</p>
            </div>
            <div className="hidden rounded-2xl border border-yellow-500/20 bg-black/20 px-4 py-3 text-right sm:block">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">BEX MODE</p>
              <p className="mt-1 text-lg font-black text-yellow-400">LUXURY</p>
            </div>
          </div>
        </div>
      </div>


      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <div className={`flex items-center justify-center gap-3 ${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-2xl p-2 border`}>
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              billingCycle === "monthly" ? "bg-yellow-500 text-black shadow-lg" : "text-gray-400"
            }`}
          >
            {t({ en: "Monthly", fa: "ماهانه", ar: "شهري", es: "Mensual", "pt-BR": "Mensal", hi: "मासिक", tr: "Aylık", de: "Monatlich", fr: "Mensuel", zh: "月付", ko: "월간" })}
          </button>

          <button
            onClick={() => setBillingCycle("yearly")}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${
              billingCycle === "yearly" ? "bg-yellow-500 text-black shadow-lg" : "text-gray-400"
            }`}
          >
            {t({ en: "Yearly (Save up to 30%)", fa: "سالانه (تا ۳۰٪ صرفه‌جویی)", ar: "سنوي (وفر حتى 30%)", es: "Anual (ahorra hasta 30%)", "pt-BR": "Anual (economize até 30%)", hi: "वार्षिक (30% तक बचत)", tr: "Yıllık (%30’a kadar tasarruf)", de: "Jährlich (bis zu 30% sparen)", fr: "Annuel (économisez jusqu’à 30 %)", zh: "年付（最多节省30%）", ko: "연간 (최대 30% 절약)" })}
          </button>
        </div>

        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-gradient-to-br ${plan.color} rounded-2xl p-6 border ${plan.borderColor} ${
              plan.highlight ? "shadow-xl shadow-blue-500/20 ring-2 ring-blue-400" : "shadow-lg"
            }`}
          >
            {plan.highlight && (
              <div className="bg-blue-400 text-black text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                {t({ en: "RECOMMENDED", fa: "پیشنهادی", ar: "موصى به", es: "RECOMENDADO", "pt-BR": "RECOMENDADO", hi: "अनुशंसित", tr: "ÖNERİLEN", de: "EMPFOHLEN", fr: "RECOMMANDÉ", zh: "推荐", ko: "추천" })}
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">{plan.icon}</span>
              <h2 className="text-2xl font-bold">{plan.name}</h2>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">
                  ${plan.id === "lifetime" ? (plan as any).oneTimePrice ?? plan.yearlyPrice : billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                </span>
                <span className="text-xl opacity-90">{plan.id === "lifetime"
                    ? t({ en: " one-time", fa: " یک‌بار پرداخت", ar: " دفعة واحدة", es: " pago único", "pt-BR": " pagamento único", hi: " एक बार", tr: " tek ödeme", de: " einmalig", fr: " paiement unique", zh: " 一次性", ko: " 일회성" })
                    : `/${billingCycle === "monthly" ? t({ en: "month", fa: "ماه", ar: "شهر", es: "mes", "pt-BR": "mês", hi: "माह", tr: "ay", de: "Monat", fr: "mois", zh: "月", ko: "월" }) : t({ en: "year", fa: "سال", ar: "سنة", es: "año", "pt-BR": "ano", hi: "साल", tr: "yıl", de: "Jahr", fr: "an", zh: "年", ko: "년" })}`}</span>
              </div>

              {billingCycle === "yearly" && plan.id !== "lifetime" && (
                <p className="text-sm opacity-90 mt-1">
                  {t({ en: "Save", fa: "صرفه‌جویی", ar: "وفر", es: "Ahorra", "pt-BR": "Economize", hi: "बचत", tr: "Tasarruf", de: "Spare", fr: "Économisez", zh: "节省", ko: "절약" })} {formatNumber(getSavings(plan), lang)}% {t({ en: "with annual billing", fa: "با پرداخت سالانه", ar: "مع الدفع السنوي", es: "con facturación anual", "pt-BR": "com pagamento anual", hi: "वार्षिक बिलिंग के साथ", tr: "yıllık ödeme ile", de: "bei jährlicher Zahlung", fr: "avec la facturation annuelle", zh: "通过年付", ko: "연간 결제로" })}
                </p>
              )}
            </div>

            <div className="space-y-3 mb-6">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="bg-white/20 rounded-full p-1 mt-0.5 flex-shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-white">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => startPlanCheckout(plan)}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                plan.name === "PRO"
                  ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white shadow-lg"
                  : plan.name === "VIP"
                  ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/20"
                  : plan.name === "LIFETIME"
                  ? "bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/20"
                  : "bg-white/10 text-white border border-white/20"
              }`}
            >
              {plan.id === "basic"
                ? t({ en: "Subscribe Basic", fa: "خرید Basic", ar: "اشترك في Basic", es: "Suscribirse a Basic", "pt-BR": "Assinar Basic", hi: "Basic सब्सक्राइब करें", tr: "Basic aboneliği", de: "Basic abonnieren", fr: "S’abonner à Basic", zh: "订阅Basic", ko: "Basic 구독" })
                : plan.id === "lifetime"
                ? t({ en: "Buy Lifetime", fa: "خرید مادام‌العمر", ar: "شراء مدى الحياة", es: "Comprar Lifetime", "pt-BR": "Comprar Vitalício", hi: "लाइफटाइम खरीदें", tr: "Lifetime satın al", de: "Lifetime kaufen", fr: "Acheter Lifetime", zh: "购买终身版", ko: "라이프타임 구매" })
                : t({ en: "Upgrade Now", fa: "ارتقا بده", ar: "قم بالترقية الآن", es: "Actualizar ahora", "pt-BR": "Fazer upgrade agora", hi: "अभी अपग्रेड करें", tr: "Şimdi yükselt", de: "Jetzt upgraden", fr: "Mettre à niveau", zh: "立即升级", ko: "지금 업그레이드" })}
            </button>
          </div>
        ))}

        <div className={`${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-[1.35rem] p-5 border backdrop-blur-md`}>
          <h3 className="text-yellow-400 text-sm font-bold mb-4">💎 {t({ en: "Why Subscribe?", fa: "چرا اشتراک بگیریم؟", ar: "لماذا الاشتراك؟", es: "¿Por qué suscribirse?", "pt-BR": "Por que assinar?", hi: "सब्सक्राइब क्यों करें?", tr: "Neden abone olmalı?", de: "Warum abonnieren?", fr: "Pourquoi s’abonner ?", zh: "为什么订阅？", ko: "왜 구독해야 하나요?" })}</h3>
          <div className={`space-y-3 text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            <p>• {t({ en: "Get access to institutional-grade trading signals powered by AI", fa: "به سیگنال‌های معاملاتی سطح حرفه‌ای با هوش مصنوعی دسترسی بگیر", ar: "احصل على إشارات تداول احترافية مدعومة بالذكاء الاصطناعي", es: "Accede a señales de trading de nivel institucional impulsadas por IA", "pt-BR": "Tenha acesso a sinais de trading de nível institucional com IA", hi: "AI द्वारा संचालित प्रोफेशनल स्तर के ट्रेडिंग सिग्नल पाएं", tr: "Yapay zekâ destekli kurumsal düzey işlem sinyallerine eriş", de: "Erhalte Zugang zu institutionellen Trading-Signalen mit KI", fr: "Accédez à des signaux de trading de niveau institutionnel propulsés par l’IA", zh: "获取AI驱动的机构级交易信号", ko: "AI 기반 기관급 트레이딩 신호에 접근하세요" })}</p>
            <p>• {t({ en: "Receive real-time alerts before major market moves", fa: "قبل از حرکت‌های مهم بازار هشدار لحظه‌ای بگیر", ar: "استلم تنبيهات فورية قبل تحركات السوق المهمة", es: "Recibe alertas en tiempo real antes de grandes movimientos del mercado", "pt-BR": "Receba alertas em tempo real antes de grandes movimentos do mercado", hi: "बड़े मार्केट मूव से पहले रियल-टाइम अलर्ट पाएं", tr: "Büyük piyasa hareketlerinden önce gerçek zamanlı uyarılar al", de: "Erhalte Echtzeit-Alarme vor großen Marktbewegungen", fr: "Recevez des alertes en temps réel avant les grands mouvements du marché", zh: "在重大市场波动前接收实时提醒", ko: "주요 시장 움직임 전에 실시간 알림을 받으세요" })}</p>
            <p>• {t({ en: "Join exclusive community of professional traders", fa: "به جامعه اختصاصی معامله‌گران حرفه‌ای بپیوند", ar: "انضم إلى مجتمع حصري من المتداولين المحترفين", es: "Únete a una comunidad exclusiva de traders profesionales", "pt-BR": "Entre para uma comunidade exclusiva de traders profissionais", hi: "प्रोफेशनल ट्रेडर्स की विशेष कम्युनिटी से जुड़ें", tr: "Profesyonel trader’lardan oluşan özel topluluğa katıl", de: "Tritt einer exklusiven Community professioneller Trader bei", fr: "Rejoignez une communauté exclusive de traders professionnels", zh: "加入专业交易者专属社区", ko: "전문 트레이더 전용 커뮤니티에 참여하세요" })}</p>
            <p>• {t({ en: "Learn from expert analysis and market breakdowns", fa: "از تحلیل تخصصی و بررسی کامل بازار یاد بگیر", ar: "تعلم من التحليلات المتخصصة وتفصيلات السوق", es: "Aprende con análisis expertos y desgloses del mercado", "pt-BR": "Aprenda com análises especializadas e explicações do mercado", hi: "विशेषज्ञ विश्लेषण और मार्केट ब्रेकडाउन से सीखें", tr: "Uzman analizleri ve piyasa açıklamalarından öğren", de: "Lerne aus Expertenanalysen und Marktaufschlüsselungen", fr: "Apprenez grâce aux analyses d’experts et aux décryptages du marché", zh: "通过专家分析和市场拆解学习", ko: "전문가 분석과 시장 해설에서 배우세요" })}</p>
          </div>
        </div>

        <div className="pb-4" />
      </div>
    </div>
  );
}
