import {
  KanbanCard,
  DataviewApi,
  getDataviewApi,
  mapPageToCard,
  fetchPages,
  fetchTasks,
  filterByTags,
  sortCards,
  groupIntoColumns,
  loadBoard,
  subscribeToMetadataChange,
} from "./dataview";
import { KanbanConfig } from "./config";
import { Component } from "./__mocks__/obsidian";

function makeConfig(overrides?: Partial<KanbanConfig>): KanbanConfig {
  return {
    query: 'FROM "Tasks"',
    sourceType: "pages",
    columns: ["Backlog", "In Progress", "Done"],
    groupBy: "status",
    doneColumns: [],
    showDone: true,
    ...overrides,
  };
}

function makePage(overrides?: Record<string, any>): any {
  return {
    file: {
      path: "Tasks/my-task.md",
      name: "my-task",
      tags: { values: ["#work"] },
    },
    status: "Backlog",
    priority: "high",
    due: "2026-03-15",
    project: "ProjectX",
    ...overrides,
  };
}

function makeMockApi(pages: any[] = []): DataviewApi {
  return {
    pages: jest.fn().mockReturnValue({ values: pages }),
  };
}

describe("getDataviewApi", () => {
  it("should return api when dataview plugin is available", () => {
    const fakeApi = { pages: jest.fn() };
    const app = { plugins: { plugins: { dataview: { api: fakeApi } } } } as any;
    expect(getDataviewApi(app)).toBe(fakeApi);
  });

  it("should return null when dataview is not installed", () => {
    const app = { plugins: { plugins: {} } } as any;
    expect(getDataviewApi(app)).toBeNull();
  });

  it("should return null when plugins object is missing", () => {
    const app = {} as any;
    expect(getDataviewApi(app)).toBeNull();
  });
});

describe("mapPageToCard", () => {
  it("should map a dataview page to KanbanCard", () => {
    const page = makePage();
    const card = mapPageToCard(page, makeConfig());

    expect(card).toEqual({
      id: "Tasks/my-task.md",
      title: "my-task",
      status: "Backlog",
      priority: "high",
      due: "2026-03-15",
      tags: ["#work"],
      project: "ProjectX",
      createdAt: undefined,
      filePath: "Tasks/my-task.md",
      cardType: "file",
    });
  });

  it("should handle page with no tags", () => {
    const page = makePage({ file: { path: "a.md", name: "a", tags: { values: [] } } });
    const card = mapPageToCard(page, makeConfig());
    expect(card.tags).toBeUndefined();
  });

  it("should handle page with missing optional fields", () => {
    const page = {
      file: { path: "b.md", name: "b" },
      status: "Done",
    };
    const card = mapPageToCard(page, makeConfig());
    expect(card.priority).toBeUndefined();
    expect(card.due).toBeUndefined();
    expect(card.project).toBeUndefined();
    expect(card.tags).toBeUndefined();
  });

  it("should handle array-style tags", () => {
    const page = makePage({ tags: ["#a", "#b"], file: { path: "c.md", name: "c" } });
    const card = mapPageToCard(page, makeConfig());
    expect(card.tags).toEqual(["#a", "#b"]);
  });
});

describe("fetchPages", () => {
  it("should return cards from api.pages result", () => {
    const pages = [makePage(), makePage({ status: "Done", file: { path: "d.md", name: "d" } })];
    const api = makeMockApi(pages);
    const config = makeConfig();
    const cards = fetchPages(api, config);

    expect(api.pages).toHaveBeenCalledWith('"Tasks"');
    expect(cards).toHaveLength(2);
    expect(cards[0].status).toBe("Backlog");
    expect(cards[1].status).toBe("Done");
  });

  it("should return empty array when api returns null", () => {
    const api = { pages: jest.fn().mockReturnValue(null) };
    const cards = fetchPages(api, makeConfig());
    expect(cards).toEqual([]);
  });

  it("should return empty array when api returns no values", () => {
    const api = { pages: jest.fn().mockReturnValue({}) };
    const cards = fetchPages(api, makeConfig());
    expect(cards).toEqual([]);
  });
});

