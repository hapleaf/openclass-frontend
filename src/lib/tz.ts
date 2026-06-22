export function getUserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

// ── Fixed-offset timezones (no DST) ─────────────────────────────────────────
// Intl returns "GMT±X" for these in Safari and sometimes Chrome DevTools.
// We bypass Intl entirely and return the correct abbreviation directly.
const FIXED: Record<string, string> = {
  // South Asia
  "Asia/Kolkata":                   "IST",
  "Asia/Calcutta":                  "IST",   // legacy IANA alias
  "Asia/Colombo":                   "IST",
  "Asia/Karachi":                   "PKT",
  "Asia/Dhaka":                     "BST",
  "Asia/Kathmandu":                 "NPT",
  "Asia/Kabul":                     "AFT",
  "Asia/Yangon":                    "MMT",
  "Asia/Rangoon":                   "MMT",   // legacy alias
  // Southeast Asia
  "Asia/Bangkok":                   "ICT",
  "Asia/Ho_Chi_Minh":               "ICT",
  "Asia/Saigon":                    "ICT",   // legacy alias
  "Asia/Phnom_Penh":                "ICT",
  "Asia/Vientiane":                 "ICT",
  "Asia/Jakarta":                   "WIB",
  "Asia/Makassar":                  "WITA",
  "Asia/Ujung_Pandang":             "WITA",  // legacy alias
  "Asia/Jayapura":                  "WIT",
  "Asia/Singapore":                 "SGT",
  "Asia/Kuala_Lumpur":              "MYT",
  "Asia/Kuching":                   "MYT",
  "Asia/Manila":                    "PHT",
  // East Asia
  "Asia/Shanghai":                  "CST",
  "Asia/Chongqing":                 "CST",
  "Asia/Harbin":                    "CST",
  "Asia/Chungking":                 "CST",   // legacy alias
  "Asia/Taipei":                    "CST",
  "Asia/Hong_Kong":                 "HKT",
  "Asia/Macau":                     "CST",
  "Asia/Macao":                     "CST",   // legacy alias
  "Asia/Tokyo":                     "JST",
  "Asia/Seoul":                     "KST",
  "Asia/Pyongyang":                 "KST",
  // Middle East (fixed-offset)
  "Asia/Dubai":                     "GST",
  "Asia/Muscat":                    "GST",
  "Asia/Riyadh":                    "AST",   // Arabia Standard Time
  "Asia/Kuwait":                    "AST",
  "Asia/Qatar":                     "AST",
  "Asia/Bahrain":                   "AST",
  "Asia/Aden":                      "AST",
  "Asia/Baghdad":                   "AST",
  // Europe (fixed-offset)
  "Europe/Moscow":                  "MSK",
  "Europe/Istanbul":                "TRT",
  "Europe/Kaliningrad":             "EET",
  "Europe/Minsk":                   "FET",
  // Africa
  "Africa/Lagos":                   "WAT",
  "Africa/Abidjan":                 "GMT",
  "Africa/Accra":                   "GMT",
  "Africa/Dakar":                   "GMT",
  "Africa/Monrovia":                "GMT",
  "Africa/Nairobi":                 "EAT",
  "Africa/Addis_Ababa":             "EAT",
  "Africa/Kampala":                 "EAT",
  "Africa/Dar_es_Salaam":           "EAT",
  "Africa/Mogadishu":               "EAT",
  "Africa/Djibouti":                "EAT",
  "Africa/Kigali":                  "CAT",
  "Africa/Harare":                  "CAT",
  "Africa/Lusaka":                  "CAT",
  "Africa/Blantyre":                "CAT",
  "Africa/Lubumbashi":              "CAT",
  "Africa/Bujumbura":               "CAT",
  "Africa/Johannesburg":            "SAST",
  "Africa/Maseru":                  "SAST",
  "Africa/Mbabane":                 "SAST",
  "Africa/Cairo":                   "EET",
  "Africa/Tripoli":                 "EET",
  // Americas (fixed-offset — no DST)
  "America/Sao_Paulo":              "BRT",   // Brazil dropped DST in 2019
  "America/Fortaleza":              "BRT",
  "America/Recife":                 "BRT",
  "America/Belem":                  "BRT",
  "America/Maceio":                 "BRT",
  "America/Bahia":                  "BRT",
  "America/Manaus":                 "AMT",
  "America/Porto_Velho":            "AMT",
  "America/Cuiaba":                 "AMT",
  "America/Bogota":                 "COT",
  "America/Lima":                   "PET",
  "America/Caracas":                "VET",
  "America/Argentina/Buenos_Aires": "ART",
  "America/Argentina/Cordoba":      "ART",
  "America/Argentina/Mendoza":      "ART",
  "America/Argentina/Salta":        "ART",
  "America/Argentina/Tucuman":      "ART",
  "America/Argentina/Jujuy":        "ART",
  "America/Argentina/Catamarca":    "ART",
  "America/Argentina/La_Rioja":     "ART",
  "America/Argentina/San_Juan":     "ART",
  "America/Argentina/San_Luis":     "ART",
  "America/Argentina/Rio_Gallegos": "ART",
  "America/Argentina/Ushuaia":      "ART",
  "America/Buenos_Aires":           "ART",   // legacy alias
  "America/Guayaquil":              "ECT",
  "America/La_Paz":                 "BOT",
  "America/Phoenix":                "MST",   // Arizona — no DST
  "America/Creston":                "MST",
  "America/Dawson_Creek":           "MST",
  "America/Fort_Nelson":            "MST",
  // Pacific (fixed-offset)
  "Pacific/Honolulu":               "HST",
  "Pacific/Johnston":               "HST",
  "Pacific/Midway":                 "SST",
  "Pacific/Pago_Pago":              "SST",
  "Pacific/Guam":                   "ChST",
  "Pacific/Saipan":                 "ChST",
  // Australia (no DST)
  "Australia/Perth":                "AWST",
  "Australia/Brisbane":             "AEST",
  "Australia/Lindeman":             "AEST",
  "Australia/Darwin":               "ACST",
};

