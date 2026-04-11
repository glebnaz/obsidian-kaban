import { resolveColor, computeDateRange, parseDate, daysBetween, loadTimeline, TimelineItem } from "./timeline";
import { KanbanCard } from "./dataview";

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

describe("parseDate", () => {
  it("should parse ISO date string", () => {
    const d = parseDate("2026-03-15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(2); // March = 2
    expect(d!.getDate()).toBe(15);
  });

  it("should parse ISO datetime string", () => {
    const d = parseDate("2026-03-15T10:00:00.000+00:00");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it("should return null for undefined", () => {
    expect(parseDate(undefined)).toBeNull();
  });

  it("should return null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });

  it("should return null for unparseable string", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });
});

describe("resolveColor", () => {
  it("should return green when status matches a done-column", () => {
    const card = makeCard({ status: "done" });
    expect(resolveColor(card, ["done"])).toBe("green");
  });

  it("should return green case-insensitively", () => {
    const card = makeCard({ status: "Done" });
    expect(resolveColor(card, ["done"])).toBe("green");
  });

  it("should return blue when status matches active-columns", () => {
    const card = makeCard({ status: "in-progress" });
    expect(resolveColor(card, ["done"], ["in-progress", "wip"])).toBe("blue");
  });

  it("should return blue for active-columns case-insensitively", () => {
    const card = makeCard({ status: "WIP" });
    expect(resolveColor(card, ["done"], ["in-progress", "wip"])).toBe("blue");
  });

  it("should return gray when status not in active-columns or done-columns", () => {
    const card = makeCard({ status: "todo" });
    expect(resolveColor(card, ["done"], ["in-progress"])).toBe("gray");
  });

  it("should prioritize done over active", () => {
    const card = makeCard({ status: "done" });
    expect(resolveColor(card, ["done"], ["done", "in-progress"])).toBe("green");
  });

  // Fallback: no active-columns → date-based heuristic
  it("should fallback to date heuristic when no active-columns", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const card = makeCard({
      status: "in-progress",
      startDate: yesterday.toISOString(),
    });
    expect(resolveColor(card, ["done"])).toBe("blue");
  });

  it("should fallback to date heuristic — today is blue", () => {
    const today = new Date();
    const card = makeCard({
      status: "in-progress",
      startDate: today.toISOString(),
    });
    expect(resolveColor(card, ["done"])).toBe("blue");
  });

  it("should fallback to date heuristic — future is gray", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const card = makeCard({
      status: "todo",
      startDate: future.toISOString(),
    });
    expect(resolveColor(card, ["done"])).toBe("gray");
  });

  it("should return gray when no startDate and no active-columns", () => {
    const card = makeCard({ status: "todo" });
    expect(resolveColor(card, ["done"])).toBe("gray");
  });

  it("should prioritize done over start date in fallback mode", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const card = makeCard({
      status: "done",
      startDate: yesterday.toISOString(),
    });
    expect(resolveColor(card, ["done"])).toBe("green");
  });
});

describe("daysBetween", () => {
  it("should return 0 for same day", () => {
    const d = new Date("2026-03-15");
    expect(daysBetween(d, d)).toBe(0);
  });

  it("should return positive for future date", () => {
    const a = new Date("2026-03-10");
    const b = new Date("2026-03-15");
    expect(daysBetween(a, b)).toBe(5);
  });

  it("should return negative for past date", () => {
    const a = new Date("2026-03-15");
    const b = new Date("2026-03-10");
    expect(daysBetween(a, b)).toBe(-5);
  });
});

