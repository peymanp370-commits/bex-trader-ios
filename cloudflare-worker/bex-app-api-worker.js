// BEX App API Worker
// Purpose: separate public/system stats from customer-private stats and admin tools.
// Bindings required:
// APP_DB -> bex_app_prod
// MT5_DB -> bex_mt5_history
// Optional vars:
// AUTH_BASE=https://auth.bextrader.com
// CORS_ORIGIN=https://bextrader.com

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(env) });

    try {
      if (url.pathname === "/health") {
        return json({
          ok: true,
          worker: "bex-app-api",
          version: "v1.0-role-separated-vip-my-stats-admin",
          hasAPP_DB: !!env.APP_DB,
          hasMT5_DB: !!env.MT5_DB,
          auth_base: authBase(env),
          endpoints: [
            "GET /api/me",
            "GET /api/me/vip",
            "POST /api/me/mt5-account",
            "GET /api/me/trades",
            "GET /api/me/stats",
            "GET /api/admin/customers",
            "POST /api/admin/generate-token",
            "POST /api/admin/disable-token"
          ]
        }, 200, env);
      }

      if (url.pathname === "/api/me") {
        const user = await requireUser(request, env);
        return json({ ok: true, user: publicUser(user) }, 200, env);
      }

      if (url.pathname === "/api/me/vip") {
        const user = await requireUser(request, env);
        const result = await buildVipProfile(env, user);
        return json({ ok: true, user: publicUser(user), ...result }, 200, env);
      }

      if (url.pathname === "/api/me/mt5-account" && method === "POST") {
        const user = await requireUser(request, env);
        const body = await safeJson(request);
        const loginId = clean(body.login_id || body.mt5_account_login || body.account_login);
        const server = clean(body.server || body.broker_server || "MetaQuotes-Demo");
        const maxLot = clampNumber(Number(body.max_lot || 0.05), 0.01, 5);
        const maxTrades = clampInt(body.max_trades, 3, 1, 20);

        if (!loginId) return json({ ok: false, message: "missing_mt5_login" }, 400, env);
        if (!isVipPlan(user.plan)) return json({ ok: false, message: "vip_required" }, 403, env);

        await upsertMt5Account(env, user, { loginId, server });
        await upsertExecutionSettings(env, user, { maxLot, maxTrades });
        await ensureVipToken(env, user, { loginId, maxLot, maxTrades });

        const result = await buildVipProfile(env, user);
        return json({ ok: true, user: publicUser(user), ...result }, 200, env);
      }

      if (url.pathname === "/api/me/trades") {
        const user = await requireUser(request, env);
        const vip = await getActiveVip(env, user.id);
        if (!vip?.mt5_account_login) return json({ ok: true, count: 0, trades: [], note: "no_mt5_account_linked" }, 200, env);
        const limit = clampInt(url.searchParams.get("limit"), 50, 1, 100);
        const rows = await env.MT5_DB.prepare(`
          SELECT *
          FROM mt5_trade_history
          WHERE account_login = ?
          ORDER BY close_time DESC, synced_at DESC
          LIMIT ?
        `).bind(String(vip.mt5_account_login), limit).all();
        return json({ ok: true, count: rows.results?.length || 0, trades: rows.results || [] }, 200, env, 300);
      }

      if (url.pathname === "/api/me/stats") {
        const user = await requireUser(request, env);
        const vip = await getActiveVip(env, user.id);
        if (!vip?.mt5_account_login) return json(emptyStats(null), 200, env, 300);
        const row = await env.MT5_DB.prepare(`
          SELECT
            COUNT(*) AS total_trades,
            SUM(CASE WHEN COALESCE(pnl_net, 0) > 0 THEN 1 ELSE 0 END) AS wins,
            SUM(CASE WHEN COALESCE(pnl_net, 0) < 0 THEN 1 ELSE 0 END) AS losses,
            SUM(CASE WHEN COALESCE(pnl_net, 0) = 0 THEN 1 ELSE 0 END) AS flats,
            SUM(COALESCE(pnl_net, 0)) AS total_pnl,
            AVG(COALESCE(pnl_net, 0)) AS avg_pnl,
            MAX(close_time) AS last_close_time
          FROM mt5_trade_history
          WHERE account_login = ?
            AND status = 'CLOSED'
        `).bind(String(vip.mt5_account_login)).first();
        const total = Number(row?.total_trades || 0);
        const wins = Number(row?.wins || 0);
        return json({
          ok: true,
          account_login: String(vip.mt5_account_login),
          stats: {
            total_trades: total,
            wins,
            losses: Number(row?.losses || 0),
            flats: Number(row?.flats || 0),
            win_rate: total > 0 ? round((wins / total) * 100, 2) : 0,
            total_pnl: round(Number(row?.total_pnl || 0), 2),
            avg_pnl: round(Number(row?.avg_pnl || 0), 2),
            last_close_time: Number(row?.last_close_time || 0) || null
          }
        }, 200, env, 300);
      }

      if (url.pathname === "/api/admin/customers") {
        const admin = await requireAdmin(request, env);
        const rows = await env.APP_DB.prepare(`
          SELECT
            u.id, u.email, u.plan, u.role, u.status, u.is_verified, u.created_at,
            v.client_id, v.token, v.mt5_account_login, v.active AS vip_active, v.allowed_symbols, v.max_lot, v.expires_at, v.last_seen_at,
            t.login_id, t.server
          FROM users u
          LEFT JOIN vip_tokens v ON v.user_id = u.id
          LEFT JOIN user_trading_accounts t ON t.user_id = u.id AND t.platform = 'mt5'
          ORDER BY u.created_at DESC
          LIMIT 300
        `).all();
        return json({ ok: true, admin: publicUser(admin), count: rows.results?.length || 0, customers: rows.results || [] }, 200, env);
      }

      if (url.pathname === "/api/admin/generate-token" && method === "POST") {
        await requireAdmin(request, env);
        const body = await safeJson(request);
        const email = clean(body.email).toLowerCase();
        const loginId = clean(body.mt5_account_login || body.login_id || body.account_login);
        const server = clean(body.server || "MetaQuotes-Demo");
        const maxLot = clampNumber(Number(body.max_lot || 0.05), 0.01, 5);
        const maxTrades = clampInt(body.max_trades, 3, 1, 20);
        if (!email || !loginId) return json({ ok: false, message: "missing_email_or_mt5_login" }, 400, env);

        const user = await env.APP_DB.prepare(`SELECT * FROM users WHERE lower(email)=lower(?) LIMIT 1`).bind(email).first();
        if (!user) return json({ ok: false, message: "user_not_found" }, 404, env);

        await env.APP_DB.prepare(`UPDATE users SET plan='vip_auto', updated_at=? WHERE id=?`).bind(Date.now(), user.id).run();
        const nextUser = { ...user, plan: "vip_auto" };
        await upsertMt5Account(env, nextUser, { loginId, server });
        await upsertExecutionSettings(env, nextUser, { maxLot, maxTrades });
        const vip = await ensureVipToken(env, nextUser, { loginId, maxLot, maxTrades });
        return json({ ok: true, user: publicUser(nextUser), vip }, 200, env);
      }

      if (url.pathname === "/api/admin/disable-token" && method === "POST") {
        await requireAdmin(request, env);
        const body = await safeJson(request);
        const token = clean(body.token);
        if (!token) return json({ ok: false, message: "missing_token" }, 400, env);
        await env.APP_DB.prepare(`UPDATE vip_tokens SET active=0 WHERE token=?`).bind(token).run();
        return json({ ok: true, disabled: true }, 200, env);
      }

      return json({ ok: false, error: "not_found", path: url.pathname }, 404, env);
    } catch (err) {
      const status = Number(err?.status || 500);
      return json({ ok: false, error: err?.message || String(err), reason: err?.reason || null }, status, env);
    }
  }
};

