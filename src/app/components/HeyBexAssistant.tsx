import { useRef, useState, useEffect } from "react";

type HeyBexAskResponse = {
  ok?: boolean;
  blocked?: boolean;
  reason?: string;
  reply?: string;
  speak?: boolean;
  intent?: string;
  symbols?: string[];
  data?: Record<string, unknown>;
};

const HEY_BEX_BASE = "https://bex-hey-bex-engine.peymanp370.workers.dev";

function firstLocalStorageValue(keys: string[], fallback = ""): string {
  try {
    for (const key of keys) {
      const value = window.localStorage.getItem(key);
      if (value && String(value).trim()) return String(value).trim();
    }
  } catch {
    // ignore storage issues
  }
  return fallback;
}

function getHeyBexAuth() {
  return {
    token: firstLocalStorageValue([
      "bex_vip_token",
      "vipToken",
      "vip_token",
      "BEX_VIP_TOKEN",
      "bex_vip_token_main",
      "token",
      "auth_token",
      "BEX_TOKEN",
    ]),
    client_id: firstLocalStorageValue([
      "bex_vip_client_id",
      "vipClientId",
      "client_id",
      "clientId",
      "BEX_CLIENT_ID",
    ]),
    account: firstLocalStorageValue([
      "bex_mt5_account_login",
      "mt5_account_login",
      "account_login",
      "mt5Login",
      "loginId",
      "account",
      "BEX_ACCOUNT",
    ]),
  };
}

async function askHeyBex(text: string): Promise<HeyBexAskResponse> {
  const auth = getHeyBexAuth();

  const response = await fetch(`${HEY_BEX_BASE}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      text,
      token: auth.token,
      client_id: auth.client_id,
      account: auth.account,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!data) {
    return {
      ok: false,
      reply: `Hey BEX returned an empty response. HTTP ${response.status}`,
      reason: `http_${response.status}`,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reply: data.reply || data.error || `Hey BEX request failed. HTTP ${response.status}`,
      reason: data.reason || `http_${response.status}`,
      ...data,
    };
  }

  return data;
}

function speakReply(text: string) {
  try {
    if (!text || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  } catch {
    // voice output is optional
  }
}


function normalizeHeyBexVoiceCommand(raw: string): string {
  let text = String(raw || "").trim().replace(/\s+/g, " ");
  if (!text) return "Hey BEX";

  const lower = text.toLowerCase();

  const dangerousTradeCommand =
    /\b(buy|sell)\b/i.test(lower) ||
    /\b(close|open)\s+(trade|position|order|all)\b/i.test(lower) ||
    /\b(change|increase|decrease|set)\s+(risk|lot|lots|volume)\b/i.test(lower) ||
    /\b(disable|enable|turn off|turn on)\s+(guard|trading|trade)\b/i.test(lower);

  if (dangerousTradeCommand) {
    return text
      .replace(/\b(hey|hi|hello)\s+(bex|bixby|bigsby|babes|becks|bucks|apex|rebecca|vex|bexby)\b/gi, "Hey BEX")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^hey\s+BEX/i, "Hey BEX");
  }

  let cleaned = text
    .replace(/\b(hey|hi|hello)\s+(bex|bexx|beck|becks|backs|box|bucks|bix|bicks|vex|babes|babe|base|begs|bags|bixby|bigsby|bix bee|bexby|apex|rebecca)\b/gi, "Hey BEX")
    .replace(/\b(apex|rebecca|bixby|bigsby|bix bee|bexby|babes|becks|bucks|vex)\b/gi, "BEX")
    .replace(/\bhey\s+BEX\s+hey\s+BEX\b/gi, "Hey BEX")
    .replace(/\bhey\s+BEX\s+BEX\b/gi, "Hey BEX")
    .replace(/\s+/g, " ")
    .trim();

  if (!/^hey\s+BEX\b/i.test(cleaned)) {
    cleaned = `Hey BEX ${cleaned}`;
  }

  const l = cleaned.toLowerCase();

  const hasGold =
    /\b(gold|golden|xau|xauusd|tala|tila|talla|talah|talaye|tyler|taylor|tailor|teller|tylar|tiler)\b/i.test(l) ||
    /طلا/.test(cleaned);

  const hasSilver =
    /\b(silver|silvers|xag|xagusd|noghre|noghreh|nogre|nogray|nograyh|no gray|no grey|nugget|nuggets)\b/i.test(l) ||
    /نقره/.test(cleaned);

  const asksPageStatus =
    /\b(what do you see|what you see|do you see|read|read this|read page|read the page|read card|read the card|read cards|screen|card|cards|status|waiting|signal|setup|entry|stop loss|take profit|sl|tp|rr|risk reward|ready|what came|what is ready|bex doing|analysis|analyze|view|overview)\b/i.test(l) ||
    /\b(chi mibini|chi mibine|bekhoon|bekhan|bex chi mibine|vaziyat|entezar|signal|setup|tahlil|bepors|begu chi oomade)\b/i.test(l) ||
    /چی میبینی|بخون|کارت|وضعیت|انتظار|سیگنال|آماده|تحلیل/.test(cleaned);

  const asksCurrency =
    /\b(currency|convert|exchange|cad|eur|gbp|jpy|aed|chf|how much.*in|in canadian|in euro|in pound|be cad|be eur|be dollar|be dolar|be yuro)\b/i.test(l) ||
    /به دلار|به یورو|تبدیل/.test(cleaned);

  const asksDaily =
    /\b(daily|daily summary|today summary|yesterday|profit today|p\/l|win|loss|summary today|today report)\b/i.test(l) ||
    /\b(kholase roozane|bord|bakht|sood|zian|gozaresh roozane)\b/i.test(l) ||
    /خلاصه روزانه|سود|زیان|برد|باخت|روزانه/.test(cleaned);

  const asksMacro =
    /\b(macro|market pulse|bias|session|phase|news|event risk|market context)\b/i.test(l) ||
    /\b(kholase macro|bias|baias|faz|akhbar|market)\b/i.test(l) ||
    /خلاصه ماکرو|بایاس|فاز|اخبار/.test(cleaned);

  const asksPrice =
    /\b(price|rate|quote|value|worth|how much|current price|live price|today price|now price|per ounce|ounce|oz|spot price|check price|show price)\b/i.test(l) ||
    /\b(chand|chande|chandeh|chand shode|gheymat|gheymate|geymat|geymate|ghimat|ghaymat|arzesh|chandler)\b/i.test(l) ||
    /چنده|قیمت|ارزش/.test(cleaned);

  // Important: status/page commands must stay status/page, not price.
  if (asksPageStatus) {
    if (hasGold && hasSilver) return "Hey BEX read the cards";
    if (hasGold) return "Hey BEX what do you see on gold";
    if (hasSilver) return "Hey BEX what do you see on silver";
    return "Hey BEX read the cards";
  }

  if (asksCurrency) {
    const currency =
      /\bcad\b|canadian|canada/i.test(l) ? "CAD" :
      /\beur\b|euro|yuro/i.test(l) ? "EUR" :
      /\bgbp\b|pound/i.test(l) ? "GBP" :
      /\bjpy\b|yen/i.test(l) ? "JPY" :
      /\baed\b|dirham/i.test(l) ? "AED" :
      /\bchf\b|franc/i.test(l) ? "CHF" :
      /\busd\b|dollar|dolar/i.test(l) ? "USD" :
      "CAD";

    if (hasGold && hasSilver) return `Hey BEX gold and silver in ${currency}`;
    if (hasGold) return `Hey BEX gold in ${currency}`;
    if (hasSilver) return `Hey BEX silver in ${currency}`;
  }

  if (asksDaily) return "Hey BEX daily summary";
  if (asksMacro) return "Hey BEX macro summary";

  // Price only when the command is clearly asking price.
  if (asksPrice) {
    if (hasGold && hasSilver) return "Hey BEX check gold and silver";
    if (hasGold) return "Hey BEX gold price";
    if (hasSilver) return "Hey BEX silver price";
  }

  // If it only says gold/silver but no price/status intent, preserve it.
  return cleaned.replace(/^hey\s+BEX/i, "Hey BEX");
}

function getSpeechRecognitionClass(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function getBexHomeContext(): any {
  try {
    return (window as any).__BEX_HOME_CONTEXT__ || null;
  } catch {
    return null;
  }
}

function pageTextLines(): string[] {
  try {
    return String(document.body?.innerText || "")
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter((line) => line.length >= 2)
      .slice(0, 500);
  } catch {
    return [];
  }
}

function fmtMoney(value: unknown, decimals = 2): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function detectCurrencyFromCommand(command: string, fallback?: string): string {
  const text = command.toUpperCase();

  const aliases: Record<string, string> = {
    "CANADIAN DOLLAR": "CAD",
    "CANADIAN": "CAD",
    "CAD": "CAD",
    "EURO": "EUR",
    "EUR": "EUR",
    "POUND": "GBP",
    "GBP": "GBP",
    "YEN": "JPY",
    "JPY": "JPY",
    "DIRHAM": "AED",
    "AED": "AED",
    "FRANC": "CHF",
    "CHF": "CHF",
    "YUAN": "CNY",
    "CNY": "CNY",
    "RUPEE": "INR",
    "INR": "INR",
    "USD": "USD",
    "DOLLAR": "USD",
  };

  for (const [key, value] of Object.entries(aliases)) {
    if (text.includes(key)) return value;
  }

  const code = text.match(/\b[A-Z]{3}\b/)?.[0];
  if (code && code !== "BEX" && code !== "XAU" && code !== "XAG") return code;

  return fallback || "USD";
}

async function fetchFxRateForHeyBex(currency: string): Promise<number | null> {
  if (!currency || currency === "USD") return 1;

  try {
    const res = await fetch(`https://prices.bextrader.com/api/fx/rate?from=USD&to=${encodeURIComponent(currency)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    const rate = Number(data?.rate);
    return data?.ok && Number.isFinite(rate) ? rate : null;
  } catch {
    return null;
  }
}

