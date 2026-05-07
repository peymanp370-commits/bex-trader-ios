export type SupportedLanguage =
  | "en"
  | "fa"
  | "ar"
  | "es"
  | "pt-BR"
  | "hi"
  | "tr"
  | "de"
  | "fr"
  | "zh"
  | "ko";

export const STORAGE_KEY = "userLanguage";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  "en",
  "fa",
  "ar",
  "es",
  "pt-BR",
  "hi",
  "tr",
  "de",
  "fr",
  "zh",
  "ko",
];

export const LANGUAGE_OPTIONS: { value: SupportedLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fa", label: "فارسی" },
  { value: "ar", label: "العربية" },
  { value: "es", label: "Español" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "hi", label: "हिन्दी" },
  { value: "tr", label: "Türkçe" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
];

type TranslationMap = Partial<Record<SupportedLanguage | string, string>>;

export function normalizeLanguage(value: unknown): SupportedLanguage {
  const raw = String(value || "").trim();
  const v = raw.toLowerCase().replace("_", "-");

  if (v === "fa" || v === "fa-ir" || v === "persian" || v === "farsi") return "fa";
  if (v === "ar" || v === "ar-eg" || v === "arabic") return "ar";
  if (v === "es" || v === "es-es" || v === "es-mx" || v === "spanish") return "es";
  if (v === "pt" || v === "pt-br" || v === "portuguese" || v === "brazil" || v === "br") return "pt-BR";
  if (v === "hi" || v === "hi-in" || v === "hindi") return "hi";
  if (v === "tr" || v === "tr-tr" || v === "turkish") return "tr";
  if (v === "de" || v === "de-de" || v === "german") return "de";
  if (v === "fr" || v === "fr-fr" || v === "french") return "fr";
  if (v === "zh" || v === "zh-cn" || v === "zh-hans" || v === "chinese" || v === "cn") return "zh";
  if (v === "ko" || v === "ko-kr" || v === "korean") return "ko";

  return "en";
}

export function getLanguage(): SupportedLanguage {
  try {
    return normalizeLanguage(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "en";
  }
}

export function setLanguage(value: unknown): SupportedLanguage {
  const lang = normalizeLanguage(value);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("languageChange", { detail: { lang } }));
  } catch {}
  return lang;
}

export function isRTL(lang: SupportedLanguage = getLanguage()) {
  return lang === "fa" || lang === "ar";
}

export function applyDocumentLanguage(lang: SupportedLanguage = getLanguage()) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
  document.body.dir = document.documentElement.dir;
}

export function markRTL(lang: SupportedLanguage = getLanguage()) {
  return { dir: isRTL(lang) ? "rtl" : "ltr", lang };
}

export function tr(
  lang: SupportedLanguage | string,
  enOrMap: string | TranslationMap,
  fa?: string,
  ar?: string
) {
  const normalized = normalizeLanguage(lang);

  if (typeof enOrMap === "object" && enOrMap !== null) {
    return enOrMap[normalized] || enOrMap.en || "";
  }

  if (normalized === "fa") return fa || enOrMap;
  if (normalized === "ar") return ar || fa || enOrMap;

  const phraseKey = keyOf(enOrMap);
  const translated = PHRASES[phraseKey]?.[normalized];
  return translated || enOrMap;
}

