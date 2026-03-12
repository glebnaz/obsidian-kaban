import { Plugin } from "obsidian";

export default class KanbanBoardPlugin extends Plugin {
  async onload() {
    console.log("Loading Kanban Board plugin");

    this.registerMarkdownCodeBlockProcessor("kanban", (source, el, ctx) => {
      el.createEl("div", {
        cls: "kanban-board",
        text: "Kanban board placeholder — configuration parsing coming in Task 2.",
      });
    });
  }

  onunload() {
    console.log("Unloading Kanban Board plugin");
  }
}
