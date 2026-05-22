/*
 * BEX Channel Scalp Engine v1.0.0 - SHADOW ONLY
 * Setup: CHANNEL_SCALP / SLOPING_RANGE_CHANNEL_SCALP
 * Purpose: detect sloping range channels from recent candles and return shadow/probe candidates.
 * Safety: default PHASE=shadow, ALLOW_LIVE=0. This worker does NOT execute trades.
 */

export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);
    const method = (request.method || 'GET').toUpperCase();

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

    try {
      if (url.pathname === '/health') {
        return json({
          ok: true,
          worker: 'bex-channel-scalp-engine',
          version: 'v1.0.0-shadow',
          phase: getPhase(env),
          live_enabled: liveEnabled(env),
          endpoints: ['/health', 'POST /analyze', 'GET /analyze?symbol=XAGUSD&tf=15m&limit=80', 'POST /shadow-log']
        });
      }

      if (url.pathname === '/analyze') {
        const body = method === 'POST' ? await safeJson(request) : {};
        const symbol = normalizeSymbol(url.searchParams.get('symbol') || body?.symbol || 'XAUUSD');
        const tf = String(url.searchParams.get('tf') || body?.tf || body?.timeframe || '15m').toLowerCase();
        const limit = clampInt(url.searchParams.get('limit') || body?.limit, 80, 40, 160);

        let candles = normalizeCandles(body?.candles || body?.data || []);
        let candle_source = candles.length ? 'body' : 'none';

        if (!candles.length) {
          const fetched = await fetchCandles(env, { symbol, tf, limit });
          candles = fetched.candles;
          candle_source = fetched.source;
        }

        if (candles.length < 40) {
          return json({
            ok: false,
            setup_type: 'CHANNEL_SCALP',
            symbol,
            tf,
            reason: 'not_enough_candles',
            candle_count: candles.length,
            min_required: 40
          }, 200);
        }

        const result = analyzeChannelScalp(env, { symbol, tf, candles: candles.slice(-limit) });
        result.candle_source = candle_source;
        result.phase = getPhase(env);
        result.live_enabled = liveEnabled(env);

        if (env.DB && shouldShadowLog(env)) {
          await ensureChannelTables(env.DB).catch(() => null);
          await insertShadowLog(env.DB, result).catch(() => null);
        }

        return json(result, 200);
      }

      if (url.pathname === '/shadow-log' && method === 'POST') {
        if (!env.DB) return json({ ok: false, error: 'DB missing' }, 400);
        const body = await safeJson(request);
        await ensureChannelTables(env.DB);
        await insertShadowLog(env.DB, body);
        return json({ ok: true, stored: true });
      }

      return json({ ok: false, error: 'not_found', path: url.pathname }, 404);
    } catch (err: any) {
      return json({ ok: false, error: err?.message || String(err) }, 500);
    }
  }
};

