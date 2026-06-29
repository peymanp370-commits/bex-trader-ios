import { useEffect, useState } from "react";
import { Copy, KeyRound, Menu, RefreshCw, Save, ShieldCheck, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { SideMenu } from "../components/SideMenu";
import { fetchMyVip, saveMyMt5Account, VipMeResponse } from "../utils/api";

const POSITION_ENGINE_BASE =
  (import.meta as any).env?.VITE_POSITION_ENGINE_BASE ||
  (import.meta as any).env?.VITE_POSITION_ENGINE_URL ||
  "https://bex-position-engine.peymanp370.workers.dev";

type Mt5ExecutionItem = {
  status?: string | null;
  trade_state?: string | null;
  symbol?: string | null;
  broker_symbol?: string | null;
  side?: string | null;
  lot?: number | string | null;
  entry?: number | string | null;
  fill_price?: number | string | null;
  sl?: number | string | null;
  tp?: number | string | null;
  profit?: number | string | null;
  account_login?: string | null;
  account_server?: string | null;
  signal_id?: string | null;
  created_at?: number | string | null;
};

type Mt5StatusResponse = {
  ok?: boolean;
  latest?: Mt5ExecutionItem | null;
  open_position?: Mt5ExecutionItem | null;
  pending_order?: Mt5ExecutionItem | null;
  items?: Mt5ExecutionItem[];
};

function isVip(plan?: string | null) {
  return String(plan || "").toLowerCase().includes("vip");
}

function fmtTime(ms?: number | null) {
  if (!ms) return "—";
  try { return new Date(Number(ms)).toLocaleString(); } catch { return "—"; }
}

function fmtAnyTime(value?: number | string | null) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try { return new Date(n).toLocaleString(); } catch { return "—"; }
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function tradeState(item?: Mt5ExecutionItem | null) {
  return String(item?.trade_state || item?.status || "NONE").toUpperCase();
}

function pickMt5Item(status: Mt5StatusResponse | null) {
  return status?.open_position || status?.pending_order || status?.latest || null;
}

function rememberVipContext(res: VipMeResponse | null) {
  try {
    const vip: any = res?.vip || {};
    const trading: any = res?.trading_account || {};
    if (vip?.token) localStorage.setItem("bex_vip_token", String(vip.token));
    if (vip?.client_id) localStorage.setItem("bex_vip_client_id", String(vip.client_id));
    const login = trading?.login_id || vip?.mt5_account_login || "";
    const server = trading?.server || vip?.account_server || "";
    if (login) localStorage.setItem("bex_mt5_account_login", String(login));
    if (server) localStorage.setItem("bex_mt5_account_server", String(server));
    window.dispatchEvent(new Event("bexVipContextChanged"));
  } catch {}
}

async function fetchVipMt5Status(res: VipMeResponse | null, symbol = "XAGUSD"): Promise<Mt5StatusResponse | null> {
  const vip: any = res?.vip || {};
  const trading: any = res?.trading_account || {};
  const token = String(vip?.token || localStorage.getItem("bex_vip_token") || "").trim();
  const clientId = String(vip?.client_id || localStorage.getItem("bex_vip_client_id") || "").trim();
  const accountLogin = String(trading?.login_id || vip?.mt5_account_login || localStorage.getItem("bex_mt5_account_login") || "").trim();
  const accountServer = String(trading?.server || vip?.account_server || localStorage.getItem("bex_mt5_account_server") || "").trim();
  if (!token || (!accountLogin && !clientId)) return null;

  const qs = new URLSearchParams({ token, symbol, limit: "20" });
  if (clientId) qs.set("client_id", clientId);
  if (accountLogin) qs.set("account_login", accountLogin);
  if (accountServer) qs.set("account_server", accountServer);

  const response = await fetch(`${POSITION_ENGINE_BASE}/mt5-status?${qs.toString()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.ok === false) throw new Error(data?.error || data?.reason || `mt5_status_http_${response.status}`);
  return data;
}

export function VIPAutoTrading() {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<VipMeResponse | null>(null);
  const [loginId, setLoginId] = useState("");
  const [server, setServer] = useState("MetaQuotes-Demo");
  const [maxLot, setMaxLot] = useState("0.05");
  const [message, setMessage] = useState("");
  const [mt5Status, setMt5Status] = useState<Mt5StatusResponse | null>(null);
  const [mt5StatusLoading, setMt5StatusLoading] = useState(false);
  const [mt5StatusError, setMt5StatusError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetchMyVip();
    setData(res);
    setLoginId(String(res?.trading_account?.login_id || res?.vip?.mt5_account_login || ""));
    setServer(String(res?.trading_account?.server || "MetaQuotes-Demo"));
    setMaxLot(String(res?.vip?.max_lot || res?.execution?.max_lot || 0.05));
    rememberVipContext(res);
    setLoading(false);
    await loadMt5Status(res);
  }

  async function loadMt5Status(source: VipMeResponse | null = data) {
    setMt5StatusLoading(true);
    setMt5StatusError(null);
    try {
      const status = await fetchVipMt5Status(source, "XAGUSD");
      setMt5Status(status);
    } catch (e: any) {
      setMt5StatusError(e?.message || "Could not load MT5 status");
    } finally {
      setMt5StatusLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onSave() {
    setSaving(true);
    setMessage("");
    const res = await saveMyMt5Account({ login_id: loginId.trim(), server: server.trim(), max_lot: Number(maxLot) || 0.05 });
    setData(res);
    rememberVipContext(res);
    setSaving(false);
    setMessage(res?.ok ? "MT5 account saved. Your VIP token is linked to this account." : (res?.message || "Could not save MT5 account."));
    if (res?.ok) await loadMt5Status(res);
  }

  const user = data?.user;
  const vip = data?.vip;
  const activeVip = isVip(user?.plan) || vip?.active;
  const mt5Item = pickMt5Item(mt5Status);
  const mt5State = tradeState(mt5Item);
  const mt5Entry = asNumber(mt5Item?.entry ?? mt5Item?.fill_price);
  const mt5Sl = asNumber(mt5Item?.sl);
  const mt5Tp = asNumber(mt5Item?.tp);
  const mt5Lot = asNumber(mt5Item?.lot);
  const mt5Profit = asNumber(mt5Item?.profit);

  return (
    <div className="min-h-screen bg-[#050812] text-white pb-24">
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />
      <header className="bg-[#0b1220] border-b border-yellow-500/20 p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowMenu(true)} className="p-2 rounded-lg hover:bg-[#111a2a]"><Menu className="w-5 h-5" /></button>
          <h1 className="font-bold text-xl">VIP Auto Trading</h1>
          <Link to="/app/settings"><button className="p-2 rounded-lg hover:bg-[#111a2a]"><Settings className="w-5 h-5" /></button></Link>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-3xl mx-auto">
        <section className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-orange-500/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-7 h-7 text-yellow-400 mt-1" />
            <div>
              <h2 className="text-lg font-bold">Customer-locked MT5 auto trading</h2>
              <p className="text-sm text-gray-300 mt-1">Your token works only on the MT5 account linked here. If someone shares the token, it will be blocked on another account.</p>
            </div>
          </div>
        </section>

        {loading ? <div className="text-gray-400 p-6">Loading...</div> : null}

        {!loading && !activeVip ? (
          <section className="rounded-2xl border border-yellow-500/20 bg-[#0b1220] p-5 space-y-3">
            <h2 className="font-bold text-xl">VIP required</h2>
            <p className="text-gray-300">Your current plan is <b>{user?.plan || "free"}</b>. Upgrade to VIP Auto to receive a token and connect MetaTrader 5.</p>
            <Link to="/app/vip" className="inline-flex rounded-xl bg-yellow-500 px-4 py-3 font-bold text-black">Upgrade to VIP</Link>
          </section>
        ) : null}

        {!loading && activeVip ? (
          <>
            <section className="rounded-2xl border border-yellow-500/20 bg-[#0b1220] p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-lg">My VIP License</h2>
                  <p className="text-xs text-gray-400">Email: {user?.email || "—"}</p>
                </div>
                <button onClick={load} className="rounded-2xl border border-gray-700 p-2 hover:bg-white/5"><RefreshCw className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Status</div><div className="font-bold text-green-400">{vip?.active ? "Active" : "VIP plan active"}</div></div>
                <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Client ID</div><div className="font-mono break-all">{vip?.client_id || "Not generated yet"}</div></div>
                <div className="rounded-xl bg-black/25 p-3 md:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-gray-400">VIP Token</div>
                      <div className="font-mono break-all">{vip?.token || "Not generated yet"}</div>
                    </div>
                    {vip?.token ? <button onClick={() => navigator.clipboard?.writeText(vip.token || "")} className="rounded-lg border border-gray-700 p-2"><Copy className="w-4 h-4" /></button> : null}
                  </div>
                </div>
                <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Allowed symbols</div><div>{vip?.allowed_symbols || "XAUUSD,XAGUSD"}</div></div>
                <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Max lot</div><div>{vip?.max_lot ?? maxLot}</div></div>
                <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Last seen</div><div>{fmtTime(vip?.last_seen_at)}</div></div>
                <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Expires</div><div>{fmtTime(vip?.expires_at)}</div></div>
              </div>
            </section>

            <section className="rounded-2xl border border-yellow-500/20 bg-[#0b1220] p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-lg">Live EA / MT5 Status</h2>
                  <p className="text-xs text-gray-400">Shows pending orders, open positions and execution reports from MT5.</p>
                </div>
                <button onClick={() => loadMt5Status(data)} className="rounded-2xl border border-gray-700 p-2 hover:bg-white/5" disabled={mt5StatusLoading}><RefreshCw className={`w-4 h-4 ${mt5StatusLoading ? "animate-spin" : ""}`} /></button>
              </div>

              {mt5StatusError ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{mt5StatusError}</div> : null}

              {mt5Item ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-black/25 p-3">
                    <div>
                      <div className="text-xs text-gray-400">Current state</div>
                      <div className="font-bold">{mt5State === "PENDING" ? "Pending order" : mt5State === "OPEN" ? "Open position" : mt5State}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${mt5State === "OPEN" ? "bg-green-500 text-white" : mt5State === "PENDING" ? "bg-yellow-500 text-black" : "bg-gray-600 text-white"}`}>{mt5State}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Symbol</div><div className="font-bold">{mt5Item.symbol || mt5Item.broker_symbol || "—"}</div></div>
                    <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Side</div><div className={String(mt5Item.side).toUpperCase() === "SELL" ? "font-bold text-red-400" : "font-bold text-green-400"}>{mt5Item.side || "—"}</div></div>
                    <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Lot</div><div className="font-bold">{mt5Lot ?? "—"}</div></div>
                    <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Profit</div><div className={mt5Profit !== null && mt5Profit < 0 ? "font-bold text-red-400" : "font-bold text-green-400"}>{mt5Profit !== null ? mt5Profit.toFixed(2) : "—"}</div></div>
                    <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Entry</div><div className="font-bold">{mt5Entry ?? "—"}</div></div>
                    <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">SL</div><div className="font-bold">{mt5Sl ?? "—"}</div></div>
                    <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">TP</div><div className="font-bold">{mt5Tp ?? "—"}</div></div>
                    <div className="rounded-xl bg-black/25 p-3"><div className="text-gray-400">Last report</div><div className="font-bold text-xs">{fmtAnyTime(mt5Item.created_at)}</div></div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-black/25 p-4 text-sm text-gray-300">
                  {mt5StatusLoading ? "Loading MT5 status..." : "No pending order or open position has been reported yet."}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-yellow-500/20 bg-[#0b1220] p-5 space-y-4">
              <div className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-yellow-400" /><h2 className="font-bold text-lg">Link MT5 Account</h2></div>
              <label className="block text-sm text-gray-300">MT5 account login</label>
              <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="5049959887" className="w-full rounded-xl bg-[#0a0e1a] border border-gray-700 px-4 py-3 text-white" />
              <label className="block text-sm text-gray-300">Broker server</label>
              <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="MetaQuotes-Demo" className="w-full rounded-xl bg-[#0a0e1a] border border-gray-700 px-4 py-3 text-white" />
              <label className="block text-sm text-gray-300">Max lot</label>
              <input value={maxLot} onChange={(e) => setMaxLot(e.target.value)} placeholder="0.05" className="w-full rounded-xl bg-[#0a0e1a] border border-gray-700 px-4 py-3 text-white" />
              {message ? <p className="text-sm text-yellow-300">{message}</p> : null}
              <button disabled={saving || !loginId.trim()} onClick={onSave} className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-3 font-bold text-black disabled:opacity-50"><Save className="w-4 h-4" /> {saving ? "Saving..." : "Save MT5 Account"}</button>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

