import { PUBLIC_NEWS_ERROR, fallbackNews, fetchNews } from "../lib/news-service.js";

const firecrawlKey = process.env.FIRECRAWL_API_KEY;

export default async function handler(req, res) {
  const { q, country } = req.query || {};

  // Vercel Edge caching headers
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=600");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const payload = await fetchNews({ firecrawlKey, query: q, country });
    res.status(200).json(payload);
  } catch (error) {
    console.error(error);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=300");
    res.status(200).json({
      ok: false,
      mode: "fallback",
      message: PUBLIC_NEWS_ERROR,
      items: fallbackNews
    });
  }
}
