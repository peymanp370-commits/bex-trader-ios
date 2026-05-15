import { useEffect, useState } from "react";
import { Menu, RefreshCw, Settings, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { SideMenu } from "../components/SideMenu";
import { fetchAdminCustomers, adminGenerateToken } from "../utils/api";

export function Admin() {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [mt5, setMt5] = useState("");
  const [server, setServer] = useState("MetaQuotes-Demo");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetchAdminCustomers();
    setCustomers(res?.customers || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setMsg("");
    const res = await adminGenerateToken({ email, mt5_account_login: mt5, server, max_lot: 0.05, max_trades: 3 });
    setMsg(res?.ok ? `VIP token ready: ${res?.vip?.token || "created"}` : (res?.message || res?.reason || "failed"));
    if (res?.ok) load();
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white pb-24">
      <SideMenu open={showMenu} onClose={() => setShowMenu(false)} />
      <header className="bg-[#0f1623] border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setShowMenu(true)} className="p-2 rounded-lg hover:bg-[#1a2332]"><Menu className="w-5 h-5" /></button>
          <h1 className="font-bold text-xl">Admin</h1>
          <Link to="/app/settings"><button className="p-2 rounded-lg hover:bg-[#1a2332]"><Settings className="w-5 h-5" /></button></Link>
        </div>
      </header>
      <main className="p-4 space-y-4 max-w-5xl mx-auto">
        <section className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 flex gap-3"><Shield className="w-6 h-6 text-yellow-400" /><div><b>Owner tools</b><p className="text-sm text-gray-300">Only role=admin can access these APIs.</p></div></section>
        <section className="rounded-2xl border border-gray-800 bg-[#0f1623] p-5 space-y-3">
          <h2 className="font-bold text-lg">Generate / update customer VIP token</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" className="rounded-xl bg-[#0a0e1a] border border-gray-700 px-4 py-3" />
            <input value={mt5} onChange={(e) => setMt5(e.target.value)} placeholder="MT5 login" className="rounded-xl bg-[#0a0e1a] border border-gray-700 px-4 py-3" />
            <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="Broker server" className="rounded-xl bg-[#0a0e1a] border border-gray-700 px-4 py-3" />
          </div>
          {msg ? <div className="text-sm text-yellow-300">{msg}</div> : null}
          <button onClick={generate} disabled={!email || !mt5} className="rounded-xl bg-yellow-500 text-black font-bold px-4 py-3 disabled:opacity-50">Generate VIP</button>
        </section>
        <section className="rounded-2xl border border-gray-800 bg-[#0f1623] overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex justify-between"><b>Customers</b><button onClick={load}><RefreshCw className="w-4 h-4" /></button></div>
          {loading ? <div className="p-6 text-gray-400">Loading...</div> : null}
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-gray-400"><tr><th className="text-left p-3">Email</th><th className="text-left p-3">Plan</th><th className="text-left p-3">Role</th><th className="text-left p-3">MT5</th><th className="text-left p-3">Token</th><th className="text-left p-3">Seen</th></tr></thead><tbody>{customers.map((c, i) => <tr key={c.id || i} className="border-t border-gray-800"><td className="p-3">{c.email}</td><td className="p-3">{c.plan}</td><td className="p-3">{c.role}</td><td className="p-3">{c.mt5_account_login || c.login_id || "—"}</td><td className="p-3 font-mono max-w-[260px] truncate">{c.token || "—"}</td><td className="p-3">{c.last_seen_at ? new Date(c.last_seen_at).toLocaleString() : "—"}</td></tr>)}</tbody></table></div>
        </section>
      </main>
    </div>
  );
}
