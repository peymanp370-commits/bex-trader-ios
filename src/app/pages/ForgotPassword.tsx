import { useState } from "react";
import { Link } from "react-router-dom";

const AUTH_BASE = (import.meta as any).env?.VITE_API_URL || "https://auth.bextrader.com";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${AUTH_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "Password reset request failed.");
      }
      setMessage(data?.message || "If this email exists, a reset link has been sent.");
    } catch (err: any) {
      setError(String(err?.message || err || "Password reset request failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070b14] px-5 py-10 text-white">
      <section className="mx-auto max-w-md rounded-3xl border border-yellow-500/20 bg-[#101827] p-6 shadow-2xl">
        <h1 className="text-3xl font-black">Forgot Password</h1>
        <p className="mt-3 text-sm leading-6 text-gray-300">
          Enter your BEX Trader email. If the account exists, we will send a secure reset link.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-gray-200" htmlFor="forgot-email">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-yellow-500/20 bg-black/30 px-4 py-3 text-white outline-none focus:border-yellow-400"
            placeholder="you@example.com"
          />

          {message && <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">{message}</div>}
          {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-yellow-500 px-5 py-4 font-black text-black transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <Link to="/login" className="mt-5 inline-block text-sm font-bold text-yellow-300 hover:text-yellow-200">
          Back to Login
        </Link>
      </section>
    </main>
  );
}
