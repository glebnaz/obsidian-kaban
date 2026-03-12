import { App, Notice } from "obsidian";
import { KanbanConfig } from "./config";

export interface CardActionContext {
  app: App;
  config: KanbanConfig;
  isDragging: () => boolean;
}

export function initCardActions(
  boardEl: HTMLElement,
  context: CardActionContext
): void {
  const titleEls = boardEl.querySelectorAll(".kanban-card-title");
  titleEls.forEach((titleEl: Element) => {
    (titleEl as HTMLElement).addEventListener("click", (e: MouseEvent) => {
      if (context.isDragging()) return;
      e.stopPropagation();
      const cardEl = (titleEl as HTMLElement).closest(".kanban-card") as HTMLElement | null;
      if (!cardEl) return;
      const filePath = cardEl.dataset.filePath;
      if (!filePath) return;
      openFile(context.app, filePath);
    });
  });

  const checkboxEls = boardEl.querySelectorAll(".kanban-card-header input[type=checkbox]");
  checkboxEls.forEach((cbEl: Element) => {
    (cbEl as HTMLInputElement).addEventListener("click", async (e: MouseEvent) => {
      if (context.isDragging()) {
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      const cardEl = (cbEl as HTMLElement).closest(".kanban-card") as HTMLElement | null;
      if (!cardEl) return;

      const filePath = cardEl.dataset.filePath;
      const cardType = cardEl.dataset.cardType as "file" | "checkbox" | undefined;
      if (!filePath || !cardType) return;

      try {
        await toggleCardDone(context.app, filePath, context.config.groupBy, cardType);
        new Notice("Task marked as done");
      } catch (err) {
        (cbEl as HTMLInputElement).checked = !(cbEl as HTMLInputElement).checked;
        new Notice(`Failed to update task: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    });
  });
}

export async function openFile(app: App, filePath: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!file) {
    new Notice(`File not found: ${filePath}`);
    return;
  }
  const leaf = app.workspace.getLeaf("tab");
  await leaf.openFile(file);
}

export async function toggleCardDone(
  app: App,
  filePath: string,
  groupByField: string,
  cardType: "file" | "checkbox"
): Promise<void> {
  if (cardType === "checkbox") {
    throw new Error("Checkbox task updates are coming in v2");
  }

  const file = app.vault.getAbstractFileByPath(filePath);
  if (!file) {
    throw new Error(`File not found: ${filePath}`);
  }

  await app.fileManager.processFrontMatter(file, (fm: any) => {
    fm[groupByField] = fm[groupByField] === "Done" ? "Backlog" : "Done";
  });
}
