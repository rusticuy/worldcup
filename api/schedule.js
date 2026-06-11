import { PUBLIC_SCHEDULE_ERROR, getSchedule } from "../lib/schedule-service.js";

// Serverless memory is only opportunistic. Vercel's Cache-Control header is the real production cache.
const scheduleCache = { at: 0, payload: null };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=1800");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const payload = await getSchedule({
      firecrawlKey: process.env.FIRECRAWL_API_KEY,
      cache: scheduleCache
    });
    if (payload.ok === false) {
      res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=600");
      res.status(200).json(payload);
      return;
    }

    res.status(200).json(payload);
  } catch (error) {
    console.error(error);
    const fallback = await getSchedule({ firecrawlKey: "", cache: { at: 0, payload: null } });
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=600");
    res.status(200).json({
      ...fallback,
      ok: false,
      mode: "official-seed",
      message: PUBLIC_SCHEDULE_ERROR
    });
  }
}
