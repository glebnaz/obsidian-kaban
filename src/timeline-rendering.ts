import { TimelineData, TimelineItem, daysBetween } from "./timeline";
import { TimelineConfig } from "./timeline-config";

const LABEL_WIDTH = 220;
const MIN_DAY_WIDTH = 64;
const WEEK_THRESHOLD = 90;

function formatDateDay(d: Date): string {
  return String(d.getDate());
}

function formatDateMonth(d: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[d.getMonth()];
}

function formatFullDate(d: Date): string {
  return `${formatDateMonth(d)} ${d.getDate()}`;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function generateDateLabels(start: Date, end: Date): Date[] {
  const labels: Date[] = [];
  const totalDays = daysBetween(start, end) + 1;
  const useWeeks = totalDays > WEEK_THRESHOLD;
  const step = useWeeks ? 7 : 1;

  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endTime = end.getTime();

  while (current.getTime() <= endTime) {
    labels.push(new Date(current));
    current.setDate(current.getDate() + step);
  }

  return labels;
}

export function renderTimelineHeader(
  container: HTMLElement,
  rangeStart: Date,
  rangeEnd: Date
): void {
  const header = container.createEl("div", { cls: "timeline-header" });
  header.createEl("div", { cls: "timeline-corner", text: "Task" });

  const datesContainer = header.createEl("div", { cls: "timeline-dates" });
  const labels = generateDateLabels(rangeStart, rangeEnd);
  const totalDays = daysBetween(rangeStart, rangeEnd) + 1;
  const useWeeks = totalDays > WEEK_THRESHOLD;

  let lastMonth = -1;

  for (const d of labels) {
    const isFirstOfMonth = d.getMonth() !== lastMonth;
    lastMonth = d.getMonth();

    const labelCls = isWeekend(d) && !useWeeks
      ? "timeline-date-label timeline-date-weekend"
      : "timeline-date-label";

    const label = datesContainer.createEl("div", { cls: labelCls });

    if (isFirstOfMonth || useWeeks) {
      label.createEl("span", {
        cls: "timeline-date-month",
        text: formatDateMonth(d),
      });
    }

    label.createEl("span", {
      cls: "timeline-date-day",
      text: useWeeks ? formatFullDate(d) : formatDateDay(d),
    });

    if (useWeeks) {
      const widthPercent = Math.min(7, totalDays - daysBetween(rangeStart, d)) / totalDays * 100;
      label.style.flex = `0 0 ${widthPercent}%`;
    }
  }
}

export function renderTimelineBar(
  trackEl: HTMLElement,
  item: TimelineItem,
  rangeStart: Date,
  totalDays: number
): void {
  const effectiveStart = item.startDate ?? item.endDate!;
  const effectiveEnd = item.endDate ?? item.startDate!;

  const startOffset = daysBetween(rangeStart, effectiveStart);
  const duration = daysBetween(effectiveStart, effectiveEnd) + 1;
  const isMilestone = !item.startDate || !item.endDate;

  const leftPercent = (startOffset / totalDays) * 100;
  const widthPercent = (duration / totalDays) * 100;

  const startStr = effectiveStart.toISOString().slice(0, 10);
  const endStr = effectiveEnd.toISOString().slice(0, 10);

  if (isMilestone) {
    const milestone = trackEl.createEl("div", {
      cls: `timeline-milestone timeline-bar-${item.color}`,
    });
    milestone.style.left = `${leftPercent}%`;
    milestone.title = `${item.card.title}\n${startStr}`;
  } else {
    const bar = trackEl.createEl("div", {
      cls: `timeline-bar timeline-bar-${item.color}`,
    });
    bar.style.left = `${leftPercent}%`;
    bar.style.width = `${Math.max(widthPercent, 0.5)}%`;
    bar.title = `${item.card.title}\n${startStr} \u2192 ${endStr} (${duration}d)`;

    if (widthPercent > 5) {
      bar.createEl("span", {
        cls: "timeline-bar-label",
        text: `${duration}d`,
      });
    }
  }
}

export function renderTimelineRow(
  container: HTMLElement,
  item: TimelineItem,
  rangeStart: Date,
  totalDays: number,
  _config: TimelineConfig
): void {
  const row = container.createEl("div", { cls: "timeline-row" });
  row.dataset.filePath = item.card.filePath;
  if (item.card.lineNumber != null) {
    row.dataset.lineNumber = String(item.card.lineNumber);
  }

  const label = row.createEl("div", { cls: "timeline-row-label" });
  label.createEl("span", { cls: `timeline-status-dot timeline-dot-${item.color}` });
  label.createEl("span", {
    cls: "timeline-task-title",
    text: item.card.title,
  });

  const track = row.createEl("div", { cls: "timeline-row-track" });
  renderTimelineBar(track, item, rangeStart, totalDays);
}

export function renderTimeline(
  el: HTMLElement,
  data: TimelineData,
  config: TimelineConfig
): void {
  if (data.items.length === 0 && data.noDateItems.length === 0) {
    el.createEl("div", {
      cls: "timeline-empty",
      text: "No tasks found. Check your query or add tasks with date fields.",
    });
    return;
  }

  // Outer scroll wrapper — this element provides horizontal scrolling
  const scroll = el.createEl("div", { cls: "timeline-scroll" });

  // Inner container — sized to fit all date columns, scrolled by the wrapper
  const container = scroll.createEl("div", { cls: "timeline-container" });
  const totalDays = daysBetween(data.rangeStart, data.rangeEnd) + 1;
  const minWidth = totalDays * MIN_DAY_WIDTH + LABEL_WIDTH;
  container.style.minWidth = `${minWidth}px`;

  if (data.items.length > 0) {
    renderTimelineHeader(container, data.rangeStart, data.rangeEnd);

    const body = container.createEl("div", { cls: "timeline-body" });

    for (const item of data.items) {
      renderTimelineRow(body, item, data.rangeStart, totalDays, config);
    }

    // Today marker
    const todayOffset = daysBetween(data.rangeStart, new Date());
    if (todayOffset >= 0 && todayOffset <= totalDays) {
      const todayLine = body.createEl("div", { cls: "timeline-today-line" });
      const leftPercent = (todayOffset / totalDays) * 100;
      todayLine.style.left = `${leftPercent}%`;
    }
  }

  // No-dates section — rendered outside the scroll wrapper so it doesn't scroll
  if (data.noDateItems.length > 0 && !config.hideNoDates) {
    const noDatesSection = el.createEl("div", { cls: "timeline-no-dates" });
    noDatesSection.createEl("div", {
      cls: "timeline-no-dates-header",
      text: `Without dates \u00b7 ${data.noDateItems.length}`,
    });

    for (const card of data.noDateItems) {
      const item = noDatesSection.createEl("div", { cls: "timeline-no-date-item" });
      item.dataset.filePath = card.filePath;
      item.createEl("span", { cls: "timeline-status-dot timeline-dot-gray" });
      item.createEl("span", {
        cls: "timeline-task-title",
        text: card.title,
      });
    }
  }
}
