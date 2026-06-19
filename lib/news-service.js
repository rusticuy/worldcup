import { firecrawlSearch, hasFirecrawlKey } from "./firecrawl.js";

const DEFAULT_NEWS_QUERY = "FIFA World Cup 2026 latest news schedule broadcast";
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
    title: "Mexico and South Africa open FIFA World Cup 2026",
    description:
      "The tournament starts on Thursday, June 11, 2026 at Mexico City Stadium, with the opening ceremony beginning 90 minutes before kickoff.",
    url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
    source: "Seeded fallback",
    published: "Updated seed",
    category: "Match Preview",
    image: FALLBACK_NEWS_IMAGE,
    sourceLogo: ""
  },
  {
    title: "Global kickoff planner is the must-have feature",
    description:
      "Host cities span Pacific, Mountain, Central, Eastern, and Mexico City time zones, so every match card on this site converts kickoff to the visitor's local clock.",
    url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026",
    source: "Seeded fallback",
    published: "Updated seed",
    category: "Schedule",
    image: FALLBACK_NEWS_IMAGE,
    sourceLogo: ""
  },
  {
    title: "Use official broadcasters by region",
    description:
      "Broadcast rights differ by country. Use the watch finder for known markets, then verify against your local broadcaster guide before matchday.",
    url: "https://inside.fifa.com/tournament-organisation/commercial/fifa-tv",
    source: "Seeded fallback",
    published: "Updated seed",
    category: "Watch Guide",
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

export async function fetchNews({ firecrawlKey, query, country, cache, bypassCache }) {
  const cleanQuery = normalizeQuery(query);
  const cleanCountry = normalizeCountry(country);
  const cacheKey = `${cleanQuery}|${cleanCountry}`;
  const firecrawlEnabled = hasFirecrawlKey(firecrawlKey);

  if (
    !bypassCache &&
    cache?.payload &&
    cache.query === cacheKey &&
    cache.firecrawlEnabled === firecrawlEnabled &&
    Date.now() - cache.at < NEWS_CACHE_MS
  ) {
    return cache.payload;
  }

  if (!firecrawlEnabled) {
    return {
      ok: true,
      mode: "fallback",
      message: "Add FIRECRAWL_API_KEY to environment variables to enable live Firecrawl news.",
      items: fallbackNews
    };
  }

  const data = await firecrawlSearch({
    key: firecrawlKey,
    query: cleanQuery,
    country: cleanCountry,
    limit: 8
  });
  const web = Array.isArray(data?.data?.web) ? data.data.web : [];
  const news = Array.isArray(data?.data?.news) ? data.data.news : [];
  const items = [...news, ...web].slice(0, 8).map(normalizeNews);
  const payload = {
    ok: true,
    mode: "firecrawl",
    warning: data.warning || null,
    items: items.length ? items : fallbackNews
  };

  if (cache) {
    cache.at = Date.now();
    cache.query = cacheKey;
    cache.firecrawlEnabled = firecrawlEnabled;
    cache.payload = payload;
  }
  return payload;
}