function corsHeaders(env) {
  const origin = env.CORS_ORIGIN || "https://bextrader.com";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };
}

function json(data, status = 200, env = {}, cacheSeconds = 0) {
  const h = { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(env) };
  h["Cache-Control"] = cacheSeconds > 0 ? `private, max-age=${cacheSeconds}` : "no-store";
  return new Response(JSON.stringify(data, null, 2), { status, headers: h });
}

function authBase(env) { return String(env.AUTH_BASE || "https://auth.bextrader.com").replace(/\/+$/, ""); }
function clean(v) { return String(v || "").trim(); }
function round(v, d=2) { const n=Number(v); if(!Number.isFinite(n)) return 0; const f=10**d; return Math.round(n*f)/f; }
function clampNumber(v, lo, hi) { const n=Number(v); return Math.max(lo, Math.min(hi, Number.isFinite(n)?n:lo)); }
function clampInt(v, fallback, lo, hi) { const n=Number(v); const x=Number.isFinite(n)?Math.trunc(n):fallback; return Math.max(lo, Math.min(hi, x)); }
function isVipPlan(plan) { return String(plan || "").toLowerCase().includes("vip"); }
function publicUser(u) { return u ? { id:u.id, email:u.email, first_name:u.first_name, last_name:u.last_name, username:u.username, plan:u.plan, role:u.role || "customer", status:u.status, is_verified:u.is_verified } : null; }
function emptyStats(account_login) { return { ok:true, account_login, stats:{ total_trades:0, wins:0, losses:0, flats:0, win_rate:0, total_pnl:0, avg_pnl:0, last_close_time:null } }; }
async function safeJson(request) { try { return await request.json(); } catch { return {}; } }
function httpError(status, message, reason=message) { const e = new Error(message); e.status=status; e.reason=reason; return e; }

