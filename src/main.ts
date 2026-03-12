import { Plugin, MarkdownRenderChild } from "obsidian";
import { parseKanbanConfig } from "./config";
import { getDataviewApi, loadBoard, subscribeToMetadataChange } from "./dataview";
import { renderBoard } from "./rendering";
import { initSortableOnColumns, destroySortables, generateBoardId, DragDropContext, DragState } from "./dragdrop";
import { initCardActions, CardActionContext } from "./cardactions";
import Sortable from "sortablejs";

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

      const { columns } = loadBoard(api, config);
      renderBoard(el, columns, config);

      const boardId = generateBoardId();
      const dragState: DragState = { isDragging: false };
      const dragContext: DragDropContext = { app: this.app, config, boardId, dragState };
      let sortables: Sortable[] = initSortableOnColumns(el, dragContext);

      const cardActionContext: CardActionContext = {
        app: this.app,
        config,
        isDragging: () => dragState.isDragging,
      };
      initCardActions(el, cardActionContext);

      const child = new MarkdownRenderChild(el);
      ctx.addChild(child);

      const origUnload = child.onunload.bind(child);
      child.onunload = () => {
        destroySortables(sortables);
        sortables = [];
        origUnload();
      };

      subscribeToMetadataChange(this.app, child, () => {
        destroySortables(sortables);
        sortables = [];

        const { columns: newColumns } = loadBoard(api, config);
        el.empty();
        renderBoard(el, newColumns, config);
        sortables = initSortableOnColumns(el, dragContext);
        initCardActions(el, cardActionContext);
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
