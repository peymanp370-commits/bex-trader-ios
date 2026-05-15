import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { getLanguage, isRTL, tr } from "../utils/i18n";

type LegalText = Record<string, string>;
type LegalSection = { title: LegalText; body: LegalText[] };

const updated: LegalText = {
  en: "Effective date: May 1, 2026",
  fa: "تاریخ اجرا: ۱ می ۲۰۲۶",
  ar: "تاريخ السريان: 1 مايو 2026",
  es: "Fecha de entrada en vigor: 1 de mayo de 2026",
  "pt-BR": "Data de vigência: 1 de maio de 2026",
  hi: "प्रभावी तिथि: 1 मई 2026",
  tr: "Yürürlük tarihi: 1 Mayıs 2026",
  de: "Gültig ab: 1. Mai 2026",
  fr: "Date d’entrée en vigueur : 1 mai 2026",
  zh: "生效日期：2026 年 5 月 1 日",
  ko: "시행일: 2026년 5월 1일",
};

const sections: LegalSection[] = [
  {
    title: {
      en: "1. What BEX Trader does",
      fa: "۱. BEX Trader چه کاری انجام می‌دهد",
      ar: "1. ماذا يفعل BEX Trader",
      es: "1. Qué hace BEX Trader",
      "pt-BR": "1. O que o BEX Trader faz",
      hi: "1. BEX Trader क्या करता है",
      tr: "1. BEX Trader ne yapar",
      de: "1. Was BEX Trader macht",
      fr: "1. Ce que fait BEX Trader",
      zh: "1. BEX Trader 的用途",
      ko: "1. BEX Trader가 제공하는 서비스",
    },
    body: [
      {
        en: "BEX Trader provides AI-assisted market analysis, gold and silver trading signals, market context, performance statistics, push notifications, subscription plans, and optional VIP Auto Trading tools connected to MetaTrader 5 (MT5).",
        fa: "BEX Trader تحلیل بازار با کمک هوش مصنوعی، سیگنال‌های طلا و نقره، وضعیت بازار، آمار عملکرد، اعلان‌ها، پلن‌های اشتراک و ابزار اختیاری VIP Auto Trading متصل به MetaTrader 5 (MT5) ارائه می‌دهد.",
        ar: "يوفر BEX Trader تحليلاً للسوق بمساعدة الذكاء الاصطناعي، وإشارات للذهب والفضة، وسياق السوق، وإحصاءات الأداء، والإشعارات، وخطط الاشتراك، وأدوات VIP Auto Trading الاختيارية المتصلة بـ MetaTrader 5 (MT5).",
        es: "BEX Trader ofrece análisis de mercado asistido por IA, señales de oro y plata, contexto de mercado, estadísticas de rendimiento, notificaciones push, planes de suscripción y herramientas opcionales VIP Auto Trading conectadas a MetaTrader 5 (MT5).",
        "pt-BR": "O BEX Trader fornece análise de mercado assistida por IA, sinais de ouro e prata, contexto de mercado, estatísticas de desempenho, notificações push, planos de assinatura e ferramentas opcionais VIP Auto Trading conectadas ao MetaTrader 5 (MT5).",
        hi: "BEX Trader AI-सहायता प्राप्त बाजार विश्लेषण, सोना और चांदी के ट्रेडिंग सिग्नल, मार्केट कॉन्टेक्स्ट, प्रदर्शन आँकड़े, push notifications, subscription plans और MetaTrader 5 (MT5) से जुड़े वैकल्पिक VIP Auto Trading tools प्रदान करता है।",
        tr: "BEX Trader; yapay zekâ destekli piyasa analizi, altın ve gümüş sinyalleri, piyasa bağlamı, performans istatistikleri, push bildirimleri, abonelik planları ve MetaTrader 5 (MT5) ile bağlantılı isteğe bağlı VIP Auto Trading araçları sunar.",
        de: "BEX Trader bietet KI-gestützte Marktanalysen, Gold- und Silbersignale, Marktkontext, Leistungsstatistiken, Push-Benachrichtigungen, Abonnementpläne und optionale VIP Auto Trading-Tools mit MetaTrader 5 (MT5).",
        fr: "BEX Trader fournit une analyse de marché assistée par IA, des signaux sur l’or et l’argent, le contexte du marché, des statistiques de performance, des notifications push, des abonnements et des outils VIP Auto Trading optionnels connectés à MetaTrader 5 (MT5).",
        zh: "BEX Trader 提供 AI 辅助市场分析、黄金和白银交易信号、市场背景、绩效统计、推送通知、订阅计划，以及可选的连接 MetaTrader 5（MT5）的 VIP Auto Trading 工具。",
        ko: "BEX Trader는 AI 기반 시장 분석, 금/은 거래 신호, 시장 컨텍스트, 성과 통계, 푸시 알림, 구독 플랜, MetaTrader 5(MT5)와 연결되는 선택형 VIP Auto Trading 도구를 제공합니다.",
      },
      {
        en: "BEX Trader is not a broker, dealer, investment adviser, financial adviser, portfolio manager, or money manager. Our service is provided for informational, educational, analytical, and software automation purposes only.",
        fa: "BEX Trader بروکر، معامله‌گر، مشاور سرمایه‌گذاری، مشاور مالی، مدیر سبد یا مدیر سرمایه نیست. خدمات فقط برای اهداف اطلاعاتی، آموزشی، تحلیلی و نرم‌افزاری ارائه می‌شود.",
        ar: "BEX Trader ليس وسيطًا أو تاجرًا أو مستشارًا استثماريًا أو ماليًا أو مدير محفظة أو مدير أموال. تُقدّم الخدمة لأغراض معلوماتية وتعليمية وتحليلية وبرمجية فقط.",
        es: "BEX Trader no es corredor, dealer, asesor de inversión, asesor financiero, gestor de cartera ni administrador de dinero. El servicio se ofrece solo con fines informativos, educativos, analíticos y de automatización de software.",
        "pt-BR": "O BEX Trader não é corretora, dealer, consultor de investimentos, consultor financeiro, gestor de carteira ou gestor de dinheiro. O serviço é fornecido apenas para fins informativos, educacionais, analíticos e de automação de software.",
        hi: "BEX Trader broker, dealer, investment adviser, financial adviser, portfolio manager या money manager नहीं है। हमारी सेवा केवल सूचना, शिक्षा, विश्लेषण और software automation उद्देश्यों के लिए है।",
        tr: "BEX Trader bir aracı kurum, dealer, yatırım danışmanı, finansal danışman, portföy yöneticisi veya para yöneticisi değildir. Hizmet yalnızca bilgilendirme, eğitim, analiz ve yazılım otomasyonu amacıyla sunulur.",
        de: "BEX Trader ist kein Broker, Händler, Anlageberater, Finanzberater, Portfoliomanager oder Vermögensverwalter. Der Dienst dient nur Informations-, Bildungs-, Analyse- und Softwareautomatisierungszwecken.",
        fr: "BEX Trader n’est pas un courtier, un dealer, un conseiller en investissement, un conseiller financier, un gestionnaire de portefeuille ou un gestionnaire d’argent. Le service est fourni uniquement à des fins d’information, d’éducation, d’analyse et d’automatisation logicielle.",
        zh: "BEX Trader 不是经纪商、交易商、投资顾问、财务顾问、投资组合经理或资金管理人。本服务仅用于信息、教育、分析和软件自动化目的。",
        ko: "BEX Trader는 브로커, 딜러, 투자자문사, 재무자문사, 포트폴리오 매니저 또는 자금 운용사가 아닙니다. 본 서비스는 정보, 교육, 분석 및 소프트웨어 자동화 목적에 한해 제공됩니다.",
      },
    ],
  },
  {
    title: {
      en: "2. Information we collect",
      fa: "۲. اطلاعاتی که جمع‌آوری می‌کنیم",
      ar: "2. المعلومات التي نجمعها",
      es: "2. Información que recopilamos",
      "pt-BR": "2. Informações que coletamos",
      hi: "2. हम कौन-सी जानकारी एकत्र करते हैं",
      tr: "2. Topladığımız bilgiler",
      de: "2. Welche Informationen wir erheben",
      fr: "2. Informations que nous collectons",
      zh: "2. 我们收集的信息",
      ko: "2. 수집하는 정보",
    },
    body: [
      {
        en: "We may collect account information such as email, name, username, phone number if provided, country, timezone, language, verification status, role, plan, login timestamps, and related account records.",
        fa: "ممکن است اطلاعات حساب مانند ایمیل، نام، نام کاربری، شماره تلفن در صورت ارائه، کشور، منطقه زمانی، زبان، وضعیت تأیید، نقش، پلن، زمان ورود و رکوردهای مرتبط را جمع‌آوری کنیم.",
        ar: "قد نجمع معلومات الحساب مثل البريد الإلكتروني والاسم واسم المستخدم ورقم الهاتف إذا قُدّم، والبلد والمنطقة الزمنية واللغة وحالة التحقق والدور والخطة وأوقات تسجيل الدخول والسجلات ذات الصلة.",
        es: "Podemos recopilar datos de cuenta como email, nombre, usuario, teléfono si se proporciona, país, zona horaria, idioma, estado de verificación, rol, plan, marcas de inicio de sesión y registros relacionados.",
        "pt-BR": "Podemos coletar dados de conta como e-mail, nome, usuário, telefone se fornecido, país, fuso horário, idioma, status de verificação, função, plano, horários de login e registros relacionados.",
        hi: "हम account information जैसे email, name, username, phone number (यदि दिया गया हो), country, timezone, language, verification status, role, plan, login timestamps और related account records एकत्र कर सकते हैं।",
        tr: "E-posta, ad, kullanıcı adı, verilmişse telefon, ülke, saat dilimi, dil, doğrulama durumu, rol, plan, giriş zamanları ve ilgili hesap kayıtları gibi hesap bilgilerini toplayabiliriz.",
        de: "Wir können Kontoinformationen wie E-Mail, Name, Benutzername, Telefonnummer, sofern angegeben, Land, Zeitzone, Sprache, Verifizierungsstatus, Rolle, Plan, Anmeldezeiten und zugehörige Kontodatensätze erheben.",
        fr: "Nous pouvons collecter des informations de compte comme l’e-mail, le nom, le nom d’utilisateur, le téléphone si fourni, le pays, le fuseau horaire, la langue, le statut de vérification, le rôle, le plan, les dates de connexion et les enregistrements associés.",
        zh: "我们可能收集账户信息，例如邮箱、姓名、用户名、提供的电话号码、国家/地区、时区、语言、验证状态、角色、计划、登录时间戳和相关账户记录。",
        ko: "이메일, 이름, 사용자명, 제공된 경우 전화번호, 국가, 시간대, 언어, 인증 상태, 역할, 플랜, 로그인 시각 및 관련 계정 기록을 수집할 수 있습니다.",
      },
      {
        en: "For paid plans and VIP Auto Trading, we may process billing status, Stripe customer or subscription references, MT5 account login, broker server, VIP client ID, VIP token, allowed symbols, max lot, auto-trading status, imported trade history, signal ID, setup type, market context, and performance metrics.",
        fa: "برای پلن‌های پولی و VIP Auto Trading ممکن است وضعیت پرداخت، شناسه‌های Stripe، لاگین حساب MT5، سرور بروکر، client ID، توکن VIP، نمادهای مجاز، حداکثر لات، وضعیت اتوترید، تاریخچه معاملات، شناسه سیگنال، نوع ستاپ، کانتکست بازار و معیارهای عملکرد پردازش شود.",
        ar: "بالنسبة للخطط المدفوعة وVIP Auto Trading، قد نعالج حالة الفوترة ومراجع Stripe وتسجيل دخول MT5 وخادم الوسيط ومعرّف العميل ورمز VIP والرموز المسموحة والحد الأقصى للوت وحالة التداول الآلي وسجل التداول ومعرّف الإشارة ونوع الإعداد وسياق السوق ومقاييس الأداء.",
        es: "Para planes pagos y VIP Auto Trading, podemos procesar estado de facturación, referencias de cliente o suscripción de Stripe, login de MT5, servidor del broker, client ID VIP, token VIP, símbolos permitidos, lote máximo, estado de auto-trading, historial importado, signal ID, setup type, contexto de mercado y métricas de rendimiento.",
        "pt-BR": "Para planos pagos e VIP Auto Trading, podemos processar status de cobrança, referências de cliente/assinatura Stripe, login MT5, servidor da corretora, VIP client ID, VIP token, símbolos permitidos, max lot, status de auto-trading, histórico importado, signal ID, setup type, contexto de mercado e métricas de desempenho.",
        hi: "Paid plans और VIP Auto Trading के लिए हम billing status, Stripe customer/subscription references, MT5 account login, broker server, VIP client ID, VIP token, allowed symbols, max lot, auto-trading status, imported trade history, signal ID, setup type, market context और performance metrics process कर सकते हैं।",
        tr: "Ücretli planlar ve VIP Auto Trading için faturalama durumu, Stripe müşteri/abonelik referansları, MT5 hesap girişi, broker sunucusu, VIP client ID, VIP token, izin verilen semboller, max lot, otomatik işlem durumu, içe aktarılan işlem geçmişi, signal ID, setup type, piyasa bağlamı ve performans metriklerini işleyebiliriz.",
        de: "Für kostenpflichtige Pläne und VIP Auto Trading können wir Abrechnungsstatus, Stripe-Kunden- oder Abonnementreferenzen, MT5-Kontologin, Broker-Server, VIP-Client-ID, VIP-Token, erlaubte Symbole, Max-Lot, Auto-Trading-Status, importierte Handelshistorie, Signal-ID, Setup-Typ, Marktkontext und Leistungskennzahlen verarbeiten.",
        fr: "Pour les plans payants et VIP Auto Trading, nous pouvons traiter le statut de facturation, les références client/abonnement Stripe, le login MT5, le serveur du broker, le client ID VIP, le token VIP, les symboles autorisés, le max lot, le statut auto-trading, l’historique importé, le signal ID, le type de setup, le contexte de marché et les métriques de performance.",
        zh: "对于付费计划和 VIP Auto Trading，我们可能处理账单状态、Stripe 客户或订阅引用、MT5 账户登录、经纪商服务器、VIP 客户 ID、VIP token、允许交易品种、最大手数、自动交易状态、导入的交易历史、信号 ID、setup 类型、市场背景和绩效指标。",
        ko: "유료 플랜 및 VIP Auto Trading의 경우 결제 상태, Stripe 고객/구독 참조, MT5 계정 로그인, 브로커 서버, VIP client ID, VIP token, 허용 종목, max lot, 자동거래 상태, 가져온 거래 내역, signal ID, setup type, 시장 컨텍스트 및 성과 지표를 처리할 수 있습니다.",
      },
    ],
  },
  {
    title: {
      en: "3. Payments and third-party services",
      fa: "۳. پرداخت‌ها و سرویس‌های ثالث",
      ar: "3. المدفوعات والخدمات الخارجية",
      es: "3. Pagos y servicios de terceros",
      "pt-BR": "3. Pagamentos e serviços de terceiros",
      hi: "3. भुगतान और third-party services",
      tr: "3. Ödemeler ve üçüncü taraf hizmetler",
      de: "3. Zahlungen und Drittanbieter",
      fr: "3. Paiements et services tiers",
      zh: "3. 付款和第三方服务",
      ko: "3. 결제 및 제3자 서비스",
    },
    body: [
      {
        en: "Payments may be processed by Stripe, Apple, Google, or another provider. We do not store full card numbers or CVC codes on our servers. Payment providers may process your information under their own privacy policies.",
        fa: "پرداخت‌ها ممکن است توسط Stripe، Apple، Google یا سرویس پرداخت دیگر انجام شود. ما شماره کامل کارت یا CVC را روی سرورهای خود ذخیره نمی‌کنیم. پردازشگرهای پرداخت اطلاعات شما را طبق سیاست‌های حریم خصوصی خود پردازش می‌کنند.",
        ar: "قد تتم معالجة المدفوعات عبر Stripe أو Apple أو Google أو مزود آخر. لا نخزن أرقام البطاقات الكاملة أو رموز CVC على خوادمنا. قد يعالج مزودو الدفع معلوماتك وفق سياسات الخصوصية الخاصة بهم.",
        es: "Los pagos pueden ser procesados por Stripe, Apple, Google u otro proveedor. No almacenamos números completos de tarjeta ni CVC en nuestros servidores. Los procesadores pueden tratar tu información bajo sus propias políticas de privacidad.",
        "pt-BR": "Os pagamentos podem ser processados pela Stripe, Apple, Google ou outro provedor. Não armazenamos números completos de cartão nem CVC em nossos servidores. Os provedores de pagamento podem processar suas informações conforme suas próprias políticas.",
        hi: "Payments Stripe, Apple, Google या किसी अन्य provider द्वारा process हो सकते हैं। हम full card numbers या CVC codes अपने servers पर store नहीं करते। Payment providers आपकी जानकारी अपनी privacy policies के तहत process कर सकते हैं।",
        tr: "Ödemeler Stripe, Apple, Google veya başka bir sağlayıcı tarafından işlenebilir. Tam kart numaralarını veya CVC kodlarını sunucularımızda saklamayız. Ödeme sağlayıcıları bilgilerinizi kendi gizlilik politikalarına göre işleyebilir.",
        de: "Zahlungen können über Stripe, Apple, Google oder einen anderen Anbieter verarbeitet werden. Wir speichern keine vollständigen Kartennummern oder CVC-Codes auf unseren Servern. Zahlungsanbieter können Informationen gemäß ihren eigenen Datenschutzrichtlinien verarbeiten.",
        fr: "Les paiements peuvent être traités par Stripe, Apple, Google ou un autre fournisseur. Nous ne stockons pas les numéros complets de carte ni les codes CVC sur nos serveurs. Les fournisseurs de paiement peuvent traiter vos informations selon leurs propres politiques.",
        zh: "付款可能由 Stripe、Apple、Google 或其他提供商处理。我们不会在服务器上存储完整银行卡号或 CVC。支付提供商可能根据其隐私政策处理您的信息。",
        ko: "결제는 Stripe, Apple, Google 또는 다른 제공업체를 통해 처리될 수 있습니다. 당사는 전체 카드 번호나 CVC 코드를 서버에 저장하지 않습니다. 결제 제공업체는 자체 개인정보 정책에 따라 정보를 처리할 수 있습니다.",
      },
    ],
  },
  {
    title: {
      en: "4. How we use and share information",
      fa: "۴. نحوه استفاده و اشتراک‌گذاری اطلاعات",
      ar: "4. كيف نستخدم المعلومات ونشاركها",
      es: "4. Cómo usamos y compartimos información",
      "pt-BR": "4. Como usamos e compartilhamos informações",
      hi: "4. हम जानकारी का उपयोग और साझा कैसे करते हैं",
      tr: "4. Bilgileri nasıl kullanır ve paylaşırız",
      de: "4. Wie wir Informationen verwenden und teilen",
      fr: "4. Comment nous utilisons et partageons les informations",
      zh: "4. 我们如何使用和共享信息",
      ko: "4. 정보를 사용하는 방식 및 공유",
    },
    body: [
      {
        en: "We use information to create and secure accounts, authenticate users, provide app features, process subscriptions, validate VIP tokens, link trade history to the correct account, show personal stats, send notifications, prevent abuse, improve reliability, and comply with legal, tax, accounting, and security obligations.",
        fa: "از اطلاعات برای ساخت و امنیت حساب، احراز هویت، ارائه امکانات اپ، پردازش اشتراک، اعتبارسنجی توکن VIP، اتصال تاریخچه معاملات به حساب درست، نمایش آمار شخصی، ارسال اعلان، جلوگیری از سوءاستفاده، بهبود پایداری و رعایت الزامات قانونی، مالیاتی، حسابداری و امنیتی استفاده می‌کنیم.",
        ar: "نستخدم المعلومات لإنشاء الحسابات وتأمينها، ومصادقة المستخدمين، وتقديم ميزات التطبيق، ومعالجة الاشتراكات، والتحقق من رموز VIP، وربط سجل التداول بالحساب الصحيح، وعرض الإحصاءات الشخصية، وإرسال الإشعارات، ومنع إساءة الاستخدام، وتحسين الاعتمادية، والامتثال للالتزامات القانونية والضريبية والمحاسبية والأمنية.",
        es: "Usamos la información para crear y proteger cuentas, autenticar usuarios, ofrecer funciones, procesar suscripciones, validar tokens VIP, vincular historial de operaciones a la cuenta correcta, mostrar estadísticas personales, enviar notificaciones, prevenir abuso, mejorar fiabilidad y cumplir obligaciones legales, fiscales, contables y de seguridad.",
        "pt-BR": "Usamos informações para criar e proteger contas, autenticar usuários, fornecer recursos, processar assinaturas, validar tokens VIP, vincular histórico de trades à conta correta, mostrar estatísticas pessoais, enviar notificações, prevenir abuso, melhorar confiabilidade e cumprir obrigações legais, fiscais, contábeis e de segurança.",
        hi: "हम जानकारी का उपयोग accounts बनाने और सुरक्षित करने, users authenticate करने, app features देने, subscriptions process करने, VIP tokens validate करने, trade history को सही account से link करने, personal stats दिखाने, notifications भेजने, abuse रोकने, reliability सुधारने और legal/tax/accounting/security obligations पूरा करने के लिए करते हैं।",
        tr: "Bilgileri hesap oluşturmak ve güvenceye almak, kullanıcıları doğrulamak, uygulama özellikleri sunmak, abonelikleri işlemek, VIP tokenları doğrulamak, işlem geçmişini doğru hesaba bağlamak, kişisel istatistikleri göstermek, bildirim göndermek, kötüye kullanımı önlemek, güvenilirliği artırmak ve yasal, vergi, muhasebe ve güvenlik yükümlülüklerine uymak için kullanırız.",
        de: "Wir verwenden Informationen, um Konten zu erstellen und zu sichern, Nutzer zu authentifizieren, App-Funktionen bereitzustellen, Abonnements zu verarbeiten, VIP-Token zu validieren, Handelshistorie dem richtigen Konto zuzuordnen, persönliche Statistiken anzuzeigen, Benachrichtigungen zu senden, Missbrauch zu verhindern, Zuverlässigkeit zu verbessern und rechtliche, steuerliche, buchhalterische und sicherheitsbezogene Pflichten zu erfüllen.",
        fr: "Nous utilisons les informations pour créer et sécuriser les comptes, authentifier les utilisateurs, fournir des fonctionnalités, traiter les abonnements, valider les tokens VIP, relier l’historique de trading au bon compte, afficher les statistiques personnelles, envoyer des notifications, prévenir les abus, améliorer la fiabilité et respecter les obligations légales, fiscales, comptables et de sécurité.",
        zh: "我们使用信息来创建和保护账户、验证用户、提供应用功能、处理订阅、验证 VIP token、将交易历史链接到正确账户、显示个人统计、发送通知、防止滥用、提高可靠性，并履行法律、税务、会计和安全义务。",
        ko: "정보는 계정 생성 및 보안, 사용자 인증, 앱 기능 제공, 구독 처리, VIP token 검증, 거래 내역을 올바른 계정에 연결, 개인 통계 표시, 알림 발송, 악용 방지, 신뢰성 개선 및 법률/세금/회계/보안 의무 준수를 위해 사용됩니다.",
      },
      {
        en: "We may share information with service providers that help operate BEX Trader, including hosting, databases, authentication, payments, push notifications, analytics, logging, and support. We do not sell your personal information to advertisers.",
        fa: "ممکن است اطلاعات را با سرویس‌دهندگانی که برای اجرای BEX Trader کمک می‌کنند به اشتراک بگذاریم، از جمله هاستینگ، دیتابیس، احراز هویت، پرداخت، اعلان، آنالیتیکس، لاگ و پشتیبانی. ما اطلاعات شخصی شما را به تبلیغ‌دهندگان نمی‌فروشیم.",
        ar: "قد نشارك المعلومات مع مزودي خدمات يساعدون في تشغيل BEX Trader، بما في ذلك الاستضافة وقواعد البيانات والمصادقة والمدفوعات والإشعارات والتحليلات والسجلات والدعم. نحن لا نبيع معلوماتك الشخصية للمعلنين.",
        es: "Podemos compartir información con proveedores que ayudan a operar BEX Trader, incluidos hosting, bases de datos, autenticación, pagos, notificaciones push, analítica, logs y soporte. No vendemos tu información personal a anunciantes.",
        "pt-BR": "Podemos compartilhar informações com provedores que ajudam a operar o BEX Trader, incluindo hospedagem, bancos de dados, autenticação, pagamentos, notificações, analytics, logs e suporte. Não vendemos suas informações pessoais a anunciantes.",
        hi: "हम जानकारी service providers के साथ साझा कर सकते हैं जो BEX Trader चलाने में मदद करते हैं, जैसे hosting, databases, authentication, payments, push notifications, analytics, logging और support. हम आपकी personal information advertisers को नहीं बेचते।",
        tr: "Bilgileri BEX Trader’ın çalışmasına yardımcı olan barındırma, veritabanı, kimlik doğrulama, ödeme, push bildirimleri, analiz, loglama ve destek sağlayıcılarıyla paylaşabiliriz. Kişisel bilgilerinizi reklamverenlere satmayız.",
        de: "Wir können Informationen mit Dienstleistern teilen, die den Betrieb von BEX Trader unterstützen, z. B. Hosting, Datenbanken, Authentifizierung, Zahlungen, Push-Benachrichtigungen, Analysen, Logging und Support. Wir verkaufen Ihre personenbezogenen Daten nicht an Werbetreibende.",
        fr: "Nous pouvons partager des informations avec des prestataires qui aident à exploiter BEX Trader, notamment l’hébergement, les bases de données, l’authentification, les paiements, les notifications push, l’analyse, les logs et le support. Nous ne vendons pas vos informations personnelles à des annonceurs.",
        zh: "我们可能与帮助运营 BEX Trader 的服务提供商共享信息，包括托管、数据库、身份验证、支付、推送通知、分析、日志和支持。我们不会向广告商出售您的个人信息。",
        ko: "호스팅, 데이터베이스, 인증, 결제, 푸시 알림, 분석, 로깅 및 지원 등 BEX Trader 운영을 돕는 서비스 제공업체와 정보를 공유할 수 있습니다. 당사는 개인정보를 광고주에게 판매하지 않습니다.",
      },
    ],
  },
  {
    title: {
      en: "5. Cookies, local storage, notifications, and security",
      fa: "۵. کوکی‌ها، حافظه محلی، اعلان‌ها و امنیت",
      ar: "5. ملفات تعريف الارتباط والتخزين المحلي والإشعارات والأمان",
      es: "5. Cookies, almacenamiento local, notificaciones y seguridad",
      "pt-BR": "5. Cookies, armazenamento local, notificações e segurança",
      hi: "5. Cookies, local storage, notifications और security",
      tr: "5. Çerezler, yerel depolama, bildirimler ve güvenlik",
      de: "5. Cookies, lokaler Speicher, Benachrichtigungen und Sicherheit",
      fr: "5. Cookies, stockage local, notifications et sécurité",
      zh: "5. Cookie、本地存储、通知和安全",
      ko: "5. 쿠키, 로컬 저장소, 알림 및 보안",
    },
    body: [
      {
        en: "We may use cookies and local storage to keep you logged in, remember language/theme preferences, store plan state, support security, and improve app performance. If you enable push notifications, we may store browser/device push subscription data so we can send alerts.",
        fa: "ممکن است از کوکی و local storage برای نگه داشتن ورود، ذخیره زبان/تم، وضعیت پلن، امنیت و بهبود عملکرد اپ استفاده کنیم. اگر اعلان‌ها را فعال کنید، اطلاعات اشتراک push مرورگر/دستگاه ذخیره می‌شود تا هشدار ارسال شود.",
        ar: "قد نستخدم ملفات تعريف الارتباط والتخزين المحلي للحفاظ على تسجيل الدخول، وتذكر تفضيلات اللغة/المظهر، وتخزين حالة الخطة، ودعم الأمان، وتحسين أداء التطبيق. إذا فعّلت الإشعارات، قد نخزن بيانات اشتراك push للمتصفح/الجهاز لإرسال التنبيهات.",
        es: "Podemos usar cookies y almacenamiento local para mantener la sesión, recordar idioma/tema, guardar el estado del plan, apoyar seguridad y mejorar rendimiento. Si activas notificaciones, podemos guardar datos de suscripción push del navegador/dispositivo para enviar alertas.",
        "pt-BR": "Podemos usar cookies e armazenamento local para manter você logado, lembrar idioma/tema, armazenar status do plano, apoiar segurança e melhorar desempenho. Se ativar notificações, podemos armazenar dados de assinatura push do navegador/dispositivo para enviar alertas.",
        hi: "हम cookies और local storage का उपयोग आपको logged in रखने, language/theme preferences याद रखने, plan state store करने, security support करने और app performance सुधारने के लिए कर सकते हैं। यदि आप push notifications enable करते हैं, तो alerts भेजने के लिए browser/device subscription data store हो सकता है।",
        tr: "Oturumu açık tutmak, dil/tema tercihlerini hatırlamak, plan durumunu saklamak, güvenliği desteklemek ve performansı artırmak için çerezler ve yerel depolama kullanabiliriz. Bildirimleri etkinleştirirseniz uyarı göndermek için tarayıcı/cihaz push abonelik verilerini saklayabiliriz.",
        de: "Wir können Cookies und lokalen Speicher verwenden, um Sie angemeldet zu halten, Sprach-/Designpräferenzen zu speichern, den Planstatus zu speichern, Sicherheit zu unterstützen und die Leistung zu verbessern. Wenn Sie Push-Benachrichtigungen aktivieren, können wir Browser-/Geräte-Push-Abodaten speichern.",
        fr: "Nous pouvons utiliser des cookies et le stockage local pour garder votre session ouverte, mémoriser la langue/le thème, stocker l’état du plan, soutenir la sécurité et améliorer les performances. Si vous activez les notifications push, nous pouvons stocker les données d’abonnement push du navigateur/appareil.",
        zh: "我们可能使用 cookie 和本地存储来保持登录、记住语言/主题偏好、保存计划状态、支持安全并提高应用性能。如果您启用推送通知，我们可能存储浏览器/设备推送订阅数据以发送提醒。",
        ko: "로그인 유지, 언어/테마 설정 기억, 플랜 상태 저장, 보안 지원 및 앱 성능 향상을 위해 쿠키와 로컬 저장소를 사용할 수 있습니다. 푸시 알림을 활성화하면 알림 전송을 위해 브라우저/기기 푸시 구독 데이터를 저장할 수 있습니다.",
      },
      {
        en: "We use reasonable security measures, but no system is completely secure. You can disable notifications through your browser or device settings.",
        fa: "ما از اقدامات امنیتی معقول استفاده می‌کنیم، اما هیچ سیستمی کاملاً امن نیست. می‌توانید اعلان‌ها را از تنظیمات مرورگر یا دستگاه خاموش کنید.",
        ar: "نستخدم إجراءات أمنية معقولة، لكن لا يوجد نظام آمن تمامًا. يمكنك تعطيل الإشعارات من إعدادات المتصفح أو الجهاز.",
        es: "Usamos medidas razonables de seguridad, pero ningún sistema es completamente seguro. Puedes desactivar notificaciones desde el navegador o dispositivo.",
        "pt-BR": "Usamos medidas razoáveis de segurança, mas nenhum sistema é totalmente seguro. Você pode desativar notificações nas configurações do navegador ou dispositivo.",
        hi: "हम reasonable security measures का उपयोग करते हैं, लेकिन कोई भी system पूरी तरह secure नहीं होता। आप notifications को browser या device settings से disable कर सकते हैं।",
        tr: "Makul güvenlik önlemleri kullanırız, ancak hiçbir sistem tamamen güvenli değildir. Bildirimleri tarayıcı veya cihaz ayarlarınızdan devre dışı bırakabilirsiniz.",
        de: "Wir verwenden angemessene Sicherheitsmaßnahmen, aber kein System ist vollständig sicher. Benachrichtigungen können über Browser- oder Geräteeinstellungen deaktiviert werden.",
        fr: "Nous utilisons des mesures de sécurité raisonnables, mais aucun système n’est totalement sécurisé. Vous pouvez désactiver les notifications dans les paramètres du navigateur ou de l’appareil.",
        zh: "我们采用合理的安全措施，但没有任何系统是完全安全的。您可以通过浏览器或设备设置关闭通知。",
        ko: "합리적인 보안 조치를 사용하지만 어떤 시스템도 완전히 안전하지는 않습니다. 브라우저 또는 기기 설정에서 알림을 비활성화할 수 있습니다.",
      },
    ],
  },
  {
    title: {
      en: "6. Retention, your rights, children, and international use",
      fa: "۶. نگهداری داده، حقوق شما، کودکان و استفاده بین‌المللی",
      ar: "6. الاحتفاظ والحقوق والأطفال والاستخدام الدولي",
      es: "6. Retención, derechos, menores y uso internacional",
      "pt-BR": "6. Retenção, seus direitos, crianças e uso internacional",
      hi: "6. Retention, आपके अधिकार, children और international use",
      tr: "6. Saklama, haklarınız, çocuklar ve uluslararası kullanım",
      de: "6. Aufbewahrung, Ihre Rechte, Kinder und internationale Nutzung",
      fr: "6. Conservation, vos droits, enfants et usage international",
      zh: "6. 保留、您的权利、儿童和国际使用",
      ko: "6. 보관, 귀하의 권리, 아동 및 국제 사용",
    },
    body: [
      {
        en: "We keep information as long as needed to provide the service, maintain accounts, process payments, keep trade history and performance records, meet legal/tax/audit/security needs, resolve disputes, and enforce agreements.",
        fa: "اطلاعات را تا زمانی نگه می‌داریم که برای ارائه سرویس، نگهداری حساب، پردازش پرداخت، تاریخچه معاملات و عملکرد، الزامات قانونی/مالیاتی/حسابرسی/امنیتی، حل اختلاف و اجرای توافق‌ها لازم باشد.",
        ar: "نحتفظ بالمعلومات طالما كان ذلك لازمًا لتقديم الخدمة، والحفاظ على الحسابات، ومعالجة المدفوعات، وحفظ سجل التداول والأداء، وتلبية المتطلبات القانونية/الضريبية/التدقيق/الأمن، وحل النزاعات، وإنفاذ الاتفاقيات.",
        es: "Conservamos información mientras sea necesario para prestar el servicio, mantener cuentas, procesar pagos, conservar historial y rendimiento, cumplir necesidades legales/fiscales/auditoría/seguridad, resolver disputas y hacer cumplir acuerdos.",
        "pt-BR": "Mantemos informações pelo tempo necessário para fornecer o serviço, manter contas, processar pagamentos, guardar histórico e desempenho, cumprir necessidades legais/fiscais/auditoria/segurança, resolver disputas e aplicar acordos.",
        hi: "हम जानकारी को service provide करने, accounts maintain करने, payments process करने, trade history/performance records रखने, legal/tax/audit/security needs पूरा करने, disputes resolve करने और agreements enforce करने तक रखते हैं।",
        tr: "Bilgileri hizmeti sunmak, hesapları sürdürmek, ödemeleri işlemek, işlem geçmişi ve performans kayıtlarını tutmak, yasal/vergi/denetim/güvenlik ihtiyaçlarını karşılamak, uyuşmazlıkları çözmek ve anlaşmaları uygulamak için gerekli olduğu sürece saklarız.",
        de: "Wir speichern Informationen so lange, wie es für die Bereitstellung des Dienstes, Kontoführung, Zahlungsabwicklung, Handels- und Leistungsaufzeichnungen, rechtliche/steuerliche/prüfungs-/sicherheitsbezogene Zwecke, Streitbeilegung und Vertragsdurchsetzung erforderlich ist.",
        fr: "Nous conservons les informations aussi longtemps que nécessaire pour fournir le service, gérer les comptes, traiter les paiements, conserver l’historique et les performances, répondre aux besoins légaux/fiscaux/audit/sécurité, résoudre les litiges et faire appliquer les accords.",
        zh: "我们会在提供服务、维护账户、处理付款、保存交易历史和绩效记录、满足法律/税务/审计/安全需求、解决争议和执行协议所需期间保留信息。",
        ko: "서비스 제공, 계정 유지, 결제 처리, 거래 내역 및 성과 기록 보관, 법률/세금/감사/보안 요구 충족, 분쟁 해결 및 계약 집행에 필요한 기간 동안 정보를 보관합니다.",
      },
      {
        en: "Depending on your location, you may request access, correction, deletion, restriction, objection, withdrawal of consent, a copy of your data, or opt out of notifications. BEX Trader is not intended for children under 18. Information may be processed in countries where our providers operate.",
        fa: "بسته به محل شما، ممکن است حق درخواست دسترسی، اصلاح، حذف، محدودیت، اعتراض، پس‌گرفتن رضایت، دریافت نسخه داده یا لغو اعلان‌ها را داشته باشید. BEX Trader برای افراد زیر ۱۸ سال نیست. اطلاعات ممکن است در کشورهایی که سرویس‌دهندگان ما فعالیت دارند پردازش شود.",
        ar: "حسب موقعك، قد يمكنك طلب الوصول أو التصحيح أو الحذف أو التقييد أو الاعتراض أو سحب الموافقة أو نسخة من بياناتك أو إيقاف الإشعارات. BEX Trader غير مخصص لمن هم دون 18 عامًا. قد تُعالج المعلومات في البلدان التي يعمل فيها مزودونا.",
        es: "Según tu ubicación, puedes solicitar acceso, corrección, eliminación, restricción, oposición, retiro de consentimiento, copia de datos u optar por no recibir notificaciones. BEX Trader no está destinado a menores de 18 años. La información puede procesarse en países donde operan nuestros proveedores.",
        "pt-BR": "Dependendo da sua localização, você pode solicitar acesso, correção, exclusão, restrição, oposição, retirada de consentimento, cópia dos dados ou sair das notificações. O BEX Trader não é destinado a menores de 18 anos. Informações podem ser processadas em países onde nossos provedores operam.",
        hi: "आपके location के अनुसार, आप access, correction, deletion, restriction, objection, consent withdrawal, data copy या notifications opt out का अनुरोध कर सकते हैं। BEX Trader 18 वर्ष से कम उम्र के बच्चों के लिए नहीं है। जानकारी उन देशों में process हो सकती है जहाँ हमारे providers operate करते हैं।",
        tr: "Bulunduğunuz yere bağlı olarak erişim, düzeltme, silme, kısıtlama, itiraz, rızayı geri çekme, veri kopyası veya bildirimlerden çıkma talep edebilirsiniz. BEX Trader 18 yaş altı çocuklara yönelik değildir. Bilgiler sağlayıcılarımızın faaliyet gösterdiği ülkelerde işlenebilir.",
        de: "Je nach Standort können Sie Zugriff, Berichtigung, Löschung, Einschränkung, Widerspruch, Widerruf der Einwilligung, eine Datenkopie oder Abmeldung von Benachrichtigungen verlangen. BEX Trader richtet sich nicht an Kinder unter 18. Informationen können in Ländern verarbeitet werden, in denen unsere Anbieter tätig sind.",
        fr: "Selon votre lieu de résidence, vous pouvez demander l’accès, la correction, la suppression, la limitation, l’opposition, le retrait du consentement, une copie de vos données ou le retrait des notifications. BEX Trader n’est pas destiné aux moins de 18 ans. Les informations peuvent être traitées dans les pays où opèrent nos fournisseurs.",
        zh: "根据您所在地区，您可以请求访问、更正、删除、限制、反对、撤回同意、获取数据副本或退出通知。BEX Trader 不面向 18 岁以下儿童。信息可能在我们的服务提供商运营所在国家/地区处理。",
        ko: "거주 지역에 따라 접근, 수정, 삭제, 제한, 이의 제기, 동의 철회, 데이터 사본 또는 알림 수신 거부를 요청할 수 있습니다. BEX Trader는 만 18세 미만 아동을 대상으로 하지 않습니다. 정보는 제공업체가 운영되는 국가에서 처리될 수 있습니다.",
      },
    ],
  },
  {
    title: {
      en: "7. Trading risk notice and changes",
      fa: "۷. هشدار ریسک معاملات و تغییرات",
      ar: "7. إشعار مخاطر التداول والتغييرات",
      es: "7. Aviso de riesgo de trading y cambios",
      "pt-BR": "7. Aviso de risco de trading e alterações",
      hi: "7. Trading risk notice और changes",
      tr: "7. İşlem riski bildirimi ve değişiklikler",
      de: "7. Handelsrisiko und Änderungen",
      fr: "7. Avis sur les risques de trading et changements",
      zh: "7. 交易风险提示和变更",
      ko: "7. 거래 위험 고지 및 변경",
    },
    body: [
      {
        en: "Trading foreign exchange, commodities, gold, silver, CFDs, and leveraged instruments involves substantial risk. You may lose money. Signals, statistics, alerts, market context, or automation tools are not a guarantee of results.",
        fa: "معامله فارکس، کالاها، طلا، نقره، CFD و ابزارهای اهرمی ریسک زیادی دارد و ممکن است پول از دست بدهید. سیگنال‌ها، آمار، هشدارها، کانتکست بازار یا ابزارهای اتوماسیون تضمین نتیجه نیستند.",
        ar: "ينطوي تداول الفوركس والسلع والذهب والفضة وعقود الفروقات والأدوات ذات الرافعة على مخاطر كبيرة. قد تخسر المال. الإشارات والإحصاءات والتنبيهات وسياق السوق وأدوات الأتمتة ليست ضمانًا للنتائج.",
        es: "Operar forex, commodities, oro, plata, CFDs e instrumentos apalancados implica riesgo sustancial. Puedes perder dinero. Señales, estadísticas, alertas, contexto de mercado o automatización no garantizan resultados.",
        "pt-BR": "Operar forex, commodities, ouro, prata, CFDs e instrumentos alavancados envolve risco substancial. Você pode perder dinheiro. Sinais, estatísticas, alertas, contexto de mercado ou automação não garantem resultados.",
        hi: "Foreign exchange, commodities, gold, silver, CFDs और leveraged instruments में trading में substantial risk है। आप पैसा खो सकते हैं। Signals, statistics, alerts, market context या automation tools results की guarantee नहीं हैं।",
        tr: "Forex, emtia, altın, gümüş, CFD ve kaldıraçlı araçlarda işlem yapmak ciddi risk içerir. Para kaybedebilirsiniz. Sinyaller, istatistikler, uyarılar, piyasa bağlamı veya otomasyon araçları sonuç garantisi değildir.",
        de: "Der Handel mit Devisen, Rohstoffen, Gold, Silber, CFDs und Hebelprodukten birgt erhebliche Risiken. Sie können Geld verlieren. Signale, Statistiken, Warnungen, Marktkontext oder Automatisierungstools garantieren keine Ergebnisse.",
        fr: "Le trading du forex, des matières premières, de l’or, de l’argent, des CFD et des instruments à effet de levier comporte un risque important. Vous pouvez perdre de l’argent. Les signaux, statistiques, alertes, contexte de marché ou outils d’automatisation ne garantissent pas les résultats.",
        zh: "外汇、商品、黄金、白银、CFD 和杠杆工具交易存在重大风险，您可能亏损。信号、统计、提醒、市场背景或自动化工具不保证结果。",
        ko: "외환, 원자재, 금, 은, CFD 및 레버리지 상품 거래에는 상당한 위험이 있으며 손실이 발생할 수 있습니다. 신호, 통계, 알림, 시장 컨텍스트 또는 자동화 도구는 결과를 보장하지 않습니다.",
      },
      {
        en: "We may update this Privacy Policy from time to time. Material changes may be notified through the app, website, email, or another reasonable method. Contact: support@bextrader.com.",
        fa: "ممکن است این سیاست حریم خصوصی را به‌روزرسانی کنیم. تغییرات مهم ممکن است از طریق اپ، وب‌سایت، ایمیل یا روش مناسب دیگر اطلاع‌رسانی شود. تماس: support@bextrader.com.",
        ar: "قد نحدّث سياسة الخصوصية هذه من وقت لآخر. قد يتم إخطار التغييرات الجوهرية عبر التطبيق أو الموقع أو البريد الإلكتروني أو طريقة مناسبة أخرى. التواصل: support@bextrader.com.",
        es: "Podemos actualizar esta Política de Privacidad ocasionalmente. Los cambios importantes pueden notificarse por la app, el sitio, email u otro método razonable. Contacto: support@bextrader.com.",
        "pt-BR": "Podemos atualizar esta Política de Privacidade periodicamente. Mudanças relevantes podem ser notificadas pelo app, site, e-mail ou outro método razoável. Contato: support@bextrader.com.",
        hi: "हम समय-समय पर इस Privacy Policy को update कर सकते हैं। Material changes app, website, email या किसी reasonable method से notify किए जा सकते हैं। Contact: support@bextrader.com.",
        tr: "Bu Gizlilik Politikasını zaman zaman güncelleyebiliriz. Önemli değişiklikler uygulama, web sitesi, e-posta veya makul başka bir yöntemle bildirilebilir. İletişim: support@bextrader.com.",
        de: "Wir können diese Datenschutzrichtlinie von Zeit zu Zeit aktualisieren. Wesentliche Änderungen können über App, Website, E-Mail oder eine andere angemessene Methode mitgeteilt werden. Kontakt: support@bextrader.com.",
        fr: "Nous pouvons mettre à jour cette Politique de confidentialité de temps à autre. Les changements importants peuvent être notifiés via l’app, le site, l’e-mail ou une autre méthode raisonnable. Contact : support@bextrader.com.",
        zh: "我们可能会不时更新本隐私政策。重大变更可能通过应用、网站、电子邮件或其他合理方式通知。联系方式：support@bextrader.com。",
        ko: "본 개인정보 처리방침은 수시로 업데이트될 수 있습니다. 중요한 변경 사항은 앱, 웹사이트, 이메일 또는 합리적인 방법으로 통지될 수 있습니다. 문의: support@bextrader.com.",
      },
    ],
  },
];