async function requireUser(request, env) {
  if (!env.APP_DB) throw httpError(500, "APP_DB binding missing");

  // Best path: ask auth worker using the original cookies.
  try {
    const res = await fetch(`${authBase(env)}/auth/me`, {
      method: "GET",
      headers: { Cookie: request.headers.get("cookie") || "", Accept: "application/json" }
    });
    const data = await res.json().catch(() => null);
    const au = data?.user;
    if (res.ok && au?.email) {
      const dbUser = await env.APP_DB.prepare(`SELECT * FROM users WHERE lower(email)=lower(?) LIMIT 1`).bind(au.email).first();
      if (dbUser) return dbUser;
      return au;
    }
  } catch (_) {}

  throw httpError(401, "auth_required");
}

async function requireAdmin(request, env) {
  const user = await requireUser(request, env);
  if (String(user.role || "customer").toLowerCase() !== "admin") throw httpError(403, "admin_required");
  return user;
}

async function getActiveVip(env, userId) {
  return await env.APP_DB.prepare(`
    SELECT * FROM vip_tokens
    WHERE user_id=? AND active=1
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(userId).first();
}

async function buildVipProfile(env, user) {
  const vip = await getActiveVip(env, user.id);
  const execution = await env.APP_DB.prepare(`SELECT * FROM user_execution_settings WHERE user_id=? LIMIT 1`).bind(user.id).first();
  const trading = await env.APP_DB.prepare(`SELECT * FROM user_trading_accounts WHERE user_id=? AND platform='mt5' LIMIT 1`).bind(user.id).first();
  return {
    vip: vip ? { active: Number(vip.active || 0) === 1, client_id: vip.client_id, token: vip.token, mt5_account_login: vip.mt5_account_login, allowed_symbols: vip.allowed_symbols, max_lot: Number(vip.max_lot || 0), max_trades: execution?.max_trades ?? null, expires_at: vip.expires_at, last_seen_at: vip.last_seen_at, plan: vip.plan } : null,
    execution: execution || null,
    trading_account: trading || null
  };
}

async function upsertMt5Account(env, user, { loginId, server }) {
  const existing = await env.APP_DB.prepare(`SELECT id FROM user_trading_accounts WHERE user_id=? AND platform='mt5' LIMIT 1`).bind(user.id).first();
  const now = Date.now();
  if (existing) {
    await env.APP_DB.prepare(`UPDATE user_trading_accounts SET login_id=?, server=?, is_active=1, updated_at=? WHERE id=?`).bind(loginId, server, now, existing.id).run();
  } else {
    const id = `uta_${String(user.id).replace(/[^A-Za-z0-9]+/g, "").slice(-16)}_${now}`;
    await env.APP_DB.prepare(`INSERT INTO user_trading_accounts (id,user_id,platform,login_id,server,encrypted_password,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)`).bind(id, user.id, "mt5", loginId, server, "", now, now).run();
  }
}

async function upsertExecutionSettings(env, user, { maxLot, maxTrades }) {
  const now = Date.now();
  await env.APP_DB.prepare(`INSERT OR REPLACE INTO user_execution_settings (user_id,auto_trading_enabled,max_lot,max_trades,risk_mode,updated_at) VALUES (?,1,?,?, 'normal', ?)`).bind(user.id, maxLot, maxTrades, now).run();
}

function tokenPart(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "client"; }
function randomCode() { return crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase(); }

async function ensureVipToken(env, user, { loginId, maxLot, maxTrades }) {
  const existing = await getActiveVip(env, user.id);
  const now = Date.now();
  if (existing) {
    await env.APP_DB.prepare(`UPDATE vip_tokens SET mt5_account_login=?, max_lot=?, active=1 WHERE id=?`).bind(loginId, maxLot, existing.id).run();
    return { ...existing, mt5_account_login: loginId, max_lot: maxLot };
  }
  const name = tokenPart(user.email?.split("@")[0]);
  const id = `vip_${name}_${now}`;
  const clientId = `client_${name}`;
  const token = `bex_vip_${name}_${randomCode()}`;
  const expires = now + 365 * 24 * 60 * 60 * 1000;
  await env.APP_DB.prepare(`INSERT INTO vip_tokens (id,user_id,email,client_id,token,mt5_account_login,active,expires_at,allowed_symbols,max_lot,plan,created_at,last_seen_at) VALUES (?,?,?,?,?,?,1,?,'XAUUSD,XAGUSD',?,'VIP_AUTO',?,NULL)`).bind(id, user.id, user.email, clientId, token, loginId, expires, maxLot, now).run();
  await upsertExecutionSettings(env, user, { maxLot, maxTrades });
  return { id, user_id:user.id, email:user.email, client_id:clientId, token, mt5_account_login:loginId, active:1, expires_at:expires, allowed_symbols:"XAUUSD,XAGUSD", max_lot:maxLot, plan:"VIP_AUTO", created_at:now };
}
