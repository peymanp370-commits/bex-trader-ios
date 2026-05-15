import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Globe2 } from "lucide-react";
import logoImage from "../../assets/bex-brand-logo.png";
import { getLanguage, markRTL } from "../utils/i18n";

const AUTH_BASE =
  import.meta.env.VITE_API_URL || "https://auth.bextrader.com";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fa", label: "فارسی" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "hi", label: "हिन्दी" },
  { code: "tr", label: "Türkçe" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "zh", label: "中文" },
  { code: "ko", label: "한국어" },
] as const;

type LangCode = (typeof LANGUAGES)[number]["code"];
type Dict = Record<LangCode, string>;

const isSupportedLang = (value: string): value is LangCode =>
  LANGUAGES.some((item) => item.code === value);

function normalizeLang(value: unknown): LangCode {
  const raw = String(value || "").trim();
  if (isSupportedLang(raw)) return raw;
  const lower = raw.toLowerCase();
  if (lower === "pt-br" || lower === "pt_br") return "pt-BR";
  if (lower.startsWith("fa")) return "fa";
  if (lower.startsWith("ar")) return "ar";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("hi")) return "hi";
  if (lower.startsWith("tr")) return "tr";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("ko")) return "ko";
  return "en";
}

function readInitialLanguage(): LangCode {
  try {
    return normalizeLang(
      localStorage.getItem("userLanguage") ||
        localStorage.getItem("lang") ||
        localStorage.getItem("language") ||
        getLanguage()
    );
  } catch {
    return "en";
  }
}

function saveLanguage(lang: LangCode) {
  try {
    localStorage.setItem("userLanguage", lang);
    localStorage.setItem("lang", lang);
    localStorage.setItem("language", lang);
    window.dispatchEvent(new CustomEvent("languageChange", { detail: { lang } }));
  } catch {}
}

function rtl(lang: string) {
  return lang === "fa" || lang === "ar";
}

function tt(lang: LangCode, dict: Dict) {
  return dict[lang] || dict.en;
}

