export type SourceType = "pages" | "tasks";

export interface KanbanConfig {
  source: string;
  query: string;
  sourceType: SourceType;
  columns: string[];
  groupBy: string;
  sortBy?: string;
  filterTags?: string[];
  hideFields?: string[];
  showDone: boolean;
}

export interface ParseResult {
  ok: true;
  config: KanbanConfig;
}

export interface ParseError {
  ok: false;
  errors: string[];
}

export type ParseOutcome = ParseResult | ParseError;

const REQUIRED_FIELDS = ["source", "query", "columns", "group-by"] as const;

function splitCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function parseKanbanConfig(source: string): ParseOutcome {
  const lines = source.split("\n");
  const raw: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim();
    if (key && value) {
      raw[key] = value;
    }
  }

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

  const config: KanbanConfig = {
    source: raw["source"],
    query: raw["query"],
    sourceType,
    columns: splitCommaSeparated(raw["columns"]),
    groupBy: raw["group-by"],
    sortBy: raw["sort-by"] || undefined,
    filterTags: raw["filter-tags"] ? splitCommaSeparated(raw["filter-tags"]) : undefined,
    hideFields: raw["hide-fields"] ? splitCommaSeparated(raw["hide-fields"]) : undefined,
    showDone: raw["show-done"] !== "false",
  };

  if (config.columns.length === 0) {
    return { ok: false, errors: ['Field "columns" must contain at least one value.'] };
  }

  return { ok: true, config };
}