export function Privacy() {
  const lang = getLanguage();
  const rtl = isRTL(lang);

  return (
    <main className="min-h-screen bg-[#070b14] text-white px-5 py-8" dir={rtl ? "rtl" : "ltr"} lang={lang}>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to="/app/settings" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-yellow-400">
          <ArrowLeft className="h-4 w-4" />
          {tr(lang, { en: "Back to Settings", fa: "بازگشت به تنظیمات", ar: "العودة إلى الإعدادات", es: "Volver a ajustes", "pt-BR": "Voltar às configurações", hi: "सेटिंग्स पर वापस", tr: "Ayarlara dön", de: "Zurück zu Einstellungen", fr: "Retour aux paramètres", zh: "返回设置", ko: "설정으로 돌아가기" })}
        </Link>

        <section className="rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-[#101827] to-[#080c16] p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-yellow-500/15 p-3 text-yellow-400"><ShieldCheck className="h-7 w-7" /></div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">{tr(lang, { en: "Privacy Policy", fa: "سیاست حریم خصوصی", ar: "سياسة الخصوصية", es: "Política de Privacidad", "pt-BR": "Política de Privacidade", hi: "गोपनीयता नीति", tr: "Gizlilik Politikası", de: "Datenschutzrichtlinie", fr: "Politique de confidentialité", zh: "隐私政策", ko: "개인정보 처리방침" })}</h1>
              <p className="mt-2 text-sm text-gray-400">{tr(lang, updated)}</p>
            </div>
          </div>
        </section>

        {sections.map((section, index) => (
          <section key={index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-xl font-black text-yellow-300">{tr(lang, section.title)}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-gray-300">
              {section.body.map((item, i) => <p key={i}>{tr(lang, item)}</p>)}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-gray-300">
          <div className="flex items-center gap-2 font-bold text-white"><Mail className="h-4 w-4 text-yellow-400" /> BEX Trader</div>
          <p className="mt-2">support@bextrader.com · https://bextrader.com</p>
        </section>
      </div>
    </main>
  );
}