function analyzeChannelScalp(env: any, input: any) {
  const symbol = normalizeSymbol(input.symbol);
  const tf = input.tf || '15m';
  const candles = input.candles || [];
  const closes = candles.map((c: any) => c.close);
  const highs = candles.map((c: any) => c.high);
  const lows = candles.map((c: any) => c.low);
  const last = candles[candles.length - 1];
  const price = Number(last.close);
  const atr = calcAtr(candles, 14);

  const center = linearRegression(closes);
  const residuals = closes.map((c: number, i: number) => c - predict(center, i));
  const dev = std(residuals) || (atr * 0.7) || 0;
  const width = Math.max(dev * 2.0, atr * 1.2);

  const n = candles.length;
  const centerNow = predict(center, n - 1);
  const upper = centerNow + width;
  const lower = centerNow - width;
  const middle = centerNow;
  const channelWidth = Math.max(upper - lower, 0.000001);
  const pricePosition = clamp((price - lower) / channelWidth, 0, 1);

  const slopePerBar = center.slope;
  const slopeAtrPerBar = atr > 0 ? slopePerBar / atr : 0;
  const absSlopeAtr = Math.abs(slopeAtrPerBar);
  const direction = slopePerBar > 0 ? 'ASCENDING' : slopePerBar < 0 ? 'DESCENDING' : 'FLAT';

  const inside = candles.filter((c: any, i: number) => {
    const mid = predict(center, i);
    return c.high <= mid + width * 1.15 && c.low >= mid - width * 1.15;
  }).length;
  const insideRatio = inside / n;

  const swings = findSwings(candles, 2);
  const touchAtr = atr > 0 ? atr * 0.35 : channelWidth * 0.08;
  const upperTouches = swings.highs.filter((s: any) => Math.abs(s.price - (predict(center, s.index) + width)) <= touchAtr).length;
  const lowerTouches = swings.lows.filter((s: any) => Math.abs(s.price - (predict(center, s.index) - width)) <= touchAtr).length;
  const touches = upperTouches + lowerTouches;

  const outsideNowAtr = atr > 0
    ? (price > upper ? (price - upper) / atr : price < lower ? (lower - price) / atr : 0)
    : 0;

  const breakoutRisk = outsideNowAtr > getNum(env, 'CHANNEL_OUTSIDE_INVALID_ATR', 0.20)
    ? 'HIGH'
    : (pricePosition > 0.94 || pricePosition < 0.06 ? 'MEDIUM' : 'LOW');

  const quality = scoreChannelQuality({
    insideRatio,
    touches,
    upperTouches,
    lowerTouches,
    absSlopeAtr,
    breakoutRisk,
    widthAtr: atr > 0 ? channelWidth / atr : null
  });

  const minQuality = symbol === 'XAGUSD'
    ? getNum(env, 'XAG_CHANNEL_MIN_QUALITY', 70)
    : getNum(env, 'XAU_CHANNEL_MIN_QUALITY', 68);
  const minTouches = getNum(env, 'CHANNEL_MIN_TOUCHES', 4);
  const minInside = getNum(env, 'CHANNEL_MIN_INSIDE_RATIO', 0.70);
  const maxSlope = getNum(env, 'CHANNEL_MAX_SLOPE_ATR_PER_BAR', 0.08);
  const minRR = getNum(env, 'CHANNEL_MIN_RR', 1.20);

  let side: 'BUY' | 'SELL' | null = null;
  if ((direction === 'DESCENDING' || direction === 'FLAT') && pricePosition >= getNum(env, 'CHANNEL_ENTRY_SELL_POSITION', 0.75)) side = 'SELL';
  if ((direction === 'ASCENDING' || direction === 'FLAT') && pricePosition <= getNum(env, 'CHANNEL_ENTRY_BUY_POSITION', 0.25)) side = 'BUY';

  const slBuffer = atr * getNum(env, 'CHANNEL_SL_BUFFER_ATR', 0.18);
  let entry = price;
  let sl = 0;
  let tp = 0;
  let tp2 = 0;

  if (side === 'SELL') {
    sl = upper + slBuffer;
    tp = middle;
    tp2 = lower;
  } else if (side === 'BUY') {
    sl = lower - slBuffer;
    tp = middle;
    tp2 = upper;
  }

  const rr = side ? calcRR(entry, sl, tp) : null;
  const detected = quality >= minQuality && touches >= minTouches && insideRatio >= minInside && absSlopeAtr <= maxSlope && breakoutRisk !== 'HIGH';
  const entryReady = !!(detected && side && rr !== null && rr >= minRR);

  const confidence = clamp(Math.round(quality * 0.65 + (entryReady ? 12 : 0) + (breakoutRisk === 'LOW' ? 8 : 0)), 1, 100);
  const posture = confidence >= 65 ? 'PROBE' : 'SHADOW';
  const canLive = liveEnabled(env) && posture === 'PROBE' && confidence >= (symbol === 'XAGUSD' ? getNum(env, 'XAG_MIN_CONF_LIVE', 62) : getNum(env, 'XAU_MIN_CONF_LIVE', 58));

  const candidate = entryReady ? {
    setup_type: 'CHANNEL_SCALP',
    setup_family: 'SLOPING_RANGE_CHANNEL_SCALP',
    symbol,
    side,
    confidence,
    entry: round(entry, digitsFor(symbol)),
    sl: round(sl, digitsFor(symbol)),
    tp: round(tp, digitsFor(symbol)),
    tp2: round(tp2, digitsFor(symbol)),
    rr: rr ? round(rr, 3) : null,
    entry_mode: 'LIMIT_OR_MARKET',
    execution_posture: posture,
    management_profile: 'FAST_SCALP_5M_RECHECK',
    allow_live_execution: canLive,
    channel: null as any
  } : null;

  const channel = {
    detected,
    direction,
    quality_score: round(quality, 2),
    slope: round(slopePerBar, 6),
    slope_atr_per_bar: round(slopeAtrPerBar, 4),
    width: round(channelWidth, digitsFor(symbol)),
    width_atr: atr > 0 ? round(channelWidth / atr, 3) : null,
    upper: round(upper, digitsFor(symbol)),
    middle: round(middle, digitsFor(symbol)),
    lower: round(lower, digitsFor(symbol)),
    price_position: round(pricePosition, 3),
    inside_ratio: round(insideRatio, 3),
    touches,
    upper_touches: upperTouches,
    lower_touches: lowerTouches,
    breakout_risk: breakoutRisk,
    outside_now_atr: round(outsideNowAtr, 3),
    atr: round(atr, digitsFor(symbol))
  };
  if (candidate) candidate.channel = channel;

  return {
    ok: true,
    worker: 'bex-channel-scalp-engine',
    version: 'v1.0.0-shadow',
    symbol,
    tf,
    candle_count: candles.length,
    setup_type: 'CHANNEL_SCALP',
    channel,
    entry_ready: entryReady,
    signal_candidate: candidate,
    decision: candidate ? (canLive ? 'LIVE_PROBE_READY' : 'SHADOW_OR_PROBE_ONLY') : 'NO_CHANNEL_SCALP',
    reason: !detected ? 'channel_not_quality_enough' : (!side ? 'price_not_near_channel_edge' : (!rr || rr < minRR ? 'rr_below_minimum' : 'channel_scalp_ready')),
    policy: {
      phase: getPhase(env),
      live_enabled: liveEnabled(env),
      min_quality: minQuality,
      min_touches: minTouches,
      min_inside_ratio: minInside,
      max_slope_atr_per_bar: maxSlope,
      min_rr: minRR
    },
    created_at: Date.now()
  };
}

