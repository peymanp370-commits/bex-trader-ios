export type DstMode = "auto" | "on" | "off";

export type CountryTimezone = {
  country: string;
  label: string;
  flag: string;
  timezones: string[];
};

export const COUNTRY_TIMEZONES: CountryTimezone[] = [
  { country: "CA", label: "Canada", flag: "🇨🇦", timezones: ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns"] },
  { country: "US", label: "United States", flag: "🇺🇸", timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu"] },

  { country: "GB", label: "United Kingdom", flag: "🇬🇧", timezones: ["Europe/London"] },
  { country: "IE", label: "Ireland", flag: "🇮🇪", timezones: ["Europe/Dublin"] },
  { country: "DE", label: "Germany", flag: "🇩🇪", timezones: ["Europe/Berlin"] },
  { country: "FR", label: "France", flag: "🇫🇷", timezones: ["Europe/Paris"] },
  { country: "ES", label: "Spain", flag: "🇪🇸", timezones: ["Europe/Madrid", "Atlantic/Canary"] },
  { country: "IT", label: "Italy", flag: "🇮🇹", timezones: ["Europe/Rome"] },
  { country: "NL", label: "Netherlands", flag: "🇳🇱", timezones: ["Europe/Amsterdam"] },
  { country: "CH", label: "Switzerland", flag: "🇨🇭", timezones: ["Europe/Zurich"] },
  { country: "SE", label: "Sweden", flag: "🇸🇪", timezones: ["Europe/Stockholm"] },
  { country: "NO", label: "Norway", flag: "🇳🇴", timezones: ["Europe/Oslo"] },
  { country: "FI", label: "Finland", flag: "🇫🇮", timezones: ["Europe/Helsinki"] },
  { country: "GR", label: "Greece", flag: "🇬🇷", timezones: ["Europe/Athens"] },
  { country: "PT", label: "Portugal", flag: "🇵🇹", timezones: ["Europe/Lisbon", "Atlantic/Azores"] },

  { country: "AE", label: "United Arab Emirates", flag: "🇦🇪", timezones: ["Asia/Dubai"] },
  { country: "SA", label: "Saudi Arabia", flag: "🇸🇦", timezones: ["Asia/Riyadh"] },
  { country: "QA", label: "Qatar", flag: "🇶🇦", timezones: ["Asia/Qatar"] },
  { country: "KW", label: "Kuwait", flag: "🇰🇼", timezones: ["Asia/Kuwait"] },
  { country: "BH", label: "Bahrain", flag: "🇧🇭", timezones: ["Asia/Bahrain"] },
  { country: "OM", label: "Oman", flag: "🇴🇲", timezones: ["Asia/Muscat"] },
  { country: "TR", label: "Turkey", flag: "🇹🇷", timezones: ["Europe/Istanbul"] },
  { country: "IR", label: "Iran", flag: "🇮🇷", timezones: ["Asia/Tehran"] },
  { country: "IL", label: "Israel", flag: "🇮🇱", timezones: ["Asia/Jerusalem"] },

  { country: "IN", label: "India", flag: "🇮🇳", timezones: ["Asia/Kolkata"] },
  { country: "PK", label: "Pakistan", flag: "🇵🇰", timezones: ["Asia/Karachi"] },
  { country: "BD", label: "Bangladesh", flag: "🇧🇩", timezones: ["Asia/Dhaka"] },
  { country: "LK", label: "Sri Lanka", flag: "🇱🇰", timezones: ["Asia/Colombo"] },

  { country: "CN", label: "China", flag: "🇨🇳", timezones: ["Asia/Shanghai"] },
  { country: "HK", label: "Hong Kong", flag: "🇭🇰", timezones: ["Asia/Hong_Kong"] },
  { country: "JP", label: "Japan", flag: "🇯🇵", timezones: ["Asia/Tokyo"] },
  { country: "KR", label: "South Korea", flag: "🇰🇷", timezones: ["Asia/Seoul"] },
  { country: "SG", label: "Singapore", flag: "🇸🇬", timezones: ["Asia/Singapore"] },
  { country: "TH", label: "Thailand", flag: "🇹🇭", timezones: ["Asia/Bangkok"] },
  { country: "MY", label: "Malaysia", flag: "🇲🇾", timezones: ["Asia/Kuala_Lumpur"] },
  { country: "ID", label: "Indonesia", flag: "🇮🇩", timezones: ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] },
  { country: "PH", label: "Philippines", flag: "🇵🇭", timezones: ["Asia/Manila"] },

  { country: "AU", label: "Australia", flag: "🇦🇺", timezones: ["Australia/Sydney", "Australia/Melbourne", "Australia/Brisbane", "Australia/Perth", "Australia/Adelaide", "Australia/Darwin", "Australia/Hobart"] },
  { country: "NZ", label: "New Zealand", flag: "🇳🇿", timezones: ["Pacific/Auckland", "Pacific/Chatham"] },

  { country: "ZA", label: "South Africa", flag: "🇿🇦", timezones: ["Africa/Johannesburg"] },
  { country: "EG", label: "Egypt", flag: "🇪🇬", timezones: ["Africa/Cairo"] },
  { country: "NG", label: "Nigeria", flag: "🇳🇬", timezones: ["Africa/Lagos"] },
  { country: "KE", label: "Kenya", flag: "🇰🇪", timezones: ["Africa/Nairobi"] },
  { country: "MA", label: "Morocco", flag: "🇲🇦", timezones: ["Africa/Casablanca"] },
  { country: "GH", label: "Ghana", flag: "🇬🇭", timezones: ["Africa/Accra"] },
  { country: "ET", label: "Ethiopia", flag: "🇪🇹", timezones: ["Africa/Addis_Ababa"] },

  { country: "BR", label: "Brazil", flag: "🇧🇷", timezones: ["America/Sao_Paulo", "America/Manaus", "America/Belem", "America/Fortaleza", "America/Recife"] },
  { country: "MX", label: "Mexico", flag: "🇲🇽", timezones: ["America/Mexico_City", "America/Tijuana", "America/Cancun", "America/Monterrey"] },
  { country: "AR", label: "Argentina", flag: "🇦🇷", timezones: ["America/Argentina/Buenos_Aires"] },
  { country: "CL", label: "Chile", flag: "🇨🇱", timezones: ["America/Santiago"] },
  { country: "CO", label: "Colombia", flag: "🇨🇴", timezones: ["America/Bogota"] },
  { country: "PE", label: "Peru", flag: "🇵🇪", timezones: ["America/Lima"] },

  { country: "RU", label: "Russia", flag: "🇷🇺", timezones: ["Europe/Moscow", "Asia/Yekaterinburg", "Asia/Novosibirsk", "Asia/Irkutsk", "Asia/Vladivostok"] },
  { country: "UA", label: "Ukraine", flag: "🇺🇦", timezones: ["Europe/Kyiv"] },
];

export function getDefaultTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto";
}