// ── DST timezones: [standard, daylight saving] ───────────────────────────────
// Intl handles these correctly in most browsers, but falls back to GMT±X in
// Chrome DevTools timezone overrides and some Safari versions.
const DST: Record<string, [string, string]> = {
  // British Isles
  "Europe/London":           ["GMT",  "BST"],
  "Europe/Dublin":           ["GMT",  "IST"],  // Ireland
  "Europe/Guernsey":         ["GMT",  "BST"],
  "Europe/Isle_of_Man":      ["GMT",  "BST"],
  "Europe/Jersey":           ["GMT",  "BST"],
  // Western Europe
  "Europe/Lisbon":           ["WET",  "WEST"],
  "Atlantic/Canary":         ["WET",  "WEST"],
  "Atlantic/Faroe":          ["WET",  "WEST"],
  // Central Europe
  "Europe/Paris":            ["CET",  "CEST"],
  "Europe/Berlin":           ["CET",  "CEST"],
  "Europe/Madrid":           ["CET",  "CEST"],
  "Europe/Rome":             ["CET",  "CEST"],
  "Europe/Amsterdam":        ["CET",  "CEST"],
  "Europe/Brussels":         ["CET",  "CEST"],
  "Europe/Vienna":           ["CET",  "CEST"],
  "Europe/Zurich":           ["CET",  "CEST"],
  "Europe/Stockholm":        ["CET",  "CEST"],
  "Europe/Oslo":             ["CET",  "CEST"],
  "Europe/Copenhagen":       ["CET",  "CEST"],
  "Europe/Warsaw":           ["CET",  "CEST"],
  "Europe/Prague":           ["CET",  "CEST"],
  "Europe/Budapest":         ["CET",  "CEST"],
  "Europe/Zagreb":           ["CET",  "CEST"],
  "Europe/Ljubljana":        ["CET",  "CEST"],
  "Europe/Bratislava":       ["CET",  "CEST"],
  "Europe/Sarajevo":         ["CET",  "CEST"],
  "Europe/Belgrade":         ["CET",  "CEST"],
  "Europe/Skopje":           ["CET",  "CEST"],
  "Europe/Tirane":           ["CET",  "CEST"],
  "Europe/Luxembourg":       ["CET",  "CEST"],
  "Europe/Monaco":           ["CET",  "CEST"],
  "Europe/Andorra":          ["CET",  "CEST"],
  "Europe/Malta":            ["CET",  "CEST"],
  "Europe/Gibraltar":        ["CET",  "CEST"],
  "Europe/San_Marino":       ["CET",  "CEST"],
  "Europe/Vatican":          ["CET",  "CEST"],
  "Europe/Podgorica":        ["CET",  "CEST"],
  // Eastern Europe
  "Europe/Bucharest":        ["EET",  "EEST"],
  "Europe/Helsinki":         ["EET",  "EEST"],
  "Europe/Athens":           ["EET",  "EEST"],
  "Europe/Riga":             ["EET",  "EEST"],
  "Europe/Tallinn":          ["EET",  "EEST"],
  "Europe/Vilnius":          ["EET",  "EEST"],
  "Europe/Kyiv":             ["EET",  "EEST"],
  "Europe/Kiev":             ["EET",  "EEST"],   // legacy alias
  "Europe/Sofia":            ["EET",  "EEST"],
  "Europe/Nicosia":          ["EET",  "EEST"],
  "Europe/Chisinau":         ["EET",  "EEST"],
  "Europe/Tiraspol":         ["EET",  "EEST"],
  "Europe/Uzhgorod":         ["EET",  "EEST"],
  "Europe/Zaporozhye":       ["EET",  "EEST"],
  "Europe/Mariehamn":        ["EET",  "EEST"],
  // North America
  "America/New_York":        ["EST",  "EDT"],
  "America/Detroit":         ["EST",  "EDT"],
  "America/Indiana/Indianapolis": ["EST", "EDT"],
  "America/Indiana/Knox":    ["CST",  "CDT"],
  "America/Indiana/Marengo": ["EST",  "EDT"],
  "America/Indiana/Petersburg": ["EST", "EDT"],
  "America/Indiana/Tell_City": ["CST", "CDT"],
  "America/Indiana/Vevay":   ["EST",  "EDT"],
  "America/Indiana/Vincennes": ["EST", "EDT"],
  "America/Indiana/Winamac": ["EST",  "EDT"],
  "America/Kentucky/Louisville": ["EST", "EDT"],
  "America/Kentucky/Monticello": ["EST", "EDT"],
  "America/Toronto":         ["EST",  "EDT"],
  "America/Montreal":        ["EST",  "EDT"],
  "America/Chicago":         ["CST",  "CDT"],
  "America/Winnipeg":        ["CST",  "CDT"],
  "America/Regina":          ["CST",  "CST"],   // Saskatchewan — no DST
  "America/Denver":          ["MST",  "MDT"],
  "America/Edmonton":        ["MST",  "MDT"],
  "America/Los_Angeles":     ["PST",  "PDT"],
  "America/Vancouver":       ["PST",  "PDT"],
  "America/Tijuana":         ["PST",  "PDT"],
  "America/Anchorage":       ["AKST", "AKDT"],
  "America/Juneau":          ["AKST", "AKDT"],
  "America/Sitka":           ["AKST", "AKDT"],
  "America/Yakutat":         ["AKST", "AKDT"],
  "America/Nome":            ["AKST", "AKDT"],
  "America/Adak":            ["HST",  "HDT"],
  "America/Halifax":         ["AST",  "ADT"],
  "America/Moncton":         ["AST",  "ADT"],
  "America/St_Johns":        ["NST",  "NDT"],
  "America/Glace_Bay":       ["AST",  "ADT"],
  // South America (with DST)
  "America/Santiago":        ["CLT",  "CLST"],
  "America/Punta_Arenas":    ["CLT",  "CLST"],
  "America/Asuncion":        ["PYT",  "PYST"],
  // Middle East (with DST)
  "Asia/Tehran":             ["IRST", "IRDT"],
  "Asia/Jerusalem":          ["IST",  "IDT"],
  "Asia/Gaza":               ["EET",  "EEST"],
  "Asia/Hebron":             ["EET",  "EEST"],
  // Australasia (with DST)
  "Australia/Sydney":        ["AEST", "AEDT"],
  "Australia/Melbourne":     ["AEST", "AEDT"],
  "Australia/Hobart":        ["AEST", "AEDT"],
  "Australia/Currie":        ["AEST", "AEDT"],
  "Australia/Adelaide":      ["ACST", "ACDT"],
  "Australia/Broken_Hill":   ["ACST", "ACDT"],
  "Australia/Lord_Howe":     ["LHST", "LHDT"],
  "Pacific/Auckland":        ["NZST", "NZDT"],
  "Pacific/Chatham":         ["CHAST","CHADT"],
  "Pacific/Fiji":            ["FJT",  "FJST"],
};

