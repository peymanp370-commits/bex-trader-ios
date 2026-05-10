import {
  ArrowLeft,
  ChevronRight,
  Globe,
  Clock,
  Bell,
  Shield,
  HelpCircle,
  Mail,
  FileText,
  User,
  Crown,
  ExternalLink,
  MessageCircle,
  Lock,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import logoImage from "../../assets/67578b6bc0297a415f1729364a3db485950c0551.png";
import { clearLocalAuthState, logout } from "../utils/api";
import { getLanguage, setLanguage as saveAppLanguage } from "../utils/i18n";

type LangCode = "en" | "fa" | "ar" | "es" | "pt-BR" | "hi" | "tr" | "de" | "fr" | "zh" | "ko";
type Dict = Record<LangCode, string>;

const FALLBACK_LANG: LangCode = "en";

function normalizeLang(value: unknown): LangCode {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (lower === "pt-br" || lower === "pt_br" || lower === "ptbr") return "pt-BR";
  if (["en", "fa", "ar", "es", "hi", "tr", "de", "fr", "zh", "ko"].includes(lower)) return lower as LangCode;
  return FALLBACK_LANG;
}

function T(lang: LangCode, dict: Dict): string {
  return dict[lang] || dict[FALLBACK_LANG] || "";
}

function isRTL(lang: LangCode) {
  return lang === "fa" || lang === "ar";
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)", offset: "UTC-5" },
  { value: "America/Chicago", label: "Central Time (CT)", offset: "UTC-6" },
  { value: "America/Denver", label: "Mountain Time (MT)", offset: "UTC-7" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "UTC-8" },
  { value: "America/Toronto", label: "Toronto", offset: "UTC-5" },
  { value: "Europe/London", label: "London (GMT)", offset: "UTC+0" },
  { value: "Europe/Paris", label: "Paris (CET)", offset: "UTC+1" },
  { value: "Europe/Athens", label: "Athens (EET)", offset: "UTC+2" },
  { value: "Asia/Tehran", label: "Tehran", offset: "UTC+3:30" },
  { value: "Asia/Dubai", label: "Dubai (GST)", offset: "UTC+4" },
  { value: "Asia/Karachi", label: "Karachi (PKT)", offset: "UTC+5" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)", offset: "UTC+8" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: "UTC+9" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)", offset: "UTC+10" },
];

const COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "CN", name: "China", flag: "🇨🇳" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "IR", name: "Iran", flag: "🇮🇷" },
];

const LANGUAGES: { code: LangCode; name: string; englishName: string; flag: string }[] = [
  { code: "en", name: "English", englishName: "English", flag: "🇬🇧" },
  { code: "fa", name: "فارسی", englishName: "Persian", flag: "🇮🇷" },
  { code: "ar", name: "العربية", englishName: "Arabic", flag: "🇸🇦" },
  { code: "es", name: "Español", englishName: "Spanish", flag: "🇪🇸" },
  { code: "pt-BR", name: "Português (Brasil)", englishName: "Portuguese (Brazil)", flag: "🇧🇷" },
  { code: "hi", name: "हिन्दी", englishName: "Hindi", flag: "🇮🇳" },
  { code: "tr", name: "Türkçe", englishName: "Turkish", flag: "🇹🇷" },
  { code: "de", name: "Deutsch", englishName: "German", flag: "🇩🇪" },
  { code: "fr", name: "Français", englishName: "French", flag: "🇫🇷" },
  { code: "zh", name: "中文", englishName: "Chinese", flag: "🇨🇳" },
  { code: "ko", name: "한국어", englishName: "Korean", flag: "🇰🇷" },
];