describe("fetchTasks", () => {
  it("should return empty array when no tasks exist", () => {
    const api = makeMockApi();
    const cards = fetchTasks(api, makeConfig({ sourceType: "tasks" }));
    expect(cards).toEqual([]);
  });

  it("should extract cards from checkbox tasks with inline fields", () => {
    const pages = [
      {
        file: {
          path: "Projects/notes.md",
          tasks: {
            values: [
              { text: "Buy milk [status:: todo] [priority:: high]", completed: false, path: "Projects/notes.md", line: 5 },
              { text: "Write report [status:: done]", completed: true, path: "Projects/notes.md", line: 6 },
            ],
          },
        },
      },
    ];
    const api = { pages: jest.fn().mockReturnValue({ values: pages }) };
    const cards = fetchTasks(api, makeConfig({ sourceType: "tasks", query: 'FROM "Projects"' }));

    expect(cards).toHaveLength(2);
    expect(cards[0].title).toBe("Buy milk");
    expect(cards[0].status).toBe("todo");
    expect(cards[0].priority).toBe("high");
    expect(cards[0].cardType).toBe("checkbox");
    expect(cards[0].lineNumber).toBe(5);
    expect(cards[1].status).toBe("done");
  });

  it("should fall back to completed status when no inline groupBy field", () => {
    const pages = [
      {
        file: {
          path: "tasks.md",
          tasks: {
            values: [
              { text: "Simple task", completed: false, path: "tasks.md", line: 1 },
              { text: "Done task", completed: true, path: "tasks.md", line: 2 },
            ],
          },
        },
      },
    ];
    const api = { pages: jest.fn().mockReturnValue({ values: pages }) };
    const cards = fetchTasks(api, makeConfig({ sourceType: "tasks" }));

    expect(cards[0].status).toBe("");
    expect(cards[1].status).toBe("done");
  });
});

