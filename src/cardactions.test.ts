import { openFile, toggleCardDone, initCardActions, CardActionContext } from "./cardactions";
import { TFile } from "./__mocks__/obsidian";

jest.mock("obsidian", () => {
  return {
    Notice: jest.fn(),
    TFile: class TFile { path = ""; basename = ""; extension = ""; },
  };
});

const { Notice } = require("obsidian");

describe("openFile", () => {
  it("should open file in a new tab", async () => {
    const mockFile = { path: "Tasks/todo.md" };
    const mockLeaf = { openFile: jest.fn().mockResolvedValue(undefined) };
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(mockFile) },
      workspace: { getLeaf: jest.fn().mockReturnValue(mockLeaf) },
    };

    await openFile(app, "Tasks/todo.md");

    expect(app.vault.getAbstractFileByPath).toHaveBeenCalledWith("Tasks/todo.md");
    expect(app.workspace.getLeaf).toHaveBeenCalledWith("tab");
    expect(mockLeaf.openFile).toHaveBeenCalledWith(mockFile);
  });

  it("should show notice when file not found", async () => {
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) },
      workspace: { getLeaf: jest.fn() },
    };

    await openFile(app, "missing.md");

    expect(Notice).toHaveBeenCalledWith("File not found: missing.md");
    expect(app.workspace.getLeaf).not.toHaveBeenCalled();
  });
});

describe("toggleCardDone", () => {
  it("should toggle file task status to Done", async () => {
    const capturedFm: any = { status: "Backlog" };
    const mockFile = Object.assign(new TFile(), { path: "Tasks/todo.md" });
    const processFrontMatter = jest.fn().mockImplementation((_file, cb) => {
      cb(capturedFm);
      return Promise.resolve();
    });
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(mockFile) },
      fileManager: { processFrontMatter },
    };

    await toggleCardDone(app, "Tasks/todo.md", "status", "file");

    expect(capturedFm.status).toBe("Done");
  });

  it("should toggle file task status from Done back to Backlog", async () => {
    const capturedFm: any = { status: "Done" };
    const mockFile = Object.assign(new TFile(), { path: "Tasks/todo.md" });
    const processFrontMatter = jest.fn().mockImplementation((_file, cb) => {
      cb(capturedFm);
      return Promise.resolve();
    });
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(mockFile) },
      fileManager: { processFrontMatter },
    };

    await toggleCardDone(app, "Tasks/todo.md", "status", "file");

    expect(capturedFm.status).toBe("Backlog");
  });

  it("should toggle checkbox task", async () => {
    const mockFile = Object.assign(new TFile(), { path: "tasks.md" });
    let processedContent = "";
    const app: any = {
      vault: {
        getAbstractFileByPath: jest.fn().mockReturnValue(mockFile),
        process: jest.fn().mockImplementation((_file, cb) => {
          processedContent = cb("- [ ] Do something\n- [x] Already done");
          return Promise.resolve();
        }),
      },
      fileManager: { processFrontMatter: jest.fn() },
    };

    await toggleCardDone(app, "tasks.md", "status", "checkbox", 0);

    expect(processedContent).toContain("- [x] Do something");
  });

  it("should throw error when file not found", async () => {
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(null) },
      fileManager: { processFrontMatter: jest.fn() },
    };

    await expect(
      toggleCardDone(app, "missing.md", "status", "file")
    ).rejects.toThrow("File not found: missing.md");
  });
});

