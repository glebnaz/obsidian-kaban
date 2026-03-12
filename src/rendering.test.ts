import { renderBoard, renderColumn, renderCard } from "./rendering";
import { KanbanColumn, KanbanCard } from "./dataview";
import { KanbanConfig } from "./config";
import { createMockEl } from "./__mocks__/obsidian";

function makeConfig(overrides?: Partial<KanbanConfig>): KanbanConfig {
  return {
    source: "Tasks",
    query: 'FROM "Tasks"',
    sourceType: "pages",
    columns: ["Backlog", "In Progress", "Done"],
    groupBy: "status",
    showDone: true,
    ...overrides,
  };
}

function makeCard(overrides?: Partial<KanbanCard>): KanbanCard {
  return {
    id: "Tasks/my-task.md",
    title: "my-task",
    status: "Backlog",
    filePath: "Tasks/my-task.md",
    cardType: "file",
    ...overrides,
  };
}

function makeColumns(cards: KanbanCard[] = []): KanbanColumn[] {
  const cols: KanbanColumn[] = [
    { id: "Backlog", title: "Backlog", cards: [] },
    { id: "In Progress", title: "In Progress", cards: [] },
    { id: "Done", title: "Done", cards: [] },
  ];
  for (const card of cards) {
    const col = cols.find((c) => c.id === card.status);
    if (col) col.cards.push(card);
  }
  return cols;
}

// Helper to find elements recursively by class
function findByClass(el: any, cls: string): any[] {
  const results: any[] = [];
  if (el.cls === cls) results.push(el);
  for (const child of el.children || []) {
    results.push(...findByClass(child, cls));
  }
  return results;
}

function findByClassFirst(el: any, cls: string): any | undefined {
  return findByClass(el, cls)[0];
}

describe("renderCard", () => {
  it("should render a card with title", () => {
    const el = createMockEl();
    const card = makeCard({ title: "Fix bug" });
    renderCard(el, card, makeConfig());

    const cardEl = findByClassFirst(el, "kanban-card");
    expect(cardEl).toBeDefined();
    expect(cardEl.dataset.filePath).toBe("Tasks/my-task.md");
    expect(cardEl.dataset.cardType).toBe("file");

    const titleEl = findByClassFirst(el, "kanban-card-title");
    expect(titleEl).toBeDefined();
    expect(titleEl.text).toBe("Fix bug");
  });

  it("should render project when present", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ project: "ProjectX" }), makeConfig());

    const projectEl = findByClassFirst(el, "kanban-card-project");
    expect(projectEl).toBeDefined();
    expect(projectEl.text).toBe("ProjectX");
  });

  it("should not render project when hidden", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ project: "ProjectX" }), makeConfig({ hideFields: ["project"] }));

    const projectEl = findByClassFirst(el, "kanban-card-project");
    expect(projectEl).toBeUndefined();
  });

  it("should render due date", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ due: "2099-01-01" }), makeConfig());

    const dueEl = findByClassFirst(el, "kanban-card-due");
    expect(dueEl).toBeDefined();
    expect(dueEl.text).toBe("2099-01-01");
  });

  it("should add overdue class for past due dates", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ due: "2020-01-01" }), makeConfig());

    const dueEls = findByClass(el, "kanban-card-due overdue");
    expect(dueEls.length).toBe(1);
  });

  it("should not render due when hidden", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ due: "2099-01-01" }), makeConfig({ hideFields: ["due"] }));

    const dueEl = findByClassFirst(el, "kanban-card-due");
    expect(dueEl).toBeUndefined();
  });

  it("should render priority", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ priority: "high" }), makeConfig());

    const prioEl = findByClassFirst(el, "kanban-card-priority");
    expect(prioEl).toBeDefined();
    expect(prioEl.text).toBe("high");
  });

  it("should not render priority when hidden", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ priority: "high" }), makeConfig({ hideFields: ["priority"] }));

    const prioEl = findByClassFirst(el, "kanban-card-priority");
    expect(prioEl).toBeUndefined();
  });

  it("should render tags", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ tags: ["#work", "#urgent"] }), makeConfig());

    const tagEls = findByClass(el, "kanban-card-tag");
    expect(tagEls).toHaveLength(2);
    expect(tagEls[0].text).toBe("#work");
    expect(tagEls[1].text).toBe("#urgent");
  });

  it("should not render tags when hidden", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ tags: ["#work"] }), makeConfig({ hideFields: ["tags"] }));

    const tagsEl = findByClassFirst(el, "kanban-card-tags");
    expect(tagsEl).toBeUndefined();
  });

  it("should not render checkbox when hidden", () => {
    const el = createMockEl();
    renderCard(el, makeCard(), makeConfig({ hideFields: ["checkbox"] }));

    // The header should not contain an input element
    const header = findByClassFirst(el, "kanban-card-header");
    expect(header).toBeDefined();
    // Only the title span should be a child (no checkbox input)
    expect(header.children.length).toBe(1);
  });

  it("should set lineNumber data attribute when present", () => {
    const el = createMockEl();
    renderCard(el, makeCard({ lineNumber: 42 }), makeConfig());

    const cardEl = findByClassFirst(el, "kanban-card");
    expect(cardEl.dataset.lineNumber).toBe("42");
  });
});

