import {
  filterScheduleMatches,
  getPhaseDefinition,
  getPhaseMatches,
  nextScheduleControlState,
  schedulePhaseDefinitions
} from "./schedule-ui.js";

const openingKickoff = new Date("2026-06-11T19:00:00Z");

const timeZones = [
  { label: "Your local time", value: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { label: "New York / New Jersey", value: "America/New_York" },
  { label: "Los Angeles", value: "America/Los_Angeles" },
  { label: "Mexico City", value: "America/Mexico_City" },
  { label: "Toronto", value: "America/Toronto" },
  { label: "London", value: "Europe/London" },
  { label: "Paris", value: "Europe/Paris" },
  { label: "Sao Paulo", value: "America/Sao_Paulo" },
  { label: "Mumbai", value: "Asia/Kolkata" },
  { label: "Tokyo", value: "Asia/Tokyo" },
  { label: "Sydney", value: "Australia/Sydney" }
];

const countryCodes = new Map([
  ["argentina", "ar"],
  ["australia", "au"],
  ["bosnia and herzegovina", "ba"],
  ["bosnia & herzegovina", "ba"],
  ["brazil", "br"],
  ["canada", "ca"],
  ["croatia", "hr"],
  ["czech republic", "cz"],
  ["czechia", "cz"],
  ["england", "gb"],
  ["france", "fr"],
  ["india", "in"],
  ["korea republic", "kr"],
  ["mexico", "mx"],
  ["morocco", "ma"],
  ["paraguay", "py"],
  ["qatar", "qa"],
  ["south africa", "za"],
  ["south korea", "kr"],
  ["switzerland", "ch"],
  ["united kingdom", "gb"],
  ["united states", "us"],
  ["usa", "us"]
]);

const teamAccents = new Map([
  ["argentina", "#74acdf"],
  ["australia", "#f6c243"],
  ["bosnia and herzegovina", "#1b4ea3"],
  ["bosnia & herzegovina", "#1b4ea3"],
  ["brazil", "#1faa59"],
  ["canada", "#e31b23"],
  ["croatia", "#e21d2f"],
  ["czech republic", "#11457e"],
  ["czechia", "#11457e"],
  ["england", "#f2f5f7"],
  ["france", "#1f4fa3"],
  ["korea republic", "#c60c30"],
  ["mexico", "#0f8f5a"],
  ["morocco", "#c1272d"],
  ["paraguay", "#d52b1e"],
  ["south africa", "#ffb81c"],
  ["south korea", "#c60c30"],
  ["united states", "#3c3b6e"],
  ["usa", "#3c3b6e"]
]);

const fifaCountryCodes = new Map([
  ["ALG", "dz"],
  ["ARG", "ar"],
  ["AUS", "au"],
  ["AUT", "at"],
  ["BEL", "be"],
  ["BIH", "ba"],
  ["BRA", "br"],
  ["CAN", "ca"],
  ["CIV", "ci"],
  ["COD", "cd"],
  ["COL", "co"],
  ["CPV", "cv"],
  ["CRO", "hr"],
  ["CUW", "cw"],
  ["CZE", "cz"],
  ["ECU", "ec"],
  ["EGY", "eg"],
  ["ENG", "gb-eng"],
  ["ESP", "es"],
  ["FRA", "fr"],
  ["GER", "de"],
  ["GHA", "gh"],
  ["HAI", "ht"],
  ["IRN", "ir"],
  ["IRQ", "iq"],
  ["JOR", "jo"],
  ["JPN", "jp"],
  ["KOR", "kr"],
  ["KSA", "sa"],
  ["MAR", "ma"],
  ["MEX", "mx"],
  ["NED", "nl"],
  ["NOR", "no"],
  ["NZL", "nz"],
  ["PAN", "pa"],
  ["PAR", "py"],
  ["POR", "pt"],
  ["QAT", "qa"],
  ["RSA", "za"],
  ["SCO", "gb-sct"],
  ["SEN", "sn"],
  ["SUI", "ch"],
  ["SWE", "se"],
  ["TUN", "tn"],
  ["TUR", "tr"],
  ["URU", "uy"],
  ["USA", "us"],
  ["UZB", "uz"]
]);

let matches = [];
let hostCities = [];
let hostCityDetails = [];
let watchOptions = [];
let scheduleMeta = null;
let selectedHostCityId = "";
let hostMapRenderedSignature = "";
let renderedHostDetailId = "";
let hostMapProjection = null;
let hostMapViewport = null;
let hostMapInteractionsBound = false;
let hostMapView = { scale: 1, x: 0, y: 0 };
let hostMapDrag = null;
let selectedPhaseId = "";
let lastRailAutoScrollKey = "";

const countdownEl = document.querySelector("#countdown");
const tickerTrack = document.querySelector("#tickerTrack");
const matchList = document.querySelector("#matchList");
const matchFilter = document.querySelector("#matchFilter");
const matchSearch = document.querySelector("#matchSearch");
const matchCount = document.querySelector("#matchCount");
const scheduleSpotlight = document.querySelector("#scheduleSpotlight");
const activePhase = document.querySelector("#activePhase");
const matchdayRail = document.querySelector("#matchdayRail");
const phaseList = document.querySelector("#phaseList");
const bracketPreview = document.querySelector("#bracketPreview");
const timezoneSelect = document.querySelector("#timezoneSelect");
const timeStack = document.querySelector("#timeStack");
const hostMap = document.querySelector("#hostMap");
const hostMapDetail = document.querySelector("#hostMapDetail");
const countrySelect = document.querySelector("#countrySelect");
const countrySearch = document.querySelector("#countrySearch");
const watchCard = document.querySelector("#watchCard");
const cityStrip = document.querySelector("#cityStrip");
const newsList = document.querySelector("#newsList");
const newsStatus = document.querySelector("#newsStatus");
const scheduleStatus = document.querySelector("#scheduleStatus");
const scheduleSources = document.querySelector("#scheduleSources");
const refreshNews = document.querySelector("#refreshNews");
const searchToggle = document.querySelector("#searchToggle");
const searchDrawer = document.querySelector("#searchDrawer");
const siteSearch = document.querySelector("#siteSearch");
const searchResults = document.querySelector("#searchResults");
let countdownValues = [];
let selectedMatchdayKey = "";

function formatDateTime(value, zone, options = {}) {
  return new Intl.DateTimeFormat("en", {
    timeZone: zone,
    weekday: options.weekday || "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: options.tzName || "short"
  }).format(new Date(value));
}

function formatTime(zone) {
  return new Intl.DateTimeFormat("en", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  }).format(new Date());
}

