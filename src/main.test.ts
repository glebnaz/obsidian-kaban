import KanbanBoardPlugin from "./main";

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
});