describe("filterByTags", () => {
  const cards: KanbanCard[] = [
    { id: "1", title: "A", status: "Backlog", filePath: "a.md", cardType: "file", tags: ["#work", "#urgent"] },
    { id: "2", title: "B", status: "Backlog", filePath: "b.md", cardType: "file", tags: ["#personal"] },
    { id: "3", title: "C", status: "Done", filePath: "c.md", cardType: "file" },
  ];

  it("should filter cards matching any of the filter tags", () => {
    const result = filterByTags(cards, ["#work"]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("A");
  });

  it("should return all cards when filterTags is empty", () => {
    const result = filterByTags(cards, []);
    expect(result).toHaveLength(3);
  });

  it("should exclude cards with no tags", () => {
    const result = filterByTags(cards, ["#personal"]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("B");
  });
});

describe("sortCards", () => {
  it("should sort cards by a string field", () => {
    const cards: KanbanCard[] = [
      { id: "1", title: "Zebra", status: "a", filePath: "z.md", cardType: "file" },
      { id: "2", title: "Apple", status: "a", filePath: "a.md", cardType: "file" },
      { id: "3", title: "Mango", status: "a", filePath: "m.md", cardType: "file" },
    ];
    const sorted = sortCards(cards, "title");
    expect(sorted.map((c) => c.title)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("should handle missing field values by sorting them first", () => {
    const cards: KanbanCard[] = [
      { id: "1", title: "A", status: "a", filePath: "a.md", cardType: "file", priority: "high" },
      { id: "2", title: "B", status: "a", filePath: "b.md", cardType: "file" },
    ];
    const sorted = sortCards(cards, "priority");
    expect(sorted[0].title).toBe("B");
    expect(sorted[1].title).toBe("A");
  });
});

describe("groupIntoColumns", () => {
  const cards: KanbanCard[] = [
    { id: "1", title: "A", status: "Backlog", filePath: "a.md", cardType: "file" },
    { id: "2", title: "B", status: "In Progress", filePath: "b.md", cardType: "file" },
    { id: "3", title: "C", status: "Backlog", filePath: "c.md", cardType: "file" },
    { id: "4", title: "D", status: "Done", filePath: "d.md", cardType: "file" },
    { id: "5", title: "E", status: "Unknown", filePath: "e.md", cardType: "file" },
  ];

  it("should group cards into configured columns", () => {
    const columns = groupIntoColumns(cards, makeConfig());
    expect(columns).toHaveLength(3);
    expect(columns[0].title).toBe("Backlog");
    expect(columns[0].cards).toHaveLength(2);
    expect(columns[1].title).toBe("In Progress");
    expect(columns[1].cards).toHaveLength(1);
    expect(columns[2].title).toBe("Done");
    expect(columns[2].cards).toHaveLength(1);
  });

  it("should drop cards that dont match any column", () => {
    const columns = groupIntoColumns(cards, makeConfig());
    const allCards = columns.flatMap((c) => c.cards);
    expect(allCards.find((c) => c.title === "E")).toBeUndefined();
  });

  it("should apply tag filtering before grouping", () => {
    const taggedCards: KanbanCard[] = [
      { id: "1", title: "A", status: "Backlog", filePath: "a.md", cardType: "file", tags: ["#work"] },
      { id: "2", title: "B", status: "Backlog", filePath: "b.md", cardType: "file", tags: ["#personal"] },
    ];
    const columns = groupIntoColumns(taggedCards, makeConfig({ filterTags: ["#work"] }));
    expect(columns[0].cards).toHaveLength(1);
    expect(columns[0].cards[0].title).toBe("A");
  });

  it("should apply sorting within columns", () => {
    const unsortedCards: KanbanCard[] = [
      { id: "1", title: "Zebra", status: "Backlog", filePath: "z.md", cardType: "file" },
      { id: "2", title: "Apple", status: "Backlog", filePath: "a.md", cardType: "file" },
    ];
    const columns = groupIntoColumns(unsortedCards, makeConfig({ sortBy: "title" }));
    expect(columns[0].cards[0].title).toBe("Apple");
    expect(columns[0].cards[1].title).toBe("Zebra");
  });

  it("should leave empty columns when no cards match", () => {
    const columns = groupIntoColumns([], makeConfig());
    expect(columns).toHaveLength(3);
    expect(columns.every((c) => c.cards.length === 0)).toBe(true);
  });
});

describe("fetchPages - malformed frontmatter", () => {
  it("should skip pages that throw during mapping and log warning", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const badPage = {
      file: { path: "bad.md", name: "bad" },
      get status() {
        throw new Error("Malformed frontmatter");
      },
    };
    const goodPage = makePage({ status: "Backlog" });
    const api = { pages: jest.fn().mockReturnValue({ values: [badPage, goodPage] }) };
    const cards = fetchPages(api, makeConfig());

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("my-task");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Kanban: skipping card with malformed frontmatter at bad.md"),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("should return empty array when all pages are malformed", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const badPage = {
      file: { path: "bad.md", name: "bad" },
      get status() {
        throw new Error("fail");
      },
    };
    const api = { pages: jest.fn().mockReturnValue({ values: [badPage] }) };
    const cards = fetchPages(api, makeConfig());

    expect(cards).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("performance - 50+ cards", () => {
  it("should handle 60 cards across columns without error", () => {
    const pages = [];
    const statuses = ["Backlog", "In Progress", "Done"];
    for (let i = 0; i < 60; i++) {
      pages.push(
        makePage({
          status: statuses[i % 3],
          file: { path: `Tasks/task-${i}.md`, name: `task-${i}`, tags: { values: [] } },
          priority: i % 2 === 0 ? "high" : "low",
        })
      );
    }
    const api = makeMockApi(pages);
    const result = loadBoard(api, makeConfig({ sortBy: "priority" }));

    expect(result.columns).toHaveLength(3);
    const totalCards = result.columns.reduce((sum, col) => sum + col.cards.length, 0);
    expect(totalCards).toBe(60);
    expect(result.columns[0].cards.length).toBe(20);
    expect(result.columns[1].cards.length).toBe(20);
    expect(result.columns[2].cards.length).toBe(20);
  });
});

describe("loadBoard", () => {
  it("should load pages and group into columns", () => {
    const pages = [makePage({ status: "Backlog" }), makePage({ status: "Done", file: { path: "d.md", name: "d" } })];
    const api = makeMockApi(pages);
    const result = loadBoard(api, makeConfig());

    expect(result.columns).toHaveLength(3);
    expect(result.columns[0].cards).toHaveLength(1);
    expect(result.columns[2].cards).toHaveLength(1);
  });

  it("should load tasks source type via fetchTasks", () => {
    const pages = [
      {
        file: {
          path: "tasks.md",
          tasks: {
            values: [
              { text: "Task A [status:: Backlog]", completed: false, path: "tasks.md", line: 1 },
            ],
          },
        },
      },
    ];
    const api = { pages: jest.fn().mockReturnValue({ values: pages }) };
    const result = loadBoard(api, makeConfig({ sourceType: "tasks" }));

    expect(result.columns).toHaveLength(3);
    expect(result.columns[0].cards).toHaveLength(1);
    expect(result.columns[0].cards[0].cardType).toBe("checkbox");
  });
});

describe("subscribeToMetadataChange", () => {
  it("should register an event via component.registerEvent", () => {
    const component = new Component();
    const mockOn = jest.fn().mockReturnValue("event-ref");
    const app = { metadataCache: { on: mockOn } } as any;
    const callback = jest.fn();

    subscribeToMetadataChange(app, component as any, callback);

    expect(mockOn).toHaveBeenCalledWith("dataview:metadata-change", expect.any(Function));
    expect(component._events).toHaveLength(1);
    expect(component._events[0]).toBe("event-ref");
  });

  it("should debounce the callback with 300ms delay", () => {
    jest.useFakeTimers();

    const component = new Component();
    const mockOn = jest.fn().mockImplementation((_event: string, handler: Function) => {
      (component as any)._handler = handler;
      return "event-ref";
    });
    const app = { metadataCache: { on: mockOn } } as any;
    const callback = jest.fn();

    subscribeToMetadataChange(app, component as any, callback);

    const handler = (component as any)._handler;

    handler();
    handler();
    handler();

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});
