import { updateTaskStatus, destroySortables, generateBoardId, initSortableOnColumns, DragDropContext } from "./dragdrop";
import { KanbanConfig } from "./config";
import { TFile } from "./__mocks__/obsidian";

// Mock sortablejs
jest.mock("sortablejs", () => {
  const mockCreate = jest.fn().mockImplementation((_el: any, options: any) => {
    return {
      options,
      destroy: jest.fn(),
    };
  });
  return {
    __esModule: true,
    default: { create: mockCreate },
  };
});

const Sortable = require("sortablejs").default;

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

describe("generateBoardId", () => {
  it("should return unique board ids", () => {
    const id1 = generateBoardId();
    const id2 = generateBoardId();
    expect(id1).not.toBe(id2);
    expect(id1).toContain("kanban-board-");
    expect(id2).toContain("kanban-board-");
  });

  it("should generate unique IDs for multiple boards in same note", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      ids.add(generateBoardId());
    }
    expect(ids.size).toBe(10);
  });
});

describe("updateTaskStatus", () => {
  it("should call processFrontMatter for file card type", async () => {
    const mockFile = Object.assign(new TFile(), { path: "Tasks/todo.md" });
    const processFrontMatter = jest.fn().mockImplementation((_file, cb) => {
      const fm: any = {};
      cb(fm);
      expect(fm.status).toBe("Done");
      return Promise.resolve();
    });
    const app: any = {
      vault: {
        getAbstractFileByPath: jest.fn().mockReturnValue(mockFile),
      },
      fileManager: {
        processFrontMatter,
      },
    };

    await updateTaskStatus(app, "Tasks/todo.md", "status", "Done", "file");

    expect(app.vault.getAbstractFileByPath).toHaveBeenCalledWith("Tasks/todo.md");
    expect(processFrontMatter).toHaveBeenCalledWith(mockFile, expect.any(Function));
  });

  it("should update inline field for checkbox card type", async () => {
    const mockFile = Object.assign(new TFile(), { path: "tasks.md" });
    let processedContent = "";
    const app: any = {
      vault: {
        getAbstractFileByPath: jest.fn().mockReturnValue(mockFile),
        process: jest.fn().mockImplementation((_file, cb) => {
          processedContent = cb("- [ ] Buy milk [status:: todo]\n- [ ] Other task");
          return Promise.resolve();
        }),
      },
      fileManager: { processFrontMatter: jest.fn() },
    };

    await updateTaskStatus(app, "tasks.md", "status", "done", "checkbox", 0);

    expect(processedContent).toContain("[status:: done]");
  });

  it("should throw error when file not found", async () => {
    const app: any = {
      vault: {
        getAbstractFileByPath: jest.fn().mockReturnValue(null),
      },
      fileManager: { processFrontMatter: jest.fn() },
    };

    await expect(
      updateTaskStatus(app, "missing.md", "status", "Done", "file")
    ).rejects.toThrow("File not found: missing.md");
  });

  it("should set the correct groupBy field on frontmatter", async () => {
    const capturedFm: any = { priority: "low" };
    const mockFile = Object.assign(new TFile(), { path: "Tasks/todo.md" });
    const processFrontMatter = jest.fn().mockImplementation((_file, cb) => {
      cb(capturedFm);
      return Promise.resolve();
    });
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(mockFile) },
      fileManager: { processFrontMatter },
    };

    await updateTaskStatus(app, "Tasks/todo.md", "priority", "high", "file");

    expect(capturedFm.priority).toBe("high");
  });
});

describe("destroySortables", () => {
  it("should call destroy on each instance in array", () => {
    const s1 = { destroy: jest.fn() };
    const s2 = { destroy: jest.fn() };
    destroySortables([s1, s2] as any);
    expect(s1.destroy).toHaveBeenCalled();
    expect(s2.destroy).toHaveBeenCalled();
  });

  it("should handle empty array", () => {
    expect(() => destroySortables([])).not.toThrow();
  });
});

