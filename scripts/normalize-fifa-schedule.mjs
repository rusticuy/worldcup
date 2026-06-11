import fs from "node:fs";

const apiUrl =
  "https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&language=en&count=500";
const sourcePath = process.argv[2] || "output/fifa-official-matches.json";
const targetPath = process.argv[3] || "data/worldcup-data.js";

const stadiumMeta = {
  "Mexico City Stadium": { city: "Mexico City", country: "Mexico", zone: "America/Mexico_City" },
  "Guadalajara Stadium": { city: "Guadalajara", country: "Mexico", zone: "America/Mexico_City" },
  "Monterrey Stadium": { city: "Monterrey", country: "Mexico", zone: "America/Mexico_City" },
  "Toronto Stadium": { city: "Toronto", country: "Canada", zone: "America/Toronto" },
  "BC Place Vancouver": { city: "Vancouver", country: "Canada", zone: "America/Vancouver" },
  "Los Angeles Stadium": { city: "Los Angeles", country: "United States", zone: "America/Los_Angeles" },
  "San Francisco Bay Area Stadium": { city: "San Francisco Bay Area", country: "United States", zone: "America/Los_Angeles" },
  "Seattle Stadium": { city: "Seattle", country: "United States", zone: "America/Los_Angeles" },
  "Dallas Stadium": { city: "Dallas", country: "United States", zone: "America/Chicago" },
  "Houston Stadium": { city: "Houston", country: "United States", zone: "America/Chicago" },
  "Kansas City Stadium": { city: "Kansas City", country: "United States", zone: "America/Chicago" },
  "Atlanta Stadium": { city: "Atlanta", country: "United States", zone: "America/New_York" },
  "Boston Stadium": { city: "Boston", country: "United States", zone: "America/New_York" },
  "Miami Stadium": { city: "Miami", country: "United States", zone: "America/New_York" },
  "New York/New Jersey Stadium": { city: "New York / New Jersey", country: "United States", zone: "America/New_York" },
  "Philadelphia Stadium": { city: "Philadelphia", country: "United States", zone: "America/New_York" }
};

const hostCodes = new Set(["MEX", "CAN", "USA"]);
const marqueeMatchNumbers = new Set([1, 3, 4, 7, 10, 17, 22, 36, 61, 72, 101, 102, 103, 104]);

function label(values) {
  return Array.isArray(values) ? (values.find((item) => item.Locale === "en-GB") || values[0] || {}).Description || "" : "";
}

function placeholder(value) {
  if (!value) return "";

  const compact = String(value).replace(/\s+/g, "");
  const group = compact.match(/^([123])([A-L]+)$/);
  if (group) {
    const rankLabel = group[1] === "1" ? "Winner" : group[1] === "2" ? "Runner-up" : "Best 3rd place";
    const groups = group[2].split("").join("/");
    return `${rankLabel} Group ${groups}`;
  }

  const winner = compact.match(/^W(\d+)$/);
  if (winner) return `Winner Match ${winner[1]}`;

  const loser = compact.match(/^L(\d+)$/);
  if (loser) return `Loser Match ${loser[1]}`;

  return value;
}

function team(match, side) {
  const data = match[side];
  if (!data) {
    return {
      name: placeholder(side === "Home" ? match.PlaceHolderA : match.PlaceHolderB),
      code: ""
    };
  }

  return {
    name: data.ShortClubName || label(data.TeamName),
    code: data.Abbreviation || data.IdCountry || ""
  };
}

function localKickoff(iso, zone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
    .formatToParts(new Date(iso))
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.weekday}, ${Number(parts.day)} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}`;
}

function normalizeMatch(match) {
  const venue = label(match.Stadium?.Name);
  const meta = stadiumMeta[venue] || {
    city: label(match.Stadium?.CityName),
    country: match.Stadium?.IdCountry || "",
    zone: "UTC"
  };
  const home = team(match, "Home");
  const away = team(match, "Away");
  const group = label(match.GroupName);
  const stageName = label(match.StageName);
  const stage = group || stageName;
  const tags = [stageName === "First Stage" ? "group" : "knockout"];

  if (hostCodes.has(home.code) || hostCodes.has(away.code)) tags.push("host");
  if (marqueeMatchNumbers.has(Number(match.MatchNumber))) tags.push("prime");

  return {
    id: Number(match.MatchNumber),
    fifaId: match.IdMatch,
    teams: `${home.name} vs ${away.name}`,
    sourceTeamName: `${home.name} v ${away.name}`,
    homeTeam: home.name,
    awayTeam: away.name,
    homeCode: home.code,
    awayCode: away.code,
    stage,
    stageName,
    venue,
    city: meta.city,
    country: meta.country,
    zone: meta.zone,
    kickoff: match.Date,
    localKickoff: localKickoff(match.Date, meta.zone),
    tags,
    sourceUrl: `https://www.fifa.com/en/match-centre/match/${match.IdCompetition}/${match.IdSeason}/${match.IdStage}/${match.IdMatch}`
  };
}

const apiPayload = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const officialMatches = [...(apiPayload.Results || [])]
  .sort((a, b) => Number(a.MatchNumber) - Number(b.MatchNumber))
  .map(normalizeMatch);

if (officialMatches.length !== 104) {
  throw new Error(`Expected 104 FIFA World Cup 2026 matches, received ${officialMatches.length}`);
}

const scheduleBlock = `export const fifaScheduleSources = [
  {
    label: "FIFA official match schedule API",
    url: "${apiUrl}"
  },
  {
    label: "FIFA World Cup 2026 scores and fixtures",
    url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures"
  },
  {
    label: "FIFA PDF match schedule",
    url: "https://digitalhub.fifa.com/asset/4b5d4417-3343-4732-9cdf-14b6662af407/FWC26-Match-Schedule_English.pdf"
  },
  {
    label: "FIFA updated schedule media release",
    url: "https://vod.fifa.com/organisation/media-releases/updated-world-cup-2026-match-schedule-venues-kick-off-times-104-matches"
  }
];

export const seedGeneratedAt = "2026-06-11T00:00:00.000Z";

export const officialMatches = ${JSON.stringify(officialMatches, null, 2)};

`;

const current = fs.readFileSync(targetPath, "utf8");
const start = current.indexOf("export const fifaScheduleSources =");
const end = current.indexOf("export const hostCitySource =");

if (start < 0 || end < 0) {
  throw new Error("Could not locate schedule block in worldcup-data.js");
}

fs.writeFileSync(targetPath, scheduleBlock + current.slice(end), "utf8");
console.log(`Wrote ${officialMatches.length} matches to ${targetPath}`);
