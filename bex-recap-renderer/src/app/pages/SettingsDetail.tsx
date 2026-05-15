import { ArrowLeft, Check } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router";
import { useState } from "react";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)", offset: "UTC-5" },
  { value: "America/Chicago", label: "Central Time (CT)", offset: "UTC-6" },
  { value: "America/Denver", label: "Mountain Time (MT)", offset: "UTC-7" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "UTC-8" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)", offset: "UTC-9" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)", offset: "UTC-10" },
  { value: "Europe/London", label: "London (GMT)", offset: "UTC+0" },
  { value: "Europe/Paris", label: "Paris (CET)", offset: "UTC+1" },
  { value: "Europe/Athens", label: "Athens (EET)", offset: "UTC+2" },
  { value: "Europe/Moscow", label: "Moscow (MSK)", offset: "UTC+3" },
  { value: "Asia/Dubai", label: "Dubai (GST)", offset: "UTC+4" },
  { value: "Asia/Karachi", label: "Karachi (PKT)", offset: "UTC+5" },
  { value: "Asia/Dhaka", label: "Dhaka (BST)", offset: "UTC+6" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)", offset: "UTC+7" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)", offset: "UTC+8" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: "UTC+9" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)", offset: "UTC+10" },
  { value: "Pacific/Auckland", label: "Auckland (NZDT)", offset: "UTC+12" },
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
  { code: "RU", name: "Russia", flag: "🇷🇺" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
];

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
];