const TXT = {
  goldTrader: { en: "GOLD TRADER", fa: "معامله‌گر طلا", ar: "متداول الذهب", es: "TRADER DE ORO", "pt-BR": "TRADER DE OURO", hi: "गोल्ड ट्रेडर", tr: "ALTIN TRADER", de: "GOLD-TRADER", fr: "TRADER OR", zh: "黄金交易", ko: "골드 트레이더" },
  upgradeVip: { en: "Upgrade to VIP", fa: "ارتقا به VIP", ar: "الترقية إلى VIP", es: "Actualizar a VIP", "pt-BR": "Atualizar para VIP", hi: "VIP में अपग्रेड करें", tr: "VIP'e yükselt", de: "Auf VIP upgraden", fr: "Passer à VIP", zh: "升级到 VIP", ko: "VIP로 업그레이드" },
  premiumSignals: { en: "Get premium signals & AI analysis", fa: "دریافت سیگنال‌های ویژه و تحلیل هوش مصنوعی", ar: "احصل على إشارات مميزة وتحليل ذكي", es: "Obtén señales premium y análisis con IA", "pt-BR": "Receba sinais premium e análise com IA", hi: "प्रीमियम सिग्नल और AI विश्लेषण पाएं", tr: "Premium sinyaller ve AI analizi alın", de: "Premium-Signale und KI-Analyse erhalten", fr: "Obtenez des signaux premium et une analyse IA", zh: "获取高级信号和 AI 分析", ko: "프리미엄 신호와 AI 분석 받기" },
  startingFrom: { en: "Starting from $9.99/month", fa: "شروع از ۹.۹۹ دلار در ماه", ar: "تبدأ من 9.99$ شهريًا", es: "Desde $9.99/mes", "pt-BR": "A partir de US$ 9,99/mês", hi: "$9.99/माह से शुरू", tr: "Aylık $9.99'dan başlayan", de: "Ab $9,99/Monat", fr: "À partir de 9,99 $/mois", zh: "每月 $9.99 起", ko: "월 $9.99부터" },
  preferences: { en: "⚙️ PREFERENCES", fa: "⚙️ تنظیمات", ar: "⚙️ التفضيلات", es: "⚙️ PREFERENCIAS", "pt-BR": "⚙️ PREFERÊNCIAS", hi: "⚙️ प्राथमिकताएँ", tr: "⚙️ TERCİHLER", de: "⚙️ EINSTELLUNGEN", fr: "⚙️ PRÉFÉRENCES", zh: "⚙️ 偏好设置", ko: "⚙️ 환경설정" },
  notifications: { en: "Notifications", fa: "اعلان‌ها", ar: "الإشعارات", es: "Notificaciones", "pt-BR": "Notificações", hi: "सूचनाएँ", tr: "Bildirimler", de: "Benachrichtigungen", fr: "Notifications", zh: "通知", ko: "알림" },
  signalAlerts: { en: "Get signal alerts", fa: "دریافت اعلان سیگنال", ar: "استلام تنبيهات الإشارة", es: "Recibir alertas de señales", "pt-BR": "Receber alertas de sinais", hi: "सिग्नल अलर्ट पाएं", tr: "Sinyal uyarıları al", de: "Signalbenachrichtigungen erhalten", fr: "Recevoir des alertes de signal", zh: "接收信号提醒", ko: "신호 알림 받기" },
  notificationFrequency: { en: "Notification Frequency", fa: "بازه اعلان", ar: "تكرار الإشعارات", es: "Frecuencia de notificaciones", "pt-BR": "Frequência de notificações", hi: "सूचना आवृत्ति", tr: "Bildirim sıklığı", de: "Benachrichtigungshäufigkeit", fr: "Fréquence des notifications", zh: "通知频率", ko: "알림 빈도" },
  instant: { en: "Instant", fa: "لحظه‌ای", ar: "فوري", es: "Instantáneo", "pt-BR": "Instantâneo", hi: "तुरंत", tr: "Anında", de: "Sofort", fr: "Instantané", zh: "即时", ko: "즉시" },
  daily: { en: "Daily", fa: "روزانه", ar: "يومي", es: "Diario", "pt-BR": "Diário", hi: "दैनिक", tr: "Günlük", de: "Täglich", fr: "Quotidien", zh: "每日", ko: "매일" },
  weekly: { en: "Weekly", fa: "هفتگی", ar: "أسبوعي", es: "Semanal", "pt-BR": "Semanal", hi: "साप्ताहिक", tr: "Haftalık", de: "Wöchentlich", fr: "Hebdomadaire", zh: "每周", ko: "매주" },
  monthly: { en: "Monthly", fa: "ماهانه", ar: "شهري", es: "Mensual", "pt-BR": "Mensal", hi: "मासिक", tr: "Aylık", de: "Monatlich", fr: "Mensuel", zh: "每月", ko: "매월" },
  theme: { en: "Theme", fa: "تم", ar: "المظهر", es: "Tema", "pt-BR": "Tema", hi: "थीम", tr: "Tema", de: "Design", fr: "Thème", zh: "主题", ko: "테마" },
  dark: { en: "Dark", fa: "تیره", ar: "داكن", es: "Oscuro", "pt-BR": "Escuro", hi: "डार्क", tr: "Koyu", de: "Dunkel", fr: "Sombre", zh: "深色", ko: "다크" },
  light: { en: "Light", fa: "روشن", ar: "فاتح", es: "Claro", "pt-BR": "Claro", hi: "लाइट", tr: "Açık", de: "Hell", fr: "Clair", zh: "浅色", ko: "라이트" },
  account: { en: "ACCOUNT", fa: "حساب", ar: "الحساب", es: "CUENTA", "pt-BR": "CONTA", hi: "खाता", tr: "HESAP", de: "KONTO", fr: "COMPTE", zh: "账户", ko: "계정" },
  country: { en: "Country", fa: "کشور", ar: "الدولة", es: "País", "pt-BR": "País", hi: "देश", tr: "Ülke", de: "Land", fr: "Pays", zh: "国家/地区", ko: "국가" },
  language: { en: "Language", fa: "زبان", ar: "اللغة", es: "Idioma", "pt-BR": "Idioma", hi: "भाषा", tr: "Dil", de: "Sprache", fr: "Langue", zh: "语言", ko: "언어" },
  timezone: { en: "Timezone", fa: "منطقه زمانی", ar: "المنطقة الزمنية", es: "Zona horaria", "pt-BR": "Fuso horário", hi: "समय क्षेत्र", tr: "Saat dilimi", de: "Zeitzone", fr: "Fuseau horaire", zh: "时区", ko: "시간대" },
  logout: { en: "Logout", fa: "خروج", ar: "تسجيل الخروج", es: "Cerrar sesión", "pt-BR": "Sair", hi: "लॉग आउट", tr: "Çıkış yap", de: "Abmelden", fr: "Déconnexion", zh: "退出登录", ko: "로그아웃" },
  loggingOut: { en: "Logging out...", fa: "در حال خروج...", ar: "جارٍ تسجيل الخروج...", es: "Cerrando sesión...", "pt-BR": "Saindo...", hi: "लॉग आउट हो रहा है...", tr: "Çıkış yapılıyor...", de: "Abmelden...", fr: "Déconnexion...", zh: "正在退出...", ko: "로그아웃 중..." },
  confirmLogout: { en: "Are you sure you want to logout?", fa: "مطمئنی می‌خواهی خارج شوی؟", ar: "هل أنت متأكد أنك تريد تسجيل الخروج؟", es: "¿Seguro que quieres cerrar sesión?", "pt-BR": "Tem certeza de que deseja sair?", hi: "क्या आप वाकई लॉग आउट करना चाहते हैं?", tr: "Çıkış yapmak istediğine emin misin?", de: "Möchtest du dich wirklich abmelden?", fr: "Voulez-vous vraiment vous déconnecter ?", zh: "确定要退出登录吗？", ko: "정말 로그아웃하시겠습니까?" },
  information: { en: "ℹ️ INFORMATION", fa: "ℹ️ اطلاعات", ar: "ℹ️ معلومات", es: "ℹ️ INFORMACIÓN", "pt-BR": "ℹ️ INFORMAÇÕES", hi: "ℹ️ जानकारी", tr: "ℹ️ BİLGİ", de: "ℹ️ INFORMATIONEN", fr: "ℹ️ INFORMATIONS", zh: "ℹ️ 信息", ko: "ℹ️ 정보" },
  economicCalendar: { en: "Economic Calendar", fa: "تقویم اقتصادی", ar: "التقويم الاقتصادي", es: "Calendario económico", "pt-BR": "Calendário econômico", hi: "आर्थिक कैलेंडर", tr: "Ekonomik takvim", de: "Wirtschaftskalender", fr: "Calendrier économique", zh: "经济日历", ko: "경제 캘린더" },
  howToUse: { en: "How to Use BEX", fa: "آموزش استفاده از BEX", ar: "كيفية استخدام BEX", es: "Cómo usar BEX", "pt-BR": "Como usar o BEX", hi: "BEX का उपयोग कैसे करें", tr: "BEX nasıl kullanılır", de: "So nutzt du BEX", fr: "Comment utiliser BEX", zh: "如何使用 BEX", ko: "BEX 사용 방법" },
  riskDisclaimer: { en: "Risk Disclaimer", fa: "هشدار ریسک", ar: "إخلاء مسؤولية المخاطر", es: "Aviso de riesgo", "pt-BR": "Aviso de risco", hi: "जोखिम अस्वीकरण", tr: "Risk uyarısı", de: "Risikohinweis", fr: "Avertissement sur les risques", zh: "风险免责声明", ko: "위험 고지" },
  support: { en: "💬 SUPPORT", fa: "💬 پشتیبانی", ar: "💬 الدعم", es: "💬 SOPORTE", "pt-BR": "💬 SUPORTE", hi: "💬 सहायता", tr: "💬 DESTEK", de: "💬 SUPPORT", fr: "💬 ASSISTANCE", zh: "💬 支持", ko: "💬 지원" },
  emailSupport: { en: "Email Support", fa: "پشتیبانی ایمیلی", ar: "دعم البريد الإلكتروني", es: "Soporte por email", "pt-BR": "Suporte por e-mail", hi: "ईमेल सहायता", tr: "E-posta desteği", de: "E-Mail-Support", fr: "Assistance par e-mail", zh: "邮件支持", ko: "이메일 지원" },
  telegramChannel: { en: "Telegram Channel", fa: "کانال تلگرام", ar: "قناة تليجرام", es: "Canal de Telegram", "pt-BR": "Canal do Telegram", hi: "टेलीग्राम चैनल", tr: "Telegram kanalı", de: "Telegram-Kanal", fr: "Canal Telegram", zh: "Telegram 频道", ko: "텔레그램 채널" },
  legal: { en: "⚖️ LEGAL", fa: "⚖️ قوانین", ar: "⚖️ قانوني", es: "⚖️ LEGAL", "pt-BR": "⚖️ LEGAL", hi: "⚖️ कानूनी", tr: "⚖️ YASAL", de: "⚖️ RECHTLICHES", fr: "⚖️ LÉGAL", zh: "⚖️ 法律", ko: "⚖️ 법률" },
  terms: { en: "Terms & Conditions", fa: "شرایط و قوانین", ar: "الشروط والأحكام", es: "Términos y condiciones", "pt-BR": "Termos e condições", hi: "नियम और शर्तें", tr: "Şartlar ve koşullar", de: "Allgemeine Geschäftsbedingungen", fr: "Conditions générales", zh: "条款和条件", ko: "이용약관" },
  privacy: { en: "Privacy Policy", fa: "حریم خصوصی", ar: "سياسة الخصوصية", es: "Política de privacidad", "pt-BR": "Política de privacidade", hi: "गोपनीयता नीति", tr: "Gizlilik politikası", de: "Datenschutzerklärung", fr: "Politique de confidentialité", zh: "隐私政策", ko: "개인정보 처리방침" },
  selectTimezone: { en: "Select Timezone", fa: "انتخاب منطقه زمانی", ar: "اختر المنطقة الزمنية", es: "Seleccionar zona horaria", "pt-BR": "Selecionar fuso horário", hi: "समय क्षेत्र चुनें", tr: "Saat dilimi seç", de: "Zeitzone auswählen", fr: "Sélectionner le fuseau horaire", zh: "选择时区", ko: "시간대 선택" },
  selectCountry: { en: "Select Country", fa: "انتخاب کشور", ar: "اختر الدولة", es: "Seleccionar país", "pt-BR": "Selecionar país", hi: "देश चुनें", tr: "Ülke seç", de: "Land auswählen", fr: "Sélectionner un pays", zh: "选择国家/地区", ko: "국가 선택" },
  selectLanguage: { en: "Select Language", fa: "انتخاب زبان", ar: "اختر اللغة", es: "Seleccionar idioma", "pt-BR": "Selecionar idioma", hi: "भाषा चुनें", tr: "Dil seç", de: "Sprache auswählen", fr: "Sélectionner la langue", zh: "选择语言", ko: "언어 선택" },
} satisfies Record<string, Dict>;

