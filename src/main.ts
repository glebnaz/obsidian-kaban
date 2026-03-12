import { Plugin, MarkdownRenderChild } from "obsidian";
import { parseKanbanConfig } from "./config";
import { getDataviewApi, loadBoard, subscribeToMetadataChange } from "./dataview";
import { renderBoard } from "./rendering";

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

      const config = result.config;
      const api = getDataviewApi(this.app);

      if (!api) {
        const errorDiv = el.createEl("div", { cls: "kanban-error" });
        errorDiv.createEl("strong", {
          text: "Dataview plugin is required but not installed or enabled.",
        });
        errorDiv.createEl("p", {
          text: "Please install and enable the Dataview community plugin to use Kanban boards.",
        });
        return;
      }

      const { columns, v2Message } = loadBoard(api, config);

      if (v2Message) {
        el.createEl("div", { cls: "kanban-error", text: v2Message });
      }

      renderBoard(el, columns, config);

      const child = new MarkdownRenderChild(el);
      ctx.addChild(child);

      subscribeToMetadataChange(this.app, child, () => {
        const { columns: newColumns, v2Message: newV2 } = loadBoard(api, config);
        el.empty();
        if (newV2) {
          el.createEl("div", { cls: "kanban-error", text: newV2 });
        }
        renderBoard(el, newColumns, config);
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
