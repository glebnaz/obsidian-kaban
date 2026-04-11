import { KanbanCard, DataviewApi, fetchPages, fetchTasks, filterByTags, sortCards } from "./dataview";
import { KanbanConfig } from "./config";
import { TimelineConfig } from "./timeline-config";

export type TimelineColor = "blue" | "green" | "gray";

export interface TimelineItem {
  card: KanbanCard;
  startDate: Date | null;
  endDate: Date | null;
  color: TimelineColor;
}

export interface TimelineData {
  items: TimelineItem[];
  noDateItems: KanbanCard[];
  rangeStart: Date;
  rangeEnd: Date;
}

export function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function resolveColor(
  card: KanbanCard,
  doneColumns: string[],
  activeColumns?: string[]
): TimelineColor {
  const statusLower = card.status.toLowerCase();
  if (doneColumns.some((dc) => dc.toLowerCase() === statusLower)) {
    return "green";
  }

  if (activeColumns && activeColumns.length > 0) {
    if (activeColumns.some((ac) => ac.toLowerCase() === statusLower)) {
      return "blue";
    }
    return "gray";
  }

  // Fallback: no active-columns configured — use date-based heuristic
  const startDate = parseDate(card.startDate);
  if (startDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (start.getTime() <= today.getTime()) {
      return "blue";
    }
  }

  return "gray";
}

export function computeDateRange(items: TimelineItem[]): { start: Date; end: Date } {
  let minTime = Infinity;
  let maxTime = -Infinity;

  for (const item of items) {
    if (item.startDate) {
      const t = item.startDate.getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }
    if (item.endDate) {
      const t = item.endDate.getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }
  }

  if (minTime === Infinity) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { start: today, end: today };
  }

  const start = new Date(minTime);
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(maxTime);
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const aDay = new Date(a);
  aDay.setHours(0, 0, 0, 0);
  const bDay = new Date(b);
  bDay.setHours(0, 0, 0, 0);
  return Math.round((bDay.getTime() - aDay.getTime()) / msPerDay);
}

function buildDataConfig(config: TimelineConfig): KanbanConfig {
  return {
    query: config.query,
    sourceType: config.sourceType,
    columns: [],
    groupBy: config.groupBy,
    sortBy: config.sortBy,
    filterTags: config.filterTags,
    doneColumns: config.doneColumns,
    showDone: true,
    createdField: config.createdField,
    completedField: config.completedField,
    hideFields: config.hideFields,
    showFields: config.showFields,
  };
}

export function loadTimeline(api: DataviewApi, config: TimelineConfig): TimelineData {
  const dataConfig = buildDataConfig(config);
  const dateOpts = {
    startDateField: config.startDateField,
    endDateField: config.endDateField,
  };

  let cards = config.sourceType === "tasks"
    ? fetchTasks(api, dataConfig, dateOpts)
    : fetchPages(api, dataConfig, dateOpts);

  if (config.filterTags && config.filterTags.length > 0) {
    cards = filterByTags(cards, config.filterTags);
  }

  if (config.sortBy) {
    cards = sortCards(cards, config.sortBy);
  }

  const items: TimelineItem[] = [];
  const noDateItems: KanbanCard[] = [];

  for (const card of cards) {
    const startDate = parseDate(card.startDate);
    const endDate = parseDate(card.endDate);

    if (!startDate && !endDate) {
      noDateItems.push(card);
      continue;
    }

    items.push({
      card,
      startDate,
      endDate,
      color: resolveColor(card, config.doneColumns, config.activeColumns),
    });
  }

  const { start: rangeStart, end: rangeEnd } = computeDateRange(items);

  return { items, noDateItems, rangeStart, rangeEnd };
}
