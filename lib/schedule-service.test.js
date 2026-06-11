import test from "node:test";
import assert from "node:assert/strict";
import { officialMatches } from "../data/worldcup-data.js";
import { extractFifaMatch } from "./schedule-service.js";

test("official schedule contains the full 104-match FIFA schedule", () => {
  assert.equal(officialMatches.length, 104);
  assert.equal(officialMatches[0].teams, "Mexico vs South Africa");
  assert.equal(officialMatches.at(-1).id, 104);
  assert.equal(officialMatches.at(-1).stage, "Final");
  assert.equal(officialMatches.at(-1).venue, "New York/New Jersey Stadium");
});

test("extractFifaMatch parses FIFA match markdown into display data", () => {
  const markdown = `# USA v Paraguay: Live stream, team news, tickets and more

Published
    27 Jan 2026

The FIFA World Cup 2026 continues on 12 June as co-hosts USA welcome Paraguay to Los Angeles Stadium for their Group D showdown.

## USA v Paraguay

## Group D

Friday, 12 June | Los Angeles Stadium

## Kick-off time

18:00 (Los Angeles) | 22:00 (Asuncion)
`;

  const parsed = extractFifaMatch(markdown, officialMatches.find((match) => match.id === 4));

  assert.equal(parsed.parseStatus, "parsed");
  assert.equal(parsed.match.teams, "USA vs Paraguay");
  assert.equal(parsed.match.stage, "Group D");
  assert.equal(parsed.match.venue, "Los Angeles Stadium");
  assert.equal(parsed.match.city, "Los Angeles");
  assert.equal(parsed.match.localKickoff, "Friday, 12 June 2026, 18:00");
  assert.equal(parsed.match.kickoff, "2026-06-13T01:00:00.000Z");
  assert.equal(parsed.match.parsedFromFirecrawl, true);
});

test("extractFifaMatch keeps seed data when required FIFA fields are missing", () => {
  const seed = officialMatches[0];
  const parsed = extractFifaMatch("# Mexico v South Africa: Live stream", seed);

  assert.equal(parsed.parseStatus, "insufficient-data");
  assert.equal(parsed.match, seed);
});

test("extractFifaMatch handles Mexico City pages without a title colon", () => {
  const seed = officialMatches.find((match) => match.id === 1);
  const markdown = `# Mexico v South Africa

## Group A

Thursday, 11 June | Mexico City Stadium

## Kick-off time

13:00 (Mexico City) | 21:00 (Johannesburg)
`;

  const parsed = extractFifaMatch(markdown, seed);

  assert.equal(parsed.parseStatus, "parsed");
  assert.equal(parsed.match.teams, "Mexico vs South Africa");
  assert.equal(parsed.match.city, "Mexico City");
  assert.equal(parsed.match.localKickoff, "Thursday, 11 June 2026, 13:00");
  assert.equal(parsed.match.kickoff, "2026-06-11T19:00:00.000Z");
});

test("extractFifaMatch handles Toronto pages with alternate heading levels and Kickoff spelling", () => {
  const seed = officialMatches.find((match) => match.id === 3);
  const markdown = `# Canada v Bosnia and Herzegovina: tickets and more

### Group B

### Friday, 12 June | Toronto Stadium

### Kickoff time

15:00 (Toronto) | 21:00 (Sarajevo)
`;

  const parsed = extractFifaMatch(markdown, seed);

  assert.equal(parsed.parseStatus, "parsed");
  assert.equal(parsed.match.teams, "Canada vs Bosnia and Herzegovina");
  assert.equal(parsed.match.stage, "Group B");
  assert.equal(parsed.match.venue, "Toronto Stadium");
  assert.equal(parsed.match.city, "Toronto");
  assert.equal(parsed.match.kickoff, "2026-06-12T19:00:00.000Z");
});

test("extractFifaMatch keeps seed data when only some FIFA fields are present", () => {
  const seed = officialMatches.find((match) => match.id === 3);
  const markdown = `# Canada v Bosnia and Herzegovina

### Group B

Friday, 12 June | Toronto Stadium
`;

  const parsed = extractFifaMatch(markdown, seed);

  assert.equal(parsed.parseStatus, "insufficient-data");
  assert.equal(parsed.match, seed);
});

test("extractFifaMatch rejects parsed kickoff city that cannot be mapped to the seed timezone", () => {
  const seed = officialMatches.find((match) => match.id === 3);
  const markdown = `# Canada v Bosnia and Herzegovina

### Group B

Friday, 12 June | Toronto Stadium

### Kickoff time

15:00 (Unknown City)
`;

  const parsed = extractFifaMatch(markdown, seed);

  assert.equal(parsed.parseStatus, "insufficient-data");
  assert.equal(parsed.match, seed);
  assert.deepEqual(parsed.missing, ["zone", "kickoff"]);
});