function symbolFromCommand(command: string): "XAUUSD" | "XAGUSD" | "BOTH" | null {
  const c = command.toLowerCase();

  const gold = /\b(gold|xau|xauusd|tala|tila|talla|talaye|tyler|taylor)\b|طلا/.test(c);
  const silver = /\b(silver|xag|xagusd|noghre|noghreh|nogre|nogray|no gray|no grey)\b|نقره/.test(c);

  if (gold && silver) return "BOTH";
  if (gold) return "XAUUSD";
  if (silver) return "XAGUSD";
  return null;
}

function buildSymbolStatusLine(ctx: any, symbol: "XAUUSD" | "XAGUSD"): string {
  const s = ctx?.symbols?.[symbol];
  const label = symbol === "XAUUSD" ? "Gold" : "Silver";
  const decimals = symbol === "XAGUSD" ? 3 : 2;

  if (!s) return `${label}: I do not have this card data yet.`;

  const price = fmtMoney(s.price, decimals);
  const status = s.statusText || "WAITING";
  const side = s.side || "WAIT";
  const source = s.sourceLabel || "WAITING";

  const hasPlan = s.entry || s.sl || s.tp || s.rr;

  if (!hasPlan) {
    return `${label} is ${status}. Price is ${price} USD. BEX is still waiting; entry, stop loss, take profit, and risk/reward are not ready yet.`;
  }

  return `${label}: ${side}. Status: ${status}. Price: ${price} USD. Entry ${s.entry ?? "—"}, SL ${s.sl ?? "—"}, TP ${s.tp ?? "—"}, RR ${s.rr ?? "—"}. Source: ${source}.`;
}

function buildMacroSummary(ctx: any): string | null {
  const m = ctx?.marketContext;
  if (!m) return null;

  return [
    "Macro summary:",
    `Bias: ${m.bias || "UNKNOWN"}.`,
    `Session: ${m.session || "UNKNOWN"}.`,
    `Phase: ${m.marketPhase || "UNKNOWN"}.`,
    `Volatility: ${m.volatility || "UNKNOWN"}.`,
    `Event risk/news: ${m.news || "UNKNOWN"}.`,
  ].join(" ");
}

function buildDailySummaryFromPage(): string | null {
  const lines = pageTextLines();
  if (!lines.length) return null;

  const dailyIndex = lines.findIndex((line) =>
    /daily summary|خلاصه روزانه|معاملات روز قبل|سود\/زیان|برد|باخت|win|loss|profit|p\/l/i.test(line)
  );

  if (dailyIndex < 0) return null;

  const chunk = lines
    .slice(Math.max(0, dailyIndex - 2), Math.min(lines.length, dailyIndex + 18))
    .filter((line) => !/Hey BEX|Voice Reply|Ask Hey BEX|Trading commands/i.test(line))
    .join(" | ");

  return chunk ? `Daily summary visible on this page: ${chunk}` : null;
}

async function buildCurrencyReply(ctx: any, command: string): Promise<string | null> {
  const symbol = symbolFromCommand(command);
  if (!symbol || symbol === "BOTH") return null;

  const s = ctx?.symbols?.[symbol];
  if (!s?.price) return null;

  const label = symbol === "XAUUSD" ? "Gold" : "Silver";
  const decimals = symbol === "XAGUSD" ? 3 : 2;
  const currency = detectCurrencyFromCommand(command, ctx?.selectedCurrency || "USD");
  const rate = await fetchFxRateForHeyBex(currency);

  if (!rate) {
    return `${label} is ${fmtMoney(s.price, decimals)} USD. I could not load the ${currency} exchange rate right now.`;
  }

  const converted = Number(s.price) * Number(rate);

  if (currency === "USD") {
    return `${label} is ${fmtMoney(s.price, decimals)} USD per ounce.`;
  }

  return `${label} is ${fmtMoney(s.price, decimals)} USD per ounce, about ${fmtMoney(converted, 2)} ${currency}. This is a reference conversion only.`;
}

