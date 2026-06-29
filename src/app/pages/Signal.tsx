import { Settings, Menu } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { SideMenu } from "../components/SideMenu";
import { BottomNav } from "../components/BottomNav";
import logoImage from "../../assets/bex-brand-logo.png";
import { fetchSignal, fetchChart, SignalResponse, ChartResponse, Candle } from "../utils/api";
import { CandlestickChart } from "../components/CandlestickChart";

type Timeframe = "M1" | "M5" | "M15" | "H1" | "H4" | "D1";

const timeframeMap: Record<string, string> = {
  M1: "1m",
  M5: "5m",
  M15: "15m",
  H1: "1h",
};

function formatPrice(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : Number(value).toFixed(2);
}

function hasSignalData(value: SignalResponse | null): boolean {
  if (!value) return false;
  return !!(
    value.side ||
    value.entry !== null ||
    value.sl !== null ||
    value.tp !== null ||
    value.confidence !== null
  );
}

export function Signal() {
  const [showMenu, setShowMenu] = useState(false);
  const [searchParams] = useSearchParams();
  const [symbol, setSymbol] = useState<"XAUUSD" | "XAGUSD">(
    (searchParams.get("symbol") as "XAUUSD" | "XAGUSD") || "XAUUSD"
  );
  const [timeframe, setTimeframe] = useState<Timeframe>("M15");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });
  const [signal, setSignal] = useState<SignalResponse | null>(null);
  const [chartData, setChartData] = useState<ChartResponse | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);

  useEffect(() => {
    const loadSignal = async () => {
      setLoading(true);
      const data = await fetchSignal(symbol);
      setSignal(hasSignalData(data) ? data : null);
      setLoading(false);
    };

    loadSignal();
    const interval = setInterval(loadSignal, 45000);
    return () => clearInterval(interval);
  }, [symbol]);

  useEffect(() => {
    const loadChart = async () => {
      if (candles.length === 0) {
        setChartLoading(true);
      }

      const apiTimeframe = timeframeMap[timeframe];

      if (apiTimeframe) {
        const data = await fetchChart(symbol, apiTimeframe, 200);
        if (data && data.candles) {
          setChartData(data);
          setCandles(data.candles);
        } else {
          setChartData(null);
          setCandles([]);
        }
      } else if (timeframe === "H4" || timeframe === "D1") {
        const h1Data = await fetchChart(symbol, "1h", timeframe === "H4" ? 800 : 720);
        if (h1Data && h1Data.candles) {
          setChartData(h1Data);
          const aggregated = aggregateCandles(h1Data.candles, timeframe);
          setCandles(aggregated);
        } else {
          setChartData(null);
          setCandles([]);
        }
      }

      setChartLoading(false);
    };

    loadChart();
    const interval = setInterval(loadChart, 15000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("darkMode");
      setDarkMode(saved ? JSON.parse(saved) : true);
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("themeChange", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("themeChange", handleStorageChange);
    };
  }, []);

  const aggregateCandles = (h1Candles: Candle[], targetTF: "H4" | "D1"): Candle[] => {
    const barsPerCandle = targetTF === "H4" ? 4 : 24;
    const aggregated: Candle[] = [];

    for (let i = 0; i < h1Candles.length; i += barsPerCandle) {
      const group = h1Candles.slice(i, i + barsPerCandle);
      if (group.length === 0) continue;

      const aggregatedCandle: Candle = {
        symbol: group[0].symbol,
        bucket: group[0].bucket,
        open: group[0].open,
        high: Math.max(...group.map((c) => c.high)),
        low: Math.min(...group.map((c) => c.low)),
        close: group[group.length - 1].close,
        volume: group.reduce((sum, c) => sum + c.volume, 0),
        isoTime: group[0].isoTime,
      };

      aggregated.push(aggregatedCandle);
    }

    return aggregated;
  };

  const timeframes: Timeframe[] = ["M1", "M5", "M15", "H1", "H4", "D1"];

  const currentEntry = signal?.entry ?? null;
  const currentTp = signal?.tp ?? null;
  const currentSl = signal?.sl ?? null;
  const currentSide = signal?.side || signal?.type || null;
  const currentStatus = signal?.status ? String(signal.status).toUpperCase() : "WAIT";

  const allPrices = candles.flatMap((c) => [
    c.high,
    c.low,
    ...(currentTp !== null ? [currentTp] : []),
    ...(currentSl !== null ? [currentSl] : []),
    ...(currentEntry !== null ? [currentEntry] : []),
  ]);

  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 1;
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const priceRange = Math.max(maxPrice - minPrice, 1);
  const chartPadding = priceRange * 0.1;

  return (
    <div className={`min-h-screen ${darkMode ? "bg-[#050812] text-white" : "bg-[#f6f4ee] text-gray-950"} pb-24`}>
      <SideMenu isOpen={showMenu} onClose={() => setShowMenu(false)} />

      <header className={`${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} p-4 border-b sticky top-0 z-10`}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowMenu(true)} className={`p-2 rounded-lg ${darkMode ? "hover:bg-[#111a2a]" : "hover:bg-gray-100"}`}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="BEX AI" className="h-[58px] w-[130px] object-contain object-center md:h-[72px] md:w-[160px]" />
            <div>
              <h1 className="font-bold text-lg md:text-xl leading-tight">BEX AI</h1>
              <p className={`text-xs md:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} leading-tight`}>GOLD TRADER</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
              (localStorage.getItem("userPlan") || "PRO") === "VIP"
                ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black"
                : (localStorage.getItem("userPlan") || "PRO") === "PRO"
                ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white"
                : "bg-gray-500 text-white"
            }`}>
              {localStorage.getItem("userPlan") || "PRO"}
            </div>
            <Link to="/app/settings">
              <button className={`p-2 rounded-lg ${darkMode ? "hover:bg-[#111a2a]" : "hover:bg-gray-100"}`}>
                <Settings className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSymbol("XAUUSD")}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
              symbol === "XAUUSD"
                ? "bg-yellow-500 text-black shadow-lg"
                : darkMode ? "bg-[#111a2a] text-gray-400 border border-gray-700" : "bg-gray-100 text-gray-600 border border-gray-300"
            }`}
          >
            XAUUSD
          </button>
          <button
            onClick={() => setSymbol("XAGUSD")}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
              symbol === "XAGUSD"
                ? "bg-yellow-500 text-black shadow-lg"
                : darkMode ? "bg-[#111a2a] text-gray-400 border border-gray-700" : "bg-gray-100 text-gray-600 border border-gray-300"
            }`}
          >
            XAGUSD
          </button>
        </div>

        <div className={`flex gap-1 ${darkMode ? "bg-[#111a2a]" : "bg-gray-200"} rounded-lg p-1`}>
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`flex-1 py-1.5 rounded-md font-bold text-xs transition-all ${
                timeframe === tf
                  ? "bg-teal-500 text-white shadow-lg"
                  : darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <section className="relative overflow-hidden rounded-[1.65rem] border border-yellow-500/20 bg-gradient-to-br from-[#111a2a]/95 via-[#08101c]/95 to-[#050812]/95 p-5 shadow-[0_0_45px_rgba(234,179,8,0.08)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.12),transparent_28%)]" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> BEX AI DESK</span>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Signal Desk</h1>
            <p className="mt-1 text-sm text-gray-400">Execution-ready BEX signal workspace</p>
          </div>
        </section>
      </div>


      <div className="mx-auto max-w-6xl space-y-5 p-4 pb-24 sm:p-6">
        {loading ? (
          <div className={`${darkMode ? "bg-[#0b1220]" : "bg-white"} rounded-2xl p-8 text-center min-h-[200px] flex items-center justify-center`}>
            <div>
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className={darkMode ? "text-gray-400" : "text-gray-600"}>Loading signal data...</p>
            </div>
          </div>
        ) : signal ? (
          <>
            <div className={`${darkMode ? "bg-gradient-to-br from-[#0f1623] to-[#0a0e1a] border-yellow-500/20" : "bg-white border-yellow-500/30"} rounded-2xl p-4 border shadow-xl`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">{symbol}</h2>
                <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                  currentSide === "BUY"
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                    : currentSide === "SELL"
                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white"
                    : "bg-gradient-to-r from-gray-500 to-gray-600 text-white"
                }`}>
                  {currentSide || "WAIT"}
                </div>
              </div>

              <p className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"} mb-3 line-clamp-2`}>
                {signal.idea || `${symbol} live signal${signal.timeframe ? ` • ${signal.timeframe}` : ""}`}
              </p>

              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className={`${darkMode ? "bg-[#111a2a]/50" : "bg-gray-50"} rounded-lg p-2`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Entry</p>
                  <p className="font-bold text-sm">{formatPrice(currentEntry)}</p>
                </div>
                <div className={`${darkMode ? "bg-[#111a2a]/50" : "bg-red-50"} rounded-lg p-2`}>
                  <p className={`text-xs ${darkMode ? "text-red-400" : "text-red-600"}`}>SL</p>
                  <p className="font-bold text-sm">{formatPrice(currentSl)}</p>
                </div>
                <div className={`${darkMode ? "bg-[#111a2a]/50" : "bg-green-50"} rounded-lg p-2`}>
                  <p className={`text-xs ${darkMode ? "text-green-400" : "text-green-600"}`}>TP</p>
                  <p className="font-bold text-sm">{formatPrice(currentTp)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className={`${darkMode ? "bg-[#111a2a]/50" : "bg-gray-50"} rounded-lg p-2`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>R:R</p>
                  <p className="font-bold text-teal-400 text-sm">{signal.rr || "—"}</p>
                </div>
                <div className={`${darkMode ? "bg-[#111a2a]/50" : "bg-gray-50"} rounded-lg p-2`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Confidence</p>
                  <p className="font-bold text-sm">
                    {signal.confidence === null || signal.confidence === undefined ? "—" : `${Math.round(Number(signal.confidence))}%`}
                  </p>
                </div>
                <div className={`${darkMode ? "bg-[#111a2a]/50" : "bg-gray-50"} rounded-lg p-2`}>
                  <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Status</p>
                  <p className="font-bold text-teal-400 text-xs">{currentStatus}</p>
                </div>
              </div>
            </div>

            <div className={`${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-2xl p-4 border`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-yellow-400 text-xs font-bold tracking-widest">📈 LIVE CHART</h3>
                {!chartLoading && candles.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-400">Live</span>
                  </div>
                )}
              </div>

              {chartLoading && candles.length === 0 ? (
                <div className={`${darkMode ? "bg-[#0a0e1a]" : "bg-gray-50"} rounded-xl p-8 text-center h-[400px] flex items-center justify-center`}>
                  <div>
                    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className={darkMode ? "text-gray-400" : "text-gray-600"}>Loading chart...</p>
                  </div>
                </div>
              ) : candles.length === 0 ? (
                <div className={`${darkMode ? "bg-[#0a0e1a]" : "bg-gray-50"} rounded-xl p-8 text-center h-[400px] flex items-center justify-center`}>
                  <p className="text-red-400">Chart data unavailable</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden">
                  <CandlestickChart
                    candles={candles}
                    darkMode={darkMode}
                    signalEntry={currentEntry}
                    signalSL={currentSl}
                    signalTP={currentTp}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={`${darkMode ? "bg-[#0b1220]" : "bg-white"} rounded-2xl p-8 text-center min-h-[220px] flex items-center justify-center`}>
            <div>
              <p className="text-lg font-bold mb-2">No live signal yet</p>
              <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                Waiting for a clean setup with valid entry, SL, TP and confidence.
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}


const BEX_PHASE2_SIGNAL_ERROR_COPY = "Signal error. Please refresh or try again.";
const BEX_PHASE2_SIGNAL_NO_DATA_COPY = "No data is available yet. BEX is waiting for a valid setup.";