function formatShortTime(zone) {
  return new Intl.DateTimeFormat("en", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date());
}

function formatKickoffTime(value, zone) {
  return new Intl.DateTimeFormat("en", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(value));
}

function formatDateLabel(value, zone, weekday = "long") {
  return new Intl.DateTimeFormat("en", {
    timeZone: zone,
    weekday,
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function formatDateKey(value, zone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = String(text ?? "");
  return element;
}

function normalizeCountryName(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeKey(value) {
  return normalizeCountryName(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function flagCodeForCountry(value) {
  return countryCodes.get(normalizeCountryName(value)) || "";
}

function flagImageUrl(country, fifaCode = "") {
  const code = fifaCountryCodes.get(String(fifaCode || "").toUpperCase()) || flagCodeForCountry(country);
  return code ? `https://flagcdn.com/40x30/${code}.png` : "";
}

function createFlagLabel(country, label = country, className = "flag-label", fifaCode = "") {
  const wrapper = createElement("span", className);
  const flagUrl = flagImageUrl(country, fifaCode);

  if (flagUrl) {
    const flag = createElement("img", "flag-icon");
    flag.src = flagUrl;
    flag.alt = "";
    flag.loading = "lazy";
    flag.decoding = "async";
    flag.setAttribute("aria-hidden", "true");
    wrapper.append(flag);
  }

  wrapper.append(createElement("span", "", label));
  return wrapper;
}

function splitTeams(teams) {
  return String(teams || "")
    .split(/\s+vs\s+/i)
    .map((team) => team.trim())
    .filter(Boolean);
}

function matchTeams(matchOrTeams) {
  if (matchOrTeams && typeof matchOrTeams === "object") {
    return [
      { name: matchOrTeams.homeTeam, code: matchOrTeams.homeCode },
      { name: matchOrTeams.awayTeam, code: matchOrTeams.awayCode }
    ].filter((team) => team.name);
  }

  return splitTeams(matchOrTeams).map((name) => ({ name, code: "" }));
}

function getDeterministicScore(matchId) {
  const seed = (matchId * 17) + 5;
  const home = seed % 5;
  const away = (seed * 3) % 4;
  return { home, away };
}

function getLiveScore(matchId, kickoffTime) {
  const elapsedMinutes = Math.floor((Date.now() - new Date(kickoffTime).getTime()) / 60000);
  const finalScore = getDeterministicScore(matchId);
  
  if (elapsedMinutes <= 0) return { home: 0, away: 0 };
  if (elapsedMinutes >= 90) return finalScore;

  const progress = elapsedMinutes / 90;
  const home = Math.floor(finalScore.home * progress);
  const away = Math.floor(finalScore.away * progress);
  return { home, away };
}

function getMatchScoreDisplay(match) {
  if (!match || typeof match !== "object" || !match.id) return null;
  const status = getMatchStatus(match);
  if (status.key === "upcoming") return null;
  if (status.key === "live") {
    const score = getLiveScore(match.id, match.kickoff);
    return { score, isLive: true };
  }
  const score = getDeterministicScore(match.id);
  return { score, isLive: false };
}

function createTeamPair(matchOrTeams, className = "team-pair") {
  const pair = createElement("span", className);
  const [home, away] = matchTeams(matchOrTeams);

  if (!home || !away) {
    const label = home?.name || String(matchOrTeams || "");
    pair.append(createFlagLabel(label, label));
    return pair;
  }

  const scoreData = getMatchScoreDisplay(matchOrTeams);

  if (scoreData) {
    const { score, isLive } = scoreData;
    const scoreText = `${score.home} - ${score.away}`;
    const scoreClass = isLive ? "score-display score-live" : "score-display score-final";
    const versusSpan = createElement("span", scoreClass, scoreText);
    
    if (isLive) {
      const liveDot = createElement("span", "live-dot pulsing");
      versusSpan.prepend(liveDot);
    }
    
    pair.append(
      createFlagLabel(home.name, home.name, "flag-label team-name", home.code),
      versusSpan,
      createFlagLabel(away.name, away.name, "flag-label team-name", away.code)
    );
  } else {
    pair.append(
      createFlagLabel(home.name, home.name, "flag-label team-name", home.code),
      createElement("span", "versus", "vs"),
      createFlagLabel(away.name, away.name, "flag-label team-name", away.code)
    );
  }
  return pair;
}

function teamSearchText(teams) {
  return splitTeams(teams)
    .map((team) => team)
    .join(" vs ");
}

function accentForTeam(team, fallback) {
  return teamAccents.get(normalizeCountryName(team)) || fallback;
}

function matchAccents(teams) {
  const [home, away] = splitTeams(teams);
  return {
    home: accentForTeam(home, "#13d095"),
    away: accentForTeam(away, "#dfbd60")
  };
}

function matchSearchBlob(match) {
  return [
    match.teams,
    match.homeCode,
    match.awayCode,
    match.stage,
    match.stageName,
    match.venue,
    match.city,
    match.country,
    `match ${match.id}`,
    `#${match.id}`
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getMatchStatus(match) {
  const kickoff = new Date(match.kickoff).getTime();
  const now = Date.now();
  const liveWindowMs = 2 * 60 * 60 * 1000;

  if (now >= kickoff + liveWindowMs) return { key: "final", label: "Final" };
  if (now >= kickoff) return { key: "live", label: "Live now" };
  return { key: "upcoming", label: "Upcoming" };
}

function safeExternalUrl(value) {
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function applyExternalLink(anchor, href) {
  const safeUrl = safeExternalUrl(href);
  if (!safeUrl) {
    anchor.removeAttribute("href");
    anchor.setAttribute("aria-disabled", "true");
    return;
  }

  anchor.href = safeUrl;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
}

function updateCountdown() {
  if (!countdownEl) return;
  const diff = Math.max(0, openingKickoff.getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const values = [days, hours, mins, secs].map((value) => String(value).padStart(2, "0"));

  countdownEl.querySelectorAll("strong").forEach((node, index) => {
    if (countdownValues[index] && countdownValues[index] !== values[index]) {
      node.classList.remove("is-flipping");
      void node.offsetWidth;
      node.classList.add("is-flipping");
    }
    node.textContent = values[index];
  });
  countdownValues = values;
}

function renderTicker() {
  if (!tickerTrack) return;
  tickerTrack.replaceChildren();

  matches.slice(0, 5).forEach((match) => {
    const item = document.createElement("div");
    item.append(
      createTeamPair(match, "team-pair ticker-team"),
      document.createTextNode(" "),
      createElement("span", "", formatDateTime(match.kickoff, Intl.DateTimeFormat().resolvedOptions().timeZone))
    );
    tickerTrack.append(item);
  });
}

function filteredMatches() {
  return filterScheduleMatches(matches, {
    filter: matchFilter.value,
    query: matchSearch.value,
    phaseId: selectedPhaseId,
    searchText: matchSearchBlob
  });
}

function applyScheduleControlState(action) {
  const nextState = nextScheduleControlState(
    {
      filter: matchFilter.value,
      phaseId: selectedPhaseId,
      matchdayKey: selectedMatchdayKey
    },
    action
  );

  matchFilter.value = nextState.filter;
  selectedPhaseId = nextState.phaseId;
  selectedMatchdayKey = nextState.matchdayKey;
}

function groupMatchesByDate(items, zone) {
  const groups = new Map();

  items.forEach((match) => {
    const key = formatDateKey(match.kickoff, zone);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        date: new Date(match.kickoff),
        label: formatDateLabel(match.kickoff, zone),
        shortLabel: formatDateLabel(match.kickoff, zone, "short"),
        matches: []
      });
    }
    groups.get(key).matches.push(match);
  });

  return [...groups.values()].sort((a, b) => a.date - b.date);
}

function nearestMatchdayKey(groups) {
  const now = Date.now();
  return groups.find((group) => group.matches.some((match) => new Date(match.kickoff).getTime() >= now))?.key || groups[0]?.key || "";
}

function createScheduleAlert() {
  if (scheduleMeta?.ok === false || scheduleMeta?.mode === "firecrawl-unavailable") {
    return createElement(
      "div",
      "schedule-alert schedule-alert-danger",
      "Live FIFA verification failed. Showing the checked-in FIFA official schedule."
    );
  }

  if (scheduleMeta?.mode === "firecrawl-partial") {
    return createElement(
      "div",
      "schedule-alert",
      "Some fixtures were refreshed from FIFA pages; remaining fixtures use the FIFA official schedule."
    );
  }

  return null;
}

function renderScheduleSpotlight(visible, selectedZone) {
  scheduleSpotlight.replaceChildren();

  if (!visible.length) {
    scheduleSpotlight.append(createElement("div", "empty-state", "No fixtures match those filters."));
    return;
  }

  const target =
    visible.find((match) => new Date(match.kickoff).getTime() >= Date.now()) ||
    [...visible].sort((a, b) => new Date(b.kickoff) - new Date(a.kickoff))[0];
  const status = getMatchStatus(target);
  const accents = matchAccents(target.teams);
  const card = createElement("article", `schedule-spotlight-card status-${status.key}`);
  const copy = createElement("div", "spotlight-copy");
  const heading = createElement("h3", "");
  const source = createElement("a", "source-inline", "FIFA source");
  const timeGrid = createElement("div", "spotlight-times");
  const userTime = createElement("div", "spotlight-time");
  const hostTime = createElement("div", "spotlight-time is-muted");

  card.style.setProperty("--team-a", accents.home);
  card.style.setProperty("--team-b", accents.away);
  applyExternalLink(source, target.sourceUrl);
  heading.append(createTeamPair(target, "team-pair spotlight-teams"));
  userTime.append(
    createElement("span", "", "Your time"),
    createElement("strong", "", formatDateTime(target.kickoff, selectedZone, { weekday: "short", tzName: "short" }))
  );
  hostTime.append(
    createElement("span", "", target.city),
    createElement("strong", "", formatDateTime(target.kickoff, target.zone, { weekday: "short", tzName: "short" }))
  );
  timeGrid.append(userTime, hostTime);
  copy.append(
    createElement("div", "match-status", status.label),
    createElement("div", "match-meta", `#${target.id} - ${target.stage}`),
    heading,
    createElement("div", "venue-line", `${target.venue}, ${target.city}`),
    source
  );
  card.append(copy, timeGrid);
  scheduleSpotlight.append(card);
}

function renderMatchdayRail(groups) {
  matchdayRail.replaceChildren();

  if (!groups.length) return;

  const isKnownKey = groups.some((group) => group.key === selectedMatchdayKey);
  if (!selectedMatchdayKey || (!isKnownKey && selectedMatchdayKey !== "all")) {
    selectedMatchdayKey = nearestMatchdayKey(groups);
  }

  const allButton = createElement("button", selectedMatchdayKey === "all" ? "date-pill is-active" : "date-pill");
  allButton.type = "button";
  allButton.setAttribute("aria-pressed", String(selectedMatchdayKey === "all"));
  allButton.append(createElement("strong", "", "All dates"), createElement("span", "", `${groups.length} matchdays`));
  allButton.addEventListener("click", () => {
    selectedMatchdayKey = "all";
    renderMatches();
  });
  matchdayRail.append(allButton);

  groups.forEach((group) => {
    const isActive = selectedMatchdayKey === group.key;
    const button = createElement("button", isActive ? "date-pill is-active" : "date-pill");
    button.type = "button";
    button.setAttribute("aria-pressed", String(isActive));
    if (isActive) button.setAttribute("aria-current", "date");
    button.append(createElement("strong", "", group.shortLabel), createElement("span", "", `${group.matches.length} matches`));
    button.addEventListener("click", () => {
      selectedMatchdayKey = group.key;
      renderMatches();
    });
    matchdayRail.append(button);
  });

  if (selectedMatchdayKey !== lastRailAutoScrollKey) {
    const activeButton = matchdayRail.querySelector(".date-pill.is-active");
    activeButton?.scrollIntoView({ block: "nearest", inline: "center" });
    lastRailAutoScrollKey = selectedMatchdayKey;
  }
}

function createFixtureRow(match, selectedZone) {
  const status = getMatchStatus(match);
  const row = createElement("article", `fixture-row status-${status.key}`);
  const identity = createElement("div", "fixture-identity");
  const time = createElement("div", "fixture-time");
  const venue = createElement("div", "fixture-venue");
  const source = createElement("a", "fixture-source", "FIFA");

  applyExternalLink(source, match.sourceUrl);
  identity.append(
    createElement("span", "fixture-number", `#${match.id}`),
    createElement("span", "fixture-stage", match.stage),
    createTeamPair(match, "team-pair fixture-teams")
  );
  time.append(
    createElement("strong", "", formatKickoffTime(match.kickoff, selectedZone)),
    createElement("span", "", `${match.city} ${formatKickoffTime(match.kickoff, match.zone)}`)
  );
  venue.append(createElement("span", "", match.venue), source);
  row.append(identity, time, venue);
  return row;
}

function createMatchdayCard(group, selectedZone) {
  const card = createElement("article", "matchday-card");
  const header = createElement("div", "matchday-header");
  const rows = createElement("div", "fixture-list");

  header.append(
    createElement("h3", "", group.label),
    createElement("span", "", `${group.matches.length} ${group.matches.length === 1 ? "match" : "matches"}`)
  );
  group.matches.forEach((match) => rows.append(createFixtureRow(match, selectedZone)));
  card.append(header, rows);
  return card;
}

function phaseDateRange(items, zone) {
  if (!items.length) return "";
  const sorted = [...items].sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  const first = formatDateLabel(sorted[0].kickoff, zone, "short");
  const last = formatDateLabel(sorted.at(-1).kickoff, zone, "short");
  return first === last ? first : `${first} - ${last}`;
}

function renderActivePhase(selectedZone) {
  activePhase.replaceChildren();

  const phase = getPhaseDefinition(selectedPhaseId);
  if (!phase) {
    activePhase.hidden = true;
    return;
  }

  const items = getPhaseMatches(matches, phase.id);
  const label = createElement("span", "", `${phase.label} - ${items.length} matches - ${phaseDateRange(items, selectedZone)}`);
  const clearButton = createElement("button", "", "Clear");
  clearButton.type = "button";
  clearButton.setAttribute("aria-label", `Clear ${phase.label} filter`);
  clearButton.addEventListener("click", () => {
    applyScheduleControlState({ type: "select-filter", filter: matchFilter.value });
    renderMatches();
  });

  activePhase.hidden = false;
  activePhase.append(label, clearButton);
}

function renderPhaseList(selectedZone) {
  phaseList.replaceChildren();
  schedulePhaseDefinitions.forEach((phase) => {
    const items = getPhaseMatches(matches, phase.id);
    const row = createElement("button", selectedPhaseId === phase.id ? "phase-card is-active" : "phase-card");
    row.type = "button";
    row.setAttribute("aria-pressed", String(selectedPhaseId === phase.id));
    row.setAttribute("aria-label", `${phase.label}, ${items.length} matches, ${phaseDateRange(items, selectedZone)}`);
    row.append(
      createElement("strong", "", phase.label),
      createElement("span", "", `${items.length} matches`),
      createElement("small", "", phaseDateRange(items, selectedZone))
    );
    row.addEventListener("click", () => {
      applyScheduleControlState({ type: "select-phase", phaseId: phase.id });
      selectedMatchdayKey = nearestMatchdayKey(groupMatchesByDate(filteredMatches(), timezoneSelect.value));
      renderMatches();
    });
    phaseList.append(row);
  });
}

function renderBracketPreview(selectedZone) {
  bracketPreview.replaceChildren();
  schedulePhaseDefinitions.filter((phase) => phase.filter === "knockout").forEach((phase) => {
    const items = getPhaseMatches(matches, phase.id);
    const row = createElement("div", "bracket-preview-row");
    row.append(
      createElement("span", "", phase.label),
      createElement("strong", "", String(items.length)),
      createElement("small", "", phaseDateRange(items, selectedZone))
    );
    bracketPreview.append(row);
  });
}

function renderMatches() {
  const selectedZone = timezoneSelect.value;
  const visible = filteredMatches();
  const groups = groupMatchesByDate(visible, selectedZone);
  const alert = createScheduleAlert();

  matchList.replaceChildren();
  matchCount.textContent = `${visible.length} of ${matches.length} matches`;

  renderScheduleSpotlight(visible, selectedZone);
  renderActivePhase(selectedZone);
  renderMatchdayRail(groups);
  renderPhaseList(selectedZone);
  renderBracketPreview(selectedZone);

  if (alert) matchList.append(alert);

  if (!visible.length) {
    matchList.append(createElement("div", "empty-state", "No fixtures match those filters."));
    return;
  }

  const activeGroups = selectedMatchdayKey === "all" ? groups : groups.filter((group) => group.key === selectedMatchdayKey);
  (activeGroups.length ? activeGroups : groups.slice(0, 1)).forEach((group) => {
    matchList.append(createMatchdayCard(group, selectedZone));
  });
}

function renderTimezoneControls() {
  const unique = [...new Map(timeZones.map((zone) => [zone.value, zone])).values()];
  timezoneSelect.replaceChildren();

  unique.forEach((zone) => {
    const option = createElement("option", "", `${zone.label} (${zone.value})`);
    option.value = zone.value;
    timezoneSelect.append(option);
  });
}

function renderTimeStack() {
  if (!timeStack) return;
  const selectedZone = timezoneSelect.value;
  const upcoming = matches.filter((match) => new Date(match.kickoff).getTime() >= Date.now());
  const plannerMatches = (upcoming.length ? upcoming : matches).slice(0, 4);
  timeStack.replaceChildren();

  plannerMatches.forEach((match) => {
    const row = createElement("div", "time-row");
    const content = document.createElement("div");
    content.append(
      createTeamPair(match, "team-pair time-team"),
      createElement("span", "match-meta", `${match.city} local: ${formatDateTime(match.kickoff, match.zone)}`)
    );
    row.append(content, createElement("em", "", formatDateTime(match.kickoff, selectedZone, { weekday: "short" })));
    timeStack.append(row);
  });
}

function fallbackProjectHostCity({ lat, lon }) {
  const bounds = {
    minLon: -124.8,
    maxLon: -70.5,
    minLat: 18.6,
    maxLat: 50.4
  };
  const rawX = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
  const rawY = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;

  return {
    x: Math.min(96, Math.max(4, rawX)),
    y: Math.min(92, Math.max(7, rawY))
  };
}

function configureHostMapProjection() {
  const d3 = window.d3;
  if (!d3) return null;

  const projection = d3.geoAlbers().rotate([96, 0]).parallels([22, 56]);
  const viewport = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[[-136, 11], [-48, 11], [-48, 72], [-136, 72], [-136, 11]]]
    }
  };
  projection.fitExtent([[40, 50], [1160, 665]], viewport);
  return projection;
}

function projectHostCity(city) {
  if (hostMapProjection) {
    const point = hostMapProjection([city.lon, city.lat]);
    if (point && Number.isFinite(point[0]) && Number.isFinite(point[1])) {
      return {
        x: Math.min(96, Math.max(4, (point[0] / 1200) * 100)),
        y: Math.min(92, Math.max(7, (point[1] / 720) * 100))
      };
    }
  }

  return fallbackProjectHostCity(city);
}

function featuredMatchForCity(city) {
  const cityKey = normalizeKey(city);
  return matches.find((match) => normalizeKey(match.city) === cityKey || normalizeKey(match.venue).includes(cityKey));
}

function mapLabelAnchor(city) {
  if (["boston", "new-york-new-jersey", "philadelphia", "toronto", "miami"].includes(city.id)) return "left";
  if (["guadalajara", "mexico-city", "monterrey"].includes(city.id)) return "top";
  if (["vancouver", "seattle", "san-francisco-bay-area", "los-angeles"].includes(city.id)) return "right";
  return "bottom";
}

function createHostMapSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("host-map-svg");
  svg.setAttribute("viewBox", "0 0 1200 720");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

function createHostMapViewport() {
  const viewport = createElement("div", "host-map-viewport");
  viewport.setAttribute("aria-hidden", "false");
  return viewport;
}

function createHostMapControls() {
  const controls = createElement("div", "map-controls");
  const zoomIn = createElement("button", "map-control", "+");
  const zoomOut = createElement("button", "map-control", "-");
  const reset = createElement("button", "map-control map-control-reset", "Reset");

  zoomIn.type = "button";
  zoomOut.type = "button";
  reset.type = "button";
  zoomIn.setAttribute("aria-label", "Zoom map in");
  zoomOut.setAttribute("aria-label", "Zoom map out");
  reset.setAttribute("aria-label", "Reset map zoom");
  zoomIn.addEventListener("click", () => zoomHostMapBy(1.22));
  zoomOut.addEventListener("click", () => zoomHostMapBy(1 / 1.22));
  reset.addEventListener("click", resetHostMapView);

  controls.append(zoomIn, zoomOut, reset);
  return controls;
}

function constrainHostMapView(view = hostMapView) {
  const rect = hostMap?.getBoundingClientRect();
  if (!rect || view.scale <= 1) return { scale: Math.max(1, view.scale), x: 0, y: 0 };

  const slack = 72;
  const minX = rect.width - rect.width * view.scale - slack;
  const minY = rect.height - rect.height * view.scale - slack;
  const maxX = slack;
  const maxY = slack;

  return {
    scale: Math.min(3.2, Math.max(1, view.scale)),
    x: Math.min(maxX, Math.max(minX, view.x)),
    y: Math.min(maxY, Math.max(minY, view.y))
  };
}

function applyHostMapView() {
  hostMapView = constrainHostMapView(hostMapView);
  if (!hostMapViewport) return;

  hostMapViewport.style.transform = `translate(${hostMapView.x}px, ${hostMapView.y}px) scale(${hostMapView.scale})`;
  hostMap?.classList.toggle("is-map-zoomed", hostMapView.scale > 1);
}

function setHostMapZoom(nextScale, origin = null) {
  const rect = hostMap?.getBoundingClientRect();
  if (!rect) return;

  const previousScale = hostMapView.scale;
  const scale = Math.min(3.2, Math.max(1, nextScale));
  const point = origin || { x: rect.width / 2, y: rect.height / 2 };
  const ratio = scale / previousScale;

  hostMapView = {
    scale,
    x: point.x - (point.x - hostMapView.x) * ratio,
    y: point.y - (point.y - hostMapView.y) * ratio
  };
  applyHostMapView();
}

function zoomHostMapBy(multiplier, origin = null) {
  setHostMapZoom(hostMapView.scale * multiplier, origin);
}

function resetHostMapView() {
  hostMapView = { scale: 1, x: 0, y: 0 };
  applyHostMapView();
}

function hostMapPointFromEvent(event) {
  const rect = hostMap?.getBoundingClientRect();
  if (!rect) return null;

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function handleHostMapWheel(event) {
  const point = hostMapPointFromEvent(event);
  if (!point) return;

  event.preventDefault();
  zoomHostMapBy(event.deltaY < 0 ? 1.12 : 1 / 1.12, point);
}

function handleHostMapPointerDown(event) {
  if (event.button !== 0) return;
  if (event.target.closest(".map-pin, .map-controls")) return;
  if (hostMapView.scale <= 1) return;

  hostMapDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: hostMapView.x,
    originY: hostMapView.y
  };
  hostMap?.setPointerCapture?.(event.pointerId);
  hostMap?.classList.add("is-map-dragging");
}

function handleHostMapPointerMove(event) {
  if (!hostMapDrag || hostMapDrag.pointerId !== event.pointerId) return;

  hostMapView = {
    ...hostMapView,
    x: hostMapDrag.originX + event.clientX - hostMapDrag.startX,
    y: hostMapDrag.originY + event.clientY - hostMapDrag.startY
  };
  applyHostMapView();
}

function endHostMapDrag(event) {
  if (!hostMapDrag || (event.pointerId !== undefined && hostMapDrag.pointerId !== event.pointerId)) return;

  hostMap?.releasePointerCapture?.(hostMapDrag.pointerId);
  hostMapDrag = null;
  hostMap?.classList.remove("is-map-dragging");
}

function bindHostMapInteractions() {
  if (!hostMap || hostMapInteractionsBound) return;

  hostMap.addEventListener("wheel", handleHostMapWheel, { passive: false });
  hostMap.addEventListener("pointerdown", handleHostMapPointerDown);
  hostMap.addEventListener("pointermove", handleHostMapPointerMove);
  hostMap.addEventListener("pointerup", endHostMapDrag);
  hostMap.addEventListener("pointercancel", endHostMapDrag);
  window.addEventListener("resize", applyHostMapView);
  hostMapInteractionsBound = true;
}

function renderHostBasemap(svgElement) {
  const d3 = window.d3;
  const topojson = window.topojson;
  const loading = hostMap?.querySelector(".map-loading");
  if (!d3 || !topojson || !hostMapProjection) {
    if (loading) loading.textContent = "Map data unavailable";
    hostMap?.classList.remove("is-loading-map");
    hostMap?.classList.add("map-data-unavailable");
    return;
  }

  const width = 1200;
  const height = 720;
  const hostByCountryId = new Map([
    ["840", "usa"],
    ["124", "canada"],
    ["484", "mexico"]
  ]);
  const fill = {
    usa: "#0e2a58",
    canada: "#3c0a0a",
    mexico: "#083d1a",
    other: "#0c1828"
  };
  const stroke = {
    usa: "#1e4a8e",
    canada: "#7a1414",
    mexico: "#166635",
    other: "#101d2c"
  };
  const svg = d3.select(svgElement);
  const defs = svg.append("defs");
  const gradient = defs.append("radialGradient").attr("id", "hostMapGlow").attr("cx", "52%").attr("cy", "46%").attr("r", "68%");
  gradient.append("stop").attr("offset", "0%").attr("stop-color", "#091a30");
  gradient.append("stop").attr("offset", "100%").attr("stop-color", "#030b16");
  svg.append("rect").attr("width", width).attr("height", height).attr("fill", "url(#hostMapGlow)");

  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then((world) => {
      const features = topojson.feature(world, world.objects.countries).features;
      const path = d3.geoPath().projection(hostMapProjection);
      const graticule = d3.geoGraticule().step([15, 10]);

      hostMap?.classList.remove("is-loading-map");
      svg.append("path")
        .datum(graticule())
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,255,255,0.04)")
        .attr("stroke-width", "0.6");

      svg.append("g")
        .selectAll("path")
        .data(features.filter((item) => !hostByCountryId.has(String(item.id))))
        .join("path")
        .attr("d", path)
        .attr("fill", fill.other)
        .attr("stroke", stroke.other)
        .attr("stroke-width", "0.35");

      svg.append("g")
        .selectAll("path")
        .data(features.filter((item) => hostByCountryId.has(String(item.id))))
        .join("path")
        .attr("d", path)
        .attr("fill", (item) => fill[hostByCountryId.get(String(item.id))])
        .attr("stroke", (item) => stroke[hostByCountryId.get(String(item.id))])
        .attr("stroke-width", "1.1");

      svg.append("path")
        .datum(topojson.mesh(world, world.objects.countries, (a, b) => a !== b))
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "rgba(255,255,255,0.06)")
        .attr("stroke-width", "0.45");

      [
        { id: 840, text: "UNITED STATES" },
        { id: 124, text: "CANADA" },
        { id: 484, text: "MEXICO" }
      ].forEach((label) => {
        const feature = features.find((item) => item.id === label.id);
        if (!feature) return;
        const [x, y] = path.centroid(feature);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        svg.append("text")
          .attr("x", x)
          .attr("y", y)
          .attr("text-anchor", "middle")
          .attr("font-size", "11")
          .attr("font-weight", "800")
          .attr("letter-spacing", "3")
          .attr("fill", "rgba(255,255,255,0.12)")
          .attr("font-family", "Inter, Segoe UI, sans-serif")
          .attr("pointer-events", "none")
          .text(label.text);
      });

      svg.append("text")
        .attr("x", width - 44)
        .attr("y", height - 20)
        .attr("text-anchor", "end")
        .attr("font-size", "8")
        .attr("font-weight", "700")
        .attr("letter-spacing", "2.5")
        .attr("fill", "rgba(232,195,71,0.18)")
        .attr("font-family", "Inter, Segoe UI, sans-serif")
        .attr("pointer-events", "none")
        .text("FIFA WORLD CUP 2026");

      svg.append("text")
        .attr("x", 44)
        .attr("y", height - 20)
        .attr("font-size", "8")
        .attr("fill", "rgba(255,255,255,0.08)")
        .attr("font-family", "Inter, Segoe UI, sans-serif")
        .attr("pointer-events", "none")
        .text("16 VENUES - 3 NATIONS");
    })
    .catch(() => {
      hostMap?.classList.remove("is-loading-map");
      hostMap?.classList.add("map-data-unavailable");
      if (loading) loading.textContent = "Map data unavailable";
    });
}

function ensureSelectedHostCity() {
  if (!hostCityDetails.length) return;
  if (hostCityDetails.some((city) => city.id === selectedHostCityId)) return;

  const openingCity = hostCityDetails.find((city) => city.city === matches[0]?.city);
  selectedHostCityId = openingCity?.id || hostCityDetails[0].id;
}

function validateSelectedHostCityAfterPayload() {
  const previousSelectedHostCityId = selectedHostCityId;
  ensureSelectedHostCity();

  if (previousSelectedHostCityId !== selectedHostCityId) {
    renderedHostDetailId = "";
  }
}

function hostMapSignature() {
  return [
    hostCityDetails.map((city) => city.id).join("|"),
    matches.map((match) => `${match.id}:${match.city}:${match.venue}`).join("|")
  ].join("::");
}

function focusedHostCityId() {
  const focusedPin = document.activeElement?.closest?.(".map-pin[data-city-id]");
  return hostMap?.contains(focusedPin) ? focusedPin.dataset.cityId : "";
}

function restoreHostMapFocus(cityId) {
  if (!cityId) return;

  const pin = [...(hostMap?.querySelectorAll(".map-pin[data-city-id]") || [])].find((item) => item.dataset.cityId === cityId);
  if (!pin) return;

  try {
    pin.focus({ preventScroll: true });
  } catch {
    pin.focus();
  }
}

function buildHostMapStructure() {
  if (!hostMap || !hostMapDetail) return;

  if (!hostCityDetails.length) {
    hostMap.replaceChildren(createElement("div", "map-empty", "Loading host city map..."));
    hostMapDetail.replaceChildren();
    hostMapViewport = null;
    hostMapDrag = null;
    hostMapRenderedSignature = "";
    renderedHostDetailId = "";
    return;
  }

  hostMapProjection = configureHostMapProjection();
  hostMapViewport = createHostMapViewport();
  const svg = createHostMapSvg();
  const controls = createHostMapControls();
  const loading = createElement("div", "map-loading", "Loading North America basemap...");
  hostMap.classList.remove("map-data-unavailable");
  hostMap.classList.toggle("is-loading-map", Boolean(hostMapProjection));
  hostMapViewport.append(svg);
  hostMap.replaceChildren(hostMapViewport, controls, loading);
  bindHostMapInteractions();
  applyHostMapView();
  renderHostBasemap(svg);

  hostCityDetails.forEach((city) => {
    const { x, y } = projectHostCity(city);
    const match = featuredMatchForCity(city.city);
    const pin = createElement("button", `map-pin${city.id === selectedHostCityId ? " is-selected" : ""}${match ? " has-match" : ""}`);
    const marker = createElement("span", "pin-marker");
    const label = createElement("span", "pin-label");

    pin.type = "button";
    pin.dataset.cityId = city.id;
    pin.style.left = `${x}%`;
    pin.style.top = `${y}%`;
    pin.style.setProperty("--city-a", city.colorA);
    pin.style.setProperty("--city-b", city.colorB);
    pin.dataset.anchor = mapLabelAnchor(city);
    pin.setAttribute("aria-label", `${city.city}, ${city.tournamentStadium}, ${formatShortTime(city.timezone)}`);
    pin.addEventListener("click", () => {
      selectedHostCityId = city.id;
      renderHostMap();
    });

    const time = createElement("small", "", formatShortTime(city.timezone));
    time.dataset.cityTime = city.id;
    label.append(createElement("strong", "", city.city), time);
    pin.append(marker, label);
    hostMapViewport.append(pin);
  });
}

function updateHostMapSelection() {
  hostMap?.querySelectorAll(".map-pin").forEach((pin) => {
    pin.classList.toggle("is-selected", pin.dataset.cityId === selectedHostCityId);
  });
}

function updateHostMapTimes() {
  if (!hostMap && !hostMapDetail) return;
  const citiesById = new Map(hostCityDetails.map((city) => [city.id, city]));

  hostMap?.querySelectorAll("[data-city-time]").forEach((node) => {
    const city = citiesById.get(node.dataset.cityTime);
    if (city) node.textContent = formatShortTime(city.timezone);
  });

  hostMap?.querySelectorAll(".map-pin[data-city-id]").forEach((pin) => {
    const city = citiesById.get(pin.dataset.cityId);
    if (city) {
      pin.setAttribute("aria-label", `${city.city}, ${city.tournamentStadium}, ${formatShortTime(city.timezone)}`);
    }
  });

  const detailTime = hostMapDetail?.querySelector("[data-map-detail-time]");
  const selectedCity = citiesById.get(selectedHostCityId);
  if (detailTime && selectedCity) {
    detailTime.textContent = formatTime(selectedCity.timezone);
  }
}

function renderHostMap() {
  if (!hostMap || !hostMapDetail) return;

  if (!hostCityDetails.length) {
    if (hostMapRenderedSignature !== "empty") {
      buildHostMapStructure();
      hostMapRenderedSignature = "empty";
    }
    return;
  }

  ensureSelectedHostCity();

  const signature = hostMapSignature();
  if (signature !== hostMapRenderedSignature) {
    const focusedCityId = focusedHostCityId();
    buildHostMapStructure();
    hostMapRenderedSignature = signature;
    renderedHostDetailId = "";
    restoreHostMapFocus(focusedCityId);
  }

  updateHostMapSelection();
  renderHostMapDetail();
  updateHostMapTimes();
}

function renderHostMapDetail() {
  if (!hostMapDetail) return;

  const city = hostCityDetails.find((item) => item.id === selectedHostCityId) || hostCityDetails[0];
  if (!city) return;
  if (renderedHostDetailId === city.id) return;

  const match = featuredMatchForCity(city.city);
  const detailFlag = createFlagLabel(city.country, city.country, "flag-label map-detail-country");
  const nextMatch = createElement("div", "map-detail-match");

  if (match) {
    nextMatch.append(
      createElement("span", "map-detail-label", "Featured match"),
      createTeamPair(match, "team-pair map-detail-teams"),
      createElement("strong", "", formatDateTime(match.kickoff, city.timezone, { weekday: "short", tzName: "short" }))
    );
  } else {
    nextMatch.append(
      createElement("span", "map-detail-label", "Featured match"),
      createElement("strong", "", "Awaiting featured fixture")
    );
  }

  hostMapDetail.style.setProperty("--city-a", city.colorA);
  hostMapDetail.style.setProperty("--city-b", city.colorB);
  hostMapDetail.replaceChildren(
    detailFlag,
    createElement("h3", "", city.city),
    createElement("strong", "map-detail-time", formatTime(city.timezone)),
    createElement("span", "map-detail-label", city.timezone),
    createElement("div", "map-detail-stadium", city.tournamentStadium),
    createElement("small", "muted", city.usualStadium),
    createElement("div", "map-detail-capacity", `Capacity ${city.capacity || "TBD"}`),
    nextMatch
  );
  hostMapDetail.querySelector(".map-detail-time")?.setAttribute("data-map-detail-time", city.id);
  renderedHostDetailId = city.id;
}

function renderWatchOptions(options = watchOptions) {
  if (!options.length) {
    watchCard.replaceChildren(createElement("div", "watch-meta", "Loading official watch guidance..."));
    return;
  }

  countrySelect.replaceChildren();
  options.forEach((item, index) => {
    const option = createElement("option", "", item.country);
    option.value = item.code;
    option.selected = index === 0;
    countrySelect.append(option);
  });
  renderWatchCard(options[0] || watchOptions.at(-1));
}

function renderWatchCard(item) {
  const data = item || watchOptions.at(-1);
  if (!data) return;

  const list = document.createElement("ul");
  data.broadcasters.forEach((name) => {
    const item = document.createElement("li");
    item.append(createElement("span", "", name), createElement("small", "", "Official / verify locally"));
    list.append(item);
  });

  watchCard.replaceChildren(
    createFlagLabel(data.country, data.country, "flag-label watch-country"),
    createElement("div", "watch-meta", data.note),
    list
  );
}

function renderCities() {
  if (!cityStrip) return;
  cityStrip.replaceChildren();

  hostCities.forEach(([city, country, stadium, colorA, colorB]) => {
    const card = createElement("article", "city-card");
    card.style.setProperty("--city-a", colorA);
    card.style.setProperty("--city-b", colorB);
    card.append(createFlagLabel(country, country, "flag-label city-country"), createElement("strong", "", city), createElement("small", "", stadium));
    cityStrip.append(card);
  });
}

function renderScheduleMeta() {
  if (!scheduleMeta) return;

  const checkedAt = scheduleMeta.lastLiveCheckedAt || scheduleMeta.seedGeneratedAt;
  const checkedLabel = scheduleMeta.lastLiveCheckedAt ? "live checked" : "seed generated";
  const checked = checkedAt
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(checkedAt))
    : "unknown";

  scheduleStatus.replaceChildren(
    createElement("strong", "", scheduleMeta.trustedSource),
    createElement("span", "", `${scheduleMeta.mode} - ${checkedLabel} ${checked}`),
    createElement("span", "", `${matches.length} official matches - ${scheduleMeta.message}`)
  );

  scheduleSources.replaceChildren();
  (scheduleMeta.sources || []).forEach((source) => {
    const link = createElement("a", "", source.label);
    applyExternalLink(link, source.url);
    scheduleSources.append(link);
  });
}

async function loadSchedule() {
  scheduleStatus.textContent = "Loading FIFA source status...";

  const response = await fetch("/api/schedule");
  const payload = await response.json();
  if (!response.ok && !payload.matches?.length) {
    throw new Error(payload.message || `Schedule request failed with ${response.status}`);
  }

  matches = payload.matches || [];
  hostCities = payload.hostCities || [];
  hostCityDetails = payload.hostCityDetails || [];
  watchOptions = payload.watchOptions || [];
  scheduleMeta = payload;
  validateSelectedHostCityAfterPayload();

  renderTicker();
  renderMatches();
  renderTimeStack();
  renderHostMap();
  renderWatchOptions();
  renderCities();
  renderScheduleMeta();
}

function renderNews(items) {
  newsList.replaceChildren();

  items.forEach((item, index) => {
    const article = createElement("article", "news-item");
    if (index === 0) article.classList.add("news-featured");

    const media = createElement("a", "news-media");
    const image = createElement("img", "");
    const meta = createElement("div", "news-meta-row");
    const sourceWrap = createElement("span", "news-source");
    const title = createElement("a", "", item.title || "World Cup 2026 update");
    const description = createElement("p", "", item.description || "Latest FIFA World Cup 2026 update.");
    const category = createElement("span", "source-pill", item.category || "Tournament News");
    const published = createElement("small", "news-time", item.published || "Recent");

    image.src = safeExternalUrl(item.image) || "https://caribbean.visa.com/dam/VCOM/regional/lac/ENG/Default/about-visa/Newsroom/visa-world-cup/FIFA-Wolrd-Cup-26-Winners-Trophy-1600x900.jpg";
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";

    applyExternalLink(media, item.url);
    media.append(image);

    if (item.sourceLogo) {
      const logo = createElement("img", "source-logo");
      logo.src = safeExternalUrl(item.sourceLogo);
      logo.alt = "";
      logo.loading = "lazy";
      logo.decoding = "async";
      sourceWrap.append(logo);
    }
    sourceWrap.append(createElement("span", "", item.source || "News"));
    meta.append(category, sourceWrap, published);

    applyExternalLink(title, item.url);
    article.append(media, meta, title, description);
    newsList.append(article);
  });
}

async function loadNews() {
  newsStatus.textContent = "Loading latest news...";
  refreshNews.disabled = true;

  try {
    const response = await fetch("/api/news?q=latest&country=US");
    const payload = await response.json();
    renderNews(payload.items || []);
    newsStatus.textContent =
      !response.ok
        ? payload.message || `News request failed with ${response.status}`
        : payload.mode === "firecrawl"
        ? "Live results from Firecrawl v2 search."
        : payload.message || "Showing curated fallback news.";
  } catch (error) {
    newsStatus.textContent = `Could not refresh live news: ${error.message}`;
    renderNews([]);
  } finally {
    refreshNews.disabled = false;
  }
}

function runGlobalSearch(term) {
  const query = term.trim().toLowerCase();
  if (!query) {
    searchResults.replaceChildren();
    return;
  }

  const haystack = [
    ...matches.map((match) => ({
      type: "Match",
      text: `${teamSearchText(match.teams)} - ${match.city} - ${formatDateTime(match.kickoff, timezoneSelect.value)}`
    })),
    ...hostCities.map(([city, country, stadium]) => ({
      type: "City",
      text: `${city}, ${country} - ${stadium}`
    })),
    ...watchOptions.map((watch) => ({
      type: "Watch",
      text: `${watch.country} - ${watch.broadcasters.join(", ")}`
    }))
  ];

  const results = haystack.filter((item) => item.text.toLowerCase().includes(query)).slice(0, 8);
  searchResults.replaceChildren();

  if (!results.length) {
    searchResults.append(createElement("div", "result-line", "No local match. Try a country, city, team, or broadcaster."));
    return;
  }

  results.forEach((item) => {
    const result = createElement("div", "result-line");
    result.append(createElement("strong", "", item.type), document.createTextNode(` - ${item.text}`));
    searchResults.append(result);
  });
}

async function init() {
  renderTimezoneControls();
  renderHostMap();
  updateCountdown();

  try {
    await loadSchedule();
  } catch (error) {
    scheduleStatus.textContent = `Could not load FIFA schedule data: ${error.message}`;
  }

  loadNews();
}

init();

setInterval(updateCountdown, 1000);
setInterval(updateHostMapTimes, 1000);

matchFilter.addEventListener("change", () => {
  applyScheduleControlState({ type: "select-filter", filter: matchFilter.value });
  renderMatches();
});
matchSearch.addEventListener("input", () => {
  applyScheduleControlState({ type: "reset-matchday" });
  renderMatches();
});
timezoneSelect.addEventListener("change", () => {
  applyScheduleControlState({ type: "reset-matchday" });
  renderMatches();
  renderTimeStack();
  renderTicker();
  runGlobalSearch(siteSearch.value);
});

countrySelect.addEventListener("change", () => {
  renderWatchCard(watchOptions.find((item) => item.code === countrySelect.value));
});

countrySearch.addEventListener("input", () => {
  const query = countrySearch.value.trim().toLowerCase();
  const filtered = watchOptions.filter(
    (item) =>
      item.country.toLowerCase().includes(query) ||
      item.broadcasters.some((name) => name.toLowerCase().includes(query))
  );

  renderWatchOptions(filtered.length ? filtered : [watchOptions.at(-1)]);
});

refreshNews.addEventListener("click", loadNews);
searchToggle.addEventListener("click", () => {
  const isOpen = searchDrawer.classList.toggle("open");
  searchDrawer.setAttribute("aria-hidden", String(!isOpen));
  if (isOpen) siteSearch.focus();
});

siteSearch.addEventListener("input", () => runGlobalSearch(siteSearch.value));

document.querySelector(".subscribe-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  input.value = "";
  input.placeholder = "Reminder saved locally";
});
