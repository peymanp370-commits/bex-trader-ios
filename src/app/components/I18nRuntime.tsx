import { useEffect } from "react";
import { applyDocumentLanguage, getLanguage, type SupportedLanguage } from "../utils/i18n";

const DICT: Record<string, { fa: string; ar: string }> = {
  "Home": { fa: "خانه", ar: "الرئيسية" },
  "Market": { fa: "بازار", ar: "السوق" },
  "Stats": { fa: "آمار", ar: "الإحصائيات" },
  "Settings": { fa: "تنظیمات", ar: "الإعدادات" },
  "Menu": { fa: "منو", ar: "القائمة" },
  "Close menu": { fa: "بستن منو", ar: "إغلاق القائمة" },
  "Close menu overlay": { fa: "بستن لایه منو", ar: "إغلاق طبقة القائمة" },
  "Language": { fa: "زبان", ar: "اللغة" },
  "Country": { fa: "کشور", ar: "الدولة" },
  "Timezone": { fa: "منطقه زمانی", ar: "المنطقة الزمنية" },
  "Notifications": { fa: "اعلان‌ها", ar: "الإشعارات" },
  "Notification Frequency": { fa: "بازه اعلان", ar: "تكرار الإشعارات" },
  "Theme": { fa: "تم", ar: "المظهر" },
  "⚙️ PREFERENCES": { fa: "⚙️ ترجیحات", ar: "⚙️ التفضيلات" },
  "🌙 Dark": { fa: "🌙 تیره", ar: "🌙 داكن" },
  "☀️ Light": { fa: "☀️ روشن", ar: "☀️ فاتح" },
  "ACCOUNT": { fa: "حساب", ar: "الحساب" },
  "ℹ️ INFORMATION": { fa: "ℹ️ اطلاعات", ar: "ℹ️ المعلومات" },
  "💬 SUPPORT": { fa: "💬 پشتیبانی", ar: "💬 الدعم" },
  "⚖️ LEGAL": { fa: "⚖️ حقوقی", ar: "⚖️ قانوني" },
  "Dark": { fa: "تیره", ar: "داكن" },
  "Light": { fa: "روشن", ar: "فاتح" },
  "Upgrade to VIP": { fa: "ارتقا به VIP", ar: "الترقية إلى VIP" },
  "Get premium signals & AI analysis": { fa: "سیگنال‌های ویژه و تحلیل هوش مصنوعی بگیر", ar: "احصل على إشارات مميزة وتحليل بالذكاء الاصطناعي" },
  "Starting from $9.99/month": { fa: "شروع از 9.99 دلار در ماه", ar: "ابتداءً من 9.99 دولار شهريًا" },
  "Select Language": { fa: "انتخاب زبان", ar: "اختر اللغة" },
  "Select Country": { fa: "انتخاب کشور", ar: "اختر الدولة" },
  "Select Timezone": { fa: "انتخاب منطقه زمانی", ar: "اختر المنطقة الزمنية" },
  "Logout": { fa: "خروج", ar: "تسجيل الخروج" },
  "Logging out...": { fa: "در حال خروج...", ar: "جارٍ تسجيل الخروج..." },
  "Economic Calendar": { fa: "تقویم اقتصادی", ar: "التقويم الاقتصادي" },
  "How to Use BEX": { fa: "نحوه استفاده از BEX", ar: "كيفية استخدام BEX" },
  "Risk Disclaimer": { fa: "هشدار ریسک", ar: "إخلاء مسؤولية المخاطر" },
  "Email Support": { fa: "پشتیبانی ایمیلی", ar: "الدعم عبر البريد" },
  "Telegram Channel": { fa: "کانال تلگرام", ar: "قناة تيليجرام" },
  "Terms & Conditions": { fa: "شرایط و قوانین", ar: "الشروط والأحكام" },
  "Privacy Policy": { fa: "حریم خصوصی", ar: "سياسة الخصوصية" },
  "Stay Updated": { fa: "به‌روز بمان", ar: "ابقَ على اطلاع" },
  "Get instant notifications for premium trading signals and market alerts": { fa: "اعلان فوری برای سیگنال‌های ویژه و هشدارهای بازار دریافت کن", ar: "احصل على إشعارات فورية لإشارات التداول المميزة وتنبيهات السوق" },
  "Never miss important trading opportunities": { fa: "هیچ فرصت مهمی را از دست نده", ar: "لا تفوّت فرص التداول المهمة" },
  "Allow Notifications": { fa: "اجازه اعلان‌ها", ar: "السماح بالإشعارات" },
  "Skip for now": { fa: "فعلاً رد کن", ar: "تخطي الآن" },
  "Real-time trading signals": { fa: "سیگنال‌های لحظه‌ای", ar: "إشارات تداول لحظية" },
  "Market movement alerts": { fa: "هشدارهای حرکت بازار", ar: "تنبيهات حركة السوق" },
  "AI analysis updates": { fa: "به‌روزرسانی تحلیل هوش مصنوعی", ar: "تحديثات تحليل الذكاء الاصطناعي" },
  "Hello": { fa: "سلام", ar: "مرحبًا" },
  "Current": { fa: "فعلی", ar: "الحالي" },
  "Entry": { fa: "ورود", ar: "الدخول" },
  "Entry Price": { fa: "قیمت ورود", ar: "سعر الدخول" },
  "Session": { fa: "جلسه", ar: "الجلسة" },
  "Volatility": { fa: "نوسان", ar: "التقلب" },
  "Bias": { fa: "جهت", ar: "الانحياز" },
  "Market Phase": { fa: "فاز بازار", ar: "مرحلة السوق" },
  "Liquidity Risk": { fa: "ریسک نقدینگی", ar: "مخاطر السيولة" },
  "News": { fa: "اخبار", ar: "الأخبار" },
  "Confidence": { fa: "اعتماد", ar: "الثقة" },
  "Status": { fa: "وضعیت", ar: "الحالة" },
  "BUY": { fa: "خرید", ar: "شراء" },
  "SELL": { fa: "فروش", ar: "بيع" },
  "WAIT": { fa: "صبر", ar: "انتظار" },
  "LIVE": { fa: "زنده", ar: "مباشر" },
  "Live": { fa: "زنده", ar: "مباشر" },
  "No live signal yet": { fa: "هنوز سیگنال زنده نیست", ar: "لا توجد إشارة مباشرة بعد" },
  "Wins": { fa: "بردها", ar: "الصفقات الرابحة" },
  "Losses": { fa: "باخت‌ها", ar: "الخسائر" },
  "Total Trades": { fa: "کل معاملات", ar: "إجمالي الصفقات" },
  "Total PnL": { fa: "سود/زیان کل", ar: "إجمالي الربح/الخسارة" },
  "Best Trade": { fa: "بهترین معامله", ar: "أفضل صفقة" },
  "Worst Trade": { fa: "بدترین معامله", ar: "أسوأ صفقة" },
  "Last 7 Days": { fa: "۷ روز اخیر", ar: "آخر 7 أيام" },
  "Last 30 Days": { fa: "۳۰ روز اخیر", ar: "آخر 30 يومًا" },
  "VIP Plans": { fa: "پلن‌های VIP", ar: "خطط VIP" },
  "Most Popular": { fa: "محبوب‌ترین", ar: "الأكثر شيوعًا" },
  "Basic": { fa: "پایه", ar: "أساسي" },
  "Pro": { fa: "پرو", ar: "برو" },
  "Coming Soon": { fa: "به‌زودی", ar: "قريبًا" },
  "Sign in to BEX Trader": { fa: "ورود به BEX Trader", ar: "تسجيل الدخول إلى BEX Trader" },
  "Welcome Back": { fa: "خوش برگشتی", ar: "مرحبًا بعودتك" },
  "Create Account": { fa: "ایجاد حساب", ar: "إنشاء حساب" },
  "Already have an account?": { fa: "از قبل حساب داری؟", ar: "لديك حساب بالفعل؟" },
  "Don't have an account?": { fa: "حساب نداری؟", ar: "ليس لديك حساب؟" },
  "Age Verification": { fa: "تأیید سن", ar: "التحقق من العمر" },
  "Verification Not Required": { fa: "نیازی به تأیید نیست", ar: "التحقق غير مطلوب" },
  "Continue": { fa: "ادامه", ar: "متابعة" },
  "Monthly": { fa: "ماهانه", ar: "شهري" },
  "Yearly (Save up to 30%)": { fa: "سالانه (تا ۳۰٪ صرفه‌جویی)", ar: "سنوي (وفّر حتى 30٪)" },
  "RECOMMENDED": { fa: "پیشنهادی", ar: "موصى به" },
  "month": { fa: "ماه", ar: "شهر" },
  "year": { fa: "سال", ar: "سنة" },
  "Start Free": { fa: "شروع رایگان", ar: "ابدأ مجانًا" },
  "Upgrade Now": { fa: "الان ارتقا بده", ar: "رقِّ الآن" },
  "WHY SUBSCRIBE?": { fa: "چرا اشتراک بگیری؟", ar: "لماذا تشترك؟" },
  "CURRENCY CONVERTER": { fa: "تبدیل ارز", ar: "محول العملات" },
  "*Trading is in USD only. Prices shown for reference.": { fa: "*معامله فقط با دلار آمریکا انجام می‌شود. قیمت‌ها فقط برای مرجع نمایش داده شده‌اند.", ar: "*التداول يتم بالدولار الأمريكي فقط. الأسعار المعروضة للمرجع فقط." },
  "NO TRADE": { fa: "بدون معامله", ar: "لا توجد صفقة" },
  "Live signal": { fa: "سیگنال زنده", ar: "إشارة مباشرة" },
  "R:R": { fa: "ریسک/بازده", ar: "المخاطرة/العائد" },
  "Gold vs US Dollar": { fa: "طلا در برابر دلار آمریکا", ar: "الذهب مقابل الدولار الأمريكي" },
  "Silver vs US Dollar": { fa: "نقره در برابر دلار آمریکا", ar: "الفضة مقابل الدولار الأمريكي" },
  "US Dollar Index": { fa: "شاخص دلار آمریکا", ar: "مؤشر الدولار الأمريكي" },
  "US 10-Year Yield": { fa: "بازده اوراق ۱۰ ساله آمریکا", ar: "عائد السندات الأمريكية لعشر سنوات" },
  "Active Symbol": { fa: "نماد فعال", ar: "الرمز النشط" },
  "Active Trades": { fa: "معاملات فعال", ar: "الصفقات النشطة" },
  "Market State": { fa: "وضعیت بازار", ar: "حالة السوق" },
  "Signal copied": { fa: "سیگنال کپی شد", ar: "تم نسخ الإشارة" },
  "Failed to copy signal": { fa: "کپی سیگنال ناموفق بود", ar: "فشل نسخ الإشارة" },
  "Loading signal data...": { fa: "در حال بارگذاری داده‌های سیگنال...", ar: "جارٍ تحميل بيانات الإشارة..." },
  "Loading chart data...": { fa: "در حال بارگذاری داده‌های چارت...", ar: "جارٍ تحميل بيانات الرسم البياني..." },
  "Email or Username": { fa: "ایمیل یا نام کاربری", ar: "البريد الإلكتروني أو اسم المستخدم" },
  "Enter email or username": { fa: "ایمیل یا نام کاربری را وارد کنید", ar: "أدخل البريد الإلكتروني أو اسم المستخدم" },
  "Password": { fa: "رمز عبور", ar: "كلمة المرور" },
  "Enter your password": { fa: "رمز عبور خود را وارد کنید", ar: "أدخل كلمة المرور" },
  "Hide password": { fa: "پنهان کردن رمز عبور", ar: "إخفاء كلمة المرور" },
  "Show password": { fa: "نمایش رمز عبور", ar: "إظهار كلمة المرور" },
  "Logging in...": { fa: "در حال ورود...", ar: "جارٍ تسجيل الدخول..." },
  "Login": { fa: "ورود", ar: "تسجيل الدخول" },
  "or continue with": { fa: "یا ادامه با", ar: "أو المتابعة باستخدام" },
  "Redirecting to Google...": { fa: "در حال انتقال به گوگل...", ar: "جارٍ التحويل إلى Google..." },
  "Continue with Google": { fa: "ادامه با گوگل", ar: "المتابعة باستخدام Google" },
  "Continue with Apple": { fa: "ادامه با اپل", ar: "المتابعة باستخدام Apple" },
  "Register Now": { fa: "همین حالا ثبت‌نام کن", ar: "سجّل الآن" },
  "By signing in, you agree to our Terms & Conditions and Privacy Policy": { fa: "با ورود، شما با شرایط و قوانین و حریم خصوصی ما موافقت می‌کنید", ar: "بتسجيل الدخول، فإنك توافق على الشروط والأحكام وسياسة الخصوصية الخاصة بنا" },
  "Join BEX Trader today": { fa: "امروز به BEX Trader بپیوند", ar: "انضم إلى BEX Trader اليوم" },
  "First Name": { fa: "نام", ar: "الاسم الأول" },
  "Last Name": { fa: "نام خانوادگی", ar: "اسم العائلة" },
  "First name": { fa: "نام", ar: "الاسم الأول" },
  "Last name": { fa: "نام خانوادگی", ar: "اسم العائلة" },
  "Email Address": { fa: "آدرس ایمیل", ar: "عنوان البريد الإلكتروني" },
  "Enter your email": { fa: "ایمیل خود را وارد کنید", ar: "أدخل بريدك الإلكتروني" },
  "Username": { fa: "نام کاربری", ar: "اسم المستخدم" },
  "Choose a username": { fa: "یک نام کاربری انتخاب کنید", ar: "اختر اسم مستخدم" },
  "Phone Number": { fa: "شماره تلفن", ar: "رقم الهاتف" },
  "This app now uses password-based login and registration.": { fa: "این برنامه اکنون از ورود و ثبت‌نام با رمز عبور استفاده می‌کند.", ar: "يستخدم هذا التطبيق الآن تسجيل الدخول والتسجيل بكلمة المرور." },
  "Go to Login": { fa: "برو به ورود", ar: "اذهب إلى تسجيل الدخول" },
  "Go to Register": { fa: "برو به ثبت‌نام", ar: "اذهب إلى التسجيل" },
  "Redirecting automatically...": { fa: "در حال انتقال خودکار...", ar: "جارٍ إعادة التوجيه تلقائيًا..." },
  "Trading involves financial risk. You must be 18 years or older to use this application.": { fa: "معامله شامل ریسک مالی است. برای استفاده از این برنامه باید ۱۸ سال یا بیشتر داشته باشید.", ar: "يتضمن التداول مخاطر مالية. يجب أن يكون عمرك 18 عامًا أو أكثر لاستخدام هذا التطبيق." },
  "✓ I am 18 years or older": { fa: "✓ من ۱۸ ساله یا بیشتر هستم", ar: "✓ عمري 18 سنة أو أكثر" },
  "✗ I am under 18": { fa: "✗ زیر ۱۸ سال هستم", ar: "✗ عمري أقل من 18 سنة" },
  "⚠️ IMPORTANT NOTICE": { fa: "⚠️ اطلاعیه مهم", ar: "⚠️ إشعار مهم" },
  "By continuing, you confirm that you understand the risks associated with trading and that you meet the minimum age requirement to access financial trading services in your jurisdiction.": { fa: "با ادامه دادن، تأیید می‌کنید که ریسک‌های مرتبط با معامله را درک می‌کنید و حداقل سن لازم برای دسترسی به خدمات معاملات مالی در حوزه قضایی خود را دارید.", ar: "بالمتابعة، فإنك تؤكد أنك تفهم المخاطر المرتبطة بالتداول وأنك تستوفي الحد الأدنى للعمر المطلوب للوصول إلى خدمات التداول المالي في نطاقك القضائي." },
  "Total Volume (24h)": { fa: "حجم کل (۲۴ ساعت)", ar: "إجمالي الحجم (24 ساعة)" },
  "Active Pairs": { fa: "جفت‌های فعال", ar: "الأزواج النشطة" },
  "Market Cap": { fa: "ارزش بازار", ar: "القيمة السوقية" },
  "Trading Markets": { fa: "بازارهای معاملاتی", ar: "أسواق التداول" },
  "Win Rate": { fa: "نرخ برد", ar: "معدل الفوز" },
  "Net PnL": { fa: "سود/زیان خالص", ar: "صافي الربح/الخسارة" },
  "Avg Trade": { fa: "میانگین معامله", ar: "متوسط الصفقة" },
  "Previous Day Trades": { fa: "معاملات روز قبل", ar: "صفقات اليوم السابق" },
  "Previous Day Win Rate": { fa: "نرخ برد روز قبل", ar: "معدل فوز اليوم السابق" },
  "Previous Day Net PnL": { fa: "سود/زیان خالص روز قبل", ar: "صافي الربح/الخسارة لليوم السابق" },
  "Wins / Losses": { fa: "برد / باخت", ar: "الربح / الخسارة" },
  "Previous 7 Trading Days": { fa: "۷ روز معاملاتی قبل", ar: "آخر 7 أيام تداول" },
  "Failed to load stats": { fa: "بارگذاری آمار ناموفق بود", ar: "فشل تحميل الإحصائيات" },
  "Are you sure you want to logout?": { fa: "مطمئنی می‌خواهی خارج شوی؟", ar: "هل أنت متأكد أنك تريد تسجيل الخروج؟" },
  "BEX AI": { fa: "BEX AI", ar: "BEX AI" },
  "GOLD TRADER": { fa: "معامله‌گر طلا", ar: "متداول الذهب" },
  "Toronto": { fa: "تورنتو", ar: "تورونتو" },
  "Tehran": { fa: "تهران", ar: "طهران" },
  "Eastern Time (ET)": { fa: "زمان شرقی (ET)", ar: "التوقيت الشرقي (ET)" },
  "Central Time (CT)": { fa: "زمان مرکزی (CT)", ar: "التوقيت المركزي (CT)" },
  "Mountain Time (MT)": { fa: "زمان کوهستانی (MT)", ar: "التوقيت الجبلي (MT)" },
  "Pacific Time (PT)": { fa: "زمان اقیانوس آرام (PT)", ar: "توقيت المحيط الهادئ (PT)" },
  "London (GMT)": { fa: "لندن (GMT)", ar: "لندن (GMT)" },
  "Paris (CET)": { fa: "پاریس (CET)", ar: "باريس (CET)" },
  "Athens (EET)": { fa: "آتن (EET)", ar: "أثينا (EET)" },
  "Dubai (GST)": { fa: "دبی (GST)", ar: "دبي (GST)" },
  "Karachi (PKT)": { fa: "کراچی (PKT)", ar: "كراتشي (PKT)" },
  "Shanghai (CST)": { fa: "شانگهای (CST)", ar: "شنغهاي (CST)" },
  "Tokyo (JST)": { fa: "توکیو (JST)", ar: "طوكيو (JST)" },
  "Sydney (AEDT)": { fa: "سیدنی (AEDT)", ar: "سيدني (AEDT)" },
  "United States": { fa: "ایالات متحده", ar: "الولايات المتحدة" },
  "United Kingdom": { fa: "بریتانیا", ar: "المملكة المتحدة" },
  "Canada": { fa: "کانادا", ar: "كندا" },
  "Australia": { fa: "استرالیا", ar: "أستراليا" },
  "Germany": { fa: "آلمان", ar: "ألمانيا" },
  "France": { fa: "فرانسه", ar: "فرنسا" },
  "Spain": { fa: "اسپانیا", ar: "إسبانيا" },
  "Italy": { fa: "ایتالیا", ar: "إيطاليا" },
  "Japan": { fa: "ژاپن", ar: "اليابان" },
  "China": { fa: "چین", ar: "الصين" },
  "India": { fa: "هند", ar: "الهند" },
  "Brazil": { fa: "برزیل", ar: "البرازيل" },
  "Mexico": { fa: "مکزیک", ar: "المكسيك" },
  "South Korea": { fa: "کره جنوبی", ar: "كوريا الجنوبية" },
  "Singapore": { fa: "سنگاپور", ar: "سنغافورة" },
  "UAE": { fa: "امارات", ar: "الإمارات" },
  "Saudi Arabia": { fa: "عربستان سعودی", ar: "المملكة العربية السعودية" },
  "Turkey": { fa: "ترکیه", ar: "تركيا" },
  "Iran": { fa: "ایران", ar: "إيران" },
  "Exchange Rate": { fa: "نرخ تبدیل", ar: "سعر الصرف" },
  "Enter amount": { fa: "مقدار را وارد کنید", ar: "أدخل المبلغ" },
  "Error loading image": { fa: "خطا در بارگذاری تصویر", ar: "خطأ في تحميل الصورة" },
  "Please enter your email/username and password.": { fa: "لطفاً ایمیل/نام کاربری و رمز عبور را وارد کنید.", ar: "يرجى إدخال البريد الإلكتروني/اسم المستخدم وكلمة المرور." },
  "Login failed": { fa: "ورود ناموفق بود", ar: "فشل تسجيل الدخول" },
  "Failed to login": { fa: "ورود ناموفق بود", ar: "فشل تسجيل الدخول" },
  "Apple Sign-In coming soon.": { fa: "ورود با اپل به‌زودی اضافه می‌شود.", ar: "تسجيل الدخول عبر Apple قريبًا." },
  "Failed to register": { fa: "ثبت‌نام ناموفق بود", ar: "فشل التسجيل" },
  "You must be 18 or older to use this app.": { fa: "برای استفاده از این برنامه باید ۱۸ سال یا بیشتر داشته باشید.", ar: "يجب أن يكون عمرك 18 عامًا أو أكثر لاستخدام هذا التطبيق." },


  "MARKET CONTEXT": { fa: "زمینه بازار", ar: "سياق السوق" },
  "🌍 MARKET CONTEXT": { fa: "🌍 زمینه بازار", ar: "🌍 سياق السوق" },
  "MARKET BOARD": { fa: "برد بازار", ar: "لوحة السوق" },
  "📊 MARKET BOARD": { fa: "📊 برد بازار", ar: "📊 لوحة السوق" },
  "Open Chart": { fa: "باز کردن چارت", ar: "فتح الرسم البياني" },
  "ASIA": { fa: "آسیا", ar: "آسيا" },
  "LONDON": { fa: "لندن", ar: "لندن" },
  "NEW_YORK": { fa: "نیویورک", ar: "نيويورك" },
  "MACRO SNAPSHOT": { fa: "نمای کلی کلان", ar: "اللقطة الكلية" },
  "Market Sentiment": { fa: "احساس بازار", ar: "معنويات السوق" },
  "Volatility Index": { fa: "شاخص نوسان", ar: "مؤشر التقلب" },
  "NORMAL": { fa: "عادی", ar: "طبيعي" },
  "SAFE": { fa: "ایمن", ar: "آمن" },
  "BEARISH": { fa: "نزولی", ar: "هبوطي" },
  "BULLISH": { fa: "صعودی", ar: "صعودي" },
  "NEUTRAL": { fa: "خنثی", ar: "محايد" },
  "EXPANSION": { fa: "گسترش", ar: "اتساع" },
  "OVERVIEW": { fa: "نمای کلی", ar: "نظرة عامة" },
  "📊 OVERVIEW": { fa: "📊 نمای کلی", ar: "📊 نظرة عامة" },
  "DAILY SNAPSHOT": { fa: "خلاصه روزانه", ar: "الملخص اليومي" },
  "🗓️ DAILY SNAPSHOT": { fa: "🗓️ خلاصه روزانه", ar: "🗓️ الملخص اليومي" },
  "Showing previous 7 trading days only": { fa: "فقط ۷ روز معاملاتی قبلی نمایش داده می‌شود", ar: "يتم عرض آخر 7 أيام تداول فقط" },
  "ALL": { fa: "همه", ar: "الكل" },
  "free": { fa: "رایگان", ar: "مجاني" },
  "US Dollar vs Canadian Dollar": { fa: "دلار آمریکا در برابر دلار کانادا", ar: "الدولار الأمريكي مقابل الدولار الكندي" },
  "Limited signals (1-2 per day)": { fa: "سیگنال‌های محدود (۱ تا ۲ در روز)", ar: "إشارات محدودة (1-2 يوميًا)" },
  "Basic market analysis": { fa: "تحلیل پایه بازار", ar: "تحليل أساسي للسوق" },
  "Delayed notifications": { fa: "اعلان‌های با تأخیر", ar: "إشعارات متأخرة" },
  "Limited AI insights": { fa: "بینش محدود هوش مصنوعی", ar: "رؤى محدودة بالذكاء الاصطناعي" },
  "No advanced tools": { fa: "بدون ابزار پیشرفته", ar: "بدون أدوات متقدمة" },
  "No performance tracking": { fa: "بدون رهگیری عملکرد", ar: "بدون تتبع الأداء" },
  "Full real-time trading signals": { fa: "سیگنال‌های کامل لحظه‌ای", ar: "إشارات تداول كاملة وفورية" },
  "AI-powered market analysis": { fa: "تحلیل بازار با هوش مصنوعی", ar: "تحليل سوق مدعوم بالذكاء الاصطناعي" },
  "Real-time notifications": { fa: "اعلان‌های لحظه‌ای", ar: "إشعارات فورية" },
  "Entry / SL / TP + full context": { fa: "ورود / حد ضرر / حد سود + زمینه کامل", ar: "الدخول / وقف الخسارة / جني الربح + السياق الكامل" },
  "Basic performance tracking": { fa: "رهگیری پایه عملکرد", ar: "تتبع أساسي للأداء" },
  "Market board + AI context": { fa: "برد بازار + زمینه هوش مصنوعی", ar: "لوحة السوق + سياق الذكاء الاصطناعي" },
  "Copy trade feature": { fa: "قابلیت کپی معامله", ar: "ميزة نسخ التداول" },
  "Everything in PRO": { fa: "همه چیزِ پلن PRO", ar: "كل شيء في PRO" },
  "Priority signal access": { fa: "دسترسی اولویت‌دار به سیگنال", ar: "وصول ذو أولوية إلى الإشارات" },
  "Advanced chart tools": { fa: "ابزارهای پیشرفته چارت", ar: "أدوات رسم بياني متقدمة" },
  "Priority execution insights": { fa: "بینش اولویت‌دار اجرا", ar: "رؤى تنفيذ ذات أولوية" },
  "Full performance analytics": { fa: "تحلیل کامل عملکرد", ar: "تحليلات أداء كاملة" },
  "Risk management tools": { fa: "ابزارهای مدیریت ریسک", ar: "أدوات إدارة المخاطر" },
  "Exclusive market insights": { fa: "بینش اختصاصی بازار", ar: "رؤى سوق حصرية" },
  "1-on-1 consultation": { fa: "مشاوره ۱ به ۱", ar: "استشارة فردية" },
  "• Get access to institutional-grade trading signals powered by AI": { fa: "• به سیگنال‌های معاملاتی سطح سازمانی مبتنی بر هوش مصنوعی دسترسی بگیر", ar: "• احصل على إشارات تداول بمستوى مؤسسي مدعومة بالذكاء الاصطناعي" },
  "• Receive real-time alerts before major market moves": { fa: "• پیش از حرکت‌های بزرگ بازار هشدار لحظه‌ای دریافت کن", ar: "• استقبل تنبيهات فورية قبل تحركات السوق الكبرى" },
  "• Join exclusive community of professional traders": { fa: "• به جامعه اختصاصی معامله‌گران حرفه‌ای بپیوند", ar: "• انضم إلى مجتمع حصري من المتداولين المحترفين" },
  "• Learn from expert analysis and market breakdowns": { fa: "• از تحلیل کارشناسی و بررسی‌های بازار یاد بگیر", ar: "• تعلّم من التحليلات الخبيرة وتفكيك السوق" },
};

