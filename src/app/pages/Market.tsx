import { TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { SideMenu } from "../components/SideMenu";
import { BottomNav } from "../components/BottomNav";
import { AppHeader } from "../components/AppHeader";
import { fetchDashboard, PricesResponse } from "../utils/api";
import {
  formatNumber,
  getLanguage,
  tr,
  translateBias,
  translateMarketPhase,
  translateNews,
  translateRisk,
} from "../utils/i18n";

type MarketContext = {
  session: string;
  volatility: string;
  bias: string;
  marketPhase: string;
  liquidityRisk: string;
  news: string;
};

const MARKET_CACHE_KEY = "bex_market_cache_v1";
const MARKET_REFRESH_MS = 6 * 60 * 60 * 1000;

function toNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizePricesShape(raw: any): PricesResponse | null {
  if (!raw) return null;
  const src = raw?.prices && typeof raw.prices === "object" ? raw.prices : raw;
  return {
    ok: true,
    XAUUSD: toNum(src?.XAUUSD),
    XAGUSD: toNum(src?.XAGUSD),
    USDCAD: toNum(src?.USDCAD),
    XAUCAD: toNum(src?.XAUCAD),
    XAGCAD: toNum(src?.XAGCAD),
    DXY: toNum(src?.DXY),
    US10Y: toNum(src?.US10Y),
  };
}

function normalizeMarketContext(raw: any, signal?: any): MarketContext {
  const src = raw && typeof raw === "object" ? raw : {};
  const sig = signal && typeof signal === "object" ? signal : {};
  return {
    session: String(src.session || sig.session || "UNKNOWN").toUpperCase(),
    volatility: String(
      src.volatility || sig.volatility || sig.volatility_state || "UNKNOWN",
    ).toUpperCase(),
    bias: String(
      src.bias || sig.bias || sig.macro_bias || "NEUTRAL",
    ).toUpperCase(),
    marketPhase: String(
      src.market_phase || src.marketPhase || sig.market_phase || "UNKNOWN",
    ).toUpperCase(),
    liquidityRisk: String(
      src.liquidity_risk ||
        src.liquidityRisk ||
        sig.liquidity_risk ||
        sig.risk ||
        "NORMAL",
    ).toUpperCase(),
    news: String(
      src.news || sig.news || sig.news_mode || sig.news_state || "SAFE",
    ).toUpperCase(),
  };
}

function saveMarketCache(data: {
  prices: PricesResponse | null;
  marketContext: MarketContext;
  updatedAt: number;
}) {
  try {
    localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(data));
    sessionStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function readMarketCache(): {
  prices: PricesResponse | null;
  marketContext: MarketContext;
  updatedAt?: number;
} | null {
  try {
    const raw = localStorage.getItem(MARKET_CACHE_KEY) || sessionStorage.getItem(MARKET_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatNum(value: unknown, lang: string, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return formatNumber(num, lang, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function Market() {
  const [showMenu, setShowMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });
  const [prices, setPrices] = useState<PricesResponse | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext>({
    session: "UNKNOWN",
    volatility: "UNKNOWN",
    bias: "NEUTRAL",
    marketPhase: "UNKNOWN",
    liquidityRisk: "NORMAL",
    news: "SAFE",
  });
  const [lastError, setLastError] = useState<string | null>(null);
  const [lang, setLang] = useState(() => getLanguage());
  const lastMarketRefreshRef = useRef(0);
  const marketLoadingRef = useRef(false);

  useEffect(() => {
    const cached = readMarketCache();
    if (!cached) return;
    if (cached.prices) setPrices(cached.prices);
    if (cached.marketContext) setMarketContext(cached.marketContext);
    const updatedAt = Number(cached.updatedAt);
    if (Number.isFinite(updatedAt) && updatedAt > 0) {
      lastMarketRefreshRef.current = updatedAt;
    }
  }, []);

  const loadMarket = useCallback(
    async (force = false) => {
      const now = Date.now();
      const lastRefresh = lastMarketRefreshRef.current;

      if (!force && lastRefresh > 0 && now - lastRefresh < MARKET_REFRESH_MS) {
        return;
      }

      if (marketLoadingRef.current) {
        return;
      }

      marketLoadingRef.current = true;

      try {
        const dashboard = await fetchDashboard("XAUUSD");
        const normalizedPrices = normalizePricesShape(dashboard?.prices);
        const normalizedContext = normalizeMarketContext(
          dashboard?.market_context,
          dashboard?.signal,
        );
        const updatedAt = Date.now();

        if (normalizedPrices) {
          setPrices(normalizedPrices);
          setLastError(null);
        }
        setMarketContext(normalizedContext);
        lastMarketRefreshRef.current = updatedAt;

        saveMarketCache({
          prices: normalizedPrices || prices,
          marketContext: normalizedContext,
          updatedAt,
        });
      } catch (err) {
        console.error("Market load failed:", err);
        if (!prices)
          setLastError(
            tr(lang, {
              en: "Market data unavailable",
              fa: "داده‌های بازار در دسترس نیست",
              ar: "بيانات السوق غير متاحة",
              es: "Datos de mercado no disponibles",
              "pt-BR": "Dados de mercado indisponíveis",
              hi: "मार्केट डेटा उपलब्ध नहीं है",
              tr: "Piyasa verileri kullanılamıyor",
              de: "Marktdaten nicht verfügbar",
              fr: "Données de marché indisponibles",
              zh: "市场数据不可用",
              ko: "시장 데이터를 사용할 수 없습니다",
            }),
          );
      } finally {
        marketLoadingRef.current = false;
      }
    },
    [prices, lang],
  );

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadMarket();
    }, MARKET_REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadMarket]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadMarket();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadMarket]);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("darkMode");
      setDarkMode(saved ? JSON.parse(saved) : true);
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(
      "themeChange",
      handleStorageChange as EventListener,
    );
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "themeChange",
        handleStorageChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const handleLanguageChange = () => {
      setLang(getLanguage());
    };

    window.addEventListener("storage", handleLanguageChange);
    window.addEventListener(
      "languageChange",
      handleLanguageChange as EventListener,
    );
    window.addEventListener(
      "langChange",
      handleLanguageChange as EventListener,
    );

    return () => {
      window.removeEventListener("storage", handleLanguageChange);
      window.removeEventListener(
        "languageChange",
        handleLanguageChange as EventListener,
      );
      window.removeEventListener(
        "langChange",
        handleLanguageChange as EventListener,
      );
    };
  }, []);

  const macroData = [
    {
      label: tr(lang, {
        en: "Market Sentiment",
        fa: "احساس بازار",
        ar: "اتجاه السوق",
        es: "Sentimiento del mercado",
        "pt-BR": "Sentimento do mercado",
        hi: "बाज़ार भावना",
        tr: "Piyasa hissiyatı",
        de: "Marktstimmung",
        fr: "Sentiment du marché",
        zh: "市场情绪",
        ko: "시장 심리",
      }),
      value: translateBias(marketContext.bias, lang),
      color:
        marketContext.bias === "BULLISH"
          ? "text-green-400"
          : marketContext.bias === "BEARISH"
            ? "text-red-400"
            : "text-gray-300",
    },
    {
      label: tr(lang, {
        en: "Volatility Index",
        fa: "شاخص نوسان",
        ar: "مؤشر التذبذب",
        es: "Índice de volatilidad",
        "pt-BR": "Índice de volatilidade",
        hi: "अस्थिरता सूचकांक",
        tr: "Volatilite endeksi",
        de: "Volatilitätsindex",
        fr: "Indice de volatilité",
        zh: "波动率指数",
        ko: "변동성 지수",
      }),
      value: translateRisk(marketContext.volatility, lang),
      color:
        marketContext.volatility === "HIGH"
          ? "text-red-400"
          : marketContext.volatility === "LOW"
            ? "text-green-400"
            : "text-yellow-400",
    },
    {
      label: tr(lang, {
        en: "Market Phase",
        fa: "فاز بازار",
        ar: "مرحلة السوق",
        es: "Fase del mercado",
        "pt-BR": "Fase do mercado",
        hi: "बाज़ार चरण",
        tr: "Piyasa aşaması",
        de: "Marktphase",
        fr: "Phase du marché",
        zh: "市场阶段",
        ko: "시장 단계",
      }),
      value: translateMarketPhase(marketContext.marketPhase, lang),
      color: "text-teal-400",
    },
    {
      label: tr(lang, {
        en: "News",
        fa: "اخبار",
        ar: "الأخبار",
        es: "Noticias",
        "pt-BR": "Notícias",
        hi: "समाचार",
        tr: "Haberler",
        de: "Nachrichten",
        fr: "Actualités",
        zh: "新闻",
        ko: "뉴스",
      }),
      value: translateNews(marketContext.news, lang),
      color:
        marketContext.news === "SAFE" ? "text-green-400" : "text-yellow-400",
    },
  ];

  return (
    <div
      className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden ${darkMode ? "bg-[#050812] text-white" : "bg-[#f6f4ee] text-gray-950"} pb-24`}
    >
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />
<AppHeader
        title={tr(lang, { en: "Market", fa: "بازار", ar: "السوق", es: "Mercado", "pt-BR": "Mercado", hi: "बाज़ार", tr: "Piyasa", de: "Markt", fr: "Marché", zh: "市场", ko: "시장" })}
        subtitle={tr(lang, { en: "Live Market Data", fa: "داده‌های زنده بازار", ar: "بيانات السوق الحية", es: "Datos de mercado en vivo", "pt-BR": "Dados de mercado ao vivo", hi: "लाइव मार्केट डेटा", tr: "Canlı piyasa verileri", de: "Live-Marktdaten", fr: "Données de marché en direct", zh: "实时市场数据", ko: "실시간 시장 데이터" })}
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
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Market Command Center</h2>
              <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} mt-1 text-sm`}>Live gold, silver and macro context</p>
            </div>
            <div className="hidden rounded-2xl border border-yellow-500/20 bg-black/20 px-4 py-3 text-right sm:block">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">BEX MODE</p>
              <p className="mt-1 text-lg font-black text-yellow-400">LUXURY</p>
            </div>
          </div>
        </div>
      </div>


      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <h2
          className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"} mb-4`}
        >
          {tr(lang, {
            en: "Live Market Data",
            fa: "داده‌های زنده بازار",
            ar: "بيانات السوق المباشرة",
            es: "Datos de mercado en vivo",
            "pt-BR": "Dados de mercado ao vivo",
            hi: "लाइव मार्केट डेटा",
            tr: "Canlı piyasa verileri",
            de: "Live-Marktdaten",
            fr: "Données de marché en direct",
            zh: "实时市场数据",
            ko: "실시간 시장 데이터",
          })}
        </h2>

        <div
          className={`${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-[1.35rem] p-5 border backdrop-blur-md`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg">XAUUSD</h3>
              <p
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {tr(lang, {
                  en: "Gold vs US Dollar",
                  fa: "طلا در برابر دلار آمریکا",
                  ar: "الذهب مقابل الدولار الأمريكي",
                  es: "Oro frente al dólar estadounidense",
                  "pt-BR": "Ouro vs dólar americano",
                  hi: "सोना बनाम अमेरिकी डॉलर",
                  tr: "Altın / ABD Doları",
                  de: "Gold gegen US-Dollar",
                  fr: "Or contre dollar américain",
                  zh: "黄金兑美元",
                  ko: "금 대 미국 달러",
                })}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              ${formatNum(prices?.XAUUSD, lang, 2)}
            </span>
          </div>
        </div>

        <div
          className={`${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-[1.35rem] p-5 border backdrop-blur-md`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg">XAGUSD</h3>
              <p
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {tr(lang, {
                  en: "Silver vs US Dollar",
                  fa: "نقره در برابر دلار آمریکا",
                  ar: "الفضة مقابل الدولار الأمريكي",
                  es: "Plata frente al dólar estadounidense",
                  "pt-BR": "Prata vs dólar americano",
                  hi: "चांदी बनाम अमेरिकी डॉलर",
                  tr: "Gümüş / ABD Doları",
                  de: "Silber gegen US-Dollar",
                  fr: "Argent contre dollar américain",
                  zh: "白银兑美元",
                  ko: "은 대 미국 달러",
                })}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              ${formatNum(prices?.XAGUSD, lang, 2)}
            </span>
          </div>
        </div>

        <div
          className={`${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-[1.35rem] p-5 border backdrop-blur-md`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg">DXY</h3>
              <p
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {tr(lang, {
                  en: "US Dollar Index",
                  fa: "شاخص دلار آمریکا",
                  ar: "مؤشر الدولار الأمريكي",
                  es: "Índice del dólar estadounidense",
                  "pt-BR": "Índice do dólar americano",
                  hi: "अमेरिकी डॉलर सूचकांक",
                  tr: "ABD Dolar Endeksi",
                  de: "US-Dollar-Index",
                  fr: "Indice du dollar américain",
                  zh: "美元指数",
                  ko: "미국 달러 지수",
                })}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {formatNum(prices?.DXY, lang, 2)}
            </span>
          </div>
        </div>

        <div
          className={`${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-[1.35rem] p-5 border backdrop-blur-md`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg">US10Y</h3>
              <p
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {tr(lang, {
                  en: "US 10-Year Yield",
                  fa: "بازده اوراق ۱۰ ساله آمریکا",
                  ar: "عائد سندات أمريكا 10 سنوات",
                  es: "Rendimiento a 10 años de EE. UU.",
                  "pt-BR": "Rendimento de 10 anos dos EUA",
                  hi: "अमेरिका 10-वर्षीय यील्ड",
                  tr: "ABD 10 yıllık tahvil faizi",
                  de: "US-Rendite 10 Jahre",
                  fr: "Rendement US à 10 ans",
                  zh: "美国10年期收益率",
                  ko: "미국 10년물 수익률",
                })}
              </p>
            </div>
            <TrendingDown className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {formatNum(prices?.US10Y, lang, 2)}%
            </span>
          </div>
        </div>

        <div
          className={`${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-[1.35rem] p-5 border backdrop-blur-md`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg">USDCAD</h3>
              <p
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                {tr(lang, {
                  en: "US Dollar vs Canadian Dollar",
                  fa: "دلار آمریکا در برابر دلار کانادا",
                  ar: "الدولار الأمريكي مقابل الدولار الكندي",
                  es: "Dólar estadounidense frente al dólar canadiense",
                  "pt-BR": "Dólar americano vs dólar canadense",
                  hi: "अमेरिकी डॉलर बनाम कनाडाई डॉलर",
                  tr: "ABD Doları / Kanada Doları",
                  de: "US-Dollar gegen kanadischen Dollar",
                  fr: "Dollar américain contre dollar canadien",
                  zh: "美元兑加元",
                  ko: "미국 달러 대 캐나다 달러",
                })}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {formatNum(prices?.USDCAD, lang, 4)}
            </span>
          </div>
        </div>

        <div
          className={`${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-[1.35rem] p-5 border backdrop-blur-md`}
        >
          <h3 className="text-yellow-400 text-xs font-bold tracking-widest mb-4">
            {tr(lang, {
              en: "MACRO SNAPSHOT",
              fa: "خلاصه ماکرو",
              ar: "ملخص الماكرو",
              es: "RESUMEN MACRO",
              "pt-BR": "RESUMO MACRO",
              hi: "मैक्रो सारांश",
              tr: "MAKRO ÖZET",
              de: "MAKRO-ÜBERSICHT",
              fr: "APERÇU MACRO",
              zh: "宏观快照",
              ko: "매크로 요약",
            })}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {macroData.map((item) => (
              <div
                key={item.label}
                className={`${darkMode ? "bg-[#111a2a]/50" : "bg-gray-50"} rounded-xl p-3`}
              >
                <p
                  className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"} mb-1`}
                >
                  {item.label}
                </p>
                <p className={`font-bold text-sm ${item.color}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {!prices && lastError && (
          <div
            className={`${darkMode ? "bg-[#0b1220]" : "bg-white"} rounded-2xl p-4 text-center`}
          >
            <p className="text-red-400">{lastError}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
