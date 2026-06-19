import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PUBLIC_NEWS_ERROR, fallbackNews, fetchNews } from "./lib/news-service.js";
import { PUBLIC_SCHEDULE_ERROR, getSchedule } from "./lib/schedule-service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || readDotEnv("PORT") || 4173);

let newsCache = { at: 0, query: "", firecrawlEnabled: false, payload: null };
let scheduleCache = { at: 0, firecrawlEnabled: false, payload: null };

function readDotEnv(key) {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return "";

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) return "";
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

function getFirecrawlKey() {
  return process.env.FIRECRAWL_API_KEY || readDotEnv("FIRECRAWL_API_KEY");
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendApiError(res, status, payload) {
  sendJson(res, status, {
    ...payload,
    ok: false
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml"
    }[ext] || "application/octet-stream"
  );
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname === "/api/news") {
      const payload = await fetchNews({
        firecrawlKey: getFirecrawlKey(),
        query: requestUrl.searchParams.get("q"),
        country: requestUrl.searchParams.get("country"),
        cache: newsCache,
        bypassCache: requestUrl.searchParams.get("bypassCache") === "true"
      });
      sendJson(res, 200, payload);
      return;
    }

    if (requestUrl.pathname === "/api/schedule") {
      const payload = await getSchedule({ firecrawlKey: getFirecrawlKey(), cache: scheduleCache });
      sendJson(res, 200, payload);
      return;
    }

    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(publicDir, safePath);

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const file = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-cache"
    });
    res.end(file);
  } catch (error) {
    if (req.url?.startsWith("/api/news")) {
      console.error(error);
      sendApiError(res, 200, {
        mode: "fallback",
        message: PUBLIC_NEWS_ERROR,
        items: fallbackNews
      });
      return;
    }

    if (req.url?.startsWith("/api/schedule")) {
      console.error(error);
      const fallback = await getSchedule({ firecrawlKey: "", cache: { at: 0, payload: null } });
      sendApiError(res, 200, {
        ...fallback,
        mode: "official-seed",
        message: PUBLIC_SCHEDULE_ERROR
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`World Cup 2026 Hub running at http://localhost:${port}`);
});
