import { Plugin } from "obsidian";
import { parseKanbanConfig } from "./config";

const TEMPLATE_BLOCK = `\`\`\`kanban
source: Tasks
query: WHERE status != "archive"
columns: Backlog, In Progress, Done
group-by: status
\`\`\``;

export default class KanbanBoardPlugin extends Plugin {
  async onload() {
    console.log("Loading Kanban Board plugin");

    this.registerMarkdownCodeBlockProcessor("kanban", (source, el, ctx) => {
      const result = parseKanbanConfig(source);

      if (!result.ok) {
        const errorDiv = el.createEl("div", { cls: "kanban-error" });
        errorDiv.createEl("strong", { text: "Kanban configuration error:" });
        const list = errorDiv.createEl("ul");
        for (const err of result.errors) {
          list.createEl("li", { text: err });
        }
        return;
      }

      const board = el.createEl("div", { cls: "kanban-board" });
      board.createEl("div", {
        text: `Board configured: ${result.config.columns.length} columns, grouped by "${result.config.groupBy}"`,
      });
    });

    this.addCommand({
      id: "insert-kanban-board",
      name: "Insert Board",
      editorCallback: (editor: any) => {
        editor.replaceSelection(TEMPLATE_BLOCK);
      },
    });
  }

  onunload() {
    console.log("Unloading Kanban Board plugin");
  }
}