const UI: Record<string, TranslationMap> = {
  monthly_summary: {
    en: "Monthly Summary",
    fa: "خلاصه ماهانه",
    ar: "الملخص الشهري",
    es: "Resumen mensual",
    "pt-BR": "Resumo mensal",
    hi: "मासिक सारांश",
    tr: "Aylık Özet",
    de: "Monatsübersicht",
    fr: "Résumé mensuel",
    zh: "月度摘要",
    ko: "월간 요약",
  },
  symbol_performance: {
    en: "Symbol Performance",
    fa: "عملکرد نماد",
    ar: "أداء الرمز",
    es: "Rendimiento del símbolo",
    "pt-BR": "Desempenho do ativo",
    hi: "सिंबल प्रदर्शन",
    tr: "Sembol Performansı",
    de: "Symbol-Performance",
    fr: "Performance du symbole",
    zh: "品种表现",
    ko: "종목 성과",
  },
  why_subscribe: {
    en: "Why Subscribe",
    fa: "چرا اشتراک بگیریم",
    ar: "لماذا الاشتراك",
    es: "Por qué suscribirse",
    "pt-BR": "Por que assinar",
    hi: "सदस्यता क्यों लें",
    tr: "Neden Abone Olmalı",
    de: "Warum abonnieren",
    fr: "Pourquoi s’abonner",
    zh: "为什么订阅",
    ko: "구독해야 하는 이유",
  },
  wins: {
    en: "Wins",
    fa: "برد",
    ar: "أرباح",
    es: "Ganadas",
    "pt-BR": "Vitórias",
    hi: "जीत",
    tr: "Kazanç",
    de: "Gewinne",
    fr: "Gains",
    zh: "盈利",
    ko: "수익",
  },
  losses: {
    en: "Losses",
    fa: "باخت",
    ar: "خسائر",
    es: "Perdidas",
    "pt-BR": "Perdas",
    hi: "हार",
    tr: "Kayıp",
    de: "Verluste",
    fr: "Pertes",
    zh: "亏损",
    ko: "손실",
  },
  latest_trades: {
    en: "Latest Day Trades",
    fa: "تعداد معاملات امروز",
    ar: "صفقات اليوم الأخيرة",
    es: "Operaciones del día",
    "pt-BR": "Trades do dia",
    hi: "आज के ट्रेड",
    tr: "Günün İşlemleri",
    de: "Heutige Trades",
    fr: "Trades du jour",
    zh: "今日交易",
    ko: "오늘의 거래",
  },

  off: {
    en: "Off",
    fa: "خاموش",
    ar: "إيقاف",
    es: "Desactivado",
    "pt-BR": "Desligado",
    hi: "बंद",
    tr: "Kapalı",
    de: "Aus",
    fr: "Désactivé",
    zh: "关闭",
    ko: "끄기",
  },
  strong_signals_only: {
    en: "Strong signals only",
    fa: "فقط سیگنال‌های قوی",
    ar: "الإشارات القوية فقط",
    es: "Solo señales fuertes",
    "pt-BR": "Apenas sinais fortes",
    hi: "केवल मजबूत सिग्नल",
    tr: "Sadece güçlü sinyaller",
    de: "Nur starke Signale",
    fr: "Signaux forts uniquement",
    zh: "仅强信号",
    ko: "강한 신호만",
  },
  notification_off: {
    en: "Off",
    fa: "خاموش",
    ar: "إيقاف",
    es: "Desactivado",
    "pt-BR": "Desligado",
    hi: "बंद",
    tr: "Kapalı",
    de: "Aus",
    fr: "Désactivé",
    zh: "关闭",
    ko: "끄기",
  },
  notification_instant: {
    en: "Instant",
    fa: "لحظه‌ای",
    ar: "فوري",
    es: "Instantáneo",
    "pt-BR": "Instantâneo",
    hi: "तुरंत",
    tr: "Anlık",
    de: "Sofort",
    fr: "Instantané",
    zh: "即时",
    ko: "즉시",
  },
  notification_strong: {
    en: "Strong signals only",
    fa: "فقط سیگنال‌های قوی",
    ar: "الإشارات القوية فقط",
    es: "Solo señales fuertes",
    "pt-BR": "Apenas sinais fortes",
    hi: "केवल मजबूत सिग्नल",
    tr: "Sadece güçlü sinyaller",
    de: "Nur starke Signale",
    fr: "Signaux forts uniquement",
    zh: "仅强信号",
    ko: "강한 신호만",
  },
  instant: {
    en: "Instant",
    fa: "لحظه‌ای",
    ar: "فوري",
    es: "Instantáneo",
    "pt-BR": "Instantâneo",
    hi: "तुरंत",
    tr: "Anlık",
    de: "Sofort",
    fr: "Instantané",
    zh: "即时",
    ko: "즉시",
  },
  setup: {
    en: "Setup",
    fa: "در حال آماده‌سازی",
    ar: "إعداد",
    es: "Configuración",
    "pt-BR": "Setup",
    hi: "सेटअप",
    tr: "Kurulum",
    de: "Setup",
    fr: "Configuration",
    zh: "设置",
    ko: "설정",
  },
  risk_reward: {
    en: "Risk/Reward",
    fa: "ریسک/بازده",
    ar: "المخاطرة/العائد",
    es: "Riesgo/Beneficio",
    "pt-BR": "Risco/Retorno",
    hi: "जोखिम/इनाम",
    tr: "Risk/Ödül",
    de: "Risiko/Ertrag",
    fr: "Risque/Rendement",
    zh: "风险/回报",
    ko: "위험/보상",
  },

  account_page: {
    en: "Account",
    fa: "حساب",
    ar: "الحساب",
    es: "Cuenta",
    "pt-BR": "Conta",
    hi: "खाता",
    tr: "Hesap",
    de: "Konto",
    fr: "Compte",
    zh: "账户",
    ko: "계정",
  },
  personal_trading_account: {
    en: "Your personal MT5 trading account performance",
    fa: "عملکرد حساب معاملاتی شخصی MT5 شما",
    ar: "أداء حساب تداول MT5 الشخصي الخاص بك",
    es: "Rendimiento de tu cuenta personal de MT5",
    "pt-BR": "Desempenho da sua conta pessoal MT5",
    hi: "आपके निजी MT5 ट्रेडिंग खाते का प्रदर्शन",
    tr: "Kişisel MT5 işlem hesabı performansınız",
    de: "Performance deines persönlichen MT5-Handelskontos",
    fr: "Performance de votre compte MT5 personnel",
    zh: "您的个人 MT5 交易账户表现",
    ko: "개인 MT5 거래 계정 성과",
  },
  seven_days: { en: "7D", fa: "۷ روز", ar: "٧ أيام", es: "7D", "pt-BR": "7D", hi: "7D", tr: "7G", de: "7T", fr: "7J", zh: "7天", ko: "7일" },
  thirty_days: { en: "30D", fa: "۳۰ روز", ar: "٣٠ يوم", es: "30D", "pt-BR": "30D", hi: "30D", tr: "30G", de: "30T", fr: "30J", zh: "30天", ko: "30일" },
  all: { en: "All", fa: "همه", ar: "الكل", es: "Todo", "pt-BR": "Tudo", hi: "सभी", tr: "Tümü", de: "Alle", fr: "Tout", zh: "全部", ko: "전체" },
  refresh: { en: "Refresh", fa: "به‌روزرسانی", ar: "تحديث", es: "Actualizar", "pt-BR": "Atualizar", hi: "रीफ़्रेश", tr: "Yenile", de: "Aktualisieren", fr: "Actualiser", zh: "刷新", ko: "새로고침" },
  account: { en: "Account", fa: "حساب", ar: "الحساب", es: "Cuenta", "pt-BR": "Conta", hi: "खाता", tr: "Hesap", de: "Konto", fr: "Compte", zh: "账户", ko: "계정" },
  client: { en: "Client", fa: "کلاینت", ar: "العميل", es: "Cliente", "pt-BR": "Cliente", hi: "क्लाइंट", tr: "Müşteri", de: "Client", fr: "Client", zh: "客户", ko: "클라이언트" },
  loading: { en: "Loading...", fa: "در حال بارگذاری...", ar: "جارٍ التحميل...", es: "Cargando...", "pt-BR": "Carregando...", hi: "लोड हो रहा है...", tr: "Yükleniyor...", de: "Wird geladen...", fr: "Chargement...", zh: "加载中...", ko: "불러오는 중..." },
  trades: { en: "Trades", fa: "معاملات", ar: "الصفقات", es: "Operaciones", "pt-BR": "Trades", hi: "ट्रेड", tr: "İşlemler", de: "Trades", fr: "Trades", zh: "交易", ko: "거래" },
  win_rate: { en: "Win Rate", fa: "درصد برد", ar: "نسبة الفوز", es: "Tasa de acierto", "pt-BR": "Taxa de acerto", hi: "विन रेट", tr: "Kazanma Oranı", de: "Trefferquote", fr: "Taux de réussite", zh: "胜率", ko: "승률" },
  net_pnl: { en: "Net PnL", fa: "سود/زیان خالص", ar: "صافي الربح/الخسارة", es: "PnL neto", "pt-BR": "PnL líquido", hi: "नेट PnL", tr: "Net PnL", de: "Netto-PnL", fr: "PnL net", zh: "净盈亏", ko: "순손익" },
  total_pnl: { en: "Net PnL", fa: "سود/زیان خالص", ar: "صافي الربح/الخسارة", es: "PnL neto", "pt-BR": "PnL líquido", hi: "नेट PnL", tr: "Net PnL", de: "Netto-PnL", fr: "PnL net", zh: "净盈亏", ko: "순손益" },
  avg_trade: { en: "Avg Trade", fa: "میانگین معامله", ar: "متوسط الصفقة", es: "Promedio por operación", "pt-BR": "Média por trade", hi: "औसत ट्रेड", tr: "Ortalama İşlem", de: "Ø Trade", fr: "Trade moyen", zh: "平均交易", ko: "평균 거래" },
  avg_pnl: { en: "Avg Trade", fa: "میانگین معامله", ar: "متوسط الصفقة", es: "Promedio por operación", "pt-BR": "Média por trade", hi: "औसत ट्रेड", tr: "Ortalama İşlem", de: "Ø Trade", fr: "Trade moyen", zh: "平均交易", ko: "평균 거래" },
  profit_factor: { en: "Profit Factor", fa: "ضریب سود", ar: "عامل الربح", es: "Factor de beneficio", "pt-BR": "Fator de lucro", hi: "प्रॉफिट फैक्टर", tr: "Kâr Faktörü", de: "Profit Factor", fr: "Facteur de profit", zh: "盈利因子", ko: "수익 팩터" },
  trade_pnl_chart: { en: "Trade PnL Chart", fa: "نمودار سود و زیان معاملات", ar: "مخطط ربح وخسارة الصفقات", es: "Gráfico PnL de operaciones", "pt-BR": "Gráfico de PnL dos trades", hi: "ट्रेड PnL चार्ट", tr: "İşlem PnL Grafiği", de: "Trade-PnL-Diagramm", fr: "Graphique PnL des trades", zh: "交易盈亏图", ko: "거래 손익 차트" },
  equity_curve: { en: "Equity Curve", fa: "نمودار رشد حساب", ar: "منحنى رأس المال", es: "Curva de capital", "pt-BR": "Curva de patrimônio", hi: "इक्विटी कर्व", tr: "Sermaye Eğrisi", de: "Equity-Kurve", fr: "Courbe d’équité", zh: "权益曲线", ko: "자산 곡선" },
  green_profit_red_loss: { en: "Green = profitable trade, red = losing trade. Taller bars mean larger PnL.", fa: "سبز یعنی معامله سودده، قرمز یعنی معامله ضررده. ستون بلندتر یعنی سود/زیان بزرگ‌تر.", ar: "الأخضر صفقة رابحة، والأحمر صفقة خاسرة. العمود الأعلى يعني ربح/خسارة أكبر.", es: "Verde = operación ganadora, rojo = operación perdedora. Barras más altas significan mayor PnL.", "pt-BR": "Verde = trade lucrativo, vermelho = trade negativo. Barras maiores indicam PnL maior.", hi: "हरा = लाभ वाला ट्रेड, लाल = नुकसान वाला ट्रेड। ऊँची बार का मतलब बड़ा PnL है।", tr: "Yeşil = kârlı işlem, kırmızı = zararlı işlem. Daha uzun çubuk daha büyük PnL demektir.", de: "Grün = Gewinntrade, Rot = Verlusttrade. Höhere Balken bedeuten größeres PnL.", fr: "Vert = trade gagnant, rouge = trade perdant. Une barre plus haute indique un PnL plus important.", zh: "绿色=盈利交易，红色=亏损交易。柱子越高代表盈亏越大。", ko: "초록색=수익 거래, 빨간색=손실 거래. 막대가 높을수록 손익이 큽니다." },
  symbol_breakdown: { en: "Symbol Breakdown", fa: "تفکیک بر اساس نماد", ar: "تفصيل حسب الرمز", es: "Desglose por símbolo", "pt-BR": "Detalhe por símbolo", hi: "सिंबल ब्रेकडाउन", tr: "Sembol Dağılımı", de: "Symbol-Aufschlüsselung", fr: "Répartition par symbole", zh: "品种明细", ko: "종목별 분석" },
  latest_trades_title: { en: "Latest Trades", fa: "آخرین معاملات", ar: "أحدث الصفقات", es: "Últimas operaciones", "pt-BR": "Últimos trades", hi: "नवीनतम ट्रेड", tr: "Son İşlemler", de: "Neueste Trades", fr: "Derniers trades", zh: "最新交易", ko: "최근 거래" },
  symbol: { en: "Symbol", fa: "نماد", ar: "الرمز", es: "Símbolo", "pt-BR": "Símbolo", hi: "सिंबल", tr: "Sembol", de: "Symbol", fr: "Symbole", zh: "品种", ko: "종목" },
  pnl: { en: "PnL", fa: "سود/زیان", ar: "الربح/الخسارة", es: "PnL", "pt-BR": "PnL", hi: "PnL", tr: "PnL", de: "PnL", fr: "PnL", zh: "盈亏", ko: "손익" },
  time: { en: "Time", fa: "زمان", ar: "الوقت", es: "Hora", "pt-BR": "Hora", hi: "समय", tr: "Zaman", de: "Zeit", fr: "Heure", zh: "时间", ko: "시간" },
  no_personal_trades: { en: "No personal trades found yet.", fa: "هنوز معامله‌ای برای این حساب پیدا نشد.", ar: "لم يتم العثور على صفقات شخصية بعد.", es: "Aún no hay operaciones personales.", "pt-BR": "Nenhum trade pessoal encontrado ainda.", hi: "अभी कोई निजी ट्रेड नहीं मिला।", tr: "Henüz kişisel işlem bulunamadı.", de: "Noch keine persönlichen Trades gefunden.", fr: "Aucun trade personnel trouvé pour le moment.", zh: "尚未找到个人交易。", ko: "아직 개인 거래가 없습니다." },
  last_updated: { en: "Last updated", fa: "آخرین به‌روزرسانی", ar: "آخر تحديث", es: "Última actualización", "pt-BR": "Última atualização", hi: "अंतिम अपडेट", tr: "Son güncelleme", de: "Zuletzt aktualisiert", fr: "Dernière mise à jour", zh: "最后更新", ko: "마지막 업데이트" },
  next_auto_update: { en: "Next auto update", fa: "به‌روزرسانی بعدی", ar: "التحديث التالي", es: "Próxima actualización", "pt-BR": "Próxima atualização", hi: "अगला ऑटो अपडेट", tr: "Sonraki otomatik güncelleme", de: "Nächstes Auto-Update", fr: "Prochaine mise à jour", zh: "下次自动更新", ko: "다음 자동 업데이트" },
  showing_saved_data: { en: "showing saved data", fa: "نمایش داده ذخیره‌شده", ar: "عرض البيانات المحفوظة", es: "mostrando datos guardados", "pt-BR": "mostrando dados salvos", hi: "सहेजा डेटा दिख रहा है", tr: "kayıtlı veri gösteriliyor", de: "gespeicherte Daten werden angezeigt", fr: "données enregistrées affichées", zh: "显示已保存数据", ko: "저장된 데이터 표시 중" },
  account_cache_note: { en: "Account stats are saved and refresh at most every 4 hours.", fa: "آمار حساب ذخیره می‌شود و حداکثر هر ۴ ساعت یک بار به‌روزرسانی می‌شود.", ar: "يتم حفظ إحصائيات الحساب وتحديثها بحد أقصى كل 4 ساعات.", es: "Las estadísticas de la cuenta se guardan y se actualizan como máximo cada 4 horas.", "pt-BR": "As estatísticas da conta são salvas e atualizadas no máximo a cada 4 horas.", hi: "खाते के आँकड़े सेव रहते हैं और अधिकतम हर 4 घंटे में अपडेट होते हैं।", tr: "Hesap istatistikleri kaydedilir ve en fazla 4 saatte bir güncellenir.", de: "Kontostatistiken werden gespeichert und höchstens alle 4 Stunden aktualisiert.", fr: "Les statistiques du compte sont enregistrées et actualisées au maximum toutes les 4 heures.", zh: "账户统计会保存，并最多每 4 小时更新一次。", ko: "계정 통계는 저장되며 최대 4시간마다 업데이트됩니다." },
  could_not_load_account_stats: { en: "Could not load Account stats", fa: "آمار حساب بارگذاری نشد", ar: "تعذر تحميل إحصائيات الحساب", es: "No se pudieron cargar las estadísticas de la cuenta", "pt-BR": "Não foi possível carregar as estatísticas da conta", hi: "खाते के आँकड़े लोड नहीं हो सके", tr: "Hesap istatistikleri yüklenemedi", de: "Kontostatistiken konnten nicht geladen werden", fr: "Impossible de charger les statistiques du compte", zh: "无法加载账户统计", ko: "계정 통계를 불러올 수 없습니다" },
};

