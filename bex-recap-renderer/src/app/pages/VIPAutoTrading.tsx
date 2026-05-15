import { useEffect, useState } from "react";
import { Copy, KeyRound, Menu, RefreshCw, Save, ShieldCheck, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { SideMenu } from "../components/SideMenu";
import { fetchMyVip, saveMyMt5Account, VipMeResponse } from "../utils/api";

function isVip(plan?: string | null) {
  return String(plan || "").toLowerCase().includes("vip");
}

function fmtTime(ms?: number | null) {
  if (!ms) return "—";
  try { return new Date(Number(ms)).toLocaleString(); } catch { return "—"; }
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

  async function load() {
    setLoading(true);
    const res = await fetchMyVip();
    setData(res);
    setLoginId(String(res?.trading_account?.login_id || res?.vip?.mt5_account_login || ""));
    setServer(String(res?.trading_account?.server || "MetaQuotes-Demo"));
    setMaxLot(String(res?.vip?.max_lot || res?.execution?.max_lot || 0.05));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function onSave() {
    setSaving(true);
    setMessage("");
    const res = await saveMyMt5Account({ login_id: loginId.trim(), server: server.trim(), max_lot: Number(maxLot) || 0.05 });
    setData(res);
    setSaving(false);
    setMessage(res?.ok ? "MT5 account saved. Your VIP token is linked to this account." : (res?.message || "Could not save MT5 account."));
  }

  const user = data?.user;
  const vip = data?.vip;
  const activeVip = isVip(user?.plan) || vip?.active;

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white pb-24">
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />
      <header className="bg-[#0f1623] border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowMenu(true)} className="p-2 rounded-lg hover:bg-[#1a2332]"><Menu className="w-5 h-5" /></button>
          <h1 className="font-bold text-xl">VIP Auto Trading</h1>
          <Link to="/app/settings"><button className="p-2 rounded-lg hover:bg-[#1a2332]"><Settings className="w-5 h-5" /></button></Link>
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
          <section className="rounded-2xl border border-gray-800 bg-[#0f1623] p-5 space-y-3">
            <h2 className="font-bold text-xl">VIP required</h2>
            <p className="text-gray-300">Your current plan is <b>{user?.plan || "free"}</b>. Upgrade to VIP Auto to receive a token and connect MetaTrader 5.</p>
            <Link to="/app/vip" className="inline-flex rounded-xl bg-yellow-500 px-4 py-3 font-bold text-black">Upgrade to VIP</Link>
          </section>
        ) : null}

        {!loading && activeVip ? (
          <>
            <section className="rounded-2xl border border-gray-800 bg-[#0f1623] p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-lg">My VIP License</h2>
                  <p className="text-xs text-gray-400">Email: {user?.email || "—"}</p>
                </div>
                <button onClick={load} className="rounded-xl border border-gray-700 p-2 hover:bg-white/5"><RefreshCw className="w-4 h-4" /></button>
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

            <section className="rounded-2xl border border-gray-800 bg-[#0f1623] p-5 space-y-4">
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