function buildBexBriefFromVisiblePage(): string {
  const lines = pageTextLines()
    .filter((line) =>
      !/Hey BEX|Ask Hey BEX|Voice Reply|Speak|Trading commands|Phase 1|Phase 2/i.test(line)
    )
    .slice(0, 80);

  const body = lines.join(" | ");

  const goldSeen = /XAUUSD|GOLD|طلا/i.test(body);
  const silverSeen = /XAGUSD|SILVER|نقره/i.test(body);
  const waitingSeen = /WAITING|انتظار|در انتظار/i.test(body);
  const macroSeen = /خلاصه ماکرو|Macro|احساس بازار|فاز بازار|اخبار|نوسان/i.test(body);
  const dailySeen = /خلاصه روزانه|Daily|برد|باخت|سود|زیان|معاملات/i.test(body);

  const parts: string[] = ["BEX brief from visible page:"];

  if (goldSeen) {
    parts.push(waitingSeen
      ? "Gold card is visible and BEX is still waiting. Entry, stop loss, take profit and risk/reward are not ready yet."
      : "Gold card is visible.");
  }

  if (silverSeen) {
    parts.push(waitingSeen
      ? "Silver card is visible and BEX is still waiting. Entry, stop loss, take profit and risk/reward are not ready yet."
      : "Silver card is visible.");
  }

  if (macroSeen) parts.push("Macro summary block is visible on the page.");
  if (dailySeen) parts.push("Daily summary block is visible on the page.");

  if (parts.length === 1) {
    return "BEX brief: I can read the page, but I do not see the Gold/Silver cards clearly yet. Open the Home dashboard and ask again.";
  }

  return parts.join(" ");
}

function buildBexBrief(ctx: any): string {
  const gold = buildSymbolStatusLine(ctx, "XAUUSD");
  const silver = buildSymbolStatusLine(ctx, "XAGUSD");
  const macro = buildMacroSummary(ctx);
  const daily = buildDailySummaryFromPage();

  return [
    "BEX brief:",
    gold,
    silver,
    macro || "Macro summary: I do not see macro context on this page yet.",
    daily || "Daily summary: I do not see a daily summary block on this page yet.",
  ].filter(Boolean).join(" ");
}

async function buildHeyBexPageContextReply(command: string): Promise<string | null> {
  const c = command.toLowerCase();
  const ctx = getBexHomeContext();

  // BEX_DEEP_APP_BRAIN_PAGE_ROUTER
  const deepAppAnswer = buildHeyBexDeepAppAnswer(command);
  if (deepAppAnswer) return deepAppAnswer;

  if (/\b(buy|sell|close|open trade|open position|close all|increase lot|change risk|disable guard)\b/i.test(c)) {
    return null;
  }

  const asksBrief =
    /\b(brief|text brief|quick brief|full brief|summary|full summary|today report|report today|overview|read all|all cards|everything|kholase|kholase bede|gozaresh|gozaresh bede|hame ro bekhoon|hame chi|hamasho bekhoon|hamaro bekhoon)\b/i.test(c) ||
    /خلاصه|گزارش|همه|همشو|همه رو/.test(command);

  if (asksBrief) {
    if (ctx) return buildBexBrief(ctx);
    return buildBexBriefFromVisiblePage();
  }

  const asksCurrency =
    /\b(currency|convert|exchange|cad|eur|gbp|jpy|aed|chf|how much.*in|به دلار|به یورو|تبدیل)\b/i.test(c);

  if (ctx && asksCurrency) {
    const fxReply = await buildCurrencyReply(ctx, command);
    if (fxReply) return fxReply;
  }

  const asksDaily =
    /\b(daily|daily summary|today summary|yesterday|profit today|p\/l|win|loss|برد|باخت|خلاصه روزانه|سود|زیان|روزانه)\b/i.test(c);

  if (asksDaily) {
    const daily = buildDailySummaryFromPage();
    if (daily) return daily;
    return "I do not see a daily summary block on this page yet.";
  }

  const asksMacro =
    /\b(macro|market pulse|bias|session|phase|news|event risk|احساس بازار|خلاصه ماکرو|بایاس|فاز|اخبار)\b/i.test(c);

  if (asksMacro) {
    if (ctx) {
      const macro = buildMacroSummary(ctx);
      if (macro) return macro;
    }
    return buildBexBriefFromVisiblePage();
  }

  const asksPage =
    /\b(what do you see|what you see|do you see|read this|read page|read the page|read card|read the card|read cards|screen|card|cards|status|waiting|signal|setup|entry|sl|tp|rr|ready|analysis|analyze|چی میبینی|بخون|کارت|وضعیت|انتظار|سیگنال|تحلیل)\b/i.test(c);

  const symbol = symbolFromCommand(command);

  if (asksPage) {
    if (ctx && symbol === "XAUUSD") return buildSymbolStatusLine(ctx, "XAUUSD");
    if (ctx && symbol === "XAGUSD") return buildSymbolStatusLine(ctx, "XAGUSD");
    if (ctx) {
      return [
        buildSymbolStatusLine(ctx, "XAUUSD"),
        buildSymbolStatusLine(ctx, "XAGUSD"),
        buildMacroSummary(ctx) || "",
      ].filter(Boolean).join(" ");
    }
    return buildBexBriefFromVisiblePage();
  }

  return null;
}

function detectHeyBexMicMode(command: string): "EN" | "FA" | null {
  const c = String(command || "").toLowerCase();

  if (
    /\b(fa mic|farsi mic|persian mic|mic fa|mic farsi|mic persian|فارسی|میکروفون فارسی)\b/i.test(c)
  ) {
    return "FA";
  }

  if (
    /\b(en mic|english mic|mic en|mic english|انگلیسی|میکروفون انگلیسی)\b/i.test(c)
  ) {
    return "EN";
  }

  return null;
}

function isHeyBexStopCommand(command: string): boolean {
  const c = String(command || "").toLowerCase().trim();

  return (
    /\b(stop|stop talking|shut up|be quiet|quiet|silence|cancel voice|mute|enough)\b/i.test(c) ||
    /\b(bas kon|bass kon|dige nage|dige harf nazan|saket|saket sho|kafiye|khamosh)\b/i.test(c) ||
    /بس کن|ساکت|دیگه نگو|دیگه حرف نزن|خفه|کافیه|خاموش/.test(command)
  );
}