describe("initCardActions", () => {
  function makeMockBoardEl(options?: { cardCount?: number; withCheckbox?: boolean }) {
    const cardCount = options?.cardCount ?? 1;
    const withCheckbox = options?.withCheckbox ?? true;

    const titles: any[] = [];
    const checkboxes: any[] = [];
    const cards: any[] = [];

    for (let i = 0; i < cardCount; i++) {
      const cardEl: any = {
        dataset: { filePath: `Tasks/task-${i}.md`, cardType: "file" },
      };

      const titleEl: any = {
        addEventListener: jest.fn(),
        closest: jest.fn().mockReturnValue(cardEl),
      };
      titles.push(titleEl);

      if (withCheckbox) {
        const cbEl: any = {
          addEventListener: jest.fn(),
          closest: jest.fn().mockReturnValue(cardEl),
          checked: false,
        };
        checkboxes.push(cbEl);
      }

      cards.push(cardEl);
    }

    const boardEl: any = {
      querySelectorAll: jest.fn().mockImplementation((selector: string) => {
        if (selector === ".kanban-card-title") return titles;
        if (selector === ".kanban-card-header input[type=checkbox]") return checkboxes;
        return [];
      }),
    };

    return { boardEl, titles, checkboxes, cards };
  }

  it("should attach click handlers to title elements", () => {
    const { boardEl, titles } = makeMockBoardEl();
    const context: CardActionContext = {
      app: {} as any,
      config: { source: "Tasks", query: "", sourceType: "pages", columns: [], groupBy: "status", showDone: true },
      isDragging: () => false,
    };

    initCardActions(boardEl, context);

    expect(titles[0].addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("should attach click handlers to checkbox elements", () => {
    const { boardEl, checkboxes } = makeMockBoardEl();
    const context: CardActionContext = {
      app: {} as any,
      config: { source: "Tasks", query: "", sourceType: "pages", columns: [], groupBy: "status", showDone: true },
      isDragging: () => false,
    };

    initCardActions(boardEl, context);

    expect(checkboxes[0].addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("should not open file when dragging", async () => {
    const mockFile = { path: "Tasks/task-0.md" };
    const mockLeaf = { openFile: jest.fn().mockResolvedValue(undefined) };
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(mockFile) },
      workspace: { getLeaf: jest.fn().mockReturnValue(mockLeaf) },
    };

    const { boardEl, titles } = makeMockBoardEl();
    const context: CardActionContext = {
      app,
      config: { source: "Tasks", query: "", sourceType: "pages", columns: [], groupBy: "status", showDone: true },
      isDragging: () => true,
    };

    initCardActions(boardEl, context);

    const clickHandler = titles[0].addEventListener.mock.calls[0][1];
    const mockEvent = { stopPropagation: jest.fn() };
    clickHandler(mockEvent);

    expect(app.workspace.getLeaf).not.toHaveBeenCalled();
  });

  it("should open file on title click when not dragging", async () => {
    const mockFile = { path: "Tasks/task-0.md" };
    const mockLeaf = { openFile: jest.fn().mockResolvedValue(undefined) };
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(mockFile) },
      workspace: { getLeaf: jest.fn().mockReturnValue(mockLeaf) },
    };

    const { boardEl, titles } = makeMockBoardEl();
    const context: CardActionContext = {
      app,
      config: { source: "Tasks", query: "", sourceType: "pages", columns: [], groupBy: "status", showDone: true },
      isDragging: () => false,
    };

    initCardActions(boardEl, context);

    const clickHandler = titles[0].addEventListener.mock.calls[0][1];
    const mockEvent = { stopPropagation: jest.fn() };
    clickHandler(mockEvent);

    expect(app.workspace.getLeaf).toHaveBeenCalledWith("tab");
  });

  it("should not toggle checkbox when dragging", () => {
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn() },
      fileManager: { processFrontMatter: jest.fn() },
    };

    const { boardEl, checkboxes } = makeMockBoardEl();
    const context: CardActionContext = {
      app,
      config: { source: "Tasks", query: "", sourceType: "pages", columns: [], groupBy: "status", showDone: true },
      isDragging: () => true,
    };

    initCardActions(boardEl, context);

    const clickHandler = checkboxes[0].addEventListener.mock.calls[0][1];
    const mockEvent = { stopPropagation: jest.fn(), preventDefault: jest.fn() };
    clickHandler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(app.fileManager.processFrontMatter).not.toHaveBeenCalled();
  });

  it("should show notice on successful checkbox toggle", async () => {
    Notice.mockClear();
    const mockFile = Object.assign(new TFile(), { path: "Tasks/task-0.md" });
    const processFrontMatter = jest.fn().mockImplementation((_file, cb) => {
      cb({ status: "Backlog" });
      return Promise.resolve();
    });
    const app: any = {
      vault: { getAbstractFileByPath: jest.fn().mockReturnValue(mockFile) },
      fileManager: { processFrontMatter },
    };

    const { boardEl, checkboxes } = makeMockBoardEl();
    const context: CardActionContext = {
      app,
      config: { source: "Tasks", query: "", sourceType: "pages", columns: [], groupBy: "status", showDone: true },
      isDragging: () => false,
    };

    initCardActions(boardEl, context);

    const clickHandler = checkboxes[0].addEventListener.mock.calls[0][1];
    const mockEvent = { stopPropagation: jest.fn(), preventDefault: jest.fn() };
    await clickHandler(mockEvent);

    expect(Notice).toHaveBeenCalledWith("Task marked as done");
  });

  it("should handle multiple cards", () => {
    const { boardEl, titles, checkboxes } = makeMockBoardEl({ cardCount: 3 });
    const context: CardActionContext = {
      app: {} as any,
      config: { source: "Tasks", query: "", sourceType: "pages", columns: [], groupBy: "status", showDone: true },
      isDragging: () => false,
    };

    initCardActions(boardEl, context);

    expect(titles).toHaveLength(3);
    expect(checkboxes).toHaveLength(3);
    for (const t of titles) {
      expect(t.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    }
    for (const cb of checkboxes) {
      expect(cb.addEventListener).toHaveBeenCalledWith("click", expect.any(Function));
    }
  });
});
