import KanbanBoardPlugin from "./main";
import { createMockEl } from "./__mocks__/obsidian";

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

    beforeEach(async () => {
      const plugin = new KanbanBoardPlugin({} as any, {} as any);
      jest
        .spyOn(plugin, "registerMarkdownCodeBlockProcessor")
        .mockImplementation((_lang: string, h: any) => {
          handler = h;
        });
      await plugin.onload();
    });

    it("should render error div for invalid config", () => {
      const el = createMockEl();
      handler("", el, {});
      const errorDiv = el.children[0];
      expect(errorDiv.cls).toBe("kanban-error");
    });

    it("should render board div for valid config", () => {
      const source = [
        "source: Tasks",
        'query: WHERE status != "archive"',
        "columns: Backlog, In Progress, Done",
        "group-by: status",
      ].join("\n");
      const el = createMockEl();
      handler(source, el, {});
      const board = el.children[0];
      expect(board.cls).toBe("kanban-board");
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
      expect(inserted).toContain("source:");
      expect(inserted).toContain("columns:");
      expect(inserted).toContain("group-by:");
    });
  });
});