function scoreChannelQuality(x: any) {
  let score = 0;
  score += clamp(x.insideRatio * 40, 0, 40);
  score += clamp(x.touches * 7, 0, 28);
  if (x.upperTouches >= 2 && x.lowerTouches >= 2) score += 12;
  score += clamp((0.10 - x.absSlopeAtr) / 0.10 * 10, 0, 10);
  if (x.breakoutRisk === 'LOW') score += 10;
  else if (x.breakoutRisk === 'MEDIUM') score += 4;
  if (x.widthAtr != null && x.widthAtr >= 1.2 && x.widthAtr <= 5.5) score += 6;
  return clamp(score, 0, 100);
}

async function fetchCandles(env: any, input: any) {
  const { symbol, tf, limit } = input;
  const paths = [
    `/candles?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&limit=${limit}`,
    `/history?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&limit=${limit}`,
    `/run?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&limit=${limit}`
  ];
  const bindings = [env.CANDLES, env.MTF_ENGINE, env.HISTORY_INGEST].filter(Boolean);
  for (const b of bindings) {
    if (!b || typeof b.fetch !== 'function') continue;
    for (const path of paths) {
      try {
        const res = await b.fetch(`https://internal${path}`, { headers: { accept: 'application/json' } });
        const data = await res.json().catch(() => null);
        const candles = normalizeCandles(data?.candles || data?.items || data?.data || data?.rows || []);
        if (candles.length) return { candles, source: `binding:${path}` };
      } catch (_) {}
    }
  }
  const base = String(env.CANDLES_URL || env.MTF_ENGINE_URL || '').replace(/\/+$/, '');
  if (base) {
    try {
      const res = await fetch(`${base}/candles?symbol=${encodeURIComponent(symbol)}&tf=${encodeURIComponent(tf)}&limit=${limit}`, { headers: { accept: 'application/json' } });
      const data = await res.json().catch(() => null);
      const candles = normalizeCandles(data?.candles || data?.items || data?.data || data?.rows || []);
      if (candles.length) return { candles, source: 'http:CANDLES_URL' };
    } catch (_) {}
  }
  return { candles: [], source: 'missing_candles_source' };
}

function normalizeCandles(rows: any[]) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r: any) => ({
    time: r.time || r.ts || r.timestamp || r.open_time || null,
    open: Number(r.open ?? r.o),
    high: Number(r.high ?? r.h),
    low: Number(r.low ?? r.l),
    close: Number(r.close ?? r.c)
  })).filter((c: any) => [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.high >= c.low);
}