export function SettingsDetail() {
  const { section } = useParams();
  const navigate = useNavigate();
  const [darkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });

  // State for selectors
  const [selectedCountry, setSelectedCountry] = useState(
    localStorage.getItem('userCountry') || 'United States'
  );
  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem('userLanguage') || 'en'
  );
  const [selectedTimezone, setSelectedTimezone] = useState(
    localStorage.getItem('userTimezone') || 'America/Los_Angeles'
  );

  const handleCountrySelect = (countryName: string) => {
    setSelectedCountry(countryName);
    localStorage.setItem('userCountry', countryName);
    setTimeout(() => navigate('/app/settings'), 300);
  };

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    localStorage.setItem('userLanguage', languageCode);
    setTimeout(() => navigate('/app/settings'), 300);
  };

  const handleTimezoneSelect = (timezone: string) => {
    setSelectedTimezone(timezone);
    localStorage.setItem('userTimezone', timezone);
    setTimeout(() => navigate('/app/settings'), 300);
  };

  const content: Record<string, { title: string; content: JSX.Element }> = {
    country: {
      title: "Select Country",
      content: (
        <div className="space-y-2">
          {COUNTRIES.map((country) => (
            <button
              key={country.code}
              onClick={() => handleCountrySelect(country.name)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                selectedCountry === country.name
                  ? darkMode
                    ? 'bg-teal-500/20 border-2 border-teal-500'
                    : 'bg-teal-100 border-2 border-teal-500'
                  : darkMode
                  ? 'bg-[#0f1623] border border-gray-800 hover:bg-[#1a2332]'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{country.flag}</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {country.name}
                </span>
              </div>
              {selectedCountry === country.name && (
                <Check className="w-5 h-5 text-teal-400" />
              )}
            </button>
          ))}
        </div>
      ),
    },
    language: {
      title: "Select Language",
      content: (
        <div className="space-y-2">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language.code)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                selectedLanguage === language.code
                  ? darkMode
                    ? 'bg-blue-500/20 border-2 border-blue-500'
                    : 'bg-blue-100 border-2 border-blue-500'
                  : darkMode
                  ? 'bg-[#0f1623] border border-gray-800 hover:bg-[#1a2332]'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{language.flag}</span>
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {language.name}
                </span>
              </div>
              {selectedLanguage === language.code && (
                <Check className="w-5 h-5 text-blue-400" />
              )}
            </button>
          ))}
        </div>
      ),
    },
    timezone: {
      title: "Select Timezone",
      content: (
        <div className="space-y-2">
          {TIMEZONES.map((tz) => (
            <button
              key={tz.value}
              onClick={() => handleTimezoneSelect(tz.value)}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                selectedTimezone === tz.value
                  ? darkMode
                    ? 'bg-purple-500/20 border-2 border-purple-500'
                    : 'bg-purple-100 border-2 border-purple-500'
                  : darkMode
                  ? 'bg-[#0f1623] border border-gray-800 hover:bg-[#1a2332]'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-start">
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {tz.label}
                </span>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {tz.offset}
                </span>
              </div>
              {selectedTimezone === tz.value && (
                <Check className="w-5 h-5 text-purple-400" />
              )}
            </button>
          ))}
        </div>
      ),
    },
    "economic-calendar": {
      title: "Economic Calendar",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            Stay updated with major economic events that impact the market, including interest rates, 
            inflation data, and key announcements.
          </p>
          <div className="bg-[#1a2332] rounded-xl p-4 border border-gray-800">
            <p className="text-yellow-400 text-sm font-bold mb-2">Coming Soon</p>
            <p className="text-sm text-gray-400">
              Economic calendar integration is currently under development and will be available in the next update.
            </p>
          </div>
        </div>
      ),
    },
    "risk-disclaimer": {
      title: "Risk Disclaimer",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            Trading financial markets involves high risk. Signals and analysis provided by BEX Trader 
            are for informational purposes only and do not guarantee profit. You are fully responsible 
            for your trading decisions.
          </p>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 font-bold text-sm mb-2">⚠️ Important Warning</p>
            <p className="text-sm text-gray-300">
              Never invest money you cannot afford to lose. Past performance does not indicate future results.
            </p>
          </div>
        </div>
      ),
    },
    "how-to-use": {
      title: "How To Use",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            BEX Trader provides AI-powered trading signals and analysis.
          </p>
          <div className="bg-[#0f1623] rounded-xl p-4 border border-gray-800 space-y-3">
            <p className="text-yellow-400 font-bold text-sm">To use:</p>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Connect your trading account (e.g. MetaTrader 5 or other supported platforms)</li>
              <li>Enable auto-trading or copy signals manually</li>
              <li>Follow the provided Entry, Stop Loss, and Take Profit levels</li>
            </ol>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-400 font-bold text-sm mb-2">📌 Important Note</p>
            <p className="text-sm text-gray-300 mb-2">
              The system does NOT execute trades automatically by itself.
            </p>
            <p className="text-sm text-gray-300">
              You must connect it to a trading platform that supports auto-trading.
            </p>
          </div>
        </div>
      ),
    },
    plans: {
      title: "Subscription Plans",
      content: (
        <div className="space-y-4">
          {/* Basic */}
          <div className="bg-[#0f1623] rounded-xl p-5 border border-gray-700">
            <h3 className="text-lg font-bold mb-3">Basic</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Limited signals</li>
              <li>• Delayed alerts</li>
              <li>• Basic analysis</li>
              <li>• No automation support</li>
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-xl p-5 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-bold">Pro</h3>
              <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Most Popular</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Full real-time signals</li>
              <li>• AI-powered analysis</li>
              <li>• Instant notifications</li>
              <li>• Copy trade support</li>
              <li>• Market context and insights</li>
            </ul>
          </div>

          {/* VIP */}
          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-700/20 rounded-xl p-5 border border-yellow-500/30">
            <h3 className="text-lg font-bold mb-3 text-yellow-400">VIP</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Premium signals (top setups)</li>
              <li>• Advanced AI analysis</li>
              <li>• Instant execution insights</li>
              <li>• Full performance analytics</li>
              <li>• Risk management tools</li>
              <li>• Priority support</li>
            </ul>
          </div>

          <Link to="/app/vip">
            <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-3 rounded-xl font-bold">
              View All Plans
            </button>
          </Link>
        </div>
      ),
    },
    "contact-us": {
      title: "Contact Us",
      content: (
        <div className="space-y-4">
          <div className="bg-[#0f1623] rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Website</p>
            <p className="text-white font-medium">bextrader.com</p>
          </div>
          <div className="bg-[#0f1623] rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Address</p>
            <p className="text-white font-medium">41 McGurran Lane, Richmond Hill</p>
          </div>
          <div className="bg-[#0f1623] rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Telegram</p>
            <p className="text-white font-medium">@bextrader</p>
          </div>
        </div>
      ),
    },
    faq: {
      title: "FAQ",
      content: (
        <div className="space-y-3">
          <p className="text-gray-300 mb-4">
            Find answers to common questions about signals, trading setup, and account usage.
          </p>
          <details className="bg-[#0f1623] rounded-xl p-4 border border-gray-800">
            <summary className="font-bold cursor-pointer">How do I receive signals?</summary>
            <p className="text-sm text-gray-300 mt-2">
              Signals are sent via push notifications and are available in the Signals section of the app.
            </p>
          </details>
          <details className="bg-[#0f1623] rounded-xl p-4 border border-gray-800">
            <summary className="font-bold cursor-pointer">Can I use this with any broker?</summary>
            <p className="text-sm text-gray-300 mt-2">
              Yes, BEX Trader works with most brokers that support MetaTrader 5 or manual trading.
            </p>
          </details>
          <details className="bg-[#0f1623] rounded-xl p-4 border border-gray-800">
            <summary className="font-bold cursor-pointer">What's the difference between plans?</summary>
            <p className="text-sm text-gray-300 mt-2">
              Higher plans offer more signals, real-time alerts, and advanced AI analysis. Check the Plans section for details.
            </p>
          </details>
        </div>
      ),
    },
    "about-us": {
      title: "About Us",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            BEX Trader is an AI-driven trading platform focused on delivering high-quality signals, 
            market insights, and decision support for traders.
          </p>
          <div className="bg-[#0f1623] rounded-xl p-5 border border-gray-800">
            <h3 className="text-yellow-400 font-bold mb-3">Our Mission</h3>
            <p className="text-sm text-gray-300">
              To empower traders with institutional-grade analysis and AI-powered insights, making 
              professional trading accessible to everyone.
            </p>
          </div>
        </div>
      ),
    },
    notifications: {
      title: "Notifications",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300">
            BEX Trader sends real-time alerts for:
          </p>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400">•</span>
              New trading signals
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">•</span>
              Market changes
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">•</span>
              Signal updates (entry, TP, SL changes)
            </li>
          </ul>
          <div className="bg-[#0f1623] rounded-xl p-5 border border-gray-800">
            <h3 className="text-yellow-400 font-bold text-sm mb-3">To receive notifications:</h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Enable notifications in your device settings</li>
              <li>Allow notifications when opening the app</li>
              <li>Keep the app active or allow background activity</li>
            </ol>
          </div>
        </div>
      ),
    },
    "privacy-policy": {
      title: "Privacy & Policy",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            We respect your privacy. Your data is securely stored and never shared with third parties 
            without your consent.
          </p>
          <div className="bg-[#0f1623] rounded-xl p-4 border border-gray-800 space-y-3">
            <h3 className="text-yellow-400 font-bold text-sm">Data We Collect:</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Account information (email, name)</li>
              <li>• Trading preferences and settings</li>
              <li>• App usage analytics</li>
            </ul>
          </div>
          <div className="bg-[#0f1623] rounded-xl p-4 border border-gray-800 space-y-3">
            <h3 className="text-yellow-400 font-bold text-sm">Your Rights:</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Request data deletion</li>
              <li>• Export your data</li>
              <li>• Opt-out of marketing communications</li>
            </ul>
          </div>
        </div>
      ),
    },
    "terms-conditions": {
      title: "Terms & Conditions",
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">
            By using BEX Trader, you agree that:
          </p>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              Signals are not financial advice
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              You trade at your own risk
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">•</span>
              The platform is a decision-support tool only
            </li>
          </ul>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 font-bold text-sm mb-2">⚠️ Disclaimer</p>
            <p className="text-sm text-gray-300">
              BEX Trader is not responsible for any financial losses incurred from using the signals 
              or analysis provided by the platform.
            </p>
          </div>
        </div>
      ),
    },
  };

  const currentContent = content[section || ""] || {
    title: "Not Found",
    content: <p className="text-gray-400">Content not found</p>,
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white pb-20">
      <header className="bg-[#0f1623] p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Link to="/app/settings">
            <button className="p-2 rounded-lg hover:bg-[#1a2332]">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="font-bold text-xl">{currentContent.title}</h1>
        </div>
      </header>

      <div className="p-4">{currentContent.content}</div>
    </div>
  );
}