describe("renderColumn", () => {
  it("should render column with header and card count", () => {
    const el = createMockEl();
    const column: KanbanColumn = {
      id: "Backlog",
      title: "Backlog",
      cards: [makeCard(), makeCard({ id: "2", title: "Task 2" })],
    };
    renderColumn(el, column, makeConfig());

    const colEl = findByClassFirst(el, "kanban-column");
    expect(colEl).toBeDefined();
    expect(colEl.dataset.columnId).toBe("Backlog");

    const countEl = findByClassFirst(el, "kanban-column-count");
    expect(countEl).toBeDefined();
    expect(countEl.text).toBe("2");
  });

  it("should show empty placeholder when column has no cards", () => {
    const el = createMockEl();
    const column: KanbanColumn = { id: "Done", title: "Done", cards: [] };
    renderColumn(el, column, makeConfig());

    const emptyEl = findByClassFirst(el, "kanban-column-empty");
    expect(emptyEl).toBeDefined();
    expect(emptyEl.text).toBe("No tasks");
  });

  it("should render cards inside column", () => {
    const el = createMockEl();
    const column: KanbanColumn = {
      id: "Backlog",
      title: "Backlog",
      cards: [makeCard({ title: "Task A" }), makeCard({ title: "Task B" })],
    };
    renderColumn(el, column, makeConfig());

    const cardEls = findByClass(el, "kanban-card");
    expect(cardEls).toHaveLength(2);
  });
});

describe("renderBoard", () => {
  it("should render all columns", () => {
    const el = createMockEl();
    const columns = makeColumns([]);
    renderBoard(el, columns, makeConfig());

    const board = findByClassFirst(el, "kanban-board");
    expect(board).toBeDefined();

    const colEls = findByClass(el, "kanban-column");
    expect(colEls).toHaveLength(3);
  });

  it("should render cards in correct columns", () => {
    const el = createMockEl();
    const cards = [
      makeCard({ title: "A", status: "Backlog" }),
      makeCard({ title: "B", status: "In Progress", id: "b" }),
      makeCard({ title: "C", status: "Backlog", id: "c" }),
    ];
    const columns = makeColumns(cards);
    renderBoard(el, columns, makeConfig());

    const colEls = findByClass(el, "kanban-column");
    // Backlog should have 2 cards
    const backlogCards = findByClass(colEls[0], "kanban-card");
    expect(backlogCards).toHaveLength(2);

    // In Progress should have 1 card
    const inProgressCards = findByClass(colEls[1], "kanban-card");
    expect(inProgressCards).toHaveLength(1);

    // Done should show empty placeholder
    const doneEmpty = findByClassFirst(colEls[2], "kanban-column-empty");
    expect(doneEmpty).toBeDefined();
  });

  it("should filter out done cards when showDone is false", () => {
    const el = createMockEl();
    const columns: KanbanColumn[] = [
      { id: "Backlog", title: "Backlog", cards: [makeCard({ title: "A", status: "Backlog" })] },
      { id: "Done", title: "Done", cards: [makeCard({ title: "B", status: "Done" })] },
    ];
    renderBoard(el, columns, makeConfig({ showDone: false }));

    const colEls = findByClass(el, "kanban-column");
    // Backlog has 1 card
    const backlogCards = findByClass(colEls[0], "kanban-card");
    expect(backlogCards).toHaveLength(1);

    // Done should have 0 cards (filtered out) and show empty placeholder
    const doneCards = findByClass(colEls[1], "kanban-card");
    expect(doneCards).toHaveLength(0);
    const doneEmpty = findByClassFirst(colEls[1], "kanban-column-empty");
    expect(doneEmpty).toBeDefined();
  });

  it("should keep done cards when showDone is true", () => {
    const el = createMockEl();
    const columns: KanbanColumn[] = [
      { id: "Done", title: "Done", cards: [makeCard({ title: "B", status: "Done" })] },
    ];
    renderBoard(el, columns, makeConfig({ showDone: true }));

    const doneCards = findByClass(el, "kanban-card");
    expect(doneCards).toHaveLength(1);
  });
});