describe("computeDateRange", () => {
  it("should compute min/max from items", () => {
    const items: TimelineItem[] = [
      {
        card: makeCard(),
        startDate: new Date("2026-03-05"),
        endDate: new Date("2026-03-10"),
        color: "blue",
      },
      {
        card: makeCard(),
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-15"),
        color: "gray",
      },
    ];

    const range = computeDateRange(items);
    // start should be 1 day before earliest (Mar 1) = Feb 28
    expect(range.start.getDate()).toBe(28);
    expect(range.start.getMonth()).toBe(1); // Feb
    // end should be 1 day after latest (Mar 15) = Mar 16
    expect(range.end.getDate()).toBe(16);
    expect(range.end.getMonth()).toBe(2); // Mar
  });

  it("should handle single item", () => {
    const items: TimelineItem[] = [
      {
        card: makeCard(),
        startDate: new Date("2026-03-10"),
        endDate: new Date("2026-03-12"),
        color: "blue",
      },
    ];

    const range = computeDateRange(items);
    expect(range.start.getDate()).toBe(9);
    expect(range.end.getDate()).toBe(13);
  });

  it("should handle items with only start date", () => {
    const items: TimelineItem[] = [
      {
        card: makeCard(),
        startDate: new Date("2026-03-10"),
        endDate: null,
        color: "gray",
      },
    ];

    const range = computeDateRange(items);
    expect(range.start.getDate()).toBe(9);
    expect(range.end.getDate()).toBe(11);
  });

  it("should return today when no items", () => {
    const range = computeDateRange([]);
    const today = new Date();
    expect(range.start.getDate()).toBe(today.getDate());
  });
});

describe("loadTimeline", () => {
  function makeMockApi(pages: any[] = []) {
    return {
      pages: () => ({ values: pages }),
      evaluate: (_expr: string, _ctx: any) => ({ successful: true, value: true }),
    };
  }

  it("should separate cards with dates from cards without dates", () => {
    const pages = [
      {
        file: { path: "Tasks/a.md", name: "a", tags: { values: [] } },
        status: "todo",
        "start-date": "2026-03-10",
        "end-date": "2026-03-12",
      },
      {
        file: { path: "Tasks/b.md", name: "b", tags: { values: [] } },
        status: "todo",
      },
    ];

    const data = loadTimeline(makeMockApi(pages), {
      query: 'FROM "Tasks"',
      sourceType: "pages",
      groupBy: "status",
      startDateField: "start-date",
      endDateField: "end-date",
      doneColumns: [],
      activeColumns: [],
      hideNoDates: false,
    });

    expect(data.items).toHaveLength(1);
    expect(data.noDateItems).toHaveLength(1);
    expect(data.items[0].card.title).toBe("a");
    expect(data.noDateItems[0].title).toBe("b");
  });

  it("should assign correct colors", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const future = new Date();
    future.setDate(future.getDate() + 5);

    const pages = [
      {
        file: { path: "Tasks/done.md", name: "done-task", tags: { values: [] } },
        status: "done",
        "start-date": "2026-01-01",
        "end-date": "2026-01-10",
      },
      {
        file: { path: "Tasks/active.md", name: "active-task", tags: { values: [] } },
        status: "in-progress",
        "start-date": yesterday.toISOString().slice(0, 10),
        "end-date": future.toISOString().slice(0, 10),
      },
      {
        file: { path: "Tasks/future.md", name: "future-task", tags: { values: [] } },
        status: "todo",
        "start-date": future.toISOString().slice(0, 10),
        "end-date": future.toISOString().slice(0, 10),
      },
    ];

    const data = loadTimeline(makeMockApi(pages), {
      query: 'FROM "Tasks"',
      sourceType: "pages",
      groupBy: "status",
      startDateField: "start-date",
      endDateField: "end-date",
      doneColumns: ["done"],
      activeColumns: [],
      hideNoDates: false,
    });

    expect(data.items).toHaveLength(3);
    const colors = data.items.map((i) => i.color);
    expect(colors).toContain("green");
    expect(colors).toContain("blue");
    expect(colors).toContain("gray");
  });

  it("should handle milestone (only start date)", () => {
    const pages = [
      {
        file: { path: "Tasks/m.md", name: "milestone", tags: { values: [] } },
        status: "todo",
        "start-date": "2026-03-10",
      },
    ];

    const data = loadTimeline(makeMockApi(pages), {
      query: 'FROM "Tasks"',
      sourceType: "pages",
      groupBy: "status",
      startDateField: "start-date",
      endDateField: "end-date",
      doneColumns: [],
      activeColumns: [],
      hideNoDates: false,
    });

    expect(data.items).toHaveLength(1);
    expect(data.items[0].startDate).not.toBeNull();
    expect(data.items[0].endDate).toBeNull();
  });
});