const TEXT = {
  title: {
    en: "Reset Password",
    fa: "تغییر رمز عبور",
    ar: "إعادة تعيين كلمة المرور",
    es: "Restablecer contraseña",
    "pt-BR": "Redefinir senha",
    hi: "पासवर्ड रीसेट करें",
    tr: "Şifreyi Sıfırla",
    de: "Passwort zurücksetzen",
    fr: "Réinitialiser le mot de passe",
    zh: "重置密码",
    ko: "비밀번호 재설정",
  },
  subtitle: {
    en: "Create a new password for your account",
    fa: "رمز عبور جدید برای حساب خود بسازید",
    ar: "أنشئ كلمة مرور جديدة لحسابك",
    es: "Crea una nueva contraseña para tu cuenta",
    "pt-BR": "Crie uma nova senha para sua conta",
    hi: "अपने खाते के लिए नया पासवर्ड बनाएं",
    tr: "Hesabınız için yeni bir şifre oluşturun",
    de: "Erstelle ein neues Passwort für dein Konto",
    fr: "Créez un nouveau mot de passe pour votre compte",
    zh: "为你的账户创建新密码",
    ko: "계정의 새 비밀번호를 만드세요",
  },
  language: {
    en: "Language",
    fa: "زبان",
    ar: "اللغة",
    es: "Idioma",
    "pt-BR": "Idioma",
    hi: "भाषा",
    tr: "Dil",
    de: "Sprache",
    fr: "Langue",
    zh: "语言",
    ko: "언어",
  },
  tokenMissing: {
    en: "Reset token is missing.",
    fa: "توکن بازیابی رمز عبور وجود ندارد.",
    ar: "رمز إعادة التعيين مفقود.",
    es: "Falta el token de restablecimiento.",
    "pt-BR": "O token de redefinição está ausente.",
    hi: "रीसेट टोकन गायब है।",
    tr: "Sıfırlama tokenı eksik.",
    de: "Reset-Token fehlt.",
    fr: "Le jeton de réinitialisation est manquant.",
    zh: "缺少重置令牌。",
    ko: "재설정 토큰이 없습니다.",
  },
  tokenInvalidBox: {
    en: "Reset token is missing or invalid.",
    fa: "لینک بازیابی نامعتبر است یا توکن وجود ندارد.",
    ar: "رمز إعادة التعيين مفقود أو غير صالح.",
    es: "El token de restablecimiento falta o no es válido.",
    "pt-BR": "O token de redefinição está ausente ou é inválido.",
    hi: "रीसेट टोकन गायब या अमान्य है।",
    tr: "Sıfırlama tokenı eksik veya geçersiz.",
    de: "Der Reset-Token fehlt oder ist ungültig.",
    fr: "Le jeton de réinitialisation est manquant ou invalide.",
    zh: "重置令牌缺失或无效。",
    ko: "재설정 토큰이 없거나 유효하지 않습니다.",
  },
  fillAll: {
    en: "Please fill in all fields.",
    fa: "لطفاً همه فیلدها را پر کنید.",
    ar: "يرجى ملء جميع الحقول.",
    es: "Completa todos los campos.",
    "pt-BR": "Preencha todos os campos.",
    hi: "कृपया सभी फ़ील्ड भरें।",
    tr: "Lütfen tüm alanları doldurun.",
    de: "Bitte fülle alle Felder aus.",
    fr: "Veuillez remplir tous les champs.",
    zh: "请填写所有字段。",
    ko: "모든 항목을 입력하세요.",
  },
  minPassword: {
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
  },
  mismatch: {
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
  },
  resetFailed: {
    en: "Could not reset password.",
    fa: "امکان تغییر رمز عبور وجود نداشت.",
    ar: "تعذر إعادة تعيين كلمة المرور.",
    es: "No se pudo restablecer la contraseña.",
    "pt-BR": "Não foi possível redefinir a senha.",
    hi: "पासवर्ड रीसेट नहीं हो सका।",
    tr: "Şifre sıfırlanamadı.",
    de: "Passwort konnte nicht zurückgesetzt werden.",
    fr: "Impossible de réinitialiser le mot de passe.",
    zh: "无法重置密码。",
    ko: "비밀번호를 재설정할 수 없습니다.",
  },
  success: {
    en: "Password reset successful.",
    fa: "رمز عبور با موفقیت تغییر کرد.",
    ar: "تمت إعادة تعيين كلمة المرور بنجاح.",
    es: "Contraseña restablecida correctamente.",
    "pt-BR": "Senha redefinida com sucesso.",
    hi: "पासवर्ड सफलतापूर्वक रीसेट हो गया।",
    tr: "Şifre başarıyla sıfırlandı.",
    de: "Passwort erfolgreich zurückgesetzt.",
    fr: "Mot de passe réinitialisé avec succès.",
    zh: "密码重置成功。",
    ko: "비밀번호가 성공적으로 재설정되었습니다.",
  },
  newPassword: {
    en: "New Password",
    fa: "رمز عبور جدید",
    ar: "كلمة المرور الجديدة",
    es: "Nueva contraseña",
    "pt-BR": "Nova senha",
    hi: "नया पासवर्ड",
    tr: "Yeni Şifre",
    de: "Neues Passwort",
    fr: "Nouveau mot de passe",
    zh: "新密码",
    ko: "새 비밀번호",
  },
  enterNewPassword: {
    en: "Enter new password",
    fa: "رمز عبور جدید را وارد کنید",
    ar: "أدخل كلمة المرور الجديدة",
    es: "Ingresa la nueva contraseña",
    "pt-BR": "Digite a nova senha",
    hi: "नया पासवर्ड दर्ज करें",
    tr: "Yeni şifreyi girin",
    de: "Neues Passwort eingeben",
    fr: "Entrez le nouveau mot de passe",
    zh: "输入新密码",
    ko: "새 비밀번호 입력",
  },
  confirmNewPassword: {
    en: "Confirm New Password",
    fa: "تکرار رمز عبور جدید",
    ar: "تأكيد كلمة المرور الجديدة",
    es: "Confirmar nueva contraseña",
    "pt-BR": "Confirmar nova senha",
    hi: "नए पासवर्ड की पुष्टि करें",
    tr: "Yeni Şifreyi Onayla",
    de: "Neues Passwort bestätigen",
    fr: "Confirmer le nouveau mot de passe",
    zh: "确认新密码",
    ko: "새 비밀번호 확인",
  },
  confirmPlaceholder: {
    en: "Confirm new password",
    fa: "رمز عبور جدید را تکرار کنید",
    ar: "أكد كلمة المرور الجديدة",
    es: "Confirma la nueva contraseña",
    "pt-BR": "Confirme a nova senha",
    hi: "नए पासवर्ड की पुष्टि करें",
    tr: "Yeni şifreyi onaylayın",
    de: "Neues Passwort bestätigen",
    fr: "Confirmez le nouveau mot de passe",
    zh: "确认新密码",
    ko: "새 비밀번호 확인",
  },
  updating: {
    en: "Updating...",
    fa: "در حال تغییر...",
    ar: "جارٍ التحديث...",
    es: "Actualizando...",
    "pt-BR": "Atualizando...",
    hi: "अपडेट हो रहा है...",
    tr: "Güncelleniyor...",
    de: "Wird aktualisiert...",
    fr: "Mise à jour...",
    zh: "正在更新...",
    ko: "업데이트 중...",
  },
  resetButton: {
    en: "Reset Password",
    fa: "تغییر رمز عبور",
    ar: "إعادة تعيين كلمة المرور",
    es: "Restablecer contraseña",
    "pt-BR": "Redefinir senha",
    hi: "पासवर्ड रीसेट करें",
    tr: "Şifreyi Sıfırla",
    de: "Passwort zurücksetzen",
    fr: "Réinitialiser le mot de passe",
    zh: "重置密码",
    ko: "비밀번호 재설정",
  },
  backToLogin: {
    en: "Back to Login",
    fa: "بازگشت به ورود",
    ar: "العودة إلى تسجيل الدخول",
    es: "Volver al inicio de sesión",
    "pt-BR": "Voltar ao login",
    hi: "लॉगिन पर वापस जाएं",
    tr: "Girişe Dön",
    de: "Zurück zum Login",
    fr: "Retour à la connexion",
    zh: "返回登录",
    ko: "로그인으로 돌아가기",
  },
  hidePassword: {
    en: "Hide password",
    fa: "مخفی کردن رمز عبور",
    ar: "إخفاء كلمة المرور",
    es: "Ocultar contraseña",
    "pt-BR": "Ocultar senha",
    hi: "पासवर्ड छिपाएं",
    tr: "Şifreyi gizle",
    de: "Passwort ausblenden",
    fr: "Masquer le mot de passe",
    zh: "隐藏密码",
    ko: "비밀번호 숨기기",
  },
  showPassword: {
    en: "Show password",
    fa: "نمایش رمز عبور",
    ar: "إظهار كلمة المرور",
    es: "Mostrar contraseña",
    "pt-BR": "Mostrar senha",
    hi: "पासवर्ड दिखाएं",
    tr: "Şifreyi göster",
    de: "Passwort anzeigen",
    fr: "Afficher le mot de passe",
    zh: "显示密码",
    ko: "비밀번호 보기",
  },
} satisfies Record<string, Dict>;

