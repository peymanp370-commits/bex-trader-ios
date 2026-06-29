import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, TrendingUp, Server, Copy, Zap, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getLanguage, tr } from "../utils/i18n";
import { AppHeader } from "../components/AppHeader";

type SymbolName = "XAUUSD" | "XAGUSD";
type VolumeMode = "AUTO" | "MANUAL";

function toNumber(value: string): number | null {
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getPipValuePerLot(symbol: SymbolName): number {
  return symbol === "XAGUSD" ? 50 : 10;
}

function generateBridgeToken() {
  return `bex_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function Tools() {
  const navigate = useNavigate();
  const lang = getLanguage();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });

  const [symbol, setSymbol] = useState<SymbolName>("XAUUSD");
  const [balance, setBalance] = useState(() => localStorage.getItem("bex.account.balance") || "1000");
  const [riskPercent, setRiskPercent] = useState(() => localStorage.getItem("bex.risk.percent") || "1");
  const [stopLossPips, setStopLossPips] = useState("30");
  const [lotInput, setLotInput] = useState("0.01");
  const [pipsInput, setPipsInput] = useState("30");

  const [mt5Login, setMt5Login] = useState(() => localStorage.getItem("bex.mt5.login") || "");
  const [mt5Server, setMt5Server] = useState(() => localStorage.getItem("bex.mt5.server") || "");
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(() => localStorage.getItem("bex.autoTrade.enabled") === "1");
  const [volumeMode, setVolumeMode] = useState<VolumeMode>(() =>
    localStorage.getItem("bex.volume.mode") === "MANUAL" ? "MANUAL" : "AUTO"
  );
  const [manualLot, setManualLot] = useState(() => localStorage.getItem("bex.manual.lot") || "0.01");
  const [maxLot, setMaxLot] = useState(() => localStorage.getItem("bex.max.lot") || "0.05");
  const [bridgeToken] = useState(() => {
    const saved = localStorage.getItem("bex.bridge.token");
    if (saved) return saved;
    const token = generateBridgeToken();
    localStorage.setItem("bex.bridge.token", token);
    return token;
  });

  const pipValuePerLot = getPipValuePerLot(symbol);

  const riskAmount = useMemo(() => {
    const b = toNumber(balance);
    const r = toNumber(riskPercent);
    if (!b || !r) return null;
    return (b * r) / 100;
  }, [balance, riskPercent]);

  const suggestedLot = useMemo(() => {
    const risk = riskAmount;
    const sl = toNumber(stopLossPips);
    if (!risk || !sl) return null;
    return Math.max(0.01, risk / (sl * pipValuePerLot));
  }, [riskAmount, stopLossPips, pipValuePerLot]);

  const pipValue = useMemo(() => {
    const lot = toNumber(lotInput);
    if (!lot) return null;
    return lot * pipValuePerLot;
  }, [lotInput, pipValuePerLot]);

  const profitLossEstimate = useMemo(() => {
    const pv = pipValue;
    const pips = toNumber(pipsInput);
    if (!pv || !pips) return null;
    return pv * pips;
  }, [pipValue, pipsInput]);

  const finalVolumePreview = useMemo(() => {
    const raw = volumeMode === "MANUAL" ? toNumber(manualLot) : suggestedLot;
    const cap = toNumber(maxLot);
    if (!raw) return null;
    return cap ? Math.min(raw, cap) : raw;
  }, [volumeMode, manualLot, maxLot, suggestedLot]);

  const cardClass = `${darkMode ? "bg-gradient-to-br from-[#0f1728]/95 via-[#0b1220]/95 to-[#050812]/95 border-yellow-500/20 shadow-[0_0_35px_rgba(234,179,8,0.08)]" : "bg-white border-gray-200"} rounded-[1.35rem] p-5 border backdrop-blur-md`;
  const inputClass = `${darkMode ? "bg-[#111a2a] border-gray-700 text-white placeholder:text-gray-500" : "bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-400"} w-full border rounded-2xl px-3 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-400/70`;
  const labelClass = `text-xs font-bold tracking-widest ${darkMode ? "text-gray-400" : "text-gray-500"}`;

  const saveMt5Settings = () => {
    localStorage.setItem("bex.mt5.login", mt5Login.trim());
    localStorage.setItem("bex.mt5.server", mt5Server.trim());
    localStorage.setItem("bex.autoTrade.enabled", autoTradeEnabled ? "1" : "0");
    localStorage.setItem("bex.volume.mode", volumeMode);
    localStorage.setItem("bex.manual.lot", manualLot.trim());
    localStorage.setItem("bex.max.lot", maxLot.trim());
    localStorage.setItem("bex.risk.percent", riskPercent.trim());
    localStorage.setItem("bex.account.balance", balance.trim());
  };

  const copyBridgeToken = async () => {
    try {
      await navigator.clipboard.writeText(bridgeToken);
    } catch {}
  };

  return (
    <div className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden ${darkMode ? "bg-[#050812] text-white" : "bg-[#f6f4ee] text-gray-950"} pb-24`}>
<AppHeader
        title={tr(lang, "Tools", "ابزارها", "الأدوات")}
        subtitle={tr(lang, "Risk calculators", "محاسبه ریسک", "حاسبات المخاطر")}
        darkMode={darkMode}
        onBackClick={() => navigate(-1)}
        onToggleDark={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem("darkMode", JSON.stringify(next)); window.dispatchEvent(new Event("themeChange")); }}
        showSettings={true}
        showThemeToggle={true}
      />

      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
        <div className={`${darkMode ? "border-yellow-500/20 bg-gradient-to-br from-[#111a2a]/95 via-[#08101c]/95 to-[#050812]/95 shadow-[0_0_45px_rgba(234,179,8,0.08)]" : "border-yellow-500/20 bg-white/90 shadow-xl"} relative overflow-hidden rounded-[1.65rem] border p-5 backdrop-blur-md`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_28%),radial-gradient(circle_at_85%_25%,rgba(59,130,246,0.12),transparent_26%)]" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border border-yellow-400/20 bg-yellow-400/5 blur-sm" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)]" /> BEX AI DESK
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Risk Command Tools</h2>
              <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} mt-1 text-sm`}>Lot size, pip value, bridge and risk controls</p>
            </div>
            <div className="hidden rounded-2xl border border-yellow-500/20 bg-black/20 px-4 py-3 text-right sm:block">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-500">BEX MODE</p>
              <p className="mt-1 text-lg font-black text-yellow-400">LUXURY</p>
            </div>
          </div>
        </div>
      </div>


      <main className="px-4 space-y-5 max-w-7xl mx-auto mt-5">
        <div className={cardClass}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-yellow-400 text-xs font-bold tracking-widest">{tr(lang, "SYMBOL", "نماد", "الرمز")}</p>
              <h2 className="font-bold text-lg">{symbol}</h2>
            </div>
            <div className="flex gap-2">
              {(["XAUUSD", "XAGUSD"] as SymbolName[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSymbol(item)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${symbol === item ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black" : darkMode ? "bg-[#111a2a] text-gray-400 border border-yellow-500/20" : "bg-gray-100 text-gray-600 border border-gray-300"}`}
                >
                  {item.replace("USD", "")}
                </button>
              ))}
            </div>
          </div>

          <div className={`${darkMode ? "bg-[#111a2a]/50" : "bg-gray-50"} rounded-xl p-3 text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
            {tr(lang, "These tools are for planning only. Always match final lot size with your broker contract specs.", "این ابزارها فقط برای برنامه‌ریزی هستند. حجم نهایی را با مشخصات بروکر خودت چک کن.", "هذه الأدوات للتخطيط فقط. طابق حجم اللوت النهائي مع مواصفات وسيطك.")}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold">{tr(lang, "Lot Size Calculator", "محاسبه حجم لات", "حاسبة حجم اللوت")}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-2">
              <span className={labelClass}>{tr(lang, "Account Balance", "بالانس حساب", "رصيد الحساب")}</span>
              <input className={inputClass} inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="1000" />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>{tr(lang, "Risk %", "درصد ریسک", "نسبة المخاطرة")}</span>
              <input className={inputClass} inputMode="decimal" value={riskPercent} onChange={(e) => setRiskPercent(e.target.value)} placeholder="1" />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>{tr(lang, "Stop Loss (pips)", "حد ضرر (پیپ)", "وقف الخسارة (نقاط)")}</span>
              <input className={inputClass} inputMode="decimal" value={stopLossPips} onChange={(e) => setStopLossPips(e.target.value)} placeholder="30" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className={`${darkMode ? "bg-[#111a2a]/50 border-yellow-500/20" : "bg-gray-50 border-gray-200"} rounded-2xl p-4 border`}>
              <p className={labelClass}>{tr(lang, "Risk Amount", "مقدار ریسک", "مبلغ المخاطرة")}</p>
              <p className="text-2xl font-bold mt-1">{riskAmount ? `$${riskAmount.toFixed(2)}` : "—"}</p>
            </div>
            <div className={`${darkMode ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-300"} rounded-2xl p-4 border`}>
              <p className="text-yellow-400 text-xs font-bold tracking-widest">{tr(lang, "Suggested Lot", "لات پیشنهادی", "اللوت المقترح")}</p>
              <p className="text-2xl font-bold mt-1 text-yellow-400">{suggestedLot ? suggestedLot.toFixed(2) : "—"}</p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold">{tr(lang, "Pip Value Calculator", "محاسبه ارزش پیپ", "حاسبة قيمة النقطة")}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className={labelClass}>{tr(lang, "Lot Size", "حجم لات", "حجم اللوت")}</span>
              <input className={inputClass} inputMode="decimal" value={lotInput} onChange={(e) => setLotInput(e.target.value)} placeholder="0.01" />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>{tr(lang, "Pips", "پیپ", "نقاط")}</span>
              <input className={inputClass} inputMode="decimal" value={pipsInput} onChange={(e) => setPipsInput(e.target.value)} placeholder="30" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className={`${darkMode ? "bg-[#111a2a]/50 border-yellow-500/20" : "bg-gray-50 border-gray-200"} rounded-2xl p-4 border`}>
              <p className={labelClass}>{tr(lang, "Value per pip", "ارزش هر پیپ", "قيمة النقطة")}</p>
              <p className="text-2xl font-bold mt-1">{pipValue ? `$${pipValue.toFixed(2)}` : "—"}</p>
            </div>
            <div className={`${darkMode ? "bg-[#111a2a]/50 border-yellow-500/20" : "bg-gray-50 border-gray-200"} rounded-2xl p-4 border`}>
              <p className={labelClass}>{tr(lang, "P/L Estimate", "برآورد سود/ضرر", "تقدير الربح/الخسارة")}</p>
              <p className="text-2xl font-bold mt-1">{profitLossEstimate ? `$${profitLossEstimate.toFixed(2)}` : "—"}</p>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-yellow-400" />
              <div>
                <h3 className="font-bold">
                  {tr(lang, { en: "VIP Auto Trading", fa: "اتو ترید VIP", ar: "التداول الآلي VIP", es: "Trading automático VIP", "pt-BR": "Auto trading VIP", hi: "VIP ऑटो ट्रेडिंग", tr: "VIP Otomatik İşlem", de: "VIP Auto-Trading", fr: "Trading auto VIP", zh: "VIP 自动交易", ko: "VIP 자동매매" })}
                </h3>
                <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {tr(lang, { en: "Connect MT5 bridge, choose volume mode, then let strong signals execute automatically.", fa: "بریج MT5 را وصل کن، حالت حجم را انتخاب کن، بعد سیگنال‌های قوی خودکار اجرا شوند.", ar: "اربط جسر MT5 واختر وضع الحجم ثم دع الإشارات القوية تُنفّذ تلقائياً.", es: "Conecta el puente MT5, elige el modo de volumen y ejecuta señales fuertes automáticamente.", "pt-BR": "Conecte a ponte MT5, escolha o modo de volume e execute sinais fortes automaticamente.", hi: "MT5 ब्रिज जोड़ें, वॉल्यूम मोड चुनें, फिर मजबूत सिग्नल अपने-आप चलें।", tr: "MT5 köprüsünü bağla, hacim modunu seç, güçlü sinyaller otomatik çalışsın.", de: "MT5-Bridge verbinden, Volumenmodus wählen und starke Signale automatisch ausführen.", fr: "Connecte le bridge MT5, choisis le volume, puis exécute les signaux forts automatiquement.", zh: "连接 MT5 桥接，选择手数模式，让强信号自动执行。", ko: "MT5 브리지를 연결하고 거래량 모드를 선택하면 강한 신호가 자동 실행됩니다." })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold">
              <Lock className="w-3 h-3" /> VIP
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-2">
              <span className={labelClass}>{tr(lang, { en: "MT5 Account Login", fa: "لاگین حساب MT5", ar: "تسجيل دخول MT5", es: "Login de cuenta MT5", "pt-BR": "Login da conta MT5", hi: "MT5 अकाउंट लॉगिन", tr: "MT5 Hesap Girişi", de: "MT5-Konto Login", fr: "Identifiant MT5", zh: "MT5 账户登录", ko: "MT5 계정 로그인" })}</span>
              <input className={inputClass} inputMode="numeric" value={mt5Login} onChange={(e) => setMt5Login(e.target.value)} placeholder="12345678" />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>{tr(lang, { en: "Broker Server", fa: "سرور بروکر", ar: "خادم الوسيط", es: "Servidor del broker", "pt-BR": "Servidor da corretora", hi: "ब्रोकर सर्वर", tr: "Broker Sunucusu", de: "Broker-Server", fr: "Serveur broker", zh: "经纪商服务器", ko: "브로커 서버" })}</span>
              <input className={inputClass} value={mt5Server} onChange={(e) => setMt5Server(e.target.value)} placeholder="Broker-Live" />
            </label>
          </div>

          <div className={`${darkMode ? "bg-[#111a2a]/50 border-yellow-500/20" : "bg-gray-50 border-gray-200"} rounded-2xl p-4 border mt-3`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={labelClass}>{tr(lang, { en: "Bridge Token", fa: "توکن اتصال بریج", ar: "رمز جسر الاتصال", es: "Token del puente", "pt-BR": "Token da ponte", hi: "ब्रिज टोकन", tr: "Bridge Token", de: "Bridge-Token", fr: "Token bridge", zh: "桥接令牌", ko: "브리지 토큰" })}</p>
                <p className="text-sm font-mono truncate mt-1">{bridgeToken}</p>
              </div>
              <button type="button" onClick={copyBridgeToken} className="px-3 py-2 rounded-xl bg-yellow-500 text-black font-bold text-xs flex items-center gap-1">
                <Copy className="w-3 h-3" />
                {tr(lang, { en: "Copy", fa: "کپی", ar: "نسخ", es: "Copiar", "pt-BR": "Copiar", hi: "कॉपी", tr: "Kopyala", de: "Kopieren", fr: "Copier", zh: "复制", ko: "복사" })}
              </button>
            </div>
            <p className={`text-xs mt-3 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {tr(lang, { en: "Use this token inside the MT5 EA. Do not store your MT5 password in the app.", fa: "این توکن را داخل EA متاتریدر وارد کن. پسورد MT5 را داخل اپ ذخیره نکن.", ar: "استخدم هذا الرمز داخل EA في MT5. لا تخزن كلمة مرور MT5 داخل التطبيق.", es: "Usa este token dentro del EA de MT5. No guardes tu contraseña MT5 en la app.", "pt-BR": "Use este token no EA do MT5. Não salve sua senha MT5 no app.", hi: "यह टोकन MT5 EA में डालें। ऐप में MT5 पासवर्ड सेव न करें।", tr: "Bu tokenı MT5 EA içinde kullan. MT5 şifreni uygulamada saklama.", de: "Nutze dieses Token im MT5-EA. Speichere kein MT5-Passwort in der App.", fr: "Utilise ce token dans l’EA MT5. Ne stocke pas ton mot de passe MT5 dans l’app.", zh: "在 MT5 EA 中使用此令牌。不要在应用中保存 MT5 密码。", ko: "이 토큰을 MT5 EA에 입력하세요. 앱에 MT5 비밀번호를 저장하지 마세요." })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className={`${darkMode ? "bg-[#111a2a]/50 border-yellow-500/20" : "bg-gray-50 border-gray-200"} rounded-2xl p-4 border`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={labelClass}>{tr(lang, { en: "Auto Trading", fa: "اتو ترید", ar: "التداول الآلي", es: "Trading automático", "pt-BR": "Auto trading", hi: "ऑटो ट्रेडिंग", tr: "Otomatik İşlem", de: "Auto-Trading", fr: "Trading auto", zh: "自动交易", ko: "자동매매" })}</p>
                  <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{tr(lang, { en: "Strong signals only", fa: "فقط سیگنال‌های قوی", ar: "الإشارات القوية فقط", es: "Solo señales fuertes", "pt-BR": "Apenas sinais fortes", hi: "केवल मजबूत सिग्नल", tr: "Sadece güçlü sinyaller", de: "Nur starke Signale", fr: "Signaux forts uniquement", zh: "仅强信号", ko: "강한 신호만" })}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoTradeEnabled((v) => !v)}
                  className={`w-14 h-8 rounded-full p-1 transition-all ${autoTradeEnabled ? "bg-yellow-500" : darkMode ? "bg-gray-700" : "bg-gray-300"}`}
                >
                  <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${autoTradeEnabled ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            <div className={`${darkMode ? "bg-[#111a2a]/50 border-yellow-500/20" : "bg-gray-50 border-gray-200"} rounded-2xl p-4 border`}>
              <p className={labelClass}>{tr(lang, { en: "Volume Mode", fa: "حالت حجم", ar: "وضع الحجم", es: "Modo de volumen", "pt-BR": "Modo de volume", hi: "वॉल्यूम मोड", tr: "Hacim Modu", de: "Volumenmodus", fr: "Mode volume", zh: "手数模式", ko: "거래량 모드" })}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {(["AUTO", "MANUAL"] as VolumeMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setVolumeMode(mode)}
                    className={`py-2 rounded-xl text-xs font-bold border ${volumeMode === mode ? "bg-yellow-500 text-black border-yellow-500" : darkMode ? "bg-[#0b1220] text-gray-400 border-yellow-500/20" : "bg-white text-gray-600 border-gray-200"}`}
                  >
                    {mode === "AUTO" ? tr(lang, { en: "Auto", fa: "خودکار", ar: "تلقائي", es: "Auto", "pt-BR": "Auto", hi: "ऑटो", tr: "Otomatik", de: "Auto", fr: "Auto", zh: "自动", ko: "자동" }) : tr(lang, { en: "Manual", fa: "دستی", ar: "يدوي", es: "Manual", "pt-BR": "Manual", hi: "मैनुअल", tr: "Manuel", de: "Manuell", fr: "Manuel", zh: "手动", ko: "수동" })}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <label className="space-y-2">
              <span className={labelClass}>{tr(lang, { en: "Manual Lot", fa: "لات دستی", ar: "لوت يدوي", es: "Lote manual", "pt-BR": "Lote manual", hi: "मैनुअल लॉट", tr: "Manuel Lot", de: "Manueller Lot", fr: "Lot manuel", zh: "手动手数", ko: "수동 랏" })}</span>
              <input className={inputClass} inputMode="decimal" value={manualLot} onChange={(e) => setManualLot(e.target.value)} placeholder="0.01" />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>{tr(lang, { en: "Max Lot", fa: "حداکثر لات", ar: "أقصى لوت", es: "Lote máximo", "pt-BR": "Lote máximo", hi: "अधिकतम लॉट", tr: "Maks Lot", de: "Max. Lot", fr: "Lot max", zh: "最大手数", ko: "최대 랏" })}</span>
              <input className={inputClass} inputMode="decimal" value={maxLot} onChange={(e) => setMaxLot(e.target.value)} placeholder="0.05" />
            </label>
            <div className={`${darkMode ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-300"} rounded-2xl p-4 border`}>
              <p className="text-yellow-400 text-xs font-bold tracking-widest">{tr(lang, { en: "Final Volume Preview", fa: "نمایش حجم نهایی", ar: "معاينة الحجم النهائي", es: "Vista del volumen final", "pt-BR": "Prévia do volume final", hi: "अंतिम वॉल्यूम", tr: "Son Hacim Önizleme", de: "Finale Volumen-Vorschau", fr: "Aperçu volume final", zh: "最终手数预览", ko: "최종 거래량 미리보기" })}</p>
              <p className="text-2xl font-bold mt-1 text-yellow-400">{finalVolumePreview ? finalVolumePreview.toFixed(2) : "—"}</p>
            </div>
          </div>

          <button type="button" onClick={saveMt5Settings} className="w-full mt-4 rounded-xl py-3 font-bold bg-gradient-to-r from-yellow-500 to-yellow-600 text-black flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            {tr(lang, { en: "Save Auto Trading Settings", fa: "ذخیره تنظیمات اتو ترید", ar: "حفظ إعدادات التداول الآلي", es: "Guardar ajustes de auto trading", "pt-BR": "Salvar auto trading", hi: "ऑटो ट्रेडिंग सेटिंग सेव करें", tr: "Oto İşlem Ayarlarını Kaydet", de: "Auto-Trading speichern", fr: "Enregistrer trading auto", zh: "保存自动交易设置", ko: "자동매매 설정 저장" })}
          </button>
        </div>
      </main>
    </div>
  );
}