const PATTERNS = [
  {
    re: /^Save (\d+)% with annual billing$/,
    fa: (n: string) => `با پرداخت سالانه ${n}٪ صرفه‌جویی کن`,
    ar: (n: string) => `وفّر ${n}٪ مع الدفع السنوي`,
  },
  {
    re: /^Wins:\s*(\d+)\s*•\s*Losses:\s*(\d+)$/,
    fa: (w: string, l: string) => `بردها: ${w} • باخت‌ها: ${l}`,
    ar: (w: string, l: string) => `الربح: ${w} • الخسارة: ${l}`,
  },
  {
    re: /^Successfully subscribed to (.+) plan!$/,
    fa: (name: string) => `اشتراک پلن ${name} با موفقیت فعال شد!`,
    ar: (name: string) => `تم الاشتراك في خطة ${name} بنجاح!`,
  },
  {
    re: /^Side: (.+)$/,
    fa: (v: string) => `جهت: ${translateInline(v, 'fa')}`,
    ar: (v: string) => `الاتجاه: ${translateInline(v, 'ar')}`,
  },
  { re: /^SL: (.+)$/, fa: (v: string) => `حد ضرر: ${v}`, ar: (v: string) => `وقف الخسارة: ${v}` },
  { re: /^TP: (.+)$/, fa: (v: string) => `حد سود: ${v}`, ar: (v: string) => `جني الربح: ${v}` },
  { re: /^RR: (.+)$/, fa: (v: string) => `ریسک/بازده: ${v}`, ar: (v: string) => `المخاطرة/العائد: ${v}` },
  { re: /^Confidence: (.+)$/, fa: (v: string) => `اعتماد: ${v}`, ar: (v: string) => `الثقة: ${v}` },
  { re: /^Status: (.+)$/, fa: (v: string) => `وضعیت: ${translateInline(v, 'fa')}`, ar: (v: string) => `الحالة: ${translateInline(v, 'ar')}` },
  { re: /^Entry: (.+)$/, fa: (v: string) => `ورود: ${v}`, ar: (v: string) => `الدخول: ${v}` },
  { re: /^Current: (.+)$/, fa: (v: string) => `فعلی: ${v}`, ar: (v: string) => `الحالي: ${v}` },
  { re: /^Signal (\d+)$/, fa: (v: string) => `سیگنال ${v}`, ar: (v: string) => `إشارة ${v}` },
];