function buildSmartSpokenReply(reply: string, command: string): string {
  let text = String(reply || "").trim();
  const c = String(command || "").toLowerCase();

  if (!text) return "";

  const asksTime =
    /\b(time|date|today|clock|saat|tarikh|rooz)\b/i.test(c) ||
    /ساعت|تاریخ|امروز|روز/.test(command);

  const asksGold =
    /\b(gold|xau|xauusd|tala|tila|tyler|taylor)\b/i.test(c) ||
    /طلا/.test(command);

  const asksSilver =
    /\b(silver|xag|xagusd|noghre|noghreh|nogre|no gray|no grey)\b/i.test(c) ||
    /نقره/.test(command);

  const asksBrief =
    /\b(brief|summary|kholase|gozaresh|read all|all cards)\b/i.test(c) ||
    /خلاصه|گزارش|همه/.test(command);

  const asksCards =
    /\b(cards|read the cards|status|what do you see|waiting|setup|entry|sl|tp|rr)\b/i.test(c) ||
    /وضعیت|کارت|انتظار|سیگنال/.test(command);

  text = text
    .replace(/Trading actions stay disabled in Lite mode\./gi, "")
    .replace(/Trading commands are disabled[^.]*\./gi, "")
    .replace(/This is a reference conversion only\./gi, "Reference conversion.")
    .replace(/\s+/g, " ")
    .trim();

  if (!asksTime) {
    text = text
      .replace(/Toronto date and time[^.]*\./gi, "")
      .replace(/Current Toronto time[^.]*\./gi, "")
      .replace(/Today is[^.]*Toronto[^.]*\./gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  if ((asksGold || asksSilver) && !asksBrief && !asksCards) {
    const parts: string[] = [];

    if (asksGold) {
      const m =
        text.match(/Gold[^.]{0,160}(?:USD|CAD|EUR|GBP|AED|CHF|JPY)[^.]*\.?/i) ||
        text.match(/XAUUSD[^.]{0,160}\.?/i);
      if (m?.[0]) parts.push(m[0]);
    }

    if (asksSilver) {
      const m =
        text.match(/Silver[^.]{0,160}(?:USD|CAD|EUR|GBP|AED|CHF|JPY)[^.]*\.?/i) ||
        text.match(/XAGUSD[^.]{0,160}\.?/i);
      if (m?.[0]) parts.push(m[0]);
    }

    if (parts.length) {
      text = parts.join(" ");
    }
  }

  if (asksBrief || asksCards) {
    text = text
      .replace(/BEX is still waiting; entry, stop loss, take profit, and risk\/reward are not ready yet\./gi, "Still waiting. Entry, stop loss, take profit, and risk reward are not ready.")
      .replace(/Entry, stop loss, take profit and risk\/reward are not ready yet\./gi, "Entry, stop loss, take profit, and risk reward are not ready.")
      .replace(/\s+/g, " ")
      .trim();
  }

  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 2) {
    text = sentences.slice(0, 2).join(" ");
  }

  if (text.length > 230) {
    text = text.slice(0, 227).trim() + "...";
  }

  return text.trim();
}

function getHeyBexRegisteredName(): string {
  try {
    const keys = [
      "bex_user",
      "bexUser",
      "user",
      "profile",
      "vip_user",
      "bex_profile",
      "auth_user"
    ];

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const obj = JSON.parse(raw);
        const name =
          obj?.first_name ||
          obj?.firstName ||
          obj?.name ||
          obj?.displayName ||
          obj?.full_name ||
          obj?.email?.split("@")?.[0];

        if (name && String(name).trim().length >= 2) {
          return String(name).trim().split(/\s+/)[0];
        }
      } catch {
        if (raw.includes("@")) return raw.split("@")[0];
        if (raw.trim().length >= 2 && raw.trim().length <= 24) return raw.trim().split(/\s+/)[0];
      }
    }
  } catch {}

  return "Peyman";
}

function hasHeyBexWakePhrase(input: string): boolean {
  const c = String(input || "").toLowerCase();

  return (
    /\b(hey|hi|hello)\s+(bex|bexx|beck|becks|bix|bixby|bigsby|bexby|vex|apex|rebecca)\b/i.test(c) ||
    /\bhey\s+backs\b/i.test(c) ||
    /هی\s*بکس|هی\s*بکس|هی\s*بکس/.test(input)
  );
}