// Returns the UTC offset in minutes for a given timezone + date.
// Uses timeZoneName: "longOffset" (supported in Safari 15.4+, Chrome 91+, FF 81+).
function offsetMins(tz: string, date: Date): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  }).formatToParts(date).find(p => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const m = s.match(/GMT([+-])(\d+):(\d+)/);
  if (!m) return 0;
  return (m[1] === "+" ? 1 : -1) * (parseInt(m[2]) * 60 + parseInt(m[3]));
}

function tzLabel(tz: string, date: Date): string {
  // 1. Known fixed-offset timezone → always use our map (bypasses Intl quirks)
  const fixed = FIXED[tz];
  if (fixed) return fixed;

  // 2. Try Intl — returns correct named abbreviations in Chrome/Firefox for
  //    DST timezones (CET/CEST, EST/EDT, BST/GMT …)
  const intlLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(date).find(p => p.type === "timeZoneName")?.value ?? "";

  if (intlLabel && !/^GMT[+-]/.test(intlLabel)) return intlLabel;

  // 3. Intl returned a GMT±X offset (e.g. Chrome DevTools override, older Safari)
  //    → use DST-aware map with offset-based DST detection
  const dst = DST[tz];
  if (dst) {
    const [std, dstAbbr] = dst;
    if (std === dstAbbr) return std;  // no DST for this entry

    const jan15 = new Date(date.getFullYear(), 0, 15);
    const jul15 = new Date(date.getFullYear(), 6, 15);
    const janOff = offsetMins(tz, jan15);
    const julOff = offsetMins(tz, jul15);

    if (janOff === julOff) return std;  // no DST observed this year

    // DST always advances the clock (offset > standard offset)
    const dstOffset = Math.max(janOff, julOff);
    return offsetMins(tz, date) === dstOffset ? dstAbbr : std;
  }

  // 4. Truly unknown timezone — return whatever Intl gave us
  return intlLabel;
}

export function fmtTime(iso: string, tz = getUserTz()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const label = tzLabel(tz, d);
  return label ? `${time} ${label}` : time;
}

// "Monday, 15 June 2026"
export function fmtDateLong(iso: string, tz = getUserTz()): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// "15 Jun 2026"
export function fmtDateShort(iso: string, tz = getUserTz()): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "15 Jun"  (cards / compact)
export function fmtDateCard(iso: string, tz = getUserTz()): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: tz,
    day: "numeric",
    month: "short",
  });
}