export function t(key: string, lang: string) {
  return UI[key]?.[normalizeLanguage(lang)] || UI[key]?.en || key;
}

const PHRASES: Record<string, TranslationMap> = {
  OFF: UI.off,
  INSTANT: UI.instant,
  STRONG: UI.strong_signals_only,
  NOTIFICATION_OFF: UI.notification_off,
  NOTIFICATION_INSTANT: UI.notification_instant,
  NOTIFICATION_STRONG: UI.notification_strong,
  STRONG_SIGNALS_ONLY: UI.strong_signals_only,
  ONLY_STRONG_SIGNALS: UI.strong_signals_only,

  FORGOT_PASSWORD: { en: "Forgot Password", fa: "فراموشی رمز عبور", ar: "نسيت كلمة المرور", es: "Olvidé mi contraseña", "pt-BR": "Esqueci a senha", hi: "पासवर्ड भूल गए", tr: "Şifremi Unuttum", de: "Passwort vergessen", fr: "Mot de passe oublié", zh: "忘记密码", ko: "비밀번호 찾기" },
  FORGOT_PASSWORD_: { en: "Forgot password?", fa: "فراموشی رمز عبور؟", ar: "هل نسيت كلمة المرور؟", es: "¿Olvidaste tu contraseña?", "pt-BR": "Esqueceu a senha?", hi: "पासवर्ड भूल गए?", tr: "Şifrenizi mi unuttunuz?", de: "Passwort vergessen?", fr: "Mot de passe oublié ?", zh: "忘记密码？", ko: "비밀번호를 잊으셨나요?" },
  SEND_RESET_LINK: { en: "Send Reset Link", fa: "ارسال لینک بازیابی", ar: "إرسال رابط إعادة التعيين", es: "Enviar enlace de restablecimiento", "pt-BR": "Enviar link de redefinição", hi: "रीसेट लिंक भेजें", tr: "Sıfırlama Linki Gönder", de: "Reset-Link senden", fr: "Envoyer le lien de réinitialisation", zh: "发送重置链接", ko: "재설정 링크 보내기" },
  BACK_TO_LOGIN: { en: "Back to Login", fa: "بازگشت به ورود", ar: "العودة إلى تسجيل الدخول", es: "Volver al inicio de sesión", "pt-BR": "Voltar ao login", hi: "लॉगिन पर वापस", tr: "Girişe Dön", de: "Zurück zum Login", fr: "Retour à la connexion", zh: "返回登录", ko: "로그인으로 돌아가기" },
  LIVE_MARKET_DATA: { en: "Live Market Data", fa: "داده‌های زنده بازار", ar: "بيانات السوق المباشرة", es: "Datos de mercado en vivo", "pt-BR": "Dados de mercado ao vivo", hi: "लाइव मार्केट डेटा", tr: "Canlı Piyasa Verileri", de: "Live-Marktdaten", fr: "Données de marché en direct", zh: "实时市场数据", ko: "실시간 시장 데이터" },
  ENTRY_PRICE: { en: "Entry Price", fa: "قیمت ورود", ar: "سعر الدخول", es: "Precio de entrada", "pt-BR": "Preço de entrada", hi: "एंट्री मूल्य", tr: "Giriş Fiyatı", de: "Einstiegspreis", fr: "Prix d’entrée", zh: "入场价格", ko: "진입 가격" },
  CURRENT: { en: "Current", fa: "فعلی", ar: "الحالي", es: "Actual", "pt-BR": "Atual", hi: "वर्तमान", tr: "Güncel", de: "Aktuell", fr: "Actuel", zh: "当前", ko: "현재" },
  CURRENCY_CONVERTER: { en: "CURRENCY CONVERTER", fa: "تبدیل ارز", ar: "محول العملات", es: "CONVERSOR DE DIVISAS", "pt-BR": "CONVERSOR DE MOEDAS", hi: "मुद्रा परिवर्तक", tr: "DÖVİZ ÇEVİRİCİ", de: "WÄHRUNGSRECHNER", fr: "CONVERTISSEUR DE DEVISES", zh: "货币转换器", ko: "환율 변환기" },
  RISK_REWARD: UI.risk_reward,
  GOLD_VS_US_DOLLAR: { en: "Gold vs US Dollar", fa: "طلا در برابر دلار آمریکا", ar: "الذهب مقابل الدولار الأمريكي", es: "Oro frente al dólar estadounidense", "pt-BR": "Ouro vs Dólar americano", hi: "सोना बनाम अमेरिकी डॉलर", tr: "Altın / ABD Doları", de: "Gold gegenüber US-Dollar", fr: "Or contre dollar américain", zh: "黄金兑美元", ko: "금 대 미국 달러" },
  SILVER_VS_US_DOLLAR: { en: "Silver vs US Dollar", fa: "نقره در برابر دلار آمریکا", ar: "الفضة مقابل الدولار الأمريكي", es: "Plata frente al dólar estadounidense", "pt-BR": "Prata vs Dólar americano", hi: "चांदी बनाम अमेरिकी डॉलर", tr: "Gümüş / ABD Doları", de: "Silber gegenüber US-Dollar", fr: "Argent contre dollar américain", zh: "白银兑美元", ko: "은 대 미국 달러" },
  US_DOLLAR_INDEX: { en: "US Dollar Index", fa: "شاخص دلار آمریکا", ar: "مؤشر الدولار الأمريكي", es: "Índice del dólar estadounidense", "pt-BR": "Índice do dólar americano", hi: "यूएस डॉलर इंडेक्स", tr: "ABD Dolar Endeksi", de: "US-Dollar-Index", fr: "Indice du dollar américain", zh: "美元指数", ko: "미국 달러 지수" },
  US_10Y_YIELD: { en: "US 10Y Yield", fa: "بازده اوراق ۱۰ ساله آمریکا", ar: "عائد سندات أمريكا 10 سنوات", es: "Rendimiento US 10 años", "pt-BR": "Rendimento US 10 anos", hi: "यूएस 10Y यील्ड", tr: "ABD 10Y Getirisi", de: "US 10J Rendite", fr: "Rendement US 10 ans", zh: "美国10年期收益率", ko: "미국 10년물 수익률" },
  USDCAD: { en: "USD/CAD", fa: "دلار آمریکا / دلار کانادا", ar: "دولار أمريكي / دولار كندي", es: "USD/CAD", "pt-BR": "USD/CAD", hi: "USD/CAD", tr: "USD/CAD", de: "USD/CAD", fr: "USD/CAD", zh: "美元/加元", ko: "USD/CAD" },
  NORMAL: { en: "NORMAL", fa: "نرمال", ar: "طبيعي", es: "NORMAL", "pt-BR": "NORMAL", hi: "सामान्य", tr: "NORMAL", de: "NORMAL", fr: "NORMAL", zh: "正常", ko: "보통" },
  HIGH: { en: "HIGH", fa: "بالا", ar: "مرتفع", es: "ALTO", "pt-BR": "ALTO", hi: "उच्च", tr: "YÜKSEK", de: "HOCH", fr: "ÉLEVÉ", zh: "高", ko: "높음" },
  LOW: { en: "LOW", fa: "کم", ar: "منخفض", es: "BAJO", "pt-BR": "BAIXO", hi: "कम", tr: "DÜŞÜK", de: "NIEDRIG", fr: "FAIBLE", zh: "低", ko: "낮음" },
  BEARISH: { en: "BEARISH", fa: "نزولی", ar: "هابط", es: "BAJISTA", "pt-BR": "BAIXA", hi: "मंदी", tr: "DÜŞÜŞ", de: "BÄRISCH", fr: "BAISSIER", zh: "看跌", ko: "하락" },
  BULLISH: { en: "BULLISH", fa: "صعودی", ar: "صاعد", es: "ALCISTA", "pt-BR": "ALTA", hi: "तेजी", tr: "YÜKSELİŞ", de: "BULLISCH", fr: "HAUSSIER", zh: "看涨", ko: "상승" },
  NEUTRAL: { en: "NEUTRAL", fa: "خنثی", ar: "محايد", es: "NEUTRAL", "pt-BR": "NEUTRO", hi: "तटस्थ", tr: "NÖTR", de: "NEUTRAL", fr: "NEUTRE", zh: "中性", ko: "중립" },
  EXPANSION: { en: "EXPANSION", fa: "گسترش", ar: "توسع", es: "EXPANSIÓN", "pt-BR": "EXPANSÃO", hi: "विस्तार", tr: "GENİŞLEME", de: "EXPANSION", fr: "EXPANSION", zh: "扩张", ko: "확장" },
  RANGE_ROTATION: { en: "RANGE ROTATION", fa: "چرخش رنج", ar: "دوران النطاق", es: "ROTACIÓN EN RANGO", "pt-BR": "ROTAÇÃO EM RANGE", hi: "रेंज रोटेशन", tr: "ARALIK ROTASYONU", de: "RANGE-ROTATION", fr: "ROTATION DE RANGE", zh: "区间轮动", ko: "박스권 순환" },
  RANGE: { en: "RANGE", fa: "رنج", ar: "نطاق", es: "RANGO", "pt-BR": "RANGE", hi: "रेंज", tr: "ARALIK", de: "RANGE", fr: "RANGE", zh: "区间", ko: "박스권" },
  RANGE_BOUND: { en: "RANGE BOUND", fa: "بازار رنج", ar: "سوق نطاقي", es: "EN RANGO", "pt-BR": "EM RANGE", hi: "रेंज-बाउंड", tr: "ARALIKTA", de: "SEITWÄRTS", fr: "EN RANGE", zh: "区间震荡", ko: "박스권 장세" },
  CONSOLIDATION: { en: "CONSOLIDATION", fa: "تثبیت", ar: "تجميع", es: "CONSOLIDACIÓN", "pt-BR": "CONSOLIDAÇÃO", hi: "कंसॉलिडेशन", tr: "KONSOLİDASYON", de: "KONSOLIDIERUNG", fr: "CONSOLIDATION", zh: "盘整", ko: "횡보" },
  BREAKOUT: { en: "BREAKOUT", fa: "شکست", ar: "اختراق", es: "RUPTURA", "pt-BR": "ROMPIMENTO", hi: "ब्रेकआउट", tr: "KIRILIM", de: "AUSBRUCH", fr: "CASSURE", zh: "突破", ko: "돌파" },
  PULLBACK: { en: "PULLBACK", fa: "پولبک", ar: "تصحيح", es: "RETROCESO", "pt-BR": "PULLBACK", hi: "पुलबैक", tr: "GERİ ÇEKİLME", de: "PULLBACK", fr: "REPLI", zh: "回调", ko: "되돌림" },
  TREND: { en: "TREND", fa: "روند", ar: "اتجاه", es: "TENDENCIA", "pt-BR": "TENDÊNCIA", hi: "ट्रेंड", tr: "TREND", de: "TREND", fr: "TENDANCE", zh: "趋势", ko: "추세" },
  TRENDING: { en: "TRENDING", fa: "رونددار", ar: "اتجاهي", es: "EN TENDENCIA", "pt-BR": "EM TENDÊNCIA", hi: "ट्रेंडिंग", tr: "TRENDDE", de: "TRENDEND", fr: "EN TENDANCE", zh: "趋势中", ko: "추세 진행" },
  TREND_MATURE: { en: "TREND MATURE", fa: "روند بالغ", ar: "اتجاه ناضج", es: "TENDENCIA MADURA", "pt-BR": "TENDÊNCIA MADURA", hi: "परिपक्व ट्रेंड", tr: "OLGUN TREND", de: "REIFER TREND", fr: "TENDANCE MATURE", zh: "成熟趋势", ko: "성숙한 추세" },
  TREND_EARLY: { en: "TREND EARLY", fa: "شروع روند", ar: "بداية الاتجاه", es: "INICIO DE TENDENCIA", "pt-BR": "INÍCIO DE TENDÊNCIA", hi: "शुरुआती ट्रेंड", tr: "ERKEN TREND", de: "FRÜHER TREND", fr: "DÉBUT DE TENDANCE", zh: "趋势初期", ko: "초기 추세" },
  TREND_PULLBACK: { en: "TREND PULLBACK", fa: "پولبک روند", ar: "تصحيح الاتجاه", es: "RETROCESO DE TENDENCIA", "pt-BR": "PULLBACK DE TENDÊNCIA", hi: "ट्रेंड पुलबैक", tr: "TREND GERİ ÇEKİLMESİ", de: "TREND-PULLBACK", fr: "REPLI DE TENDANCE", zh: "趋势回调", ko: "추세 되돌림" },
  CHOPPY: { en: "CHOPPY", fa: "نامنظم", ar: "متذبذب", es: "IRREGULAR", "pt-BR": "INSTÁVEL", hi: "चॉपी", tr: "DALGALI", de: "UNRUHIG", fr: "IRRÉGULIER", zh: "震荡杂乱", ko: "불규칙" },
  WAIT: { en: "WAIT", fa: "صبر", ar: "انتظار", es: "ESPERA", "pt-BR": "ESPERA", hi: "प्रतीक्षा", tr: "BEKLE", de: "WARTEN", fr: "ATTENDRE", zh: "等待", ko: "대기" },
  SETUP: { en: "SETUP", fa: "تنظیم سیگنال", ar: "إعداد الإشارة", es: "SETUP", "pt-BR": "SETUP", hi: "सेटअप", tr: "KURULUM", de: "SETUP", fr: "SETUP", zh: "信号设置", ko: "셋업" },
  SAFE: { en: "SAFE", fa: "ایمن", ar: "آمن", es: "SEGURO", "pt-BR": "SEGURO", hi: "सुरक्षित", tr: "GÜVENLİ", de: "SICHER", fr: "SÛR", zh: "安全", ko: "안전" },
  RISKY: { en: "RISKY", fa: "پرریسک", ar: "محفوف بالمخاطر", es: "RIESGOSO", "pt-BR": "ARRISCADO", hi: "जोखिमपूर्ण", tr: "RİSKLİ", de: "RISKANT", fr: "RISQUÉ", zh: "有风险", ko: "위험" },
  DANGER: { en: "DANGER", fa: "خطرناک", ar: "خطر", es: "PELIGRO", "pt-BR": "PERIGO", hi: "खतरा", tr: "TEHLİKE", de: "GEFAHR", fr: "DANGER", zh: "危险", ko: "위험" },
  NEW_YORK: { en: "NEW YORK", fa: "نیویورک", ar: "نيويورك", es: "NUEVA YORK", "pt-BR": "NOVA YORK", hi: "न्यूयॉर्क", tr: "NEW YORK", de: "NEW YORK", fr: "NEW YORK", zh: "纽约", ko: "뉴욕" },
  LONDON: { en: "LONDON", fa: "لندن", ar: "لندن", es: "LONDRES", "pt-BR": "LONDRES", hi: "लंदन", tr: "LONDRA", de: "LONDON", fr: "LONDRES", zh: "伦敦", ko: "런던" },
  ASIA: { en: "ASIA", fa: "آسیا", ar: "آسيا", es: "ASIA", "pt-BR": "ÁSIA", hi: "एशिया", tr: "ASYA", de: "ASIEN", fr: "ASIE", zh: "亚洲", ko: "아시아" },
  OVERLAP: { en: "OVERLAP", fa: "همپوشانی سشن‌ها", ar: "تداخل الجلسات", es: "SOLAPAMIENTO", "pt-BR": "SOBREPOSIÇÃO", hi: "ओवरलैप", tr: "ÇAKIŞMA", de: "ÜBERSCHNEIDUNG", fr: "CHEVAUCHEMENT", zh: "交易时段重叠", ko: "세션 겹침" },
  UNKNOWN: { en: "UNKNOWN", fa: "نامشخص", ar: "غير معروف", es: "DESCONOCIDO", "pt-BR": "DESCONHECIDO", hi: "अज्ञात", tr: "BİLİNMİYOR", de: "UNBEKANNT", fr: "INCONNU", zh: "未知", ko: "알 수 없음" },
  LIVE: { en: "LIVE", fa: "زنده", ar: "مباشر", es: "EN VIVO", "pt-BR": "AO VIVO", hi: "लाइव", tr: "CANLI", de: "LIVE", fr: "EN DIRECT", zh: "实时", ko: "실시간" },
  NO_TRADE: { en: "NO TRADE", fa: "بدون معامله", ar: "لا صفقة", es: "SIN OPERACIÓN", "pt-BR": "SEM TRADE", hi: "कोई ट्रेड नहीं", tr: "İŞLEM YOK", de: "KEIN TRADE", fr: "AUCUN TRADE", zh: "无交易", ko: "거래 없음" },
  BUY: { en: "BUY", fa: "خرید", ar: "شراء", es: "COMPRA", "pt-BR": "COMPRA", hi: "खरीदें", tr: "AL", de: "KAUFEN", fr: "ACHETER", zh: "买入", ko: "매수" },
  SELL: { en: "SELL", fa: "فروش", ar: "بيع", es: "VENTA", "pt-BR": "VENDA", hi: "बेचें", tr: "SAT", de: "VERKAUFEN", fr: "VENDRE", zh: "卖出", ko: "매도" },
  WINS: UI.wins,
  LOSSES: UI.losses,
  AVG: { en: "Avg", fa: "میانگین", ar: "المتوسط", es: "Prom.", "pt-BR": "Média", hi: "औसत", tr: "Ort.", de: "Ø", fr: "Moy.", zh: "平均", ko: "평균" },
  TRADES: { en: "trades", fa: "معامله", ar: "صفقة", es: "operaciones", "pt-BR": "trades", hi: "ट्रेड", tr: "işlem", de: "Trades", fr: "trades", zh: "交易", ko: "거래" },
};

