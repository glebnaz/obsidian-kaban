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
  // api.pages() expects a source expression without the FROM keyword
  const query = config.query.replace(/^\s*FROM\s+/i, "");
  const result = api.pages(query);
  if (!result || !result.values) return [];

  const cards: KanbanCard[] = [];
  for (const page of result.values) {
    try {
      cards.push(mapPageToCard(page, config.groupBy));
    } catch (e) {
      const path = page?.file?.path ?? "unknown";
      console.warn(`Kanban: skipping card with malformed frontmatter at ${path}:`, e);
    }
  }
  return cards;
}

export function mapTaskToCard(task: any, groupBy: string): KanbanCard {
  const rawText: string = task.text ?? "";
  // Strip inline fields like [field:: value] from the display title
  const title = rawText.replace(/\[[\w-]+::[^\]]*\]/g, "").trim() || "Untitled";
  const filePath: string = task.path ?? "";
  const lineNumber: number | undefined = task.line != null ? Number(task.line) : undefined;

  // Try to extract the groupBy field from inline fields in the task text
  const inlineFieldRegex = new RegExp(`\\[${groupBy}::\\s*([^\\]]*)\\]`, "i");
  const match = rawText.match(inlineFieldRegex);

  let status: string;
  if (match) {
    status = match[1].trim();
  } else {
    // Fall back to completed status
    status = task.completed ? "done" : "";
  }

  // Extract other inline fields
  const priorityMatch = rawText.match(/\[priority::\s*([^\]]*)\]/i);
  const dueMatch = rawText.match(/\[due::\s*([^\]]*)\]/i);
  const projectMatch = rawText.match(/\[project::\s*([^\]]*)\]/i);
  const tagsMatch = rawText.match(/\[tags::\s*([^\]]*)\]/i);

  const tags: string[] = [];
  if (tagsMatch) {
    for (const t of tagsMatch[1].split(",")) {
      const trimmed = t.trim();
      if (trimmed) tags.push(trimmed);
    }
  }
  // Also pick up #hashtags from the text
  const hashtagMatches = rawText.match(/#[\w-/]+/g);
  if (hashtagMatches) {
    for (const ht of hashtagMatches) {
      if (!tags.includes(ht)) tags.push(ht);
    }
  }

  return {
    id: `${filePath}:${lineNumber ?? 0}`,
    title,
    status,
    priority: priorityMatch ? priorityMatch[1].trim() : undefined,
    due: dueMatch ? dueMatch[1].trim() : undefined,
    tags: tags.length > 0 ? tags : undefined,
    project: projectMatch ? projectMatch[1].trim() : undefined,
    filePath,
    lineNumber,
    cardType: "checkbox",
  };
}

export function fetchTasks(api: DataviewApi, config: KanbanConfig): KanbanCard[] {
  const query = config.query.replace(/^\s*FROM\s+/i, "");
  const result = api.pages(query);
  if (!result || !result.values) return [];

  const cards: KanbanCard[] = [];
  for (const page of result.values) {
    const tasks = page?.file?.tasks?.values;
    if (!tasks) continue;
    for (const task of tasks) {
      try {
        cards.push(mapTaskToCard(task, config.groupBy));
      } catch (e) {
        const path = task?.path ?? "unknown";
        console.warn(`Kanban: skipping task at ${path}:${task?.line}:`, e);
      }
    }
  }
  return cards;
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
): { columns: KanbanColumn[] } {
  const cards = config.sourceType === "tasks"
    ? fetchTasks(api, config)
    : fetchPages(api, config);
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
