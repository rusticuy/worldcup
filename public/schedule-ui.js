export const schedulePhaseDefinitions = [
  { id: "group", label: "Group stage", filter: "group", stageNames: ["First Stage"] },
  { id: "round-of-32", label: "Round of 32", filter: "knockout", stageNames: ["Round of 32"] },
  { id: "round-of-16", label: "Round of 16", filter: "knockout", stageNames: ["Round of 16"] },
  { id: "quarter-finals", label: "Quarter-finals", filter: "knockout", stageNames: ["Quarter-final"] },
  { id: "semi-finals", label: "Semi-finals", filter: "knockout", stageNames: ["Semi-final"] },
  { id: "finals", label: "Finals", filter: "knockout", stageNames: ["Play-off for third place", "Final"] }
];

export function stageNameOf(match) {
  return match.stageName || match.stage || "";
}

export function getPhaseDefinition(phaseId) {
  return schedulePhaseDefinitions.find((phase) => phase.id === phaseId) || null;
}

export function getPhaseMatches(matches, phaseId) {
  const phase = getPhaseDefinition(phaseId);
  if (!phase) return [];
  return matches.filter((match) => phase.stageNames.includes(stageNameOf(match)));
}

export function filterScheduleMatches(matches, { filter = "all", query = "", phaseId = "", searchText }) {
  const normalizedQuery = query.trim().toLowerCase();
  const phase = getPhaseDefinition(phaseId);
  const getSearchText = searchText || ((match) => Object.values(match).filter(Boolean).join(" ").toLowerCase());

  if (phaseId && !phase) return [];

  return matches.filter((match) => {
    const matchesFilter = filter === "all" || match.tags?.includes(filter);
    const matchesPhase = !phase || phase.stageNames.includes(stageNameOf(match));
    const matchesQuery = !normalizedQuery || getSearchText(match).includes(normalizedQuery);
    return matchesFilter && matchesPhase && matchesQuery;
  });
}

export function nextScheduleControlState(state, action) {
  if (action.type === "select-phase") {
    const phase = getPhaseDefinition(action.phaseId);
    return {
      ...state,
      filter: phase?.filter || state.filter,
      phaseId: phase?.id || "",
      matchdayKey: ""
    };
  }

  if (action.type === "select-filter") {
    return {
      ...state,
      filter: action.filter || "all",
      phaseId: "",
      matchdayKey: ""
    };
  }

  if (action.type === "reset-matchday") {
    return {
      ...state,
      matchdayKey: ""
    };
  }

  return state;
}
