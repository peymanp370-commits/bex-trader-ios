import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { ArrowLeft } from "lucide-react";

import {
  CandlestickChart,
  type Candle,
  type ChartTimeframe,
} from "../components/CandlestickChart";

const THEMES = { light: "", dark: ".dark" } as const;

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(" ");
}

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, cfg]) => cfg.theme || cfg.color
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`
          )
          .join("\n"),
      }}
    />
  );
};

export {
  ChartContainer,
  ChartStyle,
};

export type BexTimeframe = ChartTimeframe;

type CandlesResponse = {
  ok: boolean;
  symbol: string;
  tf: string;
  count?: number;
  candles: Array<{
    symbol?: string;
    time?: number;
    bucket?: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }>;
  error?: string;
};

const BEX_TF_LIST: readonly BexTimeframe[] = [
  "M1",
  "M5",
  "M15",
  "M30",
  "H1",
  "H4",
  "D1",
  "W1",
  "MN",
] as const;

const SYMBOL_TABS = ["XAUUSD", "XAGUSD"] as const;
type SupportedSymbol = (typeof SYMBOL_TABS)[number];

type AggregateMode = "none" | "30m" | "4h" | "1d" | "1w" | "1mo";

function tfToFetch(
  tf: BexTimeframe
): { sourceTf: string; limit: number; aggregate: AggregateMode } {
  switch (tf) {
    case "M1":
      return { sourceTf: "1m", limit: 300, aggregate: "none" };
    case "M5":
      return { sourceTf: "5m", limit: 300, aggregate: "none" };
    case "M15":
      return { sourceTf: "15m", limit: 300, aggregate: "none" };
    case "M30":
      return { sourceTf: "15m", limit: 600, aggregate: "30m" };
    case "H1":
      return { sourceTf: "1h", limit: 300, aggregate: "none" };
    case "H4":
      return { sourceTf: "1h", limit: 900, aggregate: "4h" };
    case "D1":
      return { sourceTf: "1h", limit: 2500, aggregate: "1d" };
    case "W1":
      return { sourceTf: "1h", limit: 5000, aggregate: "1w" };
    case "MN":
      return { sourceTf: "1h", limit: 9000, aggregate: "1mo" };
    default:
      return { sourceTf: "15m", limit: 300, aggregate: "none" };
  }
}

function normalizeEpochMs(value: number | null | undefined) {
  if (!Number.isFinite(value)) return 0;
  return value! < 1e12 ? value! * 1000 : value!;
}

function startOfUtcWeek(epochMs: number) {
  const d = new Date(epochMs);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + diff,
    0,
    0,
    0,
    0
  );
}

function startOfUtcMonth(epochMs: number) {
  const d = new Date(epochMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0);
}

function startOfUtcDay(epochMs: number) {
  const d = new Date(epochMs);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    0,
    0,
    0,
    0
  );
}

function bucketForAggregate(epochMs: number, mode: AggregateMode) {
  if (mode === "none") return epochMs;
  if (mode === "30m")
    return Math.floor(epochMs / (30 * 60 * 1000)) * (30 * 60 * 1000);
  if (mode === "4h")
    return Math.floor(epochMs / (4 * 60 * 60 * 1000)) * (4 * 60 * 60 * 1000);
  if (mode === "1d") return startOfUtcDay(epochMs);
  if (mode === "1w") return startOfUtcWeek(epochMs);
  if (mode === "1mo") return startOfUtcMonth(epochMs);
  return epochMs;
}

function aggregateCandles(candles: Candle[], mode: AggregateMode) {
  if (mode === "none") return candles;

  const grouped = new Map<number, Candle>();

  for (const candle of candles) {
    const key = bucketForAggregate(candle.bucket, mode);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        ...candle,
        bucket: key,
        isoTime: new Date(key).toISOString(),
      });
      continue;
    }

    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
    existing.volume = (existing.volume || 0) + (candle.volume || 0);
  }

  return Array.from(grouped.values()).sort((a, b) => a.bucket - b.bucket);
}

function normalizeCandles(rows: CandlesResponse["candles"]): Candle[] {
  const list = Array.isArray(rows) ? rows : [];

  return list
    .map((row) => {
      const rawBucket = row.bucket ?? row.time ?? 0;
      const bucket = normalizeEpochMs(Number(rawBucket));
      const open = Number(row.open);
      const high = Number(row.high);
      const low = Number(row.low);
      const close = Number(row.close);
      const volume = Number(row.volume ?? 0);

      if (
        !Number.isFinite(bucket) ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        return null;
      }

      return {
        bucket,
        open,
        high,
        low,
        close,
        volume: Number.isFinite(volume) ? volume : 0,
        isoTime: new Date(bucket).toISOString(),
      } satisfies Candle;
    })
    .filter((item): item is Candle => Boolean(item))
    .sort((a, b) => a.bucket - b.bucket);
}

function formatSigned(value: number | null | undefined, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  const n = Number(value);
  if (n > 0) return `+${n.toFixed(digits)}`;
  return n.toFixed(digits);
}

function formatPrice(value: number | null | undefined, symbol: string) {
  if (!Number.isFinite(value)) return "—";
  const digits = symbol === "XAGUSD" ? 3 : 2;
  return Number(value).toFixed(digits);
}

function readThemeIsDark() {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem("darkMode");
  return saved ? JSON.parse(saved) : true;
}

function getInitialSymbol(): SupportedSymbol {
  if (typeof window === "undefined") return "XAUUSD";

  const url = new URL(window.location.href);
  const raw = String(url.searchParams.get("symbol") || "XAUUSD").toUpperCase();

  if (raw === "XAGUSD") return "XAGUSD";
  return "XAUUSD";
}

export function Chart({
  initialSymbol = "XAUUSD",
  initialTimeframe = "M15",
  candlesBaseUrl = "https://bex-candles.peymanp370.workers.dev",
  className,
}: {
  initialSymbol?: string;
  initialTimeframe?: BexTimeframe;
  candlesBaseUrl?: string;
  className?: string;
}) {
  const [symbol, setSymbol] = React.useState<SupportedSymbol>(() => {
    const init = typeof window === "undefined" ? initialSymbol : getInitialSymbol();
    return init === "XAGUSD" ? "XAGUSD" : "XAUUSD";
  });

  const [timeframe, setTimeframe] =
    React.useState<BexTimeframe>(initialTimeframe);
  const [darkMode, setDarkMode] = React.useState<boolean>(() => readThemeIsDark());
  const [candles, setCandles] = React.useState<Candle[]>([]);
  const [livePrice, setLivePrice] = React.useState<number | null>(null);
  const [change, setChange] = React.useState<number | null>(null);
  const [changePct, setChangePct] = React.useState<number | null>(null);
  const [showEMA20, setShowEMA20] = React.useState(true);
  const [showEMA50, setShowEMA50] = React.useState(true);
  const [showVWAP, setShowVWAP] = React.useState(false);
  const [showSessions, setShowSessions] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

  React.useEffect(() => {
    const syncTheme = () => {
      setDarkMode(readThemeIsDark());
    };

    syncTheme();

    window.addEventListener("storage", syncTheme);
    window.addEventListener("themeChange", syncTheme as EventListener);

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("themeChange", syncTheme as EventListener);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("symbol", symbol);
    window.history.replaceState({}, "", url.toString());
  }, [symbol]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const route = candlesBaseUrl.replace(/\/+$/, "");
      const map = tfToFetch(timeframe);

      const [tfRes, liveRes] = await Promise.all([
        fetch(
          `${route}/candles?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(map.sourceTf)}&limit=${encodeURIComponent(String(map.limit))}`,
          { headers: { accept: "application/json" }, cache: "no-store" }
        ),
        fetch(
          `${route}/candles?symbol=${encodeURIComponent(symbol)}&tf=1m&limit=2`,
          { headers: { accept: "application/json" }, cache: "no-store" }
        ),
      ]);

      const tfData: CandlesResponse = await tfRes.json();
      const liveData: CandlesResponse = await liveRes.json();

      if (!tfRes.ok || !tfData.ok) {
        throw new Error(tfData.error || `Failed to load candles (${tfRes.status})`);
      }

      if (!liveRes.ok || !liveData.ok) {
        throw new Error(
          liveData.error || `Failed to load live price (${liveRes.status})`
        );
      }

      const normalized = normalizeCandles(tfData.candles);
      const finalCandles = aggregateCandles(normalized, map.aggregate);
      setCandles(finalCandles);

      const liveCandles = normalizeCandles(liveData.candles);
      const latestLive = liveCandles.at(-1) ?? null;
      const prevLive = liveCandles.length >= 2 ? liveCandles.at(-2) ?? null : null;

      const nextLivePrice = latestLive?.close ?? null;
      setLivePrice(nextLivePrice);

      const nextChange =
        latestLive && prevLive
          ? Number((latestLive.close - prevLive.close).toFixed(2))
          : null;

      const nextChangePct =
        latestLive && prevLive && prevLive.close
          ? Number(
              (((latestLive.close - prevLive.close) / prevLive.close) * 100).toFixed(4)
            )
          : null;

      setChange(nextChange);
      setChangePct(nextChangePct);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load chart");
      setCandles([]);
      setLivePrice(null);
      setChange(null);
      setChangePct(null);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, candlesBaseUrl]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [load]);

  const displayCandles = React.useMemo(() => {
    if (!candles.length || !Number.isFinite(livePrice)) return candles;

    const copy = [...candles];
    const last = copy[copy.length - 1];
    if (!last) return copy;

    const updatedLast: Candle = {
      ...last,
      close: livePrice as number,
      high: Math.max(last.high, livePrice as number),
      low: Math.min(last.low, livePrice as number),
    };

    copy[copy.length - 1] = updatedLast;
    return copy;
  }, [candles, livePrice]);

  return (
    <div
      className={cn(
        "min-h-screen w-full",
        darkMode
          ? "bg-[linear-gradient(180deg,#030816_0%,#071528_45%,#07182c_100%)] text-slate-100"
          : "bg-white text-slate-900",
        className
      )}
    >
      <div className={cn("space-y-2", isMobile ? "p-1.5" : "p-4")}>
        <div
          className={cn(
            "rounded-2xl border shadow-sm",
            isMobile ? "p-2" : "p-4",
            darkMode
              ? "border-[#17304d] bg-[linear-gradient(180deg,#071223_0%,#0a1730_100%)]"
              : "border-slate-200 bg-white"
          )}
        >
          <div
            className={cn(
              "mb-3 flex",
              isMobile
                ? "flex-col gap-2"
                : "flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
            )}
          >
            <div
              className={cn(
                "flex",
                isMobile
                  ? "items-center justify-between gap-2"
                  : "items-center gap-3"
              )}
            >
              <div className="flex items-center gap-2">
                {SYMBOL_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSymbol(tab)}
                    className={cn(
                      "rounded-md font-semibold transition-colors",
                      isMobile ? "h-9 px-3 text-xs" : "h-10 px-4 text-sm",
                      symbol === tab
                        ? darkMode
                          ? "bg-[#f1b300] text-black"
                          : "bg-slate-900 text-white"
                        : darkMode
                          ? "bg-[#13233d] text-slate-200 hover:bg-[#18304f]"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.history.back();
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md font-medium",
                  isMobile ? "h-9 px-3 text-xs" : "h-10 px-3 text-sm",
                  darkMode
                    ? "bg-[#13233d] text-slate-100 hover:bg-[#18304f]"
                    : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                )}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>

            <div className={cn("text-right", isMobile && "hidden")}>
              <div className="text-lg font-semibold">BEX Market Chart</div>
              <div
                className={cn(
                  "text-sm",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                Direct candles feed with M1 to MN
              </div>
            </div>
          </div>

          <div
            className={cn(
              "mb-3 flex flex-wrap",
              isMobile ? "gap-1.5" : "gap-2"
            )}
          >
            {BEX_TF_LIST.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "rounded-md font-medium transition-colors",
                  isMobile ? "h-10 px-3 text-sm" : "h-9 px-3 text-sm",
                  timeframe === tf
                    ? darkMode
                      ? "bg-[#f1b300] text-black"
                      : "bg-slate-900 text-white"
                    : darkMode
                      ? "bg-[#13233d] text-slate-200 hover:bg-[#18304f]"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 lg:mb-4 lg:gap-3 lg:grid-cols-4">
            {[
              ["Last Price", formatPrice(livePrice, symbol), undefined],
              ["Change", formatSigned(change, 2), change],
              [
                "% Change",
                Number.isFinite(changePct) ? `${formatSigned(changePct, 2)}%` : "—",
                changePct,
              ],
              ["Candles", String(displayCandles.length || 0), undefined],
            ].map(([label, value, trend]) => (
              <div
                key={String(label)}
                className={cn(
                  "rounded-lg border p-2.5 lg:p-3",
                  darkMode
                    ? "border-[#17304d] bg-[linear-gradient(180deg,#0a1526_0%,#101d33_100%)]"
                    : "border-slate-200 bg-white"
                )}
              >
                <div
                  className={cn(
                    isMobile ? "text-[11px]" : "text-xs",
                    darkMode ? "text-slate-400" : "text-slate-500"
                  )}
                >
                  {label}
                </div>
                <div
                  className={cn(
                    "mt-1 font-mono font-semibold",
                    isMobile ? "text-[16px]" : "text-[17px] lg:text-xl",
                    typeof trend === "number" && trend > 0 && "text-emerald-500",
                    typeof trend === "number" && trend < 0 && "text-red-500"
                  )}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>


          <div
            className={cn(
              "mb-3 flex flex-wrap",
              isMobile ? "gap-1.5" : "gap-2"
            )}
          >
            {[
              { key: "ema20", label: "EMA20", on: showEMA20, toggle: () => setShowEMA20((v) => !v) },
              { key: "ema50", label: "EMA50", on: showEMA50, toggle: () => setShowEMA50((v) => !v) },
              { key: "vwap", label: "VWAP", on: showVWAP, toggle: () => setShowVWAP((v) => !v) },
              { key: "sessions", label: "Sessions", on: showSessions, toggle: () => setShowSessions((v) => !v) },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.toggle}
                className={cn(
                  "rounded-md font-medium transition-colors",
                  isMobile ? "h-9 px-3 text-xs" : "h-9 px-3 text-sm",
                  item.on
                    ? darkMode
                      ? "bg-[#f1b300] text-black"
                      : "bg-slate-900 text-white"
                    : darkMode
                      ? "bg-[#13233d] text-slate-200 hover:bg-[#18304f]"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div
            className={cn(
              "rounded-2xl border",
              isMobile ? "p-0.5" : "p-1.5 lg:p-2",
              darkMode
                ? "border-[#17304d] bg-[linear-gradient(180deg,#08111f_0%,#0d1a2d_100%)]"
                : "border-slate-200 bg-white"
            )}
          >
            <CandlestickChart
              candles={displayCandles}
              darkMode={darkMode}
              timeframe={timeframe}
              symbol={symbol}
              loading={loading}
              showEMA20={showEMA20}
              showEMA50={showEMA50}
              showVWAP={showVWAP}
              showSessions={showSessions}
            />
          </div>

          {error ? (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

