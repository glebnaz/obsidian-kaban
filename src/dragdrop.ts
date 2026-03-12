import Sortable from "sortablejs";
import { App, Notice, TFile } from "obsidian";
import { KanbanConfig } from "./config";

export interface DragDropCallbacks {
  onStatusUpdate: (filePath: string, groupByField: string, newStatus: string, cardType: "file" | "checkbox") => Promise<void>;
}

export interface DragState {
  isDragging: boolean;
}

export interface DragDropContext {
  app: App;
  config: KanbanConfig;
  boardId: string;
  dragState: DragState;
}

let boardCounter = 0;

export function generateBoardId(): string {
  return `kanban-board-${++boardCounter}`;
}

export function initSortableOnColumns(
  boardEl: HTMLElement,
  context: DragDropContext
): Sortable[] {
  const columnCards = boardEl.querySelectorAll(".kanban-column-cards");
  const sortables: Sortable[] = [];

  columnCards.forEach((container: Element) => {
    const columnEl = container.closest(".kanban-column") as HTMLElement | null;
    if (!columnEl) return;

    const sortable = Sortable.create(container as HTMLElement, {
      group: context.boardId,
      animation: 150,
      ghostClass: "kanban-card-ghost",
      chosenClass: "kanban-card-chosen",
      dragClass: "kanban-card-drag",
      onStart: () => {
        context.dragState.isDragging = true;
      },
      onEnd: () => {
        context.dragState.isDragging = false;
      },
      onAdd: async (evt) => {
        const cardEl = evt.item as HTMLElement;
        const targetColumnEl = (evt.to as HTMLElement).closest(".kanban-column") as HTMLElement | null;

        if (!targetColumnEl) return;

        const filePath = cardEl.dataset.filePath;
        const cardType = cardEl.dataset.cardType as "file" | "checkbox";
        const newStatus = targetColumnEl.dataset.columnId;

        if (!filePath || !newStatus) return;

        try {
          await updateTaskStatus(
            context.app,
            filePath,
            context.config.groupBy,
            newStatus,
            cardType,
            cardEl.dataset.lineNumber ? parseInt(cardEl.dataset.lineNumber) : undefined
          );
          new Notice(`Task moved to ${newStatus}`);
        } catch (err) {
          // Revert: move card back to source column
          const sourceColumnEl = evt.from as HTMLElement;
          if (evt.oldIndex != null) {
            const children = sourceColumnEl.children;
            if (evt.oldIndex >= children.length) {
              sourceColumnEl.appendChild(cardEl);
            } else {
              sourceColumnEl.insertBefore(cardEl, children[evt.oldIndex]);
            }
          } else {
            sourceColumnEl.appendChild(cardEl);
          }
          new Notice(`Failed to update task: ${err instanceof Error ? err.message : "unknown error"}`);
        }
      },
    });

    sortables.push(sortable);
  });

  return sortables;
}

export async function updateTaskStatus(
  app: App,
  filePath: string,
  groupByField: string,
  newStatus: string,
  cardType: "file" | "checkbox",
  _lineNumber?: number
): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!file || !(file instanceof TFile)) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (cardType === "checkbox") {
    if (_lineNumber == null) {
      throw new Error("Line number required for checkbox task updates");
    }
    await app.vault.process(file, (content: string) => {
      const lines = content.split("\n");
      const idx = _lineNumber;
      if (idx < 0 || idx >= lines.length) return content;
      const line = lines[idx];
      // Replace existing inline field [groupByField:: oldValue] with new value
      const fieldRegex = new RegExp(`\\[${groupByField}::\\s*[^\\]]*\\]`, "i");
      if (fieldRegex.test(line)) {
        lines[idx] = line.replace(fieldRegex, `[${groupByField}:: ${newStatus}]`);
      } else {
        // Append inline field at end of the task line
        lines[idx] = line.trimEnd() + ` [${groupByField}:: ${newStatus}]`;
      }
      return lines.join("\n");
    });
    return;
  }

  await app.fileManager.processFrontMatter(file, (fm: any) => {
    fm[groupByField] = newStatus;
  });
}

export function destroySortables(sortables: Sortable[]): void {
  for (const s of sortables) {
    s.destroy();
  }
}