function stripHeyBexWakePhrase(input: string): string {
  return String(input || "")
    .replace(/\b(hey|hi|hello)\s+(bex|bexx|beck|becks|bix|bixby|bigsby|bexby|vex|apex|rebecca|backs)\b/gi, "")
    .replace(/هی\s*بکس|هی\s*بکس/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectHeyBexWakeModeCommand(command: string): "ON" | "OFF" | null {
  const c = String(command || "").toLowerCase();

  if (
    /\b(wake on|wake mode on|hey bex mode on|hands free on|listen always|always listen)\b/i.test(c) ||
    /\b(bidar sho|goosh bede hamishe|hamishe goosh bede)\b/i.test(c) ||
    /بیدار شو|همیشه گوش بده/.test(command)
  ) {
    return "ON";
  }

  if (
    /\b(wake off|wake mode off|hey bex mode off|hands free off|stop wake|disable wake)\b/i.test(c) ||
    /\b(bidar off|goosh nade|hamishe goosh nade)\b/i.test(c) ||
    /بیدار خاموش|گوش نده/.test(command)
  ) {
    return "OFF";
  }

  return null;
}

function buildHeyBexWakeGreeting(): string {
  return `Hey ${getHeyBexRegisteredName()}, I'm listening.`;
}

function heyBexIsPersian(command: string): boolean {
  return /[\u0600-\u06FF]/.test(String(command || ""));
}

function heyBexText(command: string): string {
  return String(command || "")
    .toLowerCase()
    .replace(/hey\s+bex/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function heyBexHas(command: string, patterns: RegExp[]): boolean {
  const raw = String(command || "");
  const c = heyBexText(raw);
  return patterns.some((p) => p.test(c) || p.test(raw));
}

function buildHeyBexUnknownFallback(command: string): string {
  if (heyBexIsPersian(command)) {
    return "ببخشید، متوجه نشدم یا نمی‌توانم در این مورد کمک کنم. برای کمک به حل مشکل، با پشتیبانی BEX از طریق WhatsApp یا ایمیل support@bextrader.com تماس بگیر.";
  }

  return "Sorry, I could not understand that or I cannot help with this request. For help to fix it, contact BEX Support by WhatsApp or email support@bextrader.com.";
}

function buildHeyBexDeepAppAnswer(command: string): string | null {
  const c = heyBexText(command);
  if (!c) return null;

  // Let live market/page engines handle these, because they need real-time page data.
  const liveMarketQuestion = heyBexHas(command, [
    /\b(gold|xau|xauusd|silver|xag|xagusd|tala|noghre|noghreh|price|chande|gheymat|rate|cad|usd|eur|gbp|time|date)\b/i,
    /\b(cards|read the cards|status|entry|sl|tp|rr|risk reward|brief|macro|daily|waiting|signal ready)\b/i,
    /طلا|نقره|قیمت|چنده|کارت|وضعیت|خلاصه|گزارش|ساعت|تاریخ/
  ]);

  if (liveMarketQuestion) return null;

  if (heyBexHas(command, [
    /\b(help|what can you do|how do you work|guide|commands|features|capabilities|what should i ask)\b/i,
    /\b(rahnama|komak|chi kar mikoni|chi baladi|chi beporsam|che soal)\b/i,
    /راهنما|کمک|چی کار میکنی|چی بلدی|چی بپرسم/
  ])) {
    return "I can help with BEX app questions: Home cards, gold and silver prices, Market, Signals, Stats, Account, VIP plans, Auto Trading, MT5 setup, Settings, Login, Register, password reset, privacy, terms, delete account, and support.";
  }

  if (heyBexHas(command, [
    /\b(home|dashboard|main page|first page|cards|gold card|silver card)\b/i,
    /\b(khane|dashboard|safehe asli|karte tala|karte noghre)\b/i,
    /خانه|داشبورد|صفحه اصلی|کارت طلا|کارت نقره/
  ])) {
    return "Home is your main BEX dashboard. It shows live Gold and Silver cards, price, status, side, entry, stop loss, take profit, risk reward, lot, and market context. If it says waiting, BEX has no ready entry plan yet.";
  }

  if (heyBexHas(command, [
    /\b(market|market page|market overview|market pulse)\b/i,
    /\b(bazar|market|pulse|overview)\b/i,
    /بازار|مارکت/
  ])) {
    return "Market shows the market overview and live market condition. Use it to understand the current environment before reading signals or cards.";
  }

  if (heyBexHas(command, [
    /\b(signal|signals|setup|trade idea|idea)\b/i,
    /\b(signal|setup|ide|trade idea|siginal)\b/i,
    /سیگنال|ستاپ|ایده/
  ])) {
    return "Signals show BEX trade ideas when the system sees a valid setup. If no signal is ready, BEX should wait instead of forcing a trade.";
  }

  if (heyBexHas(command, [
    /\b(stats|public stats|performance|win rate|profit factor|results|history)\b/i,
    /\b(amar|stat|natije|history|winrate|bard|bakht)\b/i,
    /آمار|نتیجه|برد|باخت|عملکرد/
  ])) {
    return "Stats and Results show BEX performance, trades, wins, losses, profit factor, and history. Public Stats is for overall BEX data. Account or My Stats is for your own account data.";
  }

  if (heyBexHas(command, [
    /\b(account|my account|my stats|profile|personal trades)\b/i,
    /\b(hesab|account|profile|amare man|trade haye man)\b/i,
    /حساب|پروفایل|آمار من|معاملات من/
  ])) {
    return "Account shows your personal account information and your own stats when connected. If it does not load, check login, internet, and BEX support.";
  }

  if (heyBexHas(command, [
    /\b(vip|plan|plans|pro|basic|lifetime|upgrade|subscription|purchase|payment|checkout|restore)\b/i,
    /\b(plan|vip|pro|basic|lifetime|kharid|pardakht|restore|eshterak)\b/i,
    /پلن|وی آی پی|خرید|پرداخت|اشتراک|بازیابی خرید/
  ])) {
    return "Plans and VIP show available BEX access levels such as Basic, Pro, VIP, and Lifetime. Use Plans or Checkout to upgrade, purchase, or restore access. If the plan does not update after payment, contact BEX Support.";
  }

  if (heyBexHas(command, [
    /\b(auto trading|autotrading|vip auto|mt5|ea|expert advisor|connect broker|broker|terminal|vps)\b/i,
    /\b(auto trade|auto trading|mt5|ea|vps|broker|terminal|vasl|connect)\b/i,
    /ترید خودکار|متاتریدر|بروکر|وصل|وی پی اس/
  ])) {
    return "VIP Auto Trading is for connecting BEX to MT5, EA, broker, and VPS setup. Voice commands do not open or close trades in Lite mode. Use protected BEX Auto Trading controls and always manage risk.";
  }

  if (heyBexHas(command, [
    /\b(login|log in|sign in|google login|apple login|register|sign up|create account|verify email|verification)\b/i,
    /\b(login|register|sabt nam|sabtenam|vorood|google|apple|verify|email)\b/i,
    /ورود|ثبت نام|ایمیل|تأیید|تایید|گوگل|اپل/
  ])) {
    return "For access problems, use Login or Register. If email verification is required, check your inbox and spam folder. If login still fails, contact BEX Support.";
  }

  if (heyBexHas(command, [
    /\b(password|forgot password|reset password|change password)\b/i,
    /\b(password|ramz|faramoosh|reset)\b/i,
    /رمز|پسورد|فراموش|بازیابی/
  ])) {
    return "Use Forgot Password or Reset Password to recover your account. If the reset email does not arrive, check spam, then contact BEX Support.";
  }

  if (heyBexHas(command, [
    /\b(settings|setting|language|dark mode|light mode|currency|notification|push|theme)\b/i,
    /\b(setting|tanzimat|zaban|currency|arz|dark|light|notification)\b/i,
    /تنظیمات|زبان|ارز|حالت تیره|نوتیفیکیشن|اعلان/
  ])) {
    return "Settings lets you manage language, appearance, support, legal pages, and account preferences. For support, use email support@bextrader.com.";
  }

  if (heyBexHas(command, [
    /\b(privacy|terms|risk disclaimer|legal|delete account|remove account)\b/i,
    /\b(privacy|terms|delete account|hazf hesab|ghanon|legal|risk)\b/i,
    /حریم خصوصی|قوانین|حذف حساب|ریسک|حقوقی/
  ])) {
    return "Privacy, Terms, Risk Disclaimer, and Delete Account are legal and account pages. Use Delete Account only if you want to remove your account data. For help, contact BEX Support first.";
  }

  if (heyBexHas(command, [
    /\b(contact|support|help center|whatsapp|email|telegram|message|fix problem|problem|bug|issue)\b/i,
    /\b(poshtibani|support|whatsapp|email|telegram|moshkel|bug|fix|komak)\b/i,
    /پشتیبانی|مشکل|ایمیل|واتساپ|تلگرام|کمک/
  ])) {
    return "For help, contact BEX Support by WhatsApp or email support@bextrader.com. You can also check the Support section inside Settings.";
  }

  if (heyBexHas(command, [
    /\b(buy|sell|open trade|close trade|close position|increase lot|change risk|trade now)\b/i,
    /\b(bekhar|befroosh|trade bezan|lot|risk|beband|baz kon)\b/i,
    /بخر|بفروش|معامله|لات|ریسک|ببند/
  ])) {
    return "I cannot open, close, or change trades by voice in Lite mode. Trading commands are disabled for safety. Use the protected BEX trading system and risk controls.";
  }

  if (heyBexHas(command, [
    /\b(what is bex|about bex|bex trader|who are you)\b/i,
    /\b(bex chie|bex trader chie|to ki hasti)\b/i,
    /بکس چیه|تو کی هستی/
  ])) {
    return "BEX Trader is an AI trading assistant app focused on Gold and Silver analysis, market cards, signals, stats, VIP tools, and auto-trading support.";
  }

  return null;
}

function buildHeyBexFinalAnswer(reply: string, command: string): string {
  const appAnswer = buildHeyBexDeepAppAnswer(command);
  if (appAnswer) return appAnswer;

  const text = String(reply || "").trim();

  if (!text) {
    return buildHeyBexUnknownFallback(command);
  }

  const generic =
    /Hey, I can check gold price/i.test(text) ||
    /I can check gold price/i.test(text) ||
    /I can read prices/i.test(text) ||
    /try asking/i.test(text) ||
    /did not return a reply/i.test(text) ||
    /empty response/i.test(text) ||
    /could not understand/i.test(text);

  const liveIntent = heyBexHas(command, [
    /\b(gold|xau|silver|xag|price|time|date|cad|usd|cards|brief|macro|daily|status)\b/i,
    /طلا|نقره|قیمت|ساعت|کارت|خلاصه|گزارش/
  ]);

  if (generic && !liveIntent) {
    return buildHeyBexUnknownFallback(command);
  }

  return text;
}

type HeyBexAssistantProps = {
  compact?: boolean;
};

export function HeyBexAssistant({ compact = false }: HeyBexAssistantProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("Hey BEX check gold and silver");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "blocked" | "error">("idle");
  const [voiceOn, setVoiceOn] = useState(true);
  const [micLang, setMicLang] = useState<"EN" | "FA">("EN");
  const [wakeMode, setWakeMode] = useState<boolean>(() => {
    return false;
  });
  const [wokeByVoice, setWokeByVoice] = useState(false);
  const wakeRecognitionRef = useRef<any>(null);
  const wakeCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeCommandRecognitionRef = useRef<any>(null);
  const wokeByVoiceRef = useRef(false);
  const [wakeRestartTick, setWakeRestartTick] = useState(0);
  const recognitionRef = useRef<any>(null);

  const quickPrompts = [
    { label: "Wake ON", value: "Hey BEX wake on" },
    { label: "Wake OFF", value: "Hey BEX wake off" },
    { label: "FA Mic", value: "Hey BEX FA mic" },
    { label: "EN Mic", value: "Hey BEX EN mic" },
    { label: "Brief", value: "Hey BEX brief" },
    { label: "Cards", value: "Hey BEX read the cards" },
    { label: "Macro", value: "Hey BEX macro summary" },
    { label: "Gold CAD", value: "Hey BEX gold in CAD" },
    { label: "Gold", value: "Hey BEX gold price" },
    { label: "Silver", value: "Hey BEX silver price" },
    { label: "Gold + Silver", value: "Hey BEX check gold and silver" },
    { label: "بازار", value: "Hey BEX market status" },
    { label: "Time", value: "Hey BEX today date and time" },
  ];

  function closeWakeSession(delayMs = 0) {
    if (wakeCloseTimerRef.current) {
      clearTimeout(wakeCloseTimerRef.current);
      wakeCloseTimerRef.current = null;
    }

    wakeCloseTimerRef.current = setTimeout(() => {
      try {
        wakeCommandRecognitionRef.current?.stop?.();
      } catch {}

      wokeByVoiceRef.current = false;
      setWokeByVoice(false);
      setOpen(false);
      setText("");
      setReply("");
      setStatus("idle");

      // Force wake listener to restart after every answer/session.
      setTimeout(() => {
        setWakeRestartTick((v) => v + 1); setWakeMode(false);
      }, 600);
    }, delayMs);
  }

  function startHeyBexDirectListenFromClick() {
    const SpeechRecognitionClass = getSpeechRecognitionClass();

    if (!SpeechRecognitionClass) {
      setReply("Your browser does not support voice recognition. Please type your question.");
      setStatus("error");
      setOpen(true);
      return;
    }

    try {
      window.speechSynthesis?.cancel();
    } catch {}

    try {
      wakeCommandRecognitionRef.current?.stop?.();
    } catch {}

    let gotCommand = false;

    const recognition = new SpeechRecognitionClass();
    wakeCommandRecognitionRef.current = recognition;

    recognition.lang = micLang === "FA" ? "fa-IR" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setOpen(true);
    setWakeMode(true);
    setVoiceOn(true);
    setStatus("ok");
    setText("");
    setReply(`Hey ${getHeyBexRegisteredName()}, I'm listening now. Ask your question.`);

    const noQuestionTimer = setTimeout(() => {
      if (!gotCommand) {
        try { recognition.stop(); } catch {}
        setReply("I did not hear a question. Tap Enable Hey BEX and ask again.");
        setStatus("idle");
        setTimeout(() => {
          setOpen(false);
          setWakeMode(false);
        }, 1200);
      }
    }, 9000);

    recognition.onstart = () => {
      setReply(`Hey ${getHeyBexRegisteredName()}, I'm listening now. Ask your question.`);
      setStatus("ok");
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((r: any) => r?.[0]?.transcript || "")
        .join(" ")
        .trim();

      if (!transcript) return;

      gotCommand = true;
      clearTimeout(noQuestionTimer);

      if (typeof isHeyBexStopCommand === "function" && isHeyBexStopCommand(transcript)) {
        try { window.speechSynthesis?.cancel(); } catch {}
        try { recognition.stop(); } catch {}
        setReply("Stopped.");
        setStatus("idle");
        setTimeout(() => {
          setOpen(false);
          setWakeMode(false);
        }, 500);
        return;
      }

      setText(transcript);
      void handleAsk(transcript);
    };

    recognition.onerror = (event: any) => {
      clearTimeout(noQuestionTimer);
      const err = event?.error || "voice_error";

      setReply(`I could not hear clearly. Tap Enable Hey BEX and ask again. Error: ${err}`);
      setStatus("error");

      setTimeout(() => {
        setOpen(false);
        setWakeMode(false);
      }, 1800);
    };

    recognition.onend = () => {
      clearTimeout(noQuestionTimer);

      if (!gotCommand) {
        setTimeout(() => {
          setOpen(false);
          setWakeMode(false);
        }, 1200);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      setReply("Microphone did not start. Tap Enable Hey BEX again and allow microphone access.");
      setStatus("error");
      setTimeout(() => {
        setOpen(false);
        setWakeMode(false);
      }, 1800);
    }
  }

function startWakeCommandListener() {
    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      closeWakeSession(6500);
      return;
    }

    try {
      wakeCommandRecognitionRef.current?.stop?.();
    } catch {}

    let gotCommand = false;
    const recognition = new SpeechRecognitionClass();
    wakeCommandRecognitionRef.current = recognition;

    recognition.lang = micLang === "FA" ? "fa-IR" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const noQuestionTimer = setTimeout(() => {
      if (!gotCommand) {
        try {
          recognition.stop();
        } catch {}
        closeWakeSession(200);
      }
    }, 9000);

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((r: any) => r?.[0]?.transcript || "")
        .join(" ")
        .trim();

      if (!transcript) return;

      gotCommand = true;
      clearTimeout(noQuestionTimer);

      if (typeof isHeyBexStopCommand === "function" && isHeyBexStopCommand(transcript)) {
        try {
          window.speechSynthesis?.cancel();
        } catch {}
        closeWakeSession(100);
        return;
      }

      setText(transcript);
      void handleAsk(transcript);
    };

    recognition.onerror = () => {
      clearTimeout(noQuestionTimer);
      if (!gotCommand) closeWakeSession(800);
    };

    recognition.onend = () => {
      clearTimeout(noQuestionTimer);
      if (!gotCommand) closeWakeSession(800);
    };

    try {
      recognition.start();
      setReply(micLang === "FA"
        ? "دارم گوش می‌دم…"
        : "I'm listening…");
    } catch {
      closeWakeSession(1500);
    }
  }

  function openFromWake(transcript: string) {
    const afterWake = stripHeyBexWakePhrase(transcript);

    try {
      wakeRecognitionRef.current?.stop?.();
    } catch {}

    wokeByVoiceRef.current = true;
    setOpen(true);
    setWokeByVoice(true);
    setStatus("ok");

    if (afterWake && afterWake.length > 2) {
      setText(afterWake);
      setTimeout(() => void handleAsk(afterWake), 350);
      return;
    }

    const greeting = buildHeyBexWakeGreeting();
    setReply(greeting);

    try {
      window.speechSynthesis?.cancel();
    } catch {}

    speakReply(greeting);

    // Give speech a moment, then listen for the real question.
    setTimeout(() => startWakeCommandListener(), 1300);
  }

  useEffect(() => {
    try {
      localStorage.setItem("hey_bex_wake_mode", wakeMode ? "1" : "0");
    } catch {}

    if (!wakeMode) {
      try {
        wakeRecognitionRef.current?.stop?.();
        wakeCommandRecognitionRef.current?.stop?.();
      } catch {}
      return;
    }

    const SpeechRecognitionClass = getSpeechRecognitionClass();
    if (!SpeechRecognitionClass) {
      setReply("Wake mode needs microphone support in this browser.");
      return;
    }

    let cancelled = false;

    const startWakeLoop = () => {
      if (cancelled || !wakeMode || open) return;

      try {
        wakeRecognitionRef.current?.stop?.();
      } catch {}

      const recognition = new SpeechRecognitionClass();
      wakeRecognitionRef.current = recognition;

      recognition.lang = micLang === "FA" ? "fa-IR" : "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results || [])
          .map((r: any) => r?.[0]?.transcript || "")
          .join(" ")
          .trim();

        if (transcript && hasHeyBexWakePhrase(transcript)) {
          openFromWake(transcript);
        }
      };

      recognition.onend = () => {
        if (!cancelled && wakeMode && !open) {
          setTimeout(startWakeLoop, 650);
        }
      };

      recognition.onerror = () => {
        if (!cancelled && wakeMode && !open) {
          setTimeout(startWakeLoop, 900);
        }
      };

      try {
        recognition.start();
      } catch {
        if (!cancelled && wakeMode && !open) {
          setTimeout(startWakeLoop, 1200);
        }
      }
    };

    startWakeLoop();

    return () => {
      cancelled = true;
      try {
        wakeRecognitionRef.current?.stop?.();
      } catch {}
    };
  }, [wakeMode, micLang, open, wakeRestartTick]);

async function handleAsk(customText?: string) {
    const cleanText = (customText ?? text).trim();
    if (!cleanText || loading) return;

    const wakeCommand = detectHeyBexWakeModeCommand(cleanText);
    if (wakeCommand) {
      const turnOn = wakeCommand === "ON";
      setWakeMode(turnOn);
      try {
        localStorage.setItem("hey_bex_wake_mode", turnOn ? "1" : "0");
      } catch {}

      if (turnOn) {
        setVoiceOn(true);
        setReply("Wake mode is ON. The button will hide. Say Hey BEX to call me.");
        setStatus("ok");
        speakReply("Wake mode is on. Say Hey BEX to call me.");
        setTimeout(() => setOpen(false), 1800);
      } else {
        setReply("Wake mode is OFF.");
        setStatus("ok");
        speakReply("Wake mode is off.");
      }
      return;
    }

    if (typeof isHeyBexStopCommand === "function" && isHeyBexStopCommand(cleanText)) {
      try {
        window.speechSynthesis?.cancel();
      } catch {}
      setLoading(false);
      setStatus("idle");
      setReply("Stopped.");
      if (wokeByVoiceRef.current) closeWakeSession(300); else setWakeMode(false);
      return;
    }

    const replyToUser = (message: string, nextStatus: typeof status = "ok", sourceCommand = cleanText) => {
      const finalMessage = typeof compactHeyBexReply === "function"
        ? compactHeyBexReply(message)
        : message;

      setReply(finalMessage);
      setStatus(nextStatus);

      if (voiceOn && finalMessage) {
        const spoken = typeof buildSmartSpokenReply === "function"
          ? buildSmartSpokenReply(finalMessage, sourceCommand)
          : finalMessage;

        if (spoken) speakReply(spoken);
      }

      if (wokeByVoice) {
        closeWakeSession(6500);
      }
    };

    const requestedMicLang = typeof detectHeyBexMicMode === "function"
      ? detectHeyBexMicMode(cleanText)
      : null;

    if (requestedMicLang) {
      setMicLang(requestedMicLang);

      const msg = requestedMicLang === "FA"
        ? "FA Mic is ON."
        : "EN Mic is ON.";

      replyToUser(msg, "ok", cleanText);
      return;
    }

    setLoading(true);
    setReply("");
    setStatus("idle");

    try {
      const rawPageReply = await buildHeyBexPageContextReply(cleanText);
      if (rawPageReply) {
        replyToUser(rawPageReply, "ok", cleanText);
        return;
      }

      const commandText = normalizeHeyBexVoiceCommand(cleanText);
      if (commandText !== text) setText(commandText);

      const localPageReply = await buildHeyBexPageContextReply(commandText);
      if (localPageReply) {
        replyToUser(localPageReply, "ok", commandText);
        return;
      }

      const data = await askHeyBex(commandText);
      const message = buildHeyBexFinalAnswer(data.reply || "Hey BEX did not return a reply.", commandText);

      if (data.blocked) replyToUser(message, "blocked", commandText);
      else if (data.ok) replyToUser(message, "ok", commandText);
      else replyToUser(message, "error", commandText);
    } catch (error) {
      replyToUser(buildHeyBexFinalAnswer(error instanceof Error ? error.message : "Hey BEX connection failed.", cleanText), "error", cleanText);
    } finally {
      setLoading(false);
    }
  }

  function stopListening() {
    try {
      recognitionRef.current?.stop?.();
      recognitionRef.current?.abort?.();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setListening(false);
  }

  function startListening() {
    if (listening) {
      stopListening();
      return;
    }

    const SpeechRecognition = getSpeechRecognitionClass();

    if (!SpeechRecognition) {
      setStatus("error");
      setReply("Voice input is not supported in this browser. Use Chrome or type the command.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();

      recognition.lang = micLang === "FA" ? "fa-IR" : "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setReply(getHeyBexListeningHint(micLang));
        setStatus("idle");
      };

      recognition.onerror = (event: any) => {
        setListening(false);
        const errorName = event?.error || "unknown";
        setStatus("error");
        setReply(`Voice input failed: ${errorName}. You can still type the command.`);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.onresult = (event: any) => {
        const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();

        if (!transcript) {
          setStatus("error");
          setReply("I could not hear a command. Try again or type it.");
          return;
        }

        const finalText = normalizeHeyBexVoiceCommand(transcript);

        setText(finalText);
        setReply(`Heard: ${finalText}`);
        setStatus("idle");

        setTimeout(() => {
          void handleAsk(finalText);
        }, 250);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      setListening(false);
      setStatus("error");
      setReply(error instanceof Error ? error.message : "Could not start microphone.");
    }
  }

  const bottomClass = compact ? "bottom-5" : "bottom-24";

// BEX_ENABLE_TO_ARM_GUARD
  if (!wakeMode && !open) {
    return (
      <button
        type="button"
        onClick={() => {
          startHeyBexDirectListenFromClick();
        }}
        className="fixed bottom-24 right-5 z-[9999] rounded-full border border-emerald-400/40 bg-black/90 px-4 py-3 text-sm font-semibold text-emerald-200 shadow-2xl shadow-emerald-500/20 backdrop-blur-xl"
        aria-label="Enable Hey BEX"
      >
        Enable Hey BEX
      </button>
    );
  }

  if (wakeMode && !open) {
    setTimeout(() => setWakeMode(false), 50);
    return null;
  }
// BEX_ENABLE_TO_ARM_GUARD_END
return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed ${bottomClass} right-5 z-[60] grid h-[76px] w-[76px] place-items-center overflow-hidden rounded-full border border-yellow-400/35 bg-[radial-gradient(circle_at_32%_24%,rgba(255,218,59,0.42),rgba(13,14,17,0.98)_58%,rgba(0,0,0,1))] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_18px_55px_rgba(0,0,0,0.65),0_0_38px_rgba(255,204,0,0.24)] ring-1 ring-yellow-300/15 transition hover:scale-[1.03] active:scale-95`}
        aria-label="Open Hey BEX assistant"
      >
        <span className="absolute inset-[-8px] rounded-full border border-yellow-400/20 opacity-70" />
        <span className="absolute inset-[-16px] rounded-full border border-yellow-400/10 opacity-50" />
        <span className="absolute left-3 top-3 h-3 w-3 rounded-full bg-yellow-300/90 blur-[1px]" />
        <span className="relative flex flex-col items-center justify-center leading-none">
          <span className="text-[10px] font-black tracking-[0.22em] text-yellow-300">HEY</span>
          <span className="mt-1 text-[19px] font-black tracking-tight text-white">BEX</span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#080b12] p-4 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  try {
                    window.speechSynthesis?.cancel();
                  } catch {
                    // ignore
                  }
                  setOpen(false);
                }}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-2xl leading-none text-white"
                aria-label="Close Hey BEX"
              >
                ×
              </button>

              <div className="text-right">
                <div className="text-2xl font-black tracking-tight">Hey BEX</div>
                <div className="mt-1 text-xs font-semibold text-gray-400">
                  Phase 2 Lite · Voice / Cards / Brief / Macro / FX
                </div>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap justify-end gap-2">
              {quickPrompts.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setText(item.value)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-gray-100 active:scale-95"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              dir="ltr"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-3 text-left text-sm text-white outline-none placeholder:text-gray-500 focus:border-yellow-400/50"
              placeholder="Type or speak: Hey BEX check gold and silver"
            />

            <div className="mt-3 grid grid-cols-[1fr_1fr] gap-2">
              <button
                type="button"
                onClick={startListening}
                disabled={loading}
                className={`min-h-[46px] rounded-2xl border px-4 py-3 text-sm font-black transition active:scale-95 ${
                  listening
                    ? "border-red-400/50 bg-red-500/15 text-red-100"
                    : "border-yellow-400/40 bg-yellow-400/10 text-yellow-200"
                }`}
              >
                {listening ? "Listening..." : "🎙 Speak"}
              </button>

              <button
                type="button"
                onClick={() => handleAsk()}
                disabled={loading || listening}
                className="min-h-[46px] rounded-2xl bg-white px-4 py-3 text-sm font-black text-black disabled:opacity-60"
              >
                {loading ? "Checking..." : "Ask Hey BEX"}
              </button>
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={() => setVoiceOn((value) => !value)}
                className={`min-h-[40px] w-full rounded-2xl border px-4 py-2 text-xs font-black ${
                  voiceOn
                    ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-200"
                    : "border-white/10 bg-white/5 text-gray-300"
                }`}
              >
                {voiceOn ? "Voice Reply ON" : "Voice Reply OFF"}
              </button>
            </div>

            {reply && (
              <div
                dir="ltr"
                className={`mt-3 rounded-2xl border p-3 text-left text-sm leading-relaxed ${
                  status === "blocked"
                    ? "border-yellow-400/35 bg-yellow-400/10 text-yellow-100"
                    : status === "ok"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                      : status === "error"
                        ? "border-red-400/30 bg-red-400/10 text-red-100"
                        : "border-white/10 bg-white/5 text-gray-200"
                }`}
              >
                {reply}
              </div>
            )}

            <div
              dir="ltr"
              className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left text-[11px] leading-relaxed text-gray-400"
            >
              Hey BEX can read prices, cards, market status, macro summary, daily summary, and currency conversion. Trading actions stay disabled in Lite mode.
            </div>
          </div>
        </div>
      )}
    </>
  );
}





