function keyOf(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[?؟]+$/g, "_")
    .replace(/[:/]+/g, "_")
    .replace(/[\s-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function translateUi(value: string | null | undefined, lang: SupportedLanguage = getLanguage()) {
  const k = keyOf(value);
  return PHRASES[k]?.[lang] || PHRASES[k]?.en || value || "—";
}

export function getLanguageLabel(lang: SupportedLanguage) {
  return LANGUAGE_OPTIONS.find((x) => x.value === lang)?.label || "English";
}

export function getLocale(lang: SupportedLanguage = getLanguage()) {
  if (lang === "fa") return "fa-IR";
  if (lang === "ar") return "ar-EG";
  if (lang === "es") return "es-ES";
  if (lang === "pt-BR") return "pt-BR";
  if (lang === "hi") return "hi-IN";
  if (lang === "tr") return "tr-TR";
  if (lang === "de") return "de-DE";
  if (lang === "fr") return "fr-FR";
  if (lang === "zh") return "zh-CN";
  if (lang === "ko") return "ko-KR";
  return "en-US";
}

export function formatNumber(value: string | number, lang: SupportedLanguage = getLanguage(), options?: Intl.NumberFormatOptions) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value ?? "");
  return new Intl.NumberFormat(getLocale(lang), options).format(num);
}