export function getCountryByTimezone(timezone: string): CountryTimezone | undefined {
  return COUNTRY_TIMEZONES.find((item) => item.timezones.includes(timezone));
}

export function getCountryByCode(countryCode: string): CountryTimezone | undefined {
  return COUNTRY_TIMEZONES.find((item) => item.country === countryCode);
}

export function getTimezonesForCountry(countryCode: string): string[] {
  return getCountryByCode(countryCode)?.timezones || [getDefaultTimezone() || "UTC"];
}

export function getTimezoneLabel(timezone: string): string {
  const parts = timezone.split("/");
  return parts[parts.length - 1].replace(/_/g, " ");
}

export function getTimezoneOffsetLabel(timezone: string, date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(date);

    return parts.find((p) => p.type === "timeZoneName")?.value || "GMT";
  } catch {
    return "GMT";
  }
}

export function formatTimeByTimezone(timezone: string, locale = "en-US", hour12 = true): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(new Date());
}

export function formatDateTimeByTimezone(
  dateInput: string | number | Date,
  timezone: string,
  locale = "en-US",
  hour12 = true
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(new Date(dateInput));
}

export function getEffectiveTimezoneOffsetLabel(timezone: string, dstMode: DstMode = "auto"): string {
  const autoLabel = getTimezoneOffsetLabel(timezone);
  if (dstMode === "auto") return autoLabel;

  const match = autoLabel.match(/GMT([+-]\d{1,2})(?::(\d{2}))?/);
  if (!match) return autoLabel;

  const baseHour = Number(match[1]);
  const minutes = match[2] || "00";
  const adjustedHour = dstMode === "on" ? baseHour + 1 : baseHour;

  return `GMT${adjustedHour >= 0 ? "+" : ""}${adjustedHour}:${minutes}`;
}
