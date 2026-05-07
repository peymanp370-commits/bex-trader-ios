import { ArrowLeft, Mail, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { getLanguage, isRTL, tr } from "../utils/i18n";

type LegalText = Record<string, string>;

const updated: LegalText = {
  en: "Effective date: May 5, 2026",
  fa: "تاریخ اجرا: ۵ می ۲۰۲۶",
  ar: "تاريخ السريان: 5 مايو 2026",
  es: "Fecha de entrada en vigor: 5 de mayo de 2026",
  "pt-BR": "Data de vigência: 5 de maio de 2026",
  hi: "प्रभावी तिथि: 5 मई 2026",
  tr: "Yürürlük tarihi: 5 Mayıs 2026",
  de: "Gültig ab: 5. Mai 2026",
  fr: "Date d’entrée en vigueur : 5 mai 2026",
  zh: "生效日期：2026 年 5 月 5 日",
  ko: "시행일: 2026년 5월 5일",
};

export function DeleteAccount() {
  const lang = getLanguage();
  const rtl = isRTL(lang);

  return (
    <main
      className="min-h-screen bg-[#070b14] px-5 py-8 text-white"
      dir={rtl ? "rtl" : "ltr"}
      lang={lang}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          to="/welcome"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-yellow-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {tr(lang, {
            en: "Back",
            fa: "بازگشت",
            ar: "رجوع",
            es: "Volver",
            "pt-BR": "Voltar",
            hi: "वापस",
            tr: "Geri",
            de: "Zurück",
            fr: "Retour",
            zh: "返回",
            ko: "뒤로",
          })}
        </Link>

        <section className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-[#101827] to-[#080c16] p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-red-500/15 p-3 text-red-400">
              <Trash2 className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight">
                {tr(lang, {
                  en: "Delete Account",
                  fa: "حذف حساب کاربری",
                  ar: "حذف الحساب",
                  es: "Eliminar cuenta",
                  "pt-BR": "Excluir conta",
                  hi: "खाता हटाएँ",
                  tr: "Hesabı Sil",
                  de: "Konto löschen",
                  fr: "Supprimer le compte",
                  zh: "删除账户",
                  ko: "계정 삭제",
                })}
              </h1>

              <p className="mt-2 text-sm text-gray-400">{tr(lang, updated)}</p>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300">
                {tr(lang, {
                  en: "Use this page to request deletion of your BEX Trader account and associated personal data. You can also request deletion of some or all personal data without deleting your account.",
                  fa: "از این صفحه برای درخواست حذف حساب BEX Trader و داده‌های شخصی مرتبط با آن استفاده کنید. همچنین می‌توانید بدون حذف حساب، درخواست حذف بخشی یا همه داده‌های شخصی خود را ارسال کنید.",
                  ar: "استخدم هذه الصفحة لطلب حذف حساب BEX Trader والبيانات الشخصية المرتبطة به. يمكنك أيضًا طلب حذف بعض أو كل البيانات الشخصية دون حذف الحساب.",
                  es: "Usa esta página para solicitar la eliminación de tu cuenta de BEX Trader y los datos personales asociados. También puedes solicitar la eliminación de algunos o todos tus datos personales sin eliminar la cuenta.",
                  "pt-BR": "Use esta página para solicitar a exclusão da sua conta BEX Trader e dos dados pessoais associados. Você também pode solicitar a exclusão de alguns ou todos os dados pessoais sem excluir sua conta.",
                  hi: "इस पेज का उपयोग अपने BEX Trader खाते और उससे जुड़े व्यक्तिगत डेटा को हटाने का अनुरोध करने के लिए करें। आप अपना खाता हटाए बिना भी कुछ या सभी व्यक्तिगत डेटा हटाने का अनुरोध कर सकते हैं।",
                  tr: "Bu sayfayı BEX Trader hesabınızın ve ilişkili kişisel verilerinizin silinmesini talep etmek için kullanın. Ayrıca hesabınızı silmeden bazı veya tüm kişisel verilerinizin silinmesini de talep edebilirsiniz.",
                  de: "Verwenden Sie diese Seite, um die Löschung Ihres BEX Trader-Kontos und der zugehörigen personenbezogenen Daten zu beantragen. Sie können auch die Löschung einiger oder aller personenbezogenen Daten beantragen, ohne Ihr Konto zu löschen.",
                  fr: "Utilisez cette page pour demander la suppression de votre compte BEX Trader et des données personnelles associées. Vous pouvez aussi demander la suppression de certaines ou de toutes vos données personnelles sans supprimer votre compte.",
                  zh: "使用本页面请求删除您的 BEX Trader 账户及相关个人数据。您也可以在不删除账户的情况下请求删除部分或全部个人数据。",
                  ko: "이 페이지를 사용하여 BEX Trader 계정 및 관련 개인 데이터 삭제를 요청할 수 있습니다. 계정을 삭제하지 않고 일부 또는 전체 개인 데이터 삭제를 요청할 수도 있습니다.",
                })}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-xl font-black text-yellow-300">
            <Mail className="h-5 w-5" />
            {tr(lang, {
              en: "How to request deletion",
              fa: "روش درخواست حذف",
              ar: "كيفية طلب الحذف",
              es: "Cómo solicitar la eliminación",
              "pt-BR": "Como solicitar a exclusão",
              hi: "हटाने का अनुरोध कैसे करें",
              tr: "Silme talebi nasıl yapılır",
              de: "So beantragen Sie die Löschung",
              fr: "Comment demander la suppression",
              zh: "如何请求删除",
              ko: "삭제 요청 방법",
            })}
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-7 text-gray-300">
            <p>
              {tr(lang, {
                en: "To request deletion of your BEX Trader account, associated data, or selected personal data, please email us from the email address associated with your account.",
                fa: "برای درخواست حذف حساب BEX Trader، داده‌های مرتبط، یا بخشی از داده‌های شخصی، لطفاً از همان ایمیلی که به حساب شما وصل است برای ما ایمیل ارسال کنید.",
                ar: "لطلب حذف حساب BEX Trader أو البيانات المرتبطة به أو بيانات شخصية محددة، يرجى مراسلتنا من عنوان البريد الإلكتروني المرتبط بحسابك.",
                es: "Para solicitar la eliminación de tu cuenta de BEX Trader, los datos asociados o datos personales específicos, envíanos un correo desde la dirección asociada a tu cuenta.",
                "pt-BR": "Para solicitar a exclusão da sua conta BEX Trader, dos dados associados ou de dados pessoais específicos, envie um e-mail a partir do endereço associado à sua conta.",
                hi: "अपने BEX Trader खाते, संबंधित डेटा या चुने हुए व्यक्तिगत डेटा को हटाने का अनुरोध करने के लिए, कृपया अपने खाते से जुड़े ईमेल पते से हमें ईमेल करें।",
                tr: "BEX Trader hesabınızın, ilişkili verilerinizin veya seçili kişisel verilerinizin silinmesini talep etmek için lütfen hesabınıza bağlı e-posta adresinden bize e-posta gönderin.",
                de: "Um die Löschung Ihres BEX Trader-Kontos, zugehöriger Daten oder ausgewählter personenbezogener Daten zu beantragen, senden Sie uns bitte eine E-Mail von der mit Ihrem Konto verknüpften Adresse.",
                fr: "Pour demander la suppression de votre compte BEX Trader, des données associées ou de certaines données personnelles, envoyez-nous un e-mail depuis l’adresse liée à votre compte.",
                zh: "如需请求删除您的 BEX Trader 账户、相关数据或指定个人数据，请使用与账户关联的电子邮件地址联系我们。",
                ko: "BEX Trader 계정, 관련 데이터 또는 선택한 개인 데이터 삭제를 요청하려면 계정에 연결된 이메일 주소로 문의해 주세요.",
              })}
            </p>

            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
              <p className="font-bold text-white">
                {tr(lang, {
                  en: "Email:",
                  fa: "ایمیل:",
                  ar: "البريد الإلكتروني:",
                  es: "Correo:",
                  "pt-BR": "E-mail:",
                  hi: "ईमेल:",
                  tr: "E-posta:",
                  de: "E-Mail:",
                  fr: "E-mail :",
                  zh: "电子邮件：",
                  ko: "이메일:",
                })}{" "}
                <a
                  href="mailto:support@bextrader.com?subject=Delete%20BEX%20Trader%20Account"
                  className="text-yellow-300 underline decoration-yellow-300/40 underline-offset-4 hover:text-yellow-200"
                >
                  support@bextrader.com
                </a>
              </p>

              <p className="mt-2 text-gray-300">
                {tr(lang, {
                  en: "If support@bextrader.com is temporarily unavailable, you may contact support.bextrader@gmail.com.",
                  fa: "اگر support@bextrader.com موقتاً در دسترس نبود، می‌توانید با support.bextrader@gmail.com تماس بگیرید.",
                  ar: "إذا كان support@bextrader.com غير متاح مؤقتًا، يمكنك التواصل عبر support.bextrader@gmail.com.",
                  es: "Si support@bextrader.com no está disponible temporalmente, puedes contactar a support.bextrader@gmail.com.",
                  "pt-BR": "Se support@bextrader.com estiver temporariamente indisponível, você pode contatar support.bextrader@gmail.com.",
                  hi: "यदि support@bextrader.com अस्थायी रूप से उपलब्ध नहीं है, तो आप support.bextrader@gmail.com पर संपर्क कर सकते हैं।",
                  tr: "support@bextrader.com geçici olarak kullanılamıyorsa support.bextrader@gmail.com ile iletişime geçebilirsiniz.",
                  de: "Falls support@bextrader.com vorübergehend nicht verfügbar ist, können Sie support.bextrader@gmail.com kontaktieren.",
                  fr: "Si support@bextrader.com est temporairement indisponible, vous pouvez contacter support.bextrader@gmail.com.",
                  zh: "如果 support@bextrader.com 暂时不可用，您可以联系 support.bextrader@gmail.com。",
                  ko: "support@bextrader.com을 일시적으로 사용할 수 없는 경우 support.bextrader@gmail.com으로 문의할 수 있습니다.",
                })}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xl font-black text-yellow-300">
            {tr(lang, {
              en: "What to include in your request",
              fa: "در درخواست خود چه چیزی بنویسید",
              ar: "ما الذي يجب تضمينه في طلبك",
              es: "Qué incluir en tu solicitud",
              "pt-BR": "O que incluir no pedido",
              hi: "अपने अनुरोध में क्या शामिल करें",
              tr: "Talebinize neleri eklemelisiniz",
              de: "Was Ihre Anfrage enthalten sollte",
              fr: "Ce qu’il faut inclure dans votre demande",
              zh: "请求中应包含的内容",
              ko: "요청에 포함할 내용",
            })}
          </h2>

          <ul className="mt-4 list-disc space-y-2 px-5 text-sm leading-7 text-gray-300">
            <li>
              {tr(lang, {
                en: "Your BEX Trader account email address",
                fa: "ایمیل حساب BEX Trader شما",
                ar: "عنوان البريد الإلكتروني لحساب BEX Trader الخاص بك",
                es: "El correo electrónico de tu cuenta BEX Trader",
                "pt-BR": "O e-mail da sua conta BEX Trader",
                hi: "आपके BEX Trader खाते का ईमेल पता",
                tr: "BEX Trader hesap e-posta adresiniz",
                de: "Die E-Mail-Adresse Ihres BEX Trader-Kontos",
                fr: "L’adresse e-mail de votre compte BEX Trader",
                zh: "您的 BEX Trader 账户电子邮件地址",
                ko: "BEX Trader 계정 이메일 주소",
              })}
            </li>

            <li>
              {tr(lang, {
                en: "Whether you want to delete your full account or only selected personal data",
                fa: "اینکه می‌خواهید کل حساب حذف شود یا فقط بخشی از داده‌های شخصی",
                ar: "ما إذا كنت تريد حذف الحساب بالكامل أو حذف بيانات شخصية محددة فقط",
                es: "Si deseas eliminar toda tu cuenta o solo datos personales específicos",
                "pt-BR": "Se você deseja excluir toda a conta ou apenas dados pessoais específicos",
                hi: "क्या आप पूरा खाता हटाना चाहते हैं या केवल चुना हुआ व्यक्तिगत डेटा",
                tr: "Tüm hesabınızı mı yoksa yalnızca seçili kişisel verileri mi silmek istediğiniz",
                de: "Ob Sie Ihr gesamtes Konto oder nur ausgewählte personenbezogene Daten löschen möchten",
                fr: "Si vous souhaitez supprimer tout votre compte ou seulement certaines données personnelles",
                zh: "您是要删除整个账户，还是只删除指定个人数据",
                ko: "전체 계정을 삭제할지 또는 선택한 개인 데이터만 삭제할지 여부",
              })}
            </li>

            <li>
              {tr(lang, {
                en: "Any extra details that help us identify your account safely",
                fa: "هر اطلاعات اضافی که کمک کند حساب شما را امن و درست شناسایی کنیم",
                ar: "أي تفاصيل إضافية تساعدنا على تحديد حسابك بأمان",
                es: "Cualquier detalle adicional que nos ayude a identificar tu cuenta de forma segura",
                "pt-BR": "Qualquer detalhe adicional que nos ajude a identificar sua conta com segurança",
                hi: "कोई भी अतिरिक्त जानकारी जो आपके खाते की सुरक्षित पहचान में मदद करे",
                tr: "Hesabınızı güvenli şekilde tanımlamamıza yardımcı olacak ek bilgiler",
                de: "Weitere Angaben, die uns helfen, Ihr Konto sicher zu identifizieren",
                fr: "Tout détail supplémentaire nous aidant à identifier votre compte en toute sécurité",
                zh: "任何有助于我们安全识别您账户的其他信息",
                ko: "계정을 안전하게 식별하는 데 도움이 되는 추가 정보",
              })}
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="flex items-center gap-2 text-xl font-black text-yellow-300">
            <ShieldCheck className="h-5 w-5" />
            {tr(lang, {
              en: "What will be deleted",
              fa: "چه چیزهایی حذف می‌شود",
              ar: "ما الذي سيتم حذفه",
              es: "Qué se eliminará",
              "pt-BR": "O que será excluído",
              hi: "क्या हटाया जाएगा",
              tr: "Neler silinir",
              de: "Was gelöscht wird",
              fr: "Ce qui sera supprimé",
              zh: "将删除的内容",
              ko: "삭제되는 항목",
            })}
          </h2>

          <div className="mt-4 space-y-3 text-sm leading-7 text-gray-300">
            <p>
              {tr(lang, {
                en: "After we verify your request, we will delete or anonymize account data associated with your BEX Trader account, such as account identifiers, login-related account records, app preferences, notification records, and other personal data that is no longer required to provide the service.",
                fa: "بعد از تأیید درخواست، داده‌های مرتبط با حساب BEX Trader شما حذف یا ناشناس‌سازی می‌شود؛ مثل شناسه‌های حساب، رکوردهای مربوط به ورود، تنظیمات اپ، رکوردهای اعلان و سایر داده‌های شخصی که دیگر برای ارائه سرویس لازم نیست.",
                ar: "بعد التحقق من طلبك، سنحذف أو نُخفي هوية بيانات الحساب المرتبطة بحساب BEX Trader، مثل معرفات الحساب، وسجلات تسجيل الدخول، وتفضيلات التطبيق، وسجلات الإشعارات، والبيانات الشخصية الأخرى التي لم تعد مطلوبة لتقديم الخدمة.",
                es: "Después de verificar tu solicitud, eliminaremos o anonimizaremos los datos asociados a tu cuenta de BEX Trader, como identificadores de cuenta, registros de inicio de sesión, preferencias, registros de notificaciones y otros datos personales que ya no sean necesarios.",
                "pt-BR": "Após verificarmos seu pedido, excluiremos ou anonimizaremos dados associados à sua conta BEX Trader, como identificadores de conta, registros de login, preferências, registros de notificações e outros dados pessoais que não sejam mais necessários.",
                hi: "आपके अनुरोध को सत्यापित करने के बाद, हम आपके BEX Trader खाते से जुड़े डेटा को हटा देंगे या anonymize करेंगे, जैसे account identifiers, login records, app preferences, notification records और अन्य personal data जिसकी अब आवश्यकता नहीं है।",
                tr: "Talebinizi doğruladıktan sonra BEX Trader hesabınızla ilişkili hesap tanımlayıcıları, giriş kayıtları, uygulama tercihleri, bildirim kayıtları ve hizmet için artık gerekli olmayan diğer kişisel verileri siler veya anonimleştiririz.",
                de: "Nach Prüfung Ihrer Anfrage löschen oder anonymisieren wir Kontodaten, die mit Ihrem BEX Trader-Konto verbunden sind, z. B. Kontoidentifikatoren, Login-Datensätze, App-Einstellungen, Benachrichtigungsdaten und andere nicht mehr erforderliche personenbezogene Daten.",
                fr: "Après vérification de votre demande, nous supprimerons ou anonymiserons les données liées à votre compte BEX Trader, telles que les identifiants de compte, les enregistrements de connexion, les préférences, les notifications et les autres données personnelles qui ne sont plus nécessaires.",
                zh: "在验证您的请求后，我们将删除或匿名化与您的 BEX Trader 账户相关的数据，例如账户标识符、登录相关记录、应用偏好、通知记录以及不再需要的其他个人数据。",
                ko: "요청을 확인한 후 BEX Trader 계정과 관련된 계정 식별자, 로그인 관련 기록, 앱 설정, 알림 기록 및 서비스 제공에 더 이상 필요하지 않은 기타 개인 데이터를 삭제하거나 익명화합니다.",
              })}
            </p>

            <p>
              {tr(lang, {
                en: "Some information may be retained when required for legal, security, fraud prevention, tax, accounting, payment, dispute resolution, or transaction record purposes.",
                fa: "برخی اطلاعات ممکن است برای الزامات قانونی، امنیتی، جلوگیری از تقلب، مالیاتی، حسابداری، پرداخت، حل اختلاف یا سوابق تراکنش نگهداری شود.",
                ar: "قد يتم الاحتفاظ ببعض المعلومات عند الحاجة لأغراض قانونية أو أمنية أو منع الاحتيال أو الضرائب أو المحاسبة أو الدفع أو حل النزاعات أو سجلات المعاملات.",
                es: "Parte de la información puede conservarse cuando sea necesario por motivos legales, seguridad, prevención de fraude, impuestos, contabilidad, pagos, resolución de disputas o registros de transacciones.",
                "pt-BR": "Algumas informações podem ser mantidas quando necessário para fins legais, segurança, prevenção de fraude, impostos, contabilidade, pagamentos, resolução de disputas ou registros de transações.",
                hi: "कुछ जानकारी कानूनी, सुरक्षा, fraud prevention, tax, accounting, payment, dispute resolution या transaction record purposes के लिए रखी जा सकती है।",
                tr: "Bazı bilgiler yasal, güvenlik, dolandırıcılık önleme, vergi, muhasebe, ödeme, uyuşmazlık çözümü veya işlem kayıtları amacıyla saklanabilir.",
                de: "Einige Informationen können aufbewahrt werden, wenn dies für rechtliche, sicherheitsbezogene, Betrugspräventions-, Steuer-, Buchhaltungs-, Zahlungs-, Streitbeilegungs- oder Transaktionszwecke erforderlich ist.",
                fr: "Certaines informations peuvent être conservées si nécessaire pour des raisons légales, de sécurité, de prévention de la fraude, fiscales, comptables, de paiement, de résolution des litiges ou d’enregistrement des transactions.",
                zh: "在法律、安全、欺诈防范、税务、会计、支付、争议解决或交易记录需要时，部分信息可能会被保留。",
                ko: "법률, 보안, 사기 방지, 세금, 회계, 결제, 분쟁 해결 또는 거래 기록 목적상 필요한 일부 정보는 보관될 수 있습니다.",
              })}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-300">
          <div className="flex items-center gap-2 font-bold text-white">
            <Mail className="h-4 w-4 text-yellow-400" />
            BEX Trader
          </div>
          <p className="mt-2">support@bextrader.com · https://bextrader.com</p>
        </section>
      </div>
    </main>
  );
}

export default DeleteAccount;