function linearRegression(values: number[]) {
  const n = values.length;
  const sx = (n - 1) * n / 2;
  const sy = values.reduce((a, b) => a + b, 0);
  const sxx = (n - 1) * n * (2 * n - 1) / 6;
  const sxy = values.reduce((a, y, x) => a + x * y, 0);
  const denom = n * sxx - sx * sx;
  const slope = denom ? (n * sxy - sx * sy) / denom : 0;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}
function predict(model: any, x: number) { return model.intercept + model.slope * x; }
function std(values: number[]) { const m = values.reduce((a,b)=>a+b,0)/Math.max(values.length,1); return Math.sqrt(values.reduce((a,b)=>a+(b-m)*(b-m),0)/Math.max(values.length,1)); }
function calcAtr(candles: any[], period = 14) {
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i-1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  const tail = trs.slice(-period);
  return tail.length ? tail.reduce((a,b)=>a+b,0)/tail.length : 0;
}
function findSwings(candles: any[], leftRight = 2) {
  const highs: any[] = [], lows: any[] = [];
  for (let i = leftRight; i < candles.length - leftRight; i++) {
    let isHigh = true, isLow = true;
    for (let j = i - leftRight; j <= i + leftRight; j++) {
      if (j === i) continue;
      if (candles[i].high < candles[j].high) isHigh = false;
      if (candles[i].low > candles[j].low) isLow = false;
    }
    if (isHigh) highs.push({ index: i, price: candles[i].high });
    if (isLow) lows.push({ index: i, price: candles[i].low });
  }
  return { highs, lows };
}
function calcRR(entry: number, sl: number, tp: number) { const risk = Math.abs(entry - sl); const reward = Math.abs(tp - entry); return risk > 0 ? reward / risk : null; }
function normalizeSymbol(s: string) { const v = String(s || '').toUpperCase().trim(); if (v.includes('XAG') || v.includes('SILVER')) return 'XAGUSD'; if (v.includes('XAU') || v.includes('GOLD')) return 'XAUUSD'; return v || 'XAUUSD'; }
function digitsFor(symbol: string) { return normalizeSymbol(symbol) === 'XAUUSD' ? 2 : 3; }
function round(n: number, d = 2) { const p = Math.pow(10, d); return Math.round(Number(n) * p) / p; }
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, Number(n))); }
function clampInt(v: any, def: number, min: number, max: number) { const n = Number(v); return Math.trunc(clamp(Number.isFinite(n) ? n : def, min, max)); }
function getNum(env: any, key: string, fallback: number) { const n = Number(env?.[key]); return Number.isFinite(n) ? n : fallback; }
function getPhase(env: any) { return String(env.CHANNEL_SCALP_PHASE || env.PHASE || 'shadow').toLowerCase(); }
function liveEnabled(env: any) { return ['1','true','yes','on'].includes(String(env.ALLOW_CHANNEL_SCALP_LIVE || '0').toLowerCase()) && getPhase(env) === 'live'; }
function shouldShadowLog(env: any) { return !['0','false','off','no'].includes(String(env.CHANNEL_SCALP_SHADOW_LOG || '1').toLowerCase()); }
async function safeJson(request: Request) { try { return await request.json(); } catch { return {}; } }
function corsHeaders() { return { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization,x-bex-vip-token,x-bex-client-id' }; }
function json(obj: any, status = 200) { return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders(), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }

async function ensureChannelTables(db: any) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS channel_scalp_shadow_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT,
    timeframe TEXT,
    detected INTEGER,
    direction TEXT,
    side TEXT,
    confidence REAL,
    quality_score REAL,
    price_position REAL,
    breakout_risk TEXT,
    rr REAL,
    decision TEXT,
    reason TEXT,
    payload_json TEXT,
    created_at INTEGER
  )`).run();
}
async function insertShadowLog(db: any, result: any) {
  const c = result?.channel || {};
  const cand = result?.signal_candidate || {};
  await db.prepare(`INSERT INTO channel_scalp_shadow_logs
    (symbol,timeframe,detected,direction,side,confidence,quality_score,price_position,breakout_risk,rr,decision,reason,payload_json,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      result.symbol || null,
      result.tf || null,
      c.detected ? 1 : 0,
      c.direction || null,
      cand.side || null,
      cand.confidence ?? null,
      c.quality_score ?? null,
      c.price_position ?? null,
      c.breakout_risk || null,
      cand.rr ?? null,
      result.decision || null,
      result.reason || null,
      JSON.stringify(result || {}),
      Date.now()
    ).run();
}