export function ResetPassword() {
  const [lang, setLang] = useState<LangCode>(() => readInitialLanguage());
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    saveLanguage(lang);
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = rtl(lang) ? "rtl" : "ltr";
      document.body.dir = rtl(lang) ? "rtl" : "ltr";
    }
  }, [lang]);

  const handleLanguageChange = (value: string) => {
    const nextLang = normalizeLang(value);
    setLang(nextLang);
    saveLanguage(nextLang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setError(tt(lang, TEXT.tokenMissing));
      return;
    }

    if (!password || !confirmPassword) {
      setError(tt(lang, TEXT.fillAll));
      return;
    }

    if (password.length < 6) {
      setError(tt(lang, TEXT.minPassword));
      return;
    }

    if (password !== confirmPassword) {
      setError(tt(lang, TEXT.mismatch));
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${AUTH_BASE}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          token,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || tt(lang, TEXT.resetFailed));
        return;
      }

      setSuccess(data?.message || tt(lang, TEXT.success));
      setTimeout(() => navigate("/login"), 1200);
    } catch {
      setError(tt(lang, TEXT.resetFailed));
    } finally {
      setLoading(false);
    }
  };

  const inputPadding = rtl(lang) ? "pl-12 pr-4" : "pr-12 pl-4";
  const iconSide = rtl(lang) ? "left-0" : "right-0";

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md" {...markRTL(lang as any)}>
        <div className="flex justify-end mb-4">
          <div className="relative w-full sm:w-64">
            <Globe2 className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400 ${rtl(lang) ? "right-3" : "left-3"}`} />
            <select
              value={lang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className={`w-full max-h-48 bg-[#1a2332] border border-gray-700 rounded-xl py-3 ${rtl(lang) ? "pr-10 pl-4" : "pl-10 pr-4"} text-sm text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20`}
              aria-label={tt(lang, TEXT.language)}
            >
              {LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-center mb-6">
          <img
            src={logoImage}
            alt="BEX"
            className="mx-auto mb-4 h-[96px] w-[180px] object-contain object-center"
          />
          <h1 className="text-3xl font-bold mb-2">{tt(lang, TEXT.title)}</h1>
          <p className="text-gray-400">{tt(lang, TEXT.subtitle)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!token ? (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {tt(lang, TEXT.tokenInvalidBox)}
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tt(lang, TEXT.newPassword)}
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-[#1a2332] border border-gray-700 rounded-xl py-3 ${inputPadding} text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20`}
                placeholder={tt(lang, TEXT.enterNewPassword)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={`absolute inset-y-0 ${iconSide} px-4 flex items-center text-gray-400 hover:text-white`}
                aria-label={showPassword ? tt(lang, TEXT.hidePassword) : tt(lang, TEXT.showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {tt(lang, TEXT.confirmNewPassword)}
            </label>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full bg-[#1a2332] border border-gray-700 rounded-xl py-3 ${inputPadding} text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20`}
                placeholder={tt(lang, TEXT.confirmPlaceholder)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className={`absolute inset-y-0 ${iconSide} px-4 flex items-center text-gray-400 hover:text-white`}
                aria-label={showConfirmPassword ? tt(lang, TEXT.hidePassword) : tt(lang, TEXT.showPassword)}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/40 transition-all disabled:opacity-50"
          >
            {loading ? tt(lang, TEXT.updating) : tt(lang, TEXT.resetButton)}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="text-sm text-gray-400 hover:text-yellow-400 transition-colors"
            >
              {tt(lang, TEXT.backToLogin)}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
