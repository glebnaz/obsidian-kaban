import { renderTimeline, renderTimelineHeader, renderTimelineRow, renderTimelineBar } from "./timeline-rendering";
import { TimelineData, TimelineItem } from "./timeline";
import { TimelineConfig } from "./timeline-config";
import { KanbanCard } from "./dataview";
import { createMockEl } from "./__mocks__/obsidian";

function makeConfig(overrides?: Partial<TimelineConfig>): TimelineConfig {
  return {
    query: 'FROM "Tasks"',
    sourceType: "pages",
    groupBy: "status",
    startDateField: "start-date",
    endDateField: "end-date",
    doneColumns: [],
    activeColumns: [],
    hideNoDates: false,
    ...overrides,
  };
}

function makeCard(overrides?: Partial<KanbanCard>): KanbanCard {
  return {
    id: "Tasks/task.md",
    title: "Test task",
    status: "todo",
    filePath: "Tasks/task.md",
    cardType: "file",
    ...overrides,
  };
}

function makeItem(overrides?: Partial<TimelineItem>): TimelineItem {
  return {
    card: makeCard(),
    startDate: new Date("2026-03-10"),
    endDate: new Date("2026-03-15"),
    color: "blue",
    ...overrides,
  };
}

// Helper to find elements recursively by class (supports partial match via startsWith)
function findByClass(el: any, cls: string): any[] {
  const results: any[] = [];
  if (typeof el.cls === "string" && (el.cls === cls || el.cls.startsWith(cls + " "))) {
    results.push(el);
  }
  for (const child of el.children || []) {
    results.push(...findByClass(child, cls));
  }
  return results;
}

function findByClassExact(el: any, cls: string): any[] {
  const results: any[] = [];
  if (el.cls === cls) results.push(el);
  for (const child of el.children || []) {
    results.push(...findByClassExact(child, cls));
  }
  return results;
}

function findByClassFirst(el: any, cls: string): any | undefined {
  return findByClass(el, cls)[0];
}

describe("renderTimelineBar", () => {
  it("should render a bar with correct color class", () => {
    const track = createMockEl();
    const item = makeItem({ color: "green" });
    renderTimelineBar(track, item, new Date("2026-03-05"), 20);

    const bar = findByClassFirst(track, "timeline-bar timeline-bar-green");
    expect(bar).toBeDefined();
  });

  it("should render a milestone when only start date", () => {
    const track = createMockEl();
    const item = makeItem({
      startDate: new Date("2026-03-10"),
      endDate: null,
      color: "gray",
    });
    renderTimelineBar(track, item, new Date("2026-03-05"), 20);

    const milestone = findByClassFirst(track, "timeline-milestone timeline-bar-gray");
    expect(milestone).toBeDefined();
  });

  it("should render a milestone when only end date", () => {
    const track = createMockEl();
    const item = makeItem({
      startDate: null,
      endDate: new Date("2026-03-12"),
      color: "blue",
    });
    renderTimelineBar(track, item, new Date("2026-03-05"), 20);

    const milestone = findByClassFirst(track, "timeline-milestone timeline-bar-blue");
    expect(milestone).toBeDefined();
  });

  it("should set title attribute for tooltip", () => {
    const track = createMockEl();
    const item = makeItem({
      card: makeCard({ title: "My Task" }),
      startDate: new Date("2026-03-10"),
      endDate: new Date("2026-03-15"),
    });
    renderTimelineBar(track, item, new Date("2026-03-05"), 20);

    const bar = findByClassFirst(track, "timeline-bar timeline-bar-blue");
    expect(bar.title).toContain("My Task");
    expect(bar.title).toContain("2026-03-10");
    expect(bar.title).toContain("2026-03-15");
  });
});

describe("renderTimelineRow", () => {
  it("should render row with label and track", () => {
    const container = createMockEl();
    const item = makeItem({ card: makeCard({ title: "Task A" }) });
    renderTimelineRow(container, item, new Date("2026-03-05"), 20, makeConfig());

    const row = findByClassFirst(container, "timeline-row");
    expect(row).toBeDefined();
    expect(row.dataset.filePath).toBe("Tasks/task.md");

    const title = findByClassFirst(container, "timeline-task-title");
    expect(title).toBeDefined();
    expect(title.text).toBe("Task A");

    const track = findByClassFirst(container, "timeline-row-track");
    expect(track).toBeDefined();
  });

  it("should set lineNumber data attribute when present", () => {
    const container = createMockEl();
    const item = makeItem({ card: makeCard({ lineNumber: 42 }) });
    renderTimelineRow(container, item, new Date("2026-03-05"), 20, makeConfig());

    const row = findByClassFirst(container, "timeline-row");
    expect(row.dataset.lineNumber).toBe("42");
  });
});

