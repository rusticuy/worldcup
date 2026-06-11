export function hasFirecrawlKey(key) {
  const value = String(key || "").trim();
  return Boolean(value && value.startsWith("fc-") && !/your|replace|example|placeholder|key-here/i.test(value));
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function firecrawlSearch({ key, query, country = "US", limit = 8 }) {
  const response = await fetchWithTimeout(
    "https://api.firecrawl.dev/v2/search",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        limit,
        sources: ["news", "web"],
        country,
        tbs: "qdr:w",
        timeout: 45000,
        scrapeOptions: {
          formats: [{ type: "markdown" }],
          onlyMainContent: true
        }
      })
    },
    60000
  );

  if (!response.ok) {
    throw new Error(`Firecrawl search returned ${response.status}`);
  }

  return response.json();
}

export async function firecrawlScrape({ key, url }) {
  const response = await fetchWithTimeout(
    "https://api.firecrawl.dev/v2/scrape",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        formats: [{ type: "markdown" }],
        onlyMainContent: true,
        timeout: 25000
      })
    },
    30000
  );

  if (!response.ok) {
    throw new Error(`Firecrawl scrape returned ${response.status}`);
  }

  return response.json();
}
