import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Bot,
  Shield,
  CreditCard,
  Bell,
  PlugZap,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MonitorCog,
} from "lucide-react";

type Article = {
  id: string;
  category: string;
  title: string;
  summary: string;
  body: JSX.Element;
};

const supportedPlatforms = [
  { name: "MetaTrader 5", short: "MT5", status: "Supported", note: "Uses the BEX trading connector / EA." },
  { name: "MetaTrader 4", short: "MT4", status: "Supported", note: "Uses the BEX trading connector / EA when available for your broker." },
  { name: "cTrader", short: "cTrader", status: "Planned", note: "Planned for brokers that allow automated execution." },
  { name: "TradeLocker", short: "TradeLocker", status: "Planned", note: "Can be added if the platform/broker allows automation or API/webhook execution." },
  { name: "Broker API / Webhook", short: "API", status: "Planned", note: "For brokers that provide official automation access." },
];

const articles: Article[] = [
  {
    id: "what-is-bex",
    category: "Getting Started",
    title: "What is BEX Trader?",
    summary: "A simple explanation for new users who have never used auto trading before.",
    body: (
      <div className="space-y-3">
        <p>BEX Trader is an AI-powered trading assistant built for gold and supported markets.</p>
        <p>It scans the market, studies price action, checks risk, and shows trading signals when conditions are strong enough.</p>
        <p>BEX can also help with automated execution when you connect a supported trading platform.</p>
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4">
          <p className="font-bold text-yellow-300">Important</p>
          <p className="text-sm text-gray-300">BEX Trader does not guarantee profit. Trading always has risk.</p>
        </div>
      </div>
    ),
  },
  {
    id: "auto-trading-works",
    category: "Auto Trading",
    title: "How Auto Trading Works",
    summary: "How BEX can send trades to MT5, MT4, or future supported platforms.",
    body: (
      <div className="space-y-4">
        <ol className="space-y-3 text-sm text-gray-300">
          <li><b className="text-white">1.</b> BEX scans the market and waits for a valid setup.</li>
          <li><b className="text-white">2.</b> The signal passes through risk checks and execution permission.</li>
          <li><b className="text-white">3.</b> If Auto Trade is connected, BEX sends the order to your supported trading platform.</li>
          <li><b className="text-white">4.</b> The order includes entry direction, stop loss, take profit, and risk controls.</li>
          <li><b className="text-white">5.</b> If the market is weak or unsafe, BEX may send no trade. That is normal.</li>
        </ol>
        <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
          <p className="font-bold text-blue-300">Auto Trade means:</p>
          <p className="text-sm text-gray-300">BEX can execute through a connected platform only when that platform or broker allows automated trading.</p>
        </div>
      </div>
    ),
  },
  {
    id: "supported-platforms",
    category: "Platforms",
    title: "Supported Trading Platforms",
    summary: "BEX is not only for MT5. MT4 and other automation-enabled platforms can be added.",
    body: (
      <div className="space-y-4">
        <p>To use Auto Trade, you need a broker account connected to a platform that supports automated execution.</p>
        <div className="overflow-hidden rounded-2xl border border-yellow-500/20">
          {supportedPlatforms.map((platform) => (
            <div key={platform.short} className="border-b border-yellow-500/20 bg-[#0b1220] p-4 last:border-b-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{platform.name}</p>
                  <p className="text-xs text-gray-400">{platform.note}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${platform.status === "Supported" ? "bg-green-500/15 text-green-300" : "bg-yellow-500/15 text-yellow-300"}`}>
                  {platform.status}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400">In the app, use the general words “Trading Platform”, “Trading Connector”, and “Auto Trade Token” so the system stays ready for future platforms.</p>
      </div>
    ),
  },
  {
    id: "setup-steps",
    category: "Setup Guide",
    title: "Step-by-Step Auto Trade Setup",
    summary: "The beginner-friendly setup path for connecting BEX to a trading platform.",
    body: (
      <div className="space-y-3">
        {[
          "Create or log in to your BEX Trader account.",
          "Choose a supported trading platform such as MT5 or MT4.",
          "Install the BEX Trading Connector / EA on that platform.",
          "Copy your Auto Trade Token from BEX and paste it into the connector.",
          "Enable Auto Trading inside your platform.",
          "Keep your platform running, or use a VPS for 24/7 execution.",
        ].map((step, index) => (
          <div key={step} className="flex gap-3 rounded-2xl border border-yellow-500/20 bg-[#0b1220] p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-black">{index + 1}</span>
            <p className="text-sm text-gray-300">{step}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "signals",
    category: "Signals",
    title: "When Does BEX Send a Trade?",
    summary: "Why some days have trades and some days have no trades.",
    body: (
      <div className="space-y-3">
        <p>BEX does not try to trade every minute. It waits for stronger market conditions.</p>
        <p>A trade may be sent when trend, structure, volatility, session, price level, and risk checks are aligned.</p>
        <p>If the market is unclear, too risky, or confidence is too low, BEX may wait instead of sending a trade.</p>
      </div>
    ),
  },
  {
    id: "confidence",
    category: "Trading Basics",
    title: "What Does Confidence Mean?",
    summary: "A simple explanation of the confidence score shown inside the app.",
    body: (
      <div className="space-y-3">
        <p>Confidence is a score that shows how strong a signal looks based on BEX analysis.</p>
        <p>Higher confidence means more conditions are aligned. Lower confidence means the trade may be weaker or needs more confirmation.</p>
        <p>Confidence is not a profit guarantee. It is only a quality score.</p>
      </div>
    ),
  },
  {
    id: "risk",
    category: "Risk & Safety",
    title: "Risk Disclaimer",
    summary: "The most important safety information every user must read before trading.",
    body: (
      <div className="space-y-3">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="mb-2 font-bold text-red-300">Trading involves risk.</p>
          <p className="text-sm text-gray-300">You can lose money. BEX Trader does not promise guaranteed profit, fixed income, or financial results.</p>
        </div>
        <p>Only trade with money you can afford to risk.</p>
        <p>Always understand your broker, leverage, account size, and platform settings before enabling Auto Trade.</p>
      </div>
    ),
  },
  {
    id: "billing",
    category: "Billing",
    title: "Subscription, VIP, and Lifetime Plans",
    summary: "What users should know before buying a plan.",
    body: (
      <div className="space-y-3">
        <p>Different plans may include different signal access, alerts, tools, analytics, and automation support.</p>
        <p>You can manage your subscription through the App Store, Google Play, or the payment provider used at checkout.</p>
        <p>Lifetime access means access according to the terms shown at purchase. It does not remove trading risk.</p>
        <Link to="/app/vip" className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-3 font-bold text-black">
          View Plans <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    ),
  },
];

const categories = [
  { name: "Getting Started", icon: HelpCircle },
  { name: "Auto Trading", icon: Bot },
  { name: "Platforms", icon: MonitorCog },
  { name: "Setup Guide", icon: PlugZap },
  { name: "Signals", icon: Bell },
  { name: "Trading Basics", icon: CheckCircle2 },
  { name: "Risk & Safety", icon: Shield },
  { name: "Billing", icon: CreditCard },
];

export function HelpCenter() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openArticle, setOpenArticle] = useState<string>("what-is-bex");

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesCategory = activeCategory === "All" || article.category === activeCategory;
      const matchesQuery = !q || [article.title, article.summary, article.category].join(" ").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <div className="min-h-screen bg-[#050812] text-white pb-24">
      <header className="sticky top-0 z-20 border-b border-yellow-500/20 bg-[#0b1220]/95 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-xl bg-[#111a2a] p-2 hover:bg-[#223047]" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Help Center</h1>
            <p className="text-xs text-gray-400">Learn how BEX Trader, signals, and auto trading work.</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <section className="relative overflow-hidden rounded-[1.65rem] border border-yellow-500/20 bg-gradient-to-br from-[#111a2a]/95 via-[#08101c]/95 to-[#050812]/95 p-5 shadow-[0_0_45px_rgba(234,179,8,0.08)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.12),transparent_28%)]" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> BEX AI DESK</span>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">BEX Support Hub</h1>
            <p className="mt-1 text-sm text-gray-400">Guides, setup help and product answers</p>
          </div>
        </section>
      </div>


      <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <section className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-transparent p-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-yellow-400">Start Here</p>
          <h2 className="mb-2 text-2xl font-bold">New to trading or Auto Trade?</h2>
          <p className="text-sm leading-relaxed text-gray-300">
            This guide explains BEX in simple words: what the app does, how signals work, how Auto Trade connects, and what risks you must understand.
          </p>
        </section>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search BEX help articles"
            className="w-full rounded-2xl border border-yellow-500/20 bg-[#0b1220] py-4 pl-12 pr-4 text-white outline-none placeholder:text-gray-500 focus:border-yellow-500/60"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ name: "All", icon: HelpCircle }, ...categories].map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setActiveCategory(name)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${activeCategory === name ? "border-yellow-500 bg-yellow-500 text-black" : "border-yellow-500/20 bg-[#0b1220] text-gray-300"}`}
            >
              <Icon className="h-4 w-4" />
              {name}
            </button>
          ))}
        </div>

        <section className="space-y-3">
          {filteredArticles.map((article) => {
            const isOpen = openArticle === article.id;
            return (
              <article key={article.id} className="overflow-hidden rounded-2xl border border-yellow-500/20 bg-[#0b1220]">
                <button onClick={() => setOpenArticle(isOpen ? "" : article.id)} className="w-full p-4 text-left">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-yellow-400">{article.category}</p>
                  <h3 className="text-lg font-bold">{article.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{article.summary}</p>
                </button>
                {isOpen && <div className="border-t border-yellow-500/20 p-4 text-gray-300">{article.body}</div>}
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-red-300" />
            <div>
              <h3 className="font-bold text-red-300">No guaranteed profit</h3>
              <p className="text-sm text-gray-300">BEX Trader is a trading tool, not financial advice. You are responsible for your account, broker settings, leverage, and risk.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


