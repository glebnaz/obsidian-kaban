import { App, Component } from "obsidian";
import { KanbanConfig } from "./config";

export interface KanbanCard {
  id: string;
  title: string;
  status: string;
  priority?: string;
  due?: string;
  tags?: string[];
  project?: string;
  filePath: string;
  lineNumber?: number;
  cardType: "file" | "checkbox";
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface DataviewApi {
  pages(query: string): any;
}

export function getDataviewApi(app: App): DataviewApi | null {
  const dv = (app as any).plugins?.plugins?.["dataview"]?.api;
  return dv ?? null;
}

export function mapPageToCard(page: any, groupBy: string): KanbanCard {
  const filePath = page.file?.path ?? "";
  const title = page.file?.name ?? "Untitled";
  const status = String(page[groupBy] ?? "");

  const rawTags: string[] = [];
  if (page.file?.tags?.values) {
    for (const t of page.file.tags.values) {
      rawTags.push(String(t));
    }
  } else if (page.tags) {
    const tagVal = page.tags;
    if (Array.isArray(tagVal)) {
      for (const t of tagVal) rawTags.push(String(t));
    } else if (tagVal?.values) {
      for (const t of tagVal.values) rawTags.push(String(t));
    }
  }

  return {
    id: filePath,
    title,
    status,
    priority: page.priority != null ? String(page.priority) : undefined,
    due: page.due != null ? String(page.due) : undefined,
    tags: rawTags.length > 0 ? rawTags : undefined,
    project: page.project != null ? String(page.project) : undefined,
    filePath,
    cardType: "file",
  };
}

export function fetchPages(api: DataviewApi, config: KanbanConfig): KanbanCard[] {
  const result = api.pages(config.query);
  if (!result || !result.values) return [];

  const cards: KanbanCard[] = [];
  for (const page of result.values) {
    cards.push(mapPageToCard(page, config.groupBy));
  }
  return cards;
}

export function fetchTasks(_api: DataviewApi, _config: KanbanConfig): KanbanCard[] {
  return [];
}

export function filterByTags(cards: KanbanCard[], filterTags: string[]): KanbanCard[] {
  if (filterTags.length === 0) return cards;
  return cards.filter((card) => {
    if (!card.tags) return false;
    return filterTags.some((ft) => card.tags!.includes(ft));
  });
}

export function sortCards(cards: KanbanCard[], sortBy: string): KanbanCard[] {
  const sorted = [...cards];
  sorted.sort((a, b) => {
    const aVal = (a as any)[sortBy] ?? "";
    const bVal = (b as any)[sortBy] ?? "";
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
  return sorted;
}

export function groupIntoColumns(
  cards: KanbanCard[],
  config: KanbanConfig
): KanbanColumn[] {
  let filtered = cards;

  if (config.filterTags && config.filterTags.length > 0) {
    filtered = filterByTags(filtered, config.filterTags);
  }

  const columns: KanbanColumn[] = config.columns.map((col) => ({
    id: col,
    title: col,
    cards: [],
  }));

  const columnMap = new Map<string, KanbanColumn>();
  for (const col of columns) {
    columnMap.set(col.id, col);
  }

  for (const card of filtered) {
    const col = columnMap.get(card.status);
    if (col) {
      col.cards.push(card);
    }
  }

  if (config.sortBy) {
    for (const col of columns) {
      col.cards = sortCards(col.cards, config.sortBy);
    }
  }

  return columns;
}

export function loadBoard(
  api: DataviewApi,
  config: KanbanConfig
): { columns: KanbanColumn[]; v2Message?: string } {
  if (config.sourceType === "tasks") {
    return {
      columns: config.columns.map((col) => ({ id: col, title: col, cards: [] })),
      v2Message: "Checkbox-based tasks are coming in v2.",
    };
  }

  const cards = fetchPages(api, config);
  const columns = groupIntoColumns(cards, config);
  return { columns };
}

export function subscribeToMetadataChange(
  app: App,
  component: Component,
  callback: () => void
): void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const handler = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      callback();
    }, 300);
  };

  component.registerEvent(
    (app.metadataCache as any).on("dataview:metadata-change", handler)
  );
}