export function toLocalizedDigits(value: string | number, lang: SupportedLanguage = getLanguage()) {
  const str = String(value ?? "");
  if (lang !== "fa" && lang !== "ar" && lang !== "hi") return str;
  return str.replace(/\d/g, (d) => new Intl.NumberFormat(getLocale(lang), { useGrouping: false }).format(Number(d)));
}

export function formatDate(date: Date | string | number, lang: SupportedLanguage = getLanguage(), options?: Intl.DateTimeFormatOptions) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(getLocale(lang), options ?? {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | number, lang: SupportedLanguage = getLanguage(), options?: Intl.DateTimeFormatOptions) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(getLocale(lang), options ?? {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

export function formatMonth(date: Date | string | number, lang: SupportedLanguage = getLanguage()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(getLocale(lang), { month: "long" }).format(d);
}

export function translateMarketPhase(value: string | null | undefined, lang: SupportedLanguage = getLanguage()) {
  const phase = keyOf(value);
  if (phase === "RANGE_BOUND") return tr(lang, PHRASES.RANGE_BOUND);
  if (phase === "LIVE_SIGNAL") return tr(lang, PHRASES.LIVE);
  return PHRASES[phase]?.[lang] || PHRASES[phase]?.en || translateUi(value, lang);
}

export function translateBias(value: string | null | undefined, lang: SupportedLanguage = getLanguage()) {
  const bias = keyOf(value);
  return PHRASES[bias]?.[lang] || PHRASES[bias]?.en || translateUi(value, lang);
}

export function translateSide(value: string | null | undefined, lang: SupportedLanguage = getLanguage()) {
  const side = keyOf(value);
  return PHRASES[side]?.[lang] || PHRASES[side]?.en || translateUi(value, lang);
}

export function translateRisk(value: string | null | undefined, lang: SupportedLanguage = getLanguage()) {
  const risk = keyOf(value);
  return PHRASES[risk]?.[lang] || PHRASES[risk]?.en || translateUi(value, lang);
}

export function translateNews(value: string | null | undefined, lang: SupportedLanguage = getLanguage()) {
  const news = keyOf(value);
  return PHRASES[news]?.[lang] || PHRASES[news]?.en || translateUi(value, lang);
}

export function translateSession(value: string | null | undefined, lang: SupportedLanguage = getLanguage()) {
  const session = keyOf(value);
  return PHRASES[session]?.[lang] || PHRASES[session]?.en || translateUi(value, lang);
}

export function translateGenericStatus(value: string | null | undefined, lang: SupportedLanguage = getLanguage()) {
  const v = keyOf(value);
  if (v === "LIVE_SIGNAL") return tr(lang, PHRASES.LIVE);
  return PHRASES[v]?.[lang] || PHRASES[v]?.en || translateUi(value, lang);
}

export function formatWinLoss(wins: number, losses: number, lang: SupportedLanguage = getLanguage()) {
  return `${tr(lang, PHRASES.WINS)}: ${formatNumber(wins, lang)} • ${tr(lang, PHRASES.LOSSES)}: ${formatNumber(losses, lang)}`;
}

export function formatAvg(value: number, lang: SupportedLanguage = getLanguage()) {
  return `${tr(lang, PHRASES.AVG)}: ${formatNumber(value, lang, { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
}

export function formatTrades(symbol: string, count: number, lang: SupportedLanguage = getLanguage()) {
  return `${symbol} • ${formatNumber(count, lang)} ${tr(lang, PHRASES.TRADES)}`;
}
