import test from "node:test";
import assert from "node:assert/strict";
import { officialMatches } from "../data/worldcup-data.js";
import {
  filterScheduleMatches,
  getPhaseMatches,
  nextScheduleControlState,
  schedulePhaseDefinitions
} from "../public/schedule-ui.js";

test("schedule phase definitions match exact official stage counts", () => {
  const counts = Object.fromEntries(
    schedulePhaseDefinitions.map((phase) => [phase.id, getPhaseMatches(officialMatches, phase.id).length])
  );

  assert.deepEqual(counts, {
    group: 72,
    "round-of-32": 16,
    "round-of-16": 8,
    "quarter-finals": 4,
    "semi-finals": 2,
    finals: 2
  });
});

test("finals phase includes only third-place play-off and final", () => {
  const finals = getPhaseMatches(officialMatches, "finals");

  assert.deepEqual(
    finals.map((match) => match.stageName),
    ["Play-off for third place", "Final"]
  );
});

test("selected knockout phase filters to that phase instead of all knockout matches", () => {
  const allKnockout = filterScheduleMatches(officialMatches, { filter: "knockout" });
  const quarterFinals = filterScheduleMatches(officialMatches, { filter: "knockout", phaseId: "quarter-finals" });

  assert.equal(allKnockout.length, 32);
  assert.equal(quarterFinals.length, 4);
  assert(quarterFinals.every((match) => match.stageName === "Quarter-final"));
});

test("invalid non-empty phase id does not broaden filtered results", () => {
  const visible = filterScheduleMatches(officialMatches, { filter: "knockout", phaseId: "typo-phase" });

  assert.deepEqual(visible, []);
});

test("schedule control state selects phases and clears them on main filter changes", () => {
  const initial = { filter: "all", phaseId: "", matchdayKey: "2026-07-09" };
  const phaseSelected = nextScheduleControlState(initial, { type: "select-phase", phaseId: "quarter-finals" });
  const filterSelected = nextScheduleControlState(phaseSelected, { type: "select-filter", filter: "knockout" });

  assert.deepEqual(phaseSelected, {
    filter: "knockout",
    phaseId: "quarter-finals",
    matchdayKey: ""
  });
  assert.deepEqual(filterSelected, {
    filter: "knockout",
    phaseId: "",
    matchdayKey: ""
  });
});
