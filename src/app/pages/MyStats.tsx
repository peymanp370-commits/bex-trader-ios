import { useEffect, useState } from "react";
import { Menu, RefreshCw, Settings, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { SideMenu } from "../components/SideMenu";
import { fetchMyStats, fetchMyTrades, MT5Trade, MyStatsResponse } from "../utils/api";

function money(v: number | undefined | null) { const n = Number(v || 0); return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`; }
function pct(v: number | undefined | null) { return `${Number(v || 0).toFixed(2)}%`; }
function fmt(ms?: number | null) { if (!ms) return "—"; try { return new Date(Number(ms)).toLocaleString(); } catch { return "—"; } }

export function MyStats() {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MyStatsResponse | null>(null);
  const [trades, setTrades] = useState<MT5Trade[]>([]);

  async function load() {
    setLoading(true);
    const [s, t] = await Promise.all([fetchMyStats(), fetchMyTrades(50)]);
    setStats(s);
    setTrades(t?.trades || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  const st = stats?.stats;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white pb-24">
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />
      <header className="bg-[#0f1623] border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowMenu(true)} className="p-2 rounded-lg hover:bg-[#1a2332]"><Menu className="w-5 h-5" /></button>
          <h1 className="font-bold text-xl">My Stats</h1>
          <Link to="/app/settings"><button className="p-2 rounded-lg hover:bg-[#1a2332]"><Settings className="w-5 h-5" /></button></Link>
        </div>
      </header>
      <main className="p-4 space-y-4 max-w-4xl mx-auto">
        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
          This page shows only your own MT5 account history. Public BEX performance is separate.
        </section>
        <div className="flex items-center justify-between"><div className="text-sm text-gray-400">Account: {stats?.account_login || "—"}</div><button onClick={load} className="rounded-xl border border-gray-700 p-2"><RefreshCw className="w-4 h-4" /></button></div>
        {loading ? <div className="p-8 text-gray-400">Loading...</div> : null}
        {!loading && !stats?.ok ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">No personal stats yet. Connect VIP Auto Trading first.</div> : null}
        {st ? <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-[#0f1623] border border-gray-800 p-4"><div className="text-gray-400 text-xs">Trades</div><div className="text-2xl font-bold">{st.total_trades}</div></div>
          <div className="rounded-2xl bg-[#0f1623] border border-gray-800 p-4"><div className="text-gray-400 text-xs">Win Rate</div><div className="text-2xl font-bold text-green-400">{pct(st.win_rate)}</div></div>
          <div className="rounded-2xl bg-[#0f1623] border border-gray-800 p-4"><div className="text-gray-400 text-xs">Net PnL</div><div className={`text-2xl font-bold ${st.total_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>{money(st.total_pnl)}</div></div>
          <div className="rounded-2xl bg-[#0f1623] border border-gray-800 p-4"><div className="text-gray-400 text-xs">Last Close</div><div className="text-sm font-semibold">{fmt(st.last_close_time)}</div></div>
        </section> : null}
        <section className="rounded-2xl bg-[#0f1623] border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800 font-bold">My latest 50 trades</div>
          <div className="divide-y divide-gray-800">
            {trades.length === 0 ? <div className="p-5 text-gray-400">No trades yet.</div> : trades.map((tr, i) => {
              const pnl = Number((tr as any).pnl_net ?? tr.profit ?? 0);
              return <div key={`${(tr as any).deal_id || i}`} className="p-4 flex items-center justify-between gap-3">
                <div><div className="font-bold">{tr.symbol} • {tr.side || (tr as any).entry_side_real}</div><div className="text-xs text-gray-400">{fmt(tr.close_time || tr.open_time)}</div></div>
                <div className={`flex items-center gap-1 font-bold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>{pnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{money(pnl)}</div>
              </div>;
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
