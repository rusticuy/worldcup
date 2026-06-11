# World Cup 2026 Hub

A dependency-free Node website for the full FIFA World Cup 2026 match schedule, global kickoff times, watch guidance, and Firecrawl-powered news.

## Run

```powershell
Copy-Item .env.example .env
# Put your Firecrawl key in .env
npm start
```

Open `http://localhost:4173`.

If `FIRECRAWL_API_KEY` is missing, the site still runs with curated fallback news and the official FIFA-sourced schedule data. The browser never sees the API key; news requests go through server routes.

## Schedule Data

The `/api/schedule` route is the trusted data source for the frontend. It returns the full 104-match FIFA World Cup 2026 schedule normalized from FIFA's official match API:

- match id
- teams
- venue and host city
- official local kickoff
- ISO kickoff time for global timezone conversion
- FIFA source URL
- source timestamp and FIFA source links

The checked-in schedule lives in `data/worldcup-data.js`. To refresh it from a downloaded FIFA API response, save the JSON to `output/fifa-official-matches.json` and run:

```powershell
node scripts\normalize-fifa-schedule.mjs output\fifa-official-matches.json data\worldcup-data.js
```

The normalizer fails unless the source contains all 104 matches. Local development keeps a short in-memory cache; production freshness is controlled by Vercel's CDN cache headers unless you add a persistent store such as Redis or Vercel KV.

## Firecrawl

The `/api/news` route calls Firecrawl v2 search:

```http
POST https://api.firecrawl.dev/v2/search
Authorization: Bearer $FIRECRAWL_API_KEY
```

It requests `news` and `web` results for the latest World Cup 2026 news and returns a normalized list for the frontend. Search query input is normalized and length-limited before Firecrawl is called. News is cached for 10 minutes locally and by Vercel's cache headers in deployment.

## Vercel Deployment

This project is configured to run out-of-the-box on the Vercel Hobby (Free) Tier:

1. **Deploy:** Import your repository into Vercel.
2. **Environment Variable:** Add `FIRECRAWL_API_KEY` to your Vercel project Environment Variables.
3. **Routing & Serverless Function:**
   - Static assets inside `/public` are mapped to the root `/` using `vercel.json`.
   - The news scraping backend is handled by Vercel serverless function at `/api/news` via `api/news.js`.
   - The FIFA schedule backend is handled by `/api/schedule` via `api/schedule.js`.
   - Vercel caches news for 10 minutes and schedule checks for 30 minutes using `Cache-Control` headers.