function countryLabel(country: { code: string; name: string; flag: string }, lang: LangCode) {
  const names: Record<string, Partial<Dict>> = {
    US: { fa: "ایالات متحده", ar: "الولايات المتحدة", es: "Estados Unidos", "pt-BR": "Estados Unidos", hi: "संयुक्त राज्य", tr: "Amerika Birleşik Devletleri", de: "Vereinigte Staaten", fr: "États-Unis", zh: "美国", ko: "미국" },
    GB: { fa: "بریتانیا", ar: "المملكة المتحدة", es: "Reino Unido", "pt-BR": "Reino Unido", hi: "यूनाइटेड किंगडम", tr: "Birleşik Krallık", de: "Vereinigtes Königreich", fr: "Royaume-Uni", zh: "英国", ko: "영국" },
    CA: { fa: "کانادا", ar: "كندا", es: "Canadá", "pt-BR": "Canadá", hi: "कनाडा", tr: "Kanada", de: "Kanada", fr: "Canada", zh: "加拿大", ko: "캐나다" },
    AU: { fa: "استرالیا", ar: "أستراليا", es: "Australia", "pt-BR": "Austrália", hi: "ऑस्ट्रेलिया", tr: "Avustralya", de: "Australien", fr: "Australie", zh: "澳大利亚", ko: "호주" },
    DE: { fa: "آلمان", ar: "ألمانيا", es: "Alemania", "pt-BR": "Alemanha", hi: "जर्मनी", tr: "Almanya", de: "Deutschland", fr: "Allemagne", zh: "德国", ko: "독일" },
    FR: { fa: "فرانسه", ar: "فرنسا", es: "Francia", "pt-BR": "França", hi: "फ्रांस", tr: "Fransa", de: "Frankreich", fr: "France", zh: "法国", ko: "프랑스" },
    ES: { fa: "اسپانیا", ar: "إسبانيا", es: "España", "pt-BR": "Espanha", hi: "स्पेन", tr: "İspanya", de: "Spanien", fr: "Espagne", zh: "西班牙", ko: "스페인" },
    IT: { fa: "ایتالیا", ar: "إيطاليا", es: "Italia", "pt-BR": "Itália", hi: "इटली", tr: "İtalya", de: "Italien", fr: "Italie", zh: "意大利", ko: "이탈리아" },
    JP: { fa: "ژاپن", ar: "اليابان", es: "Japón", "pt-BR": "Japão", hi: "जापान", tr: "Japonya", de: "Japan", fr: "Japon", zh: "日本", ko: "일본" },
    CN: { fa: "چین", ar: "الصين", es: "China", "pt-BR": "China", hi: "चीन", tr: "Çin", de: "China", fr: "Chine", zh: "中国", ko: "중국" },
    IN: { fa: "هند", ar: "الهند", es: "India", "pt-BR": "Índia", hi: "भारत", tr: "Hindistan", de: "Indien", fr: "Inde", zh: "印度", ko: "인도" },
    BR: { fa: "برزیل", ar: "البرازيل", es: "Brasil", "pt-BR": "Brasil", hi: "ब्राज़ील", tr: "Brezilya", de: "Brasilien", fr: "Brésil", zh: "巴西", ko: "브라질" },
    MX: { fa: "مکزیک", ar: "المكسيك", es: "México", "pt-BR": "México", hi: "मेक्सिको", tr: "Meksika", de: "Mexiko", fr: "Mexique", zh: "墨西哥", ko: "멕시코" },
    KR: { fa: "کره جنوبی", ar: "كوريا الجنوبية", es: "Corea del Sur", "pt-BR": "Coreia do Sul", hi: "दक्षिण कोरिया", tr: "Güney Kore", de: "Südkorea", fr: "Corée du Sud", zh: "韩国", ko: "대한민국" },
    SG: { fa: "سنگاپور", ar: "سنغافورة", es: "Singapur", "pt-BR": "Singapura", hi: "सिंगापुर", tr: "Singapur", de: "Singapur", fr: "Singapour", zh: "新加坡", ko: "싱가포르" },
    AE: { fa: "امارات", ar: "الإمارات", es: "EAU", "pt-BR": "EAU", hi: "यूएई", tr: "BAE", de: "VAE", fr: "EAU", zh: "阿联酋", ko: "아랍에미리트" },
    SA: { fa: "عربستان سعودی", ar: "السعودية", es: "Arabia Saudita", "pt-BR": "Arábia Saudita", hi: "सऊदी अरब", tr: "Suudi Arabistan", de: "Saudi-Arabien", fr: "Arabie saoudite", zh: "沙特阿拉伯", ko: "사우디아라비아" },
    TR: { fa: "ترکیه", ar: "تركيا", es: "Turquía", "pt-BR": "Turquia", hi: "तुर्की", tr: "Türkiye", de: "Türkei", fr: "Turquie", zh: "土耳其", ko: "튀르키예" },
    IR: { fa: "ایران", ar: "إيران", es: "Irán", "pt-BR": "Irã", hi: "ईरान", tr: "İran", de: "Iran", fr: "Iran", zh: "伊朗", ko: "이란" },
  };
  return names[country.code]?.[lang] || country.name;
}

