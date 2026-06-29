import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoImage from "../../assets/bex-brand-logo.png";
import { getLanguage, tr, type Lang } from "../utils/i18n";

export function AgeVerification() {
  const navigate = useNavigate();
  const [selectedAge, setSelectedAge] = useState<"yes" | "no" | null>(null);
  const [lang, setLang] = useState<Lang>(getLanguage());

  const isRtl = lang === "fa" || lang === "ar";

  useEffect(() => {
    const syncLanguage = () => setLang(getLanguage());
    window.addEventListener("languageChange", syncLanguage);
    window.addEventListener("storage", syncLanguage);
    return () => {
      window.removeEventListener("languageChange", syncLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [lang, isRtl]);


  const handleConfirm = () => {
    if (selectedAge === "yes") {
      navigate("/login");
      return;
    }

    if (selectedAge === "no") {
      alert(
        tr(lang, {
          en: "You must be 18 or older to use this app.",
          fa: "برای استفاده از این برنامه باید ۱۸ سال یا بیشتر داشته باشید.",
          ar: "يجب أن يكون عمرك 18 عامًا أو أكثر لاستخدام هذا التطبيق.",
          es: "Debes tener 18 años o más para usar esta aplicación.",
          "pt-BR": "Você deve ter 18 anos ou mais para usar este aplicativo.",
          hi: "इस ऐप का उपयोग करने के लिए आपकी आयु 18 वर्ष या उससे अधिक होनी चाहिए.",
          tr: "Bu uygulamayı kullanmak için 18 yaşında veya daha büyük olmalısınız.",
          de: "Du musst mindestens 18 Jahre alt sein, um diese App zu verwenden.",
          fr: "Vous devez avoir 18 ans ou plus pour utiliser cette application.",
          zh: "你必须年满 18 岁才能使用此应用。",
          ko: "이 앱을 사용하려면 만 18세 이상이어야 합니다.",
        })
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#050812] text-white flex flex-col items-center justify-center p-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md text-center">

        <div className="mb-8">
          <img
            src={logoImage}
            alt="BEX"
            className="mx-auto mb-4 h-[110px] w-[190px] object-contain object-center"
          />
        </div>

        <h1 className="text-3xl font-bold mb-4">
          {tr(lang, {
            en: "Age Verification",
            fa: "تأیید سن",
            ar: "التحقق من العمر",
            es: "Verificación de edad",
            "pt-BR": "Verificação de idade",
            hi: "आयु सत्यापन",
            tr: "Yaş Doğrulama",
            de: "Altersprüfung",
            fr: "Vérification de l’âge",
            zh: "年龄验证",
            ko: "나이 확인",
          })}
        </h1>

        <p className="text-gray-300 mb-8">
          {tr(lang, {
            en: "Trading involves financial risk. You must be 18 years or older to use this application.",
            fa: "معامله‌گری با ریسک مالی همراه است. برای استفاده از این برنامه باید ۱۸ سال یا بیشتر داشته باشید.",
            ar: "ينطوي التداول على مخاطر مالية. يجب أن يكون عمرك 18 عامًا أو أكثر لاستخدام هذا التطبيق.",
            es: "El trading implica riesgo financiero. Debes tener 18 años o más para usar esta aplicación.",
            "pt-BR": "Operar envolve risco financeiro. Você deve ter 18 anos ou mais para usar este aplicativo.",
            hi: "ट्रेडिंग में वित्तीय जोखिम शामिल है। इस ऐप का उपयोग करने के लिए आपकी आयु 18 वर्ष या उससे अधिक होनी चाहिए.",
            tr: "Trading finansal risk içerir. Bu uygulamayı kullanmak için 18 yaşında veya daha büyük olmalısınız.",
            de: "Trading ist mit finanziellen Risiken verbunden. Du musst mindestens 18 Jahre alt sein, um diese App zu verwenden.",
            fr: "Le trading comporte des risques financiers. Vous devez avoir 18 ans ou plus pour utiliser cette application.",
            zh: "交易涉及金融风险。你必须年满 18 岁才能使用此应用。",
            ko: "트레이딩에는 금융 위험이 따릅니다. 이 앱을 사용하려면 만 18세 이상이어야 합니다.",
          })}
        </p>

        <div className="space-y-4 mb-8">
          <button
            onClick={() => setSelectedAge("yes")}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              selectedAge === "yes"
                ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black shadow-lg shadow-yellow-500/30"
                : "bg-[#111a2a] text-white border-2 border-gray-700 hover:border-yellow-500"
            }`}
          >
            ✓ {tr(lang, {
              en: "I am 18 years or older",
              fa: "من ۱۸ سال یا بیشتر دارم",
              ar: "عمري 18 عامًا أو أكثر",
              es: "Tengo 18 años o más",
              "pt-BR": "Tenho 18 anos ou mais",
              hi: "मेरी आयु 18 वर्ष या उससे अधिक है",
              tr: "18 yaşında veya daha büyüğüm",
              de: "Ich bin 18 Jahre oder älter",
              fr: "J’ai 18 ans ou plus",
              zh: "我已年满 18 岁",
              ko: "저는 만 18세 이상입니다",
            })}
          </button>

          <button
            onClick={() => setSelectedAge("no")}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              selectedAge === "no"
                ? "bg-red-500/20 text-red-400 border-2 border-red-500"
                : "bg-[#111a2a] text-white border-2 border-gray-700 hover:border-red-500"
            }`}
          >
            ✗ {tr(lang, {
              en: "I am under 18",
              fa: "من زیر ۱۸ سال هستم",
              ar: "عمري أقل من 18 عامًا",
              es: "Soy menor de 18 años",
              "pt-BR": "Tenho menos de 18 anos",
              hi: "मेरी आयु 18 वर्ष से कम है",
              tr: "18 yaşından küçüğüm",
              de: "Ich bin unter 18 Jahre alt",
              fr: "J’ai moins de 18 ans",
              zh: "我未满 18 岁",
              ko: "저는 만 18세 미만입니다",
            })}
          </button>
        </div>

        {selectedAge && (
          <button
            onClick={handleConfirm}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40 transition-all"
          >
            {tr(lang, {
              en: "Continue",
              fa: "ادامه",
              ar: "متابعة",
              es: "Continuar",
              "pt-BR": "Continuar",
              hi: "जारी रखें",
              tr: "Devam Et",
              de: "Weiter",
              fr: "Continuer",
              zh: "继续",
              ko: "계속",
            })}
          </button>
        )}

        <div className={`mt-8 bg-[#0b1220] rounded-[1.35rem] p-5 border backdrop-blur-md border-yellow-500/20 ${isRtl ? "text-right" : "text-left"}`}>
          <p className="text-xs text-yellow-400 font-bold tracking-widest mb-3">
            ⚠️ {tr(lang, {
              en: "IMPORTANT NOTICE",
              fa: "اطلاعیه مهم",
              ar: "إشعار مهم",
              es: "AVISO IMPORTANTE",
              "pt-BR": "AVISO IMPORTANTE",
              hi: "महत्वपूर्ण सूचना",
              tr: "ÖNEMLİ BİLDİRİM",
              de: "WICHTIGER HINWEIS",
              fr: "AVIS IMPORTANT",
              zh: "重要提示",
              ko: "중요 안내",
            })}
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {tr(lang, {
              en: "By continuing, you confirm that you understand the risks associated with trading and that you meet the minimum age requirement to access financial trading services in your jurisdiction.",
              fa: "با ادامه دادن، تأیید می‌کنید که ریسک‌های مربوط به معامله‌گری را می‌دانید و حداقل سن قانونی لازم برای دسترسی به خدمات معاملاتی مالی در محل زندگی خود را دارید.",
              ar: "بمتابعتك، فإنك تؤكد أنك تفهم المخاطر المرتبطة بالتداول وأنك تستوفي الحد الأدنى للعمر المطلوب للوصول إلى خدمات التداول المالي في نطاقك القانوني.",
              es: "Al continuar, confirmas que comprendes los riesgos asociados con el trading y que cumples con el requisito mínimo de edad para acceder a servicios de trading financiero en tu jurisdicción.",
              "pt-BR": "Ao continuar, você confirma que entende os riscos associados à negociação e que atende ao requisito mínimo de idade para acessar serviços financeiros de trading em sua jurisdição.",
              hi: "जारी रखकर, आप पुष्टि करते हैं कि आप ट्रेडिंग से जुड़े जोखिमों को समझते हैं और अपने क्षेत्र में वित्तीय ट्रेडिंग सेवाओं तक पहुंचने के लिए न्यूनतम आयु आवश्यकता को पूरा करते हैं.",
              tr: "Devam ederek, trading ile ilişkili riskleri anladığınızı ve bulunduğunuz yargı bölgesinde finansal trading hizmetlerine erişmek için gerekli minimum yaş şartını karşıladığınızı onaylarsınız.",
              de: "Mit dem Fortfahren bestätigst du, dass du die mit dem Trading verbundenen Risiken verstehst und die Mindestalteranforderung für den Zugang zu Finanzhandelsdiensten in deiner Gerichtsbarkeit erfüllst.",
              fr: "En continuant, vous confirmez que vous comprenez les risques associés au trading et que vous remplissez l’âge minimum requis pour accéder aux services de trading financier dans votre juridiction.",
              zh: "继续即表示你确认已了解交易相关风险，并符合你所在司法管辖区访问金融交易服务的最低年龄要求。",
              ko: "계속하면 트레이딩과 관련된 위험을 이해하며, 거주 지역에서 금융 트레이딩 서비스를 이용하기 위한 최소 연령 요건을 충족함을 확인하는 것입니다.",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

