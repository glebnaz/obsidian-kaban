import KanbanBoardPlugin from "./main";
import { createMockEl } from "./__mocks__/obsidian";

jest.mock("./dataview", () => ({
  getDataviewApi: jest.fn(),
  loadBoard: jest.fn().mockReturnValue({
    columns: [
      { id: "Backlog", title: "Backlog", cards: [] },
      { id: "In Progress", title: "In Progress", cards: [] },
      { id: "Done", title: "Done", cards: [] },
    ],
  }),
  subscribeToMetadataChange: jest.fn(),
}));

jest.mock("./rendering", () => ({
  renderBoard: jest.fn(),
}));

jest.mock("./dragdrop", () => ({
  initSortableOnColumns: jest.fn().mockReturnValue([]),
  destroySortables: jest.fn(),
  generateBoardId: jest.fn().mockReturnValue("test-board-1"),
}));

jest.mock("./cardactions", () => ({
  initCardActions: jest.fn(),
}));

jest.mock("sortablejs", () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

const { getDataviewApi, loadBoard, subscribeToMetadataChange } = require("./dataview");
const { renderBoard } = require("./rendering");

describe("KanbanBoardPlugin", () => {
  it("should be a class that extends Plugin", () => {
    expect(KanbanBoardPlugin).toBeDefined();
    const plugin = new KanbanBoardPlugin({} as any, {} as any);
    expect(plugin).toBeInstanceOf(KanbanBoardPlugin);
  });

  it("should register kanban code block processor on load", async () => {
    const plugin = new KanbanBoardPlugin({} as any, {} as any);
    const spy = jest.spyOn(plugin, "registerMarkdownCodeBlockProcessor");
    await plugin.onload();
    expect(spy).toHaveBeenCalledWith("kanban", expect.any(Function));
  });

  it("should register insert board command on load", async () => {
    const plugin = new KanbanBoardPlugin({} as any, {} as any);
    const spy = jest.spyOn(plugin, "addCommand");
    await plugin.onload();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "insert-kanban-board",
        name: "Insert Board",
      })
    );
  });

  describe("code block handler", () => {
    let handler: (source: string, el: any, ctx: any) => void;
    let plugin: KanbanBoardPlugin;

    beforeEach(async () => {
      plugin = new KanbanBoardPlugin({} as any, {} as any);
      jest
        .spyOn(plugin, "registerMarkdownCodeBlockProcessor")
        .mockImplementation((_lang: string, h: any) => {
          handler = h;
        });
      await plugin.onload();
      jest.clearAllMocks();
    });

    it("should render error div for invalid config", () => {
      const el = createMockEl();
      handler("", el, {});
      const errorDiv = el.children[0];
      expect(errorDiv.cls).toBe("kanban-error");
    });

    it("should render dataview error when api is not available", () => {
      getDataviewApi.mockReturnValue(null);
      const source = [
        "source: Tasks",
        'query: WHERE status != "archive"',
        "columns: Backlog, In Progress, Done",
        "group-by: status",
      ].join("\n");
      const el = createMockEl();
      handler(source, el, {});
      const errorDiv = el.children[0];
      expect(errorDiv.cls).toBe("kanban-error");
      expect(errorDiv.children[0].text).toContain("Dataview plugin is required");
    });

    it("should render board when api is available", () => {
      getDataviewApi.mockReturnValue({ pages: jest.fn() });
      const source = [
        "source: Tasks",
        'query: WHERE status != "archive"',
        "columns: Backlog, In Progress, Done",
        "group-by: status",
      ].join("\n");
      const el = createMockEl();
      const ctx = { addChild: jest.fn() };
      handler(source, el, ctx);
      expect(loadBoard).toHaveBeenCalled();
      expect(renderBoard).toHaveBeenCalled();
      expect(subscribeToMetadataChange).toHaveBeenCalled();
      expect(ctx.addChild).toHaveBeenCalled();
    });

    it("should render board for tasks source type", () => {
      getDataviewApi.mockReturnValue({ pages: jest.fn() });
      loadBoard.mockReturnValue({
        columns: [
          { id: "Backlog", title: "Backlog", cards: [] },
        ],
      });
      const source = [
        "source: Tasks",
        'query: WHERE status != "archive"',
        "source-type: tasks",
        "columns: Backlog",
        "group-by: status",
      ].join("\n");
      const el = createMockEl();
      const ctx = { addChild: jest.fn() };
      handler(source, el, ctx);
      expect(loadBoard).toHaveBeenCalled();
      expect(renderBoard).toHaveBeenCalled();
    });
  });

  describe("insert board command", () => {
    it("should insert template code block at cursor", async () => {
      const plugin = new KanbanBoardPlugin({} as any, {} as any);
      let command: any;
      jest.spyOn(plugin, "addCommand").mockImplementation((cmd: any) => {
        command = cmd;
      });
      await plugin.onload();

      const editor = { replaceSelection: jest.fn() };
      command.editorCallback(editor);
      const inserted = editor.replaceSelection.mock.calls[0][0];
      expect(inserted).toContain("```kanban");
      expect(inserted).toContain("query:");
      expect(inserted).toContain("columns:");
      expect(inserted).toContain("group-by:");
    });
  });
});