export function Settings() {
  const navigate = useNavigate();

  const initialLang = normalizeLang(
    localStorage.getItem("userLanguage") || localStorage.getItem("lang") || getLanguage()
  );

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationTime, setNotificationTime] = useState("daily");
  const [loggingOut, setLoggingOut] = useState(false);

  const [userTimezone, setUserTimezone] = useState(
    localStorage.getItem("userTimezone") || "America/Toronto"
  );
  const [userCountry, setUserCountry] = useState(
    localStorage.getItem("userCountry") || "Canada"
  );
  const [userLanguage, setUserLanguage] = useState<LangCode>(initialLang);

  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const lang = userLanguage;
  const rtl = isRTL(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.body.dir = rtl ? "rtl" : "ltr";
  }, [lang, rtl]);

  const handleLogout = async () => {
    if (!confirm(T(lang, TXT.confirmLogout))) return;

    setLoggingOut(true);
    try {
      await logout();
    } finally {
      clearLocalAuthState();
      setLoggingOut(false);
      navigate("/login?logged_out=1", { replace: true });
    }
  };

  const handleDarkModeToggle = (isDark: boolean) => {
    setDarkMode(isDark);
    localStorage.setItem("darkMode", JSON.stringify(isDark));
    window.dispatchEvent(new Event("themeChange"));
  };

  const handleTimezoneChange = (timezone: string) => {
    setUserTimezone(timezone);
    localStorage.setItem("userTimezone", timezone);
    setShowTimezoneModal(false);
  };

  const handleCountryChange = (country: string) => {
    setUserCountry(country);
    localStorage.setItem("userCountry", country);
    setShowCountryModal(false);
  };

  const handleLanguageChange = (languageCode: LangCode) => {
    const nextLang = normalizeLang(languageCode);
    setUserLanguage(nextLang);
    localStorage.setItem("userLanguage", nextLang);
    localStorage.setItem("lang", nextLang);
    try { saveAppLanguage(nextLang as any); } catch {}
    window.dispatchEvent(new CustomEvent("languageChange", { detail: { lang: nextLang } }));
    window.dispatchEvent(new Event("storage"));
    setShowLanguageModal(false);
  };

  const notificationTimes = [
    {
      value: "daily",
      label: lang === "fa" ? "اعلان روزانه" : "Daily notification",
    },
    {
      value: "strong_signal",
      label: lang === "fa" ? "اعلان سیگنال قوی" : "Strong signal notification",
    },
  ];

  const selectedCountry = COUNTRIES.find((c) => c.name === userCountry);
  const selectedLanguage = LANGUAGES.find((l) => l.code === userLanguage) || LANGUAGES[0];
  const selectedTimezone = TIMEZONES.find((t) => t.value === userTimezone);

  return (
    <div dir={rtl ? "rtl" : "ltr"} className={`min-h-screen ${darkMode ? "bg-[#0a0e1a] text-white" : "bg-gray-50 text-gray-900"} pb-8`}>
      <header className={`${darkMode ? "bg-[#0f1623] border-gray-800" : "bg-white border-gray-200"} p-4 border-b`}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/app")}
            className={`p-2 rounded-lg ${darkMode ? "hover:bg-[#1a2332]" : "hover:bg-gray-100"}`}
          >
            <ArrowLeft className={`w-5 h-5 ${rtl ? "rotate-180" : ""}`} />
          </button>

          <div className="flex items-center gap-3">
            <img src={logoImage} alt="BEX AI" className="h-16 md:h-20" />
            <div>
              <h1 className="font-bold text-lg md:text-xl leading-tight">BEX AI</h1>
              <p className={`text-xs md:text-sm ${darkMode ? "text-gray-400" : "text-gray-500"} leading-tight`}>
                {T(lang, TXT.goldTrader)}
              </p>
            </div>
          </div>

          <div
            className={`px-2 py-1 rounded-lg text-xs font-bold ${
              (localStorage.getItem("userPlan") || "PRO") === "VIP"
                ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black"
                : (localStorage.getItem("userPlan") || "PRO") === "PRO"
                ? "bg-gradient-to-r from-teal-500 to-blue-500 text-white"
                : "bg-gray-500 text-white"
            }`}
          >
            {localStorage.getItem("userPlan") || "PRO"}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Link to="/app/vip">
          <div className="bg-gradient-to-r from-teal-600 to-blue-600 rounded-2xl p-5 border border-teal-500/30 shadow-lg shadow-teal-500/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-6 h-6 text-yellow-300" />
                  <span className="text-yellow-300 font-bold text-lg">{T(lang, TXT.upgradeVip)}</span>
                </div>
                <p className="text-sm text-white/90 mb-1">{T(lang, TXT.premiumSignals)}</p>
                <p className="text-xs text-teal-100">{T(lang, TXT.startingFrom)}</p>
              </div>
              <ChevronRight className={`w-6 h-6 text-white ${rtl ? "rotate-180" : ""}`} />
            </div>
          </div>
        </Link>

        <div className={`${darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"} rounded-2xl p-5 border`}>
          <h2 className="text-teal-400 text-xs font-bold tracking-widest mb-4">{T(lang, TXT.preferences)}</h2>

          <div className={`flex items-center justify-between p-4 ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl mb-3`}>
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-teal-400" />
              <div className={rtl ? "text-right" : "text-left"}>
                <p className="font-medium">{T(lang, TXT.notifications)}</p>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>{T(lang, TXT.signalAlerts)}</p>
              </div>
            </div>

            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-14 h-7 rounded-full transition-colors ${
                notificationsEnabled ? "bg-teal-500" : darkMode ? "bg-gray-700" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  notificationsEnabled ? (rtl ? "-translate-x-8" : "translate-x-8") : (rtl ? "-translate-x-1" : "translate-x-1")
                } mt-1`}
              />
            </button>
          </div>

          {notificationsEnabled && (
            <div className={`p-4 ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl mb-3`}>
              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"} mb-2`}>{T(lang, TXT.notificationFrequency)}</p>
              <select
                value={notificationTime}
                onChange={(e) => setNotificationTime(e.target.value)}
                className={`w-full ${darkMode ? "bg-[#0f1623] border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"} border rounded-lg px-3 py-2`}
              >
                {notificationTimes.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <p className={`text-sm font-medium mb-3 ${darkMode ? "text-white" : "text-gray-900"}`}>{T(lang, TXT.theme)}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDarkModeToggle(true)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  darkMode ? "bg-teal-500 text-white shadow-lg" : "bg-gray-100 text-gray-600"
                }`}
              >
                🌙 {T(lang, TXT.dark)}
              </button>
              <button
                onClick={() => handleDarkModeToggle(false)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  !darkMode ? "bg-teal-500 text-white shadow-lg" : "bg-gray-100 text-gray-600"
                }`}
              >
                ☀️ {T(lang, TXT.light)}
              </button>
            </div>
          </div>
        </div>

        <div className={`${darkMode ? "bg-[#0f1623] border-gray-800" : "bg-white border-gray-200"} rounded-2xl p-1 border`}>
          <h3 className="px-4 py-3 text-xs font-bold text-yellow-400 tracking-widest">{T(lang, TXT.account)}</h3>

          <button onClick={() => setShowCountryModal(true)} className={`w-full flex items-center justify-between px-4 py-3.5 ${darkMode ? "hover:bg-[#1a2332]" : "hover:bg-gray-100"} transition-colors`}>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-teal-400" />
              <div className={rtl ? "text-right" : "text-left"}>
                <p className="font-medium">{T(lang, TXT.country)}</p>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{selectedCountry ? countryLabel(selectedCountry, lang) : countryLabel(COUNTRIES[2], lang)}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-400 ${rtl ? "rotate-180" : ""}`} />
          </button>

          <button onClick={() => setShowLanguageModal(true)} className={`w-full flex items-center justify-between px-4 py-3.5 ${darkMode ? "hover:bg-[#1a2332]" : "hover:bg-gray-100"} transition-colors border-t ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-blue-400" />
              <div className={rtl ? "text-right" : "text-left"}>
                <p className="font-medium">{T(lang, TXT.language)}</p>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{selectedLanguage.name}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-400 ${rtl ? "rotate-180" : ""}`} />
          </button>

          <button onClick={() => setShowTimezoneModal(true)} className={`w-full flex items-center justify-between px-4 py-3.5 ${darkMode ? "hover:bg-[#1a2332]" : "hover:bg-gray-100"} transition-colors border-t ${darkMode ? "border-gray-800" : "border-gray-200"}`}>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-400" />
              <div className={rtl ? "text-right" : "text-left"}>
                <p className="font-medium">{T(lang, TXT.timezone)}</p>
                <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{selectedTimezone?.label || "Toronto"}</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-400 ${rtl ? "rotate-180" : ""}`} />
          </button>

          <button onClick={handleLogout} disabled={loggingOut} className={`w-full flex items-center justify-between px-4 py-3.5 ${darkMode ? "hover:bg-red-900/20" : "hover:bg-red-50"} transition-colors border-t ${darkMode ? "border-gray-800" : "border-gray-200"} disabled:opacity-50`}>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-red-400" />
              <p className="font-medium text-red-400">{loggingOut ? T(lang, TXT.loggingOut) : T(lang, TXT.logout)}</p>
            </div>
            <ChevronRight className={`w-5 h-5 text-red-400 ${rtl ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className={`${darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"} rounded-2xl p-5 border`}>
          <h2 className="text-yellow-400 text-xs font-bold tracking-widest mb-4">{T(lang, TXT.information)}</h2>

          <button className={`w-full flex items-center justify-between p-4 ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl mb-3 transition-colors`}>
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-teal-400" />
              <span className="font-medium">{T(lang, TXT.economicCalendar)}</span>
            </div>
            <ChevronRight className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-600"} ${rtl ? "rotate-180" : ""}`} />
          </button>

          <button onClick={() => navigate("/app/help")} className={`w-full flex items-center justify-between p-4 ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl mb-3 transition-colors`}>
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-teal-400" />
              <span className="font-medium">{T(lang, TXT.howToUse)}</span>
            </div>
            <ChevronRight className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-600"} ${rtl ? "rotate-180" : ""}`} />
          </button>

          <button onClick={() => navigate("/app/help")} className={`w-full flex items-center justify-between p-4 ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl transition-colors`}>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-400" />
              <span className="font-medium">{T(lang, TXT.riskDisclaimer)}</span>
            </div>
            <ChevronRight className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-600"} ${rtl ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div className={`${darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"} rounded-2xl p-5 border`}>
          <h2 className="text-teal-400 text-xs font-bold tracking-widest mb-4">{T(lang, TXT.support)}</h2>

          <a href="mailto:support@bextrader.com">
            <button className={`w-full flex items-center justify-between p-4 ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl mb-3 transition-colors`}>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-teal-400" />
                <span className="font-medium">{T(lang, TXT.emailSupport)}</span>
              </div>
              <ExternalLink className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`} />
            </button>
          </a>

          <a href="https://t.me/bextraderbot" target="_blank" rel="noopener noreferrer">
            <button className={`w-full flex items-center justify-between p-4 ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl transition-colors`}>
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-teal-400" />
                <span className="font-medium">@bextraderbot</span>
              </div>
              <ExternalLink className={`w-4 h-4 ${darkMode ? "text-gray-400" : "text-gray-600"}`} />
            </button>
          </a>
        </div>

        <div className={`${darkMode ? "bg-[#0f1623] border-gray-800/50" : "bg-white border-gray-200"} rounded-2xl p-5 border`}>
          <h2 className="text-yellow-400 text-xs font-bold tracking-widest mb-4">{T(lang, TXT.legal)}</h2>

          <button className={`w-full flex items-center justify-between p-4 ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl mb-3 transition-colors`}>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-teal-400" />
              <span className="font-medium">{T(lang, TXT.terms)}</span>
            </div>
            <ChevronRight className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-600"} ${rtl ? "rotate-180" : ""}`} />
          </button>

          <button className={`w-full flex items-center justify-between p-4 ${darkMode ? "bg-[#1a2332]/50" : "bg-gray-50"} rounded-xl transition-colors`}>
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-teal-400" />
              <span className="font-medium">{T(lang, TXT.privacy)}</span>
            </div>
            <ChevronRight className={`w-5 h-5 ${darkMode ? "text-gray-400" : "text-gray-600"} ${rtl ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {showTimezoneModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className={`w-full ${darkMode ? "bg-[#0f1623]" : "bg-white"} rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{T(lang, TXT.selectTimezone)}</h2>
              <button onClick={() => setShowTimezoneModal(false)} className="p-2 rounded-lg"><span className="text-2xl">×</span></button>
            </div>
            <div className="space-y-2">
              {TIMEZONES.map((tz) => (
                <button key={tz.value} onClick={() => handleTimezoneChange(tz.value)} className={`w-full p-4 ${rtl ? "text-right" : "text-left"} rounded-xl transition-colors ${userTimezone === tz.value ? "bg-teal-500 text-white" : darkMode ? "bg-[#1a2332]/50 hover:bg-[#1a2332] text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}>
                  <p className="font-medium">{tz.label}</p>
                  <p className={`text-xs ${userTimezone === tz.value ? "text-white/80" : darkMode ? "text-gray-400" : "text-gray-600"}`}>{tz.offset}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCountryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className={`w-full ${darkMode ? "bg-[#0f1623]" : "bg-white"} rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{T(lang, TXT.selectCountry)}</h2>
              <button onClick={() => setShowCountryModal(false)} className="p-2 rounded-lg"><span className="text-2xl">×</span></button>
            </div>
            <div className="space-y-2">
              {COUNTRIES.map((country) => (
                <button key={country.code} onClick={() => handleCountryChange(country.name)} className={`w-full p-4 ${rtl ? "text-right" : "text-left"} rounded-xl transition-colors ${userCountry === country.name ? "bg-teal-500 text-white" : darkMode ? "bg-[#1a2332]/50 hover:bg-[#1a2332] text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}>
                  <p className="font-medium">{country.flag} {countryLabel(country, lang)}</p>
                  <p className={`text-xs ${userCountry === country.name ? "text-white/80" : darkMode ? "text-gray-400" : "text-gray-600"}`}>{country.code}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLanguageModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div className={`w-full ${darkMode ? "bg-[#0f1623]" : "bg-white"} rounded-t-3xl p-6 max-h-[82vh] overflow-hidden flex flex-col`}>
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>{T(lang, TXT.selectLanguage)}</h2>
              <button onClick={() => setShowLanguageModal(false)} className="p-2 rounded-lg"><span className="text-2xl">×</span></button>
            </div>
            <div className="space-y-2 overflow-y-auto pr-1 max-h-[58vh] overscroll-contain pb-3">
              {LANGUAGES.map((language) => (
                <button key={language.code} onClick={() => handleLanguageChange(language.code)} className={`w-full p-4 ${rtl ? "text-right" : "text-left"} rounded-xl transition-colors ${userLanguage === language.code ? "bg-teal-500 text-white" : darkMode ? "bg-[#1a2332]/50 hover:bg-[#1a2332] text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"}`}>
                  <p className="font-medium">{language.flag} {language.name}</p>
                  <p className={`text-xs ${userLanguage === language.code ? "text-white/80" : darkMode ? "text-gray-400" : "text-gray-600"}`}>{language.englishName} • {language.code.toUpperCase()}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