function normalizeKey(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function translateInline(text: string, lang: "fa" | "ar") {
  const key = normalizeKey(text);
  const item = DICT[key];
  if (item) return item[lang];
  return key;
}

function translateText(text: string, lang: SupportedLanguage) {
  const key = normalizeKey(text);
  if (lang === "en") return key;
  const item = DICT[key];
  if (item) return item[lang];
  for (const rule of PATTERNS) {
    const match = key.match(rule.re);
    if (match) return (lang === "fa" ? rule.fa : rule.ar)(...match.slice(1));
  }
  return null;
}

function translateAttributes(root: ParentNode, lang: SupportedLanguage) {
  const attrs = ["placeholder", "title", "aria-label", "alt"];
  root.querySelectorAll?.("*").forEach((el) => {
    attrs.forEach((attr) => {
      const value = el.getAttribute?.(attr);
      if (!value) return;
      const translated = translateText(value, lang);
      if (translated && translated !== value) el.setAttribute(attr, translated);
    });
  });
}

function walkAndTranslate(root: ParentNode, lang: SupportedLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const changes: Array<{ node: Text; raw: string; trimmed: string; translated: string }> = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const node = current as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) continue;
    const raw = node.nodeValue || "";
    const trimmed = normalizeKey(raw);
    if (!trimmed || trimmed.length > 220) continue;
    const translated = translateText(trimmed, lang);
    if (translated && translated !== trimmed) changes.push({ node, raw, trimmed, translated });
  }
  for (const item of changes) {
    item.node.nodeValue = item.raw.replace(item.trimmed, item.translated);
  }
  translateAttributes(root, lang);
}

export function I18nRuntime() {
  useEffect(() => {
    let timer: number | undefined;
    const apply = () => {
      const lang = getLanguage();
      applyDocumentLanguage(lang);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => walkAndTranslate(document.body, lang), 50);
    };
    const obs = new MutationObserver(() => apply());
    apply();
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
    window.addEventListener('languageChange', apply as EventListener);
    window.addEventListener('storage', apply);
    return () => {
      obs.disconnect();
      window.removeEventListener('languageChange', apply as EventListener);
      window.removeEventListener('storage', apply);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
