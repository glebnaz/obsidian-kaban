import { SourceType, parseRawLines, splitCommaSeparated } from "./config";

export interface TimelineConfig {
  query: string;
  sourceType: SourceType;
  groupBy: string;
  startDateField: string;
  endDateField: string;
  sortBy?: string;
  filterTags?: string[];
  doneColumns: string[];
  activeColumns: string[];
  hideNoDates: boolean;
  createdField?: string;
  completedField?: string;
  hideFields?: string[];
  showFields?: string[];
}

export interface TimelineParseResult {
  ok: true;
  config: TimelineConfig;
}

export interface TimelineParseError {
  ok: false;
  errors: string[];
}

export type TimelineParseOutcome = TimelineParseResult | TimelineParseError;

const REQUIRED_FIELDS = ["query", "group-by", "start-date-field", "end-date-field"] as const;

export function parseTimelineConfig(source: string): TimelineParseOutcome {
  const raw = parseRawLines(source);

  const errors: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!raw[field]) {
      errors.push(`Missing required field: "${field}"`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const sourceType = (raw["source-type"] as SourceType) || "pages";
  if (sourceType !== "pages" && sourceType !== "tasks") {
    return {
      ok: false,
      errors: [`Invalid source-type: "${raw["source-type"]}". Must be "pages" or "tasks".`],
    };
  }

  const config: TimelineConfig = {
    query: raw["query"],
    sourceType,
    groupBy: raw["group-by"],
    startDateField: raw["start-date-field"],
    endDateField: raw["end-date-field"],
    sortBy: raw["sort-by"] || undefined,
    filterTags: raw["filter-tags"] ? splitCommaSeparated(raw["filter-tags"]) : undefined,
    doneColumns: raw["done-columns"] ? splitCommaSeparated(raw["done-columns"]) : [],
    activeColumns: raw["active-columns"] ? splitCommaSeparated(raw["active-columns"]) : [],
    hideNoDates: raw["hide-no-dates"] === "true",
    createdField: raw["created-field"] || undefined,
    completedField: raw["completed-field"] || undefined,
    hideFields: raw["hide-fields"] ? splitCommaSeparated(raw["hide-fields"]) : undefined,
    showFields: raw["show-fields"] ? splitCommaSeparated(raw["show-fields"]) : undefined,
  };

  return { ok: true, config };
}
