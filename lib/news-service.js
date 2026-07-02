import { firecrawlSearch, hasFirecrawlKey } from "./firecrawl.js";

const DEFAULT_NEWS_QUERY = "FIFA World Cup 2026 fans stadium plays fun facts match updates";
const DEFAULT_COUNTRY = "US";
const NEWS_CACHE_MS = 10 * 60 * 1000;
const FALLBACK_NEWS_IMAGE =
  "https://caribbean.visa.com/dam/VCOM/regional/lac/ENG/Default/about-visa/Newsroom/visa-world-cup/FIFA-Wolrd-Cup-26-Winners-Trophy-1600x900.jpg";
const QUERY_PRESETS = new Map([
  ["latest", DEFAULT_NEWS_QUERY],
  ["fixtures", "FIFA World Cup 2026 fixtures kickoff times official schedule"],
  ["broadcasters", "FIFA World Cup 2026 official broadcasters where to watch"]
]);

export const PUBLIC_NEWS_ERROR = "Live news is temporarily unavailable. Showing fallback updates.";

export const fallbackNews = [
  {
    title: "Knockout stage intensity rises as Round of 32 concludes",
    description:
      "Single-elimination drama takes over North America. Matches across the USA, Canada, and Mexico have seen thrilling penalty shootouts and historic upsets as the road to the Final begins.",
    url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
    source: "FIFA Tournament Hub",
    published: "July 2, 2026",
    category: "Tournament News",
    image: FALLBACK_NEWS_IMAGE,
    sourceLogo: ""
  },
  {
    title: "USMNT battles through to the Round of 16",
    description:
      "After a spectacular group stage run and a hard-fought Round of 32 victory, the United States Men's National Team prepares for their upcoming Round of 16 clash in front of home crowds.",
    url: "https://www.ussoccer.com",
    source: "US Soccer",
    published: "July 2, 2026",
    category: "Match Preview",
    image: FALLBACK_NEWS_IMAGE,
    sourceLogo: ""
  },
  {
    title: "Fans turn host cities into massive street celebrations",
    description:
      "From Times Square to Mexico City's Zócalo and Toronto's fan parks, visiting supporters from across the globe are turning match days into unforgettable carnivals of soccer culture.",
    url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
    source: "Fan Zone updates",
    published: "July 1, 2026",
    category: "Fan Guide",
    image: FALLBACK_NEWS_IMAGE,
    sourceLogo: ""
  }
];

function normalizeQuery(value) {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return QUERY_PRESETS.get(clean.toLowerCase()) || DEFAULT_NEWS_QUERY;
}

function normalizeCountry(value) {
  const clean = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(clean) ? clean : DEFAULT_COUNTRY;
}

function safeHostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceLogoFor(url) {
  const hostname = safeHostname(url);
  return hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=64` : "";
}

function pickImage(result) {
  return (
    result.imageUrl ||
    result.image ||
    result.thumbnail ||
    result.metadata?.ogImage ||
    result.metadata?.image ||
    FALLBACK_NEWS_IMAGE
  );
}

function categorizeNews(result) {
  const text = `${result.title || ""} ${result.description || ""} ${result.snippet || ""}`.toLowerCase();

  if (/\b(tv|stream|watch|channel|broadcast|coverage|schedule)\b/.test(text)) return "Watch Guide";
  if (/\b(preview|team news|lineup|squad|injury)\b/.test(text)) return "Match Preview";
  if (/\b(analysis|why|how|tactics|ranking|explained)\b/.test(text)) return "Analysis";
  if (/\b(ticket|city|stadium|venue|travel)\b/.test(text)) return "Fan Guide";
  if (/\b(draw|group|fixture|kickoff|kick-off)\b/.test(text)) return "Schedule";
  return "Tournament News";
}

export function normalizeNews(result) {
  const safeUrl = result.url || "";
  const description = result.description || result.snippet || result.markdown?.slice(0, 180) || "Latest tournament update.";
  return {
    title: result.title || "World Cup 2026 update",
    description,
    url: safeUrl,
    source: result.source || safeHostname(safeUrl) || "News",
    sourceLogo: sourceLogoFor(safeUrl),
    category: categorizeNews(result),
    image: pickImage(result),
    published: result.publishedDate || result.date || "Recent"
  };
}

export async function fetchNews() {
  return {
    ok: true,
    mode: "curated",
    message: "Showing curated tournament updates.",
    items: fallbackNews
  };
}
