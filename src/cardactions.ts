import { App, Notice, TFile } from "obsidian";
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

      const lineNumber = cardEl.dataset.lineNumber ? parseInt(cardEl.dataset.lineNumber) : undefined;
      try {
        await toggleCardDone(context.app, filePath, context.config.groupBy, cardType, lineNumber);
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
  cardType: "file" | "checkbox",
  lineNumber?: number
): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!file || !(file instanceof TFile)) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (cardType === "checkbox") {
    if (lineNumber == null) {
      throw new Error("Line number required for checkbox task updates");
    }
    await app.vault.process(file, (content: string) => {
      const lines = content.split("\n");
      if (lineNumber < 0 || lineNumber >= lines.length) return content;
      const line = lines[lineNumber];
      // Toggle checkbox: - [ ] <-> - [x]
      if (/- \[ \]/.test(line)) {
        lines[lineNumber] = line.replace("- [ ]", "- [x]");
      } else if (/- \[x\]/i.test(line)) {
        lines[lineNumber] = line.replace(/- \[x\]/i, "- [ ]");
      }
      return lines.join("\n");
    });
    return;
  }

  await app.fileManager.processFrontMatter(file, (fm: any) => {
    fm[groupByField] = fm[groupByField] === "Done" ? "Backlog" : "Done";
  });
}