describe("renderTimelineHeader", () => {
  it("should render header with corner and date labels", () => {
    const container = createMockEl();
    renderTimelineHeader(container, new Date("2026-03-10"), new Date("2026-03-14"));

    const header = findByClassFirst(container, "timeline-header");
    expect(header).toBeDefined();

    const corner = findByClassFirst(container, "timeline-corner");
    expect(corner).toBeDefined();

    const dates = findByClassFirst(container, "timeline-dates");
    expect(dates).toBeDefined();

    const labels = findByClass(container, "timeline-date-label");
    // 5 days: Mar 10, 11, 12, 13, 14
    expect(labels.length).toBe(5);

    // First label has month + day, subsequent ones have just day
    const firstDayEl = findByClassFirst(labels[0], "timeline-date-day");
    expect(firstDayEl).toBeDefined();
    expect(firstDayEl.text).toBe("10");

    const firstMonthEl = findByClassFirst(labels[0], "timeline-date-month");
    expect(firstMonthEl).toBeDefined();
    expect(firstMonthEl.text).toBe("Mar");
  });

  it("should render status dots in rows", () => {
    const container = createMockEl();
    const item = makeItem({ color: "blue", card: makeCard({ title: "Task A" }) });
    renderTimelineRow(container, item, new Date("2026-03-05"), 20, makeConfig());

    const dot = findByClassFirst(container, "timeline-status-dot timeline-dot-blue");
    expect(dot).toBeDefined();
  });
});

describe("renderTimeline", () => {
  it("should render empty message when no data", () => {
    const el = createMockEl();
    const data: TimelineData = {
      items: [],
      noDateItems: [],
      rangeStart: new Date(),
      rangeEnd: new Date(),
    };

    renderTimeline(el, data, makeConfig());

    const empty = findByClassFirst(el, "timeline-empty");
    expect(empty).toBeDefined();
    expect(empty.text).toContain("No tasks found");
  });

  it("should render timeline container with items", () => {
    const el = createMockEl();
    const data: TimelineData = {
      items: [makeItem()],
      noDateItems: [],
      rangeStart: new Date("2026-03-05"),
      rangeEnd: new Date("2026-03-20"),
    };

    renderTimeline(el, data, makeConfig());

    const scroll = findByClassFirst(el, "timeline-scroll");
    expect(scroll).toBeDefined();

    const container = findByClassFirst(el, "timeline-container");
    expect(container).toBeDefined();

    const header = findByClassFirst(el, "timeline-header");
    expect(header).toBeDefined();

    const body = findByClassFirst(el, "timeline-body");
    expect(body).toBeDefined();

    const rows = findByClass(el, "timeline-row");
    expect(rows).toHaveLength(1);
  });

  it("should render no-dates section when noDateItems present", () => {
    const el = createMockEl();
    const data: TimelineData = {
      items: [makeItem()],
      noDateItems: [makeCard({ title: "No dates task" })],
      rangeStart: new Date("2026-03-05"),
      rangeEnd: new Date("2026-03-20"),
    };

    renderTimeline(el, data, makeConfig());

    const noDates = findByClassFirst(el, "timeline-no-dates");
    expect(noDates).toBeDefined();

    const noDatesHeader = findByClassFirst(el, "timeline-no-dates-header");
    expect(noDatesHeader).toBeDefined();
    expect(noDatesHeader.text).toContain("1");

    const items = findByClass(el, "timeline-no-date-item");
    expect(items).toHaveLength(1);
  });

  it("should hide no-dates section when hideNoDates is true", () => {
    const el = createMockEl();
    const data: TimelineData = {
      items: [makeItem()],
      noDateItems: [makeCard({ title: "No dates task" })],
      rangeStart: new Date("2026-03-05"),
      rangeEnd: new Date("2026-03-20"),
    };

    renderTimeline(el, data, makeConfig({ hideNoDates: true }));

    const noDates = findByClassFirst(el, "timeline-no-dates");
    expect(noDates).toBeUndefined();
  });

  it("should render correct color classes for bars", () => {
    const el = createMockEl();
    const data: TimelineData = {
      items: [
        makeItem({ color: "blue" }),
        makeItem({ color: "green", card: makeCard({ id: "2" }) }),
        makeItem({ color: "gray", card: makeCard({ id: "3" }) }),
      ],
      noDateItems: [],
      rangeStart: new Date("2026-03-05"),
      rangeEnd: new Date("2026-03-20"),
    };

    renderTimeline(el, data, makeConfig());

    const blueBars = findByClass(el, "timeline-bar timeline-bar-blue");
    const greenBars = findByClass(el, "timeline-bar timeline-bar-green");
    const grayBars = findByClass(el, "timeline-bar timeline-bar-gray");

    expect(blueBars).toHaveLength(1);
    expect(greenBars).toHaveLength(1);
    expect(grayBars).toHaveLength(1);
  });

  it("should render only no-dates section when all items have no dates", () => {
    const el = createMockEl();
    const data: TimelineData = {
      items: [],
      noDateItems: [makeCard({ title: "A" }), makeCard({ title: "B" })],
      rangeStart: new Date(),
      rangeEnd: new Date(),
    };

    renderTimeline(el, data, makeConfig());

    const noDates = findByClassFirst(el, "timeline-no-dates");
    expect(noDates).toBeDefined();

    // No header or body since no items
    const header = findByClassFirst(el, "timeline-header");
    expect(header).toBeUndefined();
  });
});
