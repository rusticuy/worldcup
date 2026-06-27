import { buildOfficialSchedulePayload, officialMatches } from "../data/worldcup-data.js";

const SCHEDULE_CACHE_MS = 30 * 60 * 1000;
export const PUBLIC_SCHEDULE_ERROR =
  "Schedule data is temporarily unavailable. Showing the checked-in FIFA-sourced schedule.";
const MONTHS = new Map([
  ["january", "01"],
  ["february", "02"],
  ["march", "03"],
  ["april", "04"],
  ["may", "05"],
  ["june", "06"],
  ["july", "07"],
  ["august", "08"],
  ["september", "09"],
  ["october", "10"],
  ["november", "11"],
  ["december", "12"]
]);

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeLocationKey(value) {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeTeams(value) {
  return normalizeWhitespace(value).replace(/\s+v\s+/i, " vs ");
}

function extractTitle(text) {
  const titleMatch = text.match(/^#\s+(.+?)\s*$/m);
  if (!titleMatch) return "";
  return normalizeWhitespace(titleMatch[1].split(":")[0]);
}

const knownLocationZones = new Map();
officialMatches.forEach((match) => {
  knownLocationZones.set(normalizeLocationKey(match.city), match.zone);
  knownLocationZones.set(normalizeLocationKey(match.venue), match.zone);
});

function resolveParsedZone({ city, venue, seed }) {
  const cityKey = normalizeLocationKey(city);
  const venueKey = normalizeLocationKey(venue);
  const seedCityKey = normalizeLocationKey(seed.city);
  const seedVenueKey = normalizeLocationKey(seed.venue);
  const cityZone = knownLocationZones.get(cityKey);
  const venueZone = knownLocationZones.get(venueKey);

  if (cityKey && !cityZone && cityKey !== seedCityKey) return "";
  if (venueKey && !venueZone && venueKey !== seedVenueKey) return "";
  if (cityZone && venueZone && cityZone !== venueZone) return "";

  return cityZone || venueZone || seed.zone;
}

function buildIsoKickoff({ day, month, time, zone }) {
  const monthNumber = MONTHS.get(String(month || "").toLowerCase());
  if (!monthNumber || !day || !time || !zone) return "";

  const [hour, minute] = time.split(":").map(Number);
  const targetUtc = Date.UTC(2026, Number(monthNumber) - 1, Number(day), hour, minute, 0);
  let utc = targetUtc;

  for (let i = 0; i < 3; i += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(new Date(utc))
      .reduce((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      }, {});

    const renderedUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    const diff = targetUtc - renderedUtc;
    if (diff === 0) break;
    utc += diff;
  }

  return new Date(utc).toISOString();
}

export function extractFifaMatch(markdown, seed) {
  const text = String(markdown || "").replace(/\r/g, "");
  const title = extractTitle(text);
  const groupMatch = text.match(/^#{2,6}\s+(Group\s+[A-Z])\s*$/m) || text.match(/\b(Group\s+[A-Z])\s+showdown\b/i);
  const dateVenueMatch = text.match(
    /^(?:#+\s*)?(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(\d{1,2})\s+([A-Za-z]+)\s*\|\s*(.+?)\s*$/m
  );
  const kickoffSection = text.match(/(?:^|\n)(?:#{1,6}\s*)?Kick-?off time\s*\n+([^\n]+)/i);
  const kickoffMatch = kickoffSection?.[1]?.match(/(\d{1,2}:\d{2})\s*\(([^)]+)\)/);

  if (!title || !dateVenueMatch || !kickoffMatch) {
    return {
      match: seed,
      parsedFields: {},
      parseStatus: "insufficient-data"
    };
  }

  const [, weekday, day, month, venue] = dateVenueMatch;
  const [, localTime, kickoffCity] = kickoffMatch;
  const parsedZone = resolveParsedZone({ city: kickoffCity, venue, seed });
  const kickoff = parsedZone ? buildIsoKickoff({ day, month, time: localTime, zone: parsedZone }) : "";
  const parsedFields = {
    teams: normalizeTeams(title),
    stage: normalizeWhitespace(groupMatch?.[1] || seed.stage),
    venue: normalizeWhitespace(venue),
    city: normalizeWhitespace(kickoffCity || seed.city),
    zone: parsedZone,
    kickoff,
    localKickoff: `${weekday}, ${day} ${month} 2026, ${localTime}`,
    sourceTeamName: title
  };

  const required = ["teams", "venue", "city", "zone", "kickoff", "localKickoff"];
  const missing = required.filter((field) => !parsedFields[field]);

  if (missing.length) {
    return {
      match: seed,
      parsedFields,
      parseStatus: "insufficient-data",
      missing
    };
  }

  return {
    match: {
      ...seed,
      ...parsedFields,
      parsedFromFirecrawl: true,
      parsedAt: new Date().toISOString()
    },
    parsedFields,
    parseStatus: "parsed"
  };
}

export async function getSchedule({ cache }) {
  if (cache.payload && Date.now() - cache.at < SCHEDULE_CACHE_MS) {
    return cache.payload;
  }

  const payload = buildOfficialSchedulePayload({
    mode: "official-fifa-api",
    message: "Full 104-match FIFA World Cup 2026 schedule normalized from FIFA's official match API."
  });

  try {
    const res = await fetch("https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&language=en&count=500");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.Results)) {
        const matchesMap = new Map();
        data.Results.forEach((result) => {
          if (result.IdMatch) {
            const homeName = result.Home?.ShortClubName || result.Home?.TeamName?.[0]?.Description;
            const awayName = result.Away?.ShortClubName || result.Away?.TeamName?.[0]?.Description;
            const homeAbbrev = result.Home?.Abbreviation;
            const awayAbbrev = result.Away?.Abbreviation;

            matchesMap.set(String(result.IdMatch), {
              homeTeam: homeName || "",
              awayTeam: awayName || "",
              homeCode: homeAbbrev || "",
              awayCode: awayAbbrev || "",
              homeScore: result.HomeTeamScore !== undefined && result.HomeTeamScore !== null ? result.HomeTeamScore : result.Home?.Score,
              awayScore: result.AwayTeamScore !== undefined && result.AwayTeamScore !== null ? result.AwayTeamScore : result.Away?.Score,
              matchStatus: result.MatchStatus
            });
          }
        });

        payload.matches = payload.matches.map((match) => {
          const apiMatch = matchesMap.get(String(match.fifaId));
          if (apiMatch) {
            const hasHomeScore = apiMatch.homeScore !== undefined && apiMatch.homeScore !== null;
            const hasAwayScore = apiMatch.awayScore !== undefined && apiMatch.awayScore !== null;

            // Check if we have actual resolved team names (not empty/placeholders)
            const isHomeResolved = apiMatch.homeTeam && !/Runner-up|Winner|Best 3rd/i.test(apiMatch.homeTeam);
            const isAwayResolved = apiMatch.awayTeam && !/Runner-up|Winner|Best 3rd/i.test(apiMatch.awayTeam);

            const homeTeam = isHomeResolved ? apiMatch.homeTeam : match.homeTeam;
            const awayTeam = isAwayResolved ? apiMatch.awayTeam : match.awayTeam;
            const homeCode = isHomeResolved ? apiMatch.homeCode : match.homeCode;
            const awayCode = isAwayResolved ? apiMatch.awayCode : match.awayCode;
            const teams = (isHomeResolved && isAwayResolved)
              ? `${homeTeam} vs ${awayTeam}`
              : match.teams;

            return {
              ...match,
              homeTeam,
              awayTeam,
              homeCode,
              awayCode,
              teams,
              score: (hasHomeScore && hasAwayScore) ? {
                home: apiMatch.homeScore,
                away: apiMatch.awayScore
              } : null,
              apiMatchStatus: apiMatch.matchStatus
            };
          }
          return match;
        });
        payload.lastLiveCheckedAt = new Date().toISOString();
      }
    }
  } catch (error) {
    console.error("Failed to fetch live scores from FIFA API:", error);
  }

  cache.at = Date.now();
  cache.payload = payload;
  return payload;
}