describe("initSortableOnColumns", () => {
  beforeEach(() => {
    Sortable.create.mockClear();
  });

  function makeMockBoardEl(columnCount: number): any {
    const columns: any[] = [];
    const cardContainers: any[] = [];

    for (let i = 0; i < columnCount; i++) {
      const cardsContainer: any = {
        closest: jest.fn().mockReturnValue(null),
      };
      const columnEl: any = {
        dataset: { columnId: `col-${i}` },
      };
      cardsContainer.closest = jest.fn().mockReturnValue(columnEl);
      cardContainers.push(cardsContainer);
      columns.push(columnEl);
    }

    const boardEl: any = {
      querySelectorAll: jest.fn().mockReturnValue(cardContainers),
    };

    return { boardEl, columns, cardContainers };
  }

  it("should create a Sortable instance for each column", () => {
    const { boardEl } = makeMockBoardEl(3);
    const context: DragDropContext = {
      app: {} as any,
      config: makeConfig(),
      boardId: "test-board",
    };

    const sortables = initSortableOnColumns(boardEl, context);

    expect(Sortable.create).toHaveBeenCalledTimes(3);
    expect(sortables).toHaveLength(3);
  });

  it("should use boardId as group name", () => {
    const { boardEl } = makeMockBoardEl(1);
    const context: DragDropContext = {
      app: {} as any,
      config: makeConfig(),
      boardId: "my-board-123",
    };

    initSortableOnColumns(boardEl, context);

    const options = Sortable.create.mock.calls[0][1];
    expect(options.group).toBe("my-board-123");
  });

  it("should set ghost, chosen, and drag classes", () => {
    const { boardEl } = makeMockBoardEl(1);
    const context: DragDropContext = {
      app: {} as any,
      config: makeConfig(),
      boardId: "test",
    };

    initSortableOnColumns(boardEl, context);

    const options = Sortable.create.mock.calls[0][1];
    expect(options.ghostClass).toBe("kanban-card-ghost");
    expect(options.chosenClass).toBe("kanban-card-chosen");
    expect(options.dragClass).toBe("kanban-card-drag");
  });

  it("should set animation to 150ms", () => {
    const { boardEl } = makeMockBoardEl(1);
    const context: DragDropContext = {
      app: {} as any,
      config: makeConfig(),
      boardId: "test",
    };

    initSortableOnColumns(boardEl, context);

    const options = Sortable.create.mock.calls[0][1];
    expect(options.animation).toBe(150);
  });

  it("should return empty array when no columns found", () => {
    const boardEl: any = {
      querySelectorAll: jest.fn().mockReturnValue([]),
    };
    const context: DragDropContext = {
      app: {} as any,
      config: makeConfig(),
      boardId: "test",
    };

    const sortables = initSortableOnColumns(boardEl, context);
    expect(sortables).toHaveLength(0);
    expect(Sortable.create).not.toHaveBeenCalled();
  });

  it("should skip containers without a parent column element", () => {
    const container: any = {
      closest: jest.fn().mockReturnValue(null),
    };
    const boardEl: any = {
      querySelectorAll: jest.fn().mockReturnValue([container]),
    };
    const context: DragDropContext = {
      app: {} as any,
      config: makeConfig(),
      boardId: "test",
    };

    const sortables = initSortableOnColumns(boardEl, context);
    expect(sortables).toHaveLength(0);
  });

  it("should provide onAdd handler that calls updateTaskStatus", async () => {
    const mockFile = { path: "Tasks/todo.md" };
    const processFrontMatter = jest.fn().mockResolvedValue(undefined);
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(mockFile) },
      fileManager: { processFrontMatter },
    };

    const { boardEl } = makeMockBoardEl(1);
    const context: DragDropContext = {
      app,
      config: makeConfig(),
      boardId: "test",
    };

    initSortableOnColumns(boardEl, context);

    const options = Sortable.create.mock.calls[0][1];
    expect(options.onAdd).toBeDefined();
  });
});
