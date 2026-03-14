import { Plugin, MarkdownRenderChild, Notice } from "obsidian";
import { parseKanbanConfig } from "./config";
import { getDataviewApi, loadBoard, subscribeToMetadataChange } from "./dataview";
import { renderBoard } from "./rendering";
import { initSortableOnColumns, destroySortables, generateBoardId, DragDropContext, DragState } from "./dragdrop";
import { initCardActions, CardActionContext } from "./cardactions";
import { KanbanPluginSettings, DEFAULT_SETTINGS, KanbanSettingTab } from "./settings";
import Sortable from "sortablejs";

const TEMPLATE_PAGE_BOARD = `\`\`\`kanban
query: FROM "Tasks" WHERE status != "archive"
columns: Backlog, In Progress, Done
group-by: status
\`\`\``;

const TEMPLATE_TASK_BOARD = `\`\`\`kanban
query: FROM ""
columns: Backlog, In Progress, Done
group-by: status
source-type: tasks
done-columns: Done
\`\`\``;

export default class KanbanBoardPlugin extends Plugin {
  settings: KanbanPluginSettings = DEFAULT_SETTINGS;

  async onload() {
    console.log("Loading Kanban Board plugin");

    await this.loadSettings();
    this.addSettingTab(new KanbanSettingTab(this.app, this));

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
      name: "Insert Page Board",
      editorCallback: (editor: any) => {
        editor.replaceSelection(TEMPLATE_PAGE_BOARD);
      },
    });

    this.addCommand({
      id: "insert-kanban-task-board",
      name: "Insert Task Board (all vault)",
      editorCallback: (editor: any) => {
        editor.replaceSelection(TEMPLATE_TASK_BOARD);
      },
    });

    this.addCommand({
      id: "refresh-kanban-boards",
      name: "Refresh all boards",
      callback: () => {
        (this.app.metadataCache as any).trigger("dataview:metadata-change");
      },
    });

    this.addCommand({
      id: "create-new-task",
      name: "Create new task",
      callback: async () => {
        await this.createNewTask();
      },
    });
  }

  onunload() {
    console.log("Unloading Kanban Board plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async createNewTask() {
    const folder = this.settings.defaultTaskFolder;

    // Ensure folder exists
    if (!(await this.app.vault.adapter.exists(folder))) {
      await this.app.vault.createFolder(folder);
    }

    // Prompt for task name
    const taskName = await promptForTaskName(this.app);
    if (!taskName) return;

    const filePath = `${folder}/${taskName}.md`;

    // Check if file already exists
    if (await this.app.vault.adapter.exists(filePath)) {
      new Notice(`File "${filePath}" already exists.`);
      return;
    }

    // Read template content if path is set
    let content = "";
    const templatePath = this.settings.templatePath;
    if (templatePath) {
      const templateFile = this.app.vault.getAbstractFileByPath(`${templatePath}.md`)
        || this.app.vault.getAbstractFileByPath(templatePath);
      if (templateFile) {
        content = await this.app.vault.read(templateFile);
      } else {
        new Notice(`Template file "${templatePath}" not found.`);
        return;
      }
    }

    const file = await this.app.vault.create(filePath, content);

    // Try to trigger Templater if it's enabled and template was applied
    if (templatePath) {
      const templater = (this.app as any).plugins?.plugins?.["templater-obsidian"];
      if (templater?.templater?.overwrite_file_commands) {
        await templater.templater.overwrite_file_commands(file);
      }
    }

    await this.app.workspace.getLeaf().openFile(file);
    new Notice(`Task "${taskName}" created.`);
  }
}

function promptForTaskName(app: any): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = new TaskNameModal(app, resolve);
    modal.open();
  });
}

class TaskNameModal {
  app: any;
  private resolve: (value: string | null) => void;
  private modal: any;

  constructor(app: any, resolve: (value: string | null) => void) {
    this.app = app;
    this.resolve = resolve;
  }

  open() {
    // Use Obsidian's Modal API
    const { Modal } = require("obsidian");
    const self = this;

    class InnerModal extends Modal {
      private resolved = false;

      onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h3", { text: "New Task" });

        const input = contentEl.createEl("input", {
          type: "text",
          placeholder: "Task name...",
        });
        input.style.width = "100%";
        input.style.marginBottom = "1em";
        input.focus();

        input.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            const value = input.value.trim();
            if (value) {
              this.resolved = true;
              self.resolve(value);
              this.close();
            }
          } else if (e.key === "Escape") {
            this.close();
          }
        });

        const btn = contentEl.createEl("button", { text: "Create" });
        btn.addEventListener("click", () => {
          const value = input.value.trim();
          if (value) {
            this.resolved = true;
            self.resolve(value);
            this.close();
          }
        });
      }

      onClose() {
        if (!this.resolved) {
          self.resolve(null);
        }
        this.contentEl.empty();
      }
    }

    this.modal = new InnerModal(this.app);
    this.modal.open();
  }
}
