import { useNavigate, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import logoImage from "../../assets/bex-brand-logo.png";
import { getLanguage, setLanguage, tr } from "../utils/i18n";

const AUTH_BASE =
  import.meta.env.VITE_API_URL || "https://auth.bextrader.com";

type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  phone: string;
  timezone: string;
  country: string;
  password: string;
  confirm_password: string;
};

type AuthUser = {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  timezone?: string;
  country?: string;
  plan?: string;
};

async function registerUser(payload: RegisterPayload) {
  const res = await fetch(`${AUTH_BASE}/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  return {
    ok: !!res.ok,
    message: data?.message || (res.ok ? "Registration successful" : "Failed to register"),
    user: (data?.user || null) as AuthUser | null,
  };
}

type CountryItem = {
  iso2: string;
  country: string;
  flag: string;
  dialCode: string;
};

type AppLang = "en" | "fa" | "ar" | "es" | "pt-BR" | "hi" | "tr" | "de" | "fr" | "zh" | "ko";

const LANGUAGES: { code: AppLang; label: string; native: string; flag: string }[] = [
  { code: "en", label: "English", native: "English", flag: "🇺🇸" },
  { code: "fa", label: "Persian", native: "فارسی", flag: "🇮🇷" },
  { code: "ar", label: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "pt-BR", label: "Portuguese Brazil", native: "Português (Brasil)", flag: "🇧🇷" },
  { code: "hi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "tr", label: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "zh", label: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "ko", label: "Korean", native: "한국어", flag: "🇰🇷" },
];

const COUNTRIES: CountryItem[] = [
  { iso2: "US", country: "United States", flag: "🇺🇸", dialCode: "+1" },
  { iso2: "CA", country: "Canada", flag: "🇨🇦", dialCode: "+1" },
  { iso2: "GB", country: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
  { iso2: "DE", country: "Germany", flag: "🇩🇪", dialCode: "+49" },
  { iso2: "FR", country: "France", flag: "🇫🇷", dialCode: "+33" },
  { iso2: "IT", country: "Italy", flag: "🇮🇹", dialCode: "+39" },
  { iso2: "ES", country: "Spain", flag: "🇪🇸", dialCode: "+34" },
  { iso2: "AE", country: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971" },
  { iso2: "SA", country: "Saudi Arabia", flag: "🇸🇦", dialCode: "+966" },
  { iso2: "TR", country: "Turkey", flag: "🇹🇷", dialCode: "+90" },
  { iso2: "IR", country: "Iran", flag: "🇮🇷", dialCode: "+98" },
  { iso2: "IN", country: "India", flag: "🇮🇳", dialCode: "+91" },
  { iso2: "PK", country: "Pakistan", flag: "🇵🇰", dialCode: "+92" },
  { iso2: "CN", country: "China", flag: "🇨🇳", dialCode: "+86" },
  { iso2: "JP", country: "Japan", flag: "🇯🇵", dialCode: "+81" },
  { iso2: "KR", country: "South Korea", flag: "🇰🇷", dialCode: "+82" },
  { iso2: "SG", country: "Singapore", flag: "🇸🇬", dialCode: "+65" },
  { iso2: "AU", country: "Australia", flag: "🇦🇺", dialCode: "+61" },
  { iso2: "NZ", country: "New Zealand", flag: "🇳🇿", dialCode: "+64" },
  { iso2: "BR", country: "Brazil", flag: "🇧🇷", dialCode: "+55" },
  { iso2: "MX", country: "Mexico", flag: "🇲🇽", dialCode: "+52" },
  { iso2: "ZA", country: "South Africa", flag: "🇿🇦", dialCode: "+27" },
  { iso2: "EG", country: "Egypt", flag: "🇪🇬", dialCode: "+20" },
];

function getDetectedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getTimeZones(): string[] {
  const fallback = [
    "UTC",
    "Pacific/Honolulu",
    "America/Anchorage",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "America/Toronto",
    "America/Sao_Paulo",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Athens",
    "Asia/Tehran",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Sydney",
  ];

  try {
    const supported = (Intl as any).supportedValuesOf?.("timeZone");
    return Array.isArray(supported) && supported.length > 0 ? supported : fallback;
  } catch {
    return fallback;
  }
}

function isRtl(lang: string) {
  return lang === "fa" || lang === "ar";
}

function countryName(iso2: string, lang: string) {
  const names: Record<string, Record<string, string>> = {
    US: { en: "United States", fa: "آمریکا", ar: "الولايات المتحدة", es: "Estados Unidos", "pt-BR": "Estados Unidos", hi: "संयुक्त राज्य", tr: "Amerika Birleşik Devletleri", de: "Vereinigte Staaten", fr: "États-Unis", zh: "美国", ko: "미국" },
    CA: { en: "Canada", fa: "کانادا", ar: "كندا", es: "Canadá", "pt-BR": "Canadá", hi: "कनाडा", tr: "Kanada", de: "Kanada", fr: "Canada", zh: "加拿大", ko: "캐나다" },
    GB: { en: "United Kingdom", fa: "بریتانیا", ar: "المملكة المتحدة", es: "Reino Unido", "pt-BR": "Reino Unido", hi: "यूनाइटेड किंगडम", tr: "Birleşik Krallık", de: "Vereinigtes Königreich", fr: "Royaume-Uni", zh: "英国", ko: "영국" },
    DE: { en: "Germany", fa: "آلمان", ar: "ألمانيا", es: "Alemania", "pt-BR": "Alemanha", hi: "जर्मनी", tr: "Almanya", de: "Deutschland", fr: "Allemagne", zh: "德国", ko: "독일" },
    FR: { en: "France", fa: "فرانسه", ar: "فرنسا", es: "Francia", "pt-BR": "França", hi: "फ्रांस", tr: "Fransa", de: "Frankreich", fr: "France", zh: "法国", ko: "프랑스" },
    IT: { en: "Italy", fa: "ایتالیا", ar: "إيطاليا", es: "Italia", "pt-BR": "Itália", hi: "इटली", tr: "İtalya", de: "Italien", fr: "Italie", zh: "意大利", ko: "이탈리아" },
    ES: { en: "Spain", fa: "اسپانیا", ar: "إسبانيا", es: "España", "pt-BR": "Espanha", hi: "स्पेन", tr: "İspanya", de: "Spanien", fr: "Espagne", zh: "西班牙", ko: "스페인" },
    AE: { en: "United Arab Emirates", fa: "امارات", ar: "الإمارات", es: "Emiratos Árabes Unidos", "pt-BR": "Emirados Árabes Unidos", hi: "संयुक्त अरब अमीरात", tr: "Birleşik Arap Emirlikleri", de: "Vereinigte Arabische Emirate", fr: "Émirats arabes unis", zh: "阿联酋", ko: "아랍에미리트" },
    SA: { en: "Saudi Arabia", fa: "عربستان سعودی", ar: "السعودية", es: "Arabia Saudita", "pt-BR": "Arábia Saudita", hi: "सऊदी अरब", tr: "Suudi Arabistan", de: "Saudi-Arabien", fr: "Arabie saoudite", zh: "沙特阿拉伯", ko: "사우디아라비아" },
    TR: { en: "Turkey", fa: "ترکیه", ar: "تركيا", es: "Turquía", "pt-BR": "Turquia", hi: "तुर्की", tr: "Türkiye", de: "Türkei", fr: "Turquie", zh: "土耳其", ko: "튀르키예" },
    IR: { en: "Iran", fa: "ایران", ar: "إيران", es: "Irán", "pt-BR": "Irã", hi: "ईरान", tr: "İran", de: "Iran", fr: "Iran", zh: "伊朗", ko: "이란" },
    IN: { en: "India", fa: "هند", ar: "الهند", es: "India", "pt-BR": "Índia", hi: "भारत", tr: "Hindistan", de: "Indien", fr: "Inde", zh: "印度", ko: "인도" },
    PK: { en: "Pakistan", fa: "پاکستان", ar: "باكستان", es: "Pakistán", "pt-BR": "Paquistão", hi: "पाकिस्तान", tr: "Pakistan", de: "Pakistan", fr: "Pakistan", zh: "巴基斯坦", ko: "파키스탄" },
    CN: { en: "China", fa: "چین", ar: "الصين", es: "China", "pt-BR": "China", hi: "चीन", tr: "Çin", de: "China", fr: "Chine", zh: "中国", ko: "중국" },
    JP: { en: "Japan", fa: "ژاپن", ar: "اليابان", es: "Japón", "pt-BR": "Japão", hi: "जापान", tr: "Japonya", de: "Japan", fr: "Japon", zh: "日本", ko: "일본" },
    KR: { en: "South Korea", fa: "کره جنوبی", ar: "كوريا الجنوبية", es: "Corea del Sur", "pt-BR": "Coreia do Sul", hi: "दक्षिण कोरिया", tr: "Güney Kore", de: "Südkorea", fr: "Corée du Sud", zh: "韩国", ko: "대한민국" },
    SG: { en: "Singapore", fa: "سنگاپور", ar: "سنغافورة", es: "Singapur", "pt-BR": "Singapura", hi: "सिंगापुर", tr: "Singapur", de: "Singapur", fr: "Singapour", zh: "新加坡", ko: "싱가포르" },
    AU: { en: "Australia", fa: "استرالیا", ar: "أستراليا", es: "Australia", "pt-BR": "Austrália", hi: "ऑस्ट्रेलिया", tr: "Avustralya", de: "Australien", fr: "Australie", zh: "澳大利亚", ko: "호주" },
    NZ: { en: "New Zealand", fa: "نیوزیلند", ar: "نيوزيلندا", es: "Nueva Zelanda", "pt-BR": "Nova Zelândia", hi: "न्यूज़ीलैंड", tr: "Yeni Zelanda", de: "Neuseeland", fr: "Nouvelle-Zélande", zh: "新西兰", ko: "뉴질랜드" },
    BR: { en: "Brazil", fa: "برزیل", ar: "البرازيل", es: "Brasil", "pt-BR": "Brasil", hi: "ब्राज़ील", tr: "Brezilya", de: "Brasilien", fr: "Brésil", zh: "巴西", ko: "브라질" },
    MX: { en: "Mexico", fa: "مکزیک", ar: "المكسيك", es: "México", "pt-BR": "México", hi: "मेक्सिको", tr: "Meksika", de: "Mexiko", fr: "Mexique", zh: "墨西哥", ko: "멕시코" },
    ZA: { en: "South Africa", fa: "آفریقای جنوبی", ar: "جنوب أفريقيا", es: "Sudáfrica", "pt-BR": "África do Sul", hi: "दक्षिण अफ्रीका", tr: "Güney Afrika", de: "Südafrika", fr: "Afrique du Sud", zh: "南非", ko: "남아프리카" },
    EG: { en: "Egypt", fa: "مصر", ar: "مصر", es: "Egipto", "pt-BR": "Egito", hi: "मिस्र", tr: "Mısır", de: "Ägypten", fr: "Égypte", zh: "埃及", ko: "이집트" },
  };

  return names[iso2]?.[lang] || names[iso2]?.en || iso2;
}

export function Register() {
  const navigate = useNavigate();

  const [lang, setLang] = useState<AppLang>(() => getLanguage() as AppLang);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [countryIso, setCountryIso] = useState("CA");
  const [timezone, setTimezone] = useState(getDetectedTimeZone());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const timezones = useMemo(() => getTimeZones(), []);
  const selectedCountry = COUNTRIES.find((c) => c.iso2 === countryIso) || COUNTRIES[0];
  const rtl = isRtl(lang);

  useEffect(() => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, rtl]);

  const changeLanguage = (nextLang: AppLang) => {
    setLang(nextLang);
    setLanguage(nextLang);
    localStorage.setItem("userLanguage", nextLang);
    localStorage.setItem("language", nextLang);
    localStorage.setItem("lang", nextLang);
    window.dispatchEvent(new Event("languageChange"));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();
    const cleanPhone = phone.trim();

    if (!cleanFirstName || !cleanLastName || !cleanEmail || !password || !confirmPassword) {
      setError(tr(lang, {
        en: "Please fill all required fields.",
        fa: "لطفاً همه فیلدهای ضروری را پر کنید.",
        ar: "يرجى ملء جميع الحقول المطلوبة.",
        es: "Completa todos los campos obligatorios.",
        "pt-BR": "Preencha todos os campos obrigatórios.",
        hi: "कृपया सभी आवश्यक फ़ील्ड भरें।",
        tr: "Lütfen tüm zorunlu alanları doldurun.",
        de: "Bitte füllen Sie alle Pflichtfelder aus.",
        fr: "Veuillez remplir tous les champs obligatoires.",
        zh: "请填写所有必填字段。",
        ko: "필수 항목을 모두 입력해 주세요.",
      }));
      return;
    }

    if (password.length < 6) {
      setError(tr(lang, {
        en: "Password must be at least 6 characters.",
        fa: "رمز عبور باید حداقل ۶ کاراکتر باشد.",
        ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.",
        es: "La contraseña debe tener al menos 6 caracteres.",
        "pt-BR": "A senha deve ter pelo menos 6 caracteres.",
        hi: "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।",
        tr: "Şifre en az 6 karakter olmalıdır.",
        de: "Das Passwort muss mindestens 6 Zeichen lang sein.",
        fr: "Le mot de passe doit contenir au moins 6 caractères.",
        zh: "密码至少需要 6 个字符。",
        ko: "비밀번호는 최소 6자 이상이어야 합니다.",
      }));
      return;
    }

    if (password !== confirmPassword) {
      setError(tr(lang, {
        en: "Passwords do not match.",
        fa: "رمزهای عبور یکسان نیستند.",
        ar: "كلمتا المرور غير متطابقتين.",
        es: "Las contraseñas no coinciden.",
        "pt-BR": "As senhas não coincidem.",
        hi: "पासवर्ड मेल नहीं खाते।",
        tr: "Şifreler eşleşmiyor.",
        de: "Die Passwörter stimmen nicht überein.",
        fr: "Les mots de passe ne correspondent pas.",
        zh: "两次输入的密码不一致。",
        ko: "비밀번호가 일치하지 않습니다.",
      }));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await registerUser({
        first_name: cleanFirstName,
        last_name: cleanLastName,
        email: cleanEmail,
        username: cleanUsername || cleanEmail,
        phone: cleanPhone ? `${selectedCountry.dialCode}${cleanPhone}` : "",
        timezone,
        country: selectedCountry.country,
        password,
        confirm_password: confirmPassword,
      });

      if (!result.ok) {
        setError(result.message || tr(lang, {
          en: "Failed to register",
          fa: "ثبت‌نام ناموفق بود",
          ar: "فشل التسجيل",
          es: "No se pudo registrar",
          "pt-BR": "Falha ao registrar",
          hi: "रजिस्ट्रेशन विफल रहा",
          tr: "Kayıt başarısız oldu",
          de: "Registrierung fehlgeschlagen",
          fr: "Échec de l'inscription",
          zh: "注册失败",
          ko: "가입에 실패했습니다",
        }));
        return;
      }

      const displayName =
        [
          result.user?.first_name || cleanFirstName,
          result.user?.last_name || cleanLastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        result.user?.first_name ||
        cleanFirstName ||
        result.user?.username ||
        cleanUsername ||
        result.user?.email ||
        cleanEmail;

      localStorage.setItem("userTimezone", result.user?.timezone || timezone);
      localStorage.setItem("userCountry", result.user?.country || selectedCountry.country);
      localStorage.setItem("userFirstName", result.user?.first_name || cleanFirstName);
      localStorage.setItem("userLastName", result.user?.last_name || cleanLastName);
      localStorage.setItem("userEmail", result.user?.email || cleanEmail);
      localStorage.setItem("userName", displayName);
      localStorage.setItem("userPlan", result.user?.plan || "VIP");
      localStorage.setItem("userLanguage", lang);
      localStorage.setItem("language", lang);
      localStorage.setItem("lang", lang);

      navigate("/app");
    } catch {
      setError(tr(lang, {
        en: "Failed to register",
        fa: "ثبت‌نام ناموفق بود",
        ar: "فشل التسجيل",
        es: "No se pudo registrar",
        "pt-BR": "Falha ao registrar",
        hi: "रजिस्ट्रेशन विफल रहा",
        tr: "Kayıt başarısız oldu",
        de: "Registrierung fehlgeschlagen",
        fr: "Échec de l'inscription",
        zh: "注册失败",
        ko: "가입에 실패했습니다",
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.14),transparent_28%),linear-gradient(180deg,#050812_0%,#08101c_45%,#02040a_100%)] text-white flex flex-col items-center justify-center p-6" dir={rtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-end mb-4">
            <select
              value={lang}
              onChange={(e) => changeLanguage(e.target.value as AppLang)}
              className="max-w-full bg-[#111a2a] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 max-h-60 overflow-y-auto"
            >
              {LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.flag} {item.native}
                </option>
              ))}
            </select>
          </div>

          <img
            src={logoImage}
            alt="BEX"
            className="mx-auto mb-4 h-[96px] w-[180px] object-contain object-center"
          />
          <h1 className="text-3xl font-bold mb-2">
            {tr(lang, {
              en: "Create Account",
              fa: "ساخت حساب کاربری",
              ar: "إنشاء حساب",
              es: "Crear cuenta",
              "pt-BR": "Criar conta",
              hi: "खाता बनाएं",
              tr: "Hesap Oluştur",
              de: "Konto erstellen",
              fr: "Créer un compte",
              zh: "创建账户",
              ko: "계정 만들기",
            })}
          </h1>
          <p className="text-gray-400">
            {tr(lang, {
              en: "Join BEX Trader today",
              fa: "همین امروز به BEX Trader بپیوندید",
              ar: "انضم إلى BEX Trader اليوم",
              es: "Únete a BEX Trader hoy",
              "pt-BR": "Entre para o BEX Trader hoje",
              hi: "आज ही BEX Trader से जुड़ें",
              tr: "Bugün BEX Trader'a katılın",
              de: "Treten Sie BEX Trader noch heute bei",
              fr: "Rejoignez BEX Trader aujourd'hui",
              zh: "立即加入 BEX Trader",
              ko: "오늘 BEX Trader에 가입하세요",
            })}
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {tr(lang, { en: "First Name", fa: "نام", ar: "الاسم الأول", es: "Nombre", "pt-BR": "Nome", hi: "पहला नाम", tr: "Ad", de: "Vorname", fr: "Prénom", zh: "名字", ko: "이름" })}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-[#111a2a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                placeholder={tr(lang, { en: "First name", fa: "نام", ar: "الاسم الأول", es: "Nombre", "pt-BR": "Nome", hi: "पहला नाम", tr: "Ad", de: "Vorname", fr: "Prénom", zh: "名字", ko: "이름" })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {tr(lang, { en: "Last Name", fa: "نام خانوادگی", ar: "اسم العائلة", es: "Apellido", "pt-BR": "Sobrenome", hi: "अंतिम नाम", tr: "Soyad", de: "Nachname", fr: "Nom", zh: "姓氏", ko: "성" })}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-[#111a2a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                placeholder={tr(lang, { en: "Last name", fa: "نام خانوادگی", ar: "اسم العائلة", es: "Apellido", "pt-BR": "Sobrenome", hi: "अंतिम नाम", tr: "Soyad", de: "Nachname", fr: "Nom", zh: "姓氏", ko: "성" })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tr(lang, { en: "Email Address", fa: "آدرس ایمیل", ar: "البريد الإلكتروني", es: "Correo electrónico", "pt-BR": "E-mail", hi: "ईमेल पता", tr: "E-posta Adresi", de: "E-Mail-Adresse", fr: "Adresse e-mail", zh: "电子邮箱", ko: "이메일 주소" })}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#111a2a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
              placeholder={tr(lang, { en: "Enter your email", fa: "ایمیل خود را وارد کنید", ar: "أدخل بريدك الإلكتروني", es: "Ingresa tu correo", "pt-BR": "Digite seu e-mail", hi: "अपना ईमेल दर्ज करें", tr: "E-postanızı girin", de: "E-Mail eingeben", fr: "Entrez votre e-mail", zh: "输入您的邮箱", ko: "이메일을 입력하세요" })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tr(lang, { en: "Username", fa: "نام کاربری", ar: "اسم المستخدم", es: "Nombre de usuario", "pt-BR": "Nome de usuário", hi: "उपयोगकर्ता नाम", tr: "Kullanıcı adı", de: "Benutzername", fr: "Nom d'utilisateur", zh: "用户名", ko: "사용자 이름" })}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#111a2a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
              placeholder={tr(lang, { en: "Choose a username", fa: "یک نام کاربری انتخاب کنید", ar: "اختر اسم مستخدم", es: "Elige un nombre de usuario", "pt-BR": "Escolha um nome de usuário", hi: "उपयोगकर्ता नाम चुनें", tr: "Bir kullanıcı adı seçin", de: "Benutzernamen wählen", fr: "Choisissez un nom d'utilisateur", zh: "选择用户名", ko: "사용자 이름 선택" })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tr(lang, { en: "Country", fa: "کشور", ar: "الدولة", es: "País", "pt-BR": "País", hi: "देश", tr: "Ülke", de: "Land", fr: "Pays", zh: "国家", ko: "국가" })}
            </label>
            <select
              value={countryIso}
              onChange={(e) => setCountryIso(e.target.value)}
              className="w-full bg-[#111a2a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            >
              {COUNTRIES.map((item) => (
                <option key={item.iso2} value={item.iso2}>
                  {item.flag} {countryName(item.iso2, lang)} ({item.dialCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tr(lang, { en: "Phone Number", fa: "شماره تلفن", ar: "رقم الهاتف", es: "Número de teléfono", "pt-BR": "Número de telefone", hi: "फ़ोन नंबर", tr: "Telefon Numarası", de: "Telefonnummer", fr: "Numéro de téléphone", zh: "电话号码", ko: "전화번호" })}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedCountry.dialCode}
                readOnly
                className="w-28 bg-[#111827] border border-gray-700 rounded-xl px-4 py-3 text-white"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 bg-[#111a2a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                placeholder={tr(lang, { en: "Phone number", fa: "شماره تلفن", ar: "رقم الهاتف", es: "Número de teléfono", "pt-BR": "Número de telefone", hi: "फ़ोन नंबर", tr: "Telefon numarası", de: "Telefonnummer", fr: "Numéro de téléphone", zh: "电话号码", ko: "전화번호" })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tr(lang, { en: "Timezone", fa: "منطقه زمانی", ar: "المنطقة الزمنية", es: "Zona horaria", "pt-BR": "Fuso horário", hi: "समय क्षेत्र", tr: "Saat dilimi", de: "Zeitzone", fr: "Fuseau horaire", zh: "时区", ko: "시간대" })}
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-[#111a2a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tr(lang, { en: "Password", fa: "رمز عبور", ar: "كلمة المرور", es: "Contraseña", "pt-BR": "Senha", hi: "पासवर्ड", tr: "Şifre", de: "Passwort", fr: "Mot de passe", zh: "密码", ko: "비밀번호" })}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111a2a] border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                placeholder={tr(lang, { en: "Create password", fa: "رمز عبور بسازید", ar: "أنشئ كلمة مرور", es: "Crea una contraseña", "pt-BR": "Crie uma senha", hi: "पासवर्ड बनाएं", tr: "Şifre oluştur", de: "Passwort erstellen", fr: "Créer un mot de passe", zh: "创建密码", ko: "비밀번호 만들기" })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-white"
                aria-label={showPassword ? tr(lang, { en: "Hide password", fa: "مخفی کردن رمز", ar: "إخفاء كلمة المرور", es: "Ocultar contraseña", "pt-BR": "Ocultar senha", hi: "पासवर्ड छिपाएं", tr: "Şifreyi gizle", de: "Passwort ausblenden", fr: "Masquer le mot de passe", zh: "隐藏密码", ko: "비밀번호 숨기기" }) : tr(lang, { en: "Show password", fa: "نمایش رمز", ar: "إظهار كلمة المرور", es: "Mostrar contraseña", "pt-BR": "Mostrar senha", hi: "पासवर्ड दिखाएं", tr: "Şifreyi göster", de: "Passwort anzeigen", fr: "Afficher le mot de passe", zh: "显示密码", ko: "비밀번호 표시" })}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tr(lang, { en: "Confirm Password", fa: "تکرار رمز عبور", ar: "تأكيد كلمة المرور", es: "Confirmar contraseña", "pt-BR": "Confirmar senha", hi: "पासवर्ड की पुष्टि करें", tr: "Şifreyi Onayla", de: "Passwort bestätigen", fr: "Confirmer le mot de passe", zh: "确认密码", ko: "비밀번호 확인" })}
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#111a2a] border border-gray-700 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                placeholder={tr(lang, { en: "Confirm password", fa: "رمز عبور را تکرار کنید", ar: "أكد كلمة المرور", es: "Confirma la contraseña", "pt-BR": "Confirme a senha", hi: "पासवर्ड की पुष्टि करें", tr: "Şifreyi onayla", de: "Passwort bestätigen", fr: "Confirmer le mot de passe", zh: "确认密码", ko: "비밀번호 확인" })}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-white"
                aria-label={showConfirmPassword ? tr(lang, { en: "Hide password", fa: "مخفی کردن رمز", ar: "إخفاء كلمة المرور", es: "Ocultar contraseña", "pt-BR": "Ocultar senha", hi: "पासवर्ड छिपाएं", tr: "Şifreyi gizle", de: "Passwort ausblenden", fr: "Masquer le mot de passe", zh: "隐藏密码", ko: "비밀번호 숨기기" }) : tr(lang, { en: "Show password", fa: "نمایش رمز", ar: "إظهار كلمة المرور", es: "Mostrar contraseña", "pt-BR": "Mostrar senha", hi: "पासवर्ड दिखाएं", tr: "Şifreyi göster", de: "Passwort anzeigen", fr: "Afficher le mot de passe", zh: "显示密码", ko: "비밀번호 표시" })}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <p className={`text-center text-xs leading-relaxed text-gray-400 ${rtl ? "text-right" : "text-center"}`}>
            {tr(lang, {
              en: "By creating an account, you confirm you are 18+ and agree to our ",
              fa: "با ساخت حساب، تأیید می‌کنید که ۱۸ سال یا بیشتر دارید و با ",
              ar: "بإنشاء حساب، تؤكد أن عمرك 18 عامًا أو أكثر وتوافق على ",
              es: "Al crear una cuenta, confirmas que tienes 18 años o más y aceptas nuestros ",
              "pt-BR": "Ao criar uma conta, você confirma que tem 18 anos ou mais e concorda com nossos ",
              hi: "खाता बनाकर, आप पुष्टि करते हैं कि आपकी आयु 18+ है और आप हमारी ",
              tr: "Hesap oluşturarak 18 yaşında veya daha büyük olduğunuzu ve ",
              de: "Mit der Kontoerstellung bestätigen Sie, dass Sie mindestens 18 Jahre alt sind und unseren ",
              fr: "En créant un compte, vous confirmez avoir 18 ans ou plus et accepter nos ",
              zh: "创建账户即表示您确认已年满 18 岁，并同意我们的",
              ko: "계정을 만들면 만 18세 이상이며 다음에 동의하는 것으로 간주됩니다: ",
            })}
            <Link to="/terms" className="font-semibold text-yellow-400 underline underline-offset-4 hover:text-yellow-300">
              {tr(lang, { en: "Terms of Service", fa: "قوانین استفاده", ar: "شروط الخدمة", es: "Términos de servicio", "pt-BR": "Termos de Serviço", hi: "सेवा की शर्तें", tr: "Hizmet Şartları", de: "Nutzungsbedingungen", fr: "Conditions d’utilisation", zh: "服务条款", ko: "서비스 약관" })}
            </Link>{" "}
            {tr(lang, { en: "and", fa: "و", ar: "و", es: "y", "pt-BR": "e", hi: "और", tr: "ve", de: "und", fr: "et", zh: "和", ko: "및" })}{" "}
            <Link to="/privacy" className="font-semibold text-yellow-400 underline underline-offset-4 hover:text-yellow-300">
              {tr(lang, { en: "Privacy Policy", fa: "سیاست حریم خصوصی", ar: "سياسة الخصوصية", es: "Política de privacidad", "pt-BR": "Política de Privacidade", hi: "गोपनीयता नीति", tr: "Gizlilik Politikası", de: "Datenschutzrichtlinie", fr: "Politique de confidentialité", zh: "隐私政策", ko: "개인정보 처리방침" })}
            </Link>
            {tr(lang, { en: ". Trading involves risk.", fa: " موافق هستید. معامله‌گری ریسک دارد.", ar: ". التداول ينطوي على مخاطر.", es: ". Operar implica riesgo.", "pt-BR": ". Trading envolve risco.", hi: " से सहमत हैं। ट्रेडिंग में जोखिम है।", tr: " kabul etmiş olursunuz. İşlem yapmak risk içerir.", de: " zustimmen. Trading ist mit Risiken verbunden.", fr: ". Le trading comporte des risques.", zh: "。交易存在风险。", ko: "에 동의합니다. 거래에는 위험이 있습니다." })}
          </p>

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/40 transition-all disabled:opacity-50"
          >
            {loading
              ? tr(lang, { en: "Creating Account...", fa: "در حال ساخت حساب...", ar: "جارٍ إنشاء الحساب...", es: "Creando cuenta...", "pt-BR": "Criando conta...", hi: "खाता बनाया जा रहा है...", tr: "Hesap oluşturuluyor...", de: "Konto wird erstellt...", fr: "Création du compte...", zh: "正在创建账户...", ko: "계정을 만드는 중..." })
              : tr(lang, { en: "Create Account", fa: "ساخت حساب", ar: "إنشاء حساب", es: "Crear cuenta", "pt-BR": "Criar conta", hi: "खाता बनाएं", tr: "Hesap Oluştur", de: "Konto erstellen", fr: "Créer un compte", zh: "创建账户", ko: "계정 만들기" })}
          </button>

          <div className="text-center">
            <span className="text-gray-400 text-sm">
              {tr(lang, { en: "Already have an account? ", fa: "قبلاً حساب دارید؟ ", ar: "هل لديك حساب بالفعل؟ ", es: "¿Ya tienes una cuenta? ", "pt-BR": "Já tem uma conta? ", hi: "पहले से खाता है? ", tr: "Zaten hesabınız var mı? ", de: "Sie haben bereits ein Konto? ", fr: "Vous avez déjà un compte ? ", zh: "已有账户？", ko: "이미 계정이 있으신가요? " })}
            </span>
            <Link
              to="/login"
              className="text-yellow-400 text-sm font-medium hover:text-yellow-300"
            >
              {tr(lang, { en: "Sign In", fa: "ورود", ar: "تسجيل الدخول", es: "Iniciar sesión", "pt-BR": "Entrar", hi: "साइन इन", tr: "Giriş Yap", de: "Anmelden", fr: "Se connecter", zh: "登录", ko: "로그인" })}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
